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
  "public String minWindow(String s, String t) {",
  "  // 1. Build the frequency map of required characters from t",
  "  Map<Character, Integer> reqFreqMap = new HashMap<>();",
  "  for (char ch : t.toCharArray()) {",
  "    reqFreqMap.put(ch, reqFreqMap.getOrDefault(ch, 0) + 1);",
  "  }",
  "",
  "  // 2. Initialize the smallest valid substring",
  "  int minLength = Integer.MAX_VALUE;",
  "  String smallestSubstring = \"\";",
  "",
  "  // 3. Consider every possible starting index",
  "  for (int start = 0; start < s.length(); start++) {",
  "    Map<Character, Integer> currFreqMap = new HashMap<>();",
  "",
  "    // 4. Expand the substring from start",
  "    for (int end = start; end < s.length(); end++) {",
  "      char ch = s.charAt(end);",
  "      // Track only characters present in t",
  "      if (reqFreqMap.containsKey(ch)) {",
  "        currFreqMap.put(ch, currFreqMap.getOrDefault(ch, 0) + 1);",
  "      }",
  "",
  "      // 5. Check if the current substring is valid",
  "      boolean valid = true;",
  "      for (char reqChar : reqFreqMap.keySet()) {",
  "        int reqFreq = reqFreqMap.get(reqChar);",
  "        int currFreq = currFreqMap.getOrDefault(reqChar, 0);",
  "        if (currFreq < reqFreq) {",
  "          valid = false;",
  "          break;",
  "        }",
  "      }",
  "",
  "      // 6. Update the smallest valid substring",
  "      int currLength = end - start + 1;",
  "      if (valid && currLength < minLength) {",
  "        minLength = currLength;",
  "        smallestSubstring = s.substring(start, end + 1);",
  "      }",
  "    }",
  "  }",
  "",
  "  // 7. Return the smallest valid substring",
  "  return smallestSubstring;",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "build_req"
  | "init_answer"
  | "outer"
  | "expand"
  | "evaluate"
  | "return";

type FreqMap = Record<string, number>;

type BestWindow = { start: number; end: number; text: string };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  start: number | null;
  end: number | null;
  ch: string | null;
  tracked: boolean | null;
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

function missingOf(
  req: Map<string, number>,
  curr: Map<string, number>,
): string[] {
  const missing: string[] = [];
  req.forEach((need, ch) => {
    if ((curr.get(ch) ?? 0) < need) missing.push(ch);
  });
  return missing;
}

function simulate(s: string, t: string): Step[] {
  const steps: Step[] = [];
  const req = new Map<string, number>();
  const reqKeys: string[] = [];

  const base = (
    partial: Omit<Step, "reqFreq" | "currFreq" | "reqKeys"> & {
      curr?: Map<string, number>;
    },
  ): Step => {
    const { curr, ...rest } = partial;
    return {
      ...rest,
      reqFreq: cloneFreq(req),
      currFreq: cloneFreq(curr ?? new Map()),
      reqKeys: [...reqKeys],
    };
  };

  for (const ch of t) {
    req.set(ch, (req.get(ch) ?? 0) + 1);
    if (!reqKeys.includes(ch)) reqKeys.push(ch);
    steps.push(
      base({
        kind: "build_req",
        lines: steps.length === 0 ? [2, 3, 4, 5] : [4, 5],
        description: `Count '${ch}' from t. reqFreqMap['${ch}'] = ${req.get(ch)}.`,
        start: null,
        end: null,
        ch,
        tracked: null,
        highlightKey: ch,
        missing: [],
        valid: null,
        currLength: null,
        didUpdate: false,
        minLength: Number.MAX_SAFE_INTEGER,
        smallestSubstring: "",
        best: null,
      }),
    );
  }

  let minLength = Number.MAX_SAFE_INTEGER;
  let smallestSubstring = "";
  let best: BestWindow | null = null;

  steps.push(
    base({
      kind: "init_answer",
      lines: [8, 9, 10],
      description:
        "Initialize minLength to ∞ and smallestSubstring to \"\". No valid window yet.",
      start: null,
      end: null,
      ch: null,
      tracked: null,
      highlightKey: null,
      missing: [],
      valid: null,
      currLength: null,
      didUpdate: false,
      minLength,
      smallestSubstring,
      best,
    }),
  );

  for (let start = 0; start < s.length; start++) {
    const curr = new Map<string, number>();

    steps.push(
      base({
        kind: "outer",
        lines: [12, 13, 14],
        description: `Outer loop: start = ${start}. Reset currFreqMap and expand from s[${start}] = '${s[start]}'.`,
        start,
        end: null,
        ch: null,
        tracked: null,
        highlightKey: null,
        missing: [],
        valid: null,
        currLength: null,
        didUpdate: false,
        curr,
        minLength,
        smallestSubstring,
        best,
      }),
    );

    for (let end = start; end < s.length; end++) {
      const ch = s[end];
      const tracked = req.has(ch);
      if (tracked) curr.set(ch, (curr.get(ch) ?? 0) + 1);

      steps.push(
        base({
          kind: "expand",
          lines: tracked ? [16, 17, 18, 19, 20, 21] : [16, 17, 18, 19, 20],
          description: tracked
            ? `Expand end = ${end}. '${ch}' is in t, so currFreqMap['${ch}'] = ${curr.get(ch)}.`
            : `Expand end = ${end}. '${ch}' is not in t — skip currFreqMap.`,
          start,
          end,
          ch,
          tracked,
          highlightKey: tracked ? ch : null,
          missing: missingOf(req, curr),
          valid: null,
          currLength: end - start + 1,
          didUpdate: false,
          curr,
          minLength,
          smallestSubstring,
          best,
        }),
      );

      const missing = missingOf(req, curr);
      const valid = missing.length === 0;
      const currLength = end - start + 1;
      const willUpdate = valid && currLength < minLength;

      if (willUpdate) {
        minLength = currLength;
        smallestSubstring = s.slice(start, end + 1);
        best = { start, end, text: smallestSubstring };
      }

      const windowText = s.slice(start, end + 1);
      let description: string;
      let lines: number[];
      if (!valid) {
        lines = [24, 25, 26, 29, 30, 31];
        description = `Window "${windowText}" is invalid — still short on ${missing
          .map((c) => `'${c}'`)
          .join(", ")}. Skip the update.`;
      } else if (willUpdate) {
        lines = [35, 36, 37, 38, 39];
        description = `Window "${windowText}" is valid and shorter (${currLength} < previous min). Update smallestSubstring.`;
      } else {
        lines = [24, 25, 35, 36, 37];
        description = `Window "${windowText}" is valid, but length ${currLength} is not smaller than minLength = ${minLength}. Keep the current answer.`;
      }

      steps.push(
        base({
          kind: "evaluate",
          lines,
          description,
          start,
          end,
          ch,
          tracked,
          highlightKey: missing[0] ?? ch,
          missing,
          valid,
          currLength,
          didUpdate: willUpdate,
          curr,
          minLength,
          smallestSubstring,
          best,
        }),
      );
    }
  }

  steps.push(
    base({
      kind: "return",
      lines: [44, 45],
      description:
        smallestSubstring === ""
          ? "No substring of s covers t. Return \"\"."
          : `All windows checked. Return smallestSubstring = "${smallestSubstring}".`,
      start: best?.start ?? null,
      end: best?.end ?? null,
      ch: null,
      tracked: null,
      highlightKey: null,
      missing: [],
      valid: smallestSubstring !== "" ? true : false,
      currLength: best ? best.end - best.start + 1 : null,
      didUpdate: false,
      minLength,
      smallestSubstring,
      best,
    }),
  );

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
              className={`flex-1 whitespace-pre ${
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
  best,
  valid,
}: {
  s: string;
  tChars: Set<string>;
  start: number | null;
  end: number | null;
  best: BestWindow | null;
  valid: boolean | null;
}) {
  const cellW = s.length > 10 ? 24 : 32;
  const cellH = s.length > 10 ? 32 : 36;
  const gap = s.length > 10 ? 3 : 4;
  const inWindow =
    start !== null && end !== null
      ? (idx: number) => idx >= start && idx <= end
      : () => false;

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
              const isStart = idx === start;
              const isEnd = idx === end;
              const windowed = inWindow(idx);
              const inBest =
                best !== null && idx >= best.start && idx <= best.end;

              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#374151";

              if (valid === true && windowed) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (valid === false && windowed) {
                bg = isEnd ? "#fee2e2" : "#fff1f2";
                border = isEnd ? "#f87171" : "#fecdd3";
                color = "#9f1239";
              } else if (isEnd) {
                bg = "#ede9fe";
                border = "#8b5cf6";
                color = "#5b21b6";
              } else if (isStart) {
                bg = "#fef3c7";
                border = "#f59e0b";
                color = "#92400e";
              } else if (windowed) {
                bg = "#eff6ff";
                border = "#93c5fd";
                color = "#1e40af";
              }

              return (
                <div
                  key={idx}
                  title={tChars.has(ch) ? `'${ch}' is required by t` : `'${ch}' is not in t`}
                  style={{
                    width: cellW,
                    height: cellH,
                    background: bg,
                    border: `2px solid ${border}`,
                    outline:
                      inBest && !windowed ? "2px solid #10b981" : undefined,
                    outlineOffset: inBest && !windowed ? 1 : undefined,
                    color,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    fontSize: s.length > 10 ? 13 : 15,
                    fontWeight: 700,
                    textDecoration: tChars.has(ch) ? "underline" : "none",
                    textUnderlineOffset: 3,
                    transition:
                      "background 0.2s, border-color 0.2s, color 0.2s",
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

function RequiredT({
  t,
  highlightKey,
}: {
  t: string;
  highlightKey: string | null;
}) {
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
            const isHi = ch === highlightKey;

            let rowBg = "bg-white";
            if (isHi && valid === null) rowBg = "bg-amber-50";
            else if (valid === true && ok) rowBg = "bg-emerald-50/70";
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
                    have === null
                      ? "text-gray-300"
                      : ok
                        ? "text-emerald-700"
                        : "text-rose-600"
                  }`}
                >
                  {have === null ? "—" : have}
                </span>
                <span
                  className={`text-center text-[10px] font-semibold ${
                    have === null
                      ? "text-gray-300"
                      : ok
                        ? "text-emerald-600"
                        : "text-rose-500"
                  }`}
                >
                  {have === null ? "—" : ok ? "yes" : "no"}
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
  start,
  end,
  valid,
  currLength,
}: {
  s: string;
  start: number | null;
  end: number | null;
  valid: boolean | null;
  currLength: number | null;
}) {
  const ready = start !== null && end !== null;
  const text = ready ? s.slice(start, end + 1) : "";
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
          className={`font-bold truncate ${
            ready ? "text-gray-800" : "text-gray-300"
          }`}
        >
          {ready ? `"${text}"` : 's[start..end]'}
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
  init_answer: "Initialize",
  outer: "Outer loop",
  expand: "Expand window",
  evaluate: "Check & update",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  build_req: "text-indigo-600",
  init_answer: "text-sky-600",
  outer: "text-amber-600",
  expand: "text-violet-600",
  evaluate: "text-emerald-600",
  return: "text-emerald-600",
};

export default function MinimumWindowSubstringBruteVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const steps = useMemo(
    () => simulate(preset.s, preset.t),
    [preset],
  );

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
        ? 1000
        : cur?.kind === "evaluate" && cur.valid
          ? 900
          : cur?.kind === "evaluate"
            ? 620
            : cur?.kind === "expand"
              ? 480
              : cur?.kind === "outer"
                ? 650
                : 750;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind, cur?.valid]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to dry-run the nested loops. Highlighted lines are the ones currently executing.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const start = cur?.start ?? null;
  const end = cur?.end ?? null;
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
  const showCurr = kind !== null && kind !== "build_req";
  const kindColor =
    kind === "evaluate" && valid === false
      ? "text-rose-500"
      : kind
        ? KIND_COLOR[kind]
        : "text-gray-400";

  const minLengthLabel =
    minLength === Number.MAX_SAFE_INTEGER ? "∞" : String(minLength);

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

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[32rem]">
        <div className="flex-1 min-w-0 px-4 pt-4 pb-4 flex flex-col overflow-hidden">
          <AlgorithmPanel activeLines={lines} />
        </div>

        <div className="w-full md:w-[380px] shrink-0 px-5 pt-4 pb-4 flex flex-col gap-3.5 border-t md:border-t-0 border-gray-100 overflow-y-auto">
          <RequiredT t={preset.t} highlightKey={highlightKey} />

          <StringDisplay
            s={preset.s}
            tChars={tChars}
            start={start}
            end={end}
            best={best}
            valid={valid}
          />

          <WindowCard
            s={preset.s}
            start={start}
            end={end}
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
            <StatPill
              label="end"
              value={end === null ? "—" : String(end)}
              labelColor="#7c3aed"
            />
            <StatPill
              label="minLength"
              value={minLengthLabel}
              labelColor="#059669"
            />
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

      <div className="border-t border-gray-100 px-5 py-2.5">
        <div
          className={`text-[10px] font-semibold uppercase tracking-wide ${kindColor}`}
        >
          {kind ? KIND_LABEL[kind] : "Ready"}
        </div>
        <div className="text-xs text-gray-600 leading-relaxed mt-0.5">
          {description}
        </div>
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
