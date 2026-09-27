"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  s: string;
  k: number;
};

const PRESETS: Preset[] = [
  { id: "example1", label: 's = "ABAB" · k = 2', s: "ABAB", k: 2 },
  { id: "example2", label: 's = "AABABBA" · k = 1', s: "AABABBA", k: 1 },
];

const ALGORITHM_LINES = [
  "public int characterReplacement(String s, int k) {",
  "",
  "   // 1. Initialize",
  "   int longestSubstringLength = 0;",
  "   int mostFrequentCharacterFrequency = 0;",
  "   int left = 0, right = 0;",
  "",
  "   Map<Character, Integer> frequencyMap = new HashMap<>();",
  "",
  "   // 2. Expand \"right\" one character at a time",
  "   while (right < s.length()) {",
  "",
  "      // a. Update the frequency of the newly added character",
  "      char newCh = s.charAt(right);",
  "",
  "      int currentCharacterUpdatedFrequency =",
  "               frequencyMap.getOrDefault(newCh, 0) + 1;",
  "",
  "      frequencyMap.put(newCh, currentCharacterUpdatedFrequency);",
  "",
  "      // b. Update the frequency of the most frequent character",
  "      mostFrequentCharacterFrequency =",
  "               Math.max(",
  "                  mostFrequentCharacterFrequency,",
  "                  currentCharacterUpdatedFrequency",
  "               );",
  "",
  "      // c. While the current window is ineligible, shrink it",
  "      while (right - left + 1 - mostFrequentCharacterFrequency > k) {",
  "",
  "         char oldCh = s.charAt(left);",
  "",
  "         // i. Decrease the frequency of the character",
  "         //    removed from the window.",
  "         frequencyMap.put(oldCh, frequencyMap.get(oldCh) - 1);",
  "",
  "         // ii. Move the left pointer forward.",
  "         left++;",
  "      }",
  "",
  "      // d. The current window is now eligible.",
  "      //    Update the longest eligible substring.",
  "      longestSubstringLength =",
  "               Math.max(",
  "                  longestSubstringLength,",
  "                  right - left + 1",
  "               );",
  "",
  "      // Move right to expand the window.",
  "      right++;",
  "   }",
  "",
  "   // 3. Return the length of the longest eligible substring.",
  "   return longestSubstringLength;",
  "   ",
  "}",
];

type StepKind =
  | "init"
  | "count"
  | "max_freq"
  | "check"
  | "decrement"
  | "move_left"
  | "update"
  | "advance"
  | "return";

type FreqMap = Record<string, number>;

type BestWindow = {
  start: number;
  end: number;
  most: number;
  freq: FreqMap;
  freqKeys: string[];
};

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  left: number | null;
  right: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  freq: FreqMap;
  freqKeys: string[];
  highlightKey: string | null;
  mostFreq: number;
  windowLength: number | null;
  replacements: number | null;
  eligible: boolean | null;
  longest: number;
  best: BestWindow | null;
  didUpdate: boolean;
};

function cloneFreq(m: Map<string, number>): FreqMap {
  const out: FreqMap = {};
  m.forEach((v, key) => {
    out[key] = v;
  });
  return out;
}

function simulate(s: string, k: number): Step[] {
  const steps: Step[] = [];
  const freq = new Map<string, number>();
  const freqKeys: string[] = [];
  let most = 0;
  let longest = 0;
  let left = 0;
  let right = 0;
  let best: BestWindow | null = null;

  const push = (
    partial: Omit<Step, "freq" | "freqKeys" | "mostFreq" | "longest" | "best"> & {
      freq?: Map<string, number>;
      freqKeys?: string[];
      mostFreq?: number;
      longest?: number;
      best?: BestWindow | null;
    },
  ) => {
    steps.push({
      ...partial,
      freq: cloneFreq(partial.freq ?? freq),
      freqKeys: [...(partial.freqKeys ?? freqKeys)],
      mostFreq: partial.mostFreq ?? most,
      longest: partial.longest ?? longest,
      best: partial.best === undefined ? best : partial.best,
    });
  };

  push({
    kind: "init",
    lines: [3, 4, 5, 6, 8],
    description:
      "longestSubstringLength = 0, mostFrequentCharacterFrequency = 0, left = 0, right = 0, frequencyMap = {}.",
    left: 0,
    right: 0,
    winStart: null,
    winEnd: null,
    focusIndex: 0,
    highlightKey: null,
    windowLength: null,
    replacements: null,
    eligible: null,
    didUpdate: false,
    mostFreq: 0,
    longest: 0,
    best: null,
  });

  while (right < s.length) {
    const newCh = s[right];
    const nextCount = (freq.get(newCh) ?? 0) + 1;
    freq.set(newCh, nextCount);
    if (!freqKeys.includes(newCh)) freqKeys.push(newCh);
    const winStart = left;
    const winEnd = right;
    const winLength = winEnd - winStart + 1;

    push({
      kind: "count",
      lines: [10, 11, 13, 14, 16, 17, 19],
      description: `right = ${right}, newCh = '${newCh}'. frequencyMap['${newCh}'] = ${nextCount}.`,
      left,
      right,
      winStart,
      winEnd,
      focusIndex: right,
      highlightKey: newCh,
      windowLength: winLength,
      replacements: null,
      eligible: null,
      didUpdate: false,
    });

    const prevMost = most;
    most = Math.max(most, nextCount);
    push({
      kind: "max_freq",
      lines: [21, 22, 23, 24, 25, 26],
      description:
        most > prevMost
          ? `mostFrequentCharacterFrequency = max(${prevMost}, ${nextCount}) = ${most}.`
          : `mostFrequentCharacterFrequency = max(${prevMost}, ${nextCount}) = ${most}. The most frequent count does not change.`,
      left,
      right,
      winStart,
      winEnd,
      focusIndex: right,
      highlightKey: newCh,
      windowLength: winLength,
      replacements: null,
      eligible: null,
      didUpdate: false,
    });

    while (true) {
      const len = right - left + 1;
      const repl = len - most;
      const ineligible = repl > k;
      const text = s.slice(left, right + 1);
      push({
        kind: "check",
        lines: [28, 29],
        description: ineligible
          ? `right - left + 1 - mostFrequentCharacterFrequency = ${len} - ${most} = ${repl}, and ${repl} > k (${k}). "${text}" is ineligible. Shrink from the left.`
          : `right - left + 1 - mostFrequentCharacterFrequency = ${len} - ${most} = ${repl}, and ${repl} > k (${k}) is false. "${text}" stays.`,
        left,
        right,
        winStart: left,
        winEnd: right,
        focusIndex: ineligible ? left : null,
        highlightKey: null,
        windowLength: len,
        replacements: repl,
        eligible: !ineligible,
        didUpdate: false,
      });
      if (!ineligible) break;

      const oldCh = s[left];
      const decreased = (freq.get(oldCh) ?? 0) - 1;
      freq.set(oldCh, decreased);
      push({
        kind: "decrement",
        lines: [31, 33, 34, 35],
        description: `oldCh = '${oldCh}'. frequencyMap['${oldCh}'] = ${decreased}. mostFrequentCharacterFrequency stays ${most}.`,
        left,
        right,
        winStart: left,
        winEnd: right,
        focusIndex: left,
        highlightKey: oldCh,
        windowLength: len,
        replacements: null,
        eligible: null,
        didUpdate: false,
      });

      const removed = left;
      left += 1;
      push({
        kind: "move_left",
        lines: [37, 38],
        description: `left++ → left = ${left}. '${s[removed]}' has left the window.`,
        left,
        right,
        winStart: left <= right ? left : null,
        winEnd: left <= right ? right : null,
        focusIndex: removed,
        highlightKey: oldCh,
        windowLength: left <= right ? right - left + 1 : null,
        replacements: null,
        eligible: null,
        didUpdate: false,
      });
    }

    const len = right - left + 1;
    const repl = len - most;
    const prevLongest = longest;
    const willUpdate = len > longest;
    if (willUpdate) {
      longest = len;
      best = {
        start: left,
        end: right,
        most,
        freq: cloneFreq(freq),
        freqKeys: [...freqKeys],
      };
    }
    const text = s.slice(left, right + 1);
    push({
      kind: "update",
      lines: [41, 42, 43, 44, 45, 46],
      description: willUpdate
        ? `"${text}" is eligible and has length ${len}, which is longer than ${prevLongest}. longestSubstringLength = ${len}.`
        : `"${text}" is eligible and has length ${len}. longestSubstringLength = max(${prevLongest}, ${len}) = ${prevLongest}.`,
      left,
      right,
      winStart: left,
      winEnd: right,
      focusIndex: null,
      highlightKey: null,
      windowLength: len,
      replacements: repl,
      eligible: true,
      didUpdate: willUpdate,
    });

    const consumed = right;
    right += 1;
    push({
      kind: "advance",
      lines: [49, 50],
      description:
        right < s.length
          ? `right++ → right = ${right}. s[${right}] is not in the window until the next pass reads it.`
          : `right++ → right = ${right}. right < s.length() is false, so the loop ends.`,
      left,
      right,
      winStart: left,
      winEnd: consumed,
      focusIndex: right < s.length ? right : null,
      highlightKey: null,
      windowLength: consumed - left + 1,
      replacements: repl,
      eligible: true,
      didUpdate: false,
    });
  }

  push({
    kind: "return",
    lines: [53, 54],
    description: `Return longestSubstringLength = ${longest}.`,
    left: best?.start ?? null,
    right: best?.end ?? null,
    winStart: best?.start ?? null,
    winEnd: best?.end ?? null,
    focusIndex: null,
    highlightKey: null,
    windowLength: best ? best.end - best.start + 1 : null,
    replacements: best ? best.end - best.start + 1 - best.most : null,
    eligible: best ? true : null,
    didUpdate: false,
    freq: best ? new Map(Object.entries(best.freq)) : freq,
    freqKeys: best?.freqKeys ?? [],
    mostFreq: best?.most ?? most,
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
            className={`flex transition-colors duration-150 ${
              isActive ? "bg-amber-100/80" : ""
            }`}
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
  s,
  left,
  right,
  winStart,
  winEnd,
  focusIndex,
  best,
  eligible,
}: {
  s: string;
  left: number | null;
  right: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  best: BestWindow | null;
  eligible: boolean | null;
}) {
  const cellW = 32;
  const gap = 4;
  const inWindow = (idx: number) =>
    winStart !== null && winEnd !== null && idx >= winStart && idx <= winEnd;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        Input string s
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {s.split("").map((_, idx) => (
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
            {s.split("").map((ch, idx) => {
              const windowed = inWindow(idx);
              const pending = idx === right && !windowed;
              const inBest = best !== null && idx >= best.start && idx <= best.end;
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
            {s.split("").map((_, idx) => (
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
            {s.split("").map((_, idx) => (
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
  freqKeys,
  freq,
  highlightKey,
  mostFreq,
}: {
  freqKeys: string[];
  freq: FreqMap;
  highlightKey: string | null;
  mostFreq: number;
}) {
  const stale =
    freqKeys.length > 0 &&
    mostFreq > 0 &&
    freqKeys.every((ch) => (freq[ch] ?? 0) !== mostFreq);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        frequencyMap
      </div>
      {freqKeys.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
          Empty
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1.4rem_1fr_3.2rem] bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-2 py-1">
            <span></span>
            <span className="text-center">freq</span>
            <span className="text-center">max?</span>
          </div>
          {freqKeys.map((ch) => {
            const count = freq[ch] ?? 0;
            const isMax = mostFreq > 0 && count === mostFreq;
            const isHi = ch === highlightKey;
            const rowBg = isMax ? "bg-emerald-50/70" : isHi ? "bg-amber-50" : "bg-white";
            return (
              <div
                key={ch}
                className={`grid grid-cols-[1.4rem_1fr_3.2rem] items-center px-2 py-1 font-mono text-[12px] border-t border-gray-100 ${rowBg}`}
              >
                <span className="font-bold text-gray-800">{ch}</span>
                <span
                  className={`text-center font-semibold ${
                    count === 0 ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {count}
                </span>
                <span
                  className={`text-center text-[10px] font-semibold ${
                    isMax ? "text-emerald-600" : "text-gray-300"
                  }`}
                >
                  {isMax ? "yes" : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {stale ? (
        <div className="text-[11px] text-gray-500 leading-snug">
          mostFrequentCharacterFrequency is {mostFreq}. No character in the window currently has that count.
        </div>
      ) : null}
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize",
  count: "Add character",
  max_freq: "Most frequent",
  check: "Check window",
  decrement: "Decrease frequency",
  move_left: "Move left",
  update: "Update longest",
  advance: "Move right",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  count: "text-violet-600",
  max_freq: "text-amber-600",
  check: "text-emerald-600",
  decrement: "text-rose-500",
  move_left: "text-amber-600",
  update: "text-emerald-600",
  advance: "text-violet-600",
  return: "text-emerald-600",
};

export default function LongestRepeatingCharacterReplacementSlidingWindowVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const steps = useMemo(() => simulate(preset.s, preset.k), [preset]);
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
        ? 1100
        : cur?.kind === "update" && cur.didUpdate
          ? 900
          : cur?.kind === "check"
            ? 720
            : cur?.kind === "decrement" || cur?.kind === "move_left"
              ? 640
              : cur?.kind === "advance"
                ? 420
                : 560;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind, cur?.didUpdate]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kind = cur?.kind ?? null;
  const left = cur?.left ?? null;
  const right = cur?.right ?? null;
  const winStart = cur?.winStart ?? null;
  const winEnd = cur?.winEnd ?? null;
  const eligible = cur?.eligible ?? null;
  const longest = cur?.longest ?? 0;
  const best = cur?.best ?? null;
  const didUpdate = cur?.didUpdate ?? false;
  const mostFreq = cur?.mostFreq ?? 0;
  const windowLength = cur?.windowLength ?? null;
  const replacements = cur?.replacements ?? null;
  const ready = winStart !== null && winEnd !== null;
  const windowText = ready ? preset.s.slice(winStart, winEnd + 1) : "";
  const bestText = best ? preset.s.slice(best.start, best.end + 1) : "";
  const kindColor =
    kind === "check" && eligible === false
      ? "text-rose-500"
      : kind
        ? KIND_COLOR[kind]
        : "text-gray-400";
  const rightLabel =
    right === null ? "—" : String(right);

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

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[36rem]">
        <div className="h-72 md:h-auto md:flex-1 md:min-h-0 min-w-0 px-4 pt-4 pb-4 flex flex-col overflow-hidden border-b md:border-b-0 border-gray-100">
          <AlgorithmPanel activeLines={cur?.lines ?? []} />
        </div>

        <div className="w-full md:w-[380px] md:min-h-0 shrink-0 px-5 pt-4 pb-4 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              k
            </span>
            <span className="font-mono text-sm font-bold text-gray-800">{preset.k}</span>
          </div>

          <StringDisplay
            s={preset.s}
            left={left}
            right={right !== null && right < preset.s.length ? right : null}
            winStart={winStart}
            winEnd={winEnd}
            focusIndex={cur?.focusIndex ?? null}
            best={best}
            eligible={eligible}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current window
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  eligible === true
                    ? "text-emerald-600"
                    : eligible === false
                      ? "text-rose-500"
                      : "text-gray-300"
                }`}
              >
                {eligible === true ? "eligible" : eligible === false ? "ineligible" : "—"}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className={`font-bold truncate ${ready ? "text-gray-800" : "text-gray-300"}`}>
                {ready ? `"${windowText}"` : "s[left..right]"}
              </span>
              <span className="text-[11px] text-gray-500 shrink-0">
                len {windowLength ?? "—"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              replacements{" "}
              {replacements === null || windowLength === null
                ? "—"
                : `${windowLength} - ${mostFreq} = ${replacements}`}
              {replacements !== null ? `  vs  k = ${preset.k}` : ""}
            </div>
          </div>

          <FreqTable
            freqKeys={cur?.freqKeys ?? []}
            freq={cur?.freq ?? {}}
            highlightKey={cur?.highlightKey ?? null}
            mostFreq={mostFreq}
          />

          <div className="flex flex-col gap-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-amber-600">left</span>
              <span className="font-semibold text-gray-700"> = {left === null ? "—" : left}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">right</span>
              <span className="font-semibold text-gray-700"> = {rightLabel}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-400">mostFrequentCharacterFrequency</span>
              <span className="font-semibold text-gray-700"> = {mostFreq}</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              didUpdate
                ? "border border-emerald-300 bg-emerald-50"
                : "border border-emerald-100 bg-emerald-50/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                longestSubstringLength
              </span>
              <span className="font-mono text-[11px] text-emerald-700">{longest}</span>
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-emerald-800 h-[20px] truncate">
              {bestText ? `"${bestText}"` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-2.5 min-h-[4.25rem]">
        <div className={`text-[10px] font-semibold uppercase tracking-wide ${kindColor}`}>
          {kind ? KIND_LABEL[kind] : "Ready"}
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
