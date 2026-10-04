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
  "    // 1. Initialize a variable to track the length of the longest subarray with equal number of 0 and 1.",
  "    int maxLength = 0;",
  "",
  "    // 2. Iterate over each index in \"nums\", treating it as the starting index of the current subarray.",
  "    for (int i = 0; i < nums.length; i++) {",
  "",
  "        /* 3. Initialize:",
  "         *   a. A variable to track the number of 0s in the current subarray.",
  "         *   b. A variable to track the number of 1s in the current subarray.",
  "         */",
  "        int currentSubarrayZeroCount = 0;",
  "        int currentSubarrayOneCount = 0;",
  "",
  "        // 4. For each starting index, expand the current subarray one element at a time.",
  "        for (int j = i; j < nums.length; j++) {",
  "",
  "            // 5. If current element is 0, increment the current subarray 0 Count.",
  "            if (nums[j] == 0) {",
  "                currentSubarrayZeroCount++;",
  "            }",
  "            // 6. If current element is 1, increment the current subarray 1 count.",
  "            if (nums[j] == 1) {",
  "                currentSubarrayOneCount++;",
  "            }",
  "            // 7. If count of 0s equal to the count of 1s in the current subarray, update the max length if necessary.",
  "            if (currentSubarrayZeroCount == currentSubarrayOneCount) {",
  "                maxLength = Math.max(maxLength, j - i + 1);",
  "            }",
  "",
  "        }",
  "",
  "    }",
  "        ",
  "    // 8. Return \"maxLength\".",
  "    return maxLength;",
  "",
  "}",
];

type StepKind =
  | "init"
  | "outer"
  | "reset"
  | "expand"
  | "check_zero"
  | "inc_zero"
  | "check_one"
  | "inc_one"
  | "check_balance"
  | "update"
  | "return";

type Window = { start: number; end: number };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  zeros: number | null;
  ones: number | null;
  balanced: boolean | null;
  maxLength: number;
  best: Window | null;
  didUpdate: boolean;
};

function simulate(nums: number[]): Step[] {
  const steps: Step[] = [];
  let maxLength = 0;
  let best: Window | null = null;

  const push = (partial: Omit<Step, "maxLength" | "best"> & { maxLength?: number; best?: Window | null }) => {
    steps.push({
      ...partial,
      maxLength: partial.maxLength ?? maxLength,
      best: partial.best === undefined ? best : partial.best,
    });
  };

  push({
    kind: "init",
    lines: [3, 4],
    description: "maxLength = 0.",
    i: null,
    j: null,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    zeros: null,
    ones: null,
    balanced: null,
    didUpdate: false,
    maxLength: 0,
    best: null,
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
      zeros: null,
      ones: null,
      balanced: null,
      didUpdate: false,
    });

    let zeros = 0;
    let ones = 0;
    push({
      kind: "reset",
      lines: [9, 10, 11, 12, 13, 14],
      description: "currentSubarrayZeroCount = 0. currentSubarrayOneCount = 0.",
      i,
      j: null,
      winStart: null,
      winEnd: null,
      focusIndex: i,
      zeros: 0,
      ones: 0,
      balanced: null,
      didUpdate: false,
    });

    for (let j = i; j < nums.length; j++) {
      const includedEnd = j > i ? j - 1 : null;
      push({
        kind: "expand",
        lines: [16, 17],
        description: `j = ${j}. Next element is nums[${j}] = ${nums[j]}.`,
        i,
        j,
        winStart: includedEnd === null ? null : i,
        winEnd: includedEnd,
        focusIndex: j,
        zeros,
        ones,
        balanced: null,
        didUpdate: false,
      });

      const isZero = nums[j] === 0;
      push({
        kind: "check_zero",
        lines: [19, 20],
        description: isZero ? `nums[${j}] == 0.` : `nums[${j}] == 0 is false.`,
        i,
        j,
        winStart: i,
        winEnd: j,
        focusIndex: j,
        zeros,
        ones,
        balanced: null,
        didUpdate: false,
      });

      if (isZero) {
        zeros++;
        push({
          kind: "inc_zero",
          lines: [21],
          description: `currentSubarrayZeroCount = ${zeros}.`,
          i,
          j,
          winStart: i,
          winEnd: j,
          focusIndex: j,
          zeros,
          ones,
          balanced: null,
          didUpdate: false,
        });
      }

      const isOne = nums[j] === 1;
      push({
        kind: "check_one",
        lines: [23, 24],
        description: isOne ? `nums[${j}] == 1.` : `nums[${j}] == 1 is false.`,
        i,
        j,
        winStart: i,
        winEnd: j,
        focusIndex: j,
        zeros,
        ones,
        balanced: null,
        didUpdate: false,
      });

      if (isOne) {
        ones++;
        push({
          kind: "inc_one",
          lines: [25],
          description: `currentSubarrayOneCount = ${ones}.`,
          i,
          j,
          winStart: i,
          winEnd: j,
          focusIndex: j,
          zeros,
          ones,
          balanced: null,
          didUpdate: false,
        });
      }

      const balanced = zeros === ones;
      push({
        kind: "check_balance",
        lines: [27, 28],
        description: balanced
          ? `currentSubarrayZeroCount = ${zeros} and currentSubarrayOneCount = ${ones}.`
          : `currentSubarrayZeroCount = ${zeros} and currentSubarrayOneCount = ${ones}. ${zeros} == ${ones} is false.`,
        i,
        j,
        winStart: i,
        winEnd: j,
        focusIndex: null,
        zeros,
        ones,
        balanced,
        didUpdate: false,
      });

      if (balanced) {
        const length = j - i + 1;
        const prevMax = maxLength;
        const next = Math.max(prevMax, length);
        const didUpdate = next > prevMax;
        if (didUpdate) {
          maxLength = next;
          best = { start: i, end: j };
        }
        push({
          kind: "update",
          lines: [29],
          description: `maxLength = Math.max(${prevMax}, ${length}) = ${next}.`,
          i,
          j,
          winStart: i,
          winEnd: j,
          focusIndex: null,
          zeros,
          ones,
          balanced: true,
          didUpdate,
          maxLength: next,
          best,
        });
      }
    }
  }

  push({
    kind: "return",
    lines: [36, 37],
    description: `Return maxLength = ${maxLength}.`,
    i: null,
    j: null,
    winStart: best?.start ?? null,
    winEnd: best?.end ?? null,
    focusIndex: null,
    zeros: null,
    ones: null,
    balanced: best ? true : null,
    didUpdate: false,
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
  j,
  winStart,
  winEnd,
  focusIndex,
  balanced,
  best,
}: {
  nums: number[];
  i: number | null;
  j: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  balanced: boolean | null;
  best: Window | null;
}) {
  const cellW = nums.length > 6 ? 28 : 36;
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
              const inBest = best !== null && idx >= best.start && idx <= best.end;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (balanced === true && windowed) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (balanced === false && windowed) {
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
              const outline =
                idx === focusIndex
                  ? "2px solid #d97706"
                  : inBest && !windowed
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

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize maxLength",
  outer: "Next start",
  reset: "Reset counts",
  expand: "Expand subarray",
  check_zero: "Check for 0",
  inc_zero: "Count a 0",
  check_one: "Check for 1",
  inc_one: "Count a 1",
  check_balance: "Compare counts",
  update: "Update maxLength",
  return: "Return maxLength",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  outer: "text-amber-600",
  reset: "text-sky-600",
  expand: "text-violet-600",
  check_zero: "text-amber-600",
  inc_zero: "text-violet-600",
  check_one: "text-amber-600",
  inc_one: "text-violet-600",
  check_balance: "text-rose-500",
  update: "text-emerald-600",
  return: "text-emerald-600",
};

export default function ContiguousArrayBruteVisualizer() {
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
    const wait =
      cur?.kind === "return" || cur?.didUpdate ? 900 : cur?.kind === "check_balance" ? 640 : 460;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind, cur?.didUpdate]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const windowText =
    cur?.winStart != null && cur.winEnd != null
      ? preset.nums.slice(cur.winStart, cur.winEnd + 1).join(", ")
      : "";
  const bestText = cur?.best ? preset.nums.slice(cur.best.start, cur.best.end + 1).join(", ") : "";
  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kindColor =
    cur?.kind === "check_balance" && cur.balanced === true
      ? "text-emerald-600"
      : cur?.kind === "check_zero" && cur.description.includes("is false")
        ? "text-rose-500"
        : cur?.kind === "check_one" && cur.description.includes("is false")
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
            j={cur?.j ?? null}
            winStart={cur?.winStart ?? null}
            winEnd={cur?.winEnd ?? null}
            focusIndex={cur?.focusIndex ?? null}
            balanced={cur?.balanced ?? null}
            best={cur?.kind === "return" ? null : (cur?.best ?? null)}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current subarray
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  cur?.balanced === true
                    ? "text-emerald-600"
                    : cur?.balanced === false
                      ? "text-rose-500"
                      : "text-gray-300"
                }`}
              >
                {cur?.balanced === true ? "equal" : cur?.balanced === false ? "unequal" : "—"}
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
              <span className="font-semibold text-gray-500">zeros</span>
              <span className="font-semibold text-gray-700"> = {cur?.zeros ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">ones</span>
              <span className="font-semibold text-gray-700"> = {cur?.ones ?? "—"}</span>
            </div>
          </div>

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
