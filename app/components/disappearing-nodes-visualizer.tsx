"use client";

import { useEffect, useState } from "react";
import { Check, Flag, Info, Minus, Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";
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
const VB_H = 348;
const NODE_W = 132;
const NODE_H = 72;

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

type StepKind = "setup" | "reach" | "miss" | "blocked" | "done";
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
      "Nine locations. Each road shows its travel time, and each node shows when it disappears. Node 8 has no road to the others.",
  },
  {
    kind: "reach",
    answers: [0, null, null, null, null, null, null, null, null],
    focus: 0,
    edge: null,
    edgeTone: null,
    kept: [],
    description:
      "The team starts at node 0 at time 0. Node 0 disappears at 20, so this counts. Its answer is 0.",
  },
  {
    kind: "reach",
    answers: [0, 2, null, null, null, null, null, null, null],
    focus: 1,
    edge: { u: 0, v: 1 },
    edgeTone: "success",
    kept: [[0, 1]],
    description:
      "Road 0 → 1 takes 2. Arriving at 2 is before node 1 disappears at 4, so its answer is 2.",
  },
  {
    kind: "reach",
    answers: [0, 2, 5, null, null, null, null, null, null],
    focus: 2,
    edge: { u: 0, v: 2 },
    edgeTone: "success",
    kept: [[0, 1], [0, 2]],
    description:
      "Road 0 → 2 takes 5. Arriving at 5 is before node 2 disappears at 8.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, null, null, null, null, null, null],
    focus: 2,
    edge: { u: 1, v: 2 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2]],
    description:
      "From node 1, road 1 → 2 takes 1. 2 + 1 = 3, earlier than 5 and still before time 8. Node 2's answer becomes 3.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, null, null, null, null, null],
    focus: 3,
    edge: { u: 2, v: 3 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3]],
    description:
      "From node 2, road 2 → 3 takes 2. 3 + 2 = 5, before node 3 disappears at 10. Road 1 → 3 would arrive later, at 6.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, null, null, null, null, null],
    focus: 4,
    edge: { u: 2, v: 4 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3]],
    description:
      "From node 2, road 2 → 4 takes 6. 3 + 6 = 9. Node 4 disappears at 9, so arriving at that exact time does not count.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, 6, null, null, null, null],
    focus: 4,
    edge: { u: 3, v: 4 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4]],
    description:
      "From node 3, road 3 → 4 takes 1. 5 + 1 = 6, which is before time 9. Node 4's answer is 6.",
  },
  {
    kind: "reach",
    answers: [0, 2, 3, 5, 6, 8, null, null, null],
    focus: 5,
    edge: { u: 4, v: 5 },
    edgeTone: "success",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From node 4, road 4 → 5 takes 2. 6 + 2 = 8, before node 5 disappears at 12. Its answer is 8.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, null, null, null],
    focus: 6,
    edge: { u: 4, v: 6 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From node 4, road 4 → 6 takes 3. 6 + 3 = 9. Node 6 disappears at 9, so this arrival does not count.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, -1, null, null],
    focus: 6,
    edge: { u: 5, v: 6 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From node 5, road 5 → 6 takes 2. 8 + 2 = 10, after node 6 disappears at 9. Node 6 cannot be reached, so its answer is −1.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, -1, -1, null],
    focus: 7,
    edge: { u: 5, v: 7 },
    edgeTone: "fail",
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "From node 5, road 5 → 7 takes 4. 8 + 4 = 12. Node 7 disappears at 12, so arriving then does not count. Its answer is −1.",
  },
  {
    kind: "miss",
    answers: [0, 2, 3, 5, 6, 8, -1, -1, -1],
    focus: 8,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "Node 8 disappears at 15, but no road connects it to the rest of the graph. Its answer is −1.",
  },
  {
    kind: "done",
    answers: [0, 2, 3, 5, 6, 8, -1, -1, -1],
    focus: 0,
    edge: null,
    edgeTone: null,
    kept: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    description:
      "Minimum time from node 0 is [0, 2, 3, 5, 6, 8, −1, −1, −1].",
  },
];

const KIND_META: Record<
  StepKind,
  { label: string; icon: LucideIcon; className: string; iconClass: string }
> = {
  setup: {
    label: "Setup",
    icon: Info,
    className: "border-slate-200/70 bg-slate-50/90 text-slate-700",
    iconClass: "bg-slate-100 text-slate-600",
  },
  reach: {
    label: "Reach",
    icon: Check,
    className: "border-emerald-200/70 bg-emerald-50/90 text-emerald-900",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
  miss: {
    label: "Too late",
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
    label: "Done",
    icon: Flag,
    className: "border-emerald-200/70 bg-emerald-50/90 text-emerald-900",
    iconClass: "bg-emerald-100 text-emerald-700",
  },
};

type NodePaint = { fill: string; stroke: string; text: string; subText: string };

const REACHED: NodePaint = { fill: "#ecfdf5", stroke: "#10b981", text: "#064e3b", subText: "#047857" };
const MISSED: NodePaint = { fill: "#fff1f2", stroke: "#f43f5e", text: "#881337", subText: "#be123c" };
const FOCUS: NodePaint = { fill: "#fffbeb", stroke: "#f59e0b", text: "#78350f", subText: "#b45309" };
const IDLE: NodePaint = { fill: "#ffffff", stroke: "#e5e7eb", text: "#374151", subText: "#9ca3af" };

function nodePaint(id: NodeId, step: Step): NodePaint {
  if (step.focus === id && (step.kind === "setup" || step.kind === "blocked")) return FOCUS;
  if (step.focus === id && step.kind === "miss") return MISSED;
  if (step.focus === id && step.kind === "reach") return REACHED;
  if (step.answers[id] === -1) return MISSED;
  if (step.answers[id] !== null) return REACHED;
  return IDLE;
}

function formatAnswer(value: number | null) {
  if (value === null) return "—";
  if (value === -1) return "−1";
  return String(value);
}

function sameEdge(a: NodeId, b: NodeId, u: NodeId, v: NodeId) {
  return (a === u && b === v) || (a === v && b === u);
}

function isKept(u: NodeId, v: NodeId, kept: Step["kept"]) {
  return kept.some(([a, b]) => sameEdge(a, b, u, v));
}

function borderPoint(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const tx = dx === 0 ? Infinity : NODE_W / 2 / Math.abs(dx);
  const ty = dy === 0 ? Infinity : NODE_H / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function edgeGeometry(u: NodeId, v: NodeId) {
  const a = POS[u];
  const b = POS[v];
  const start = borderPoint(a, b);
  const end = borderPoint(b, a);
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
  const kindMeta = KIND_META[step.kind];
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
              aria-label="Rescue graph with nine nodes, their roads, and the times they disappear"
            >
              {EDGES.map((edge) => {
                const active =
                  step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
                const kept = isKept(edge.u, edge.v, step.kept);
                let stroke = "#e5e7eb";
                let width = 1.75;
                if (kept) {
                  stroke = "#10b981";
                  width = 2.75;
                }
                if (active && step.edgeTone === "success") {
                  stroke = "#10b981";
                  width = 3.25;
                }
                if (active && step.edgeTone === "fail") {
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
                const paint = nodePaint(id, step);
                const { x, y } = POS[id];
                return (
                  <g key={id}>
                    <rect
                      x={x - NODE_W / 2}
                      y={y - NODE_H / 2}
                      width={NODE_W}
                      height={NODE_H}
                      rx={16}
                      fill={paint.fill}
                      stroke={paint.stroke}
                      strokeWidth={2}
                    />
                    <text
                      x={x}
                      y={y - 14}
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
                      y={y + 2}
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
                      y={y + 20}
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
                const active =
                  step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
                const kept = isKept(edge.u, edge.v, step.kept);
                let stroke = "#e5e7eb";
                let text = "#4b5563";
                let fill = "#ffffff";
                if (kept || (active && step.edgeTone === "success")) {
                  stroke = "#6ee7b7";
                  fill = "#ecfdf5";
                  text = "#047857";
                }
                if (active && step.edgeTone === "fail") {
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
