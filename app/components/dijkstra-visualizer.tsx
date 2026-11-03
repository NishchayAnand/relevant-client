"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const NODES = ["A", "B", "C", "D", "E"] as const;
type NodeId = (typeof NODES)[number];

const POS: Record<NodeId, { x: number; y: number }> = {
  A: { x: 72, y: 150 },
  B: { x: 188, y: 56 },
  C: { x: 188, y: 244 },
  D: { x: 360, y: 56 },
  E: { x: 360, y: 244 },
};

const EDGES: { u: NodeId; v: NodeId; w: number }[] = [
  { u: "A", v: "C", w: 2 },
  { u: "A", v: "B", w: 4 },
  { u: "B", v: "C", w: 1 },
  { u: "B", v: "D", w: 5 },
  { u: "B", v: "E", w: 12 },
  { u: "C", v: "E", w: 10 },
  { u: "D", v: "E", w: 2 },
];

const NODE_R = 22;

type StepKind = "init" | "settle" | "relax" | "skip" | "done";

type Step = {
  dist: Record<NodeId, number>;
  prev: Record<NodeId, NodeId | null>;
  settled: NodeId[];
  current: NodeId | null;
  edge: { u: NodeId; v: NodeId; w: number } | null;
  updated: NodeId | null;
  fromDist: number | null;
  candidate: number | null;
  previousDist: number | null;
  kind: StepKind;
  description: string;
};

function formatDist(d: number) {
  return d === Infinity ? "∞" : String(d);
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
  dist.A = 0;

  const settled = new Set<NodeId>();
  const steps: Step[] = [];

  function snap(
    kind: StepKind,
    description: string,
    current: NodeId | null,
    edge: Step["edge"],
    updated: NodeId | null,
    fromDist: number | null,
    candidate: number | null,
    previousDist: number | null,
  ) {
    steps.push({
      dist: { ...dist },
      prev: { ...prev },
      settled: [...settled],
      current,
      edge,
      updated,
      fromDist,
      candidate,
      previousDist,
      kind,
      description,
    });
  }

  snap(
    "init",
    "Every node starts unreachable (∞), except the source A, which is already at distance 0.",
    null,
    null,
    null,
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

    const closer =
      unfinished.length > 0
        ? ` It is closer than ${unfinished
            .map((node) => `${node} (${formatDist(dist[node])})`)
            .join(" and ")}.`
        : "";

    let settleText = `Settle ${current} at distance ${formatDist(dist[current])}.${closer}`;
    if (current === "A") {
      settleText =
        "Settle A. It is the unfinished node with the smallest distance, so 0 is final. Next, relax each edge that leaves A.";
    } else if (current === "C") {
      settleText = `Settle C at distance ${formatDist(dist.C)}.${closer} Weights are never negative, so no later path can undercut a distance this small.`;
    } else if (current === "E") {
      settleText = `Settle E at distance ${formatDist(dist.E)}. Every node is now final.`;
    }

    snap("settle", settleText, current, null, null, null, null, null);

    for (const { to, w } of neighbors(current)) {
      if (settled.has(to)) continue;
      const fromDist = dist[current];
      const candidate = fromDist + w;
      const previousDist = dist[to];
      const edge = { u: current, v: to, w };

      if (candidate < previousDist) {
        const oldPrev = prev[to];
        dist[to] = candidate;
        prev[to] = current;
        const replaced =
          previousDist === Infinity
            ? `${formatDist(fromDist)} + ${w} = ${candidate} is the first path that reaches ${to}.`
            : `${formatDist(fromDist)} + ${w} = ${candidate}, which is shorter than ${to}'s ${formatDist(previousDist)}.${
                oldPrev ? ` The path through ${oldPrev} is no longer best.` : ""
              }`;
        snap(
          "relax",
          `${current}–${to} weighs ${w}. ${replaced}`,
          current,
          edge,
          to,
          fromDist,
          candidate,
          previousDist,
        );
      } else {
        snap(
          "skip",
          `${current}–${to} weighs ${w}. ${formatDist(fromDist)} + ${w} = ${candidate}, which is not shorter than ${to}'s ${formatDist(previousDist)}. ${to} stays at ${formatDist(previousDist)}.`,
          current,
          edge,
          null,
          fromDist,
          candidate,
          previousDist,
        );
      }
    }
  }

  const summary = [...NODES]
    .sort((a, b) => dist[a] - dist[b])
    .map((node) => `${node} ${formatDist(dist[node])}`)
    .join(", ");

  snap(
    "done",
    `Shortest distances from A are ${summary}. Green edges are the shortest-path tree.`,
    null,
    null,
    null,
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

type Paint = { fill: string; stroke: string; text: string };

function paintNode(id: NodeId, step: Step): Paint {
  const isUpdated = step.updated === id;
  const isCurrent =
    step.current === id &&
    (step.kind === "settle" || step.kind === "relax" || step.kind === "skip");

  if (isUpdated) return { fill: "#ede9fe", stroke: "#8b5cf6", text: "#5b21b6" };
  if (isCurrent) return { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" };
  if (step.settled.includes(id)) return { fill: "#d1fae5", stroke: "#059669", text: "#065f46" };
  if (step.dist[id] !== Infinity) return { fill: "#e0f2fe", stroke: "#0284c7", text: "#075985" };
  return { fill: "#ffffff", stroke: "#d1d5db", text: "#6b7280" };
}

const KIND_META: Record<StepKind, { label: string; className: string }> = {
  init: { label: "Setup", className: "text-gray-400" },
  settle: { label: "Settle the closest node", className: "text-amber-600" },
  relax: { label: "Relax an edge", className: "text-violet-600" },
  skip: { label: "No improvement", className: "text-rose-500" },
  done: { label: "Done", className: "text-emerald-600" },
};

function edgeGeometry(u: NodeId, v: NodeId) {
  const a = POS[u];
  const b = POS[v];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: a.x + ux * NODE_R,
    y1: a.y + uy * NODE_R,
    x2: b.x - ux * NODE_R,
    y2: b.y - uy * NODE_R,
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

export default function DijkstraVisualizer() {
  const steps = useMemo(() => simulate(), []);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = index >= steps.length - 1;
  const step = steps[index];

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 1600);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, index]);

  const frontier = NODES.filter(
    (node) => !step.settled.includes(node) && step.dist[node] !== Infinity,
  )
    .map((node) => ({ node, dist: step.dist[node] }))
    .sort((a, b) => a.dist - b.dist);

  return (
    <div className="not-prose border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      <div className="flex flex-col md:flex-row md:divide-x md:divide-gray-100">
        <div className="px-4 pt-4 pb-2 md:w-[46%] shrink-0">
          <svg viewBox="0 0 440 300" className="w-full h-auto" role="img" aria-label="Weighted graph for Dijkstra">
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

            {NODES.map((id) => {
              const paint = paintNode(id, step);
              const { x, y } = POS[id];
              return (
                <g key={id}>
                  <circle cx={x} cy={y} r={NODE_R} fill={paint.fill} stroke={paint.stroke} strokeWidth={2} />
                  <text
                    x={x}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={700}
                    fill={paint.text}
                    fontFamily="var(--font-geist-sans), sans-serif"
                  >
                    {id}
                  </text>
                  <text
                    x={x}
                    y={y + 11}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill={paint.text}
                    fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  >
                    {formatDist(step.dist[id])}
                  </text>
                </g>
              );
            })}

            <text
              x={POS.A.x}
              y={POS.A.y - 32}
              textAnchor="middle"
              fontSize={10}
              fill="#9ca3af"
              fontFamily="var(--font-geist-sans), sans-serif"
            >
              source
            </text>

            {EDGES.map((edge) => {
              const active =
                step.edge !== null && sameEdge(edge.u, edge.v, step.edge.u, step.edge.v);
              const tree = isTreeEdge(edge.u, edge.v, step.prev);
              let stroke = "#e5e7eb";
              let text = "#4b5563";
              if (tree) stroke = "#6ee7b7";
              if (active && step.kind === "relax") {
                stroke = "#c4b5fd";
                text = "#6d28d9";
              }
              if (active && step.kind === "skip") {
                stroke = "#fda4af";
                text = "#be123c";
              }
              const { mx, my } = edgeGeometry(edge.u, edge.v);
              const label = String(edge.w);
              const width = Math.max(20, label.length * 8 + 12);
              return (
                <g key={`w-${edge.u}-${edge.v}`}>
                  <rect
                    x={mx - width / 2}
                    y={my - 9}
                    width={width}
                    height={18}
                    rx={6}
                    fill="white"
                    stroke={stroke}
                  />
                  <text
                    x={mx}
                    y={my + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={600}
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

        <div className="flex-1 flex flex-col gap-3 px-4 py-4 min-w-0">
          <div>
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${KIND_META[step.kind].className}`}>
              {KIND_META[step.kind].label}
            </div>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed" aria-live="polite">
              {step.description}
            </p>
          </div>

          {step.edge && step.candidate !== null && step.previousDist !== null && step.fromDist !== null && (
            <div
              className={`font-mono text-xs rounded-lg px-3 py-2 border ${
                step.kind === "relax"
                  ? "bg-violet-50 border-violet-200 text-violet-800"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {formatDist(step.fromDist)} + {step.edge.w} = {step.candidate}
              <span className="px-1.5">{step.kind === "relax" ? "<" : "≥"}</span>
              {formatDist(step.previousDist)}
              <span className="ml-1.5 text-[10px] opacity-70">
                dist[{step.edge.v}]
              </span>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1.5">
            {NODES.map((id) => {
              const paint = paintNode(id, step);
              const via = id === "A" ? "source" : step.prev[id] ? `via ${step.prev[id]}` : "—";
              return (
                <div
                  key={id}
                  className="rounded-lg border px-1 py-1.5 text-center"
                  style={{ background: paint.fill, borderColor: paint.stroke, color: paint.text }}
                >
                  <div className="text-xs font-semibold">{id}</div>
                  <div className="font-mono text-sm leading-tight">{formatDist(step.dist[id])}</div>
                  <div className="text-[10px] opacity-70">{via}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Unsettled, closest first
            </span>
            <div className="flex flex-wrap gap-1.5 min-h-[26px]">
              {frontier.length === 0 ? (
                <span className="text-xs text-gray-400 italic">none</span>
              ) : (
                frontier.map((item, i) => (
                  <span
                    key={item.node}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                      i === 0 && step.kind !== "done"
                        ? "border-sky-400 bg-sky-50 text-sky-800"
                        : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    {item.node}
                    <span className="font-mono">{formatDist(item.dist)}</span>
                    {i === 0 && step.kind !== "done" && (
                      <span className="text-[9px] uppercase tracking-wide text-sky-500">next</span>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto text-[10px] text-gray-500">
            {[
              { color: "#d97706", label: "Settling" },
              { color: "#8b5cf6", label: "Just updated" },
              { color: "#059669", label: "Final" },
              { color: "#0284c7", label: "Tentative" },
              { color: "#d1d5db", label: "Unreached" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-3 py-3 flex flex-col gap-2 sm:px-4">
        <div className="grid grid-cols-3 gap-2">
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
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-sky-600 text-white text-xs sm:text-sm font-medium hover:bg-sky-700"
          >
            {isPlaying && !isDone ? <Pause size={14} /> : <Play size={14} />}
            {isDone ? "Replay" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isDone && !isPlaying) setIndex((i) => i + 1);
            }}
            disabled={isPlaying || isDone}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-gray-800 text-white text-xs sm:text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <SkipForward size={14} /> Step
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setIsPlaying(false);
            }}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs sm:text-sm font-medium hover:bg-gray-50"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-200"
              style={{ width: `${(index / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {index + 1}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
