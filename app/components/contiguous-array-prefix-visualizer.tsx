"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  nums: number[];
};

const PRESETS: Preset[] = [
  { id: "example1", label: "nums = [0, 1]", nums: [0, 1] },
  { id: "example2", label: "nums = [0, 1, 0]", nums: [0, 1, 0] },
  { id: "example3", label: "nums = [0, 1, 1, 1, 1, 1, 0, 0, 0]", nums: [0, 1, 1, 1, 1, 1, 0, 0, 0] },
];

const ALGORITHM_LINES = [
  "public int findMaxLength(int[] nums) {",
  "",
  "    /* 1. Initialize:",
  "     *  a. A variable to track the length of the longest subarray with equal number of 0s and 1s.",
  "     *  b. A variable to track the prefix sum observed so far.",
  "     *  c. A map to track the first occurrence of each distinct prefix sum.",
  "     */",
  "    int maxLength = 0;",
  "    int currentPrefixSum = 0;",
  "    Map<Integer, Integer> currentPrefixSumMap = new HashMap<>();",
  "",
  "    // 2. Add \"{0: -1}\" to the current prefix sum map to handle subarrays starting at index 0.",
  "    currentPrefixSumMap.put(0, -1);",
  "",
  "    // 3. Iterate over each index in nums.",
  "    for (int i = 0; i < nums.length; i++) {",
  "        // 4. If the current element is 1, add 1 to the current prefix sum.",
  "        if (nums[i] == 1) currentPrefixSum++;",
  "        // 5. If the current element is equal 0, add -1 to the current prefix sum.",
  "        if (nums[i] == 0) currentPrefixSum += -1;",
  "        // 6. If the current prefix sum exists in the current prefix sum map, update maxLength if necessary.",
  "        if (currentPrefixSumMap.containsKey(currentPrefixSum)) {",
  "            maxLength = Math.max(maxLength, i - currentPrefixSumMap.get(currentPrefixSum));",
  "        } else {",
  "            /* 7. If the current prefix sum does not exist in the current prefix sum map, add the current prefix ",
  "            *    sum and the current index as key-value pair.",
  "            */",
  "           currentPrefixSumMap.put(currentPrefixSum, i);",
  "        }",
  "    }",
  "        ",
  "    // 8. Return maxLength.",
  "    return maxLength;",
  "",
  "}",
];

type StepKind = "init" | "seed" | "enter" | "ones" | "zeros" | "contains" | "update" | "store" | "return";

type Window = { start: number; end: number };

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
  firstIndex: number | null;
  gap: number | null;
  mapKeys: number[];
  mapIndex: Record<number, number>;
  highlightKey: number | null;
  balanced: boolean | null;
  maxLength: number;
  best: Window | null;
  didUpdate: boolean;
};

function simulate(nums: number[]): Step[] {
  const steps: Step[] = [];
  const map = new Map<number, number>();
  let prefixSum = 0;
  let maxLength = 0;
  let best: Window | null = null;

  const snapshot = () => ({
    mapKeys: [...map.keys()],
    mapIndex: Object.fromEntries(map) as Record<number, number>,
  });

  const push = (
    partial: Omit<Step, "mapKeys" | "mapIndex" | "prefixSum" | "maxLength" | "best"> & {
      prefixSum?: number | null;
      maxLength?: number;
      best?: Window | null;
    },
  ) => {
    steps.push({
      ...partial,
      prefixSum: partial.prefixSum === undefined ? prefixSum : partial.prefixSum,
      maxLength: partial.maxLength ?? maxLength,
      best: partial.best === undefined ? best : partial.best,
      ...snapshot(),
    });
  };

  push({
    kind: "init",
    lines: [3, 4, 5, 6, 7, 8, 9, 10],
    description: "maxLength = 0. currentPrefixSum = 0. currentPrefixSumMap = {}.",
    i: null,
    includedEnd: null,
    focusIndex: null,
    spanStart: null,
    spanEnd: null,
    firstIndex: null,
    gap: null,
    highlightKey: null,
    balanced: null,
    didUpdate: false,
    prefixSum: 0,
    maxLength: 0,
    best: null,
  });

  map.set(0, -1);
  push({
    kind: "seed",
    lines: [12, 13],
    description: "currentPrefixSumMap[0] = -1.",
    i: null,
    includedEnd: null,
    focusIndex: null,
    spanStart: null,
    spanEnd: null,
    firstIndex: -1,
    gap: null,
    highlightKey: 0,
    balanced: null,
    didUpdate: false,
  });

  for (let i = 0; i < nums.length; i++) {
    push({
      kind: "enter",
      lines: [15, 16],
      description: `i = ${i}. nums[${i}] = ${nums[i]}.`,
      i,
      includedEnd: i > 0 ? i - 1 : null,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      firstIndex: null,
      gap: null,
      highlightKey: null,
      balanced: null,
      didUpdate: false,
    });

    const beforeOne = prefixSum;
    const isOne = nums[i] === 1;
    if (isOne) prefixSum++;
    push({
      kind: "ones",
      lines: [17, 18],
      description: isOne
        ? `nums[${i}] == 1. currentPrefixSum = ${beforeOne} + 1 = ${prefixSum}.`
        : `nums[${i}] == 1 is false.`,
      i,
      includedEnd: isOne ? i : i > 0 ? i - 1 : null,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      firstIndex: null,
      gap: null,
      highlightKey: null,
      balanced: null,
      didUpdate: false,
    });

    const beforeZero = prefixSum;
    const isZero = nums[i] === 0;
    if (isZero) prefixSum += -1;
    push({
      kind: "zeros",
      lines: [19, 20],
      description: isZero
        ? `nums[${i}] == 0. currentPrefixSum = ${beforeZero} + -1 = ${prefixSum}.`
        : `nums[${i}] == 0 is false.`,
      i,
      includedEnd: i,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      firstIndex: null,
      gap: null,
      highlightKey: null,
      balanced: null,
      didUpdate: false,
    });

    const seen = map.has(prefixSum);
    const firstIndex = seen ? (map.get(prefixSum) as number) : null;
    push({
      kind: "contains",
      lines: [21, 22],
      description: seen
        ? `currentPrefixSumMap contains ${prefixSum}.`
        : `currentPrefixSumMap does not contain ${prefixSum}.`,
      i,
      includedEnd: i,
      focusIndex: i,
      spanStart: null,
      spanEnd: null,
      firstIndex,
      gap: null,
      highlightKey: seen ? prefixSum : null,
      balanced: null,
      didUpdate: false,
    });

    if (seen && firstIndex !== null) {
      const gap = i - firstIndex;
      const prevMax = maxLength;
      const next = Math.max(prevMax, gap);
      const didUpdate = next > prevMax;
      if (didUpdate) {
        maxLength = next;
        best = { start: firstIndex + 1, end: i };
      }
      push({
        kind: "update",
        lines: [23],
        description: `i - currentPrefixSumMap[${prefixSum}] = ${i} - ${firstIndex} = ${gap}. maxLength = Math.max(${prevMax}, ${gap}) = ${next}.`,
        i,
        includedEnd: i,
        focusIndex: null,
        spanStart: firstIndex + 1,
        spanEnd: i,
        firstIndex,
        gap,
        highlightKey: prefixSum,
        balanced: true,
        didUpdate,
        maxLength: next,
        best,
      });
    } else {
      map.set(prefixSum, i);
      push({
        kind: "store",
        lines: [25, 26, 27, 28],
        description: `currentPrefixSumMap[${prefixSum}] = ${i}.`,
        i,
        includedEnd: i,
        focusIndex: i,
        spanStart: null,
        spanEnd: null,
        firstIndex: i,
        gap: null,
        highlightKey: prefixSum,
        balanced: null,
        didUpdate: false,
      });
    }
  }

  push({
    kind: "return",
    lines: [32, 33],
    description: `Return maxLength = ${maxLength}.`,
    i: null,
    includedEnd: best ? best.end : null,
    focusIndex: null,
    spanStart: best?.start ?? null,
    spanEnd: best?.end ?? null,
    firstIndex: null,
    gap: null,
    highlightKey: null,
    balanced: best ? true : null,
    didUpdate: false,
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
  balanced,
  best,
}: {
  nums: number[];
  i: number | null;
  includedEnd: number | null;
  focusIndex: number | null;
  spanStart: number | null;
  spanEnd: number | null;
  balanced: boolean | null;
  best: Window | null;
}) {
  const cellW = nums.length > 6 ? 28 : 36;
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
              const inBest = best !== null && idx >= best.start && idx <= best.end;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (balanced === true && spanned) {
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
              const outline =
                idx === focusIndex
                  ? "2px solid #d97706"
                  : inBest && !spanned
                    ? "2px solid #10b981"
                    : undefined;
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

function PrefixTable({
  keys,
  indexes,
  highlightKey,
  balanced,
}: {
  keys: number[];
  indexes: Record<number, number>;
  highlightKey: number | null;
  balanced: boolean | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        currentPrefixSumMap
      </div>
      {keys.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
          Empty
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-2 py-1">
            <span className="text-center">prefix</span>
            <span className="text-center">first index</span>
          </div>
          {keys.map((key) => {
            const isHi = key === highlightKey;
            const rowBg = isHi && balanced === true ? "bg-emerald-50/70" : isHi ? "bg-amber-50" : "bg-white";
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
  seed: "Seed prefix 0",
  enter: "Next index",
  ones: "Add 1 for a 1",
  zeros: "Add -1 for a 0",
  contains: "Look up prefix",
  update: "Update maxLength",
  store: "Store first index",
  return: "Return maxLength",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  seed: "text-indigo-600",
  enter: "text-amber-600",
  ones: "text-violet-600",
  zeros: "text-violet-600",
  contains: "text-amber-600",
  update: "text-emerald-600",
  store: "text-indigo-600",
  return: "text-emerald-600",
};

export default function ContiguousArrayPrefixVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const steps = useMemo(() => simulate(preset.nums), [preset]);
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
    const wait = cur?.kind === "return" || cur?.didUpdate ? 900 : cur?.kind === "update" ? 750 : 480;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind, cur?.didUpdate]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const windowText =
    cur?.spanStart != null && cur.spanEnd != null
      ? preset.nums.slice(cur.spanStart, cur.spanEnd + 1).join(", ")
      : "";
  const bestText = cur?.best ? preset.nums.slice(cur.best.start, cur.best.end + 1).join(", ") : "";
  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kindColor =
    cur?.kind === "ones" && cur.description.includes("is false")
      ? "text-rose-500"
      : cur?.kind === "zeros" && cur.description.includes("is false")
        ? "text-rose-500"
        : cur?.kind === "contains" && cur.highlightKey == null
          ? "text-rose-500"
          : cur?.kind === "update" && !cur.didUpdate
            ? "text-gray-500"
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
          <ArrayDisplay
            nums={preset.nums}
            i={cur?.i ?? null}
            includedEnd={cur?.includedEnd ?? null}
            focusIndex={cur?.focusIndex ?? null}
            spanStart={cur?.spanStart ?? null}
            spanEnd={cur?.spanEnd ?? null}
            balanced={cur?.balanced ?? null}
            best={cur?.kind === "return" ? null : (cur?.best ?? null)}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Balanced subarray
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  cur?.balanced === true ? "text-emerald-600" : "text-gray-300"
                }`}
              >
                {cur?.balanced === true ? "equal 0s and 1s" : "—"}
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
              <span className="font-semibold text-gray-500">first index</span>
              <span className="font-semibold text-gray-700"> = {cur?.firstIndex ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">i − first</span>
              <span className="font-semibold text-gray-700"> = {cur?.gap ?? "—"}</span>
            </div>
          </div>

          <PrefixTable
            keys={cur?.mapKeys ?? []}
            indexes={cur?.mapIndex ?? {}}
            highlightKey={cur?.highlightKey ?? null}
            balanced={cur?.kind === "update" ? true : null}
          />

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              cur?.kind === "return"
                ? "border border-emerald-300 bg-emerald-50"
                : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">maxLength</div>
            <div className={`mt-0.5 font-mono text-sm font-bold ${cur ? "text-gray-800" : "text-gray-300"}`}>
              {cur ? cur.maxLength : "—"}
            </div>
            <div className="mt-0.5 font-mono text-[12px] text-gray-600 truncate">
              {bestText ? `[${bestText}]` : "No balanced subarray yet"}
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
