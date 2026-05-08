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

// Collect all paths where at least one tree has a node.
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

type NodeState = "idle" | "active" | "visiting" | "match" | "mismatch";

type Step = {
  pState:      Record<string, NodeState>;
  qState:      Record<string, NodeState>;
  currentPath: string;
  currentP:    number | "null";
  currentQ:    number | "null";
  description: string;
  result:      boolean | null;
};

function simulate(p: TreeNode | null, q: TreeNode | null): Step[] {
  const steps: Step[] = [];
  const pS: Record<string, NodeState> = {};
  const qS: Record<string, NodeState> = {};

  function snap(
    path: string,
    cp: number | "null",
    cq: number | "null",
    description: string,
    result: boolean | null = null,
  ) {
    steps.push({ pState: { ...pS }, qState: { ...qS }, currentPath: path, currentP: cp, currentQ: cq, description, result });
  }

  function dfs(pN: TreeNode | null, qN: TreeNode | null, path: string): boolean {
    const loc  = pathLabel(path);
    const pVal = pN ? pN.val : ("null" as const);
    const qVal = qN ? qN.val : ("null" as const);

    // Handle both-null first — no visible nodes to highlight.
    if (!pN && !qN) {
      snap(path, "null", "null", `At ${loc}: both are null → return true`, true);
      return true;
    }

    // At least one tree has a node here — mark both paths active.
    pS[path] = "active";
    qS[path] = "active";

    if (!pN || !qN) {
      snap(path, pVal, qVal, `At ${loc}: p=${pVal}, q=${qVal} — one is null, structures differ → return false`, false);
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      return false;
    }

    snap(path, pVal, qVal, `At ${loc}: compare p.val=${pVal} and q.val=${qVal}`);

    if (pN.val !== qN.val) {
      snap(path, pVal, qVal, `At ${loc}: ${pVal} ≠ ${qVal} — values differ → return false`, false);
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      return false;
    }

    snap(path, pVal, qVal, `At ${loc}: ${pVal} = ${qVal} — values match → check left subtrees`);

    pS[path] = "visiting";
    qS[path] = "visiting";
    const leftOk = dfs(pN.left, qN.left, path + "L");
    pS[path] = "active";
    qS[path] = "active";

    if (!leftOk) {
      snap(path, pVal, qVal, `At ${loc}: left subtrees differ → short-circuit, return false`, false);
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      return false;
    }

    snap(path, pVal, qVal, `At ${loc}: left subtrees match → check right subtrees`);

    pS[path] = "visiting";
    qS[path] = "visiting";
    const rightOk = dfs(pN.right, qN.right, path + "R");
    pS[path] = "active";
    qS[path] = "active";

    pS[path] = rightOk ? "match" : "mismatch";
    qS[path] = rightOk ? "match" : "mismatch";
    snap(path, pVal, qVal, `At ${loc}: right subtrees ${rightOk ? "match" : "differ"} → return ${rightOk}`, rightOk);

    return rightOk;
  }

  dfs(p, q, "");
  return steps;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const SVG_W   = 160;
const SVG_H   = 125;
const R_NODE  = 18;

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
    case "visiting": return { fill: "#eff6ff", stroke: "#93c5fd", color: "#1e40af" };
    case "match":    return { fill: "#d1fae5", stroke: "#10b981", color: "#065f46" };
    case "mismatch": return { fill: "#fee2e2", stroke: "#ef4444", color: "#991b1b" };
    default:         return { fill: "#f9fafb", stroke: "#e2e8f0", color: "#94a3b8" };
  }
}

function ghostStyle(s: NodeState) {
  if (s === "active")   return { fill: "#fffbeb", stroke: "#f59e0b", color: "#92400e" };
  if (s === "visiting") return { fill: "#eff6ff", stroke: "#93c5fd", color: "#6b7280" };
  if (s === "mismatch") return { fill: "#fff1f2", stroke: "#ef4444", color: "#ef4444" };
  return { fill: "none", stroke: "#e5e7eb", color: "#d1d5db" };
}

// ─── TreePanel ────────────────────────────────────────────────────────────────

function TreePanel({
  tree, otherTree, paths, state, label,
}: {
  tree:      TreeNode | null;
  otherTree: TreeNode | null;
  paths:     string[];
  state:     Record<string, NodeState>;
  label:     string;
}) {
  const edges = paths
    .filter(p => p.length > 0)
    .map(p => [p.slice(0, -1), p] as [string, string]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <svg width={SVG_W} height={SVG_H} style={{ overflow: "visible" }}>
        {/* Edges behind nodes */}
        {edges.map(([from, to]) => {
          const [x1, y1] = pathXY(from);
          const [x2, y2] = pathXY(to);
          if (!nodeAt(tree, from)) return null; // no edge from a null parent
          const childExists = !!nodeAt(tree, to);
          return (
            <line
              key={`e-${to}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={childExists ? "#d1d5db" : "#e5e7eb"}
              strokeWidth={1.5}
              strokeDasharray={childExists ? undefined : "4,3"}
            />
          );
        })}

        {/* Nodes */}
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
                <text
                  x={x} y={y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={s.color} fontSize={13} fontWeight="bold" fontFamily="monospace"
                >
                  {nd.val}
                </text>
              </g>
            );
          }

          // Ghost: this tree is null but the other tree has a node here.
          if (otherNd) {
            const s = ghostStyle(st);
            return (
              <g key={`g-${path}`}>
                <circle
                  cx={x} cy={y} r={R_NODE}
                  fill={s.fill} stroke={s.stroke}
                  strokeWidth={1.5} strokeDasharray="4,3"
                />
                <text
                  x={x} y={y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={s.color} fontSize={9} fontFamily="monospace"
                >
                  null
                </text>
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
}

// ─── Value badge ──────────────────────────────────────────────────────────────

function ValBadge({ v }: { v: number | "null" | null }) {
  if (v === null) return <span className="text-gray-300 font-mono text-xs">?</span>;
  const isNull = v === "null";
  return (
    <span className={`px-1.5 py-0.5 rounded font-mono font-semibold text-xs ${
      isNull ? "bg-gray-100 text-gray-400" : "bg-amber-50 text-amber-800"
    }`}>
      {String(v)}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SameTreeVisualizer() {
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
  const pState      = cur?.pState ?? {};
  const qState      = cur?.qState ?? {};
  const description = cur?.description ?? "Step through to compare the two trees node by node (pre-order: root, left, right).";
  const result      = cur?.result ?? null;
  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : null;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Main two-column layout ── */}
      <div className="flex divide-x divide-gray-100">

        {/* Left: two trees side by side */}
        <div className="px-6 pt-6 pb-5 flex items-start gap-5 shrink-0">
          <TreePanel tree={p} otherTree={q} paths={paths} state={pState} label="Tree P" />
          <div className="self-stretch w-px bg-gray-100 mt-6" />
          <TreePanel tree={q} otherTree={p} paths={paths} state={qState} label="Tree Q" />
        </div>

        {/* Right: presets + status */}
        <div className="flex-1 flex flex-col px-5 pt-5 pb-5 gap-4 min-w-0">

          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            {Object.keys(PRESETS).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => loadPreset(key)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  presetKey === key
                    ? "border-gray-400 bg-gray-100 text-gray-800"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Current call info */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400">F(</span>
              <span className="text-xs font-mono text-gray-400">p =</span>
              <ValBadge v={cur?.currentP ?? null} />
              <span className="text-xs font-mono text-gray-400">, q =</span>
              <ValBadge v={cur?.currentQ ?? null} />
              <span className="text-xs font-mono text-gray-400">)</span>
              {result !== null && (
                <span className={`ml-auto text-xs font-bold font-mono ${
                  result ? "text-emerald-600" : "text-red-500"
                }`}>
                  → {String(result)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              at {cur ? pathLabel(cur.currentPath) : "—"}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>

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
                { fill: "#fef3c7", stroke: "#f59e0b", label: "Comparing"  },
                { fill: "#eff6ff", stroke: "#93c5fd", label: "In stack"   },
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
        <button
          type="button"
          onClick={() => {
            if (isDone) { setStep(0); setIsPlaying(false); }
            else setIsPlaying(prev => !prev);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button
          type="button"
          onClick={() => { setStep(0); setIsPlaying(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">{step}/{steps.length}</span>
        </div>
      </div>
    </div>
  );
}
