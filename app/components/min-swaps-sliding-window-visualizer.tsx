"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, string> = {
  "[1,0,1,0,1]":         "1,0,1,0,1",
  "[1,0,0,1,0,1]":       "1,0,0,1,0,1",
  "[1,1,0,0,1,1,1,1]":   "1,1,0,0,1,1,1,1",
  "[0,0,0,0]":           "0,0,0,0",
};

function parseArray(s: string): number[] {
  const tokens = s.split(",").map(t => t.trim()).filter(t => t.length > 0);
  return tokens.map(t => {
    const v = Number(t);
    if (v !== 0 && v !== 1) throw new Error(`Invalid value "${t}" — expected 0 or 1`);
    return v;
  });
}

// ─── Algorithm shown on the right panel ──────────────────────────────────────

const ALGORITHM_LINES = [
  "int minSwaps(int[] nums) {",                       //  1
  "  int n = nums.length;",                           //  2
  "  int k = 0;",                                     //  3
  "  for (int num : nums) {",                         //  4
  "    if (num == 1) k++;",                           //  5
  "  }",                                              //  6
  "",                                                 //  7
  "  if (k <= 1) return -1;",                         //  8
  "",                                                 //  9
  "  int zerosCount = 0;",                            // 10
  "  for (int i = 0; i < k; i++) {",                  // 11
  "    if (nums[i] == 0) zerosCount++;",              // 12
  "  }",                                              // 13
  "",                                                 // 14
  "  int minSwaps = zerosCount;",                     // 15
  "",                                                 // 16
  "  for (int i = k; i < n; i++) {",                  // 17
  "    if (nums[i - k] == 0) zerosCount--;",          // 18
  "    if (nums[i]     == 0) zerosCount++;",          // 19
  "    minSwaps = Math.min(minSwaps, zerosCount);",   // 20
  "  }",                                              // 21
  "",                                                 // 22
  "  return minSwaps;",                               // 23
  "}",                                                // 24
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "count_check"
  | "check_k"
  | "first_init"
  | "first_check"
  | "init_min"
  | "slide_outgoing"
  | "slide_incoming"
  | "slide_update_min"
  | "done";

type Step = {
  kind:        StepKind;
  lines:       number[];
  description: string;

  countPos:    number | null;   // count loop pointer (c)
  firstJ:      number | null;   // first-window loop pointer (j)
  slideI:      number | null;   // slide loop pointer (i)
  outgoingIdx: number | null;   // i - k (only set during slide_outgoing)
  incomingIdx: number | null;   // i     (only set during slide_incoming)

  winStart:    number | null;
  winEnd:      number | null;

  k:           number;
  zerosCount:  number | null;
  minSwaps:    number | null;
  result:      number | null;
  bestStart:   number | null;
};

function simulate(nums: number[]): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  let k = 0;

  function snap(s: Omit<Step, "k"> & Partial<Pick<Step, "k">>) {
    steps.push({ k, ...s } as Step);
  }

  // ── Phase 1: count 1s ───────────────────────────────────────────────────
  for (let c = 0; c < n; c++) {
    if (nums[c] === 1) k++;
    snap({
      kind: "count_check",
      lines: [5],
      description: nums[c] === 1
        ? `nums[${c}] = 1 → k = ${k}.`
        : `nums[${c}] = 0 → skip.`,
      countPos: c, firstJ: null, slideI: null,
      outgoingIdx: null, incomingIdx: null,
      winStart: null, winEnd: null,
      zerosCount: null, minSwaps: null, result: null, bestStart: null,
    });
  }

  // ── Phase 2: check k threshold ─────────────────────────────────────────
  if (k <= 1) {
    snap({
      kind: "check_k",
      lines: [8],
      description: `k = ${k} ≤ 1 → return -1.`,
      countPos: null, firstJ: null, slideI: null,
      outgoingIdx: null, incomingIdx: null,
      winStart: null, winEnd: null,
      zerosCount: null, minSwaps: null, result: -1, bestStart: null,
    });
    return steps;
  }

  snap({
    kind: "check_k",
    lines: [8],
    description: `k = ${k} > 1 → count zeros in the first window of size ${k}.`,
    countPos: null, firstJ: null, slideI: null,
    outgoingIdx: null, incomingIdx: null,
    winStart: null, winEnd: null,
    zerosCount: null, minSwaps: null, result: null, bestStart: null,
  });

  // ── Phase 3: first window ──────────────────────────────────────────────
  let zerosCount = 0;
  snap({
    kind: "first_init",
    lines: [10],
    description: `Initialize zerosCount = 0 for the first window [0, ${k - 1}].`,
    countPos: null, firstJ: null, slideI: null,
    outgoingIdx: null, incomingIdx: null,
    winStart: 0, winEnd: k - 1,
    zerosCount: 0, minSwaps: null, result: null, bestStart: null,
  });

  for (let j = 0; j < k; j++) {
    if (nums[j] === 0) zerosCount++;
    snap({
      kind: "first_check",
      lines: [12],
      description: nums[j] === 0
        ? `nums[${j}] = 0 → zerosCount = ${zerosCount}.`
        : `nums[${j}] = 1 → skip.`,
      countPos: null, firstJ: j, slideI: null,
      outgoingIdx: null, incomingIdx: null,
      winStart: 0, winEnd: k - 1,
      zerosCount, minSwaps: null, result: null, bestStart: null,
    });
  }

  // ── Phase 4: init minSwaps ─────────────────────────────────────────────
  let minSwaps = zerosCount;
  let bestStart = 0;
  snap({
    kind: "init_min",
    lines: [15],
    description: `minSwaps = zerosCount = ${minSwaps}. The first window needs ${minSwaps} swap${minSwaps === 1 ? "" : "s"}.`,
    countPos: null, firstJ: null, slideI: null,
    outgoingIdx: null, incomingIdx: null,
    winStart: 0, winEnd: k - 1,
    zerosCount, minSwaps, result: null, bestStart,
  });

  // ── Phase 5: slide ────────────────────────────────────────────────────
  for (let i = k; i < n; i++) {
    const outIdx     = i - k;
    const wasOutZero = nums[outIdx] === 0;
    if (wasOutZero) zerosCount--;
    snap({
      kind: "slide_outgoing",
      lines: [18],
      description: wasOutZero
        ? `Outgoing nums[${outIdx}] = 0 → zerosCount-- = ${zerosCount}.`
        : `Outgoing nums[${outIdx}] = 1 → no change.`,
      countPos: null, firstJ: null, slideI: i,
      outgoingIdx: outIdx, incomingIdx: null,
      winStart: outIdx, winEnd: i - 1, // OLD window — outgoing cell is still inside
      zerosCount, minSwaps, result: null, bestStart,
    });

    const isInZero = nums[i] === 0;
    if (isInZero) zerosCount++;
    snap({
      kind: "slide_incoming",
      lines: [19],
      description: isInZero
        ? `Incoming nums[${i}] = 0 → zerosCount++ = ${zerosCount}.`
        : `Incoming nums[${i}] = 1 → no change.`,
      countPos: null, firstJ: null, slideI: i,
      outgoingIdx: null, incomingIdx: i,
      winStart: outIdx + 1, winEnd: i,  // NEW window — incoming cell is rightmost
      zerosCount, minSwaps, result: null, bestStart,
    });

    const prev = minSwaps;
    if (zerosCount < minSwaps) {
      minSwaps = zerosCount;
      bestStart = outIdx + 1;
    }
    snap({
      kind: "slide_update_min",
      lines: [20],
      description: zerosCount < prev
        ? `minSwaps = min(${prev}, ${zerosCount}) = ${minSwaps}. New best window!`
        : `minSwaps = min(${prev}, ${zerosCount}) = ${minSwaps}.`,
      countPos: null, firstJ: null, slideI: i,
      outgoingIdx: null, incomingIdx: null,
      winStart: outIdx + 1, winEnd: i,
      zerosCount, minSwaps, result: null, bestStart,
    });
  }

  // ── Phase 6: done ─────────────────────────────────────────────────────
  snap({
    kind: "done",
    lines: [23],
    description: `Done. Return minSwaps = ${minSwaps}.`,
    countPos: null, firstJ: null, slideI: null,
    outgoingIdx: null, incomingIdx: null,
    winStart: bestStart, winEnd: bestStart + k - 1,
    zerosCount: null, minSwaps, result: minSwaps, bestStart,
  });

  return steps;
}

// ─── Array display ────────────────────────────────────────────────────────────

const CELL_W = 40;
const CELL_H = 40;
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
          <div style={{ display: "flex", gap: 3, fontSize: 11, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }}>
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
  nums, step, isDone, finalBest, k,
}: {
  nums: number[];
  step: Step | null;
  isDone: boolean;
  finalBest: number | null;
  k: number;
}) {
  const countPos    = step?.countPos    ?? null;
  const firstJ      = step?.firstJ      ?? null;
  const slideI      = step?.slideI      ?? null;
  const outgoingIdx = step?.outgoingIdx ?? null;
  const incomingIdx = step?.incomingIdx ?? null;
  const winStart    = step?.winStart    ?? null;
  const winEnd      = step?.winEnd      ?? null;

  const inWindow = (idx: number) =>
    winStart !== null && winEnd !== null && idx >= winStart && idx <= winEnd;
  const inFinalWindow = (idx: number) =>
    isDone && finalBest !== null && idx >= finalBest && idx < finalBest + k;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>

        {/* Pointers */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((_, idx) => {
            const labels: { text: string; color: string }[] = [];
            if (countPos === idx) labels.push({ text: "c", color: "#6b7280" });
            if (firstJ   === idx) labels.push({ text: "j", color: "#f59e0b" });
            if (outgoingIdx === idx) labels.push({ text: "i−k", color: "#dc2626" });
            if (slideI === idx)      labels.push({ text: "i",   color: "#0ea5e9" });
            return <PointerCell key={idx} labels={labels} />;
          })}
        </div>

        {/* Cells */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((val, idx) => {
            const win    = inWindow(idx);
            const final  = inFinalWindow(idx);
            const isOut  = outgoingIdx === idx;
            const isIn   = incomingIdx === idx;
            const countA = countPos === idx;
            const firstA = firstJ === idx;

            let bg = "#f9fafb", border = "#e5e7eb", color = "#9ca3af";
            let outline = "none";

            if (final) {
              bg = "#d1fae5"; border = "#10b981"; color = "#065f46";
            } else if (win) {
              bg = val === 0 ? "#fee2e2" : "#dcfce7";
              border = val === 0 ? "#fca5a5" : "#86efac";
              color = val === 0 ? "#991b1b" : "#166534";
            }

            if (countA || firstA) {
              bg = "#fef3c7"; border = "#f59e0b"; color = "#92400e";
            }
            if (isOut) outline = "2px solid #dc2626";
            if (isIn)  outline = "2px solid #10b981";

            return (
              <div key={idx} style={{
                width: CELL_W, height: CELL_H,
                background: bg,
                border: `2px solid ${border}`,
                color, borderRadius: 8,
                outline, outlineOffset: -1,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "monospace", fontSize: 16, fontWeight: 700,
                transition: "background 0.2s, border-color 0.2s, outline 0.2s",
                flexShrink: 0,
              }}>
                {val}
              </div>
            );
          })}
        </div>

        {/* Indices */}
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

// ─── Stats pill ───────────────────────────────────────────────────────────────

function StatPill({ label, value, labelColor }: { label: string; value: string; labelColor?: string }) {
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
              isActive ? "text-amber-900 font-semibold" : "text-gray-600"
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

const DEFAULT_PRESET = "[1,1,0,0,1,1,1,1]";

export default function MinSwapsSlidingWindowVisualizer() {
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
    const t = setTimeout(() => setStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const cur         = step > 0 ? steps[step - 1] : null;
  const description = cur?.description
    ?? "Press Step or Start to walk through the sliding-window algorithm. Pick a sample input above to try a different array.";
  const kind        = cur?.kind  ?? null;
  const lines       = cur?.lines ?? [];

  const k          = cur?.k          ?? 0;
  const slideI     = cur?.slideI     ?? null;
  const firstJ     = cur?.firstJ     ?? null;
  const countPos   = cur?.countPos   ?? null;
  const zerosCount = cur?.zerosCount ?? null;
  const minSwaps   = cur?.minSwaps   ?? null;
  const result     = cur?.result     ?? null;

  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : null;
  const finalBest   = isDone ? steps[steps.length - 1].bestStart ?? null : null;

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
        <div className="w-[360px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-4">
          <ArrayDisplay
            nums={nums}
            step={cur}
            isDone={isDone && result !== null && result >= 0}
            finalBest={finalBest}
            k={k > 0 ? k : 1}
          />

          {/* Stats */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
            <StatPill label="k" value={String(k)} />
            {countPos !== null && (
              <StatPill label="c" value={String(countPos)} labelColor="#6b7280" />
            )}
            {firstJ !== null && (
              <StatPill label="j" value={String(firstJ)} labelColor="#f59e0b" />
            )}
            {slideI !== null && (
              <StatPill label="i" value={String(slideI)} labelColor="#0ea5e9" />
            )}
            {zerosCount !== null && (
              <StatPill label="zerosCount" value={String(zerosCount)} />
            )}
            <StatPill label="minSwaps" value={minSwaps === null ? "—" : String(minSwaps)} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-[10px] mt-auto pt-2">
            {[
              { fill: "#fef3c7", stroke: "#f59e0b", label: "Active pointer" },
              { fill: "#dcfce7", stroke: "#86efac", label: "Window: 1" },
              { fill: "#fee2e2", stroke: "#fca5a5", label: "Window: 0" },
              { fill: "#fef3c7", stroke: "#dc2626", label: "Outgoing", outline: true },
              { fill: "#fef3c7", stroke: "#10b981", label: "Incoming", outline: true },
              { fill: "#d1fae5", stroke: "#10b981", label: "Best window" },
              { fill: "#f9fafb", stroke: "#e5e7eb", label: "Outside" },
            ].map(({ fill, stroke, label, outline }) => (
              <span key={label} className="flex items-center gap-1">
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: 2,
                  background: outline ? "#fff" : fill,
                  border: `1.5px solid ${outline ? "#e5e7eb" : stroke}`,
                  outline: outline ? `1.5px solid ${stroke}` : "none",
                  outlineOffset: outline ? -1 : 0,
                }} />
                <span style={{ color: "#6b7280" }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: algorithm code + step description */}
        <div className="flex-1 min-w-0 bg-gray-50/60 px-5 pt-5 pb-5 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <AlgorithmPanel activeLines={lines} />
          </div>

          {/* Step kind + description */}
          <div className="flex flex-col gap-1 mt-2 pt-3 border-t border-gray-200/70">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              kind === "count_check"      ? "text-gray-400"   :
              kind === "check_k"          ? (result === -1 ? "text-red-500" : "text-gray-400") :
              kind === "first_init"       ? "text-gray-400"   :
              kind === "first_check"      ? "text-amber-600"  :
              kind === "init_min"         ? "text-gray-500"   :
              kind === "slide_outgoing"   ? "text-red-500"    :
              kind === "slide_incoming"   ? "text-emerald-600":
              kind === "slide_update_min" ? "text-sky-600"    :
              kind === "done"             ? "text-emerald-600":
                                            "text-gray-400"
            }`}>
              {kind === "count_check"      ? "Count 1s"   :
               kind === "check_k"          ? "Check k"    :
               kind === "first_init"       ? "First window" :
               kind === "first_check"      ? "First scan" :
               kind === "init_min"         ? "Init min"   :
               kind === "slide_outgoing"   ? "Outgoing"   :
               kind === "slide_incoming"   ? "Incoming"   :
               kind === "slide_update_min" ? "Update min" :
               kind === "done"             ? "Done"       :
                                             "Ready"}
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
                ? `✓ Minimum swaps = ${finalResult}`
                : `✗ Cannot group — return -1`}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (isDone) { setStep(0); setIsPlaying(false); }
              else setIsPlaying(prev => !prev);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
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
