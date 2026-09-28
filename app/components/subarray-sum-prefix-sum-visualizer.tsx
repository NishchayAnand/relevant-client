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
  "    // 2. Initialize a variable to track the cumulative sum observed so far.",
  "    int currentPrefixSum = 0;",
  "    // 3. Initialize a frequency map to track the frequencies of prefix sums observed so far.",
  "    Map<Integer, Integer> prefixSumFrequencyMap = new HashMap<>();",
  "",
  "    // 4. Add \"{0: 1}\" to handle the edge case where a subarray starting at index \"0\" has a sum equal to \"k\".",
  "    prefixSumFrequencyMap.put(0, 1);",
  "",
  "    // 5. Iterate over each element in \"nums\".",
  "    for (int num : nums) {",
  "        // 6. Add the current element to the current prefix sum.",
  "        currentPrefixSum += num;",
  "        // 7. Check if the prefix sum frequency map contains (current prefix sum - k).",
  "        if (prefixSumFrequencyMap.containsKey(currentPrefixSum - k)) {",
  "            // 8. Increment the count of eligible subarrays by the frequency of (current prefix sum - k).",
  "            int frequency = prefixSumFrequencyMap.get(currentPrefixSum - k);",
  "            count += frequency;",
  "        }",
  "        // 9. Add or update the frequency of the current prefix sum in the prefix sum frequency map.",
  "        prefixSumFrequencyMap.put(currentPrefixSum, ",
  "            prefixSumFrequencyMap.getOrDefault(currentPrefixSum, 0) + 1",
  "        );",
  "",
  "    }",
  "",
  "    // 10. Return the count of eligible subarrays.",
  "    return count;",
  "    ",
  "}",
];

type StepKind =
  | "init_count"
  | "init_sum"
  | "init_map"
  | "seed"
  | "enter"
  | "add"
  | "check"
  | "increment"
  | "update"
  | "return";

type Found = { start: number; end: number };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  index: number | null;
  includedEnd: number | null;
  focusIndex: number | null;
  prefixSum: number | null;
  lookup: number | null;
  frequency: number | null;
  count: number | null;
  mapKeys: number[];
  mapFreq: Record<number, number>;
  highlightKey: number | null;
  found: Found[];
  eligible: boolean | null;
};

function simulate(nums: number[], k: number): Step[] {
  const steps: Step[] = [];
  let count = 0;
  let prefixSum = 0;
  const freq = new Map<number, number>();
  const seen = new Map<number, number[]>();
  const found: Found[] = [];
  const snapshot = () => ({
    mapKeys: [...freq.keys()],
    mapFreq: Object.fromEntries(freq) as Record<number, number>,
    found: found.map((entry) => ({ ...entry })),
  });

  const push = (
    partial: Omit<Step, "count" | "mapKeys" | "mapFreq" | "found" | "prefixSum"> & {
      count?: number | null;
      prefixSum?: number | null;
    },
  ) => {
    const snap = snapshot();
    steps.push({
      ...partial,
      count: partial.count === undefined ? count : partial.count,
      prefixSum: partial.prefixSum === undefined ? prefixSum : partial.prefixSum,
      ...snap,
    });
  };

  push({
    kind: "init_count",
    lines: [3, 4],
    description: "count = 0.",
    index: null,
    includedEnd: null,
    focusIndex: null,
    lookup: null,
    frequency: null,
    highlightKey: null,
    eligible: null,
    count: 0,
    prefixSum: null,
  });

  prefixSum = 0;
  push({
    kind: "init_sum",
    lines: [5, 6],
    description: "currentPrefixSum = 0.",
    index: null,
    includedEnd: null,
    focusIndex: null,
    lookup: null,
    frequency: null,
    highlightKey: null,
    eligible: null,
    prefixSum: 0,
  });

  push({
    kind: "init_map",
    lines: [7, 8],
    description: "prefixSumFrequencyMap = {}.",
    index: null,
    includedEnd: null,
    focusIndex: null,
    lookup: null,
    frequency: null,
    highlightKey: null,
    eligible: null,
  });

  freq.set(0, 1);
  seen.set(0, [-1]);
  push({
    kind: "seed",
    lines: [10, 11],
    description: "prefixSumFrequencyMap[0] = 1. A prefix of 0 already exists before index 0.",
    index: null,
    includedEnd: null,
    focusIndex: null,
    lookup: null,
    frequency: null,
    highlightKey: 0,
    eligible: null,
  });

  nums.forEach((num, index) => {
    push({
      kind: "enter",
      lines: [13, 14],
      description: `num = ${num}.`,
      index,
      includedEnd: index > 0 ? index - 1 : null,
      focusIndex: index,
      lookup: null,
      frequency: null,
      highlightKey: null,
      eligible: null,
    });

    const prev = prefixSum;
    prefixSum += num;
    push({
      kind: "add",
      lines: [15, 16],
      description: `currentPrefixSum = ${prev} + ${num} = ${prefixSum}.`,
      index,
      includedEnd: index,
      focusIndex: index,
      lookup: null,
      frequency: null,
      highlightKey: null,
      eligible: null,
    });

    const lookup = prefixSum - k;
    const frequency = freq.get(lookup) ?? 0;
    const matched = freq.has(lookup);
    push({
      kind: "check",
      lines: [17, 18],
      description: matched
        ? `currentPrefixSum - k = ${prefixSum} - ${k} = ${lookup}. prefixSumFrequencyMap contains ${lookup}.`
        : `currentPrefixSum - k = ${prefixSum} - ${k} = ${lookup}. prefixSumFrequencyMap does not contain ${lookup}.`,
      index,
      includedEnd: index,
      focusIndex: index,
      lookup,
      frequency: matched ? frequency : null,
      highlightKey: matched ? lookup : null,
      eligible: matched,
    });

    if (matched) {
      count += frequency;
      const starts = seen.get(lookup) ?? [];
      for (const before of starts) {
        found.push({ start: before + 1, end: index });
      }
      push({
        kind: "increment",
        lines: [19, 20, 21],
        description: `frequency = ${frequency}. count = ${count - frequency} + ${frequency} = ${count}.`,
        index,
        includedEnd: index,
        focusIndex: index,
        lookup,
        frequency,
        highlightKey: lookup,
        eligible: true,
        count,
      });
    }

    const nextFreq = (freq.get(prefixSum) ?? 0) + 1;
    freq.set(prefixSum, nextFreq);
    const ends = seen.get(prefixSum) ?? [];
    ends.push(index);
    seen.set(prefixSum, ends);
    push({
      kind: "update",
      lines: [23, 24, 25, 26],
      description: `prefixSumFrequencyMap[${prefixSum}] = ${nextFreq}.`,
      index,
      includedEnd: index,
      focusIndex: index,
      lookup: null,
      frequency: null,
      highlightKey: prefixSum,
      eligible: null,
    });
  });

  push({
    kind: "return",
    lines: [30, 31],
    description: `Return count = ${count}.`,
    index: null,
    includedEnd: null,
    focusIndex: null,
    lookup: null,
    frequency: null,
    highlightKey: null,
    eligible: null,
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
  index,
  includedEnd,
  focusIndex,
  eligible,
  matchedStart,
}: {
  nums: number[];
  index: number | null;
  includedEnd: number | null;
  focusIndex: number | null;
  eligible: boolean | null;
  matchedStart: number | null;
}) {
  const cellW = nums.length > 8 ? 26 : 36;
  const gap = 4;
  const included = (idx: number) => includedEnd !== null && idx <= includedEnd;
  const inMatch = (idx: number) =>
    eligible === true && matchedStart !== null && includedEnd !== null && idx >= matchedStart && idx <= includedEnd;

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
                  color: idx === index ? "#7c3aed" : "transparent",
                }}
              >
                num
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {nums.map((value, idx) => {
              const inside = included(idx);
              const pending = idx === index && !inside;
              const matched = inMatch(idx);
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (matched) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
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

function FreqTable({
  keys,
  freq,
  highlightKey,
  lookup,
}: {
  keys: number[];
  freq: Record<number, number>;
  highlightKey: number | null;
  lookup: number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        prefixSumFrequencyMap
      </div>
      {keys.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
          Empty
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-2 py-1">
            <span className="text-center">prefix</span>
            <span className="text-center">frequency</span>
          </div>
          {keys.map((key) => {
            const isLookup = key === lookup;
            const isHi = key === highlightKey;
            const rowBg = isLookup
              ? "bg-emerald-50/70"
              : isHi
                ? "bg-amber-50"
                : "bg-white";
            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_1fr] items-center px-2 py-1 font-mono text-[12px] border-t border-gray-100 ${rowBg}`}
              >
                <span className="text-center font-bold text-gray-800">{key}</span>
                <span className="text-center font-semibold text-gray-700">{freq[key]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init_count: "Initialize count",
  init_sum: "Initialize prefix sum",
  init_map: "Initialize map",
  seed: "Seed prefix 0",
  enter: "Next element",
  add: "Add num",
  check: "Look up prefix − k",
  increment: "Increment count",
  update: "Update map",
  return: "Return count",
};

const KIND_COLOR: Record<StepKind, string> = {
  init_count: "text-sky-600",
  init_sum: "text-sky-600",
  init_map: "text-sky-600",
  seed: "text-indigo-600",
  enter: "text-violet-600",
  add: "text-violet-600",
  check: "text-amber-600",
  increment: "text-emerald-600",
  update: "text-indigo-600",
  return: "text-emerald-600",
};

export default function SubarraySumPrefixSumVisualizer() {
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
    const wait = cur?.kind === "increment" || cur?.kind === "return" ? 900 : cur?.kind === "check" ? 700 : 520;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const newest = cur?.kind === "increment" ? cur.found.slice(-(cur.frequency ?? 0)) : [];
  const matchedStart = newest.length > 0 ? Math.min(...newest.map((entry) => entry.start)) : null;
  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kindColor =
    cur?.kind === "check" && cur.eligible === true
      ? "text-emerald-600"
      : cur?.kind === "check" && cur.eligible === false
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
            index={cur?.index ?? null}
            includedEnd={cur?.includedEnd ?? null}
            focusIndex={cur?.focusIndex ?? null}
            eligible={cur?.eligible ?? null}
            matchedStart={matchedStart}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-violet-600">num</span>
              <span className="font-semibold text-gray-700">
                {" "}
                = {cur?.index == null ? "—" : preset.nums[cur.index]}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">currentPrefixSum</span>
              <span className="font-semibold text-gray-700"> = {cur?.prefixSum ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">currentPrefixSum − k</span>
              <span className="font-semibold text-gray-700"> = {cur?.lookup ?? "—"}</span>
            </div>
          </div>

          <FreqTable
            keys={cur?.mapKeys ?? []}
            freq={cur?.mapFreq ?? {}}
            highlightKey={cur?.highlightKey ?? null}
            lookup={cur?.eligible ? (cur.lookup ?? null) : null}
          />

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
                {cur?.found.map((entry, entryIndex) => {
                  const text = preset.nums.slice(entry.start, entry.end + 1).join(", ");
                  const fresh = newest.some(
                    (item) => item.start === entry.start && item.end === entry.end,
                  );
                  return (
                    <div
                      key={`${entry.start}-${entry.end}-${entryIndex}`}
                      className={`rounded-md border px-2 py-1 font-mono text-[12px] ${
                        fresh
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
            <div className={`mt-0.5 font-mono text-sm font-bold ${cur?.count == null ? "text-gray-300" : "text-gray-800"}`}>
              {cur?.count ?? "—"}
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
