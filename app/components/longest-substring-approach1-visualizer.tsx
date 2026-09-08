"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  s: string;
};

const PRESETS: Preset[] = [
  { id: "abcabcbb", label: '"abcabcbb"', s: "abcabcbb" },
  { id: "bbbbb", label: '"bbbbb"', s: "bbbbb" },
  { id: "abba", label: '"abba"', s: "abba" },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public int lengthOfLongestSubstring(String s) {",
  "    int maxLength = 0;",
  "    for (int i = 0; i < s.length(); i++) {",
  "        Set<Character> unique = new HashSet<>();",
  "        int currLength = 0;",
  "        for (int j = i; j < s.length(); j++) {",
  "            char ch = s.charAt(j);",
  "            if (!unique.contains(ch)) {",
  "                unique.add(ch);",
  "                currLength++;",
  "                maxLength = Math.max(maxLength, currLength);",
  "            } else {",
  "                break;",
  "            }",
  "        }",
  "    }",
  "    return maxLength;",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "init"
  | "outerLoop"
  | "innerSetup"
  | "innerLoopHeader"
  | "innerCheck"
  | "addBranch"
  | "breakBranch"
  | "return";

type CheckResult = "unique" | "duplicate" | null;

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  ch: string | null;
  unique: string[];
  checkResult: CheckResult;
  currLength: number;
  maxLength: number;
  best: { start: number; length: number };
};

function simulate(input: string): Step[] {
  const steps: Step[] = [];
  let maxLength = 0;
  let best = { start: 0, length: 0 };

  steps.push({
    kind: "init",
    lines: [2],
    description: "Initialise maxLength = 0.",
    i: null,
    j: null,
    ch: null,
    unique: [],
    checkResult: null,
    currLength: 0,
    maxLength,
    best,
  });

  for (let i = 0; i < input.length; i++) {
    steps.push({
      kind: "outerLoop",
      lines: [3],
      description: `Outer loop: i = ${i}. Explore substrings starting at '${input[i]}'.`,
      i,
      j: null,
      ch: null,
      unique: [],
      checkResult: null,
      currLength: 0,
      maxLength,
      best,
    });

    const unique = new Set<string>();
    let currLength = 0;
    steps.push({
      kind: "innerSetup",
      lines: [4, 5],
      description:
        "Fresh HashSet, currLength = 0. Each starting index gets its own clean state.",
      i,
      j: null,
      ch: null,
      unique: [],
      checkResult: null,
      currLength: 0,
      maxLength,
      best,
    });

    for (let j = i; j < input.length; j++) {
      steps.push({
        kind: "innerLoopHeader",
        lines: [6],
        description: `Inner loop: j = ${j}. Extend the window to the right.`,
        i,
        j,
        ch: null,
        unique: Array.from(unique),
        checkResult: null,
        currLength,
        maxLength,
        best,
      });

      const ch = input[j];
      const isDup = unique.has(ch);
      steps.push({
        kind: "innerCheck",
        lines: [7, 8],
        description: `ch = '${ch}'. unique.contains('${ch}') → ${isDup}.`,
        i,
        j,
        ch,
        unique: Array.from(unique),
        checkResult: isDup ? "duplicate" : "unique",
        currLength,
        maxLength,
        best,
      });

      if (isDup) {
        steps.push({
          kind: "breakBranch",
          lines: [12, 13],
          description: `Duplicate. Break — no point extending from i = ${i}.`,
          i,
          j,
          ch,
          unique: Array.from(unique),
          checkResult: "duplicate",
          currLength,
          maxLength,
          best,
        });
        break;
      }

      unique.add(ch);
      currLength++;
      const oldMax = maxLength;
      const newMax = Math.max(maxLength, currLength);
      const isNewBest = newMax > maxLength;
      if (isNewBest) best = { start: i, length: currLength };
      maxLength = newMax;

      steps.push({
        kind: "addBranch",
        lines: [9, 10, 11],
        description: `Add '${ch}'. currLength = ${currLength}. maxLength = max(${oldMax}, ${currLength}) = ${maxLength}${
          isNewBest ? " (new best)." : "."
        }`,
        i,
        j,
        ch,
        unique: Array.from(unique),
        checkResult: "unique",
        currLength,
        maxLength,
        best,
      });
    }
  }

  steps.push({
    kind: "return",
    lines: [17],
    description: `All starting indices explored. Return maxLength = ${maxLength}.`,
    i: null,
    j: null,
    ch: null,
    unique: [],
    checkResult: null,
    currLength: 0,
    maxLength,
    best,
  });

  return steps;
}

// ─── Left: algorithm ──────────────────────────────────────────────────────────

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.7] overflow-x-auto">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        return (
          <div
            key={lineNum}
            className={`flex transition-colors duration-150 ${
              isActive ? "bg-amber-100/80" : ""
            }`}
            style={{
              borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}`,
            }}
          >
            <span
              className={`w-7 text-right pr-2 select-none tabular-nums ${
                isActive ? "text-amber-700 font-semibold" : "text-gray-300"
              }`}
            >
              {lineNum}
            </span>
            <span
              className={`flex-1 whitespace-pre ${
                isActive ? "text-amber-900 font-semibold" : "text-gray-600"
              }`}
            >
              {line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Right: dry-run pieces ────────────────────────────────────────────────────

const CELL_W = 32;
const CELL_H = 36;
const CELL_GAP = 4;

function StringDisplay({
  s,
  i,
  j,
  best,
  checkResult,
}: {
  s: string;
  i: number | null;
  j: number | null;
  best: { start: number; length: number };
  checkResult: CheckResult;
}) {
  const bestEnd = best.length > 0 ? best.start + best.length - 1 : -1;
  const bestSubstring = best.length > 0 ? s.slice(best.start, bestEnd + 1) : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          Input string
        </div>
        {best.length > 0 && (
          <span className="text-[10px] font-mono text-emerald-700">
            best · &quot;{bestSubstring}&quot;
          </span>
        )}
      </div>

      {/* j labels row (above cells) */}
      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              height: 14,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              color: idx === j ? "#7c3aed" : "transparent",
            }}
          >
            j
          </div>
        ))}
      </div>

      {/* Cell row */}
      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((ch, idx) => {
          const isI = idx === i;
          const isJ = idx === j;
          const inWindow =
            i !== null && j !== null && idx >= i && idx <= j;
          const inBest =
            best.length > 0 && idx >= best.start && idx <= bestEnd;

          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (isJ) {
            if (checkResult === "duplicate") {
              bg = "#fee2e2";
              border = "#f87171";
              color = "#991b1b";
            } else if (checkResult === "unique") {
              bg = "#dcfce7";
              border = "#10b981";
              color = "#065f46";
            } else {
              bg = "#ede9fe";
              border = "#8b5cf6";
              color = "#5b21b6";
            }
          } else if (isI) {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (inWindow) {
            bg = "#eff6ff";
            border = "#93c5fd";
            color = "#1e40af";
          }

          const boxShadow =
            inBest && !isJ && !isI ? "0 0 0 2px #10b981" : undefined;

          return (
            <div
              key={idx}
              style={{
                width: CELL_W,
                height: CELL_H,
                background: bg,
                border: `2px solid ${border}`,
                color,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: 700,
                transition:
                  "background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s",
                boxShadow,
              }}
            >
              {ch}
            </div>
          );
        })}
      </div>

      {/* i labels row (below cells) */}
      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              height: 14,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              color: idx === i ? "#d97706" : "transparent",
            }}
          >
            i
          </div>
        ))}
      </div>

      {/* Index row */}
      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
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
  );
}

function HashSetDisplay({
  unique,
  ch,
  checkResult,
}: {
  unique: string[];
  ch: string | null;
  checkResult: CheckResult;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        HashSet
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
        {unique.length === 0 ? (
          <span className="text-[11px] text-gray-400 italic">empty</span>
        ) : (
          unique.map((c) => {
            const isLookupHit =
              c === ch && checkResult === "duplicate";
            let bg = "#f8fafc";
            let border = "#e5e7eb";
            let color = "#374151";
            if (isLookupHit) {
              bg = "#fee2e2";
              border = "#f87171";
              color = "#991b1b";
            }
            return (
              <div
                key={c}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: "0 8px",
                  background: bg,
                  border: `2px solid ${border}`,
                  color,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  transition:
                    "background 0.2s, border-color 0.2s, color 0.2s",
                }}
              >
                {c}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LookupCard({
  ch,
  checkResult,
}: {
  ch: string | null;
  checkResult: CheckResult;
}) {
  const active = checkResult !== null && ch !== null;
  const isDup = checkResult === "duplicate";
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-sm h-[58px]">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="text-gray-500">unique.contains(</span>
        <span
          className={
            active ? "text-violet-700 font-semibold" : "text-gray-300"
          }
        >
          {active ? `'${ch}'` : "'x'"}
        </span>
        <span className="text-gray-500">)</span>
        <span
          className={`font-bold ${
            active
              ? isDup
                ? "text-rose-500"
                : "text-emerald-600"
              : "text-gray-300"
          }`}
        >
          →
        </span>
        <span
          className={
            active
              ? isDup
                ? "text-rose-600 font-semibold"
                : "text-emerald-700 font-semibold"
              : "text-gray-300"
          }
        >
          {active ? (isDup ? "true" : "false") : "?"}
        </span>
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${
          active
            ? isDup
              ? "text-rose-600"
              : "text-emerald-700"
            : "text-transparent"
        }`}
      >
        {active
          ? isDup
            ? "duplicate → break inner loop"
            : "unique → extend substring"
          : "placeholder"}
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
      <span
        className="font-semibold"
        style={{ color: labelColor ?? "#9ca3af" }}
      >
        {label}
      </span>
      <span className="font-semibold text-gray-700">= {value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialise",
  outerLoop: "Outer loop",
  innerSetup: "Reset window",
  innerLoopHeader: "Inner loop",
  innerCheck: "Check",
  addBranch: "Extend",
  breakBranch: "Break",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-indigo-600",
  outerLoop: "text-amber-600",
  innerSetup: "text-sky-600",
  innerLoopHeader: "text-violet-600",
  innerCheck: "text-sky-600",
  addBranch: "text-emerald-600",
  breakBranch: "text-rose-500",
  return: "text-emerald-600",
};

export function LongestSubstringApproach1Visualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId]
  );

  const steps = useMemo(() => simulate(preset.s), [preset]);

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
        ? 900
        : cur?.kind === "init" || cur?.kind === "innerSetup"
          ? 750
          : cur?.kind === "outerLoop"
            ? 700
            : cur?.kind === "innerLoopHeader"
              ? 500
              : 720;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to explore every starting index and see the window grow until a repeat hits.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const i = cur?.i ?? null;
  const j = cur?.j ?? null;
  const ch = cur?.ch ?? null;
  const unique = cur?.unique ?? [];
  const checkResult = cur?.checkResult ?? null;
  const currLength = cur?.currLength ?? 0;
  const maxLength = cur?.maxLength ?? 0;
  const best = cur?.best ?? { start: 0, length: 0 };

  const bestSubstring =
    best.length > 0
      ? preset.s.slice(best.start, best.start + best.length)
      : "";

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

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[34rem]">
        <div className="flex-1 min-w-0 px-5 pt-5 pb-5 flex flex-col gap-3 overflow-hidden">
          <AlgorithmPanel activeLines={lines} />
          <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-gray-200/70 shrink-0">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                kind ? KIND_COLOR[kind] : "text-gray-400"
              }`}
            >
              {kind ? KIND_LABEL[kind] : "Ready"}
            </span>
            <p className="text-xs text-gray-600 leading-relaxed h-[3.75rem] overflow-hidden">
              {description}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[380px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-4 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <StringDisplay
            s={preset.s}
            i={i}
            j={j}
            best={best}
            checkResult={checkResult}
          />

          <HashSetDisplay
            unique={unique}
            ch={ch}
            checkResult={checkResult}
          />

          <LookupCard ch={ch} checkResult={checkResult} />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="i"
              value={i === null ? "—" : String(i)}
              labelColor="#d97706"
            />
            <StatPill
              label="j"
              value={j === null ? "—" : String(j)}
              labelColor="#7c3aed"
            />
            <StatPill
              label="currLength"
              value={String(currLength)}
              labelColor="#0f766e"
            />
            <StatPill
              label="maxLength"
              value={String(maxLength)}
              labelColor="#059669"
            />
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                Longest substring
              </span>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {maxLength}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-emerald-700/80 h-[16px]">
              {bestSubstring ? `"${bestSubstring}"` : ""}
            </div>
          </div>
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
