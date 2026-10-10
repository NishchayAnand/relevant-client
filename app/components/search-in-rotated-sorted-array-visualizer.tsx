"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  nums: number[];
  target: number;
};

const PRESETS: Preset[] = [
  {
    id: "example1",
    label: "nums = [4, 5, 6, 7, 0, 1, 2], target = 0",
    nums: [4, 5, 6, 7, 0, 1, 2],
    target: 0,
  },
  {
    id: "example2",
    label: "nums = [4, 5, 6, 7, 0, 1, 2], target = 3",
    nums: [4, 5, 6, 7, 0, 1, 2],
    target: 3,
  },
  {
    id: "example3",
    label: "nums = [1], target = 0",
    nums: [1],
    target: 0,
  },
];

const ALGORITHM_LINES = [
  "public int search(int[] nums, int target) {",
  "",
  "    // 1. Initialize two pointers, start and end, to mark the subarray under consideration.",
  "    int start = 0, end = nums.length - 1;",
  "",
  "    // 2. Keep performing the below operations while atleast one element exist in the current subarray.",
  "    while (start <= end) {",
  "",
  "        // 3. Find the middle index of the current subarray.",
  "        int middle = (start + end) / 2;",
  "",
  "        // 4. If the middle element of the current subarray == target element, return the middle index.",
  "        if (nums[middle] == target) {",
  "            return middle;",
  "        }",
  "",
  "        // 5. If the first element of the current subarray <= middle element, the left half ",
  "        // of the subarray is sorted.",
  "        if (nums[start] <= nums[middle]) {",
  "",
  "            // 6. If target element doesn't lie in the left half, move start pointer to (middle + 1).",
  "            if (target < nums[start] || target > nums[middle]) {",
  "                start = middle + 1;",
  "            } else { // 7. Otherwise, the target element can lie in the left half. Move end pointer to (middle - 1). ",
  "                end = middle - 1;",
  "            }",
  "            ",
  "",
  "        } else { // 8. Otherwise, the right half is sorted.",
  "",
  "            // 9. If the target element doesn't lie in the right half, move end pointer to (middle - 1).",
  "            if (target < nums[middle] || target > nums[end]) {",
  "                end = middle - 1;",
  "            } else { // 10. Otherwise, the target element can lie in the right half. Move start pointer to (middle + 1).",
  "                start = middle + 1;",
  "            }",
  "",
  "        }",
  "        ",
  "    }   ",
  "",
  "    // 11. If the target element is not found, return -1.",
  "    return -1;",
  "        ",
  "}",
];

type StepKind =
  | "init"
  | "loop"
  | "middle"
  | "compare"
  | "found"
  | "left"
  | "right"
  | "test-left"
  | "test-right"
  | "move-start"
  | "move-end"
  | "miss";

type Span = { lo: number; hi: number };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  ok: boolean | null;
  start: number;
  end: number;
  middle: number | null;
  sorted: Span | null;
  unsorted: Span | null;
  drop: Span | null;
  matchIndex: number | null;
  result: number | null;
};

function span(lo: number, hi: number): Span | null {
  if (lo > hi) return null;
  return { lo, hi };
}

function simulate(nums: number[], target: number): Step[] {
  const steps: Step[] = [];
  let start = 0;
  let end = nums.length - 1;

  const push = (
    partial: Omit<Step, "start" | "end"> & { start?: number; end?: number },
  ) => {
    steps.push({
      start,
      end,
      ...partial,
    });
  };

  push({
    kind: "init",
    lines: [3, 4],
    description: `start = 0 and end = ${end}. The subarray under consideration is [${nums.join(", ")}].`,
    ok: null,
    middle: null,
    sorted: null,
    unsorted: null,
    drop: null,
    matchIndex: null,
    result: null,
  });

  while (true) {
    const open = start <= end;
    push({
      kind: "loop",
      lines: [6, 7],
      description: open
        ? `start (${start}) <= end (${end}), so the current subarray still has elements.`
        : `start (${start}) > end (${end}), so the current subarray is empty.`,
      ok: open ? null : false,
      middle: null,
      sorted: null,
      unsorted: null,
      drop: null,
      matchIndex: null,
      result: null,
    });
    if (!open) break;

    const middle = Math.floor((start + end) / 2);
    const midVal = nums[middle];
    const startVal = nums[start];
    const endVal = nums[end];
    const leftSorted = startVal <= midVal;

    push({
      kind: "middle",
      lines: [9, 10],
      description: `middle = (${start} + ${end}) / 2 = ${middle}. nums[${middle}] = ${midVal}.`,
      ok: null,
      middle,
      sorted: null,
      unsorted: null,
      drop: null,
      matchIndex: null,
      result: null,
    });

    if (midVal === target) {
      push({
        kind: "compare",
        lines: [12, 13],
        description: `nums[${middle}] = ${midVal} equals target ${target}.`,
        ok: true,
        middle,
        sorted: null,
        unsorted: null,
        drop: null,
        matchIndex: middle,
        result: null,
      });
      push({
        kind: "found",
        lines: [14],
        description: `return ${middle}.`,
        ok: true,
        middle,
        sorted: null,
        unsorted: null,
        drop: null,
        matchIndex: middle,
        result: middle,
      });
      return steps;
    }

    push({
      kind: "compare",
      lines: [12, 13],
      description: `nums[${middle}] = ${midVal} does not equal target ${target}.`,
      ok: false,
      middle,
      sorted: null,
      unsorted: null,
      drop: null,
      matchIndex: null,
      result: null,
    });

    push({
      kind: "left",
      lines: [17, 18, 19],
      description: leftSorted
        ? `nums[start] = ${startVal} <= nums[middle] = ${midVal}, so the left half is sorted.`
        : `nums[start] = ${startVal} > nums[middle] = ${midVal}, so the left half is not sorted.`,
      ok: leftSorted,
      middle,
      sorted: leftSorted ? span(start, middle) : null,
      unsorted: leftSorted ? span(middle + 1, end) : null,
      drop: null,
      matchIndex: null,
      result: null,
    });

    if (leftSorted) {
      const belowStart = target < startVal;
      const aboveMid = !belowStart && target > midVal;
      const outside = belowStart || aboveMid;
      const why = belowStart
        ? `target ${target} < nums[start] (${startVal})`
        : aboveMid
          ? `target ${target} > nums[middle] (${midVal})`
          : `target ${target} is between nums[start] (${startVal}) and nums[middle] (${midVal})`;

      push({
        kind: "test-left",
        lines: [21, 22],
        description: outside
          ? `${why}, so the target is not in the left half.`
          : `${why}, so the target can lie in the left half.`,
        ok: !outside,
        middle,
        sorted: span(start, middle),
        unsorted: span(middle + 1, end),
        drop: outside ? span(start, middle) : span(middle, end),
        matchIndex: null,
        result: null,
      });

      if (outside) {
        start = middle + 1;
        push({
          kind: "move-start",
          lines: [23],
          description: `start = middle + 1 = ${start}.`,
          ok: null,
          middle,
          sorted: null,
          unsorted: null,
          drop: null,
          matchIndex: null,
          result: null,
        });
      } else {
        end = middle - 1;
        push({
          kind: "move-end",
          lines: [24, 25],
          description: `end = middle - 1 = ${end}.`,
          ok: null,
          middle,
          sorted: null,
          unsorted: null,
          drop: null,
          matchIndex: null,
          result: null,
        });
      }
    } else {
      push({
        kind: "right",
        lines: [29],
        description: `The right half is sorted, from index ${middle} through ${end}.`,
        ok: true,
        middle,
        sorted: span(middle, end),
        unsorted: span(start, middle - 1),
        drop: null,
        matchIndex: null,
        result: null,
      });

      const belowMid = target < midVal;
      const aboveEnd = !belowMid && target > endVal;
      const outside = belowMid || aboveEnd;
      const why = belowMid
        ? `target ${target} < nums[middle] (${midVal})`
        : aboveEnd
          ? `target ${target} > nums[end] (${endVal})`
          : `target ${target} is between nums[middle] (${midVal}) and nums[end] (${endVal})`;

      push({
        kind: "test-right",
        lines: [31, 32],
        description: outside
          ? `${why}, so the target is not in the right half.`
          : `${why}, so the target can lie in the right half.`,
        ok: !outside,
        middle,
        sorted: span(middle, end),
        unsorted: span(start, middle - 1),
        drop: outside ? span(middle, end) : span(start, middle),
        matchIndex: null,
        result: null,
      });

      if (outside) {
        end = middle - 1;
        push({
          kind: "move-end",
          lines: [33],
          description: `end = middle - 1 = ${end}.`,
          ok: null,
          middle,
          sorted: null,
          unsorted: null,
          drop: null,
          matchIndex: null,
          result: null,
        });
      } else {
        start = middle + 1;
        push({
          kind: "move-start",
          lines: [34, 35],
          description: `start = middle + 1 = ${start}.`,
          ok: null,
          middle,
          sorted: null,
          unsorted: null,
          drop: null,
          matchIndex: null,
          result: null,
        });
      }
    }
  }

  push({
    kind: "miss",
    lines: [42, 43],
    description: "The target is not in nums. return -1.",
    ok: false,
    middle: null,
    sorted: null,
    unsorted: null,
    drop: null,
    matchIndex: null,
    result: -1,
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
        const isComment = /^\s*(\/\/|\/\*|\*)/.test(line);
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

function covers(range: Span | null, idx: number) {
  return range !== null && idx >= range.lo && idx <= range.hi;
}

function ArrayDisplay({
  nums,
  start,
  end,
  middle,
  sorted,
  unsorted,
  drop,
  matchIndex,
}: {
  nums: number[];
  start: number | null;
  end: number | null;
  middle: number | null;
  sorted: Span | null;
  unsorted: Span | null;
  drop: Span | null;
  matchIndex: number | null;
}) {
  const cellW = nums.length > 8 ? 28 : 36;
  const gap = 4;
  const bounded = start !== null && end !== null && start <= end;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">nums</div>
        <div className="text-[10px] font-mono text-gray-400">
          <span className="text-sky-600 font-semibold">S</span> start
          <span className="mx-1.5 text-gray-300">·</span>
          <span className="text-amber-600 font-semibold">M</span> middle
          <span className="mx-1.5 text-gray-300">·</span>
          <span className="text-violet-600 font-semibold">E</span> end
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {nums.map((_, idx) => {
              const tags: string[] = [];
              if (bounded && idx === start) tags.push("S");
              if (middle === idx) tags.push("M");
              if (bounded && idx === end) tags.push("E");
              const color =
                idx === matchIndex
                  ? "#059669"
                  : tags.length > 1
                    ? "#374151"
                    : tags[0] === "S"
                      ? "#0284c7"
                      : tags[0] === "E"
                        ? "#7c3aed"
                        : tags[0] === "M"
                          ? "#d97706"
                          : "transparent";
              return (
                <div
                  key={idx}
                  style={{
                    width: cellW,
                    height: 16,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {tags.join(" ")}
                </div>
              );
            })}
          </div>
          <div className="flex" style={{ gap }}>
            {nums.map((value, idx) => {
              const inWindow = bounded && idx >= (start as number) && idx <= (end as number);
              const isMatch = idx === matchIndex;
              const isDrop = covers(drop, idx);
              const isSorted = covers(sorted, idx);
              const isUnsorted = covers(unsorted, idx);
              let bg = "#f3f4f6";
              let border = "#e5e7eb";
              let color = "#d1d5db";
              if (isMatch) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (isDrop) {
                bg = "#ffe4e6";
                border = "#fb7185";
                color = "#9f1239";
              } else if (isSorted) {
                bg = "#eff6ff";
                border = "#93c5fd";
                color = "#1e40af";
              } else if (isUnsorted) {
                bg = "#fffbeb";
                border = "#fcd34d";
                color = "#92400e";
              } else if (inWindow) {
                bg = "#ffffff";
                border = "#d1d5db";
                color = "#374151";
              }
              const outline = middle === idx && !isMatch ? "2px solid #d97706" : undefined;
              return (
                <div
                  key={idx}
                  style={{
                    width: cellW,
                    height: 36,
                    background: bg,
                    border: `2px solid ${border}`,
                    outline,
                    outlineOffset: outline ? 1 : undefined,
                    color,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    fontSize: 14,
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
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block w-2 h-2 rounded-sm bg-blue-100 border border-blue-300" />
          sorted half
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block w-2 h-2 rounded-sm bg-amber-100 border border-amber-300" />
          other half
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block w-2 h-2 rounded-sm bg-rose-100 border border-rose-300" />
          discarded
        </span>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize",
  loop: "Check subarray",
  middle: "Find middle",
  compare: "Compare with target",
  found: "Return index",
  left: "Check left half",
  right: "Right half sorted",
  "test-left": "Target in left half?",
  "test-right": "Target in right half?",
  "move-start": "Move start",
  "move-end": "Move end",
  miss: "Return -1",
};

function kindColor(step: Step | null) {
  if (!step) return "text-gray-400";
  if (step.kind === "found") return "text-emerald-600";
  if (step.kind === "miss" || step.ok === false) return "text-rose-500";
  if (step.ok === true) return "text-emerald-600";
  if (step.kind === "move-start" || step.kind === "move-end") return "text-violet-600";
  if (step.kind === "init") return "text-sky-600";
  return "text-amber-600";
}

function valueAt(nums: number[], index: number | null) {
  if (index == null || index < 0 || index >= nums.length) return "—";
  return String(nums[index]);
}

export default function SearchInRotatedSortedArrayVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const steps = useMemo(() => simulate(preset.nums, preset.target), [preset]);
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
    const wait = cur?.kind === "found" || cur?.kind === "miss" ? 900 : 520;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const windowText =
    cur && cur.start <= cur.end ? preset.nums.slice(cur.start, cur.end + 1).join(", ") : "";
  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";

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
          <ArrayDisplay
            nums={preset.nums}
            start={cur?.start ?? null}
            end={cur?.end ?? null}
            middle={cur?.middle ?? null}
            sorted={cur?.sorted ?? null}
            unsorted={cur?.unsorted ?? null}
            drop={cur?.drop ?? null}
            matchIndex={cur?.matchIndex ?? null}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current subarray
              </span>
              <span className="text-[10px] font-semibold text-gray-400">
                {cur ? `[${cur.start}, ${cur.end}]` : "—"}
              </span>
            </div>
            <div className="mt-0.5 font-bold truncate text-gray-800">
              {windowText ? `[${windowText}]` : cur ? "[]" : "nums[start..end]"}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-gray-500">target</span>
              <span className="font-semibold text-gray-700"> = {preset.target}</span>
            </div>
            <div>
              <span className="font-semibold text-sky-600">start</span>
              <span className="font-semibold text-gray-700"> = {cur ? cur.start : "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-amber-600">middle</span>
              <span className="font-semibold text-gray-700"> = {cur?.middle ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">end</span>
              <span className="font-semibold text-gray-700"> = {cur ? cur.end : "—"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-gray-500">nums[start]</span>
              <span className="font-semibold text-gray-700"> = {cur ? valueAt(preset.nums, cur.start) : "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">nums[middle]</span>
              <span className="font-semibold text-gray-700">
                {" "}
                = {cur ? valueAt(preset.nums, cur.middle) : "—"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">nums[end]</span>
              <span className="font-semibold text-gray-700"> = {cur ? valueAt(preset.nums, cur.end) : "—"}</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              cur?.kind === "found"
                ? "border border-emerald-300 bg-emerald-50"
                : cur?.kind === "miss"
                  ? "border border-rose-200 bg-rose-50"
                  : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Returned index</div>
            <div
              className={`mt-0.5 font-mono text-sm font-bold ${
                cur?.result == null ? "text-gray-300" : cur.result >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {cur?.result ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-2.5 min-h-[4.25rem]">
        <div className={`text-[10px] font-semibold uppercase tracking-wide ${kindColor(cur)}`}>
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
