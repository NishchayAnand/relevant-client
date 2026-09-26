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
  "public static int characterReplacement(String s, int k) {",
  "",
  "   // 1. Initialize a variable to store the length of the longest substring found so far.",
  "   int longestSubstringLength = 0;",
  "",
  "   // 2. Iterate over each character in \"s\"",
  "   for (int i = 0; i < s.length(); i++) {",
  "",
  "      // 3. Initialize a frequency map to track the character in the current substring.",
  "      Map<Character, Integer> frequencyMap = new HashMap<>();",
  "",
  "      // 4. Initialize a variable to store the frequency of most frequent character in the current substring.",
  "      int mostFrequentCharacterFrequency = 0;",
  "",
  "      // 5. Expand the current substring one character at a time.",
  "      for (int j = i; j < s.length(); j++) {",
  "",
  "            // 6. Update the frequency of the current character.",
  "            char ch = s.charAt(j);",
  "            int currentCharacterFrequency = frequencyMap.getOrDefault(ch, 0) + 1;",
  "            frequencyMap.put(ch, currentCharacterFrequency);",
  "",
  "            // 7. Update the frequency of the most frequent character, if necessary.",
  "            mostFrequentCharacterFrequency = Math.max(mostFrequentCharacterFrequency, currentCharacterFrequency);",
  "",
  "            // 8. Check if the current substring is eligible.",
  "            int currentSubstringLength = j - i + 1;",
  "            if (currentSubstringLength - mostFrequentCharacterFrequency <= k) {",
  "",
  "               // 9. Update the length of the longest eligible substring, if necessary.",
  "               longestSubstringLength = Math.max(longestSubstringLength, currentSubstringLength);",
  "            }",
  "",
  "      }",
  "",
  "   }",
  "",
  "   // 10. Return the length of the longest eligible substring.",
  "   return longestSubstringLength;",
  "",
  "}",
];

type StepKind =
  | "init"
  | "outer"
  | "reset_map"
  | "reset_max"
  | "expand"
  | "count"
  | "max_freq"
  | "check"
  | "update"
  | "return";

type FreqMap = Record<string, number>;

type BestWindow = { start: number; end: number };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  freq: FreqMap;
  freqKeys: string[];
  highlightKey: string | null;
  mostFreq: number | null;
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
  let freq = new Map<string, number>();
  let freqKeys: string[] = [];
  let most: number | null = null;
  let longest = 0;
  let best: BestWindow | null = null;
  let winStart: number | null = null;
  let winEnd: number | null = null;
  let windowLength: number | null = null;
  let replacements: number | null = null;
  let eligible: boolean | null = null;
  let highlightKey: string | null = null;

  const push = (
    partial: Omit<Step, "freq" | "freqKeys" | "longest" | "best"> & {
      freq?: Map<string, number>;
      freqKeys?: string[];
      longest?: number;
      best?: BestWindow | null;
    },
  ) => {
    const map = partial.freq ?? freq;
    steps.push({
      ...partial,
      freq: cloneFreq(map),
      freqKeys: [...(partial.freqKeys ?? freqKeys)],
      longest: partial.longest ?? longest,
      best: partial.best === undefined ? best : partial.best,
    });
  };

  push({
    kind: "init",
    lines: [3, 4],
    description:
      "longestSubstringLength = 0. No eligible substring has been seen yet.",
    i: null,
    j: null,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    highlightKey: null,
    mostFreq: null,
    windowLength: null,
    replacements: null,
    eligible: null,
    didUpdate: false,
    freq: new Map(),
    freqKeys: [],
    longest: 0,
    best: null,
  });

  for (let i = 0; i < s.length; i++) {
    push({
      kind: "outer",
      lines: [6, 7],
      description: `i = ${i}. Start a new substring at s[${i}] = '${s[i]}'.`,
      i,
      j: null,
      winStart: null,
      winEnd: null,
      focusIndex: i,
      highlightKey: null,
      mostFreq: most,
      windowLength: null,
      replacements: null,
      eligible: null,
      didUpdate: false,
    });

    freq = new Map();
    freqKeys = [];
    winStart = null;
    winEnd = null;
    windowLength = null;
    replacements = null;
    eligible = null;
    highlightKey = null;

    push({
      kind: "reset_map",
      lines: [9, 10],
      description: "frequencyMap = {}. Character counts for this substring start over.",
      i,
      j: null,
      winStart: null,
      winEnd: null,
      focusIndex: i,
      highlightKey: null,
      mostFreq: null,
      windowLength: null,
      replacements: null,
      eligible: null,
      didUpdate: false,
    });

    most = 0;
    push({
      kind: "reset_max",
      lines: [12, 13],
      description: "mostFrequentCharacterFrequency = 0.",
      i,
      j: null,
      winStart: null,
      winEnd: null,
      focusIndex: i,
      highlightKey: null,
      mostFreq: most,
      windowLength: null,
      replacements: null,
      eligible: null,
      didUpdate: false,
    });

    for (let j = i; j < s.length; j++) {
      push({
        kind: "expand",
        lines: [15, 16],
        description: `j = ${j}. s[${j}] = '${s[j]}' is the next character. It is not in frequencyMap yet.`,
        i,
        j,
        winStart,
        winEnd,
        focusIndex: j,
        highlightKey: null,
        mostFreq: most,
        windowLength,
        replacements,
        eligible,
        didUpdate: false,
      });

      const ch = s[j];
      const nextCount = (freq.get(ch) ?? 0) + 1;
      freq.set(ch, nextCount);
      if (!freqKeys.includes(ch)) freqKeys.push(ch);
      winStart = i;
      winEnd = j;
      windowLength = j - i + 1;
      replacements = null;
      eligible = null;
      highlightKey = ch;

      push({
        kind: "count",
        lines: [18, 19, 20, 21],
        description: `ch = '${ch}'. frequencyMap['${ch}'] = ${nextCount}.`,
        i,
        j,
        winStart,
        winEnd,
        focusIndex: j,
        highlightKey,
        mostFreq: most,
        windowLength,
        replacements,
        eligible,
        didUpdate: false,
      });

      const prevMost = most ?? 0;
      most = Math.max(prevMost, nextCount);
      push({
        kind: "max_freq",
        lines: [23, 24],
        description:
          most > prevMost
            ? `mostFrequentCharacterFrequency = max(${prevMost}, ${nextCount}) = ${most}. '${ch}' is now the most frequent.`
            : `mostFrequentCharacterFrequency = max(${prevMost}, ${nextCount}) = ${most}. The most frequent count does not change.`,
        i,
        j,
        winStart,
        winEnd,
        focusIndex: j,
        highlightKey: ch,
        mostFreq: most,
        windowLength,
        replacements: null,
        eligible: null,
        didUpdate: false,
      });

      const len = windowLength;
      const repl = len - (most ?? 0);
      const ok = repl <= k;
      replacements = repl;
      eligible = ok;
      const text = s.slice(i, j + 1);

      push({
        kind: "check",
        lines: [26, 27, 28],
        description: ok
          ? `currentSubstringLength = ${len}. Replacements = ${len} - ${most} = ${repl}, and ${repl} <= k (${k}). "${text}" is eligible.`
          : `currentSubstringLength = ${len}. Replacements = ${len} - ${most} = ${repl}, and ${repl} > k (${k}). "${text}" is not eligible, so skip the update.`,
        i,
        j,
        winStart,
        winEnd,
        focusIndex: null,
        highlightKey: ch,
        mostFreq: most,
        windowLength: len,
        replacements: repl,
        eligible: ok,
        didUpdate: false,
      });

      if (ok) {
        const prevLongest = longest;
        const willUpdate = len > longest;
        if (willUpdate) {
          longest = len;
          best = { start: i, end: j };
        }
        push({
          kind: "update",
          lines: [30, 31],
          description: willUpdate
            ? `"${text}" has length ${len}, which is longer than ${prevLongest}. longestSubstringLength = ${len}.`
            : `"${text}" has length ${len}, which is not longer than longestSubstringLength = ${prevLongest}. Keep ${prevLongest}.`,
          i,
          j,
          winStart,
          winEnd,
          focusIndex: null,
          highlightKey: ch,
          mostFreq: most,
          windowLength: len,
          replacements: repl,
          eligible: true,
          didUpdate: willUpdate,
        });
      }
    }
  }

  const answerFreq = new Map<string, number>();
  const answerKeys: string[] = [];
  let answerMost = 0;
  if (best) {
    for (let idx = best.start; idx <= best.end; idx++) {
      const ch = s[idx];
      answerFreq.set(ch, (answerFreq.get(ch) ?? 0) + 1);
      if (!answerKeys.includes(ch)) answerKeys.push(ch);
      answerMost = Math.max(answerMost, answerFreq.get(ch) ?? 0);
    }
  }
  const answerLen = best ? best.end - best.start + 1 : 0;

  push({
    kind: "return",
    lines: [38, 39],
    description: `Return longestSubstringLength = ${longest}.`,
    i: best?.start ?? null,
    j: best?.end ?? null,
    winStart: best?.start ?? null,
    winEnd: best?.end ?? null,
    focusIndex: null,
    highlightKey: null,
    mostFreq: best ? answerMost : most,
    windowLength: best ? answerLen : null,
    replacements: best ? answerLen - answerMost : null,
    eligible: best ? true : null,
    didUpdate: false,
    freq: answerFreq,
    freqKeys: answerKeys,
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
  i,
  j,
  winStart,
  winEnd,
  focusIndex,
  best,
  eligible,
}: {
  s: string;
  i: number | null;
  j: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  best: BestWindow | null;
  eligible: boolean | null;
}) {
  const cellW = s.length > 10 ? 22 : 32;
  const cellH = s.length > 10 ? 30 : 36;
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
                  color: idx === j ? "#7c3aed" : "transparent",
                }}
              >
                j
              </div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {s.split("").map((ch, idx) => {
              const windowed = inWindow(idx);
              const pending = idx === j && !windowed;
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
                    height: cellH,
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
                  color: idx === i ? "#d97706" : "transparent",
                }}
              >
                i
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
  mostFreq: number | null;
}) {
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
            const isMax = mostFreq !== null && mostFreq > 0 && count === mostFreq;
            const isHi = ch === highlightKey;
            const rowBg = isMax ? "bg-emerald-50/70" : isHi ? "bg-amber-50" : "bg-white";
            return (
              <div
                key={ch}
                className={`grid grid-cols-[1.4rem_1fr_3.2rem] items-center px-2 py-1 font-mono text-[12px] border-t border-gray-100 ${rowBg}`}
              >
                <span className="font-bold text-gray-800">{ch}</span>
                <span className="text-center font-semibold text-gray-700">{count}</span>
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
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize",
  outer: "Next start",
  reset_map: "Reset frequencyMap",
  reset_max: "Reset most frequent",
  expand: "Expand j",
  count: "Count character",
  max_freq: "Most frequent",
  check: "Check eligibility",
  update: "Update longest",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  outer: "text-amber-600",
  reset_map: "text-indigo-600",
  reset_max: "text-indigo-600",
  expand: "text-violet-600",
  count: "text-violet-600",
  max_freq: "text-amber-600",
  check: "text-emerald-600",
  update: "text-emerald-600",
  return: "text-emerald-600",
};

export default function LongestRepeatingCharacterReplacementBruteVisualizer() {
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
            ? 750
            : cur?.kind === "count" || cur?.kind === "max_freq"
              ? 560
              : cur?.kind === "expand"
                ? 420
                : 640;
    const timer = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind, cur?.didUpdate]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const kind = cur?.kind ?? null;
  const lines = cur?.lines ?? [];
  const i = cur?.i ?? null;
  const j = cur?.j ?? null;
  const winStart = cur?.winStart ?? null;
  const winEnd = cur?.winEnd ?? null;
  const eligible = cur?.eligible ?? null;
  const longest = cur?.longest ?? 0;
  const best = cur?.best ?? null;
  const didUpdate = cur?.didUpdate ?? false;
  const mostFreq = cur?.mostFreq ?? null;
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
          <AlgorithmPanel activeLines={lines} />
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
            i={i}
            j={j}
            winStart={winStart}
            winEnd={winEnd}
            focusIndex={cur?.focusIndex ?? null}
            best={best}
            eligible={eligible}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current substring
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
                {eligible === true ? "eligible" : eligible === false ? "not eligible" : "—"}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className={`font-bold truncate ${ready ? "text-gray-800" : "text-gray-300"}`}>
                {ready ? `"${windowText}"` : "s[i..j]"}
              </span>
              <span className="text-[11px] text-gray-500 shrink-0">
                len {windowLength ?? "—"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              replacements{" "}
              {replacements === null || windowLength === null || mostFreq === null
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
              <span className="font-semibold text-amber-600">i</span>
              <span className="font-semibold text-gray-700"> = {i === null ? "—" : i}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">j</span>
              <span className="font-semibold text-gray-700"> = {j === null ? "—" : j}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-400">mostFrequentCharacterFrequency</span>
              <span className="font-semibold text-gray-700">
                {" "}
                = {mostFreq === null ? "—" : mostFreq}
              </span>
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
