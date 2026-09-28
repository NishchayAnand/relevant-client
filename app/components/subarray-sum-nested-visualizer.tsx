"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  nums: number[];
  k: number;
};

const PRESETS: Preset[] = [
  {
    id: "example",
    label: "nums = [1, -1, 1, -1, 2, 3, 3, 4, 1, 5, 2] · k = 8",
    nums: [1, -1, 1, -1, 2, 3, 3, 4, 1, 5, 2],
    k: 8,
  },
  { id: "short", label: "nums = [1, 2, 3] · k = 3", nums: [1, 2, 3], k: 3 },
];

const ALGORITHM_LINES = [
  "public int subarraySum(int[] nums, int k) {",
  "",
  "    //1. Initialize a variable to track the number of eligible subarrays.",
  "    int count = 0;",
  "",
  "    // 2. Iterate over each index in \"nums\", treating it as the starting index of the current subarray.",
  "    for (int i = 0; i < nums.length; i++) {",
  "        // 3. Initialize a variable to store the cumulative sum of the current subarray.",
  "        int currentSubarraySum = 0;",
  "",
  "        // 4. Starting from the current index, expand the subarray one element at a time.",
  "        for (int j = i; j < nums.length; j++) {",
  "            // 5. Add the current element to the current subarray sum.",
  "            currentSubarraySum += nums[j];",
  "            // 6. Check if the current current subarray sum is equal to \"k\"",
  "            if (currentSubarraySum == k) {",
  "                // 7. Increment count of eligible subarrays.",
  "                count++;",
  "            }",
  "        }",
  "            ",
  "    }",
  "",
  "    // 7. Return the count of eligible subarrays.",
  "    return count;",
  "    ",
  "}",
];

type StepKind = "init" | "outer" | "reset" | "expand" | "add" | "check" | "increment" | "return";

type Found = { start: number; end: number };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  sum: number | null;
  count: number;
  eligible: boolean | null;
  found: Found[];
};

function simulate(nums: number[], k: number): Step[] {
  const steps: Step[] = [];
  let count = 0;
  const found: Found[] = [];

  const push = (partial: Omit<Step, "count" | "found"> & { count?: number }) => {
    steps.push({
      ...partial,
      count: partial.count ?? count,
      found: found.map((entry) => ({ ...entry })),
    });
  };

  push({
    kind: "init",
    lines: [3, 4],
    description: "count = 0.",
    i: null,
    j: null,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    sum: null,
    eligible: null,
    count: 0,
  });

  for (let i = 0; i < nums.length; i++) {
    push({
      kind: "outer",
      lines: [6, 7],
      description: `i = ${i}. The next subarray starts at nums[${i}] = ${nums[i]}.`,
      i,
      j: null,
      winStart: null,
      winEnd: null,
      focusIndex: i,
      sum: null,
      eligible: null,
    });

    let sum = 0;
    push({
      kind: "reset",
      lines: [8, 9],
      description: "currentSubarraySum = 0.",
      i,
      j: null,
      winStart: null,
      winEnd: null,
      focusIndex: i,
      sum: 0,
      eligible: null,
    });

    for (let j = i; j < nums.length; j++) {
      const includedEnd = j > i ? j - 1 : null;
      push({
        kind: "expand",
        lines: [11, 12],
        description: `j = ${j}. Next element is nums[${j}] = ${nums[j]}.`,
        i,
        j,
        winStart: includedEnd === null ? null : i,
        winEnd: includedEnd,
        focusIndex: j,
        sum,
        eligible: null,
      });

      const prev = sum;
      sum += nums[j];
      push({
        kind: "add",
        lines: [13, 14],
        description: `currentSubarraySum = ${prev} + ${nums[j]} = ${sum}.`,
        i,
        j,
        winStart: i,
        winEnd: j,
        focusIndex: j,
        sum,
        eligible: null,
      });

      const matched = sum === k;
      push({
        kind: "check",
        lines: [15, 16],
        description: matched
          ? `currentSubarraySum = ${sum}, and ${sum} == k (${k}).`
          : `currentSubarraySum = ${sum}, and ${sum} == k (${k}) is false.`,
        i,
        j,
        winStart: i,
        winEnd: j,
        focusIndex: null,
        sum,
        eligible: matched,
      });

      if (matched) {
        count++;
        found.push({ start: i, end: j });
        push({
          kind: "increment",
          lines: [17, 18],
          description: `count = ${count}.`,
          i,
          j,
          winStart: i,
          winEnd: j,
          focusIndex: null,
          sum,
          eligible: true,
          count,
        });
      }
    }
  }

  push({
    kind: "return",
    lines: [24, 25],
    description: `Return count = ${count}.`,
    i: null,
    j: null,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    sum: null,
    eligible: null,
  });

  return steps;
}

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const first = activeLines[0];
    if (first == null) return;
    const el = lineRefs.current[first - 1];
    const container = el?.parentElement;
    if (!el || !container) return;
    const top = el.offsetTop - container.clientHeight / 3;
    container.scrollTop = Math.max(0, top);
  }, [activeLines]);

  return (
    <div className="font-mono text-[10.5px] leading-[1.5] overflow-auto flex-1 min-h-0">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        const isComment = /^\s*\/\//.test(line);
        return (
          <div
            key={lineNum}
            ref={(el) => {
              lineRefs.current[idx] = el;
            }}
            className={`flex transition-colors duration-150 ${isActive ? "bg-amber-100/80" : ""}`}
            style={{
              borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}`,
            }}
          >
            <span
              className={`w-7 text-right pr-2 select-none tabular-nums shrink-0 ${
                isActive ? "text-amber-700 font-semibold" : "text-gray-300"
              }`}
            >
              {lineNum}
            </span>
            <span
              className={`whitespace-pre shrink-0 pr-3 ${
                isActive
                  ? "text-amber-900 font-semibold"
                  : isComment
                    ? "text-gray-400 italic"
                    : "text-gray-600"
              }`}
            >
              {line.length === 0 ? " " : line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ArrayDisplay({
  nums,
  i,
  j,
  winStart,
  winEnd,
  focusIndex,
  eligible,
}: {
  nums: number[];
  i: number | null;
  j: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  eligible: boolean | null;
}) {
  const cellW = nums.length > 8 ? 26 : 36;
  const gap = 4;
  const inWindow = (idx: number) =>
    winStart !== null && winEnd !== null && idx >= winStart && idx <= winEnd;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">nums</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {nums.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: cellW,
                  height: 14,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: idx === j ? "#7c3aed" : "transparent",
                }}
              >
                j
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {nums.map((value, idx) => {
              const windowed = inWindow(idx);
              const pending = idx === j && !windowed;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (eligible === true && windowed) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (eligible === false && windowed) {
                bg = "#fff1f2";
                border = "#fda4af";
                color = "#9f1239";
              } else if (windowed) {
                bg = "#eff6ff";
                border = "#93c5fd";
                color = "#1e40af";
              } else if (pending) {
                bg = "#f5f3ff";
                border = "#c4b5fd";
                color = "#5b21b6";
              }
              return (
                <div
                  key={idx}
                  style={{
                    width: cellW,
                    height: 36,
                    background: bg,
                    border: `2px solid ${border}`,
                    outline: idx === focusIndex ? "2px solid #d97706" : undefined,
                    outlineOffset: idx === focusIndex ? 1 : undefined,
                    color,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    fontSize: nums.length > 8 ? 12 : 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {value}
                </div>
              );
            })}
          </div>
          <div className="flex" style={{ gap }}>
            {nums.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: cellW,
                  height: 14,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: idx === i ? "#d97706" : "transparent",
                }}
              >
                i
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {nums.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: cellW,
                  textAlign: "center",
                  fontSize: 10,
                  color: "#9ca3af",
                  fontFamily: "monospace",
                }}
              >
                {idx}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize count",
  outer: "Next start",
  reset: "Reset sum",
  expand: "Expand subarray",
  add: "Add nums[j]",
  check: "Compare with k",
  increment: "Increment count",
  return: "Return count",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  outer: "text-amber-600",
  reset: "text-sky-600",
  expand: "text-violet-600",
  add: "text-violet-600",
  check: "text-rose-500",
  increment: "text-emerald-600",
  return: "text-emerald-600",
};

export default function SubarraySumNestedVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const steps = useMemo(() => simulate(preset.nums, preset.k), [preset]);
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
    const wait = cur?.kind === "increment" || cur?.kind === "return" ? 900 : cur?.kind === "check" ? 640 : 480;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const windowText =
    cur?.winStart != null && cur.winEnd != null
      ? preset.nums.slice(cur.winStart, cur.winEnd + 1).join(", ")
      : "";
  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kindColor =
    cur?.kind === "check" && cur.eligible === true
      ? "text-emerald-600"
      : cur
        ? KIND_COLOR[cur.kind]
        : "text-gray-400";

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-3 flex items-center gap-1.5 flex-wrap min-h-[52px]">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
          Sample inputs
        </span>
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => loadPreset(item.id)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
              presetId === item.id
                ? "border-gray-400 bg-white text-gray-800"
                : "border-gray-200 text-gray-500 hover:bg-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[36rem]">
        <div className="h-72 md:h-auto md:flex-1 md:min-h-0 min-w-0 px-4 pt-4 pb-4 flex flex-col overflow-hidden border-b md:border-b-0 border-gray-100">
          <AlgorithmPanel activeLines={cur?.lines ?? []} />
        </div>

        <div className="w-full md:w-[380px] md:min-h-0 shrink-0 px-5 pt-4 pb-4 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">k</span>
            <span className="font-mono text-sm font-bold text-gray-800">{preset.k}</span>
          </div>

          <ArrayDisplay
            nums={preset.nums}
            i={cur?.i ?? null}
            j={cur?.j ?? null}
            winStart={cur?.winStart ?? null}
            winEnd={cur?.winEnd ?? null}
            focusIndex={cur?.focusIndex ?? null}
            eligible={cur?.eligible ?? null}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current subarray
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  cur?.eligible === true
                    ? "text-emerald-600"
                    : cur?.eligible === false
                      ? "text-rose-500"
                      : "text-gray-300"
                }`}
              >
                {cur?.eligible === true ? "sum = k" : cur?.eligible === false ? "sum ≠ k" : "—"}
              </span>
            </div>
            <div className="mt-0.5 font-bold truncate text-gray-800">
              {windowText ? `[${windowText}]` : "nums[i..j]"}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-amber-600">i</span>
              <span className="font-semibold text-gray-700"> = {cur?.i ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">j</span>
              <span className="font-semibold text-gray-700"> = {cur?.j ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">currentSubarraySum</span>
              <span className="font-semibold text-gray-700"> = {cur?.sum ?? "—"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              Eligible subarrays
            </div>
            {(cur?.found.length ?? 0) === 0 ? (
              <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
                None yet
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {cur?.found.map((entry, index) => {
                  const text = preset.nums.slice(entry.start, entry.end + 1).join(", ");
                  const latest = index === (cur?.found.length ?? 0) - 1 && cur?.kind === "increment";
                  return (
                    <div
                      key={`${entry.start}-${entry.end}-${index}`}
                      className={`rounded-md border px-2 py-1 font-mono text-[12px] ${
                        latest
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-gray-100 bg-white text-gray-700"
                      }`}
                    >
                      [{text}]
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              cur?.kind === "return"
                ? "border border-emerald-300 bg-emerald-50"
                : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">count</div>
            <div
              className={`mt-0.5 font-mono text-sm font-bold ${
                cur ? "text-gray-800" : "text-gray-300"
              }`}
            >
              {cur ? cur.count : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-2.5 min-h-[4.25rem]">
        <div className={`text-[10px] font-semibold uppercase tracking-wide ${kindColor}`}>
          {cur ? KIND_LABEL[cur.kind] : "Ready"}
        </div>
        <div className="text-xs text-gray-600 leading-relaxed mt-0.5">{description}</div>
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
            if (!isDone && !isPlaying) setStep((value) => value + 1);
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
              style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
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
