"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeStatus = "pending" | "active" | "include" | "exclude" | "base";
type EdgeType = "include" | "exclude" | null;

type TreeNode = {
  id: number;
  parentId: number | null;
  index: number;
  robbed: number[];
  total: number;
  status: NodeStatus;
  edgeLabel: string;
  edgeType: EdgeType;
  children: number[];
  isBase: boolean;
};

type Tree = Record<number, TreeNode>;

type LayoutNode = { x: number; y: number };
type Layout = Record<number, LayoutNode>;

type StatusStyleEntry = { bg: string; border: string; text: string; label: string };
type StatusStyleMap = Record<NodeStatus, StatusStyleEntry>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_NUMS: number[] = [2, 7, 9, 3, 1];

const STATUS_STYLE: StatusStyleMap = {
  pending: { bg: "#F9FAFB", border: "#D1D5DB", text: "#9CA3AF", label: "" },
  active:  { bg: "#FEF3C7", border: "#D97706", text: "#92400E", label: "▶ active" },
  include: { bg: "#DCFCE7", border: "#16A34A", text: "#14532D", label: "✓ rob" },
  exclude: { bg: "#DBEAFE", border: "#2563EB", text: "#1E3A8A", label: "→ skip" },
  base:    { bg: "#FEE2E2", border: "#DC2626", text: "#7F1D1D", label: "⊘ base" },
};

const LEGEND_LABELS: Partial<Record<NodeStatus, string>> = {
  active:  "Active call",
  include: "Rob (include)",
  exclude: "Skip (exclude)",
  base:    "Base case",
};

// ─── Tree building ────────────────────────────────────────────────────────────

let UID = 0;

type BuildTreeResult = { tree: Tree; order: number[] };

function buildTree(nums: number[]): BuildTreeResult {
  UID = 0;
  const tree: Tree = {};
  const order: number[] = [];

  function dfs(
    parentId: number | null,
    index: number,
    robbed: number[],
    edgeLabel: string,
    edgeType: EdgeType,
  ): number {
    const id = UID++;
    order.push(id);

    const isBase = index >= nums.length;
    const total = robbed.reduce((s, i) => s + nums[i], 0);

    let status: NodeStatus = "pending";
    if (isBase) status = "base";
    else if (edgeType === "include") status = "include";
    else if (edgeType === "exclude") status = "exclude";

    tree[id] = {
      id,
      parentId,
      index,
      robbed: [...robbed],
      total,
      status,
      edgeLabel,
      edgeType,
      children: [],
      isBase,
    };

    if (parentId !== null) tree[parentId].children.push(id);

    if (!isBase) {
      dfs(id, index + 2, [...robbed, index], `rob [${index}] +${nums[index]}`, "include");
      dfs(id, index + 1, [...robbed],        `skip [${index}]`,                "exclude");
    }

    return id;
  }

  dfs(null, 0, [], "start", null);
  return { tree, order };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_W = 88;
const NODE_H = 64;
const LEVEL_H = 100;
const H_GAP = 12;

function computeLayout(tree: Tree, rootId: number): Layout {
  const layout: Layout = {};
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

// ─── Best path ────────────────────────────────────────────────────────────────

function getBestPath(tree: Tree, rootId: number): Set<number> {
  function best(id: number): { val: number; path: number[] } {
    const node = tree[id];
    if (node.isBase) return { val: node.total, path: [id] };
    let bv = -Infinity, bp: number[] = [];
    for (const cid of node.children) {
      const r = best(cid);
      if (r.val > bv) { bv = r.val; bp = r.path; }
    }
    return { val: bv, path: [id, ...bp] };
  }
  const { path } = best(rootId);
  return new Set(path);
}

// ─── Explanation generator ────────────────────────────────────────────────────

function getExplanation(
  node: TreeNode | null,
  nums: number[],
  isFirstStep: boolean,
): string {
  if (!node) return "Press Play or Step → to begin the recursion.";
  if (isFirstStep) return "Starting at index 0. We'll decide for each house: rob it or skip it.";

  const idx = node.index;
  const val = nums[idx];
  const robbedStr = node.robbed.length
    ? `[${node.robbed.map(i => nums[i]).join(", ")}]`
    : "none";

  if (node.isBase) {
    return `Base case — index ${idx} ≥ ${nums.length} (out of bounds). No more houses. Total robbed so far: ${node.total}.`;
  }
  if (node.edgeType === "include") {
    return `Rob house[${idx}] (value = ${val}). Running total becomes ${node.total}. Next call: F(${idx + 2}) — skip adjacent house.`;
  }
  if (node.edgeType === "exclude") {
    return `Skip house[${idx}]. Running total stays ${node.total}. Next call: F(${idx + 1}) — try the next house.`;
  }
  return `F(${idx}) — current combo: ${robbedStr}, total = ${node.total}.`;
}

// ─── HouseRow ─────────────────────────────────────────────────────────────────

type HouseRowProps = {
  nums: number[];
  node: TreeNode | null;
};

function HouseRow({ nums, node }: HouseRowProps) {
  if (!node) {
    return (
      <div className="flex gap-2 items-end">
        {nums.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm font-semibold text-gray-400">
              {v}
            </div>
            <span className="text-[10px] text-gray-400">{i}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-end">
      {nums.map((v, i) => {
        const isRobbed   = node.robbed.includes(i);
        const isCurrent  = i === node.index && !node.isBase;
        const isAdjacent = node.robbed.includes(i - 1) || node.robbed.includes(i + 1);

        let cellStyle  = "bg-gray-50 border-gray-200 text-gray-400";
        let labelText  = "";
        let labelColor = "text-gray-400";

        if (isRobbed) {
          cellStyle  = "bg-green-100 border-green-500 text-green-800";
          labelText  = "robbed";
          labelColor = "text-green-600";
        } else if (isCurrent) {
          cellStyle  = "bg-amber-100 border-amber-500 text-amber-800";
          labelText  = "current";
          labelColor = "text-amber-600";
        } else if (node.isBase) {
          cellStyle = "bg-gray-50 border-gray-200 text-gray-300";
        } else if (isAdjacent) {
          cellStyle  = "bg-red-50 border-red-300 text-red-400";
          labelText  = "blocked";
          labelColor = "text-red-400";
        }

        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`text-[9px] font-medium h-3 ${labelColor}`}>{labelText}</span>
            <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${cellStyle}`}>
              {v}
            </div>
            <span className="text-[10px] text-gray-400">{i}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseRobberVisualizer() {
  const [inputVal, setInputVal]     = useState<string>("2, 7, 9, 3, 1");
  const [nums, setNums]             = useState<number[]>(DEFAULT_NUMS);
  const [inputError, setInputError] = useState<string>("");
  const [step, setStep]             = useState<number>(0);
  const [isPlaying, setIsPlaying]   = useState<boolean>(false);

  const [{ tree, order }, setTreeData] = useState<BuildTreeResult>(
    () => buildTree(DEFAULT_NUMS),
  );
  const [layout, setLayout]     = useState<Layout>(() => computeLayout(buildTree(DEFAULT_NUMS).tree, 0));
  const [bestPath, setBestPath] = useState<Set<number>>(() => getBestPath(buildTree(DEFAULT_NUMS).tree, 0));

  const rebuild = useCallback((newNums: number[]): void => {
    const data = buildTree(newNums);
    setTreeData(data);
    setLayout(computeLayout(data.tree, 0));
    setBestPath(getBestPath(data.tree, 0));
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
    if (!isPlaying || isDone) { setIsPlaying(false); return; }
    const t = setTimeout(() => setStep(s => s + 1), 650);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const activeNode: TreeNode | null = step > 0 ? tree[order[step - 1]] : null;
  const visibleSet = new Set(order.slice(0, step));

  const robCount  = order.slice(0, step).filter(id => tree[id].isBase).length;
  const maxFound  = step > 0
    ? Math.max(0, ...order.slice(0, step).filter(id => tree[id].isBase).map(id => tree[id].total))
    : 0;

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
            className="flex-1 min-w-36 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono bg-white focus:outline-none focus:border-amber-500 text-gray-800"
          />
          <button
            onClick={applyInput}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 flex items-center gap-1"
          >
            Build <ChevronRight size={14} />
          </button>
          {(["2,1,1,2", "1,2,3,1", "2,7,9,3,1"] as const).map(p => (
            <button
              key={p}
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
            { label: "Paths reached",  value: robCount,               cls: "text-2xl font-bold text-blue-600" },
            { label: "Best so far",    value: maxFound,               cls: "text-2xl font-bold text-green-600" },
          ] as { label: string; value: string | number; cls: string }[]).map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className={cls}>{value}</div>
            </div>
          ))}
        </div>

        {/* House row */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-4 flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">State</span>
          <HouseRow nums={nums} node={activeNode} />
          {activeNode && (
            <span className="ml-auto text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
              total = {activeNode.total}
            </span>
          )}
        </div>

        {/* Explanation */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-600 leading-relaxed min-h-[44px] mb-4">
          <span className="font-mono font-semibold text-amber-700 mr-2">
            {activeNode ? `F(${activeNode.index})` : "F(?)"}
          </span>
          {getExplanation(activeNode, nums, step === 1)}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isDone) { setStep(0); setIsPlaying(false); }
              else setIsPlaying(p => !p);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
            disabled={isPlaying || isDone}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <SkipForward size={15} /> Step
          </button>
          <button
            onClick={() => { setStep(0); setIsPlaying(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700"
          >
            <RotateCcw size={15} /> Reset
          </button>

          {/* Progress bar */}
          <div className="flex-1 flex items-center gap-2 ml-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-200"
                style={{ width: `${order.length ? (step / order.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">{step}/{order.length}</span>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        {(Object.entries(STATUS_STYLE) as [NodeStatus, StatusStyleEntry][])
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
        <span className="flex items-center gap-1.5 ml-auto">
          <span style={{
            display: "inline-block", width: 11, height: 11, borderRadius: 3,
            background: "#D1FAE5", border: "2px solid #059669",
          }} />
          Optimal path
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
            {(["def", "active", "inc", "exc", "opt"] as const).map((key) => {
              const fill = { def: "#D1D5DB", active: "#D97706", inc: "#16A34A", exc: "#2563EB", opt: "#059669" }[key];
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
            const isOpt = bestPath.has(node.id) && bestPath.has(node.parentId!) && ds !== "pending";

            const edgeColor = isOpt ? "#059669"
              : ds === "active"  ? "#D97706"
              : ds === "include" ? "#16A34A"
              : ds === "exclude" ? "#2563EB"
              : "#D1D5DB";

            const markerId = isOpt ? "arr-opt"
              : ds === "active"  ? "arr-active"
              : ds === "include" ? "arr-inc"
              : ds === "exclude" ? "arr-exc"
              : "arr-def";

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`e-${node.id}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2 - 2}
                  stroke={edgeColor}
                  strokeWidth={isOpt || ds === "active" ? 2 : 1}
                  markerEnd={`url(#${markerId})`}
                />
                <text
                  x={midX} y={midY - 5}
                  textAnchor="middle" fontSize={8}
                  fill={edgeColor}
                  fontWeight={ds === "active" || isOpt ? 600 : 400}
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

            const ds          = displayStatus(node.id);
            const s           = STATUS_STYLE[ds];
            const isOpt       = bestPath.has(node.id) && ds !== "pending";
            const robbedVals  = node.robbed.map(i => nums[i]);
            const borderColor = isOpt && ds !== "active" ? "#059669" : s.border;
            const borderWidth = ds === "active" || isOpt ? 2 : 1;
            const bgColor     = isOpt && ds === "base" ? "#D1FAE5" : s.bg;

            const statusLabel = node.isBase          ? `⊘ F(${node.index})`
              : ds === "active"                       ? `▶ F(${node.index})`
              : ds === "include"                      ? `✓ rob[${node.index}]`
              : ds === "exclude"                      ? `→ skip[${node.index}]`
              : `F(${node.index})`;

            return (
              <g key={`n-${node.id}`}>
                <rect
                  x={pos.x} y={pos.y}
                  width={NODE_W} height={NODE_H} rx={8}
                  fill={bgColor} stroke={borderColor} strokeWidth={borderWidth}
                />
                <text x={pos.x + NODE_W / 2} y={pos.y + 16}
                  textAnchor="middle" fontSize={10} fontWeight={700} fill={s.text}>
                  {robbedVals.length > 0 ? `[${robbedVals.join(",")}]` : "[ ]"}
                </text>
                <text x={pos.x + NODE_W / 2} y={pos.y + 30}
                  textAnchor="middle" fontSize={9} fill={s.text}>
                  total = {node.total}
                </text>
                <text x={pos.x + NODE_W / 2} y={pos.y + 44}
                  textAnchor="middle" fontSize={9} fontWeight={600} fill={s.text}>
                  {statusLabel}
                </text>
                {isOpt && ds === "base" && (
                  <text x={pos.x + NODE_W - 10} y={pos.y + 12} fontSize={10} fill="#059669">★</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}