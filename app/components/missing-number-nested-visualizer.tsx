"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, string> = {
  "[3,0,1]":               "3,0,1",
  "[0,1]":                 "0,1",
  "[9,6,4,2,3,5,7,0,1]":   "9,6,4,2,3,5,7,0,1",
  "[1]":                   "1",
};

function parseArray(s: string): number[] {
  const tokens = s.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
  return tokens.map((t) => {
    const v = Number(t);
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`Invalid value "${t}" — expected a non-negative integer`);
    }
    return v;
  });
}

// ─── Algorithm shown on the right panel ──────────────────────────────────────

const ALGORITHM_LINES = [
  "public int missingNumber(int[] nums) {",                //  1
  "",                                                       //  2
  "  int n = nums.length;",                                 //  3
  "",                                                       //  4
  "  for (int num = 0; num <= n; num++) {",                 //  5
  "    boolean found = false;",                             //  6
  "    // Check if num is present in the array",            //  7
  "    for (int j = 0; j < n; j++) {",                      //  8
  "      if (num == nums[j]) {",                            //  9
  "        found = true;",                                  // 10
  "        break;",                                         // 11
  "      }",                                                // 12
  "    }",                                                  // 13
  "    // If the number is not found, return it",           // 14
  "    if (found == false) return num;",                    // 15
  "  }",                                                    // 16
  "",                                                       // 17
  "  return -1;",                                           // 18
  "",                                                       // 19
  "}",                                                      // 20
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "outer_init"
  | "inner_check_match"
  | "inner_check_no_match"
  | "inner_break"
  | "check_found_true"
  | "check_found_false"
  | "done";

type Step = {
  kind:        StepKind;
  lines:       number[];
  description: string;
  num:         number;     // value of outer-loop variable
  j:           number | null;
  found:       boolean;
  result:      number | null;
};

function simulate(nums: number[]): Step[] {
  const steps: Step[] = [];
  const n = nums.length;

  function snap(s: Step) {
    steps.push(s);
  }

  for (let num = 0; num <= n; num++) {
    let found = false;

    snap({
      kind: "outer_init",
      lines: [5, 6],
      description: `Start searching for num = ${num}. Reset found = false.`,
      num,
      j: null,
      found: false,
      result: null,
    });

    let brokeOut = false;
    for (let j = 0; j < n; j++) {
      if (num === nums[j]) {
        found = true;
        snap({
          kind: "inner_check_match",
          lines: [9, 10],
          description: `nums[${j}] = ${nums[j]} matches num = ${num} → set found = true.`,
          num,
          j,
          found: true,
          result: null,
        });
        snap({
          kind: "inner_break",
          lines: [11],
          description: `Break out of the inner loop — no need to check further.`,
          num,
          j,
          found: true,
          result: null,
        });
        brokeOut = true;
        break;
      } else {
        snap({
          kind: "inner_check_no_match",
          lines: [9],
          description: `nums[${j}] = ${nums[j]} ≠ num = ${num} → keep scanning.`,
          num,
          j,
          found: false,
          result: null,
        });
      }
    }

    if (found) {
      snap({
        kind: "check_found_true",
        lines: [15],
        description: `found = true → ${num} exists in nums. Move on to num = ${num + 1}.`,
        num,
        j: brokeOut ? null : null,
        found: true,
        result: null,
      });
    } else {
      snap({
        kind: "check_found_false",
        lines: [15],
        description: `found = false → ${num} is missing from nums. Return ${num}.`,
        num,
        j: null,
        found: false,
        result: num,
      });
      snap({
        kind: "done",
        lines: [15],
        description: `Answer: missing number = ${num}.`,
        num,
        j: null,
        found: false,
        result: num,
      });
      return steps;
    }
  }

  // Fallback (unreachable for valid inputs)
  snap({
    kind: "done",
    lines: [18],
    description: `No missing number found in range [0, n]. Return -1.`,
    num: n,
    j: null,
    found: true,
    result: -1,
  });

  return steps;
}

// ─── Array display ────────────────────────────────────────────────────────────

const CELL_W = 44;
const CELL_H = 44;
const GAP    = 4;

function PointerCell({
  labels,
}: { labels: { text: string; color: string }[] }) {
  return (
    <div style={{
      width: CELL_W, height: 26,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
      flexShrink: 0,
    }}>
      {labels.length > 0 ? (
        <>
          <div style={{
            display: "flex", gap: 3,
            fontSize: 11, fontWeight: 700,
            fontFamily: "monospace", lineHeight: 1,
          }}>
            {labels.map((l, idx) => (
              <span key={idx} style={{ color: l.color }}>{l.text}</span>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1, marginTop: 2 }}>▼</div>
        </>
      ) : null}
    </div>
  );
}

function ArrayDisplay({
  nums, num, j, kind, result,
}: {
  nums: number[];
  num:  number;
  j:    number | null;
  kind: StepKind | null;
  result: number | null;
}) {
  const isActive = (idx: number) => j !== null && idx === j;
  const isMatch  = (idx: number) =>
    j !== null && idx === j && (kind === "inner_check_match" || kind === "inner_break");
  const isNoMatch = (idx: number) =>
    j !== null && idx === j && kind === "inner_check_no_match";

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>

        {/* Pointers row */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((_, idx) => {
            const labels: { text: string; color: string }[] = [];
            if (j !== null && idx === j) {
              labels.push({ text: "j", color: "#f59e0b" });
            }
            return <PointerCell key={idx} labels={labels} />;
          })}
        </div>

        {/* Cells */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((val, idx) => {
            const active   = isActive(idx);
            const match    = isMatch(idx);
            const noMatch  = isNoMatch(idx);

            let bg = "#f9fafb", border = "#e5e7eb", color = "#6b7280";

            if (match) {
              bg = "#dcfce7"; border = "#10b981"; color = "#065f46";
            } else if (noMatch) {
              bg = "#fee2e2"; border = "#fca5a5"; color = "#991b1b";
            } else if (active) {
              bg = "#fef3c7"; border = "#f59e0b"; color = "#92400e";
            }

            return (
              <div key={idx} style={{
                width: CELL_W, height: CELL_H,
                background: bg,
                border: `2px solid ${border}`,
                color, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "monospace", fontSize: 16, fontWeight: 700,
                transition: "background 0.2s, border-color 0.2s, color 0.2s",
                flexShrink: 0,
              }}>
                {val}
              </div>
            );
          })}
        </div>

        {/* Index labels */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((_, idx) => (
            <div key={idx} style={{
              width: CELL_W, textAlign: "center",
              fontSize: 10, color: "#9ca3af", fontFamily: "monospace",
              flexShrink: 0,
            }}>
              {idx}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stats panel ──────────────────────────────────────────────────────────────

function StatPill({
  label, value, labelColor,
}: { label: string; value: string; labelColor?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "monospace", fontSize: 11,
    }}>
      <span style={{ color: labelColor ?? "#9ca3af", fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#374151", fontWeight: 600 }}>= {value}</span>
    </div>
  );
}

// ─── Algorithm panel ──────────────────────────────────────────────────────────

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.55]">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum  = idx + 1;
        const isActive = activeLines.includes(lineNum);
        const isComment = line.trim().startsWith("//");
        return (
          <div
            key={lineNum}
            className={`flex transition-colors duration-150 rounded ${
              isActive ? "bg-amber-100/80" : ""
            }`}
          >
            <span className="w-7 text-right text-gray-300 pr-2 select-none tabular-nums">
              {lineNum}
            </span>
            <span className={`flex-1 whitespace-pre ${
              isActive
                ? "text-amber-900 font-semibold"
                : isComment
                ? "text-emerald-700/70 italic"
                : "text-gray-600"
            }`}>
              {line || "\u00A0"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_PRESET = "[3,0,1]";

export default function MissingNumberNestedVisualizer() {
  const [presetKey, setPresetKey] = useState<string>(DEFAULT_PRESET);
  const [nums, setNums]           = useState<number[]>(() => parseArray(PRESETS[DEFAULT_PRESET]));
  const [steps, setSteps]         = useState<Step[]>(() => simulate(parseArray(PRESETS[DEFAULT_PRESET])));
  const [step, setStep]           = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadPreset = useCallback((key: string) => {
    const arr = parseArray(PRESETS[key]);
    setPresetKey(key);
    setNums(arr);
    setSteps(simulate(arr));
    setStep(0);
    setIsPlaying(false);
  }, []);

  const isDone = step >= steps.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const cur         = step > 0 ? steps[step - 1] : null;
  const description = cur?.description
    ?? "Press Step or Start to walk through the nested-loop algorithm. Pick a preset below to try a different array.";
  const kind        = cur?.kind  ?? null;
  const lines       = cur?.lines ?? [];

  const n           = nums.length;
  const num         = cur?.num    ?? 0;
  const j           = cur?.j      ?? null;
  const found       = cur?.found  ?? false;
  const result      = cur?.result ?? null;

  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : null;

  const kindLabel: Record<StepKind, string> = {
    outer_init:           "Outer",
    inner_check_match:    "Match",
    inner_check_no_match: "Scan",
    inner_break:          "Break",
    check_found_true:     "Continue",
    check_found_false:    "Missing!",
    done:                 "Done",
  };

  const kindColor: Record<StepKind, string> = {
    outer_init:           "text-sky-500",
    inner_check_match:    "text-emerald-600",
    inner_check_no_match: "text-amber-600",
    inner_break:          "text-emerald-600",
    check_found_true:     "text-gray-400",
    check_found_false:    "text-rose-600",
    done:                 "text-emerald-600",
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Header: sample inputs ── */}
      <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-3 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
          Sample inputs
        </span>
        {Object.entries(PRESETS).map(([key]) => (
          <button
            key={key}
            type="button"
            onClick={() => loadPreset(key)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
              presetKey === key
                ? "border-gray-400 bg-white text-gray-800"
                : "border-gray-200 text-gray-500 hover:bg-white"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* ── Main split: array (left) | algorithm (right) ── */}
      <div className="flex divide-x divide-gray-100">

        {/* Left: array + stats + legend */}
        <div className="w-[380px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-4">

          {/* Searching-for banner */}
          <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wide text-sky-600 font-semibold">
              Searching for
            </span>
            <span className="font-mono text-sm font-bold text-sky-700">
              num = {kind ? num : "—"}
            </span>
          </div>

          <ArrayDisplay
            nums={nums}
            num={num}
            j={j}
            kind={kind}
            result={result}
          />

          {/* Stats */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
            <StatPill label="n" value={String(n)} />
            <StatPill label="num" value={kind ? String(num) : "—"} labelColor="#0ea5e9" />
            <StatPill label="j" value={j === null ? "—" : String(j)} labelColor="#f59e0b" />
            <StatPill
              label="found"
              value={kind ? String(found) : "—"}
              labelColor={found ? "#10b981" : "#9ca3af"}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-[10px] mt-auto pt-2">
            {[
              { fill: "#fef3c7", stroke: "#f59e0b", label: "Pointer j" },
              { fill: "#dcfce7", stroke: "#10b981", label: "Match" },
              { fill: "#fee2e2", stroke: "#fca5a5", label: "No match" },
              { fill: "#f9fafb", stroke: "#e5e7eb", label: "Idle" },
            ].map(({ fill, stroke, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: 2,
                  background: fill, border: `1.5px solid ${stroke}`,
                }} />
                <span style={{ color: "#6b7280" }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: algorithm code + step description */}
        <div className="flex-1 min-w-0 bg-gray-50/60 px-5 pt-5 pb-5 flex flex-col gap-3">
          <AlgorithmPanel activeLines={lines} />

          {/* Step kind + description */}
          <div className="flex flex-col gap-1 mt-2 pt-3 border-t border-gray-200/70">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              kind ? kindColor[kind] : "text-gray-400"
            }`}>
              {kind ? kindLabel[kind] : "Ready"}
            </span>
            <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* Final result banner */}
          {isDone && finalResult !== null && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-center ${
              finalResult >= 0
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}>
              {finalResult >= 0
                ? `✓ Missing number = ${finalResult}`
                : `✗ No missing number — return -1`}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-3.5 flex flex-col gap-2.5">

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isDone) { setStep(0); setIsPlaying(false); }
              else setIsPlaying((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => { if (!isDone && !isPlaying) setStep((s) => s + 1); }}
            disabled={isPlaying || isDone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <SkipForward size={13} /> Step
          </button>
          <button
            type="button"
            onClick={() => { setStep(0); setIsPlaying(false); }}
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
    </div>
  );
}
