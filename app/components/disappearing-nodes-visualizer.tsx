"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleDot, Flag, Info, Minus, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NODES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
type NodeId = (typeof NODES)[number];

const DISAPPEAR: Record<NodeId, number> = {
  0: 20,
  1: 4,
  2: 8,
  3: 10,
  4: 9,
  5: 12,
  6: 9,
  7: 12,
  8: 15,
};

const VB_W = 960;
const VB_H = 360;
const NODE_W = 132;
const BODY_H = 62;
const ROOF_H = 28;

const POS: Record<NodeId, { x: number; y: number }> = {
  0: { x: 96, y: 86 },
  1: { x: 286, y: 86 },
  3: { x: 476, y: 86 },
  5: { x: 666, y: 86 },
  7: { x: 856, y: 86 },
  2: { x: 191, y: 258 },
  4: { x: 381, y: 258 },
  6: { x: 571, y: 258 },
  8: { x: 856, y: 258 },
};

const EDGES: { u: NodeId; v: NodeId; w: number }[] = [
  { u: 0, v: 1, w: 2 },
  { u: 0, v: 2, w: 5 },
  { u: 1, v: 2, w: 1 },
  { u: 1, v: 3, w: 4 },
  { u: 2, v: 3, w: 2 },
  { u: 2, v: 4, w: 6 },
  { u: 3, v: 4, w: 1 },
  { u: 3, v: 5, w: 5 },
  { u: 4, v: 5, w: 2 },
  { u: 4, v: 6, w: 3 },
  { u: 5, v: 6, w: 2 },
  { u: 5, v: 7, w: 4 },
  { u: 6, v: 7, w: 2 },
];

type StepKind = "setup" | "select" | "reach" | "miss" | "blocked" | "done";
type Answers = (number | null)[];

type Cursor = {
  answers: Answers;
  processed: NodeId[];
  parent: (NodeId | null)[];
  phase: "relax" | "ready" | "done";
  current: NodeId | null;
  edgeAt: number;
};

type Step = {
  kind: StepKind;
  answers: Answers;
  focus: NodeId;
  edge: { u: NodeId; v: NodeId } | null;
  edgeTone: "success" | "fail" | null;
  kept: Array<[NodeId, NodeId]>;
  description: string;
  processing: NodeId | null;
  processed: NodeId[];
  updated: NodeId[];
  cursor: Cursor;
};

type Move = { type: "step"; step: Step } | { type: "choice"; cursor: Cursor; options: { id: NodeId; time: number }[] };


function cloneCursor(cursor: Cursor): Cursor {
  return {
    answers: [...cursor.answers],
    processed: [...cursor.processed],
    parent: [...cursor.parent],
    phase: cursor.phase,
    current: cursor.current,
    edgeAt: cursor.edgeAt,
  };
}

function neighborsOf(node: NodeId) {
  const roads: { to: NodeId; w: number }[] = [];
  for (const edge of EDGES) {
    if (edge.u === node) roads.push({ to: edge.v, w: edge.w });
    else if (edge.v === node) roads.push({ to: edge.u, w: edge.w });
  }
  return roads;
}

function keptEdges(parent: (NodeId | null)[]) {
  const edges: Array<[NodeId, NodeId]> = [];
  for (const id of NODES) {
    const from = parent[id];
    if (from !== null) edges.push([from, id]);
  }
  return edges;
}

function waitingHouses(cursor: Cursor, processing: NodeId | null) {
  return NODES.filter((id) => {
    const time = cursor.answers[id];
    return time !== null && time !== -1 && !cursor.processed.includes(id) && id !== processing;
  });
}

function makeStep(
  cursor: Cursor,
  processing: NodeId | null,
  partial: Pick<Step, "kind" | "focus" | "edge" | "edgeTone" | "description">,
): Step {
  return {
    ...partial,
    answers: [...cursor.answers],
    kept: keptEdges(cursor.parent),
    processing,
    processed: [...cursor.processed],
    updated: waitingHouses(cursor, processing),
    cursor,
  };
}

function noRoadLeft(cursor: Cursor, target: NodeId, current: NodeId) {
  return neighborsOf(target).every(({ to }) => {
    if (to === current || cursor.processed.includes(to)) return true;
    const time = cursor.answers[to];
    return time === null || time === -1;
  });
}

function formatTimes(answers: Answers) {
  return answers.map((value) => (value === null || value === -1 ? "−1" : String(value))).join(", ");
}

type Brigade = {
  house: NodeId;
  path: NodeId[];
  arrivals: number[];
};

function edgeWeight(from: NodeId, to: NodeId) {
  const edge = EDGES.find(
    (road) => (road.u === from && road.v === to) || (road.u === to && road.v === from),
  );
  return edge?.w ?? 0;
}

function brigadesFor(step: Step): Brigade[] {
  const reachable = NODES.filter((id) => {
    const time = step.answers[id];
    return id !== 0 && time !== null && time !== -1;
  }).sort((a, b) => (step.answers[a] as number) - (step.answers[b] as number) || a - b);
  return reachable.map((house) => {
    const path: NodeId[] = [];
    const seen = new Set<NodeId>();
    let cursor: NodeId | null = house;
    while (cursor !== null && !seen.has(cursor)) {
      seen.add(cursor);
      path.push(cursor);
      cursor = step.cursor.parent[cursor];
    }
    path.reverse();
    if (path[0] !== 0) path.unshift(0);
    const arrivals = path.map((id) => (id === 0 ? 0 : (step.answers[id] as number)));
    for (let index = 1; index < path.length; index += 1) {
      const hop = edgeWeight(path[index - 1], path[index]);
      if (hop > 0) arrivals[index] = arrivals[index - 1] + hop;
    }
    return { house, path, arrivals };
  });
}

function brigadePose(route: Brigade, time: number, lane: number, lanes: number) {
  const last = route.path.length - 1;
  const maxTime = route.arrivals[last] ?? 0;
  const t = Math.max(0, Math.min(time, maxTime));
  const arrived = t >= maxTime - 0.02;
  let segment = 0;
  while (segment < last - 1 && t > route.arrivals[segment + 1]) segment += 1;
  const start = route.arrivals[segment];
  const end = route.arrivals[segment + 1] ?? start;
  const span = end - start || 1;
  const progress = Math.min(1, Math.max(0, (t - start) / span));
  const from = POS[route.path[segment]];
  const to = POS[route.path[segment + 1] ?? route.path[segment]];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const along = arrived ? -74 : 0;
  const side = arrived ? 16 : (lane - (lanes - 1) / 2) * 13;
  return {
    x: from.x + dx * progress + (dx / length) * along + (-dy / length) * side,
    y: from.y + dy * progress + (dy / length) * along + (dx / length) * side,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function idList(ids: NodeId[]) {
  if (ids.length <= 1) return ids.join("");
  if (ids.length === 2) return `${ids[0]} and ${ids[1]}`;
  return `${ids.slice(0, -1).join(", ")}, and ${ids[ids.length - 1]}`;
}

function housePhrase(ids: NodeId[]) {
  if (ids.length === 0) return "no house";
  if (ids.length === 1) return `house ${ids[0]}`;
  return `houses ${idList(ids)}`;
}

function dispatchDescription(step: Step, routes: Brigade[], clock: number) {
  if (routes.length === 0) return "No approachable house can be reached from the fire station.";
  const maxTime = Math.max(...routes.map((route) => route.arrivals[route.arrivals.length - 1] ?? 0));
  const time = Math.min(clock, maxTime);
  const reached = NODES.filter((id) => {
    const arrival = step.answers[id];
    return id !== 0 && arrival !== null && arrival !== -1 && arrival <= time + 0.04;
  });
  const missed = NODES.filter((id) => step.answers[id] === -1);
  const fleet = routes.length === 1 ? "1 fire brigade" : `${routes.length} fire brigades`;
  if (time + 0.02 >= maxTime) {
    const closed = missed.length
      ? ` ${missed.length === 1 ? "House" : "Houses"} ${idList(missed)} ${missed.length === 1 ? "stays" : "stay"} inaccessible.`
      : "";
    return `${fleet} followed the earliest roads, one to each approachable house, and reached ${housePhrase(reached)} in the time already found.${closed}`;
  }
  const arrived = reached.length
    ? ` ${reached.length === 1 ? "House" : "Houses"} ${idList(reached)} ${reached.length === 1 ? "has" : "have"} been reached.`
    : "";
  const verb = routes.length === 1 ? "is driving" : "are driving";
  return `${fleet} ${verb} from the station, one for each approachable house. Time ${time.toFixed(1)}.${arrived}`;
}

function selectInto(base: Cursor, id: NodeId): Step {
  const cursor = cloneCursor(base);
  cursor.phase = "relax";
  cursor.current = id;
  cursor.edgeAt = 0;
  if (cursor.answers[id] === null) cursor.answers[id] = 0;
  const description =
    id === 0
      ? "An emergency team starts at the fire station at time 0. The station stays accessible until 20, so the earliest time is 0."
      : `The next team goes to house ${id}.`;
  return makeStep(cursor, id, {
    kind: "select",
    focus: id,
    edge: null,
    edgeTone: null,
    description,
  });
}

function initialStep(): Step {
  const cursor: Cursor = {
    answers: NODES.map(() => null),
    processed: [],
    parent: NODES.map(() => null),
    phase: "ready",
    current: null,
    edgeAt: 0,
  };
  return makeStep(cursor, null, {
    kind: "setup",
    focus: 0,
    edge: null,
    edgeTone: null,
    description:
      "A fire station dispatches emergency teams to houses across the city. Some houses become engulfed in flames and inaccessible. House 8 has no road to the others.",
  });
}

function readyMove(cursor: Cursor): Move {
  if (cursor.answers.every((time) => time === null)) return { type: "step", step: selectInto(cursor, 0) };
  const waiting = waitingHouses(cursor, null);
  if (waiting.length >= 2) {
    return {
      type: "choice",
      cursor,
      options: waiting.map((id) => ({ id, time: cursor.answers[id] as number })),
    };
  }
  if (waiting.length === 1) return { type: "step", step: selectInto(cursor, waiting[0]) };
  const untouched = NODES.find((id) => cursor.answers[id] === null);
  if (untouched === undefined) {
    cursor.phase = "done";
    return {
      type: "step",
      step: makeStep(cursor, null, {
        kind: "done",
        focus: 0,
        edge: null,
        edgeTone: null,
        description: `The earliest time an emergency team can reach each house is [${formatTimes(cursor.answers)}].`,
      }),
    };
  }
  cursor.answers[untouched] = -1;
  const alone = neighborsOf(untouched).length === 0;
  return {
    type: "step",
    step: makeStep(cursor, null, {
      kind: "miss",
      focus: untouched,
      edge: null,
      edgeTone: null,
      description: alone
        ? `House ${untouched} is engulfed in flames at ${DISAPPEAR[untouched]}, but no road connects it to the others. No emergency team can reach it, so the earliest time is −1.`
        : `No open road can reach house ${untouched} before it is engulfed in flames at ${DISAPPEAR[untouched]}. The earliest time is −1.`,
    }),
  };
}

function nextMove(step: Step): Move {
  if (step.kind === "done") return { type: "step", step };
  const cursor = cloneCursor(step.cursor);
  if (cursor.phase === "ready") return readyMove(cursor);
  const current = cursor.current;
  if (current === null) return readyMove(cursor);
  const roads = neighborsOf(current);
  while (cursor.edgeAt < roads.length) {
    const road = roads[cursor.edgeAt];
    cursor.edgeAt += 1;
    const arrival = (cursor.answers[current] as number) + road.w;
    const known = cursor.answers[road.to];
    const settled = cursor.processed.includes(road.to);
    if (settled && (known === null || known === -1 || arrival >= known)) continue;
    const edge = { u: current, v: road.to };
    const from = current === 0 ? "From the fire station" : `From house ${current}`;
    if (known !== null && known !== -1 && arrival >= known) {
      const comparison = arrival > known ? "later than" : "no earlier than";
      return {
        type: "step",
        step: makeStep(cursor, current, {
          kind: "blocked",
          focus: road.to,
          edge,
          edgeTone: null,
          description: `${from}, the road to house ${road.to} takes ${road.w}. Arriving at ${arrival} is ${comparison} the time already known, ${known}, so the earliest time stays ${known}.`,
        }),
      };
    }
    if (arrival >= DISAPPEAR[road.to]) {
      const moment = arrival === DISAPPEAR[road.to] ? "just as" : "after";
      const closed =
        (known === null || known === -1) && noRoadLeft(cursor, road.to, current);
      if (closed) cursor.answers[road.to] = -1;
      const description = closed
        ? `${from}, the road to house ${road.to} takes ${road.w}. The team would arrive at ${arrival}, ${moment} the house is engulfed in flames at ${DISAPPEAR[road.to]}. It is inaccessible, so the earliest time is −1.`
        : `${from}, the road to house ${road.to} takes ${road.w}. The team would arrive at ${arrival}, ${moment} the house is engulfed in flames at ${DISAPPEAR[road.to]}, so it is inaccessible.`;
      return {
        type: "step",
        step: makeStep(cursor, current, {
          kind: "miss",
          focus: road.to,
          edge,
          edgeTone: "fail",
          description,
        }),
      };
    }
    if (known === null || known === -1 || arrival < known) {
      const previous = known;
      cursor.answers[road.to] = arrival;
      cursor.parent[road.to] = current;
      if (settled) cursor.processed = cursor.processed.filter((id) => id !== road.to);
      const description =
        previous === null || previous === -1
          ? current === 0
            ? `The road from the fire station to house ${road.to} takes ${road.w}. The team arrives at ${arrival}, before the house is engulfed in flames at ${DISAPPEAR[road.to]}. The earliest time is ${arrival}.`
            : `From house ${current}, the road to house ${road.to} takes ${road.w}. The team arrives at ${arrival}, before the house is engulfed in flames at ${DISAPPEAR[road.to]}. The earliest time is ${arrival}.`
          : `From house ${current}, the road to house ${road.to} takes ${road.w}. Arriving at ${arrival} is earlier than ${previous}, and the team still arrives before the house is engulfed in flames at ${DISAPPEAR[road.to]}.`;
      return {
        type: "step",
        step: makeStep(cursor, current, {
          kind: "reach",
          focus: road.to,
          edge,
          edgeTone: "success",
          description,
        }),
      };
    }
  }
  if (!cursor.processed.includes(current)) cursor.processed = [...cursor.processed, current];
  cursor.phase = "ready";
  cursor.current = null;
  cursor.edgeAt = 0;
  return readyMove(cursor);
}

const KIND_META: Record<
  StepKind,
  { label: string; icon: LucideIcon; className: string; iconClass: string }
> = {
  setup: {
    label: "Dispatch",
    icon: Info,
    className: "border-slate-200/70 bg-slate-50/90 text-slate-700",
    iconClass: "bg-slate-100 text-slate-600",
  },
  select: {
    label: "Next team",
    icon: CircleDot,
    className: "border-yellow-200/70 bg-yellow-50/90 text-yellow-950",
    iconClass: "bg-yellow-100 text-yellow-800",
  },
  reach: {
    label: "In time",
    icon: Check,
    className: "border-emerald-200/70 bg-emerald-50/90 text-emerald-900",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  miss: {
    label: "Inaccessible",
    icon: X,
    className: "border-rose-200/70 bg-rose-50/90 text-rose-900",
    iconClass: "bg-rose-100 text-rose-700",
  },
  blocked: {
    label: "Blocked",
    icon: Minus,
    className: "border-amber-200/70 bg-amber-50/90 text-amber-900",
    iconClass: "bg-amber-100 text-amber-700",
  },
  done: {
    label: "Earliest",
    icon: Flag,
    className: "border-emerald-200/70 bg-emerald-50/90 text-emerald-900",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
};

type NodePaint = { fill: string; roof: string; stroke: string; text: string; subText: string };

const PROCESSED: NodePaint = { fill: "#ecfdf5", roof: "#a7f3d0", stroke: "#10b981", text: "#064e3b", subText: "#047857" };
const PROCESSING: NodePaint = { fill: "#fef9c3", roof: "#fde047", stroke: "#eab308", text: "#713f12", subText: "#a16207" };
const UPDATED: NodePaint = { fill: "#eff6ff", roof: "#bfdbfe", stroke: "#3b82f6", text: "#1e3a8a", subText: "#1d4ed8" };
const MISSED: NodePaint = { fill: "#fff1f2", roof: "#fecdd3", stroke: "#f43f5e", text: "#881337", subText: "#be123c" };
const IDLE: NodePaint = { fill: "#ffffff", roof: "#f3f4f6", stroke: "#e5e7eb", text: "#374151", subText: "#9ca3af" };

function nodePaint(id: NodeId, step: Step): NodePaint {
  if (step.processing === id) return PROCESSING;
  if (step.processed.includes(id)) return PROCESSED;
  if (step.updated.includes(id)) return UPDATED;
  if (step.answers[id] === -1) return MISSED;
  return IDLE;
}

function noteAppearance(step: Step) {
  const base = KIND_META[step.kind];
  if (step.kind === "miss" || step.kind === "blocked") return base;
  const paint = nodePaint(step.focus, step);
  if (paint === UPDATED) {
    return {
      ...base,
      className: "border-blue-200/70 bg-blue-50/90 text-blue-900",
      iconClass: "bg-blue-100 text-blue-700",
    };
  }
  if (paint === PROCESSING) {
    return {
      ...base,
      className: "border-yellow-200/70 bg-yellow-50/90 text-yellow-950",
      iconClass: "bg-yellow-100 text-yellow-800",
    };
  }
  return base;
}

function formatAnswer(value: number | null) {
  if (value === null) return "—";
  if (value === -1) return "−1";
  return String(value);
}

function sameEdge(a: NodeId, b: NodeId, u: NodeId, v: NodeId) {
  return (a === u && b === v) || (a === v && b === u);
}

function houseRoadRole(id: NodeId, step: Step) {
  if (step.processing === id) return "processing" as const;
  if (step.updated.includes(id)) return "updated" as const;
  if (step.answers[id] === -1) return "fail" as const;
  if (step.processed.includes(id)) return "processed" as const;
  return "idle" as const;
}

function edgeRole(u: NodeId, v: NodeId, step: Step) {
  const active = step.edge !== null && sameEdge(u, v, step.edge.u, step.edge.v);
  if (active && step.edgeTone === "fail") return "fail" as const;
  const kept = step.kept.find(([a, b]) => sameEdge(a, b, u, v));
  if (kept) return houseRoadRole(kept[1], step);
  if (active && step.edge) return houseRoadRole(step.edge.v, step);
  return "idle" as const;
}

const TOWER_W = 28;
const TOWER_CAP = 8;

function houseOutline(id: NodeId) {
  const { x, y } = POS[id];
  const left = x - NODE_W / 2;
  const right = x + NODE_W / 2;
  const wallTop = y - BODY_H / 2;
  const wallBottom = y + BODY_H / 2;
  if (id === 0) {
    const peakY = wallTop - ROOF_H;
    return [
      { x: left + TOWER_W / 2, y: peakY - TOWER_CAP },
      { x: left + TOWER_W, y: peakY },
      { x: left + TOWER_W, y: wallTop },
      { x: right, y: wallTop },
      { x: right, y: wallBottom },
      { x: left, y: wallBottom },
      { x: left, y: peakY },
    ];
  }
  return [
    { x, y: wallTop - ROOF_H },
    { x: right, y: wallTop },
    { x: right, y: wallBottom },
    { x: left, y: wallBottom },
    { x: left, y: wallTop },
  ];
}

function outlinePath(points: { x: number; y: number }[]) {
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
}

function borderPoint(fromId: NodeId, to: { x: number; y: number }) {
  const from = POS[fromId];
  const outline = houseOutline(fromId);
  let closest: { x: number; y: number; t: number } | null = null;
  for (let index = 0; index < outline.length; index += 1) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    const rx = to.x - from.x;
    const ry = to.y - from.y;
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-6) continue;
    const t = ((start.x - from.x) * sy - (start.y - from.y) * sx) / denom;
    const u = ((start.x - from.x) * ry - (start.y - from.y) * rx) / denom;
    if (t < 0 || t > 1 || u < 0 || u > 1) continue;
    if (!closest || t < closest.t) closest = { x: from.x + rx * t, y: from.y + ry * t, t };
  }
  return closest ?? from;
}

function roadStyle(role: "processed" | "processing" | "updated" | "fail" | "idle") {
  if (role === "processed") return { curb: "#059669", asphalt: PROCESSED.stroke, dash: "#ffffff" };
  if (role === "processing") return { curb: "#ca8a04", asphalt: PROCESSING.stroke, dash: "#ffffff" };
  if (role === "updated") return { curb: "#2563eb", asphalt: UPDATED.stroke, dash: "#ffffff" };
  if (role === "fail") return { curb: "#e11d48", asphalt: MISSED.stroke, dash: "#ffffff" };
  return { curb: "#d1d5db", asphalt: IDLE.stroke, dash: "#f8fafc" };
}

function edgeGeometry(u: NodeId, v: NodeId) {
  const a = POS[u];
  const b = POS[v];
  const start = borderPoint(u, b);
  const end = borderPoint(v, a);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const lift = Math.abs(dy) < 24 ? 0 : 16;
  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    mx: (a.x + b.x) / 2 + nx * lift,
    my: (a.y + b.y) / 2 + ny * lift,
  };
}

export default function DisappearingNodesVisualizer() {
  const [history, setHistory] = useState<Step[]>(() => [initialStep()]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<Move | null>(null);
  const [resumeAfter, setResumeAfter] = useState(false);
  const [dispatchRun, setDispatchRun] = useState(0);
  const [clock, setClock] = useState<number | null>(null);
  const historyRef = useRef(history);
  const indexRef = useRef(index);
  const pendingRef = useRef(pendingChoice);
  const resumeRef = useRef(resumeAfter);
  historyRef.current = history;
  indexRef.current = index;
  pendingRef.current = pendingChoice;
  resumeRef.current = resumeAfter;

  const step = history[index];
  const isDone = step.kind === "done";
  const routes = isDone ? brigadesFor(step) : [];
  const dispatchMax = routes.reduce((max, route) => Math.max(max, route.arrivals[route.arrivals.length - 1] ?? 0), 0);
  const dispatching = isDone && clock !== null && clock + 0.02 < dispatchMax;
  const kindMeta = noteAppearance(step);
  const KindIcon = kindMeta.icon;
  const choices = pendingChoice?.type === "choice" ? pendingChoice.options : null;

  function commit(frames: Step[], at: number) {
    historyRef.current = frames;
    indexRef.current = at;
    setHistory(frames);
    setIndex(at);
  }

  function advance(fromPlaying: boolean) {
    if (pendingRef.current) return;
    const frames = historyRef.current;
    const at = indexRef.current;
    const current = frames[at];
    if (!current || current.kind === "done") return;
    const move = nextMove(current);
    if (move.type === "choice") {
      pendingRef.current = move;
      setPendingChoice(move);
      resumeRef.current = fromPlaying;
      setResumeAfter(fromPlaying);
      setIsPlaying(false);
      return;
    }
    pendingRef.current = null;
    commit([...frames.slice(0, at + 1), move.step], at + 1);
  }

  function chooseHouse(id: NodeId) {
    const pending = pendingRef.current;
    if (pending?.type !== "choice") return;
    const selected = selectInto(pending.cursor, id);
    const resume = resumeRef.current;
    pendingRef.current = null;
    setPendingChoice(null);
    resumeRef.current = false;
    setResumeAfter(false);
    commit([...historyRef.current.slice(0, indexRef.current + 1), selected], indexRef.current + 1);
    if (resume) setIsPlaying(true);
  }

  useEffect(() => {
    if (!isPlaying || isDone || pendingChoice) return;
    const timer = setTimeout(() => advance(true), 2200);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, index, pendingChoice, history]);

  useEffect(() => {
    if (step.kind !== "done") {
      setClock(null);
      return;
    }
    const planned = brigadesFor(step);
    const maxTime = planned.reduce((max, route) => Math.max(max, route.arrivals[route.arrivals.length - 1] ?? 0), 0);
    let time = 0;
    let last = performance.now();
    let frame = 0;
    setClock(0);
    if (maxTime <= 0) return;
    const tick = (now: number) => {
      time = Math.min(maxTime, time + (now - last) / 680);
      last = now;
      setClock(time);
      if (time < maxTime) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, dispatchRun]);

  return (
    <div className="not-prose relative mt-5 mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Nodes</div>
            <div className="mt-0.5 font-mono text-[13px] font-semibold text-gray-900">n = 9</div>
          </div>
          <div className="hidden h-8 w-px bg-gray-200 sm:block" aria-hidden="true" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Disappear</div>
            <div className="mt-0.5 font-mono text-[13px] font-semibold text-gray-900">[20, 4, 8, 10, 9, 12, 9, 12, 15]</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Edges</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EDGES.map((edge) => (
              <span
                key={`${edge.u}-${edge.v}`}
                className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[12px] font-medium text-gray-800 ring-1 ring-gray-200"
              >
                [{edge.u}, {edge.v}, {edge.w}]
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-gradient-to-b from-slate-50/60 to-white">
        <div className="mx-auto min-w-[760px] px-3 py-4">
          <div className="relative">
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="block h-auto w-full"
              role="img"
              aria-label="Fire station dispatching emergency teams to nine houses, along roads with different travel times, before the houses are engulfed in flames"
            >
              {EDGES.map((edge) => {
                const role = edgeRole(edge.u, edge.v, step);
                const active =
                  step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
                const paint = roadStyle(role);
                const width = active ? 16 : 13;
                const { x1, y1, x2, y2 } = edgeGeometry(edge.u, edge.v);
                const dx = x2 - x1;
                const dy = y2 - y1;
                const length = Math.hypot(dx, dy) || 1;
                const ux = dx / length;
                const uy = dy / length;
                const tuck = 5;
                const gap = 20;
                const mid = length / 2;
                const dashInset = 8;
                const dashes =
                  mid > gap + dashInset
                    ? [
                        {
                          x1: x1 + ux * dashInset,
                          y1: y1 + uy * dashInset,
                          x2: x1 + ux * (mid - gap),
                          y2: y1 + uy * (mid - gap),
                        },
                        {
                          x1: x1 + ux * (mid + gap),
                          y1: y1 + uy * (mid + gap),
                          x2: x2 - ux * dashInset,
                          y2: y2 - uy * dashInset,
                        },
                      ]
                    : [];
                return (
                  <g key={`${edge.u}-${edge.v}`}>
                    <line
                      x1={x1 - ux * tuck}
                      y1={y1 - uy * tuck}
                      x2={x2 + ux * tuck}
                      y2={y2 + uy * tuck}
                      stroke={paint.curb}
                      strokeWidth={width}
                      strokeLinecap="butt"
                    />
                    <line
                      x1={x1 - ux * tuck}
                      y1={y1 - uy * tuck}
                      x2={x2 + ux * tuck}
                      y2={y2 + uy * tuck}
                      stroke={paint.asphalt}
                      strokeWidth={width - 4}
                      strokeLinecap="butt"
                    />
                    {dashes.map((dash) => (
                      <line
                        key={`${dash.x1}-${dash.y1}`}
                        x1={dash.x1}
                        y1={dash.y1}
                        x2={dash.x2}
                        y2={dash.y2}
                        stroke={paint.dash}
                        strokeWidth={1.6}
                        strokeDasharray="7 6"
                        strokeLinecap="butt"
                      />
                    ))}
                  </g>
                );
              })}

              {NODES.map((id) => {
                const paint = nodePaint(id, step);
                const { x, y } = POS[id];
                const outline = houseOutline(id);
                const wallTop = y - BODY_H / 2;
                const wallBottom = y + BODY_H / 2;
                const left = x - NODE_W / 2;
                const right = x + NODE_W / 2;
                if (id === 0) {
                  const bayX = left + TOWER_W + (right - left - TOWER_W) / 2;
                  const peakY = wallTop - ROOF_H;
                  return (
                    <g key={id}>
                      <path d={outlinePath(outline)} fill={paint.fill} />
                      <path
                        d={outlinePath([outline[0], outline[1], outline[6]])}
                        fill={paint.roof}
                      />
                      <rect
                        x={left + TOWER_W}
                        y={wallTop}
                        width={right - left - TOWER_W}
                        height={7}
                        fill={paint.roof}
                      />
                      <path
                        d={outlinePath(outline)}
                        fill="none"
                        stroke={paint.stroke}
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={left + TOWER_W / 2}
                        cy={peakY + 16}
                        r={4.5}
                        fill={paint.roof}
                        stroke={paint.stroke}
                        strokeWidth={1.5}
                      />
                      <text
                        x={bayX}
                        y={wallTop + 22}
                        textAnchor="middle"
                        fontSize={16}
                        fontWeight={700}
                        fill={paint.text}
                        fontFamily="var(--font-geist-sans), sans-serif"
                      >
                        {id}
                      </text>
                      <text
                        x={bayX}
                        y={wallTop + 38}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill={paint.subText}
                        fontFamily="var(--font-geist-sans), sans-serif"
                      >
                        disappears at {DISAPPEAR[id]}
                      </text>
                      <text
                        x={bayX}
                        y={wallBottom - 8}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={700}
                        fill={paint.text}
                        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                      >
                        {formatAnswer(step.answers[id])}
                      </text>
                    </g>
                  );
                }
                const roofRise = ROOF_H * (22 / (NODE_W / 2));
                const chimneyTop = outline[0].y + roofRise - 12;
                return (
                  <g key={id}>
                    <rect
                      x={x + 16}
                      y={chimneyTop}
                      width={12}
                      height={18}
                      fill={paint.roof}
                      stroke={paint.stroke}
                      strokeWidth={2}
                    />
                    <path d={outlinePath(outline.slice(1))} fill={paint.fill} />
                    <path d={outlinePath([outline[0], outline[1], outline[4]])} fill={paint.roof} />
                    <path
                      d={outlinePath(outline)}
                      fill="none"
                      stroke={paint.stroke}
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                    <text
                      x={x}
                      y={wallTop + 20}
                      textAnchor="middle"
                      fontSize={16}
                      fontWeight={700}
                      fill={paint.text}
                      fontFamily="var(--font-geist-sans), sans-serif"
                    >
                      {id}
                    </text>
                    <text
                      x={x}
                      y={wallTop + 36}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill={paint.subText}
                      fontFamily="var(--font-geist-sans), sans-serif"
                    >
                      disappears at {DISAPPEAR[id]}
                    </text>
                    <text
                      x={x}
                      y={wallTop + 52}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={700}
                      fill={paint.text}
                      fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                    >
                      {formatAnswer(step.answers[id])}
                    </text>
                  </g>
                );
              })}

              {EDGES.map((edge) => {
                const role = edgeRole(edge.u, edge.v, step);
                let stroke = "#e5e7eb";
                let text = "#4b5563";
                let fill = "#ffffff";
                if (role === "processed") {
                  stroke = PROCESSED.stroke;
                  fill = PROCESSED.fill;
                  text = PROCESSED.subText;
                }
                if (role === "processing") {
                  stroke = PROCESSING.stroke;
                  fill = PROCESSING.fill;
                  text = PROCESSING.subText;
                }
                if (role === "updated") {
                  stroke = UPDATED.stroke;
                  fill = UPDATED.fill;
                  text = UPDATED.subText;
                }
                if (role === "fail") {
                  stroke = MISSED.stroke;
                  fill = MISSED.fill;
                  text = MISSED.subText;
                }
                const { x1, y1, x2, y2 } = edgeGeometry(edge.u, edge.v);
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const label = String(edge.w);
                return (
                  <g key={`w-${edge.u}-${edge.v}`}>
                    <rect x={mx - 14} y={my - 11} width={28} height={22} rx={11} fill={fill} stroke={stroke} />
                    <text
                      x={mx}
                      y={my + 0.5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fontWeight={700}
                      fill={text}
                      fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              {isDone &&
                clock !== null &&
                routes.map((route, routeIndex) => {
                  const pose = brigadePose(route, clock, routeIndex, routes.length);
                  return (
                    <g
                      key={`brigade-${route.house}`}
                      data-brigade={route.house}
                      transform={`translate(${pose.x} ${pose.y}) rotate(${pose.angle})`}
                    >
                      <rect x={-12} y={-5.5} width={16} height={11} rx={2} fill="#dc2626" />
                      <rect x={2} y={-5} width={8} height={10} rx={1.5} fill="#fff7ed" stroke="#dc2626" strokeWidth={1} />
                      <rect x={-9} y={-8} width={7} height={2.4} rx={0.8} fill="#fbbf24" />
                      <circle cx={-6} cy={5.5} r={2.1} fill="#111827" />
                      <circle cx={5} cy={5.5} r={2.1} fill="#111827" />
                      <text
                        x={-4}
                        y={1.5}
                        textAnchor="middle"
                        fontSize={8}
                        fontWeight={700}
                        fill="#fff7ed"
                        fontFamily="var(--font-geist-sans), sans-serif"
                      >
                        {route.house}
                      </text>
                    </g>
                  );
                })}
            </svg>
            {choices && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="next-house-title"
                  className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
                >
                  <h3 id="next-house-title" className="text-sm font-semibold text-gray-900">
                    Which house should the next team go to?
                  </h3>
                  <p className="mt-1 text-[13px] leading-snug text-gray-500">
                    More than one house can already be reached. Choose the house the next team should visit.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => chooseHouse(choice.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-800 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97]"
                      >
                        House {choice.id}
                        <span className="font-mono text-[12px] text-gray-500">time {choice.time}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`mx-4 mb-4 flex min-h-[4.75rem] items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] leading-snug ${kindMeta.className}`}
        aria-live="polite"
      >
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${kindMeta.iconClass}`}>
          <KindIcon size={12} strokeWidth={2.5} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{kindMeta.label}</span>
          <span>{step.description}</span>
          {isDone && clock !== null && <span>{dispatchDescription(step, routes, clock)}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (pendingChoice) return;
              if (isDone) {
                const start = [initialStep()];
                pendingRef.current = null;
                resumeRef.current = false;
                commit(start, 0);
                setPendingChoice(null);
                setResumeAfter(false);
                setIsPlaying(true);
                return;
              }
              setIsPlaying((playing) => !playing);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 active:scale-[0.97]"
          >
            {isPlaying && !isDone ? <Pause size={14} strokeWidth={2.5} /> : <Play size={14} strokeWidth={2.5} />}
            {isDone ? "Replay" : isPlaying ? "Pause" : "Play"}
          </button>
          {isDone && (
            <button
              type="button"
              onClick={() => setDispatchRun((run) => run + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97]"
            >
              {dispatching ? "Dispatching" : "Dispatch"}
              {clock !== null && (
                <span className="font-mono text-[12px] text-gray-500">time {Math.min(clock, dispatchMax).toFixed(1)}</span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isPlaying) return;
              if (pendingRef.current) {
                pendingRef.current = null;
                resumeRef.current = false;
                setPendingChoice(null);
                setResumeAfter(false);
                return;
              }
              if (indexRef.current > 0) {
                indexRef.current -= 1;
                setIndex(indexRef.current);
              }
            }}
            disabled={isPlaying || (index === 0 && !pendingChoice)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipBack size={14} /> Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDone && !isPlaying) advance(false);
            }}
            disabled={isPlaying || isDone || pendingChoice !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipForward size={14} /> Step
          </button>
          <button
            type="button"
            onClick={() => {
              const start = [initialStep()];
              pendingRef.current = null;
              resumeRef.current = false;
              commit(start, 0);
              setIsPlaying(false);
              setPendingChoice(null);
              setResumeAfter(false);
            }}
            aria-label="Reset"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97]"
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="ml-auto flex min-w-[140px] flex-1 items-center gap-2.5 sm:min-w-[180px] sm:flex-none">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full border border-gray-300 bg-white">
            <div
              className="absolute inset-y-0 left-0 bg-black transition-all duration-200"
              style={{ width: `${isDone ? 100 : Math.min(92, ((index + 1) / 21) * 92)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium tabular-nums text-gray-500">
            {index + 1}
          </span>
        </div>
      </div>
    </div>
  );
}
