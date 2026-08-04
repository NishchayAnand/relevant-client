"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  numCourses: number;
  prerequisites: number[][];
  positions: Record<number, { x: number; y: number }>;
  labels?: Record<number, string>;
};

const PRESETS: Record<string, Preset> = {
  "Acyclic (5 courses)": {
    numCourses: 5,
    prerequisites: [
      [1, 0],
      [2, 1],
      [3, 1],
      [4, 2],
    ],
    positions: {
      0: { x: 160, y: 55 },
      1: { x: 160, y: 155 },
      2: { x: 90, y: 260 },
      3: { x: 230, y: 260 },
      4: { x: 90, y: 360 },
    },
  },
  "Cycle (2 courses)": {
    numCourses: 2,
    prerequisites: [
      [1, 0],
      [0, 1],
    ],
    positions: {
      0: { x: 90, y: 200 },
      1: { x: 230, y: 200 },
    },
  },
  "Cycle (4 courses)": {
    numCourses: 4,
    prerequisites: [
      [1, 0],
      [2, 1],
      [3, 2],
      [0, 3],
    ],
    positions: {
      0: { x: 90, y: 90 },
      1: { x: 230, y: 90 },
      2: { x: 230, y: 250 },
      3: { x: 90, y: 250 },
    },
  },
};

// ─── State constants ──────────────────────────────────────────────────────────

const UNVISITED = 0;
const VISITING = 1;
const VISITED = 2;

// ─── Simulation types ─────────────────────────────────────────────────────────

type StepKind =
  | "init"
  | "scan_course"
  | "skip_visited"
  | "start_dfs"
  | "base_visiting"
  | "cycle_found"
  | "base_visited"
  | "already_done"
  | "mark_visiting"
  | "explore_prereq"
  | "recurse"
  | "child_cycle"
  | "mark_visited"
  | "dfs_return_false"
  | "main_return_false"
  | "main_return_true";

type StackFrame = { course: number; prereqIdx: number };

type Step = {
  states: number[];
  stack: StackFrame[];
  activeCourse: number | null;
  activeEdge: [number, number] | null;
  cycleEdges: [number, number][];
  scanIdx: number | null;
  codeLines: number[];
  description: string;
  kind: StepKind;
  result: boolean | null;
};

// ─── Simulation ───────────────────────────────────────────────────────────────

function simulate(preset: Preset): Step[] {
  const { numCourses, prerequisites } = preset;
  const graph: Record<number, number[]> = {};
  for (let i = 0; i < numCourses; i++) graph[i] = [];
  for (const [a, b] of prerequisites) graph[a].push(b);

  const state: number[] = Array(numCourses).fill(UNVISITED);
  const stack: StackFrame[] = [];
  const cycleEdges: [number, number][] = [];
  const steps: Step[] = [];
  let result: boolean | null = null;

  function snap(
    kind: StepKind,
    codeLines: number[],
    description: string,
    activeCourse: number | null,
    activeEdge: [number, number] | null,
    scanIdx: number | null,
  ) {
    steps.push({
      states: [...state],
      stack: stack.map(f => ({ ...f })),
      activeCourse,
      activeEdge,
      cycleEdges: [...cycleEdges],
      scanIdx,
      codeLines,
      description,
      kind,
      result,
    });
  }

  function hasCycle(course: number, edge: [number, number] | null): boolean {
    snap(
      "start_dfs",
      [1],
      `Enter hasCycle(${course}). Push a new frame on the recursion stack.`,
      course,
      edge,
      null,
    );

    snap(
      "base_visiting",
      [2],
      `Base 1: is state[${course}] == VISITING (1)? Currently state[${course}] = ${state[course]}.`,
      course,
      edge,
      null,
    );
    if (state[course] === VISITING) {
      if (edge) cycleEdges.push(edge);
      snap(
        "cycle_found",
        [3],
        `state[${course}] is VISITING → node ${course} is already on the DFS path. Cycle detected! Return true.`,
        course,
        edge,
        null,
      );
      return true;
    }

    snap(
      "base_visited",
      [4],
      `Base 2: is state[${course}] == VISITED (2)? Currently state[${course}] = ${state[course]}.`,
      course,
      edge,
      null,
    );
    if (state[course] === VISITED) {
      snap(
        "already_done",
        [5],
        `state[${course}] is VISITED → subtree already explored, skip. Return false.`,
        course,
        edge,
        null,
      );
      return false;
    }

    state[course] = VISITING;
    stack.push({ course, prereqIdx: -1 });
    snap(
      "mark_visiting",
      [6],
      `Mark state[${course}] = VISITING (1). Course ${course} is now on the DFS path.`,
      course,
      edge,
      null,
    );

    for (let i = 0; i < graph[course].length; i++) {
      const p = graph[course][i];
      stack[stack.length - 1].prereqIdx = i;
      snap(
        "explore_prereq",
        [7],
        `Iterate over prerequisites of ${course}. Next prerequisite: ${p}.`,
        course,
        [course, p],
        null,
      );
      snap(
        "recurse",
        [8],
        `Recursive call: hasCycle(${p}).`,
        course,
        [course, p],
        null,
      );

      const childCycle = hasCycle(p, [course, p]);

      if (childCycle) {
        snap(
          "child_cycle",
          [8, 9],
          `hasCycle(${p}) returned true → propagate cycle up. Return true.`,
          course,
          [course, p],
          null,
        );
        stack.pop();
        return true;
      }
    }

    state[course] = VISITED;
    stack.pop();
    snap(
      "mark_visited",
      [11],
      `All prerequisites of ${course} explored without a cycle. Mark state[${course}] = VISITED (2).`,
      course,
      edge,
      null,
    );

    snap(
      "dfs_return_false",
      [12],
      `hasCycle(${course}) returns false and pops off the recursion stack.`,
      course,
      edge,
      null,
    );
    return false;
  }

  snap(
    "init",
    [15, 16, 17],
    "Build adjacency list from prerequisites and initialize state[] with UNVISITED (0) for every course.",
    null,
    null,
    null,
  );

  for (let course = 0; course < numCourses; course++) {
    snap(
      "scan_course",
      [17, 18],
      `Outer loop: examine course ${course}. state[${course}] = ${state[course]}.`,
      null,
      null,
      course,
    );
    if (state[course] !== UNVISITED) {
      snap(
        "skip_visited",
        [18],
        `Course ${course} is already ${state[course] === VISITED ? "VISITED" : "VISITING"} → skip.`,
        null,
        null,
        course,
      );
      continue;
    }

    const cycle = hasCycle(course, null);

    if (cycle) {
      result = false;
      snap(
        "main_return_false",
        [19, 20],
        `hasCycle(${course}) returned true → a cycle exists. Return false (cannot finish all courses).`,
        null,
        null,
        course,
      );
      break;
    }
  }

  if (result === null) {
    result = true;
    snap(
      "main_return_true",
      [22],
      "All courses processed without any cycle. Return true (all courses can be finished).",
      null,
      null,
      null,
    );
  }

  return steps;
}

// ─── Code panel ───────────────────────────────────────────────────────────────

type CodeLine = { line: number; text: string; indent: number };

const CODE: CodeLine[] = [
  { line: 1, text: "boolean hasCycle(int course) {", indent: 0 },
  { line: 2, text: "if (state[course] == 1)", indent: 1 },
  { line: 3, text: "return true;    // cycle!", indent: 2 },
  { line: 4, text: "if (state[course] == 2)", indent: 1 },
  { line: 5, text: "return false;   // already done", indent: 2 },
  { line: 6, text: "state[course] = 1;   // VISITING", indent: 1 },
  { line: 7, text: "for (int p : graph.get(course)) {", indent: 1 },
  { line: 8, text: "boolean cycle = hasCycle(p);", indent: 2 },
  { line: 9, text: "if (cycle) return true;", indent: 2 },
  { line: 10, text: "}", indent: 1 },
  { line: 11, text: "state[course] = 2;   // VISITED", indent: 1 },
  { line: 12, text: "return false;", indent: 1 },
  { line: 13, text: "}", indent: 0 },
  { line: 14, text: "", indent: 0 },
  { line: 15, text: "boolean canFinish(...) {", indent: 0 },
  { line: 16, text: "// build graph & state[]", indent: 1 },
  { line: 17, text: "for (int course : courses) {", indent: 1 },
  { line: 18, text: "if (state[course] == 0)", indent: 2 },
  { line: 19, text: "if (hasCycle(course))", indent: 3 },
  { line: 20, text: "return false;", indent: 4 },
  { line: 21, text: "}", indent: 1 },
  { line: 22, text: "return true;", indent: 1 },
  { line: 23, text: "}", indent: 0 },
];

function colorize(text: string): React.ReactNode {
  const keywords = /\b(boolean|int|for|if|return|true|false|void)\b/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  const commentStart = text.indexOf("//");
  const codePart = commentStart >= 0 ? text.slice(0, commentStart) : text;
  const commentPart = commentStart >= 0 ? text.slice(commentStart) : "";

  while ((match = keywords.exec(codePart)) !== null) {
    if (match.index > lastIdx) {
      parts.push(codePart.slice(lastIdx, match.index));
    }
    parts.push(
      <span key={`kw-${match.index}`} style={{ color: "#a855f7" }}>
        {match[0]}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < codePart.length) {
    parts.push(codePart.slice(lastIdx));
  }
  if (commentPart) {
    parts.push(
      <span key="cmt" style={{ color: "#9ca3af", fontStyle: "italic" }}>
        {commentPart}
      </span>,
    );
  }
  return parts;
}

function CodePanel({ activeLines }: { activeLines: number[] }) {
  const activeSet = new Set(activeLines);
  return (
    <div
      className="rounded-lg bg-neutral-950 text-neutral-200 text-[12px] font-mono leading-[1.55] py-3 overflow-hidden"
    >
      {CODE.map(({ line, text, indent }) => {
        const isActive = activeSet.has(line);
        return (
          <div
            key={line}
            className="flex items-start px-2 relative"
            style={{
              background: isActive ? "rgba(16, 185, 129, 0.14)" : "transparent",
              borderLeft: `2px solid ${isActive ? "#10b981" : "transparent"}`,
              transition: "background 0.15s",
            }}
          >
            <span
              className="tabular-nums select-none pr-2 text-right"
              style={{
                width: 24,
                color: isActive ? "#10b981" : "#525252",
              }}
            >
              {line}
            </span>
            <span
              style={{
                paddingLeft: indent * 16,
                whiteSpace: "pre",
                minHeight: 18,
                display: "inline-block",
              }}
            >
              {colorize(text)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Graph panel ──────────────────────────────────────────────────────────────

const NODE_R = 22;

function nodeColors(s: number, isActive: boolean) {
  if (isActive) {
    return { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" };
  }
  if (s === VISITING) {
    return { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" };
  }
  if (s === VISITED) {
    return { fill: "#d1fae5", stroke: "#10b981", text: "#065f46" };
  }
  return { fill: "#f9fafb", stroke: "#d1d5db", text: "#6b7280" };
}

function edgeGeometry(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curved: boolean,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const x1 = from.x + ux * NODE_R;
  const y1 = from.y + uy * NODE_R;
  const x2 = to.x - ux * NODE_R;
  const y2 = to.y - uy * NODE_R;

  if (!curved) {
    return { path: `M ${x1} ${y1} L ${x2} ${y2}` };
  }
  // Perpendicular offset for curve (right-hand side)
  const px = -uy;
  const py = ux;
  const bulge = 22;
  const cx = (x1 + x2) / 2 + px * bulge;
  const cy = (y1 + y2) / 2 + py * bulge;
  // Recompute endpoints so arrow ends at the circle boundary along the curve tangent
  const startAngle = Math.atan2(from.y - cy, from.x - cx);
  const endAngle = Math.atan2(to.y - cy, to.x - cx);
  const startTangent = { x: -Math.sin(startAngle), y: Math.cos(startAngle) };
  const endTangent = { x: Math.sin(endAngle), y: -Math.cos(endAngle) };
  const nx1 = from.x + startTangent.x * NODE_R;
  const ny1 = from.y + startTangent.y * NODE_R;
  const nx2 = to.x + endTangent.x * NODE_R;
  const ny2 = to.y + endTangent.y * NODE_R;
  return { path: `M ${nx1} ${ny1} Q ${cx} ${cy} ${nx2} ${ny2}` };
}

function GraphPanel({
  preset,
  states,
  activeCourse,
  activeEdge,
  cycleEdges,
  scanIdx,
}: {
  preset: Preset;
  states: number[];
  activeCourse: number | null;
  activeEdge: [number, number] | null;
  cycleEdges: [number, number][];
  scanIdx: number | null;
}) {
  const { numCourses, prerequisites, positions } = preset;

  const width = 320;
  const heights = Object.values(positions).map(p => p.y);
  const maxY = Math.max(...heights) + NODE_R + 30;
  const height = Math.max(maxY, 300);

  const isSameEdge = (a: [number, number], b: [number, number]) =>
    a[0] === b[0] && a[1] === b[1];

  const edgeSet = new Set(prerequisites.map(([a, b]) => `${a}->${b}`));
  const hasReverse = ([a, b]: number[]) => edgeSet.has(`${b}->${a}`);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: "transparent" }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#9ca3af" />
        </marker>
        <marker
          id="arrow-active"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" />
        </marker>
        <marker
          id="arrow-cycle"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Edges */}
      {prerequisites.map(([a, b], idx) => {
        const from = positions[a];
        const to = positions[b];
        if (!from || !to) return null;
        const curved = hasReverse([a, b]);
        const { path } = edgeGeometry(from, to, curved);
        const isActive = activeEdge && isSameEdge(activeEdge, [a, b]);
        const isCycle = cycleEdges.some(e => isSameEdge(e, [a, b]));
        const stroke = isCycle ? "#ef4444" : isActive ? "#f59e0b" : "#9ca3af";
        const marker = isCycle
          ? "url(#arrow-cycle)"
          : isActive
            ? "url(#arrow-active)"
            : "url(#arrow)";
        const strokeWidth = isActive || isCycle ? 2.2 : 1.4;
        return (
          <path
            key={idx}
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            markerEnd={marker}
            style={{ transition: "stroke 0.2s" }}
          />
        );
      })}

      {/* Nodes */}
      {Array.from({ length: numCourses }, (_, i) => i).map(course => {
        const pos = positions[course];
        if (!pos) return null;
        const isActive = activeCourse === course;
        const isScan = scanIdx === course;
        const { fill, stroke, text } = nodeColors(states[course], isActive);

        return (
          <g key={course}>
            {isScan && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R + 5}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
            {isActive && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R + 3}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                opacity={0.5}
              />
            )}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R}
              fill={fill}
              stroke={stroke}
              strokeWidth={2}
              style={{ transition: "fill 0.2s, stroke 0.2s" }}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="monospace"
              fontSize={15}
              fontWeight={700}
              fill={text}
            >
              {course}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Stack panel ──────────────────────────────────────────────────────────────

function StackPanel({
  stack,
  preset,
}: {
  stack: StackFrame[];
  preset: Preset;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
        Recursion stack {stack.length > 0 ? `(${stack.length})` : ""}
      </span>
      {stack.length === 0 ? (
        <span className="text-xs text-gray-400 italic">empty</span>
      ) : (
        <div className="flex flex-col-reverse gap-1">
          {stack.map((frame, idx) => {
            const nextPrereq =
              frame.prereqIdx >= 0 && preset.prerequisites
                ? (() => {
                    const list: number[] = [];
                    for (const [a, b] of preset.prerequisites) {
                      if (a === frame.course) list.push(b);
                    }
                    return list[frame.prereqIdx];
                  })()
                : null;
            const isTop = idx === stack.length - 1;
            return (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-mono"
                style={{
                  background: isTop ? "#fef3c7" : "#f9fafb",
                  border: `1px solid ${isTop ? "#f59e0b" : "#e5e7eb"}`,
                  color: isTop ? "#92400e" : "#6b7280",
                }}
              >
                <span className="font-bold">hasCycle({frame.course})</span>
                {nextPrereq !== undefined && nextPrereq !== null && (
                  <span className="text-[10px] opacity-70">
                    → exploring {nextPrereq}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── State panel ──────────────────────────────────────────────────────────────

function StateArrayPanel({ states }: { states: number[] }) {
  const label = (s: number) =>
    s === UNVISITED ? "0" : s === VISITING ? "1" : "2";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
        state[]
      </span>
      <div className="flex gap-1">
        {states.map((s, i) => {
          const { fill, stroke, text } = nodeColors(s, false);
          return (
            <div
              key={i}
              className="flex flex-col items-center rounded-md"
              style={{
                width: 32,
                background: fill,
                border: `1.5px solid ${stroke}`,
                padding: "3px 0",
              }}
            >
              <span
                className="text-[9px] font-mono"
                style={{ color: text, opacity: 0.7 }}
              >
                {i}
              </span>
              <span
                className="text-[13px] font-mono font-bold"
                style={{ color: text }}
              >
                {label(s)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CycleDetectionDFSVisualizer() {
  const [presetKey, setPresetKey] = useState<string>("Acyclic (5 courses)");
  const preset = PRESETS[presetKey];

  const steps = useMemo(() => simulate(preset), [preset]);
  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const loadPreset = useCallback((key: string) => {
    setPresetKey(key);
    setStep(0);
    setIsPlaying(false);
  }, []);

  const isDone = step >= steps.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const currentStep = step > 0 ? steps[step - 1] : null;

  const states =
    currentStep?.states ?? Array(preset.numCourses).fill(UNVISITED);
  const stack = currentStep?.stack ?? [];
  const activeCourse = currentStep?.activeCourse ?? null;
  const activeEdge = currentStep?.activeEdge ?? null;
  const cycleEdges = currentStep?.cycleEdges ?? [];
  const scanIdx = currentStep?.scanIdx ?? null;
  const codeLines = currentStep?.codeLines ?? [];
  const description =
    currentStep?.description ??
    "Press Step to walk through the DFS. Nodes turn amber when VISITING (on the DFS path) and green when fully VISITED.";
  const kind = currentStep?.kind ?? null;
  const result = currentStep?.result ?? null;

  const kindBadge: Record<StepKind, { label: string; color: string }> = {
    init: { label: "Initialize", color: "text-gray-400" },
    scan_course: { label: "Outer loop", color: "text-gray-400" },
    skip_visited: { label: "Skip", color: "text-gray-400" },
    start_dfs: { label: "Enter DFS", color: "text-amber-600" },
    base_visiting: { label: "Base 1 check", color: "text-gray-400" },
    cycle_found: { label: "Cycle!", color: "text-red-600" },
    base_visited: { label: "Base 2 check", color: "text-gray-400" },
    already_done: { label: "Already done", color: "text-blue-500" },
    mark_visiting: { label: "Mark VISITING", color: "text-amber-600" },
    explore_prereq: { label: "Next prerequisite", color: "text-gray-400" },
    recurse: { label: "Recursive call", color: "text-amber-600" },
    child_cycle: { label: "Propagate cycle", color: "text-red-600" },
    mark_visited: { label: "Mark VISITED", color: "text-emerald-600" },
    dfs_return_false: { label: "DFS returns", color: "text-emerald-600" },
    main_return_false: { label: "Return false", color: "text-red-600" },
    main_return_true: { label: "Return true", color: "text-emerald-600" },
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      {/* Presets */}
      <div className="flex gap-2 flex-wrap px-5 pt-4 pb-3 border-b border-gray-100">
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

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Left: graph + state + stack */}
        <div className="px-5 pt-5 pb-5 flex flex-col gap-4 min-w-0">
          <div className="flex justify-center">
            <GraphPanel
              preset={preset}
              states={states}
              activeCourse={activeCourse}
              activeEdge={activeEdge}
              cycleEdges={cycleEdges}
              scanIdx={scanIdx}
            />
          </div>
          <StateArrayPanel states={states} />
          <StackPanel stack={stack} preset={preset} />

          {/* Legend */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Legend
            </span>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {[
                {
                  color: "#f9fafb",
                  border: "#d1d5db",
                  label: "Unvisited (0)",
                },
                {
                  color: "#fef3c7",
                  border: "#f59e0b",
                  label: "Visiting (1) — on DFS path",
                },
                {
                  color: "#d1fae5",
                  border: "#10b981",
                  label: "Visited (2) — fully explored",
                },
                {
                  color: "transparent",
                  border: "#6b7280",
                  dashed: true,
                  label: "Outer scan cursor",
                },
                {
                  color: "transparent",
                  border: "#ef4444",
                  label: "Cycle edge",
                },
              ].map(({ color, border, dashed, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: color,
                      border: `1.5px ${dashed ? "dashed" : "solid"} ${border}`,
                    }}
                  />
                  <span style={{ color: "#6b7280" }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: code + description */}
        <div className="px-5 pt-5 pb-5 flex flex-col gap-4 min-w-0">
          <CodePanel activeLines={codeLines} />

          {/* Step description */}
          <div className="flex flex-col gap-1">
            {kind && (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${kindBadge[kind].color}`}
              >
                {kindBadge[kind].label}
              </span>
            )}
            <p className="text-xs text-gray-600 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Result */}
          {result !== null && (
            <div
              className="rounded-lg px-3 py-2 text-xs font-mono"
              style={{
                background: result ? "#d1fae5" : "#fee2e2",
                border: `1px solid ${result ? "#10b981" : "#ef4444"}`,
                color: result ? "#065f46" : "#991b1b",
              }}
            >
              canFinish returns{" "}
              <span className="font-bold">{String(result)}</span> —{" "}
              {result
                ? "all courses can be completed."
                : "a cycle exists; not all courses can be completed."}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-gray-100 px-5 py-4 flex gap-2 items-center">
        <button
          type="button"
          onClick={() => {
            if (isDone) {
              setStep(0);
              setIsPlaying(false);
            } else setIsPlaying(p => !p);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isDone && !isPlaying) setStep(s => s + 1);
          }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setIsPlaying(false);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{
                width: `${steps.length ? (step / steps.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {step}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
