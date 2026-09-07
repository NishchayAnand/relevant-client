"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  nums: number[];
};

const PRESETS: Preset[] = [
  {
    id: "example",
    label: "[100, 4, 200, 1, 3, 2]",
    nums: [100, 4, 200, 1, 3, 2],
  },
  {
    id: "with-duplicates",
    label: "[1, 2, 0, 1]",
    nums: [1, 2, 0, 1],
  },
  {
    id: "no-run",
    label: "[10, 5, 12, 3]",
    nums: [10, 5, 12, 3],
  },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public int longestConsecutive(int[] nums) {",
  "    Arrays.sort(nums);",
  "    int maxLength = 1;",
  "    int currLength = 1;",
  "    for (int i = 1; i < nums.length; i++) {",
  "        if (nums[i] == nums[i - 1]) {",
  "            continue;",
  "        }",
  "        if (nums[i] == nums[i - 1] + 1) {",
  "            currLength++;",
  "            maxLength = Math.max(maxLength, currLength);",
  "        } else {",
  "            currLength = 1;",
  "        }",
  "    }",
  "    return maxLength;",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "sort"
  | "init"
  | "loop"
  | "duplicate"
  | "consecutive"
  | "extend"
  | "break"
  | "reset"
  | "return";

type CompareResult = "duplicate" | "consecutive" | "break" | null;

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  sorted: boolean; // has the sort happened by this step?
  i: number | null;
  currLength: number;
  maxLength: number;
  currentRunStart: number;
  bestRun: { start: number; end: number };
  compareResult: CompareResult;
};

function simulate(input: number[]): { sorted: number[]; steps: Step[] } {
  const sorted = [...input].sort((a, b) => a - b);
  const steps: Step[] = [];

  steps.push({
    kind: "sort",
    lines: [2],
    description: `Arrays.sort(nums) → [${sorted.join(", ")}]. Consecutive values now sit next to each other.`,
    sorted: true,
    i: null,
    currLength: 1,
    maxLength: 1,
    currentRunStart: 0,
    bestRun: { start: 0, end: 0 },
    compareResult: null,
  });

  let currLength = 1;
  let maxLength = 1;
  let currentRunStart = 0;
  let bestRun = { start: 0, end: 0 };

  steps.push({
    kind: "init",
    lines: [3, 4],
    description: "Initialise currLength = 1 and maxLength = 1.",
    sorted: true,
    i: null,
    currLength,
    maxLength,
    currentRunStart,
    bestRun,
    compareResult: null,
  });

  for (let i = 1; i < sorted.length; i++) {
    steps.push({
      kind: "loop",
      lines: [5],
      description: `Iteration i = ${i}. Compare nums[${i}] = ${sorted[i]} with nums[${i - 1}] = ${sorted[i - 1]}.`,
      sorted: true,
      i,
      currLength,
      maxLength,
      currentRunStart,
      bestRun,
      compareResult: null,
    });

    if (sorted[i] === sorted[i - 1]) {
      steps.push({
        kind: "duplicate",
        lines: [6, 7],
        description: `nums[${i}] == nums[${i - 1}] (${sorted[i]}). Duplicate — continue without touching currLength.`,
        sorted: true,
        i,
        currLength,
        maxLength,
        currentRunStart,
        bestRun,
        compareResult: "duplicate",
      });
      continue;
    }

    if (sorted[i] === sorted[i - 1] + 1) {
      steps.push({
        kind: "consecutive",
        lines: [9],
        description: `${sorted[i - 1]} → ${sorted[i]} is consecutive. The current run keeps growing.`,
        sorted: true,
        i,
        currLength,
        maxLength,
        currentRunStart,
        bestRun,
        compareResult: "consecutive",
      });

      const nextCurr = currLength + 1;
      const nextMax = Math.max(maxLength, nextCurr);
      const isNewBest = nextMax > maxLength;
      currLength = nextCurr;
      maxLength = nextMax;
      if (isNewBest) bestRun = { start: currentRunStart, end: i };

      steps.push({
        kind: "extend",
        lines: [10, 11],
        description: `currLength → ${currLength}. maxLength → ${maxLength}${isNewBest ? " (new best)." : "."}`,
        sorted: true,
        i,
        currLength,
        maxLength,
        currentRunStart,
        bestRun,
        compareResult: "consecutive",
      });
    } else {
      steps.push({
        kind: "break",
        lines: [12],
        description: `${sorted[i - 1]} → ${sorted[i]} is a gap. The current run is broken.`,
        sorted: true,
        i,
        currLength,
        maxLength,
        currentRunStart,
        bestRun,
        compareResult: "break",
      });

      currLength = 1;
      currentRunStart = i;
      steps.push({
        kind: "reset",
        lines: [13],
        description: `Reset currLength = 1. A fresh run begins at index ${i}.`,
        sorted: true,
        i,
        currLength,
        maxLength,
        currentRunStart,
        bestRun,
        compareResult: "break",
      });
    }
  }

  steps.push({
    kind: "return",
    lines: [16],
    description: `All elements processed. Return maxLength = ${maxLength}.`,
    sorted: true,
    i: null,
    currLength,
    maxLength,
    currentRunStart,
    bestRun,
    compareResult: null,
  });

  return { sorted, steps };
}

// ─── Left: algorithm ──────────────────────────────────────────────────────────

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.7] overflow-x-auto">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        return (
          <div
            key={lineNum}
            className={`flex transition-colors duration-150 ${
              isActive ? "bg-amber-100/80" : ""
            }`}
            style={{
              borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}`,
            }}
          >
            <span
              className={`w-7 text-right pr-2 select-none tabular-nums ${
                isActive ? "text-amber-700 font-semibold" : "text-gray-300"
              }`}
            >
              {lineNum}
            </span>
            <span
              className={`flex-1 whitespace-pre ${
                isActive ? "text-amber-900 font-semibold" : "text-gray-600"
              }`}
            >
              {line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Right: array + dry run ───────────────────────────────────────────────────

const CELL_W = 44;
const CELL_H = 44;
const GAP = 6;

function ArrayDisplay({
  input,
  sorted,
  isSorted,
  i,
  currentRunStart,
  bestRun,
  currLength,
  compareResult,
}: {
  input: number[];
  sorted: number[];
  isSorted: boolean;
  i: number | null;
  currentRunStart: number;
  bestRun: { start: number; end: number };
  currLength: number;
  compareResult: CompareResult;
}) {
  const arr = isSorted ? sorted : input;
  const showCurrent = i !== null && currLength > 1;
  const showBest = bestRun.end > bestRun.start;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-full flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          {isSorted ? "Sorted array" : "Input (unsorted)"}
        </div>
        <div className="flex items-center gap-3">
          {showCurrent && (
            <span className="text-[10px] font-mono text-teal-700">
              current · len {currLength}
            </span>
          )}
          {showBest && (
            <span className="text-[10px] font-mono text-emerald-700">
              best · len {bestRun.end - bestRun.start + 1}
            </span>
          )}
        </div>
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {arr.map((_, idx) => {
          const labels: { text: string; color: string }[] = [];
          if (i !== null && idx === i - 1) labels.push({ text: "i−1", color: "#7c3aed" });
          if (i !== null && idx === i) labels.push({ text: "i", color: "#d97706" });
          return (
            <div
              key={idx}
              style={{
                width: CELL_W,
                height: 18,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 3,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "monospace",
                flexShrink: 0,
              }}
            >
              {labels.map((l) => (
                <span key={l.text} style={{ color: l.color }}>
                  {l.text}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {arr.map((val, idx) => {
          const isI = i !== null && idx === i;
          const isPrev = i !== null && idx === i - 1;
          const inCurrentRun =
            showCurrent && idx >= currentRunStart && idx <= (i as number);
          const inBestRun =
            showBest && idx >= bestRun.start && idx <= bestRun.end;

          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (isI) {
            if (compareResult === "duplicate") {
              bg = "#fef3c7"; border = "#f59e0b"; color = "#92400e";
            } else if (compareResult === "consecutive") {
              bg = "#dcfce7"; border = "#10b981"; color = "#065f46";
            } else if (compareResult === "break") {
              bg = "#fee2e2"; border = "#f87171"; color = "#991b1b";
            } else {
              bg = "#fef3c7"; border = "#f59e0b"; color = "#92400e";
            }
          } else if (isPrev) {
            bg = "#ede9fe"; border = "#8b5cf6"; color = "#5b21b6";
          } else if (inCurrentRun) {
            bg = "#ccfbf1"; border = "#5eead4"; color = "#115e59";
          }

          const boxShadow =
            inBestRun && !isI && !isPrev ? "0 0 0 2px #10b981" : undefined;

          return (
            <div
              key={idx}
              style={{
                width: CELL_W,
                height: CELL_H,
                background: bg,
                border: `2px solid ${border}`,
                color,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: 700,
                transition:
                  "background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s",
                flexShrink: 0,
                boxShadow,
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {arr.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              textAlign: "center",
              fontSize: 10,
              color: "#9ca3af",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {idx}
          </div>
        ))}
      </div>
    </div>
  );
}

function Comparison({
  sorted,
  isSorted,
  i,
  compareResult,
}: {
  sorted: number[];
  isSorted: boolean;
  i: number | null;
  compareResult: CompareResult;
}) {
  const ready = isSorted && i !== null;
  const opSymbol =
    compareResult === "duplicate"
      ? "=="
      : compareResult === "consecutive"
        ? "+1 →"
        : compareResult === "break"
          ? "≠"
          : "?";
  const opColor =
    compareResult === "duplicate"
      ? "text-amber-600"
      : compareResult === "consecutive"
        ? "text-emerald-600"
        : compareResult === "break"
          ? "text-rose-500"
          : "text-gray-300";
  const footer =
    compareResult === "duplicate"
      ? "duplicate → continue"
      : compareResult === "consecutive"
        ? "extend run · currLength++"
        : compareResult === "break"
          ? "gap → reset currLength = 1"
          : "";
  const footerColor =
    compareResult === "duplicate"
      ? "text-amber-700"
      : compareResult === "consecutive"
        ? "text-emerald-700"
        : compareResult === "break"
          ? "text-rose-600"
          : "text-transparent";

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-sm h-[58px]">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className={ready ? "text-violet-700 font-semibold" : "text-gray-300"}>
          {ready ? sorted[(i as number) - 1] : "nums[i−1]"}
        </span>
        <span className={`font-bold ${opColor}`}>{opSymbol}</span>
        <span className={ready ? "text-amber-700 font-semibold" : "text-gray-300"}>
          {ready ? sorted[i as number] : "nums[i]"}
        </span>
      </div>
      <div className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${footerColor}`}>
        {footer || "placeholder"}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  labelColor,
}: {
  label: string;
  value: string;
  labelColor?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
      <span className="font-semibold" style={{ color: labelColor ?? "#9ca3af" }}>
        {label}
      </span>
      <span className="font-semibold text-gray-700">= {value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<StepKind, string> = {
  sort: "Sort",
  init: "Initialise",
  loop: "Loop iteration",
  duplicate: "Duplicate",
  consecutive: "Consecutive",
  extend: "Extend run",
  break: "Break",
  reset: "Reset",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  sort: "text-sky-600",
  init: "text-indigo-600",
  loop: "text-amber-600",
  duplicate: "text-amber-600",
  consecutive: "text-emerald-600",
  extend: "text-emerald-600",
  break: "text-rose-500",
  reset: "text-rose-500",
  return: "text-emerald-600",
};

export default function LongestConsecutiveSortingVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId]
  );

  const { sorted, steps } = useMemo(() => simulate(preset.nums), [preset]);

  const isDone = step >= steps.length;
  const cur = step > 0 ? steps[step - 1] : null;

  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
  }, [presetId]);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    const wait =
      cur?.kind === "return"
        ? 900
        : cur?.kind === "sort" || cur?.kind === "init"
          ? 900
          : cur?.kind === "loop"
            ? 550
            : 800;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to dry-run the algorithm. The highlighted line is the one currently executing.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const i = cur?.i ?? null;
  const currLength = cur?.currLength ?? 1;
  const maxLength = cur?.maxLength ?? 1;
  const currentRunStart = cur?.currentRunStart ?? 0;
  const bestRun = cur?.bestRun ?? { start: 0, end: 0 };
  const compareResult = cur?.compareResult ?? null;
  const isSorted = cur?.sorted ?? false;

  const bestRunValues = useMemo(() => {
    if (bestRun.end <= bestRun.start) return null;
    const slice = sorted.slice(bestRun.start, bestRun.end + 1);
    // The window can include duplicates; the algorithmic run is over distinct values.
    return slice.filter((v, idx, self) => idx === 0 || v !== self[idx - 1]);
  }, [sorted, bestRun]);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-3 flex items-center gap-1.5 flex-wrap min-h-[52px]">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
          Sample inputs
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => loadPreset(p.id)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
              presetId === p.id
                ? "border-gray-400 bg-white text-gray-800"
                : "border-gray-200 text-gray-500 hover:bg-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[32rem]">
        <div className="flex-1 min-w-0 px-5 pt-5 pb-5 flex flex-col gap-3 overflow-hidden">
          <AlgorithmPanel activeLines={lines} />
          <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-gray-200/70 shrink-0">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                kind ? KIND_COLOR[kind] : "text-gray-400"
              }`}
            >
              {kind ? KIND_LABEL[kind] : "Ready"}
            </span>
            <p className="text-xs text-gray-600 leading-relaxed h-[3.75rem] overflow-hidden">
              {description}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[380px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-4 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <ArrayDisplay
            input={preset.nums}
            sorted={sorted}
            isSorted={isSorted}
            i={i}
            currentRunStart={currentRunStart}
            bestRun={bestRun}
            currLength={currLength}
            compareResult={compareResult}
          />

          <Comparison
            sorted={sorted}
            isSorted={isSorted}
            i={i}
            compareResult={compareResult}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="i"
              value={i === null ? "—" : String(i)}
              labelColor="#d97706"
            />
            <StatPill
              label="currLength"
              value={String(currLength)}
              labelColor="#0f766e"
            />
            <StatPill
              label="maxLength"
              value={String(maxLength)}
              labelColor="#059669"
            />
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                Longest run so far
              </span>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {maxLength}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-emerald-700/80 h-[16px]">
              {bestRunValues ? `[${bestRunValues.join(", ")}]` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-3.5 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            if (isDone) {
              setStep(0);
              setIsPlaying(false);
            } else setIsPlaying((prev) => !prev);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isDone && !isPlaying) setStep((s) => s + 1);
          }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={13} /> Step
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setIsPlaying(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50"
        >
          <RotateCcw size={13} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1 bg-gray-200/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{
                width: `${steps.length ? (step / steps.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400 tabular-nums font-mono">
            {step}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
