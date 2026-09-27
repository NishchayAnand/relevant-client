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
  "    // 1. Create a target frequency map for s1.",
  "    Map<Character, Integer> targetFrequencyMap = new HashMap<>();",
  "    for (char ch : s1.toCharArray()) {",
  "        int frequency = targetFrequencyMap.getOrDefault(ch, 0) + 1;",
  "        targetFrequencyMap.put(ch, frequency);",
  "    }",
  "",
  "    // 2. Iterate over each valid starting position in s2.",
  "    for (int i = 0; i <= s2.length() - s1.length(); i++) {",
  "        ",
  "        // 3. Create a frequency map for the current substring.",
  "        Map<Character, Integer> currentSubstringFrequencyMap = new HashMap<>();",
  "",
  "        // 4. Iterate over next s1.length characters in s2.",
  "        for (int j = 0; j < s1.length(); j++) {",
  "            char ch = s2.charAt(i + j);",
  "            int frequency = currentSubstringFrequencyMap.getOrDefault(ch, 0) + 1;",
  "            // 5. Update current substring frequency map.",
  "            currentSubstringFrequencyMap.put(ch, frequency);",
  "        }",
  "",
  "        // 6. Check if current substring frequency map is equal to the target frequency map.",
  "        if (currentSubstringFrequencyMap.equals(targetFrequencyMap)) {",
  "            return true;",
  "        }",
  "",
  "    }",
  "",
  "    // 7. If no eligible substring found in s2, return false.",
  "    return false;",
  "        ",
  "}",
];

type StepKind = "build" | "outer" | "reset" | "scan" | "update" | "check" | "found" | "miss";

type FreqMap = Record<string, number>;

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  focusIndex: number | null;
  counted: number;
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
  m.forEach((v, key) => {
    out[key] = v;
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
  let current = new Map<string, number>();
  let currentKeys: string[] = [];

  const push = (
    partial: Omit<Step, "target" | "targetKeys" | "current" | "currentKeys"> & {
      current?: Map<string, number>;
      currentKeys?: string[];
    },
  ) => {
    steps.push({
      ...partial,
      target: cloneFreq(target),
      targetKeys: [...targetKeys],
      current: cloneFreq(partial.current ?? current),
      currentKeys: [...(partial.currentKeys ?? currentKeys)],
    });
  };

  for (const ch of s1) {
    const next = (target.get(ch) ?? 0) + 1;
    target.set(ch, next);
    if (!targetKeys.includes(ch)) targetKeys.push(ch);
    push({
      kind: "build",
      lines: steps.length === 0 ? [3, 4, 5, 6, 7] : [5, 6, 7],
      description: `Count '${ch}' from s1. targetFrequencyMap['${ch}'] = ${next}.`,
      i: null,
      j: null,
      focusIndex: null,
      counted: 0,
      highlightKey: ch,
      judged: false,
      result: null,
      current: new Map(),
      currentKeys: [],
    });
  }

  const windowLen = s1.length;
  const lastStart = s2.length - windowLen;

  for (let i = 0; i <= lastStart; i++) {
    push({
      kind: "outer",
      lines: [10, 11],
      description: `i = ${i}. The next substring is s2[${i}..${i + windowLen - 1}] = "${s2.slice(i, i + windowLen)}".`,
      i,
      j: null,
      focusIndex: i,
      counted: 0,
      highlightKey: null,
      judged: false,
      result: null,
    });

    current = new Map();
    currentKeys = [];
    push({
      kind: "reset",
      lines: [13, 14],
      description: "currentSubstringFrequencyMap = {}.",
      i,
      j: null,
      focusIndex: i,
      counted: 0,
      highlightKey: null,
      judged: false,
      result: null,
    });

    for (let j = 0; j < windowLen; j++) {
      const index = i + j;
      const ch = s2[index];
      const next = (current.get(ch) ?? 0) + 1;
      push({
        kind: "scan",
        lines: [16, 17, 18, 19],
        description: `j = ${j}. ch = s2[${index}] = '${ch}'. frequency = ${next}, not stored yet.`,
        i,
        j,
        focusIndex: index,
        counted: j,
        highlightKey: ch,
        judged: false,
        result: null,
      });

      current.set(ch, next);
      if (!currentKeys.includes(ch)) currentKeys.push(ch);
      push({
        kind: "update",
        lines: [20, 21],
        description: `currentSubstringFrequencyMap['${ch}'] = ${next}.`,
        i,
        j,
        focusIndex: index,
        counted: j + 1,
        highlightKey: ch,
        judged: false,
        result: null,
      });
    }

    const equal = sameMaps(target, current);
    const text = s2.slice(i, i + windowLen);
    if (equal) {
      push({
        kind: "found",
        lines: [24, 25, 26],
        description: `"${text}" has the same frequencies as s1. Return true.`,
        i,
        j: windowLen - 1,
        focusIndex: null,
        counted: windowLen,
        highlightKey: null,
        judged: true,
        result: true,
      });
      return steps;
    }

    push({
      kind: "check",
      lines: [24, 25],
      description: `"${text}" does not match targetFrequencyMap. Keep searching.`,
      i,
      j: windowLen - 1,
      focusIndex: null,
      counted: windowLen,
      highlightKey: null,
      judged: true,
      result: null,
    });
  }

  push({
    kind: "miss",
    lines: [31, 32],
    description: "No substring of s2 is a permutation of s1. Return false.",
    i: null,
    j: null,
    focusIndex: null,
    counted: 0,
    highlightKey: null,
    judged: false,
    result: false,
    current: new Map(),
    currentKeys: [],
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

function StringRow({
  label,
  text,
  windowStart,
  windowEnd,
  countedEnd,
  focusIndex,
  matched,
}: {
  label: string;
  text: string;
  windowStart: number | null;
  windowEnd: number | null;
  countedEnd: number | null;
  focusIndex: number | null;
  matched: boolean | null;
}) {
  const cellW = text.length > 10 ? 22 : 28;
  const gap = 4;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        {label}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {text.split("").map((ch, idx) => {
              const inWindow =
                windowStart !== null &&
                windowEnd !== null &&
                idx >= windowStart &&
                idx <= windowEnd;
              const counted =
                windowStart !== null &&
                countedEnd !== null &&
                idx >= windowStart &&
                idx <= countedEnd;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";
              if (matched === true && inWindow) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (matched === false && inWindow) {
                bg = "#fff1f2";
                border = "#fda4af";
                color = "#9f1239";
              } else if (counted) {
                bg = "#eff6ff";
                border = "#93c5fd";
                color = "#1e40af";
              } else if (inWindow) {
                bg = "#f5f3ff";
                border = "#c4b5fd";
                color = "#5b21b6";
              }
              return (
                <div
                  key={idx}
                  style={{
                    width: cellW,
                    height: 32,
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
                    fontSize: 14,
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
                  textAlign: "center",
                  fontSize: 10,
                  color: idx === windowStart ? "#d97706" : "#9ca3af",
                  fontFamily: "monospace",
                  fontWeight: idx === windowStart ? 700 : 400,
                }}
              >
                {idx === windowStart ? "i" : idx}
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
            const ok = have !== null && have === need && need > 0;
            const bad = judged && have !== null && have !== need;
            const isHi = ch === highlightKey;
            const rowBg = bad ? "bg-rose-50" : judged && ok ? "bg-emerald-50/70" : isHi ? "bg-amber-50" : "bg-white";
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
                    !judged || have === null
                      ? "text-gray-300"
                      : ok
                        ? "text-emerald-600"
                        : "text-rose-500"
                  }`}
                >
                  {!judged || have === null ? "—" : ok ? "yes" : "no"}
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
  outer: "Next window",
  reset: "Reset current map",
  scan: "Read character",
  update: "Update current map",
  check: "Compare maps",
  found: "Return true",
  miss: "Return false",
};

const KIND_COLOR: Record<StepKind, string> = {
  build: "text-indigo-600",
  outer: "text-amber-600",
  reset: "text-sky-600",
  scan: "text-violet-600",
  update: "text-violet-600",
  check: "text-rose-500",
  found: "text-emerald-600",
  miss: "text-rose-500",
};

export default function PermutationInStringBruteVisualizer() {
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
        : cur?.kind === "check"
          ? 750
          : cur?.kind === "update" || cur?.kind === "scan"
            ? 520
            : 640;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const i = cur?.i ?? null;
  const windowLen = preset.s1.length;
  const windowStart = i;
  const windowEnd = i === null ? null : i + windowLen - 1;
  const countedEnd =
    i !== null && (cur?.counted ?? 0) > 0 ? i + (cur?.counted ?? 0) - 1 : null;
  const matched = cur?.kind === "found" ? true : cur?.kind === "check" ? false : null;
  const ready = windowStart !== null && windowEnd !== null && (cur?.counted ?? 0) === windowLen;
  const windowText = ready ? preset.s2.slice(windowStart, windowEnd + 1) : "";
  const result = cur?.result ?? null;
  const showCurrent = cur !== null && cur.kind !== "build" && cur.kind !== "miss";
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
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
              s1
            </span>
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

          <StringRow
            label="s2"
            text={preset.s2}
            windowStart={windowStart}
            windowEnd={windowEnd}
            countedEnd={countedEnd}
            focusIndex={cur?.focusIndex ?? null}
            matched={matched}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current substring
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  matched === true
                    ? "text-emerald-600"
                    : matched === false
                      ? "text-rose-500"
                      : "text-gray-300"
                }`}
              >
                {matched === true ? "match" : matched === false ? "no match" : "—"}
              </span>
            </div>
            <div className="mt-0.5 font-bold truncate text-gray-800">
              {windowText ? `"${windowText}"` : "s2[i..i + s1.length)"}
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
              <span className="font-semibold text-amber-600">i</span>
              <span className="font-semibold text-gray-700"> = {i === null ? "—" : i}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">j</span>
              <span className="font-semibold text-gray-700">
                {" "}
                = {cur?.j === null || cur?.j === undefined ? "—" : cur.j}
              </span>
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
                result === true
                  ? "text-emerald-800"
                  : result === false
                    ? "text-rose-700"
                    : "text-gray-300"
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
