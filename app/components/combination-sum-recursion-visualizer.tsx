"use client";

import { useState, useEffect } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

const DEFAULT_CANDIDATES = [2, 3, 6, 7];
const DEFAULT_TARGET = 7;

// ─── Tree data structures ─────────────────────────────────────────────────────

type NodeStatus = "pending" | "active" | "valid" | "pruned";

type TreeNode = {
  id: number;
  parentId: number | null;
  index: number;           // candidate index
  combination: number[];   // combination so far
  remaining: number;       // target remaining
  status: NodeStatus;
  edgeLabel: string;        // "include 2" | "exclude 2"
  children: number[];       // child node ids
};

type Tree = Record<number, TreeNode>;

// Pre-build the full recursion tree
let nextId = 0;
function buildTree(
  candidates: number[],
  target: number,
): { tree: Tree; order: number[] } {
  nextId = 0;
  const tree: Tree = {};
  const order: number[] = [];  // DFS visit order

  function dfs(
    parentId: number | null,
    index: number,
    combination: number[],
    remaining: number,
    edgeLabel: string,
  ) {
    const id = nextId++;
    order.push(id);

    // Determine outcome immediately
    let status: NodeStatus = "pending";
    if (remaining === 0) status = "valid";
    else if (remaining < 0 || index >= candidates.length) status = "pruned";

    tree[id] = {
      id,
      parentId,
      index,
      combination: [...combination],
      remaining,
      status,
      edgeLabel,
      children: [],
    };

    if (parentId !== null) {
      tree[parentId].children.push(id);
    }

    // Only recurse if not a terminal node
    if (status === "pending") {
      const c = candidates[index];
      // Include: stay at same index (can reuse), reduce remaining
      dfs(id, index, [...combination, c], remaining - c, `include ${c}`);
      // Exclude: move to next index
      dfs(id, index + 1, [...combination], remaining, `exclude ${c}`);
    }
  }

  dfs(null, 0, [], target, "root");
  return { tree, order };
}

// ─── Layout ──────────────────────────────────────────────────────────────────
// Assign x/y positions using a simple recursive layout

type LayoutNode = { x: number; y: number };
type Layout = Record<number, LayoutNode>;

const NODE_W = 72;
const LEVEL_H = 90;

function computeLayout(tree: Tree, rootId: number): Layout {
  const layout: Layout = {};
  const subtreeWidth: Record<number, number> = {};

  // Bottom-up: compute subtree widths
  function calcWidth(id: number): number {
    const node = tree[id];
    if (node.children.length === 0) {
      subtreeWidth[id] = NODE_W;
      return NODE_W;
    }
    const total = node.children.reduce((sum, cid) => sum + calcWidth(cid) + 8, -8);
    subtreeWidth[id] = Math.max(total, NODE_W);
    return subtreeWidth[id];
  }
  calcWidth(rootId);

  // Top-down: assign x,y
  function assign(id: number, x: number, depth: number) {
    layout[id] = { x, y: depth * LEVEL_H };
    const node = tree[id];
    if (node.children.length === 0) return;
    let cx = x - subtreeWidth[id] / 2;
    for (const cid of node.children) {
      const cw = subtreeWidth[cid];
      assign(cid, cx + cw / 2, depth + 1);
      cx += cw + 8;
    }
  }
  assign(rootId, subtreeWidth[rootId] / 2, 0);

  return layout;
}

// ─── Component ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<NodeStatus, { bg: string; border: string; text: string }> = {
  pending:  { bg: "#f9fafb", border: "#d1d5db", text: "#6b7280" },
  active:   { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489" },
  valid:    { bg: "#dcfce7", border: "#16a34a", text: "#15803d" },
  pruned:   { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
};

export default function CombinationSumRecursionVisualizer() {
  const candidates = DEFAULT_CANDIDATES;
  const target = DEFAULT_TARGET;

  const { tree, order } = buildTree(candidates, target);
  const layout = computeLayout(tree, 0);

  const [step, setStep] = useState(0);       // index into order[] — how many nodes revealed
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = step >= order.length;

  useEffect(() => {
    if (!isPlaying || isDone) {
      setIsPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const executeStep = () => {
    if (!isDone) setStep(s => s + 1);
  };

  const reset = () => {
    setStep(0);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isDone) { reset(); return; }
    setIsPlaying(p => !p);
  };

  // Visible node ids = first `step` in DFS order
  const visibleSet = new Set(order.slice(0, step));

  // Determine display status for each visible node
  function displayStatus(id: number): NodeStatus {
    if (!visibleSet.has(id)) return "pending";
    const idx = order.indexOf(id);
    if (idx === step - 1) return "active";   // most recently revealed
    return tree[id].status === "pending" ? "pending" : tree[id].status;
  }

  // SVG canvas dimensions
  const maxX = Math.max(...Object.values(layout).map(l => l.x)) + NODE_W;
  const maxY = Math.max(...Object.values(layout).map(l => l.y)) + 60;
  const svgW = Math.max(maxX + 40, 400);
  const svgH = maxY + 20;

  const activeId = step > 0 ? order[step - 1] : null;
  const activeNode = activeId !== null ? tree[activeId] : null;

  // Count found combinations
  const foundCount = order.slice(0, step).filter(id => tree[id].status === "valid").length;
  const prunedCount = order.slice(0, step).filter(id => tree[id].status === "pruned").length;

  return (
    <div className="mt-5 mb-10 border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header stats */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Candidates</div>
            <div className="text-sm font-bold text-gray-800 mt-0.5">[{candidates.join(", ")}]</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Target</div>
            <div className="text-2xl font-bold text-indigo-600">{target}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Valid combinations</div>
            <div className="text-2xl font-bold text-green-600">{foundCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Branches pruned</div>
            <div className="text-2xl font-bold text-red-500">{prunedCount}</div>
          </div>
        </div>

        {/* Current call info */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm min-h-[48px] flex items-center">
          {activeNode ? (
            <div>
              <span className="font-mono font-semibold text-indigo-700">
                F({activeNode.index}, [{candidates.join(",")}], {activeNode.remaining})
              </span>
              {" — "}
              {activeNode.status === "valid" && (
                <span className="text-green-600 font-medium">
                  ✓ Found! [{activeNode.combination.join(", ")}] sums to {target}
                </span>
              )}
              {activeNode.status === "pruned" && activeNode.remaining < 0 && (
                <span className="text-red-500 font-medium">
                  ✗ Pruned — remaining {activeNode.remaining} {"<"} 0, backtrack
                </span>
              )}
              {activeNode.status === "pruned" && activeNode.remaining >= 0 && (
                <span className="text-red-500 font-medium">
                  ✗ Pruned — no more candidates to try (index {activeNode.index} out of bounds)
                </span>
              )}
              {(activeNode.status === "pending" || activeNode.status === "active") && (
                <span className="text-gray-600">
                  combination so far: [{activeNode.combination.join(", ")}], remaining = {activeNode.remaining}
                  {activeNode.index < candidates.length
                    ? ` — try include/exclude ${candidates[activeNode.index]}`
                    : ""}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Press Play or Step to start the recursion</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={executeStep}
            disabled={isPlaying || isDone}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <SkipForward size={16} />
            Step
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-600">
        {(["active", "pending", "valid", "pruned"] as NodeStatus[]).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span style={{
              display: "inline-block", width: 12, height: 12, borderRadius: 3,
              background: STATUS_STYLE[s].bg,
              border: `1.5px solid ${STATUS_STYLE[s].border}`,
            }} />
            {{
              active: "Active call",
              pending: "Not yet visited",
              valid: "Valid (sum = target)",
              pruned: "Pruned (backtrack)",
            }[s]}
          </span>
        ))}
      </div>

      {/* Tree SVG */}
      <div className="overflow-x-auto bg-white p-4">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ minWidth: svgW, display: "block" }}
        >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#d1d5db" />
            </marker>
          </defs>

          {/* Edges */}
          {Object.values(tree).map(node => {
            if (node.parentId === null) return null;
            if (!visibleSet.has(node.id)) return null;
            const from = layout[node.parentId];
            const to = layout[node.id];
            const px = from.x + 36;
            const py = from.y + 52;
            const cx = to.x + 36;
            const cy = to.y;

            const midX = (px + cx) / 2;
            const midY = (py + cy) / 2;
            const ds = displayStatus(node.id);
            const edgeColor = ds === "valid" ? "#16a34a" : ds === "pruned" ? "#ef4444" : ds === "active" ? "#534AB7" : "#d1d5db";

            return (
              <g key={`edge-${node.id}`}>
                <line
                  x1={px} y1={py} x2={cx} y2={cy}
                  stroke={edgeColor} strokeWidth={ds === "active" ? 2 : 1}
                  markerEnd="url(#arrow)"
                />
                <text
                  x={midX} y={midY - 4}
                  textAnchor="middle"
                  fontSize={9}
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
            const ds = displayStatus(node.id);
            const s = STATUS_STYLE[ds];
            const isActive = ds === "active";

            return (
              <g key={`node-${node.id}`}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={NODE_W}
                  height={52}
                  rx={8}
                  fill={s.bg}
                  stroke={s.border}
                  strokeWidth={isActive ? 2 : 1}
                />
                {/* combination */}
                <text
                  x={pos.x + NODE_W / 2}
                  y={pos.y + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={s.text}
                >
                  {node.combination.length > 0
                    ? `[${node.combination.join(",")}]`
                    : "[ ]"
                  }
                </text>
                {/* remaining */}
                <text
                  x={pos.x + NODE_W / 2}
                  y={pos.y + 30}
                  textAnchor="middle"
                  fontSize={9}
                  fill={s.text}
                >
                  rem={node.remaining}
                </text>
                {/* status indicator */}
                <text
                  x={pos.x + NODE_W / 2}
                  y={pos.y + 44}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={s.text}
                >
                  {ds === "valid" ? "✓ found" : ds === "pruned" ? "✗ prune" : ds === "active" ? "▶ active" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
