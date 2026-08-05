"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  numCourses: number;
  prerequisites: number[][];
  positions: Record<number, { x: number; y: number }>;
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

// ─── Node states ──────────────────────────────────────────────────────────────

const UNQUEUED = 0;
const ENQUEUED = 1;
const PROCESSING = 2;
const COMPLETED = 3;

// ─── Simulation types ─────────────────────────────────────────────────────────

type StepKind =
  | "init"
  | "init_queue_scan"
  | "enqueue_initial"
  | "check_queue_loop"
  | "dequeue"
  | "complete"
  | "iterate_dep"
  | "decrement"
  | "enqueue_new"
  | "loop_end"
  | "return_true"
  | "return_false";

type Step = {
  states: number[];
  indegree: number[];
  queue: number[];
  completed: number[];
  activeCourse: number | null;
  activeDep: number | null;
  activeEdge: [number, number] | null;
  consumedEdges: Set<string>;
  scanIdx: number | null;
  codeLines: number[];
  description: string;
  kind: StepKind;
  result: boolean | null;
};

// ─── Simulation ───────────────────────────────────────────────────────────────

function simulate(preset: Preset): Step[] {
  const { numCourses, prerequisites } = preset;

  const adj: Record<number, number[]> = {};
  for (let i = 0; i < numCourses; i++) adj[i] = [];
  const indegree = Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) {
    adj[b].push(a);
    indegree[a]++;
  }

  const states: number[] = Array(numCourses).fill(UNQUEUED);
  const queue: number[] = [];
  const completed: number[] = [];
  const consumedEdges = new Set<string>();
  const steps: Step[] = [];
  let result: boolean | null = null;

  function snap(
    kind: StepKind,
    codeLines: number[],
    description: string,
    activeCourse: number | null,
    activeDep: number | null,
    activeEdge: [number, number] | null,
    scanIdx: number | null,
  ) {
    steps.push({
      states: [...states],
      indegree: [...indegree],
      queue: [...queue],
      completed: [...completed],
      activeCourse,
      activeDep,
      activeEdge,
      consumedEdges: new Set(consumedEdges),
      scanIdx,
      codeLines,
      description,
      kind,
      result,
    });
  }

  snap(
    "init",
    [3, 4, 5, 6],
    "Build the adjacency list (prerequisite → list of dependent courses) and compute in-degree[] for every course.",
    null,
    null,
    null,
    null,
  );

  // Initialize queue with in-degree 0 courses
  for (let c = 0; c < numCourses; c++) {
    snap(
      "init_queue_scan",
      [9, 10],
      `Check course ${c}: indegree[${c}] = ${indegree[c]}.`,
      null,
      null,
      null,
      c,
    );
    if (indegree[c] === 0) {
      queue.push(c);
      states[c] = ENQUEUED;
      snap(
        "enqueue_initial",
        [10],
        `indegree[${c}] == 0 → enqueue course ${c}. It has no prerequisites.`,
        null,
        null,
        null,
        c,
      );
    }
  }

  // Main BFS loop
  while (queue.length > 0) {
    snap(
      "check_queue_loop",
      [12],
      `Queue is non-empty (${queue.length} course${queue.length === 1 ? "" : "s"}). Continue processing.`,
      null,
      null,
      null,
      null,
    );

    const course = queue.shift()!;
    states[course] = PROCESSING;
    snap(
      "dequeue",
      [13],
      `Dequeue course ${course} from the front of the queue.`,
      course,
      null,
      null,
      null,
    );

    completed.push(course);
    states[course] = COMPLETED;
    snap(
      "complete",
      [14],
      `Mark course ${course} as completed. completed = ${completed.length}.`,
      course,
      null,
      null,
      null,
    );

    // Iterate over dependents
    for (let i = 0; i < adj[course].length; i++) {
      const dep = adj[course][i];
      snap(
        "iterate_dep",
        [15],
        `Look at dependent course ${dep} of course ${course}.`,
        course,
        dep,
        [course, dep],
        null,
      );

      indegree[dep]--;
      consumedEdges.add(`${course}->${dep}`);
      snap(
        "decrement",
        [16],
        `Decrement indegree[${dep}]: now ${indegree[dep]}.`,
        course,
        dep,
        [course, dep],
        null,
      );

      if (indegree[dep] === 0) {
        queue.push(dep);
        states[dep] = ENQUEUED;
        snap(
          "enqueue_new",
          [17, 18],
          `indegree[${dep}] == 0 → all its prerequisites are done. Enqueue course ${dep}.`,
          course,
          dep,
          [course, dep],
          null,
        );
      }
    }

    snap(
      "loop_end",
      [19, 20],
      `Finished processing dependents of course ${course}. Check the queue again.`,
      null,
      null,
      null,
      null,
    );
  }

  const success = completed.length === numCourses;
  result = success;
  if (success) {
    snap(
      "return_true",
      [21],
      `completed (${completed.length}) == numCourses (${numCourses}) → return true. Every course can be finished.`,
      null,
      null,
      null,
      null,
    );
  } else {
    snap(
      "return_false",
      [21],
      `Queue is empty but only ${completed.length} of ${numCourses} courses were completed. The remaining courses form a cycle → return false.`,
      null,
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
  { line: 1, text: "boolean canFinish(...) {", indent: 0 },
  { line: 2, text: "// adj: prereq → dependents; indegree[c] = #prereqs", indent: 1 },
  { line: 3, text: "for (int[] e : prerequisites) {", indent: 1 },
  { line: 4, text: "adj.get(e[1]).add(e[0]);", indent: 2 },
  { line: 5, text: "indegree[e[0]]++;", indent: 2 },
  { line: 6, text: "}", indent: 1 },
  { line: 7, text: "// Init queue with indegree 0 courses", indent: 1 },
  { line: 8, text: "Queue<Integer> queue = new LinkedList<>();", indent: 1 },
  { line: 9, text: "for (int c = 0; c < numCourses; c++)", indent: 1 },
  { line: 10, text: "if (indegree[c] == 0) queue.offer(c);", indent: 2 },
  { line: 11, text: "int completed = 0;", indent: 1 },
  { line: 12, text: "while (!queue.isEmpty()) {", indent: 1 },
  { line: 13, text: "int course = queue.poll();", indent: 2 },
  { line: 14, text: "completed++;", indent: 2 },
  { line: 15, text: "for (int dep : adj.get(course)) {", indent: 2 },
  { line: 16, text: "indegree[dep]--;", indent: 3 },
  { line: 17, text: "if (indegree[dep] == 0)", indent: 3 },
  { line: 18, text: "queue.offer(dep);", indent: 4 },
  { line: 19, text: "}", indent: 2 },
  { line: 20, text: "}", indent: 1 },
  { line: 21, text: "return completed == numCourses;", indent: 1 },
  { line: 22, text: "}", indent: 0 },
];

function colorize(text: string): React.ReactNode {
  const keywords = /\b(boolean|int|for|if|return|true|false|void|while|new)\b/g;
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
              style={{ width: 24, color: isActive ? "#10b981" : "#525252" }}
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
  if (s === PROCESSING) {
    return { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" };
  }
  if (s === ENQUEUED) {
    return { fill: "#dbeafe", stroke: "#3b82f6", text: "#1e40af" };
  }
  if (s === COMPLETED) {
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
  const px = -uy;
  const py = ux;
  const bulge = 22;
  const cx = (x1 + x2) / 2 + px * bulge;
  const cy = (y1 + y2) / 2 + py * bulge;
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
  activeDep,
  activeEdge,
  consumedEdges,
  scanIdx,
}: {
  preset: Preset;
  states: number[];
  activeCourse: number | null;
  activeDep: number | null;
  activeEdge: [number, number] | null;
  consumedEdges: Set<string>;
  scanIdx: number | null;
}) {
  const { numCourses, prerequisites, positions } = preset;

  const width = 320;
  const heights = Object.values(positions).map(p => p.y);
  const maxY = Math.max(...heights) + NODE_R + 30;
  const height = Math.max(maxY, 300);

  // Rendered edges go from prerequisite → dependent
  const renderEdges = prerequisites.map(([a, b]) => [b, a] as [number, number]);
  const edgeSet = new Set(renderEdges.map(([a, b]) => `${a}->${b}`));
  const hasReverse = ([a, b]: [number, number]) => edgeSet.has(`${b}->${a}`);

  const isSameEdge = (a: [number, number], b: [number, number]) =>
    a[0] === b[0] && a[1] === b[1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: "transparent" }}
    >
      <defs>
        <marker
          id="arrow-topo"
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
          id="arrow-topo-active"
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
          id="arrow-topo-consumed"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#d1d5db" />
        </marker>
      </defs>

      {/* Edges */}
      {renderEdges.map(([a, b], idx) => {
        const from = positions[a];
        const to = positions[b];
        if (!from || !to) return null;
        const curved = hasReverse([a, b]);
        const { path } = edgeGeometry(from, to, curved);
        const isActive = activeEdge && isSameEdge(activeEdge, [a, b]);
        const isConsumed = consumedEdges.has(`${a}->${b}`);
        const stroke = isActive
          ? "#f59e0b"
          : isConsumed
            ? "#e5e7eb"
            : "#9ca3af";
        const marker = isActive
          ? "url(#arrow-topo-active)"
          : isConsumed
            ? "url(#arrow-topo-consumed)"
            : "url(#arrow-topo)";
        const strokeWidth = isActive ? 2.4 : isConsumed ? 1.2 : 1.4;
        const strokeDasharray = isConsumed ? "4 3" : undefined;
        return (
          <path
            key={idx}
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
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
        const isDep = activeDep === course;
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
            {(isActive || isDep) && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R + 3}
                fill="none"
                stroke={isActive ? "#f59e0b" : "#3b82f6"}
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

// ─── In-degree panel ──────────────────────────────────────────────────────────

function IndegreePanel({
  indegree,
  activeDep,
}: {
  indegree: number[];
  activeDep: number | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
        indegree[]
      </span>
      <div className="flex gap-1">
        {indegree.map((v, i) => {
          const isActive = activeDep === i;
          const isZero = v === 0;
          return (
            <div
              key={i}
              className="flex flex-col items-center rounded-md"
              style={{
                width: 32,
                background: isActive
                  ? "#fef3c7"
                  : isZero
                    ? "#d1fae5"
                    : "#f9fafb",
                border: `1.5px solid ${
                  isActive ? "#f59e0b" : isZero ? "#10b981" : "#e5e7eb"
                }`,
                padding: "3px 0",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <span
                className="text-[9px] font-mono"
                style={{ color: "#9ca3af" }}
              >
                {i}
              </span>
              <span
                className="text-[13px] font-mono font-bold"
                style={{
                  color: isActive
                    ? "#92400e"
                    : isZero
                      ? "#065f46"
                      : "#374151",
                }}
              >
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Queue panel ──────────────────────────────────────────────────────────────

function QueuePanel({ queue }: { queue: number[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
        Queue {queue.length > 0 && `(${queue.length})`}
      </span>
      {queue.length === 0 ? (
        <span className="text-xs text-gray-400 italic">empty</span>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] text-gray-400 mr-0.5">front →</span>
          {queue.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center rounded-md"
              style={{
                width: 28,
                height: 28,
                background: idx === 0 ? "#dbeafe" : "#eff6ff",
                border: `1.5px solid #3b82f6`,
                color: "#1e40af",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Completed panel ──────────────────────────────────────────────────────────

function CompletedPanel({
  completed,
  total,
}: {
  completed: number[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          Completed
        </span>
        <span className="text-lg font-bold tabular-nums font-mono text-emerald-700">
          {completed.length}
        </span>
        <span className="text-xs text-gray-400">/ {total}</span>
      </div>
      {completed.length === 0 ? (
        <span className="text-xs text-gray-400 italic">none yet</span>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          {completed.map((c, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div
                className="flex items-center justify-center rounded-md"
                style={{
                  width: 26,
                  height: 26,
                  background: "#d1fae5",
                  border: "1.5px solid #10b981",
                  color: "#065f46",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {c}
              </div>
              {idx < completed.length - 1 && (
                <span className="text-gray-300 text-[10px]">→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TopologicalSortBFSVisualizer() {
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
    currentStep?.states ?? Array(preset.numCourses).fill(UNQUEUED);
  const indegree =
    currentStep?.indegree ??
    (() => {
      const ind = Array(preset.numCourses).fill(0);
      for (const [a] of preset.prerequisites) ind[a]++;
      return ind;
    })();
  const queue = currentStep?.queue ?? [];
  const completed = currentStep?.completed ?? [];
  const activeCourse = currentStep?.activeCourse ?? null;
  const activeDep = currentStep?.activeDep ?? null;
  const activeEdge = currentStep?.activeEdge ?? null;
  const consumedEdges = currentStep?.consumedEdges ?? new Set<string>();
  const scanIdx = currentStep?.scanIdx ?? null;
  const codeLines = currentStep?.codeLines ?? [];
  const description =
    currentStep?.description ??
    "Kahn's algorithm: repeatedly finish courses whose in-degree is 0. When a course finishes, decrement the in-degree of its dependents. If all courses finish, no cycle exists.";
  const kind = currentStep?.kind ?? null;
  const result = currentStep?.result ?? null;

  const kindBadge: Record<StepKind, { label: string; color: string }> = {
    init: { label: "Initialize", color: "text-gray-400" },
    init_queue_scan: { label: "Scan for indegree 0", color: "text-gray-400" },
    enqueue_initial: { label: "Enqueue", color: "text-blue-500" },
    check_queue_loop: { label: "Loop", color: "text-gray-400" },
    dequeue: { label: "Dequeue", color: "text-amber-600" },
    complete: { label: "Complete", color: "text-emerald-600" },
    iterate_dep: { label: "Next dependent", color: "text-gray-400" },
    decrement: { label: "Decrement indegree", color: "text-amber-600" },
    enqueue_new: { label: "Enqueue", color: "text-blue-500" },
    loop_end: { label: "Continue", color: "text-gray-400" },
    return_true: { label: "Return true", color: "text-emerald-600" },
    return_false: { label: "Return false", color: "text-red-600" },
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
        {/* Left: graph + indegree + queue + completed */}
        <div className="px-5 pt-5 pb-5 flex flex-col gap-4 min-w-0">
          <div className="flex justify-center">
            <GraphPanel
              preset={preset}
              states={states}
              activeCourse={activeCourse}
              activeDep={activeDep}
              activeEdge={activeEdge}
              consumedEdges={consumedEdges}
              scanIdx={scanIdx}
            />
          </div>
          <IndegreePanel indegree={indegree} activeDep={activeDep} />
          <QueuePanel queue={queue} />
          <CompletedPanel completed={completed} total={preset.numCourses} />

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
                  label: "Waiting (in-degree > 0)",
                },
                {
                  color: "#dbeafe",
                  border: "#3b82f6",
                  label: "In queue",
                },
                {
                  color: "#fef3c7",
                  border: "#f59e0b",
                  label: "Processing",
                },
                {
                  color: "#d1fae5",
                  border: "#10b981",
                  label: "Completed",
                },
                {
                  color: "transparent",
                  border: "#6b7280",
                  dashed: true,
                  label: "Init scan cursor",
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
                ? "topological order found; all courses can be completed."
                : "queue drained before all courses were completed. A cycle exists."}
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
