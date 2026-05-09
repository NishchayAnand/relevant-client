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
  "  int minSwaps = Integer.MAX_VALUE;",              // 10
  "  for (int i = 0; i <= n - k; i++) {",             // 11
  "    int zerosCount = 0;",                          // 12
  "    for (int j = 0; j < k; j++) {",                // 13
  "      if (nums[i + j] == 0) zerosCount++;",        // 14
  "    }",                                            // 15
  "    minSwaps = Math.min(minSwaps, zerosCount);",   // 16
  "  }",                                              // 17
  "",                                                 // 18
  "  return minSwaps;",                               // 19
  "}",                                                // 20
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "count_check"
  | "check_k"
  | "init_min"
  | "outer_init"
  | "inner_check"
  | "update_min"
  | "done";

type Step = {
  kind:        StepKind;
  lines:       number[];
  description: string;
  countPos:    number | null;
  i:           number | null;
  j:           number | null;
  k:           number;
  zerosCount:  number;
  minSwaps:    number | null;        // null = not initialized yet (∞)
  result:      number | null;
  bestI:       number | null;        // index where current min came from
};

const INF = Number.POSITIVE_INFINITY;

function simulate(nums: number[]): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  let k = 0;

  function snap(s: Omit<Step, "k"> & Partial<Pick<Step, "k">>) {
    steps.push({ k, ...s } as Step);
  }

  // ── Count phase ───────────────────────────────────────────────────────────
  for (let c = 0; c < n; c++) {
    if (nums[c] === 1) k++;
    snap({
      kind: "count_check",
      lines: [5],
      description: nums[c] === 1
        ? `nums[${c}] = 1 → k = ${k}.`
        : `nums[${c}] = 0 → skip.`,
      countPos:    c,
      i: null, j: null, zerosCount: 0,
      minSwaps: null, result: null, bestI: null,
    });
  }

  // ── Check k threshold ────────────────────────────────────────────────────
  if (k <= 1) {
    snap({
      kind: "check_k",
      lines: [8],
      description: `k = ${k} ≤ 1 → return -1.`,
      countPos:   null,
      i: null, j: null, zerosCount: 0,
      minSwaps: null, result: -1, bestI: null,
    });
    return steps;
  }

  snap({
    kind: "check_k",
    lines: [8],
    description: `k = ${k} > 1 → proceed to find the minimum.`,
    countPos:   null,
    i: null, j: null, zerosCount: 0,
    minSwaps: null, result: null, bestI: null,
  });

  // ── Initialize minSwaps ───────────────────────────────────────────────────
  let minSwaps = INF;
  let bestI: number | null = null;

  snap({
    kind: "init_min",
    lines: [10],
    description: `Initialize minSwaps = +∞ (Integer.MAX_VALUE).`,
    countPos:   null,
    i: null, j: null, zerosCount: 0,
    minSwaps: null, result: null, bestI: null,
  });

  // ── Search phase ─────────────────────────────────────────────────────────
  for (let i = 0; i <= n - k; i++) {
    let zerosCount = 0;

    snap({
      kind: "outer_init",
      lines: [12],
      description: `Window starts at i = ${i} → reset zerosCount = 0.`,
      countPos:   null,
      i, j: null, zerosCount: 0,
      minSwaps: minSwaps === INF ? null : minSwaps,
      result: null, bestI,
    });

    for (let j = 0; j < k; j++) {
      if (nums[i + j] === 0) zerosCount++;
      snap({
        kind: "inner_check",
        lines: [14],
        description: nums[i + j] === 0
          ? `nums[${i + j}] = 0 → zerosCount = ${zerosCount}.`
          : `nums[${i + j}] = 1 → skip.`,
        countPos:   null,
        i, j, zerosCount,
        minSwaps: minSwaps === INF ? null : minSwaps,
        result: null, bestI,
      });
    }

    const prev = minSwaps;
    if (zerosCount < minSwaps) {
      minSwaps = zerosCount;
      bestI = i;
    }
    snap({
      kind: "update_min",
      lines: [16],
      description: `minSwaps = min(${prev === INF ? "∞" : prev}, ${zerosCount}) = ${minSwaps}.`,
      countPos:   null,
      i, j: null, zerosCount,
      minSwaps, result: null, bestI,
    });
  }

  snap({
    kind: "done",
    lines: [19],
    description: `Done. Return minSwaps = ${minSwaps}.`,
    countPos:   null,
    i: bestI, j: null, zerosCount: 0,
    minSwaps, result: minSwaps, bestI,
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
  nums, countPos, i, j, k, finalI,
}: {
  nums: number[];
  countPos: number | null;
  i: number | null;
  j: number | null;
  k: number;
  finalI: number | null;  // for "done" highlight
}) {
  const inWindow      = (idx: number) => i !== null && idx >= i && idx < i + k;
  const isInnerActive = (idx: number) => i !== null && j !== null && idx === i + j;
  const isCountActive = (idx: number) => countPos === idx;
  const inFinalWindow = (idx: number) => finalI !== null && idx >= finalI && idx < finalI + k;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>

        {/* Pointers row */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((_, idx) => {
            const labels: { text: string; color: string }[] = [];
            if (countPos === idx) labels.push({ text: "c", color: "#6b7280" });
            if (i !== null && j === null && idx === i) labels.push({ text: "i", color: "#0ea5e9" });
            if (i !== null && j !== null) {
              if (idx === i)        labels.push({ text: "i", color: "#0ea5e9" });
              if (idx === i + j)    labels.push({ text: "j", color: "#f59e0b" });
            }
            return <PointerCell key={idx} labels={labels} />;
          })}
        </div>

        {/* Cells */}
        <div style={{ display: "flex", gap: GAP }}>
          {nums.map((val, idx) => {
            const win    = inWindow(idx);
            const final  = inFinalWindow(idx);
            const innerA = isInnerActive(idx);
            const countA = isCountActive(idx);

            let bg = "#f9fafb", border = "#e5e7eb", color = "#9ca3af";

            if (final) {
              bg = "#dcfce7"; border = "#10b981"; color = val === 0 ? "#991b1b" : "#065f46";
            } else if (win) {
              bg = val === 0 ? "#fee2e2" : "#dcfce7";
              border = val === 0 ? "#fca5a5" : "#86efac";
              color = val === 0 ? "#991b1b" : "#166534";
            }
            if (innerA || countA) {
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
                transition: "background 0.2s, border-color 0.2s",
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

const DEFAULT_PRESET = "[1,0,1,0,1]";

export default function MinSwapsBruteForceVisualizer() {
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
    ?? "Press Step or Start to walk through the brute-force algorithm. Pick a preset below to try a different array.";
  const kind        = cur?.kind  ?? null;
  const lines       = cur?.lines ?? [];

  const k          = cur?.k          ?? 0;
  const i          = cur?.i          ?? null;
  const j          = cur?.j          ?? null;
  const countPos   = cur?.countPos   ?? null;
  const zerosCount = cur?.zerosCount ?? 0;
  const minSwaps   = cur?.minSwaps   ?? null;
  const result     = cur?.result     ?? null;

  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : null;
  const finalBest   = isDone ? steps[steps.length - 1].bestI ?? null : null;

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
            countPos={countPos}
            i={i}
            j={j}
            k={k > 0 ? k : Math.max(1, k)}
            finalI={result !== null && result >= 0 ? finalBest : null}
          />

          {/* Stats */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
            <StatPill label="k" value={String(k)} />
            {countPos !== null && (
              <StatPill label="c" value={String(countPos)} labelColor="#6b7280" />
            )}
            {i !== null && (
              <StatPill label="i" value={String(i)} labelColor="#0ea5e9" />
            )}
            {j !== null && (
              <StatPill label="j" value={String(j)} labelColor="#f59e0b" />
            )}
            {(kind === "outer_init" || kind === "inner_check" || kind === "update_min") && (
              <StatPill label="zerosCount" value={String(zerosCount)} />
            )}
            <StatPill label="minSwaps" value={minSwaps === null ? "∞" : String(minSwaps)} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-[10px] mt-auto pt-2">
            {[
              { fill: "#fef3c7", stroke: "#f59e0b", label: "Active pointer" },
              { fill: "#dcfce7", stroke: "#86efac", label: "Window: 1" },
              { fill: "#fee2e2", stroke: "#fca5a5", label: "Window: 0" },
              { fill: "#f9fafb", stroke: "#e5e7eb", label: "Outside window" },
              { fill: "#dcfce7", stroke: "#10b981", label: "Best window" },
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
          <div className="flex flex-col gap-2">
            <AlgorithmPanel activeLines={lines} />
          </div>

          {/* Step kind + description */}
          <div className="flex flex-col gap-1 mt-2 pt-3 border-t border-gray-200/70">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              kind === "count_check" ? "text-gray-400"   :
              kind === "check_k"     ? (result === -1 ? "text-red-500" : "text-gray-400") :
              kind === "init_min"    ? "text-gray-400"   :
              kind === "outer_init"  ? "text-sky-500"    :
              kind === "inner_check" ? "text-amber-600"  :
              kind === "update_min"  ? "text-emerald-600":
              kind === "done"        ? "text-emerald-600":
                                       "text-gray-400"
            }`}>
              {kind === "count_check" ? "Count 1s"   :
               kind === "check_k"     ? "Check k"    :
               kind === "init_min"    ? "Init"       :
               kind === "outer_init"  ? "Window"     :
               kind === "inner_check" ? "Scan"       :
               kind === "update_min"  ? "Update min" :
               kind === "done"        ? "Done"       :
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

        {/* Controls row */}
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
