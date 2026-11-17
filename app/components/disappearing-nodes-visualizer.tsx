"use client";

import { useEffect, useState } from "react";
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

type Step = {
  kind: StepKind;
  answers: Answers;
  focus: NodeId;
  edge: { u: NodeId; v: NodeId } | null;
  edgeTone: "success" | "fail" | null;
  kept: Array<[NodeId, NodeId]>;
  description: string;
};

const STEPS: Step[] = [
  {
    kind: "setup",
    answers: [null, null, null, null, null, null, null, null, null],
    focus: 0,
    edge: null,
    edgeTone: null,
    kept: [],
    description:
      "A fire brigade leaves the fire station and must reach each house before it is engulfed. House 8 has no road to the others.",
  },
  {
    kind: "select",
    answers: [0, null, null, null, null, null, null, null, null],
    focus: 0,
    edge: null,
    edgeTone: null,
    kept: [],
    description:
      "The brigade starts at the fire station at time 0. The station stays reachable until 20, so the earliest arrival is 0.",
  },
  {
    kind: "reach",
    answers: [0, 2, null, null, null, null, null, null, null],
    focus: 1,
    edge: { u: 0, v: 1 },
    edgeTone: "success",
    kept: [[0, 1]],
    description:
      "The road from the fire station to house 1 takes 2. Arriving at 2 is before house 1 is engulfed at 4, so the earliest arrival is 2.",
  },
  {
    kind: "reach",
    answers: [0, 2, 5, null, null, null, null, null, null],
    focus: 2,
    edge: { u: 0, v: 2 },
    edgeTone: "success",
    kept: [[0, 1], [0, 2]],
    description:
      "The road from the fire station to house 2 takes 5. Arriving at 5 is before house 2 is engulfed at 8, so the earliest arrival is 5.",
  },
  {
    kind: "select",
    answers: [0, 2, 5, null, null, null, null, null, null],
    focus: 1,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [0, 2]],
    description:
      "The brigade can reach house 1 at 2 and house 2 at 5. It heads to house 1 next, the sooner of the two.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, null, null, null, null, null, null],
    focus: 2,
    edge: { u: 1, v: 2 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2]],
    description:
      "From house 1, the road to house 2 takes 1. Arriving at 3 is earlier than 5, and still before the house is engulfed at 8.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 6, null, null, null, null, null],
    focus: 3,
    edge: { u: 1, v: 3 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [1, 3]],
    description:
      "From house 1, the road to house 3 takes 4. Arriving at 6 is before house 3 is engulfed at 10, so the earliest arrival is 6.",
  },
  {
    kind: "select",
    answers: [0, 2, 3, 6, null, null, null, null, null],
    focus: 2,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [1, 3]],
    description:
      "The brigade can reach house 2 at 3 and house 3 at 6. It heads to house 2 next, the sooner of the two.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, null, null, null, null, null],
    focus: 3,
    edge: { u: 2, v: 3 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3]],
    description:
      "From house 2, the road to house 3 takes 2. Arriving at 5 is earlier than 6, and still before the house is engulfed at 10.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, null, null, null, null, null],
    focus: 4,
    edge: { u: 2, v: 4 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3]],
    description:
      "From house 2, the road to house 4 takes 6. The brigade would arrive at 9, just as house 4 is engulfed, so this route does not count.",
  },
  {
    kind: "select",
    answers: [0, 2, 3, 5, null, null, null, null, null],
    focus: 3,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3]],
    description:
      "House 3 is the only place left that the brigade can still reach, at time 5. They head there next.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, 6, null, null, null, null],
    focus: 4,
    edge: { u: 3, v: 4 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4]],
    description:
      "From house 3, the road to house 4 takes 1. Arriving at 6 is before house 4 is engulfed at 9, so the earliest arrival is 6.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, 6, 10, null, null, null],
    focus: 5,
    edge: { u: 3, v: 5 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]],
    description:
      "From house 3, the road to house 5 takes 5. Arriving at 10 is before house 5 is engulfed at 12, so the earliest arrival is 10.",
  },
  {
    kind: "select",
    answers: [0, 2, 3, 5, 6, 10, null, null, null],
    focus: 4,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]],
    description:
      "The brigade can reach house 4 at 6 and house 5 at 10. It heads to house 4 next, the sooner of the two.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, 6, 8, null, null, null],
    focus: 5,
    edge: { u: 4, v: 5 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From house 4, the road to house 5 takes 2. Arriving at 8 is earlier than 10, and still before the house is engulfed at 12.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, null, null, null],
    focus: 6,
    edge: { u: 4, v: 6 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From house 4, the road to house 6 takes 3. The brigade would arrive at 9, just as house 6 is engulfed, so this route does not count.",
  },
  {
    kind: "select",
    answers: [0, 2, 3, 5, 6, 8, null, null, null],
    focus: 5,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "House 5 is the only place left that the brigade can still reach, at time 8. They head there next.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, -1, null, null],
    focus: 6,
    edge: { u: 5, v: 6 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From house 5, the road to house 6 takes 2. The brigade would arrive at 10, after house 6 was engulfed at 9. No safe route remains, so the answer is −1.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, -1, -1, null],
    focus: 7,
    edge: { u: 5, v: 7 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From house 5, the road to house 7 takes 4. The brigade would arrive at 12, just as house 7 is engulfed, so this route does not count and the answer is −1.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, -1, -1, -1],
    focus: 8,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "House 8 is engulfed at 15, but no road connects it to the others. The brigade cannot reach it, so the answer is −1.",
  },
  {
    kind: "done",
    answers: [0, 2, 3, 5, 6, 8, -1, -1, -1],
    focus: 0,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "The earliest safe arrivals from the fire station are [0, 2, 3, 5, 6, 8, −1, −1, −1].",
  },
];

const STATUS: { processing: NodeId | null; processed: NodeId[]; updated: NodeId[] }[] = [
  { processing: null, processed: [], updated: [] },
  { processing: 0, processed: [], updated: [] },
  { processing: 0, processed: [], updated: [1] },
  { processing: 0, processed: [], updated: [1, 2] },
  { processing: 1, processed: [0], updated: [2] },
  { processing: 1, processed: [0], updated: [2] },
  { processing: 1, processed: [0], updated: [2, 3] },
  { processing: 2, processed: [0, 1], updated: [3] },
  { processing: 2, processed: [0, 1], updated: [3] },
  { processing: 2, processed: [0, 1], updated: [3] },
  { processing: 3, processed: [0, 1, 2], updated: [] },
  { processing: 3, processed: [0, 1, 2], updated: [4] },
  { processing: 3, processed: [0, 1, 2], updated: [4, 5] },
  { processing: 4, processed: [0, 1, 2, 3], updated: [5] },
  { processing: 4, processed: [0, 1, 2, 3], updated: [5] },
  { processing: 4, processed: [0, 1, 2, 3], updated: [5] },
  { processing: 5, processed: [0, 1, 2, 3, 4], updated: [] },
  { processing: 5, processed: [0, 1, 2, 3, 4], updated: [] },
  { processing: 5, processed: [0, 1, 2, 3, 4], updated: [] },
  { processing: null, processed: [0, 1, 2, 3, 4, 5], updated: [] },
  { processing: null, processed: [0, 1, 2, 3, 4, 5], updated: [] },
];

const KIND_META: Record<
  StepKind,
  { label: string; icon: LucideIcon; className: string; iconClass: string }
> = {
  setup: {
    label: "Route",
    icon: Info,
    className: "border-slate-200/70 bg-slate-50/90 text-slate-700",
    iconClass: "bg-slate-100 text-slate-600",
  },
  select: {
    label: "Next stop",
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
    label: "Unsafe",
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
    label: "Arrivals",
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

function nodePaint(id: NodeId, step: Step, stepIndex: number): NodePaint {
  const status = STATUS[stepIndex];
  if (status.processing === id) return PROCESSING;
  if (status.processed.includes(id)) return PROCESSED;
  if (status.updated.includes(id)) return UPDATED;
  if (step.answers[id] === -1) return MISSED;
  return IDLE;
}

function noteAppearance(step: Step, stepIndex: number) {
  const base = KIND_META[step.kind];
  if (step.kind === "miss" || step.kind === "blocked") return base;
  const paint = nodePaint(step.focus, step, stepIndex);
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

function edgeRole(u: NodeId, v: NodeId, step: Step, stepIndex: number) {
  const active = step.edge !== null && sameEdge(u, v, step.edge.u, step.edge.v);
  if (active && step.edgeTone === "fail") return "fail" as const;
  const kept = step.kept.find(([a, b]) => sameEdge(a, b, u, v));
  if (!kept) return "idle" as const;
  const child = kept[1];
  return STATUS[stepIndex].updated.includes(child) ? ("updated" as const) : ("processed" as const);
}

function houseOutline(id: NodeId) {
  const { x, y } = POS[id];
  const left = x - NODE_W / 2;
  const right = x + NODE_W / 2;
  const wallTop = y - BODY_H / 2;
  const wallBottom = y + BODY_H / 2;
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
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = index >= STEPS.length - 1;
  const step = STEPS[index];
  const kindMeta = noteAppearance(step, index);
  const KindIcon = kindMeta.icon;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => setIndex((value) => value + 1), 2200);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, index]);

  return (
    <div className="not-prose mt-5 mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
              aria-label="Rescue route drawn as nine houses, the roads between them, and the times they become unsafe"
            >
              {EDGES.map((edge) => {
                const role = edgeRole(edge.u, edge.v, step, index);
                const active =
                  step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
                let stroke = "#e5e7eb";
                let width = 1.75;
                if (role === "processed") {
                  stroke = "#10b981";
                  width = active ? 3.25 : 2.75;
                }
                if (role === "updated") {
                  stroke = "#3b82f6";
                  width = active ? 3.25 : 2.75;
                }
                if (role === "fail") {
                  stroke = "#f43f5e";
                  width = 3.25;
                }
                const { x1, y1, x2, y2 } = edgeGeometry(edge.u, edge.v);
                return (
                  <line
                    key={`${edge.u}-${edge.v}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={width}
                    strokeLinecap="round"
                  />
                );
              })}

              {NODES.map((id) => {
                const paint = nodePaint(id, step, index);
                const { x, y } = POS[id];
                const outline = houseOutline(id);
                const wallTop = y - BODY_H / 2;
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
                const role = edgeRole(edge.u, edge.v, step, index);
                let stroke = "#e5e7eb";
                let text = "#4b5563";
                let fill = "#ffffff";
                if (role === "processed") {
                  stroke = "#6ee7b7";
                  fill = "#ecfdf5";
                  text = "#047857";
                }
                if (role === "updated") {
                  stroke = "#93c5fd";
                  fill = "#eff6ff";
                  text = "#1d4ed8";
                }
                if (role === "fail") {
                  stroke = "#fda4af";
                  fill = "#fff1f2";
                  text = "#be123c";
                }
                const { mx, my } = edgeGeometry(edge.u, edge.v);
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
            </svg>
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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isDone) {
                setIndex(0);
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
          <button
            type="button"
            onClick={() => {
              if (index > 0 && !isPlaying) setIndex((value) => value - 1);
            }}
            disabled={isPlaying || index === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipBack size={14} /> Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDone && !isPlaying) setIndex((value) => value + 1);
            }}
            disabled={isPlaying || isDone}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SkipForward size={14} /> Step
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setIsPlaying(false);
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
              style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-medium tabular-nums text-gray-500">
            {index + 1}/{STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
}
