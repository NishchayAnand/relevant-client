"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const TASK_IDS = [
  "account",
  "holdings",
  "quote",
  "market",
  "power",
  "limits",
  "lock",
  "risk",
  "build",
  "submit",
  "confirm",
] as const;
type TaskId = (typeof TASK_IDS)[number];

const LABEL: Record<TaskId, string> = {
  account: "Validate account",
  holdings: "Fetch holdings",
  quote: "Fetch quote",
  market: "Market status",
  power: "Buying power",
  limits: "Position limits",
  lock: "Lock symbol",
  risk: "Risk check",
  build: "Build order",
  submit: "Submit order",
  confirm: "Confirm fill",
};

const PREREQS: Record<TaskId, TaskId[]> = {
  account: [],
  holdings: [],
  quote: [],
  market: [],
  power: ["account", "quote"],
  limits: ["account", "holdings", "market"],
  lock: ["quote", "market"],
  risk: ["power", "limits"],
  build: ["lock"],
  submit: ["risk", "build"],
  confirm: ["submit"],
};

const W = 140;
const H = 46;

const POS: Record<TaskId, { x: number; y: number }> = {
  account: { x: 16, y: 14 },
  holdings: { x: 16, y: 76 },
  quote: { x: 16, y: 138 },
  market: { x: 16, y: 200 },
  power: { x: 204, y: 45 },
  limits: { x: 204, y: 107 },
  lock: { x: 204, y: 169 },
  risk: { x: 392, y: 76 },
  build: { x: 392, y: 169 },
  submit: { x: 580, y: 122 },
  confirm: { x: 768, y: 122 },
};

const EDGES: Array<[TaskId, TaskId]> = [
  ["account", "power"],
  ["quote", "power"],
  ["account", "limits"],
  ["holdings", "limits"],
  ["market", "limits"],
  ["quote", "lock"],
  ["market", "lock"],
  ["power", "risk"],
  ["limits", "risk"],
  ["lock", "build"],
  ["risk", "submit"],
  ["build", "submit"],
  ["submit", "confirm"],
];

function readyTasks(done: readonly TaskId[]): TaskId[] {
  const have = new Set(done);
  return TASK_IDS.filter((id) => !have.has(id) && PREREQS[id].every((item) => have.has(item)));
}

function remaining(id: TaskId, done: ReadonlySet<TaskId>) {
  return PREREQS[id].filter((item) => !done.has(item)).length;
}

function port(id: TaskId, side: "left" | "right", shift = 0) {
  const box = POS[id];
  const y = box.y + H / 2 + shift;
  return side === "left" ? { x: box.x, y } : { x: box.x + W, y };
}

function bend(from: { x: number; y: number }, to: { x: number; y: number }) {
  const mid = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`;
}

function edgePath(from: TaskId, to: TaskId) {
  if (to === "limits" && from === "account") return bend(port(from, "right"), port(to, "left", -8));
  if (to === "limits" && from === "holdings") return bend(port(from, "right"), port(to, "left"));
  if (to === "limits" && from === "market") return bend(port(from, "right"), port(to, "left", 8));
  if (to === "power" && from === "account") return bend(port(from, "right"), port(to, "left", -6));
  if (to === "power" && from === "quote") return bend(port(from, "right"), port(to, "left", 6));
  if (to === "lock" && from === "quote") return bend(port(from, "right"), port(to, "left", -6));
  if (to === "lock" && from === "market") return bend(port(from, "right"), port(to, "left", 6));
  if (to === "risk" && from === "power") return bend(port(from, "right"), port(to, "left", -6));
  if (to === "risk" && from === "limits") return bend(port(from, "right"), port(to, "left", 6));
  if (to === "submit" && from === "risk") return bend(port(from, "right"), port(to, "left", -6));
  if (to === "submit" && from === "build") return bend(port(from, "right"), port(to, "left", 6));
  return bend(port(from, "right"), port(to, "left"));
}

const FONT = "var(--font-geist-sans), ui-sans-serif, sans-serif";

export default function StockOrderWorkflowVisualizer() {
  const [chosen, setChosen] = useState<TaskId[]>([]);
  const finished = new Set(chosen);
  const readyList = readyTasks(chosen);
  const ready = new Set(readyList);
  const current = chosen.at(-1) ?? null;
  const complete = chosen.length === TASK_IDS.length;

  function trigger(id: TaskId) {
    setChosen((order) => (readyTasks(order).includes(id) ? [...order, id] : order));
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-2">
        <span className="text-[13px] font-medium text-neutral-400">Valid Topological Orderings (Permutations)</span>
      </div>
      <div className="h-[260px] overflow-x-auto overflow-y-hidden bg-[#f8fafc]">
        <svg viewBox="0 0 924 260" width="924" height="260" className="block h-[260px] w-[924px]" role="img" aria-label="Trigger a ready task. Each outgoing edge disappears, and a neighbor becomes ready only when every incoming edge is gone.">
          <defs>
            <marker id="stock-order-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
            </marker>
          </defs>
          {EDGES.map(([from, to]) => {
            const gone = finished.has(from);
            return (
              <g key={`${from}-${to}`} style={{ opacity: gone ? 0 : 1, transition: "opacity 280ms ease" }}>
                <path d={edgePath(from, to)} fill="none" stroke="#d4d4d8" strokeWidth={1.6} markerEnd="url(#stock-order-arrow)" />
              </g>
            );
          })}
          {TASK_IDS.map((id) => {
            const box = POS[id];
            const isFresh = current === id;
            const isDone = finished.has(id);
            const isReady = ready.has(id);
            const left = remaining(id, finished);
            const fill = isFresh ? "#4f46e5" : isDone ? "#eef2ff" : "#ffffff";
            const stroke = isFresh ? "#4f46e5" : isDone ? "#c7d2fe" : isReady ? "#4f46e5" : "#e4e4e7";
            const name = isFresh ? "#ffffff" : isDone || isReady ? "#312e81" : "#52525b";
            const sub = isFresh ? "#e0e7ff" : isReady ? "#4f46e5" : isDone ? "#6366f1" : "#a3a3a3";
            const detail = isDone ? "Processed" : left === 0 ? "Ready" : left === 1 ? "1 left" : `${left} left`;
            return (
              <g key={id} onClick={isReady ? () => trigger(id) : undefined} style={{ cursor: isReady ? "pointer" : "default" }}>
                {isReady ? <rect x={box.x - 4} y={box.y - 4} width={W + 8} height={H + 8} rx={14} fill="none" stroke="#c7d2fe" strokeDasharray="3 3" /> : null}
                <rect x={box.x} y={box.y} width={W} height={H} rx={12} fill={fill} stroke={stroke} strokeWidth={isReady || isFresh ? 1.75 : 1} />
                <text x={box.x + W / 2} y={box.y + 18} textAnchor="middle" fontFamily={FONT} fontSize={12.5} fontWeight={600} fill={name}>
                  {LABEL[id]}
                </text>
                <text x={box.x + W / 2} y={box.y + 34} textAnchor="middle" fontFamily={FONT} fontSize={11} fontWeight={600} fill={sub}>
                  {detail}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="space-y-3 border-t border-neutral-200 px-3 py-3">
        <div>
          <div className="mb-1 text-[11.5px] font-medium text-neutral-700">Ready to trigger</div>
          <div className="flex min-h-7 flex-wrap items-center gap-1">
            {readyList.length === 0 ? (
              <span className="text-[12px] text-neutral-300">{complete ? "Every task has been triggered" : "No task can be triggered"}</span>
            ) : (
              readyList.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => trigger(id)}
                  className="rounded-md border border-indigo-300 bg-white px-2 py-1 text-[12px] font-medium text-indigo-700"
                >
                  {LABEL[id]}
                </button>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11.5px] font-medium text-neutral-700">Triggered</div>
          <div className="flex h-12 flex-wrap content-start items-center gap-1 overflow-hidden">
            {chosen.length === 0 ? (
              <span className="text-[12px] text-neutral-300">No task triggered yet</span>
            ) : (
              chosen.map((id, index) => (
                <span key={id} className="inline-flex items-center gap-1">
                  {index > 0 ? <span className="text-[11px] text-neutral-400">then</span> : null}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                      current === id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {LABEL[id]}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChosen([])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-medium leading-none text-neutral-700"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setChosen((order) => order.slice(0, -1))}
            disabled={chosen.length === 0}
            className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-medium leading-none text-neutral-700 disabled:text-neutral-300"
          >
            Undo
          </button>
        </div>
        <span className="text-[12px] tabular-nums text-neutral-500">
          {chosen.length} / {TASK_IDS.length} triggered
        </span>
      </div>
    </div>
  );
}
