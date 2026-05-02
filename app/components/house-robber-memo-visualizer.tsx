"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeStatus = "pending" | "active" | "include" | "exclude" | "cache_hit" | "base";
type EdgeType = "include" | "exclude" | null;

type MemoTreeNode = {
  id: number;
  parentId: number | null;
  index: number;
  value: number;
  status: NodeStatus;
  edgeLabel: string;
  edgeType: EdgeType;
  children: number[];
  isBase: boolean;
  isCacheHit: boolean;
};

type Tree = Record<number, MemoTreeNode>;
type Layout = Record<number, { x: number; y: number }>;
type BuildResult = { tree: Tree; order: number[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_NUMS: number[] = [2, 7, 9, 3, 1];

type StatusEntry = { bg: string; border: string; text: string; label: string };
const STATUS_STYLE: Record<NodeStatus, StatusEntry> = {
  pending:   { bg: "#F9FAFB", border: "#D1D5DB", text: "#9CA3AF", label: "" },
  active:    { bg: "#FEF3C7", border: "#D97706", text: "#92400E", label: "▶ active" },
  include:   { bg: "#DCFCE7", border: "#16A34A", text: "#14532D", label: "✓ rob" },
  exclude:   { bg: "#DBEAFE", border: "#2563EB", text: "#1E3A8A", label: "→ skip" },
  cache_hit: { bg: "#EDE9FE", border: "#7C3AED", text: "#4C1D95", label: "⚡ cached" },
  base:      { bg: "#FEE2E2", border: "#DC2626", text: "#7F1D1D", label: "⊘ base" },
};

const LEGEND_LABELS: Partial<Record<NodeStatus, string>> = {
  active:    "Active call",
  include:   "Rob (include)",
  exclude:   "Skip (exclude)",
  cache_hit: "Cache hit",
  base:      "Base case",
};

// ─── Tree building ────────────────────────────────────────────────────────────

let UID = 0;

function buildMemoTree(nums: number[]): BuildResult {
  UID = 0;
  const n = nums.length;
  const dp: number[] = Array.from({ length: n }, () => -1);
  const tree: Tree = {};
  const order: number[] = [];

  function dfs(
    parentId: number | null,
    index: number,
    edgeLabel: string,
    edgeType: EdgeType,
  ): number {
    const id = UID++;
    order.push(id);

    const isBase     = index >= n;
    const isCacheHit = !isBase && dp[index] !== -1;

    const status: NodeStatus = isBase
      ? "base"
      : isCacheHit
        ? "cache_hit"
        : edgeType === "include"
          ? "include"
          : edgeType === "exclude"
            ? "exclude"
            : "pending";

    tree[id] = {
      id, parentId, index,
      value: isCacheHit ? dp[index] : isBase ? 0 : -1,
      status, edgeLabel, edgeType,
      children: [], isBase, isCacheHit,
    };

    if (parentId !== null) tree[parentId].children.push(id);

    if (!isBase && !isCacheHit) {
      const iv = nums[index] + dfs(id, index + 2, `rob[${index}] +${nums[index]}`, "include");
      const ev = dfs(id, index + 1, `skip[${index}]`, "exclude");
      dp[index] = Math.max(iv, ev);
      tree[id].value = dp[index];
    }

    return tree[id].value;
  }

  dfs(null, 0, "start", null);
  return { tree, order };
}

// ─── dp[] state per step ──────────────────────────────────────────────────────

function computeDpStates(tree: Tree, order: number[], n: number): number[][] {
  const orderPos: Record<number, number> = {};
  order.forEach((id, pos) => { orderPos[id] = pos; });

  function lastInSubtree(id: number): number {
    const node = tree[id];
    if (!node.children.length) return orderPos[id];
    return Math.max(orderPos[id], ...node.children.map(lastInSubtree));
  }

  const firstVisitNode: Record<number, number> = {};
  order.forEach(id => {
    const node = tree[id];
    if (!node.isBase && !node.isCacheHit && !(node.index in firstVisitNode)) {
      firstVisitNode[node.index] = id;
    }
  });

  const dpFillsAtStep: Record<number, number> = {};
  for (const idx of Object.keys(firstVisitNode)) {
    const i = parseInt(idx);
    dpFillsAtStep[i] = lastInSubtree(firstVisitNode[i]);
  }

  return Array.from({ length: order.length + 1 }, (_, step) => {
    const state = Array<number>(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (dpFillsAtStep[i] !== undefined && dpFillsAtStep[i] < step) {
        state[i] = tree[firstVisitNode[i]].value;
      }
    }
    return state;
  });
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 88;
const NODE_H = 64;
const LEVEL_H = 100;
const H_GAP   = 12;

function computeLayout(tree: Tree, rootId: number): Layout {
  const layout: Layout  = {};
  const subtreeW: Record<number, number> = {};

  function measure(id: number): number {
    const node = tree[id];
    if (!node.children.length) { subtreeW[id] = NODE_W; return NODE_W; }
    const total = node.children.reduce((s, cid) => s + measure(cid) + H_GAP, -H_GAP);
    subtreeW[id] = Math.max(total, NODE_W);
    return subtreeW[id];
  }

  function place(id: number, cx: number, depth: number): void {
    layout[id] = { x: cx - NODE_W / 2, y: depth * LEVEL_H };
    const node = tree[id];
    if (!node.children.length) return;
    let left = cx - subtreeW[id] / 2;
    for (const cid of node.children) {
      place(cid, left + subtreeW[cid] / 2, depth + 1);
      left += subtreeW[cid] + H_GAP;
    }
  }

  measure(rootId);
  place(rootId, subtreeW[rootId] / 2, 0);
  return layout;
}

// ─── Explanation ─────────────────────────────────────────────────────────────

function getExplanation(
  node: MemoTreeNode | null,
  nums: number[],
  step: number,
): string {
  if (step === 0) {
    return "Press Play or Step → to begin. Watch dp[] fill as each subproblem is solved, and see cache hits short-circuit repeated work.";
  }
  if (!node) return "";
  if (step === 1) {
    return `Starting at F(0): dp[0] is −1, not yet computed. We'll try rob[0] (+${nums[0]}) then skip[0].`;
  }
  if (node.isBase) {
    return `Base case — index ${node.index} ≥ ${nums.length} (out of bounds). Return 0.`;
  }
  if (node.isCacheHit) {
    return `Cache hit: dp[${node.index}] = ${node.value} was already stored. Return ${node.value} immediately — no need to re-explore this subtree.`;
  }
  if (node.edgeType === "include") {
    return `Rob house[${node.index}] (value = ${nums[node.index]}). dp[${node.index}] = −1, so compute F(${node.index}) fresh. Next call: F(${node.index + 2}) — skip the adjacent house.`;
  }
  if (node.edgeType === "exclude") {
    return `Skip house[${node.index}]. dp[${node.index}] = −1, so compute F(${node.index}) fresh. Next call: F(${node.index + 1}).`;
  }
  return `F(${node.index}): starting the memoized recursion.`;
}

// ─── dp[] row ─────────────────────────────────────────────────────────────────

function DpRow({
  nums,
  dpView,
  activeIndex,
  activeStatus,
}: {
  nums: number[];
  dpView: number[];
  activeIndex: number | null;
  activeStatus: NodeStatus | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-4">
      <div className="flex flex-wrap gap-y-3 gap-x-4 items-start">

        {/* nums */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">nums</span>
          <div className="flex gap-2">
            {nums.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg border-2 border-gray-200 bg-white flex items-center justify-center text-sm font-bold text-gray-800">
                  {v}
                </div>
                <span className="text-[10px] text-gray-400">{i}</span>
              </div>
            ))}
          </div>
        </div>

        {/* dp */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">dp</span>
          <div className="flex gap-2">
            {dpView.map((cell, i) => {
              let box = "border-gray-200 bg-gray-50 text-gray-500";
              if (i === activeIndex) {
                if (activeStatus === "cache_hit")
                  box = "border-violet-500 bg-violet-50 text-violet-900";
                else
                  box = "border-amber-500 bg-amber-50 text-amber-900";
              } else if (cell !== -1) {
                box = "border-emerald-400 bg-emerald-50 text-emerald-900";
              }
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-mono font-semibold transition-colors duration-200 ${box}`}
                  >
                    {cell === -1 ? "−1" : cell}
                  </div>
                  <span className="text-[10px] text-gray-400">{i}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseRobberMemoVisualizer() {
  const [inputVal, setInputVal]     = useState<string>("2, 7, 9, 3, 1");
  const [nums, setNums]             = useState<number[]>(DEFAULT_NUMS);
  const [inputError, setInputError] = useState<string>("");
  const [step, setStep]             = useState<number>(0);
  const [isPlaying, setIsPlaying]   = useState<boolean>(false);

  const [{ tree, order }, setTreeData] = useState<BuildResult>(
    () => buildMemoTree(DEFAULT_NUMS),
  );
  const [layout, setLayout]       = useState<Layout>(
    () => computeLayout(buildMemoTree(DEFAULT_NUMS).tree, 0),
  );
  const [dpStates, setDpStates]   = useState<number[][]>(() => {
    const d = buildMemoTree(DEFAULT_NUMS);
    return computeDpStates(d.tree, d.order, DEFAULT_NUMS.length);
  });

  const rebuild = useCallback((newNums: number[]): void => {
    const data = buildMemoTree(newNums);
    setTreeData(data);
    setLayout(computeLayout(data.tree, 0));
    setDpStates(computeDpStates(data.tree, data.order, newNums.length));
    setStep(0);
    setIsPlaying(false);
  }, []);

  const applyInput = (): void => {
    const parsed = inputVal
      .split(/[\s,]+/)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0);
    if (parsed.length < 2 || parsed.length > 6) {
      setInputError("Enter 2–6 positive integers.");
      return;
    }
    setInputError("");
    setNums(parsed);
    rebuild(parsed);
  };

  const isDone = step >= order.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep(s => s + 1), 650);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const activeNode: MemoTreeNode | null = step > 0 ? tree[order[step - 1]] : null;
  const visibleSet = new Set(order.slice(0, step));
  const dpView     = dpStates[step] ?? Array<number>(nums.length).fill(-1);

  const cacheHits = order.slice(0, step).filter(id => tree[id].isCacheHit).length;
  const dpWrites  = order.slice(0, step).filter(id => !tree[id].isBase && !tree[id].isCacheHit).length;
  const answer    = dpView[0] !== -1 ? dpView[0] : "—";

  const allPos = Object.values(layout);
  const svgW   = allPos.length ? Math.max(...allPos.map(p => p.x + NODE_W)) + 40 : 200;
  const svgH   = allPos.length ? Math.max(...allPos.map(p => p.y + NODE_H)) + 40 : 200;

  const displayStatus = (id: number): NodeStatus => {
    if (!visibleSet.has(id)) return "pending";
    if (order[step - 1] === id) return "active";
    const s = tree[id].status;
    return s === "pending" ? "pending" : s;
  };

  const handlePreset = (p: string): void => {
    const ns = p.split(",").map(Number);
    setInputVal(p.split(",").join(", "));
    setNums(ns);
    rebuild(ns);
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Header ── */}
      <div className="bg-gray-50 border-b border-gray-100 px-5 pt-5 pb-4">

        {/* Input row */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyInput()}
            placeholder="e.g. 2, 7, 9, 3, 1"
            className="flex-1 min-w-36 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono bg-white focus:outline-none focus:border-violet-500 text-gray-800"
          />
          {(["2,1,1,2", "1,2,3,1", "2,7,9,3,1"] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 font-mono"
            >
              [{p}]
            </button>
          ))}
        </div>
        {inputError && <p className="text-xs text-red-500 mb-3">{inputError}</p>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {([
            { label: "Array",          value: `[${nums.join(", ")}]`, cls: "text-sm font-bold text-gray-800" },
            { label: "Nodes explored", value: step,                   cls: "text-2xl font-bold text-amber-600" },
            { label: "Cache hits",     value: cacheHits,              cls: "text-2xl font-bold text-violet-600" },
            { label: "Result F(0)",    value: answer,                 cls: "text-2xl font-bold text-emerald-600" },
          ] as { label: string; value: string | number; cls: string }[]).map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className={cls}>{value}</div>
            </div>
          ))}
        </div>

        {/* nums + dp rows */}
        <DpRow
          nums={nums}
          dpView={dpView}
          activeIndex={activeNode && !activeNode.isBase ? activeNode.index : null}
          activeStatus={activeNode ? activeNode.status : null}
        />

        {/* Explanation */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-600 leading-relaxed min-h-11 mb-4">
          <span className="font-mono font-semibold text-violet-700 mr-2">
            {activeNode ? `F(${activeNode.index})` : "F(?)"}
          </span>
          {getExplanation(activeNode, nums, step)}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (isDone) { setStep(0); setIsPlaying(false); }
              else setIsPlaying(p => !p);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
            disabled={isPlaying || isDone}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <SkipForward size={15} /> Step
          </button>
          <button
            type="button"
            onClick={() => { setStep(0); setIsPlaying(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700"
          >
            <RotateCcw size={15} /> Reset
          </button>

          {/* Progress bar */}
          <div className="flex-1 flex items-center gap-2 ml-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-400 rounded-full transition-all duration-200"
                style={{ width: `${order.length ? (step / order.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{step}/{order.length}</span>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        {(Object.entries(STATUS_STYLE) as [NodeStatus, StatusEntry][])
          .filter(([k]) => k !== "pending")
          .map(([k, s]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span style={{
                display: "inline-block", width: 11, height: 11, borderRadius: 3,
                background: s.bg, border: `1.5px solid ${s.border}`,
              }} />
              {LEGEND_LABELS[k]}
            </span>
          ))}
        <span className="flex items-center gap-1.5 ml-auto text-gray-400">
          dp writes: <strong className="text-gray-700 ml-1">{dpWrites}</strong>
        </span>
      </div>

      {/* ── Tree SVG ── */}
      <div className="overflow-x-auto bg-white px-4 py-4">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ minWidth: svgW, display: "block" }}
        >
          <defs>
            {(["def", "active", "inc", "exc", "hit"] as const).map((key) => {
              const fill = {
                def:    "#D1D5DB",
                active: "#D97706",
                inc:    "#16A34A",
                exc:    "#2563EB",
                hit:    "#7C3AED",
              }[key];
              return (
                <marker key={key} id={`arr-${key}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill={fill} />
                </marker>
              );
            })}
          </defs>

          {/* Edges */}
          {Object.values(tree).map(node => {
            if (node.parentId === null || !visibleSet.has(node.id)) return null;
            const from = layout[node.parentId];
            const to   = layout[node.id];
            if (!from || !to) return null;

            const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H;
            const x2 = to.x   + NODE_W / 2, y2 = to.y;
            const ds = displayStatus(node.id);

            const edgeColor = ds === "active"    ? "#D97706"
              : ds === "include"                  ? "#16A34A"
              : ds === "exclude"                  ? "#2563EB"
              : ds === "cache_hit"                ? "#7C3AED"
              : ds === "base"                     ? "#DC2626"
              : "#D1D5DB";

            const markerId = ds === "active"    ? "arr-active"
              : ds === "include"                 ? "arr-inc"
              : ds === "exclude"                 ? "arr-exc"
              : ds === "cache_hit"               ? "arr-hit"
              : "arr-def";

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`e-${node.id}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2 - 2}
                  stroke={edgeColor}
                  strokeWidth={ds === "active" ? 2 : 1}
                  markerEnd={`url(#${markerId})`}
                />
                <text
                  x={midX} y={midY - 5}
                  textAnchor="middle" fontSize={8}
                  fill={edgeColor}
                  fontWeight={ds === "active" ? 600 : 400}
                >
                  {node.edgeLabel}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {Object.values(tree).map(node => {
            if (!visibleSet.has(node.id)) return null;
            const pos = layout[node.id];
            if (!pos) return null;

            const ds = displayStatus(node.id);
            const s  = STATUS_STYLE[ds];

            const statusLabel = node.isBase      ? `⊘ F(${node.index})`
              : node.isCacheHit                  ? `⚡ dp[${node.index}]=${node.value}`
              : ds === "active"                  ? `▶ F(${node.index})`
              : ds === "include"                 ? `✓ rob[${node.index}]`
              : ds === "exclude"                 ? `→ skip[${node.index}]`
              : `F(${node.index})`;

            const dpLabel = node.isBase
              ? "return 0"
              : node.isCacheHit
                ? "cached"
                : node.value !== -1
                  ? `= ${node.value}`
                  : "= ?";

            return (
              <g key={`n-${node.id}`}>
                <rect
                  x={pos.x} y={pos.y}
                  width={NODE_W} height={NODE_H} rx={8}
                  fill={s.bg} stroke={s.border}
                  strokeWidth={ds === "active" || node.isCacheHit ? 2 : 1}
                />
                <text x={pos.x + NODE_W / 2} y={pos.y + 18}
                  textAnchor="middle" fontSize={11} fontWeight={700} fill={s.text}>
                  {`F(${node.index})`}
                </text>
                <text x={pos.x + NODE_W / 2} y={pos.y + 33}
                  textAnchor="middle" fontSize={9} fill={s.text}>
                  {`dp[${node.index}] ${dpLabel}`}
                </text>
                <text x={pos.x + NODE_W / 2} y={pos.y + 48}
                  textAnchor="middle" fontSize={9} fontWeight={600} fill={s.text}>
                  {statusLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
