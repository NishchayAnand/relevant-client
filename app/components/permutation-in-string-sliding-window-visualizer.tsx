"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  s1: string;
  s2: string;
};

const PRESETS: Preset[] = [
  { id: "example1", label: 's1 = "ab" · s2 = "eidbaooo"', s1: "ab", s2: "eidbaooo" },
  { id: "example2", label: 's1 = "ab" · s2 = "eidboaoo"', s1: "ab", s2: "eidboaoo" },
];

const ALGORITHM_LINES = [
  "public boolean checkInclusion(String s1, String s2) {",
  "",
  "    // 1. Create a frequency map for s1.",
  "    Map<Character, Integer> targetFrequencyMap = new HashMap<>();",
  "    for(char ch : s1.toCharArray()) {",
  "        int frequency = targetFrequencyMap.getOrDefault(ch, 0) + 1;",
  "        targetFrequencyMap.put(ch, frequency);",
  "    }",
  "",
  "    // 2. Initialize two pointers: left and right to represent the boundaries of current window.",
  "    int left = 0, right = 0; ",
  "",
  "    // 3. Initialize a frequency map to track the frequencies of the current window.",
  "    Map<Character, Integer> currentSubstringFrequencyMap = new HashMap<>();",
  "",
  "    // 4. Expand current window one character at a time.",
  "    for ( ; right < s2.length(); right++) {",
  "",
  "        // 5. Add s2[right] to the current window.",
  "        char newCh = s2.charAt(right);",
  "        int frequency = currentSubstringFrequencyMap.getOrDefault(newCh, 0) + 1;",
  "        currentSubstringFrequencyMap.put(newCh, frequency);",
  "",
  "        // 6. If length of current window exceeds s1.length(), remove s2[left] from the current window.",
  "        int currentWindowLength = right - left + 1;",
  "        if (currentWindowLength > s1.length()) {",
  "            char removeCh = s2.charAt(left);",
  "            frequency = currentSubstringFrequencyMap.get(removeCh) - 1;",
  "            if(frequency == 0) {",
  "                currentSubstringFrequencyMap.remove(removeCh);",
  "            } else {",
  "                currentSubstringFrequencyMap.put(removeCh, frequency);",
  "            }",
  "            left++;",
  "        }",
  "",
  "        // 7. Check if the current window frequency map matches the target frequency map.",
  "        if (currentSubstringFrequencyMap.equals(targetFrequencyMap)) {",
  "            return true;",
  "        }",
  "    }",
  "",
  "    // 8. If no eligible substring is found, return false",
  "    return false;",
  "",
  "}",
];

type StepKind =
  | "build"
  | "init_ptrs"
  | "init_map"
  | "enter"
  | "add"
  | "length"
  | "shrink_read"
  | "shrink_zero"
  | "shrink_dec"
  | "move_left"
  | "check"
  | "found"
  | "advance"
  | "exit"
  | "miss";

type FreqMap = Record<string, number>;

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  left: number | null;
  right: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  leavingIndex: number | null;
  windowLengthVar: number | null;
  target: FreqMap;
  targetKeys: string[];
  current: FreqMap;
  currentKeys: string[];
  highlightKey: string | null;
  judged: boolean;
  result: boolean | null;
};

function cloneFreq(m: Map<string, number>): FreqMap {
  const out: FreqMap = {};
  m.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function sameMaps(target: Map<string, number>, current: Map<string, number>): boolean {
  if (target.size !== current.size) return false;
  for (const [key, count] of target) {
    if (current.get(key) !== count) return false;
  }
  return true;
}

function simulate(s1: string, s2: string): Step[] {
  const steps: Step[] = [];
  const target = new Map<string, number>();
  const targetKeys: string[] = [];
  const current = new Map<string, number>();
  const currentKeys: string[] = [];

  const push = (partial: Omit<Step, "target" | "targetKeys" | "current" | "currentKeys">) => {
    steps.push({
      ...partial,
      target: cloneFreq(target),
      targetKeys: [...targetKeys],
      current: cloneFreq(current),
      currentKeys: [...currentKeys],
    });
  };

  const remember = (ch: string) => {
    if (!currentKeys.includes(ch)) currentKeys.push(ch);
  };

  const forget = (ch: string) => {
    const index = currentKeys.indexOf(ch);
    if (index !== -1) currentKeys.splice(index, 1);
  };

  for (const ch of s1) {
    const next = (target.get(ch) ?? 0) + 1;
    target.set(ch, next);
    if (!targetKeys.includes(ch)) targetKeys.push(ch);
    push({
      kind: "build",
      lines: steps.length === 0 ? [3, 4, 5, 6, 7] : [5, 6, 7],
      description: `Count '${ch}' from s1. targetFrequencyMap['${ch}'] = ${next}.`,
      left: null,
      right: null,
      winStart: null,
      winEnd: null,
      focusIndex: null,
      leavingIndex: null,
      windowLengthVar: null,
      highlightKey: ch,
      judged: false,
      result: null,
    });
  }

  let left = 0;
  let right = 0;
  push({
    kind: "init_ptrs",
    lines: [10, 11],
    description: "left = 0, right = 0.",
    left,
    right,
    winStart: null,
    winEnd: null,
    focusIndex: s2.length > 0 ? 0 : null,
    leavingIndex: null,
    windowLengthVar: null,
    highlightKey: null,
    judged: false,
    result: null,
  });
  push({
    kind: "init_map",
    lines: [13, 14],
    description: "currentSubstringFrequencyMap = {}.",
    left,
    right,
    winStart: null,
    winEnd: null,
    focusIndex: s2.length > 0 ? 0 : null,
    leavingIndex: null,
    windowLengthVar: null,
    highlightKey: null,
    judged: false,
    result: null,
  });

  while (right < s2.length) {
    const pendingEnd = right === 0 && current.size === 0 ? null : right - 1;
    push({
      kind: "enter",
      lines: [16, 17],
      description: `right = ${right} < s2.length() (${s2.length}). Next character is s2[${right}] = '${s2[right]}'.`,
      left,
      right,
      winStart: pendingEnd !== null && pendingEnd >= left ? left : null,
      winEnd: pendingEnd !== null && pendingEnd >= left ? pendingEnd : null,
      focusIndex: right,
      leavingIndex: null,
      windowLengthVar: null,
      highlightKey: null,
      judged: false,
      result: null,
    });

    const newCh = s2[right];
    const added = (current.get(newCh) ?? 0) + 1;
    current.set(newCh, added);
    remember(newCh);
    push({
      kind: "add",
      lines: [19, 20, 21, 22],
      description: `newCh = '${newCh}'. currentSubstringFrequencyMap['${newCh}'] = ${added}.`,
      left,
      right,
      winStart: left,
      winEnd: right,
      focusIndex: right,
      leavingIndex: null,
      windowLengthVar: null,
      highlightKey: newCh,
      judged: false,
      result: null,
    });

    const windowLength = right - left + 1;
    const tooLong = windowLength > s1.length;
    push({
      kind: "length",
      lines: [24, 25, 26],
      description: tooLong
        ? `currentWindowLength = ${right} - ${left} + 1 = ${windowLength}. ${windowLength} > s1.length() (${s1.length}). Remove s2[${left}].`
        : `currentWindowLength = ${right} - ${left} + 1 = ${windowLength}. ${windowLength} > s1.length() (${s1.length}) is false.`,
      left,
      right,
      winStart: left,
      winEnd: right,
      focusIndex: tooLong ? left : null,
      leavingIndex: null,
      windowLengthVar: windowLength,
      highlightKey: null,
      judged: false,
      result: null,
    });

    if (tooLong) {
      const removeCh = s2[left];
      const nextCount = (current.get(removeCh) ?? 0) - 1;
      const leaving = left;
      push({
        kind: "shrink_read",
        lines: [27, 28],
        description: `removeCh = s2[${left}] = '${removeCh}'. frequency = ${nextCount + 1} - 1 = ${nextCount}.`,
        left,
        right,
        winStart: left,
        winEnd: right,
        focusIndex: left,
        leavingIndex: leaving,
        windowLengthVar: windowLength,
        highlightKey: removeCh,
        judged: false,
        result: null,
      });

      if (nextCount === 0) {
        current.delete(removeCh);
        forget(removeCh);
        push({
          kind: "shrink_zero",
          lines: [29, 30],
          description: `frequency == 0, so remove '${removeCh}' from currentSubstringFrequencyMap.`,
          left,
          right,
          winStart: left,
          winEnd: right,
          focusIndex: left,
          leavingIndex: leaving,
          windowLengthVar: windowLength,
          highlightKey: removeCh,
          judged: false,
          result: null,
        });
      } else {
        current.set(removeCh, nextCount);
        push({
          kind: "shrink_dec",
          lines: [29, 31, 32],
          description: `frequency = ${nextCount}, so currentSubstringFrequencyMap['${removeCh}'] = ${nextCount}.`,
          left,
          right,
          winStart: left,
          winEnd: right,
          focusIndex: left,
          leavingIndex: leaving,
          windowLengthVar: windowLength,
          highlightKey: removeCh,
          judged: false,
          result: null,
        });
      }

      left++;
      push({
        kind: "move_left",
        lines: [34],
        description: `left = ${left}.`,
        left,
        right,
        winStart: left,
        winEnd: right,
        focusIndex: left,
        leavingIndex: null,
        windowLengthVar: windowLength,
        highlightKey: null,
        judged: false,
        result: null,
      });
    }

    const equal = sameMaps(target, current);
    const text = s2.slice(left, right + 1);
    if (equal) {
      push({
        kind: "found",
        lines: [37, 38, 39],
        description: `"${text}" matches targetFrequencyMap. Return true.`,
        left,
        right,
        winStart: left,
        winEnd: right,
        focusIndex: null,
        leavingIndex: null,
        windowLengthVar: windowLength,
        highlightKey: null,
        judged: true,
        result: true,
      });
      return steps;
    }

    push({
      kind: "check",
      lines: [37, 38],
      description: `"${text}" does not match targetFrequencyMap.`,
      left,
      right,
      winStart: left,
      winEnd: right,
      focusIndex: null,
      leavingIndex: null,
      windowLengthVar: windowLength,
      highlightKey: null,
      judged: true,
      result: null,
    });

    const consumed = right;
    right++;
    push({
      kind: "advance",
      lines: [17],
      description:
        right < s2.length
          ? `right = ${right}. s2[${right}] is not in the window yet.`
          : `right = ${right}.`,
      left,
      right,
      winStart: left,
      winEnd: consumed,
      focusIndex: right < s2.length ? right : null,
      leavingIndex: null,
      windowLengthVar: null,
      highlightKey: null,
      judged: false,
      result: null,
    });
  }

  push({
    kind: "exit",
    lines: [17],
    description: `right = ${right}, and ${right} < s2.length() (${s2.length}) is false. The loop ends.`,
    left,
    right,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    leavingIndex: null,
    windowLengthVar: null,
    highlightKey: null,
    judged: false,
    result: null,
  });
  push({
    kind: "miss",
    lines: [43, 44],
    description: "No window matched targetFrequencyMap. Return false.",
    left,
    right,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    leavingIndex: null,
    windowLengthVar: null,
    highlightKey: null,
    judged: false,
    result: false,
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

function StringDisplay({
  text,
  left,
  right,
  winStart,
  winEnd,
  focusIndex,
  leavingIndex,
  matched,
}: {
  text: string;
  left: number | null;
  right: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  leavingIndex: number | null;
  matched: boolean | null;
}) {
  const cellW = 32;
  const gap = 4;
  const inWindow = (idx: number) =>
    winStart !== null && winEnd !== null && idx >= winStart && idx <= winEnd;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">s2</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {text.split("").map((_, idx) => (
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
                  color: idx === right ? "#7c3aed" : "transparent",
                }}
              >
                right
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {text.split("").map((ch, idx) => {
              const windowed = inWindow(idx);
              const pending = idx === right && !windowed;
              const leaving = idx === leavingIndex;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (leaving) {
                bg = "#fff1f2";
                border = "#fb7185";
                color = "#9f1239";
              } else if (matched === true && windowed) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (matched === false && windowed) {
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
                    fontSize: 15,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
          <div className="flex" style={{ gap }}>
            {text.split("").map((_, idx) => (
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
                  color: idx === left ? "#d97706" : "transparent",
                }}
              >
                left
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {text.split("").map((_, idx) => (
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

function FreqCompare({
  targetKeys,
  target,
  currentKeys,
  current,
  highlightKey,
  showCurrent,
  judged,
}: {
  targetKeys: string[];
  target: FreqMap;
  currentKeys: string[];
  current: FreqMap;
  highlightKey: string | null;
  showCurrent: boolean;
  judged: boolean;
}) {
  const keys = [...targetKeys];
  for (const key of currentKeys) {
    if (!keys.includes(key)) keys.push(key);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        target vs current
      </div>
      {keys.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
          Empty
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1.4rem_1fr_1fr_2.2rem] bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-2 py-1">
            <span></span>
            <span className="text-center">target</span>
            <span className="text-center">current</span>
            <span className="text-center">ok?</span>
          </div>
          {keys.map((ch) => {
            const need = target[ch] ?? 0;
            const have = showCurrent ? (current[ch] ?? 0) : null;
            const extra = showCurrent && need === 0 && (current[ch] ?? 0) > 0;
            const bad = judged && have !== null && (have !== need || extra);
            const rowOk = judged && have !== null && have === need && need > 0 && !extra;
            const isHi = ch === highlightKey;
            const rowBg = bad
              ? "bg-rose-50"
              : rowOk
                ? "bg-emerald-50/70"
                : isHi
                  ? "bg-amber-50"
                  : "bg-white";
            return (
              <div
                key={ch}
                className={`grid grid-cols-[1.4rem_1fr_1fr_2.2rem] items-center px-2 py-1 font-mono text-[12px] border-t border-gray-100 ${rowBg}`}
              >
                <span className="font-bold text-gray-800">{ch}</span>
                <span className="text-center text-gray-700">{need === 0 ? "—" : need}</span>
                <span
                  className={`text-center font-semibold ${
                    have === null ? "text-gray-300" : bad ? "text-rose-600" : "text-gray-700"
                  }`}
                >
                  {have === null ? "—" : have}
                </span>
                <span
                  className={`text-center text-[10px] font-semibold ${
                    !judged || have === null ? "text-gray-300" : rowOk ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {!judged || have === null ? "—" : rowOk ? "yes" : "no"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  build: "Build targetFrequencyMap",
  init_ptrs: "Initialize pointers",
  init_map: "Initialize current map",
  enter: "Expand window",
  add: "Add s2[right]",
  length: "Check window length",
  shrink_read: "Read s2[left]",
  shrink_zero: "Remove character",
  shrink_dec: "Decrease frequency",
  move_left: "Move left",
  check: "Compare maps",
  found: "Return true",
  advance: "Move right",
  exit: "Loop ends",
  miss: "Return false",
};

const KIND_COLOR: Record<StepKind, string> = {
  build: "text-indigo-600",
  init_ptrs: "text-sky-600",
  init_map: "text-sky-600",
  enter: "text-violet-600",
  add: "text-violet-600",
  length: "text-amber-600",
  shrink_read: "text-rose-500",
  shrink_zero: "text-rose-500",
  shrink_dec: "text-rose-500",
  move_left: "text-amber-600",
  check: "text-rose-500",
  found: "text-emerald-600",
  advance: "text-violet-600",
  exit: "text-gray-500",
  miss: "text-rose-500",
};

export default function PermutationInStringSlidingWindowVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const steps = useMemo(() => simulate(preset.s1, preset.s2), [preset]);
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
      cur?.kind === "found" || cur?.kind === "miss"
        ? 1100
        : cur?.kind === "check" || cur?.kind === "shrink_zero" || cur?.kind === "shrink_dec"
          ? 750
          : 560;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const matched = cur?.kind === "found" ? true : cur?.kind === "check" ? false : null;
  const windowText =
    cur?.winStart != null && cur.winEnd != null
      ? preset.s2.slice(cur.winStart, cur.winEnd + 1)
      : "";
  const result = cur?.result ?? null;
  const showCurrent = cur !== null && cur.kind !== "build";
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">s1</span>
            <div className="flex gap-1">
              {preset.s1.split("").map((ch, idx) => (
                <div
                  key={`${ch}-${idx}`}
                  className={`h-7 min-w-7 px-1.5 rounded-md border font-mono text-xs font-bold flex items-center justify-center ${
                    cur?.kind === "build" && ch === cur.highlightKey
                      ? "bg-amber-100 border-amber-400 text-amber-900"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  {ch}
                </div>
              ))}
            </div>
          </div>

          <StringDisplay
            text={preset.s2}
            left={cur?.left ?? null}
            right={cur?.right != null && cur.right < preset.s2.length ? cur.right : null}
            winStart={cur?.winStart ?? null}
            winEnd={cur?.winEnd ?? null}
            focusIndex={cur?.focusIndex ?? null}
            leavingIndex={cur?.leavingIndex ?? null}
            matched={matched}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current window
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  matched === true ? "text-emerald-600" : matched === false ? "text-rose-500" : "text-gray-300"
                }`}
              >
                {matched === true ? "match" : matched === false ? "no match" : "—"}
              </span>
            </div>
            <div className="mt-0.5 font-bold truncate text-gray-800">
              {windowText ? `"${windowText}"` : "s2[left..right]"}
            </div>
          </div>

          <FreqCompare
            targetKeys={cur?.targetKeys ?? []}
            target={cur?.target ?? {}}
            currentKeys={cur?.currentKeys ?? []}
            current={cur?.current ?? {}}
            highlightKey={cur?.highlightKey ?? null}
            showCurrent={showCurrent}
            judged={cur?.judged ?? false}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-amber-600">left</span>
              <span className="font-semibold text-gray-700"> = {cur?.left ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">right</span>
              <span className="font-semibold text-gray-700"> = {cur?.right ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">currentWindowLength</span>
              <span className="font-semibold text-gray-700"> = {cur?.windowLengthVar ?? "—"}</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              result === true
                ? "border border-emerald-300 bg-emerald-50"
                : result === false
                  ? "border border-rose-200 bg-rose-50"
                  : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
              checkInclusion
            </div>
            <div
              className={`mt-0.5 font-mono text-sm font-bold ${
                result === true ? "text-emerald-800" : result === false ? "text-rose-700" : "text-gray-300"
              }`}
            >
              {result === null ? "—" : String(result)}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-2.5 min-h-[4.25rem]">
        <div
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            cur ? KIND_COLOR[cur.kind] : "text-gray-400"
          }`}
        >
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
