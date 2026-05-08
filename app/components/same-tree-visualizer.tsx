"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Tree types ───────────────────────────────────────────────────────────────

type TreeNode = { val: number; left: TreeNode | null; right: TreeNode | null };

// ─── Presets (level-order strings, "null" for missing) ───────────────────────

const PRESETS: Record<string, string> = {
  "same":        "1,2,3 | 1,2,3",
  "diff val":    "1,2,3 | 1,2,4",
  "diff struct": "1,2 | 1,null,2",
  "deeper":      "1,2,3,4,5 | 1,2,3,4,5",
};

// ─── Level-order parser ───────────────────────────────────────────────────────

function parseLevelOrder(s: string): TreeNode | null {
  const tokens = s.split(",").map(t => t.trim()).filter(t => t.length > 0);
  if (tokens.length === 0 || tokens[0] === "null") return null;

  const rootVal = Number(tokens[0]);
  if (!Number.isFinite(rootVal)) throw new Error(`Invalid value "${tokens[0]}"`);

  const root: TreeNode = { val: rootVal, left: null, right: null };
  const queue: TreeNode[] = [root];
  let i = 1;

  while (queue.length > 0 && i < tokens.length) {
    const node = queue.shift()!;
    for (const slot of ["left", "right"] as const) {
      if (i >= tokens.length) break;
      const t = tokens[i++];
      if (t === "null") continue;
      const v = Number(t);
      if (!Number.isFinite(v)) throw new Error(`Invalid value "${t}"`);
      const child: TreeNode = { val: v, left: null, right: null };
      node[slot] = child;
      queue.push(child);
    }
  }
  return root;
}

function parseInput(s: string): [TreeNode | null, TreeNode | null] {
  const parts = s.split("|");
  if (parts.length !== 2) throw new Error('Input must contain exactly one "|" separator');
  return [parseLevelOrder(parts[0]), parseLevelOrder(parts[1])];
}

// ─── Tree utilities ───────────────────────────────────────────────────────────

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

function treeDepth(p: TreeNode | null, q: TreeNode | null): number {
  if (!p && !q) return 0;
  return 1 + Math.max(
    treeDepth(p?.left ?? null, q?.left ?? null),
    treeDepth(p?.right ?? null, q?.right ?? null),
  );
}

// ─── Algorithm shown on the right panel ──────────────────────────────────────
// Indices in this array correspond to line numbers (1-indexed).

const ALGORITHM_LINES = [
  "boolean isSameTree(TreeNode p, TreeNode q) {",        //  1
  "  if (p == null && q == null) return true;",          //  2
  "  if (p == null || q == null) return false;",         //  3
  "",                                                    //  4
  "  if (p.val != q.val) return false;",                 //  5
  "",                                                    //  6
  "  if (!isSameTree(p.left,  q.left)) return false;",   //  7
  "  return isSameTree(p.right, q.right);",              //  8
  "}",                                                   //  9
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type NodeState = "idle" | "active" | "visiting" | "match" | "mismatch";
type StepKind  =
  | "base_both_null"
  | "mismatch_null"
  | "compare_val"
  | "mismatch_val"
  | "recurse_left"
  | "left_match_recurse_right"
  | "left_mismatch"
  | "return_right";

type Step = {
  pState:      Record<string, NodeState>;
  qState:      Record<string, NodeState>;
  currentPath: string;
  description: string;
  result:      boolean | null;
  kind:        StepKind;
  lines:       number[];
};

function simulate(p: TreeNode | null, q: TreeNode | null): Step[] {
  const steps: Step[] = [];
  const pS: Record<string, NodeState> = {};
  const qS: Record<string, NodeState> = {};

  function snap(
    path: string,
    description: string,
    kind: StepKind,
    lines: number[],
    result: boolean | null = null,
  ) {
    steps.push({
      pState: { ...pS }, qState: { ...qS },
      currentPath: path, description, result, kind, lines,
    });
  }

  function dfs(pN: TreeNode | null, qN: TreeNode | null, path: string): boolean {
    const loc = path === "" ? "root" : path.split("").map(c => (c === "L" ? "left" : "right")).join(" → ");

    if (!pN && !qN) {
      snap(path,
        `At ${loc}: both nodes are null → return true.`,
        "base_both_null", [2], true);
      return true;
    }

    pS[path] = "active";
    qS[path] = "active";

    if (!pN || !qN) {
      snap(path,
        `At ${loc}: one is null (p=${pN?.val ?? "null"}, q=${qN?.val ?? "null"}) → structures differ → return false.`,
        "mismatch_null", [3], false);
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      return false;
    }

    snap(path,
      `At ${loc}: both non-null — compare p.val=${pN.val} with q.val=${qN.val}.`,
      "compare_val", [5]);

    if (pN.val !== qN.val) {
      snap(path,
        `At ${loc}: ${pN.val} ≠ ${qN.val} — values differ → return false.`,
        "mismatch_val", [5], false);
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      return false;
    }

    snap(path,
      `At ${loc}: ${pN.val} = ${qN.val} — recurse into the left subtrees.`,
      "recurse_left", [7]);

    pS[path] = "visiting";
    qS[path] = "visiting";
    const leftOk = dfs(pN.left, qN.left, path + "L");
    pS[path] = "active";
    qS[path] = "active";

    if (!leftOk) {
      snap(path,
        `At ${loc}: left subtrees differ → short-circuit, return false.`,
        "left_mismatch", [7], false);
      pS[path] = "mismatch";
      qS[path] = "mismatch";
      return false;
    }

    snap(path,
      `At ${loc}: left subtrees match — recurse into the right subtrees.`,
      "left_match_recurse_right", [8]);

    pS[path] = "visiting";
    qS[path] = "visiting";
    const rightOk = dfs(pN.right, qN.right, path + "R");
    pS[path] = rightOk ? "match" : "mismatch";
    qS[path] = rightOk ? "match" : "mismatch";

    snap(path,
      `At ${loc}: right subtrees ${rightOk ? "match" : "differ"} → return ${rightOk}.`,
      "return_right", [8], rightOk);

    return rightOk;
  }

  dfs(p, q, "");
  return steps;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const SVG_W   = 180;
const R_NODE  = 18;
const LEVEL_H = 60;

function pathXY(path: string): [number, number] {
  let l = 0, r = SVG_W, y = 25;
  for (const c of path) {
    const m = (l + r) / 2;
    if (c === "L") r = m; else l = m;
    y += LEVEL_H;
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
  tree, otherTree, paths, state, label, height,
}: {
  tree: TreeNode | null; otherTree: TreeNode | null;
  paths: string[]; state: Record<string, NodeState>;
  label: string; height: number;
}) {
  const edges = paths.filter(p => p.length > 0).map(p => [p.slice(0, -1), p] as [string, string]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.04em" }}>{label}</span>
      <svg width={SVG_W} height={height} style={{ overflow: "visible" }}>
        {edges.map(([from, to]) => {
          const [x1, y1] = pathXY(from);
          const [x2, y2] = pathXY(to);
          if (!nodeAt(tree, from)) return null;
          const childExists = !!nodeAt(tree, to);
          return (
            <line
              key={`e-${to}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={childExists ? "#d1d5db" : "#e5e7eb"}
              strokeWidth={1.5}
              strokeDasharray={childExists ? undefined : "4,3"}
            />
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

// ─── Algorithm panel ──────────────────────────────────────────────────────────

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.55]">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum  = idx + 1;
        const isActive = activeLines.includes(lineNum);
        return (
          <div
            key={lineNum}
            className={`flex transition-colors duration-150 rounded ${
              isActive ? "bg-amber-100/80" : ""
            }`}
          >
            <span className="w-7 text-right text-gray-300 pr-2 select-none tabular-nums">
              {lineNum}
            </span>
            <span className={`flex-1 whitespace-pre ${
              isActive ? "text-amber-900 font-semibold" : "text-gray-600"
            }`}>
              {line || "\u00A0"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_PRESET = "same";

export default function SameTreeVisualizer() {
  const [presetKey, setPresetKey] = useState<string>(DEFAULT_PRESET);

  const [trees, setTrees] = useState<[TreeNode | null, TreeNode | null]>(
    () => parseInput(PRESETS[DEFAULT_PRESET]),
  );
  const [steps, setSteps] = useState<Step[]>(() => {
    const [a, b] = parseInput(PRESETS[DEFAULT_PRESET]);
    return simulate(a, b);
  });
  const [step, setStep]           = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadPreset = useCallback((key: string) => {
    const [a, b] = parseInput(PRESETS[key]);
    setPresetKey(key);
    setTrees([a, b]);
    setSteps(simulate(a, b));
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
  const [p, q]      = trees;
  const paths       = unionPaths(p, q);
  const pState      = cur?.pState ?? {};
  const qState      = cur?.qState ?? {};
  const description = cur?.description
    ?? "Press Step or Start to walk through the recursion. Pick a preset below to try a different test case.";
  const kind        = cur?.kind  ?? null;
  const lines       = cur?.lines ?? [];
  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : null;

  // Tree panel height — fits whichever tree is deepest.
  const depth     = treeDepth(p, q);
  const svgHeight = Math.max(85, 25 + Math.max(0, depth - 1) * LEVEL_H + R_NODE + 8);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Main split: visualization (left) | algorithm (right) ── */}
      <div className="flex divide-x divide-gray-100">

        {/* Left: visualization (trees stacked) */}
        <div className="w-[260px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-3">
          <TreePanel tree={p} otherTree={q} paths={paths} state={pState} label="Tree P" height={svgHeight} />
          <div className="h-px bg-gray-100" />
          <TreePanel tree={q} otherTree={p} paths={paths} state={qState} label="Tree Q" height={svgHeight} />

          {/* Compact legend */}
          <div className="flex flex-wrap gap-2 text-[10px] mt-auto pt-2">
            {[
              { fill: "#fef3c7", stroke: "#f59e0b", label: "Comparing" },
              { fill: "#eff6ff", stroke: "#93c5fd", label: "In stack" },
              { fill: "#d1fae5", stroke: "#10b981", label: "Match" },
              { fill: "#fee2e2", stroke: "#ef4444", label: "Mismatch" },
              { fill: "transparent", stroke: "#e5e7eb", dashed: true, label: "null slot" },
            ].map(({ fill, stroke, label, dashed }) => (
              <span key={label} className="flex items-center gap-1">
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                  background: fill,
                  border: `1.5px ${dashed ? "dashed" : "solid"} ${stroke}`,
                }} />
                <span style={{ color: "#6b7280" }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: algorithm code + step description */}
        <div className="flex-1 min-w-0 bg-gray-50/60 px-5 pt-5 pb-5 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-1">
              Algorithm
            </span>
            <AlgorithmPanel activeLines={lines} />
          </div>

          {/* Step description */}
          <div className="flex flex-col gap-1 mt-2 pt-3 border-t border-gray-200/70">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              kind === "base_both_null"            ? "text-emerald-600" :
              kind === "mismatch_null" ||
              kind === "mismatch_val"   ||
              kind === "left_mismatch"             ? "text-red-500"     :
              kind === "compare_val"               ? "text-amber-600"   :
              kind === "recurse_left" ||
              kind === "left_match_recurse_right"  ? "text-blue-500"    :
              kind === "return_right"              ? "text-emerald-600" :
                                                     "text-gray-400"
            }`}>
              {kind === "base_both_null"           ? "Base case"   :
               kind === "mismatch_null"            ? "Mismatch"    :
               kind === "compare_val"              ? "Compare"     :
               kind === "mismatch_val"             ? "Mismatch"    :
               kind === "recurse_left"             ? "Recurse L"   :
               kind === "left_mismatch"            ? "Mismatch"    :
               kind === "left_match_recurse_right" ? "Recurse R"   :
               kind === "return_right"             ? "Return"      :
                                                     "Ready"}
            </span>
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
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-3.5 flex flex-col gap-2.5">

        {/* Presets row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
            Presets
          </span>
          {Object.entries(PRESETS).map(([key, raw]) => (
            <button
              key={key}
              type="button"
              onClick={() => loadPreset(key)}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                presetKey === key
                  ? "border-gray-400 bg-white text-gray-800"
                  : "border-gray-200 text-gray-500 hover:bg-white"
              }`}
              title={raw}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isDone) { setStep(0); setIsPlaying(false); }
              else setIsPlaying(prev => !prev);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
            disabled={isPlaying || isDone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <SkipForward size={13} /> Step
          </button>
          <button
            type="button"
            onClick={() => { setStep(0); setIsPlaying(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50"
          >
            <RotateCcw size={13} /> Reset
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-1 bg-gray-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 tabular-nums font-mono">
              {step}/{steps.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
