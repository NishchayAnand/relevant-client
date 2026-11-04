"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Flag,
  Info,
  Minus,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  TrendingDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NODES = ["India", "UAE", "Singapore", "UK", "USA"] as const;
type NodeId = (typeof NODES)[number];

const FLAG: Record<NodeId, string> = {
  India: "🇮🇳",
  UAE: "🇦🇪",
  Singapore: "🇸🇬",
  UK: "🇬🇧",
  USA: "🇺🇸",
};

const VB_W = 620;
const VB_H = 320;
const NODE_W = 136;
const NODE_H = 58;

const POS: Record<NodeId, { x: number; y: number }> = {
  India: { x: 108, y: 160 },
  UAE: { x: 282, y: 60 },
  Singapore: { x: 282, y: 260 },
  UK: { x: 478, y: 60 },
  USA: { x: 528, y: 260 },
};

const EDGES: { u: NodeId; v: NodeId; w: number }[] = [
  { u: "India", v: "UAE", w: 3 },
  { u: "India", v: "Singapore", w: 5 },
  { u: "India", v: "UK", w: 11 },
  { u: "UAE", v: "UK", w: 7 },
  { u: "UAE", v: "Singapore", w: 9 },
  { u: "Singapore", v: "USA", w: 17 },
  { u: "UK", v: "USA", w: 8 },
];

type StepKind = "init" | "settle" | "relax" | "skip" | "done";

type Step = {
  dist: Record<NodeId, number>;
  prev: Record<NodeId, NodeId | null>;
  settled: NodeId[];
  current: NodeId | null;
  edge: { u: NodeId; v: NodeId; w: number } | null;
  updated: NodeId | null;
  kind: StepKind;
  description: string;
};

function formatHours(d: number) {
  return d === Infinity ? "∞" : `${d}h`;
}

function neighbors(node: NodeId) {
  const out: { to: NodeId; w: number }[] = [];
  for (const edge of EDGES) {
    if (edge.u === node) out.push({ to: edge.v, w: edge.w });
    else if (edge.v === node) out.push({ to: edge.u, w: edge.w });
  }
  return out;
}

function simulate(): Step[] {
  const dist = {} as Record<NodeId, number>;
  const prev = {} as Record<NodeId, NodeId | null>;
  for (const node of NODES) {
    dist[node] = Infinity;
    prev[node] = null;
  }
  dist.India = 0;

  const settled = new Set<NodeId>();
  const steps: Step[] = [];

  function snap(
    kind: StepKind,
    description: string,
    current: NodeId | null,
    edge: Step["edge"],
    updated: NodeId | null,
  ) {
    steps.push({
      dist: { ...dist },
      prev: { ...prev },
      settled: [...settled],
      current,
      edge,
      updated,
      kind,
      description,
    });
  }

  snap(
    "init",
    "Find the shortest flight time from India. Start India at 0h and every other country at ∞.",
    null,
    null,
    null,
  );

  while (settled.size < NODES.length) {
    let current: NodeId | null = null;
    let best = Infinity;
    for (const node of NODES) {
      if (!settled.has(node) && dist[node] < best) {
        best = dist[node];
        current = node;
      }
    }
    if (current === null || best === Infinity) break;

    const unfinished = NODES.filter(
      (node) => !settled.has(node) && node !== current && dist[node] !== Infinity,
    ).sort((a, b) => dist[a] - dist[b]);

    settled.add(current);

    let settleText: string;
    if (current === "India") {
      settleText =
        "India is the starting point, so its shortest time is 0h. Now check its direct flights.";
    } else if (unfinished.length === 0) {
      settleText = `${current} is the last country left. ${dist[current]}h is final.`;
    } else {
      const other = unfinished[0];
      const extra =
        current === "UAE"
          ? " Flight times are never negative, so no later path can undercut this."
          : "";
      settleText = `${current} is the closest unfinished country (${dist[current]}h, closer than ${other} at ${dist[other]}h), so lock it in.${extra}`;
    }

    snap("settle", settleText, current, null, null);

    for (const { to, w } of neighbors(current)) {
      if (settled.has(to)) continue;
      const fromDist = dist[current];
      const candidate = fromDist + w;
      const previousDist = dist[to];
      const edge = { u: current, v: to, w };

      if (candidate < previousDist) {
        dist[to] = candidate;
        prev[to] = current;
        const text =
          previousDist === Infinity
            ? `${current} → ${to} takes ${w}h. First known route to ${to}: ${candidate}h.`
            : `Hop through ${current}: ${fromDist} + ${w} = ${candidate}h to ${to}. Beats the previous ${previousDist}h route.`;
        snap("relax", text, current, edge, to);
      } else {
        snap(
          "skip",
          `${current} → ${to} takes ${w}h. ${fromDist} + ${w} = ${candidate}h is not better than ${to}'s ${previousDist}h. Skip.`,
          current,
          edge,
          null,
        );
      }
    }
  }

  const summary = [...NODES]
    .filter((node) => node !== "India")
    .sort((a, b) => dist[a] - dist[b])
    .map((node) => `${node} ${dist[node]}h`)
    .join(" · ");

  snap(
    "done",
    `Fastest times from India: ${summary}. Green edges form the shortest-path tree.`,
    null,
    null,
    null,
  );

  return steps;
}

function sameEdge(a: NodeId, b: NodeId, u: NodeId, v: NodeId) {
  return (a === u && b === v) || (a === v && b === u);
}

function isTreeEdge(u: NodeId, v: NodeId, prev: Record<NodeId, NodeId | null>) {
  return prev[u] === v || prev[v] === u;
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
  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

type NodeState = "updated" | "current" | "settled" | "tentative" | "unreached";

const NODE_PAINT: Record<NodeState, { fill: string; stroke: string; text: string; subText: string }> = {
  updated:   { fill: "#f5f3ff", stroke: "#8b5cf6", text: "#4c1d95", subText: "#6d28d9" },
  current:   { fill: "#fffbeb", stroke: "#f59e0b", text: "#78350f", subText: "#b45309" },
  settled:   { fill: "#ecfdf5", stroke: "#10b981", text: "#064e3b", subText: "#047857" },
  tentative: { fill: "#eff6ff", stroke: "#3b82f6", text: "#1e3a8a", subText: "#1d4ed8" },
  unreached: { fill: "#ffffff", stroke: "#e5e7eb", text: "#6b7280", subText: "#9ca3af" },
};

function nodeState(id: NodeId, step: Step): NodeState {
  if (step.updated === id) return "updated";
  if (
    step.current === id &&
    (step.kind === "settle" || step.kind === "relax" || step.kind === "skip")
  ) {
    return "current";
  }
  if (step.settled.includes(id)) return "settled";
  if (step.dist[id] !== Infinity) return "tentative";
  return "unreached";
}

const KIND_META: Record<
  StepKind,
  { label: string; icon: LucideIcon; className: string; iconClass: string }
> = {
  init:   { label: "Setup",         icon: Info,         className: "border-slate-200/70 bg-slate-50/40 text-slate-700",       iconClass: "bg-slate-100 text-slate-600" },
  settle: { label: "Settle",        icon: Check,        className: "border-amber-200/70 bg-amber-50/40 text-amber-900",       iconClass: "bg-amber-100 text-amber-700" },
  relax:  { label: "Relax",         icon: TrendingDown, className: "border-violet-200/70 bg-violet-50/40 text-violet-900",    iconClass: "bg-violet-100 text-violet-700" },
  skip:   { label: "No improvement", icon: Minus,       className: "border-rose-200/70 bg-rose-50/40 text-rose-900",          iconClass: "bg-rose-100 text-rose-700" },
  done:   { label: "Done",          icon: Flag,         className: "border-emerald-200/70 bg-emerald-50/40 text-emerald-900", iconClass: "bg-emerald-100 text-emerald-700" },
};

function anchorNode(step: Step): NodeId {
  if (step.kind === "settle" && step.current) return step.current;
  if (step.kind === "relax" && step.updated) return step.updated;
  if (step.kind === "skip" && step.edge) return step.edge.v;
  return "India";
}

function tooltipStyle(nodeId: NodeId) {
  const x = POS[nodeId].x;
  const y = POS[nodeId].y;
  const xPct = (x / VB_W) * 100;
  const yPct = (y / VB_H) * 100;
  const above = y >= VB_H / 2;
  const horiz = xPct < 30 ? "0%" : xPct > 70 ? "-100%" : "-50%";
  const vert = above ? "calc(-100% - 44px)" : "44px";
  return {
    left: `${xPct}%`,
    top: `${yPct}%`,
    transform: `translate(${horiz}, ${vert})`,
  };
}

export default function DijkstraVisualizer() {
  const steps = useMemo(() => simulate(), []);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = index >= steps.length - 1;
  const step = steps[index];
  const kindMeta = KIND_META[step.kind];
  const KindIcon = kindMeta.icon;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 2200);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, index]);

  return (
    <div className="not-prose rounded-2xl border border-gray-200 bg-white overflow-hidden mt-5 mb-10">
      {/* Map */}
      <div className="overflow-x-auto bg-gradient-to-b from-slate-50/60 to-white">
        <div className="mx-auto min-w-[560px] max-w-[720px] px-3 py-5">
          <div className="relative">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="w-full h-auto block"
            role="img"
            aria-label="Flight-time graph between India, UAE, Singapore, UK, and USA"
          >

            {/* edges */}
            {EDGES.map((edge) => {
              const active =
                step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
              const tree = isTreeEdge(edge.u, edge.v, step.prev);
              let stroke = "#e5e7eb";
              let width = 1.75;
              if (tree) {
                stroke = "#10b981";
                width = 2.75;
              }
              if (active && step.kind === "relax") {
                stroke = "#8b5cf6";
                width = 3.25;
              }
              if (active && step.kind === "skip") {
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

            {/* nodes */}
            {NODES.map((id) => {
              const state = nodeState(id, step);
              const paint = NODE_PAINT[state];
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
                    y={y - 6}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={700}
                    fill={paint.text}
                    fontFamily="var(--font-geist-sans), sans-serif"
                  >
                    <tspan>{FLAG[id]} </tspan>
                    <tspan>{id}</tspan>
                  </text>
                  <text
                    x={x}
                    y={y + 14}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={paint.subText}
                    fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  >
                    {formatHours(step.dist[id])}
                  </text>
                </g>
              );
            })}

            {/* edge weight pills */}
            {EDGES.map((edge) => {
              const active =
                step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
              const tree = isTreeEdge(edge.u, edge.v, step.prev);
              let stroke = "#e5e7eb";
              let text = "#4b5563";
              let fill = "#ffffff";
              if (tree) {
                stroke = "#6ee7b7";
                fill = "#ecfdf5";
                text = "#047857";
              }
              if (active && step.kind === "relax") {
                stroke = "#c4b5fd";
                fill = "#f5f3ff";
                text = "#6d28d9";
              }
              if (active && step.kind === "skip") {
                stroke = "#fda4af";
                fill = "#fff1f2";
                text = "#be123c";
              }
              const { mx, my } = edgeGeometry(edge.u, edge.v);
              const label = `${edge.w}h`;
              const width = Math.max(26, label.length * 7 + 14);
              return (
                <g key={`w-${edge.u}-${edge.v}`}>
                  <rect
                    x={mx - width / 2}
                    y={my - 10}
                    width={width}
                    height={20}
                    rx={10}
                    fill={fill}
                    stroke={stroke}
                  />
                  <text
                    x={mx}
                    y={my + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
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

          {/* Floating tooltip anchored to the active node */}
          <div
            className={`absolute z-10 w-[240px] max-w-[70%] rounded-xl border px-3 py-2.5 text-[13px] leading-snug shadow-sm backdrop-blur-sm ${kindMeta.className}`}
            style={tooltipStyle(anchorNode(step))}
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${kindMeta.iconClass}`}>
                <KindIcon size={12} strokeWidth={2.5} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {kindMeta.label}
                </span>
                <span className="line-clamp-4">{step.description}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Controls */}
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
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 active:scale-[0.97]"
          >
            {isPlaying && !isDone ? <Pause size={14} strokeWidth={2.5} /> : <Play size={14} strokeWidth={2.5} />}
            {isDone ? "Replay" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDone && !isPlaying) setIndex((i) => i + 1);
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
        <div className="ml-auto flex min-w-[140px] flex-1 items-center gap-2.5 sm:flex-none sm:min-w-[180px]">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-200"
              style={{ width: `${(index / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-medium tabular-nums text-gray-500">
            {index + 1}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
