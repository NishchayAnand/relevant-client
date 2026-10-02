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
  { id: "example1", label: "nums = [23, 2, 4, 6, 7] · k = 6", nums: [23, 2, 4, 6, 7], k: 6 },
  { id: "example2", label: "nums = [23, 2, 6, 4, 7] · k = 6", nums: [23, 2, 6, 4, 7], k: 6 },
  { id: "example3", label: "nums = [23, 2, 6, 4, 7] · k = 13", nums: [23, 2, 6, 4, 7], k: 13 },
];

const ALGORITHM_LINES = [
  "public boolean checkSubarraySum(int[] nums, int k) {",
  "",
  "    /* 1. Initialize:",
  "     *      a. A map to track the first occurrence of every distinct prefix-sum-remainder.",
  "     *      b. A variable to track the prefix sum observed so far.",
  "     */",
  "    Map<Integer, Integer> prefixSumRemainderMap = new HashMap<>();",
  "    int currentPrefixSum = 0;",
  "",
  "    // 2. Add \"{0, -1}\" to the prefix sum remainder map to handle good subarrays that start at index 0.",
  "    prefixSumRemainderMap.put(0, -1);",
  "",
  "    // 3. Iterate over each index in \"nums\".",
  "    for (int i = 0; i < nums.length; i++) {",
  "        // 4. Add the current element to the current prefix sum.",
  "        currentPrefixSum += nums[i];",
  "        // 5. Calculate the current subarray sum remainder.",
  "        int prefixSumRemainder = currentPrefixSum % k;",
  "        // 6. Check if prefix sum remainder map contains the current prefix sum ",
  "        if (prefixSumRemainderMap.containsKey(prefixSumRemainder)) {",
  "            /* Check if the difference between the current index and first occurence of the current prefix ",
  "             * sum in prefix sum remainder map is greater than 1.",
  "             */",
  "            if (i - prefixSumRemainderMap.get(prefixSumRemainder) > 1) {",
  "                return true;",
  "            }",
  "        // 7. Check if prefix sum remainder map does not contain the current prefix sum ",
  "        } else {",
  "            // Add the current prefix sum and the current index as key-value pair in the prefix sum remainder map.",
  "            prefixSumRemainderMap.put(prefixSumRemainder, i);",
  "        }",
  "    }",
  "    ",
  "    // 8. If no good subarray found, return \"false\".",
  "    return false;",
  "",
  "}",
];

type StepKind =
  | "init"
  | "seed"
  | "enter"
  | "add"
  | "remainder"
  | "contains"
  | "gap"
  | "found"
  | "store"
  | "miss";

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  includedEnd: number | null;
  focusIndex: number | null;
  spanStart: number | null;
  spanEnd: number | null;
  prefixSum: number | null;
  remainder: number | null;
  firstIndex: number | null;
  gap: number | null;
  mapKeys: number[];
  mapIndex: Record<number, number>;
  highlightKey: number | null;
  eligible: boolean | null;
  result: boolean | null;
};

function simulate(nums: number[], k: number): Step[] {
  const steps: Step[] = [];
  const map = new Map<number, number>();
  let prefixSum = 0;

  const snapshot = () => ({
    mapKeys: [...map.keys()],
    mapIndex: Object.fromEntries(map) as Record<number, number>,
  });

  const push = (
    partial: Omit<Step, "mapKeys" | "mapIndex" | "prefixSum"> & { prefixSum?: number | null },
  ) => {
    steps.push({
      ...partial,
      prefixSum: partial.prefixSum === undefined ? prefixSum : partial.prefixSum,
      ...snapshot(),
    });
  };

  push({
    kind: "init",
    lines: [3, 4, 5, 6, 7, 8],
    description: "prefixSumRemainderMap = {}. currentPrefixSum = 0.",
    i: null,
    includedEnd: null,
    focusIndex: null,
    spanStart: null,
    spanEnd: null,
    remainder: null,
    firstIndex: null,
    gap: null,
    highlightKey: null,
    eligible: null,
    result: null,
    prefixSum: 0,
  });

  map.set(0, -1);
  push({
    kind: "seed",
    lines: [10, 11],
    description: "prefixSumRemainderMap[0] = -1.",
    i: null,
    includedEnd: null,
    focusIndex: null,
    spanStart: null,
    spanEnd: null,
    remainder: null,
    firstIndex: -1,
    gap: null,
    highlightKey: 0,
    eligible: null,
    result: null,
  });

  for (let i = 0; i < nums.length; i++) {
    push({
      kind: "enter",
      lines: [13, 14],
      description: `i = ${i}. nums[${i}] = ${nums[i]}.`,
      i,
      includedEnd: i > 0 ? i - 1 : null,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      remainder: null,
      firstIndex: null,
      gap: null,
      highlightKey: null,
      eligible: null,
      result: null,
    });

    const prevSum = prefixSum;
    prefixSum += nums[i];
    push({
      kind: "add",
      lines: [15, 16],
      description: `currentPrefixSum = ${prevSum} + ${nums[i]} = ${prefixSum}.`,
      i,
      includedEnd: i,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      remainder: null,
      firstIndex: null,
      gap: null,
      highlightKey: null,
      eligible: null,
      result: null,
    });

    const remainder = prefixSum % k;
    push({
      kind: "remainder",
      lines: [17, 18],
      description: `prefixSumRemainder = ${prefixSum} % ${k} = ${remainder}.`,
      i,
      includedEnd: i,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      remainder,
      firstIndex: null,
      gap: null,
      highlightKey: null,
      eligible: null,
      result: null,
    });

    const seen = map.has(remainder);
    const firstIndex = seen ? (map.get(remainder) as number) : null;
    push({
      kind: "contains",
      lines: [19, 20],
      description: seen
        ? `prefixSumRemainderMap contains ${remainder}.`
        : `prefixSumRemainderMap does not contain ${remainder}.`,
      i,
      includedEnd: i,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      remainder,
      firstIndex,
      gap: null,
      highlightKey: seen ? remainder : null,
      eligible: null,
      result: null,
    });

    if (seen && firstIndex !== null) {
      const gap = i - firstIndex;
      const spanStart = firstIndex + 1;
      push({
        kind: "gap",
        lines: [21, 22, 23, 24],
        description:
          gap > 1
            ? `i - prefixSumRemainderMap[${remainder}] = ${i} - ${firstIndex} = ${gap}, and ${gap} > 1.`
            : `i - prefixSumRemainderMap[${remainder}] = ${i} - ${firstIndex} = ${gap}, and ${gap} > 1 is false. The stored index stays ${firstIndex}.`,
        i,
        includedEnd: i,
        focusIndex: i,
        spanStart,
        spanEnd: i,
        remainder,
        firstIndex,
        gap,
        highlightKey: remainder,
        eligible: gap > 1,
        result: null,
      });

      if (gap > 1) {
        push({
          kind: "found",
          lines: [25],
          description: "Return true.",
          i,
          includedEnd: i,
          focusIndex: null,
          spanStart,
          spanEnd: i,
          remainder,
          firstIndex,
          gap,
          highlightKey: remainder,
          eligible: true,
          result: true,
        });
        return steps;
      }
    } else {
      map.set(remainder, i);
      push({
        kind: "store",
        lines: [27, 28, 29, 30],
        description: `prefixSumRemainderMap[${remainder}] = ${i}.`,
        i,
        includedEnd: i,
        focusIndex: i,
        spanStart: null,
        spanEnd: null,
        remainder,
        firstIndex: i,
        gap: null,
        highlightKey: remainder,
        eligible: null,
        result: null,
      });
    }
  }

  push({
    kind: "miss",
    lines: [34, 35],
    description: "No good subarray was found. Return false.",
    i: null,
    includedEnd: null,
    focusIndex: null,
    spanStart: null,
    spanEnd: null,
    remainder: null,
    firstIndex: null,
    gap: null,
    highlightKey: null,
    eligible: null,
    result: false,
    prefixSum: null,
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

function ArrayDisplay({
  nums,
  i,
  includedEnd,
  focusIndex,
  spanStart,
  spanEnd,
  eligible,
}: {
  nums: number[];
  i: number | null;
  includedEnd: number | null;
  focusIndex: number | null;
  spanStart: number | null;
  spanEnd: number | null;
  eligible: boolean | null;
}) {
  const cellW = 36;
  const gap = 4;
  const inSpan = (idx: number) =>
    spanStart !== null && spanEnd !== null && idx >= spanStart && idx <= spanEnd;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">nums</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {nums.map((value, idx) => {
              const spanned = inSpan(idx);
              const inside = includedEnd !== null && idx <= includedEnd;
              const pending = idx === i && !inside;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (eligible === true && spanned) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (eligible === false && spanned) {
                bg = "#fff1f2";
                border = "#fda4af";
                color = "#9f1239";
              } else if (inside) {
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
                    fontSize: 13,
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

function RemainderTable({
  keys,
  indexes,
  highlightKey,
  eligible,
}: {
  keys: number[];
  indexes: Record<number, number>;
  highlightKey: number | null;
  eligible: boolean | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        prefixSumRemainderMap
      </div>
      {keys.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
          Empty
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-2 py-1">
            <span className="text-center">remainder</span>
            <span className="text-center">first index</span>
          </div>
          {keys.map((key) => {
            const isHi = key === highlightKey;
            const rowBg =
              isHi && eligible === true
                ? "bg-emerald-50/70"
                : isHi && eligible === false
                  ? "bg-rose-50"
                  : isHi
                    ? "bg-amber-50"
                    : "bg-white";
            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_1fr] items-center px-2 py-1 font-mono text-[12px] border-t border-gray-100 ${rowBg}`}
              >
                <span className="text-center font-bold text-gray-800">{key}</span>
                <span className="text-center font-semibold text-gray-700">{indexes[key]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize",
  seed: "Seed remainder 0",
  enter: "Next index",
  add: "Add nums[i]",
  remainder: "Prefix remainder",
  contains: "Look up remainder",
  gap: "Check index gap",
  found: "Return true",
  store: "Store first index",
  miss: "Return false",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  seed: "text-indigo-600",
  enter: "text-amber-600",
  add: "text-violet-600",
  remainder: "text-violet-600",
  contains: "text-amber-600",
  gap: "text-amber-600",
  found: "text-emerald-600",
  store: "text-indigo-600",
  miss: "text-rose-500",
};

export default function ContinuousSubarraySumPrefixVisualizer() {
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
    const wait = cur?.kind === "found" || cur?.kind === "miss" ? 1000 : cur?.kind === "gap" ? 750 : 520;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const windowText =
    cur?.spanStart != null && cur.spanEnd != null && cur.spanStart <= cur.spanEnd
      ? preset.nums.slice(cur.spanStart, cur.spanEnd + 1).join(", ")
      : "";
  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kindColor =
    cur?.kind === "contains" && cur.highlightKey == null
      ? "text-rose-500"
      : cur?.kind === "gap" && cur.eligible === true
        ? "text-emerald-600"
        : cur?.kind === "gap" && cur.eligible === false
          ? "text-rose-500"
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
            includedEnd={cur?.includedEnd ?? null}
            focusIndex={cur?.focusIndex ?? null}
            spanStart={cur?.spanStart ?? null}
            spanEnd={cur?.spanEnd ?? null}
            eligible={cur?.eligible ?? null}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Candidate subarray
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
                {cur?.eligible === true ? "good" : cur?.eligible === false ? "too short" : "—"}
              </span>
            </div>
            <div className="mt-0.5 font-bold truncate text-gray-800">
              {windowText ? `[${windowText}]` : "nums[first + 1..i]"}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-amber-600">i</span>
              <span className="font-semibold text-gray-700"> = {cur?.i ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">currentPrefixSum</span>
              <span className="font-semibold text-gray-700"> = {cur?.prefixSum ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">prefixSumRemainder</span>
              <span className="font-semibold text-gray-700"> = {cur?.remainder ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">first index</span>
              <span className="font-semibold text-gray-700"> = {cur?.firstIndex ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">i − first</span>
              <span className="font-semibold text-gray-700"> = {cur?.gap ?? "—"}</span>
            </div>
          </div>

          <RemainderTable
            keys={cur?.mapKeys ?? []}
            indexes={cur?.mapIndex ?? {}}
            highlightKey={cur?.highlightKey ?? null}
            eligible={cur?.kind === "gap" || cur?.kind === "found" ? (cur.eligible ?? null) : null}
          />

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              cur?.result === true
                ? "border border-emerald-300 bg-emerald-50"
                : cur?.result === false
                  ? "border border-rose-200 bg-rose-50"
                  : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
              checkSubarraySum
            </div>
            <div
              className={`mt-0.5 font-mono text-sm font-bold ${
                cur?.result === true
                  ? "text-emerald-800"
                  : cur?.result === false
                    ? "text-rose-700"
                    : "text-gray-300"
              }`}
            >
              {cur?.result == null ? "—" : String(cur.result)}
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
