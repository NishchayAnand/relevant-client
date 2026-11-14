"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const EDGES = [
  [0, 1, 4],
  [0, 2, 1],
  [1, 2, 2],
  [3, 4, 5],
  [1, 4, 6],
  [2, 4, 3],
  [3, 5, 2],
  [4, 5, 1],
];

const NODE_IDS = [0, 1, 2, 3, 4, 5];

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 140, y: 36 },
  1: { x: 52, y: 118 },
  2: { x: 228, y: 118 },
  4: { x: 140, y: 200 },
  3: { x: 52, y: 292 },
  5: { x: 228, y: 292 },
};

const NODE_R = 16;

function parseNode(value: string) {
  return /^-?\d+$/.test(value) ? Number(value) : null;
}

function touches(edge: number[], node: number) {
  return edge[0] === node || edge[1] === node;
}

function other(edge: number[], node: number) {
  return edge[0] === node ? edge[1] : edge[0];
}

function format(edge: number[]) {
  return `[${edge[0]}, ${edge[1]}, ${edge[2]}]`;
}

function segment(u: number, v: number) {
  const a = POS[u];
  const b = POS[v];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const inset = NODE_R + 3;
  return {
    x1: a.x + (dx / len) * inset,
    y1: a.y + (dy / len) * inset,
    x2: b.x - (dx / len) * inset,
    y2: b.y - (dy / len) * inset,
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

type EdgeTone = "idle" | "current" | "hit" | "skip";

function edgeTone(index: number, cursor: number, done: boolean, hit: boolean): EdgeTone {
  if (cursor < index) return "idle";
  if (cursor === index && !done) return "current";
  return hit ? "hit" : "skip";
}

const EDGE_PAINT: Record<EdgeTone, { stroke: string; width: number; fill: string; text: string; pill: string }> = {
  idle: { stroke: "#d4d4d8", width: 1.5, fill: "#ffffff", text: "#52525b", pill: "#e4e4e7" },
  current: { stroke: "#4f46e5", width: 2.75, fill: "#eef2ff", text: "#3730a3", pill: "#a5b4fc" },
  hit: { stroke: "#10b981", width: 2.5, fill: "#ecfdf5", text: "#047857", pill: "#6ee7b7" },
  skip: { stroke: "#e4e4e7", width: 1.5, fill: "#fafafa", text: "#a1a1aa", pill: "#e4e4e7" },
};

export default function EdgeListScanVisualizer() {
  const [nodeText, setNodeText] = useState("3");
  const [cursor, setCursor] = useState(-1);
  const node = parseNode(nodeText);
  const done = cursor >= EDGES.length - 1 && cursor >= 0;
  const checked = cursor < 0 ? 0 : cursor + 1;
  const found =
    node === null ? [] : EDGES.slice(0, Math.max(checked, 0)).filter((edge) => touches(edge, node));

  let status = "Enter a node, then step through each row.";
  if (node !== null && cursor < 0) {
    status = `Each inner array is one edge. Neighbours of ${node} are not grouped.`;
  } else if (node !== null && cursor >= 0 && !done) {
    const edge = EDGES[cursor];
    status = touches(edge, node)
      ? `${format(edge)} contains ${node}. Keep stepping through the other rows.`
      : `${format(edge)} does not contain ${node}.`;
  } else if (node !== null && done) {
    status = `Read all ${EDGES.length} rows to find ${found.length} neighbours.`;
  }

  function setNode(value: string) {
    if (value !== "" && value !== "-" && !/^-?\d{0,6}$/.test(value)) return;
    setNodeText(value);
    setCursor(-1);
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          Neighbours of
          <input
            type="text"
            inputMode="numeric"
            aria-label="Node"
            value={nodeText}
            onChange={(event) => setNode(event.target.value)}
            className="w-14 rounded-md border border-neutral-200 bg-white px-2 py-1 text-center font-mono text-sm font-semibold text-neutral-900 outline-none focus:border-neutral-400"
          />
        </label>
        <p className="text-xs tabular-nums text-neutral-500">
          {checked}/{EDGES.length} rows read
        </p>
      </div>

      <div className="grid md:grid-cols-[auto_minmax(0,1fr)] md:divide-x md:divide-gray-100">
        <div className="px-4 py-4 font-mono text-sm">
          <div className="text-neutral-500">edges = [</div>
          <ol>
            {EDGES.map((edge, index) => {
              const seen = cursor >= index;
              const current = cursor === index && !done;
              const hit = node !== null && touches(edge, node);
              const last = index === EDGES.length - 1;
              const tone = current
                ? "bg-indigo-50 text-indigo-950"
                : seen && hit
                  ? "bg-emerald-50 text-emerald-900"
                  : seen
                    ? "text-neutral-400"
                    : "text-neutral-800";
              return (
                <li key={edge.join("-")} className={"flex items-center rounded-md px-2 py-1 " + tone}>
                  <span className="w-6 text-xs text-neutral-400">{index}</span>
                  <span className="text-neutral-400">[</span>
                  <ArrayCell value={edge[0]} mark={seen && node !== null && edge[0] === node} />
                  <span className="text-neutral-300">, </span>
                  <ArrayCell value={edge[1]} mark={seen && node !== null && edge[1] === node} />
                  <span className="text-neutral-300">, </span>
                  <ArrayCell value={edge[2]} />
                  <span className="text-neutral-400">{last ? "]" : "],"}</span>
                  <span className="pl-4 font-sans text-xs">
                    {seen && node !== null ? (hit ? `neighbour ${other(edge, node)}` : "skip") : ""}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="text-neutral-500">]</div>
        </div>

        <Graph node={node} cursor={cursor} done={done} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <p className="text-sm text-neutral-600" aria-live="polite">
          {status}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor(-1)}
            disabled={cursor < 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setCursor((index) => index + 1)}
            disabled={node === null || done}
            className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            Step
          </button>
        </div>
      </div>
    </div>
  );
}

function Graph({ node, cursor, done }: { node: number | null; cursor: number; done: boolean }) {
  const currentEdge = cursor >= 0 && !done ? EDGES[cursor] : null;
  const neighbours = new Set<number>();
  if (node !== null && cursor >= 0) {
    for (const edge of EDGES.slice(0, cursor + 1)) {
      if (touches(edge, node)) neighbours.add(other(edge, node));
    }
  }

  const ordered = EDGES.map((edge, index) => {
    const hit = node !== null && touches(edge, node);
    const tone = edgeTone(index, cursor, done, hit);
    const rank = tone === "skip" ? 0 : tone === "idle" ? 1 : tone === "hit" ? 2 : 3;
    return { edge, index, tone, rank };
  }).sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex items-center justify-center border-t border-gray-100 px-3 py-4 md:border-t-0">
      <svg
        viewBox="0 0 280 328"
        className="h-auto w-full max-w-[280px]"
        role="img"
        aria-label="Graph of the same edge list"
      >
        {ordered.map(({ edge, tone }) => {
          const paint = EDGE_PAINT[tone];
          const { x1, y1, x2, y2 } = segment(edge[0], edge[1]);
          return (
            <line
              key={`line-${edge.join("-")}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={paint.stroke}
              strokeWidth={paint.width}
              strokeLinecap="round"
            />
          );
        })}

        {NODE_IDS.map((id) => {
          const { x, y } = POS[id];
          const onCurrent =
            currentEdge !== null && (currentEdge[0] === id || currentEdge[1] === id);
          const isQuery = node !== null && id === node;
          const isNeighbour = neighbours.has(id);
          let fill = "#ffffff";
          let stroke = "#d4d4d8";
          let text = "#3f3f46";
          if (onCurrent && !isQuery && !isNeighbour) {
            fill = "#eef2ff";
            stroke = "#818cf8";
            text = "#3730a3";
          }
          if (isNeighbour) {
            fill = "#ecfdf5";
            stroke = "#059669";
            text = "#047857";
          }
          if (isQuery) {
            fill = "#eef2ff";
            stroke = "#4f46e5";
            text = "#312e81";
          }
          return (
            <g key={id}>
              <circle cx={x} cy={y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={2} />
              <text
                x={x}
                y={y + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={650}
                fill={text}
                fontFamily="var(--font-geist-sans), sans-serif"
              >
                {id}
              </text>
            </g>
          );
        })}

        {ordered.map(({ edge, tone }) => {
          const paint = EDGE_PAINT[tone];
          const { mx, my } = segment(edge[0], edge[1]);
          const label = String(edge[2]);
          const width = 18;
          return (
            <g key={`w-${edge.join("-")}`}>
              <rect
                x={mx - width / 2}
                y={my - 9}
                width={width}
                height={18}
                rx={9}
                fill={paint.fill}
                stroke={paint.pill}
              />
              <text
                x={mx}
                y={my + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={700}
                fill={paint.text}
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ArrayCell({ value, mark = false }: { value: number; mark?: boolean }) {
  return (
    <span className={"inline-block w-3 text-center " + (mark ? "font-semibold text-emerald-700" : "")}>
      {value}
    </span>
  );
}
