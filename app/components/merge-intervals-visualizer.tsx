"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Interval = [number, number];

const SCALE_MAX = 20;
const TICKS = [0, 5, 10, 15, 20];

const ORIGINAL: Interval[] = [[2, 6], [1, 3], [15, 18], [8, 10]];
const SORTED: Interval[] = [[1, 3], [2, 6], [8, 10], [15, 18]];

function leftPct(v: number) {
  return `${(v / SCALE_MAX) * 100}%`;
}

function widthPct(s: number, e: number) {
  return `${((e - s) / SCALE_MAX) * 100}%`;
}

// ── Types ────────────────────────────────────────────────────────────────────

type ResultAction = "append" | "merge" | null;

interface Step {
  phase: "input" | "sorted" | "merging" | "done";
  desc: string;
  badge: string;
  badgeStyle: string;
  showSorted: boolean;
  activeIdx: number | null;   // index in SORTED currently being examined
  result: Interval[];
  resultAction: ResultAction;
  overlap: [number, number] | null;
}

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    phase: "input",
    desc: "Start with the unsorted input: [[2,6],[1,3],[15,18],[8,10]].",
    badge: "Input",
    badgeStyle: "bg-gray-100 text-gray-600 border-gray-200",
    showSorted: false,
    activeIdx: null,
    result: [],
    resultAction: null,
    overlap: null,
  },
  {
    phase: "sorted",
    desc: "Sort all intervals by start time → [[1,3],[2,6],[8,10],[15,18]].",
    badge: "Sort",
    badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
    showSorted: true,
    activeIdx: null,
    result: [],
    resultAction: null,
    overlap: null,
  },
  {
    phase: "merging",
    desc: "i=0: Push the first interval [1,3] into result.",
    badge: "Init",
    badgeStyle: "bg-green-50 text-green-700 border-green-200",
    showSorted: true,
    activeIdx: 0,
    result: [[1, 3]],
    resultAction: "append",
    overlap: null,
  },
  {
    phase: "merging",
    desc: "i=1: [2,6].start (2) ≤ result.last.end (3) → overlap → extend last to [1, max(3,6)] = [1,6].",
    badge: "Merge",
    badgeStyle: "bg-orange-50 text-orange-700 border-orange-200",
    showSorted: true,
    activeIdx: 1,
    result: [[1, 6]],
    resultAction: "merge",
    overlap: [2, 3],
  },
  {
    phase: "merging",
    desc: "i=2: [8,10].start (8) > result.last.end (6) → no overlap → append [8,10].",
    badge: "Append",
    badgeStyle: "bg-violet-50 text-violet-700 border-violet-200",
    showSorted: true,
    activeIdx: 2,
    result: [[1, 6], [8, 10]],
    resultAction: "append",
    overlap: null,
  },
  {
    phase: "merging",
    desc: "i=3: [15,18].start (15) > result.last.end (10) → no overlap → append [15,18].",
    badge: "Append",
    badgeStyle: "bg-violet-50 text-violet-700 border-violet-200",
    showSorted: true,
    activeIdx: 3,
    result: [[1, 6], [8, 10], [15, 18]],
    resultAction: "append",
    overlap: null,
  },
  {
    phase: "done",
    desc: "All intervals processed. Final result: [[1,6],[8,10],[15,18]].",
    badge: "Done",
    badgeStyle: "bg-green-50 text-green-700 border-green-200",
    showSorted: true,
    activeIdx: null,
    result: [[1, 6], [8, 10], [15, 18]],
    resultAction: null,
    overlap: null,
  },
];

// ── Bar style helpers ─────────────────────────────────────────────────────────

function sortedBarStyle(idx: number, step: Step): string {
  if (step.phase === "input") {
    return "bg-gray-200 border border-gray-300 text-gray-600";
  }
  if (step.phase === "sorted") {
    return "bg-indigo-100 border border-indigo-300 text-indigo-700";
  }
  if (step.phase === "done") {
    return "bg-gray-100 border border-gray-200 text-gray-400";
  }
  // merging
  if (idx === step.activeIdx) {
    return "bg-blue-200 border-2 border-blue-500 text-blue-900 shadow-sm";
  }
  if (step.activeIdx !== null && idx < step.activeIdx) {
    return "bg-gray-100 border border-gray-200 text-gray-400";
  }
  return "bg-gray-200 border border-gray-300 text-gray-600";
}

function resultBarStyle(idx: number, step: Step): string {
  const isLast = idx === step.result.length - 1;
  if (step.phase === "done") {
    return "bg-green-100 border border-green-300 text-green-700";
  }
  if (isLast && step.resultAction === "merge") {
    return "bg-orange-100 border-2 border-orange-400 text-orange-900 shadow-sm";
  }
  if (isLast && step.resultAction === "append") {
    return "bg-green-200 border-2 border-green-500 text-green-900 shadow-sm";
  }
  return "bg-green-100 border border-green-300 text-green-700";
}

// ── Timeline ─────────────────────────────────────────────────────────────────

function IntervalTimeline({
  intervals,
  getBarStyle,
  overlap,
  label,
}: {
  intervals: Interval[];
  getBarStyle: (idx: number) => string;
  overlap: [number, number] | null;
  label: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <div className="relative h-9 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
        {/* Grid lines */}
        {TICKS.map(t => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-gray-200"
            style={{ left: leftPct(t) }}
          />
        ))}

        {/* Overlap highlight */}
        {overlap && (
          <div
            className="absolute top-0 bottom-0 bg-orange-300/50"
            style={{ left: leftPct(overlap[0]), width: widthPct(overlap[0], overlap[1]) }}
          />
        )}

        {/* Interval bars */}
        {intervals.map((iv, idx) => (
          <div
            key={idx}
            className={`absolute top-1 bottom-1 rounded flex items-center justify-center overflow-hidden transition-all ${getBarStyle(idx)}`}
            style={{ left: leftPct(iv[0]), width: widthPct(iv[0], iv[1]) }}
          >
            <span className="text-[10px] font-mono font-semibold whitespace-nowrap px-1 leading-none">
              [{iv[0]},{iv[1]}]
            </span>
          </div>
        ))}
      </div>

      {/* Tick labels */}
      <div className="relative h-4 mt-0.5">
        {TICKS.map(t => (
          <div
            key={t}
            className="absolute text-[10px] text-gray-400 -translate-x-1/2"
            style={{ left: leftPct(t) }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MergeIntervalsVisualizer() {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const intervals = step.showSorted ? SORTED : ORIGINAL;

  return (
    <div className="mt-5 mb-10 border border-gray-200 rounded-2xl overflow-hidden font-sans">

      {/* Header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${step.badgeStyle}`}>
            {step.badge}
          </span>
          <span className="text-xs text-gray-400">Step {stepIdx + 1} / {STEPS.length}</span>
        </div>
        <p className="text-sm text-gray-700 font-mono leading-relaxed">{step.desc}</p>
      </div>

      {/* Timelines */}
      <div className="bg-white px-5 py-5 space-y-5">
        <IntervalTimeline
          intervals={intervals}
          getBarStyle={(idx) => sortedBarStyle(idx, step)}
          overlap={step.overlap}
          label={step.showSorted ? "Sorted intervals" : "Input intervals (unsorted)"}
        />

        {step.result.length > 0 ? (
          <IntervalTimeline
            intervals={step.result}
            getBarStyle={(idx) => resultBarStyle(idx, step)}
            overlap={null}
            label="Merged result"
          />
        ) : (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Merged result</p>
            <div className="h-9 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-300">empty</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {step.phase === "merging" && (
        <div className="flex flex-wrap gap-3 px-5 pb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-200 border border-blue-500" />
            <span>current interval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
            <span>already processed</span>
          </div>
          {step.resultAction === "merge" && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-400" />
              <span>merged interval</span>
            </div>
          )}
          {step.resultAction === "append" && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-200 border border-green-500" />
              <span>newly added</span>
            </div>
          )}
          {step.overlap && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-300/50 border border-orange-300" />
              <span>overlap region</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => setStepIdx(s => Math.max(0, s - 1))}
          disabled={stepIdx === 0}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIdx(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === stepIdx ? "bg-gray-700" : "bg-gray-300 hover:bg-gray-400"}`}
            />
          ))}
        </div>

        <button
          onClick={() => setStepIdx(s => Math.min(STEPS.length - 1, s + 1))}
          disabled={stepIdx === STEPS.length - 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
