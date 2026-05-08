"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Tree types ───────────────────────────────────────────────────────────────

type TreeNode = { val: number; left: TreeNode | null; right: TreeNode | null };

function n(val: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode {
  return { val, left, right };
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, [TreeNode | null, TreeNode | null]> = {
  "same":        [n(1, n(2), n(3)),  n(1, n(2), n(3))],
  "diff val":    [n(1, n(2), n(3)),  n(1, n(2), n(4))],
  "diff struct": [n(1, n(2), null),  n(1, null,  n(2))],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function nodeAt(root: TreeNode | null, path: string): TreeNode | null {
  let cur = root;
  for (const c of path) {
    if (!cur) return null;
    cur = c === "L" ? cur.left : cur.right;
  }
  return cur;
}

function unionPaths(p: TreeNode | null, q: TreeNode | null, path = ""): string[] {
  if (!p && !q) return [];
  return [
    path,
    ...unionPaths(p?.left ?? null, q?.left ?? null, path + "L"),
    ...unionPaths(p?.right ?? null, q?.right ?? null, path + "R"),
  ];
}

function pathLabel(path: string): string {
  if (!path) return "root";
  return path.split("").map(c => (c === "L" ? "left" : "right")).join(" → ");
}

// ─── Simulation ───────────────────────────────────────────────────────────────

type NodeState = "idle" | "inQueue" | "active" | "match" | "mismatch";
type StepKind  = "init" | "skip" | "dequeue" | "match_val" | "mismatch_val" | "mismatch_null" | "done";

type Step = {
  pState:      Record<string, NodeState>;
  qState:      Record<string, NodeState>;
  queueSnap:   string[];            // paths in queue, front = index 0
  activePath:  string | null;
  description: string;
  result:      boolean | null;
  kind:        StepKind;
};

function simulate(p: TreeNode | null, q: TreeNode | null): Step[] {
  const steps: Step[] = [];
  const pS: Record<string, NodeState> = {};
  const qS: Record<string, NodeState> = {};

  function snap(
    queue: string[],
    activePath: string | null,
    description: string,
    result: boolean | null,
    kind: StepKind,
  ) {
    steps.push({
      pState: { ...pS }, qState: { ...qS },
      queueSnap: [...queue], activePath, description, result, kind,
    });
  }

  // Enqueue root pair
  const bfsQueue: string[] = [""];
  pS[""] = "inQueue";
  qS[""] = "inQueue";
  snap([...bfsQueue], null, "Enqueue root pair (p, q) → start BFS.", null, "init");

  while (bfsQueue.length > 0) {
    const path = bfsQueue.shift()!;
    const pN   = nodeAt(p, path);
    const qN   = nodeAt(q, path);
    const loc  = pathLabel(path);

    // Both null: skip, continue to next pair
    if (!pN && !qN) {
      snap([...bfsQueue], path,
        `Dequeued at ${loc}: both null → skip, continue.`,
        null, "skip");
      continue;
    }

    // Mark the pair as active
    pS[path] = "active";
    qS[path] = "active";

    // One null: structural mismatch
    if (!pN || !qN) {
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      snap([...bfsQueue], path,
        `Dequeued at ${loc}: p=${pN?.val ?? "null"}, q=${qN?.val ?? "null"} — one is null → structures differ → return false`,
        false, "mismatch_null");
      return steps;
    }

    // Both non-null: compare values
    snap([...bfsQueue], path,
      `Dequeued at ${loc}: compare p.val=${pN.val} and q.val=${qN.val}`,
      null, "dequeue");

    if (pN.val !== qN.val) {
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      snap([...bfsQueue], path,
        `At ${loc}: ${pN.val} ≠ ${qN.val} — values differ → return false`,
        false, "mismatch_val");
      return steps;
    }

    // Values match: enqueue both children pairs
    const lp = path + "L", rp = path + "R";
    bfsQueue.push(lp, rp);
    // Mark inQueue for both trees at both child positions (covers ghost nodes too)
    pS[lp] = "inQueue"; qS[lp] = "inQueue";
    pS[rp] = "inQueue"; qS[rp] = "inQueue";
    pS[path] = "match";
    qS[path] = "match";

    snap([...bfsQueue], path,
      `At ${loc}: ${pN.val} = ${qN.val} — values match → enqueue left and right child pairs`,
      null, "match_val");
  }

  snap([], null, "Queue empty → all pairs checked → return true", true, "done");
  return steps;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const SVG_W  = 160;
const SVG_H  = 125;
const R_NODE = 18;

function pathXY(path: string): [number, number] {
  let l = 0, r = SVG_W, y = 25;
  for (const c of path) {
    const m = (l + r) / 2;
    if (c === "L") r = m; else l = m;
    y += 65;
  }
  return [(l + r) / 2, y];
}

function realStyle(s: NodeState) {
  switch (s) {
    case "active":   return { fill: "#fef3c7", stroke: "#f59e0b", color: "#92400e" };
    case "inQueue":  return { fill: "#e0f2fe", stroke: "#0ea5e9", color: "#0369a1" };
    case "match":    return { fill: "#d1fae5", stroke: "#10b981", color: "#065f46" };
    case "mismatch": return { fill: "#fee2e2", stroke: "#ef4444", color: "#991b1b" };
    default:         return { fill: "#f9fafb", stroke: "#e2e8f0", color: "#94a3b8" };
  }
}

function ghostStyle(s: NodeState) {
  if (s === "active")   return { fill: "#fef3c7", stroke: "#f59e0b", color: "#92400e" };
  if (s === "inQueue")  return { fill: "#e0f2fe", stroke: "#0ea5e9", color: "#0369a1" };
  if (s === "mismatch") return { fill: "#fff1f2", stroke: "#ef4444", color: "#ef4444" };
  return { fill: "none", stroke: "#e5e7eb", color: "#d1d5db" };
}

// ─── TreePanel ────────────────────────────────────────────────────────────────

function TreePanel({
  tree, otherTree, paths, state, label,
}: {
  tree: TreeNode | null; otherTree: TreeNode | null;
  paths: string[]; state: Record<string, NodeState>; label: string;
}) {
  const edges = paths.filter(p => p.length > 0).map(p => [p.slice(0, -1), p] as [string, string]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.04em" }}>{label}</span>
      <svg width={SVG_W} height={SVG_H} style={{ overflow: "visible" }}>
        {edges.map(([from, to]) => {
          const [x1, y1] = pathXY(from);
          const [x2, y2] = pathXY(to);
          if (!nodeAt(tree, from)) return null;
          const childExists = !!nodeAt(tree, to);
          return (
            <line key={`e-${to}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={childExists ? "#d1d5db" : "#e5e7eb"}
              strokeWidth={1.5} strokeDasharray={childExists ? undefined : "4,3"} />
          );
        })}
        {paths.map(path => {
          const nd      = nodeAt(tree, path);
          const otherNd = nodeAt(otherTree, path);
          const [x, y]  = pathXY(path);
          const st      = (state[path] ?? "idle") as NodeState;

          if (nd) {
            const s = realStyle(st);
            return (
              <g key={`n-${path}`}>
                <circle cx={x} cy={y} r={R_NODE} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fill={s.color} fontSize={13} fontWeight="bold" fontFamily="monospace">
                  {nd.val}
                </text>
              </g>
            );
          }

          if (otherNd) {
            const s = ghostStyle(st);
            return (
              <g key={`g-${path}`}>
                <circle cx={x} cy={y} r={R_NODE}
                  fill={s.fill} stroke={s.stroke} strokeWidth={1.5} strokeDasharray="4,3" />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fill={s.color} fontSize={9} fontFamily="monospace">null</text>
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
}

// ─── Queue display ────────────────────────────────────────────────────────────

function QueueDisplay({
  queue, p, q,
}: { queue: string[]; p: TreeNode | null; q: TreeNode | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 34 }}>
      <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", letterSpacing: "0.05em" }}>QUEUE</span>
      {queue.length === 0 ? (
        <span style={{ fontSize: 10, color: "#d1d5db", fontStyle: "italic" }}>empty</span>
      ) : (
        <>
          <span style={{ fontSize: 9, color: "#0ea5e9", fontWeight: 600 }}>front</span>
          {queue.map((path, idx) => {
            const pVal = nodeAt(p, path)?.val ?? null;
            const qVal = nodeAt(q, path)?.val ?? null;
            const isFront = idx === 0;
            return (
              <div key={idx} style={{
                background: isFront ? "#0ea5e9" : "#e0f2fe",
                border: "1.5px solid #0ea5e9",
                color: isFront ? "#ffffff" : "#0369a1",
                borderRadius: 6, padding: "3px 8px",
                fontSize: 11, fontFamily: "monospace", fontWeight: 600, flexShrink: 0,
              }}>
                {pVal ?? "∅"},{qVal ?? "∅"}
              </div>
            );
          })}
          <span style={{ fontSize: 9, color: "#9ca3af" }}>back</span>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SameTreeBFSVisualizer() {
  const [presetKey, setPresetKey] = useState("same");
  const [[p, q], setPQ]           = useState<[TreeNode | null, TreeNode | null]>(PRESETS["same"]);
  const [steps, setSteps]         = useState<Step[]>(() => simulate(PRESETS["same"][0], PRESETS["same"][1]));
  const [step, setStep]           = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadPreset = useCallback((key: string) => {
    const pq = PRESETS[key];
    setPresetKey(key);
    setPQ(pq);
    setSteps(simulate(pq[0], pq[1]));
    setStep(0);
    setIsPlaying(false);
  }, []);

  const isDone = step >= steps.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep(s => s + 1), 850);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const cur         = step > 0 ? steps[step - 1] : null;
  const paths       = unionPaths(p, q);
  const pState      = cur?.pState    ?? {};
  const qState      = cur?.qState    ?? {};
  const queueSnap   = cur?.queueSnap ?? [];
  const description = cur?.description
    ?? "Step through the BFS to compare the two trees level by level. The queue holds pairs (P-node, Q-node) to be checked.";
  const result      = cur?.result  ?? null;
  const kind        = cur?.kind    ?? null;
  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : null;

  const activePath = cur?.activePath ?? null;
  const curPVal    = activePath !== null ? (nodeAt(p, activePath)?.val ?? null) : null;
  const curQVal    = activePath !== null ? (nodeAt(q, activePath)?.val ?? null) : null;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Main two-column layout ── */}
      <div className="flex divide-x divide-gray-100">

        {/* Left: trees + queue */}
        <div className="px-6 pt-6 pb-5 flex flex-col gap-4 shrink-0">
          <div className="flex items-start gap-5">
            <TreePanel tree={p} otherTree={q} paths={paths} state={pState} label="Tree P" />
            <div className="self-stretch w-px bg-gray-100 mt-6" />
            <TreePanel tree={q} otherTree={p} paths={paths} state={qState} label="Tree Q" />
          </div>
          <QueueDisplay queue={queueSnap} p={p} q={q} />
        </div>

        {/* Right: presets + status */}
        <div className="flex-1 flex flex-col px-5 pt-5 pb-5 gap-4 min-w-0">

          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            {Object.keys(PRESETS).map(key => (
              <button key={key} type="button" onClick={() => loadPreset(key)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  presetKey === key
                    ? "border-gray-400 bg-gray-100 text-gray-800"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}>
                {key}
              </button>
            ))}
          </div>

          {/* Current pair being processed */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400">Pair(</span>
              <span className={`px-1.5 py-0.5 rounded font-mono font-semibold text-xs ${
                curPVal === null ? "bg-gray-100 text-gray-400" : "bg-sky-50 text-sky-800"
              }`}>
                {curPVal ?? (activePath !== null ? "null" : "?")}
              </span>
              <span className="text-xs font-mono text-gray-400">,</span>
              <span className={`px-1.5 py-0.5 rounded font-mono font-semibold text-xs ${
                curQVal === null ? "bg-gray-100 text-gray-400" : "bg-sky-50 text-sky-800"
              }`}>
                {curQVal ?? (activePath !== null ? "null" : "?")}
              </span>
              <span className="text-xs font-mono text-gray-400">)</span>
              {result !== null && (
                <span className={`ml-auto text-xs font-bold font-mono ${result ? "text-emerald-600" : "text-red-500"}`}>
                  → {String(result)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              at {activePath !== null ? pathLabel(activePath) : "—"}
            </div>
          </div>

          {/* Step kind + description */}
          <div className="flex flex-col gap-1">
            {kind === "init"          && <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Start</span>}
            {kind === "dequeue"       && <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">BFS</span>}
            {kind === "match_val"     && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Match</span>}
            {kind === "mismatch_val"  && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Mismatch</span>}
            {kind === "mismatch_null" && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Mismatch</span>}
            {kind === "skip"          && <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Skip</span>}
            {kind === "done"          && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Done</span>}
            <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* Final result banner */}
          {isDone && finalResult !== null && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-center ${
              finalResult
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}>
              {finalResult ? "✓ Same Tree — true" : "✗ Not Same Tree — false"}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Legend</span>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {[
                { fill: "#fef3c7", stroke: "#f59e0b", label: "Processing" },
                { fill: "#e0f2fe", stroke: "#0ea5e9", label: "In queue"   },
                { fill: "#d1fae5", stroke: "#10b981", label: "Match"      },
                { fill: "#fee2e2", stroke: "#ef4444", label: "Mismatch"   },
              ].map(({ fill, stroke, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span style={{
                    display: "inline-block", width: 11, height: 11, borderRadius: "50%",
                    background: fill, border: `1.5px solid ${stroke}`,
                  }} />
                  <span style={{ color: "#6b7280" }}>{label}</span>
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span style={{
                  display: "inline-block", width: 11, height: 11, borderRadius: "50%",
                  background: "none", border: "1.5px dashed #e5e7eb",
                }} />
                <span style={{ color: "#6b7280" }}>null slot</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="border-t border-gray-100 px-5 py-4 flex gap-2">
        <button type="button"
          onClick={() => {
            if (isDone) { setStep(0); setIsPlaying(false); }
            else setIsPlaying(prev => !prev);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button"
          onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button type="button"
          onClick={() => { setStep(0); setIsPlaying(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>
        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full transition-all duration-200"
              style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">{step}/{steps.length}</span>
        </div>
      </div>
    </div>
  );
}
