"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  s: string;
  t: string;
};

const PRESETS: Preset[] = [
  { id: "short", label: 's = "ABAC" · t = "ABC"', s: "ABAC", t: "ABC" },
  {
    id: "example1",
    label: 's = "ADOBECODEBANC" · t = "ABC"',
    s: "ADOBECODEBANC",
    t: "ABC",
  },
  {
    id: "example2",
    label: 's = "aaaabbbbbcdd" · t = "abcdd"',
    s: "aaaabbbbbcdd",
    t: "abcdd",
  },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "class Solution {",
  "",
  "  private boolean isValid(",
  "      Map<Character, Integer> reqFreqMap,",
  "      Map<Character, Integer> currFreqMap) {",
  "",
  "    for (char reqChar : reqFreqMap.keySet()) {",
  "      int reqFreq = reqFreqMap.get(reqChar);",
  "      int currFreq = currFreqMap.getOrDefault(reqChar, 0);",
  "",
  "      if (currFreq < reqFreq) {",
  "        return false;",
  "      }",
  "    }",
  "",
  "    return true;",
  "  }",
  "",
  "  public String minWindow(String s, String t) {",
  "",
  "    // 1. Frequency map of every character in t.",
  "    Map<Character, Integer> reqFreqMap = new HashMap<>();",
  "",
  "    for (char ch : t.toCharArray()) {",
  "      reqFreqMap.put(ch, reqFreqMap.getOrDefault(ch, 0) + 1);",
  "    }",
  "",
  "    // 2. Smallest valid substring found so far.",
  "    int minLength = Integer.MAX_VALUE;",
  "    String smallestSubstring = \"\";",
  "",
  "    // 3. Window is the substring s[start..end].",
  "    int start = 0;",
  "    int end = 0;",
  "    Map<Character, Integer> currFreqMap = new HashMap<>();",
  "",
  "    // 4. Expand the window with end.",
  "    while (end < s.length()) {",
  "",
  "      char endChar = s.charAt(end);",
  "",
  "      if (reqFreqMap.containsKey(endChar)) {",
  "        currFreqMap.put(",
  "          endChar,",
  "          currFreqMap.getOrDefault(endChar, 0) + 1",
  "        );",
  "      }",
  "",
  "      // 5-6. While the window is valid, shrink from the left.",
  "      while (start <= end && isValid(reqFreqMap, currFreqMap)) {",
  "",
  "        int currLength = end - start + 1;",
  "",
  "        if (currLength < minLength) {",
  "          minLength = currLength;",
  "          smallestSubstring = s.substring(start, end + 1);",
  "        }",
  "",
  "        char startChar = s.charAt(start);",
  "",
  "        if (reqFreqMap.containsKey(startChar)) {",
  "          int currFreq = currFreqMap.get(startChar);",
  "          if (currFreq == 1) {",
  "            currFreqMap.remove(startChar);",
  "          } else {",
  "            currFreqMap.put(startChar, currFreq - 1);",
  "          }",
  "        }",
  "",
  "        start++;",
  "      }",
  "",
  "      end++;",
  "    }",
  "",
  "    // 7. Return the smallest valid substring.",
  "    return smallestSubstring;",
  "  }",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "build_req"
  | "init_answer"
  | "init_window"
  | "expand"
  | "check"
  | "update"
  | "shrink"
  | "advance"
  | "return";

type FreqMap = Record<string, number>;

type BestWindow = { start: number; end: number; text: string };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  start: number | null;
  end: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  reqFreq: FreqMap;
  currFreq: FreqMap;
  reqKeys: string[];
  highlightKey: string | null;
  missing: string[];
  valid: boolean | null;
  currLength: number | null;
  minLength: number;
  smallestSubstring: string;
  best: BestWindow | null;
  didUpdate: boolean;
};

function cloneFreq(m: Map<string, number>): FreqMap {
  const out: FreqMap = {};
  m.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function missingOf(req: Map<string, number>, curr: Map<string, number>): string[] {
  const missing: string[] = [];
  req.forEach((need, ch) => {
    if ((curr.get(ch) ?? 0) < need) missing.push(ch);
  });
  return missing;
}

function quoteList(chars: string[]): string {
  if (chars.length === 1) return `'${chars[0]}'`;
  if (chars.length === 2) return `'${chars[0]}' and '${chars[1]}'`;
  return `${chars
    .slice(0, -1)
    .map((ch) => `'${ch}'`)
    .join(", ")}, and '${chars[chars.length - 1]}'`;
}

function simulate(s: string, t: string): Step[] {
  const steps: Step[] = [];
  const req = new Map<string, number>();
  const reqKeys: string[] = [];

  const push = (
    partial: Omit<Step, "reqFreq" | "currFreq" | "reqKeys"> & {
      curr?: Map<string, number>;
    },
  ) => {
    const { curr, ...rest } = partial;
    steps.push({
      ...rest,
      reqFreq: cloneFreq(req),
      currFreq: cloneFreq(curr ?? new Map()),
      reqKeys: [...reqKeys],
    });
  };

  for (const ch of t) {
    req.set(ch, (req.get(ch) ?? 0) + 1);
    if (!reqKeys.includes(ch)) reqKeys.push(ch);
    push({
      kind: "build_req",
      lines: steps.length === 0 ? [21, 22, 24, 25] : [24, 25],
      description: `Count '${ch}' from t. reqFreqMap['${ch}'] = ${req.get(ch)}.`,
      start: null,
      end: null,
      winStart: null,
      winEnd: null,
      focusIndex: null,
      highlightKey: ch,
      missing: [],
      valid: null,
      currLength: null,
      minLength: Number.MAX_SAFE_INTEGER,
      smallestSubstring: "",
      best: null,
      didUpdate: false,
    });
  }

  let minLength = Number.MAX_SAFE_INTEGER;
  let smallestSubstring = "";
  let best: BestWindow | null = null;

  push({
    kind: "init_answer",
    lines: [28, 29, 30],
    description:
      'Set minLength to ∞ and smallestSubstring to "". No valid window yet.',
    start: null,
    end: null,
    winStart: null,
    winEnd: null,
    focusIndex: null,
    highlightKey: null,
    missing: [],
    valid: null,
    currLength: null,
    minLength,
    smallestSubstring,
    best,
    didUpdate: false,
  });

  let start = 0;
  let end = 0;
  const curr = new Map<string, number>();

  push({
    kind: "init_window",
    lines: [32, 33, 34, 35],
    description:
      "Place start and end at index 0. currFreqMap is empty, so the window has not consumed a character yet.",
    start,
    end,
    winStart: null,
    winEnd: null,
    focusIndex: 0,
    highlightKey: null,
    missing: [],
    valid: null,
    currLength: null,
    curr,
    minLength,
    smallestSubstring,
    best,
    didUpdate: false,
  });

  while (end < s.length) {
    const endChar = s[end];
    const tracked = req.has(endChar);
    if (tracked) curr.set(endChar, (curr.get(endChar) ?? 0) + 1);

    const winStart = start;
    const winEnd = end;
    const winText = s.slice(winStart, winEnd + 1);
    const winLength = winEnd - winStart + 1;

    push({
      kind: "expand",
      lines: tracked ? [38, 40, 42, 43, 44, 45, 46] : [38, 40, 42],
      description: tracked
        ? `end = ${end}, endChar = '${endChar}'. '${endChar}' is required, so currFreqMap['${endChar}'] = ${curr.get(endChar)}.`
        : `end = ${end}, endChar = '${endChar}'. '${endChar}' is not in t, so currFreqMap stays the same.`,
      start,
      end,
      winStart,
      winEnd,
      focusIndex: end,
      highlightKey: tracked ? endChar : null,
      missing: missingOf(req, curr),
      valid: null,
      currLength: winLength,
      curr,
      minLength,
      smallestSubstring,
      best,
      didUpdate: false,
    });

    let shrunk = false;

    while (start <= end) {
      const missing = missingOf(req, curr);
      const valid = missing.length === 0;
      const text = s.slice(start, end + 1);

      push({
        kind: "check",
        lines: valid ? [7, 8, 9, 16] : [7, 8, 9, 11, 12],
        description: valid
          ? `isValid returns true for "${text}". The inner loop shrinks from the left.`
          : shrunk
            ? `isValid returns false for "${text}" — short on ${quoteList(missing)}. Stop shrinking.`
            : `isValid returns false for "${text}" — short on ${quoteList(missing)}. Skip the shrink loop.`,
        start,
        end,
        winStart: start,
        winEnd: end,
        focusIndex: null,
        highlightKey: missing[0] ?? null,
        missing,
        valid,
        currLength: end - start + 1,
        curr,
        minLength,
        smallestSubstring,
        best,
        didUpdate: false,
      });

      if (!valid) break;

      const currLength = end - start + 1;
      const prevMin = minLength;
      const willUpdate = currLength < minLength;
      if (willUpdate) {
        minLength = currLength;
        smallestSubstring = s.slice(start, end + 1);
        best = { start, end, text: smallestSubstring };
      }

      push({
        kind: "update",
        lines: willUpdate ? [50, 52, 54, 55, 56] : [50, 52, 54],
        description: willUpdate
          ? `"${smallestSubstring}" has length ${currLength}, which is smaller than minLength. Save it.`
          : `"${text}" has length ${currLength}, which is not smaller than minLength = ${prevMin === Number.MAX_SAFE_INTEGER ? "∞" : prevMin}. Keep the current answer.`,
        start,
        end,
        winStart: start,
        winEnd: end,
        focusIndex: null,
        highlightKey: null,
        missing: [],
        valid: true,
        currLength,
        curr,
        minLength,
        smallestSubstring,
        best,
        didUpdate: willUpdate,
      });

      const startChar = s[start];
      const startTracked = req.has(startChar);
      const prevFreq = startTracked ? (curr.get(startChar) ?? 0) : 0;
      if (startTracked) {
        if (prevFreq === 1) curr.delete(startChar);
        else curr.set(startChar, prevFreq - 1);
      }
      const removedIndex = start;
      start += 1;
      shrunk = true;

      const stillOpen = start <= end;
      let shrinkDescription: string;
      if (!startTracked) {
        shrinkDescription = `Drop '${startChar}' (not in t). currFreqMap is unchanged. start = ${start}.`;
      } else if (prevFreq === 1) {
        shrinkDescription = `Drop '${startChar}'. It was the last copy, so remove it from currFreqMap. start = ${start}.`;
      } else {
        shrinkDescription = `Drop '${startChar}'. currFreqMap['${startChar}'] = ${prevFreq - 1}. start = ${start}.`;
      }
      if (!stillOpen) {
        shrinkDescription += " start has moved past end, so the inner loop stops.";
      }

      push({
        kind: "shrink",
        lines: !startTracked
          ? [59, 61, 70]
          : prevFreq === 1
            ? [59, 61, 62, 63, 64, 70]
            : [59, 61, 62, 65, 66, 70],
        description: shrinkDescription,
        start,
        end,
        winStart: stillOpen ? start : null,
        winEnd: stillOpen ? end : null,
        focusIndex: removedIndex,
        highlightKey: startTracked ? startChar : null,
        missing: [],
        valid: null,
        currLength: stillOpen ? end - start + 1 : null,
        curr,
        minLength,
        smallestSubstring,
        best,
        didUpdate: false,
      });
    }

    const includedEnd = end;
    const windowStill =
      start <= includedEnd
        ? { winStart: start, winEnd: includedEnd, currLength: includedEnd - start + 1 }
        : { winStart: null, winEnd: null, currLength: null };
    const lastCheck = steps[steps.length - 1];
    const carriedValid =
      lastCheck?.kind === "check" ? lastCheck.valid : null;

    end += 1;

    push({
      kind: "advance",
      lines: [73],
      description:
        end < s.length
          ? `end++ → end = ${end}. s[${end}] is not in the window until the next pass reads it.`
          : `end++ → end = ${end}. end < s.length() is false, so the outer loop ends.`,
      start,
      end,
      winStart: windowStill.winStart,
      winEnd: windowStill.winEnd,
      focusIndex: end < s.length ? end : null,
      highlightKey: null,
      missing: carriedValid === false ? missingOf(req, curr) : [],
      valid: carriedValid,
      currLength: windowStill.currLength,
      curr,
      minLength,
      smallestSubstring,
      best,
      didUpdate: false,
    });
  }

  const answerCurr = new Map<string, number>();
  if (best) {
    for (let i = best.start; i <= best.end; i++) {
      const ch = s[i];
      if (req.has(ch)) answerCurr.set(ch, (answerCurr.get(ch) ?? 0) + 1);
    }
  }

  push({
    kind: "return",
    lines: [76, 77],
    description:
      smallestSubstring === ""
        ? 'No window of s covers t. Return "".'
        : `Return smallestSubstring = "${smallestSubstring}".`,
    start: best?.start ?? null,
    end: best?.end ?? null,
    winStart: best?.start ?? null,
    winEnd: best?.end ?? null,
    focusIndex: null,
    highlightKey: null,
    missing: [],
    valid: smallestSubstring !== "" ? true : false,
    currLength: best ? best.end - best.start + 1 : null,
    curr: answerCurr,
    minLength,
    smallestSubstring,
    best,
    didUpdate: false,
  });

  return steps;
}

// ─── Left: algorithm ──────────────────────────────────────────────────────────

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
    <div className="font-mono text-[11px] leading-[1.55] overflow-auto flex-1 min-h-0">
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

// ─── Right: dry-run pieces ────────────────────────────────────────────────────

function StringDisplay({
  s,
  tChars,
  start,
  end,
  winStart,
  winEnd,
  focusIndex,
  focusColor,
  best,
  valid,
}: {
  s: string;
  tChars: Set<string>;
  start: number | null;
  end: number | null;
  winStart: number | null;
  winEnd: number | null;
  focusIndex: number | null;
  focusColor: string;
  best: BestWindow | null;
  valid: boolean | null;
}) {
  const cellW = s.length > 10 ? 22 : 32;
  const cellH = s.length > 10 ? 30 : 36;
  const gap = s.length > 10 ? 3 : 4;
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
                  color: idx === end ? "#7c3aed" : "transparent",
                }}
              >
                end
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap }}>
            {s.split("").map((ch, idx) => {
              const windowed = inWindow(idx);
              const isFocus = idx === focusIndex;
              const inBest =
                best !== null && idx >= best.start && idx <= best.end;
              const pendingEnd = idx === end && !windowed;

              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";

              if (valid === true && windowed) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (valid === false && windowed) {
                bg = "#fff1f2";
                border = "#fda4af";
                color = "#9f1239";
              } else if (windowed) {
                bg = "#eff6ff";
                border = "#93c5fd";
                color = "#1e40af";
              } else if (pendingEnd) {
                bg = "#f5f3ff";
                border = "#c4b5fd";
                color = "#5b21b6";
              }

              let outline: string | undefined;
              if (isFocus) {
                outline = `2px solid ${focusColor}`;
              } else if (inBest && !windowed) {
                outline = "2px solid #10b981";
              }

              return (
                <div
                  key={idx}
                  title={
                    tChars.has(ch) ? `'${ch}' is required by t` : `'${ch}' is not in t`
                  }
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
                    fontSize: s.length > 10 ? 12 : 15,
                    fontWeight: 700,
                    textDecoration: tChars.has(ch) ? "underline" : "none",
                    textUnderlineOffset: 3,
                    transition: "background 0.2s, border-color 0.2s, color 0.2s",
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
                  color: idx === start ? "#d97706" : "transparent",
                }}
              >
                start
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

function RequiredT({ t, highlightKey }: { t: string; highlightKey: string | null }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        t
      </span>
      <div className="flex gap-1">
        {t.split("").map((ch, idx) => {
          const active = ch === highlightKey;
          return (
            <div
              key={`${ch}-${idx}`}
              className={`h-7 min-w-7 px-1.5 rounded-md border font-mono text-xs font-bold flex items-center justify-center ${
                active
                  ? "bg-amber-100 border-amber-400 text-amber-900"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              {ch}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FreqCompare({
  reqKeys,
  reqFreq,
  currFreq,
  highlightKey,
  valid,
  showCurr,
}: {
  reqKeys: string[];
  reqFreq: FreqMap;
  currFreq: FreqMap;
  highlightKey: string | null;
  valid: boolean | null;
  showCurr: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        reqFreqMap vs currFreqMap
      </div>
      {reqKeys.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
          Empty — still building reqFreqMap
        </div>
      ) : (
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-[1.4rem_1fr_1fr_2.2rem] bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-400 font-semibold px-2 py-1">
          <span></span>
          <span className="text-center">req</span>
          <span className="text-center">curr</span>
          <span className="text-center">ok?</span>
        </div>
        {reqKeys.map((ch) => {
          const need = reqFreq[ch] ?? 0;
          const have = showCurr ? (currFreq[ch] ?? 0) : null;
          const ok = have !== null && have >= need;
          const short = have !== null && have < need;
          const judged = valid !== null && have !== null;
          const isHi = ch === highlightKey;

          let rowBg = "bg-white";
          if (valid === true && ok) rowBg = "bg-emerald-50/70";
          else if (valid === false && short) rowBg = "bg-rose-50";
          else if (isHi) rowBg = "bg-amber-50";

          return (
            <div
              key={ch}
              className={`grid grid-cols-[1.4rem_1fr_1fr_2.2rem] items-center px-2 py-1 font-mono text-[12px] border-t border-gray-100 ${rowBg}`}
            >
              <span className="font-bold text-gray-800">{ch}</span>
              <span className="text-center text-gray-700">{need}</span>
              <span
                className={`text-center font-semibold ${
                  !judged
                    ? "text-gray-700"
                    : ok
                      ? "text-emerald-700"
                      : "text-rose-600"
                }`}
              >
                {have === null ? "—" : have}
              </span>
              <span
                className={`text-center text-[10px] font-semibold ${
                  !judged
                    ? "text-gray-300"
                    : ok
                      ? "text-emerald-600"
                      : "text-rose-500"
                }`}
              >
                {judged ? (ok ? "yes" : "no") : "—"}
              </span>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function WindowCard({
  s,
  winStart,
  winEnd,
  valid,
  currLength,
}: {
  s: string;
  winStart: number | null;
  winEnd: number | null;
  valid: boolean | null;
  currLength: number | null;
}) {
  const ready = winStart !== null && winEnd !== null;
  const text = ready ? s.slice(winStart, winEnd + 1) : "";
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          Current window
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            valid === true
              ? "text-emerald-600"
              : valid === false
                ? "text-rose-500"
                : "text-gray-300"
          }`}
        >
          {valid === true ? "valid" : valid === false ? "invalid" : "—"}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span
          className={`font-bold truncate ${ready ? "text-gray-800" : "text-gray-300"}`}
        >
          {ready ? `"${text}"` : "s[start..end]"}
        </span>
        <span className="text-[11px] text-gray-500 shrink-0">
          len {currLength ?? "—"}
        </span>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  labelColor,
}: {
  label: string;
  value: string;
  labelColor?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
      <span className="font-semibold" style={{ color: labelColor ?? "#9ca3af" }}>
        {label}
      </span>
      <span className="font-semibold text-gray-700">= {value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<StepKind, string> = {
  build_req: "Build reqFreqMap",
  init_answer: "Initialize answer",
  init_window: "Initialize window",
  expand: "Expand end",
  check: "isValid",
  update: "Update answer",
  shrink: "Shrink start",
  advance: "Move end",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  build_req: "text-indigo-600",
  init_answer: "text-sky-600",
  init_window: "text-sky-600",
  expand: "text-violet-600",
  check: "text-amber-600",
  update: "text-emerald-600",
  shrink: "text-amber-600",
  advance: "text-violet-600",
  return: "text-emerald-600",
};

export default function MinimumWindowSubstringSlidingWindowVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const steps = useMemo(() => simulate(preset.s, preset.t), [preset]);
  const tChars = useMemo(() => new Set(preset.t.split("")), [preset.t]);

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
          ? 950
          : cur?.kind === "update"
            ? 650
            : cur?.kind === "check" && cur.valid
              ? 800
              : cur?.kind === "check"
                ? 620
                : cur?.kind === "shrink"
                  ? 700
                  : cur?.kind === "expand"
                    ? 520
                    : cur?.kind === "advance"
                      ? 400
                      : 700;
    const timer = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind, cur?.valid, cur?.didUpdate]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines are the ones executing, and the window on the right updates with them.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const start = cur?.start ?? null;
  const end = cur?.end ?? null;
  const winStart = cur?.winStart ?? null;
  const winEnd = cur?.winEnd ?? null;
  const focusIndex = cur?.focusIndex ?? null;
  const reqFreq = cur?.reqFreq ?? {};
  const currFreq = cur?.currFreq ?? {};
  const reqKeys = cur?.reqKeys ?? [];
  const highlightKey = cur?.highlightKey ?? null;
  const valid = cur?.valid ?? null;
  const currLength = cur?.currLength ?? null;
  const minLength = cur?.minLength ?? Number.MAX_SAFE_INTEGER;
  const smallestSubstring = cur?.smallestSubstring ?? "";
  const best = cur?.best ?? null;
  const didUpdate = cur?.didUpdate ?? false;
  const showCurr = kind !== null && kind !== "build_req" && kind !== "init_answer";
  const kindColor =
    kind === "check" && valid === false
      ? "text-rose-500"
      : kind
        ? KIND_COLOR[kind]
        : "text-gray-400";
  const minLengthLabel =
    minLength === Number.MAX_SAFE_INTEGER ? "∞" : String(minLength);
  const endLabel =
    end === null ? "—" : end >= preset.s.length ? String(end) : String(end);

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
          <RequiredT t={preset.t} highlightKey={highlightKey} />

          <StringDisplay
            s={preset.s}
            tChars={tChars}
            start={start}
            end={end !== null && end < preset.s.length ? end : null}
            winStart={winStart}
            winEnd={winEnd}
            focusIndex={focusIndex}
            focusColor={kind === "shrink" ? "#d97706" : "#7c3aed"}
            best={best}
            valid={valid}
          />

          <WindowCard
            s={preset.s}
            winStart={winStart}
            winEnd={winEnd}
            valid={valid}
            currLength={currLength}
          />

          <FreqCompare
            reqKeys={reqKeys}
            reqFreq={reqFreq}
            currFreq={currFreq}
            highlightKey={highlightKey}
            valid={valid}
            showCurr={showCurr}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="start"
              value={start === null ? "—" : String(start)}
              labelColor="#d97706"
            />
            <StatPill label="end" value={endLabel} labelColor="#7c3aed" />
            <StatPill label="minLength" value={minLengthLabel} labelColor="#059669" />
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              didUpdate
                ? "border border-emerald-300 bg-emerald-50"
                : "border border-emerald-100 bg-emerald-50/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                smallestSubstring
              </span>
              <span className="font-mono text-[11px] text-emerald-700">
                {minLengthLabel === "∞" ? "" : `len ${minLengthLabel}`}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-emerald-800 h-[20px] truncate">
              {smallestSubstring ? `"${smallestSubstring}"` : '""'}
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
              style={{
                width: `${steps.length ? (step / steps.length) * 100 : 0}%`,
              }}
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
