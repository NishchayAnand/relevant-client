"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_NUMS: number[] = [2, 7, 9, 3, 1];

const CELL_W    = 40;
const CELL_GAP  = 8;
const CELL_STEP = CELL_W + CELL_GAP; // 48px per cell

// ─── Types & simulation ───────────────────────────────────────────────────────

type StepData = {
  i: number;
  include: number;
  exclude: number;
  result: number;
  dpSnapshot: number[];
};

function computeSteps(nums: number[]): StepData[] {
  const n  = nums.length;
  const dp = Array.from<number>({ length: n }).fill(-1);
  const steps: StepData[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const include = i + 2 < n ? nums[i] + dp[i + 2] : nums[i];
    const exclude = i + 1 < n ? dp[i + 1] : 0;
    dp[i] = Math.max(include, exclude);
    steps.push({ i, include, exclude, result: dp[i], dpSnapshot: [...dp] });
  }

  return steps;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellCX(i: number): number {
  return i * CELL_STEP + CELL_W / 2;
}

function getExplanation(
  data: StepData | null,
  nums: number[],
  step: number,
): string {
  if (step === 0) {
    return (
      "Bottom-up DP: iterate right → left, filling dp[] from the last house to the first. " +
      "Each dp[i] = max(rob house i, skip house i). Press Play or Step → to begin."
    );
  }
  if (!data) return "";

  const { i, include, exclude, result } = data;
  const n = nums.length;

  const inclExpr =
    i + 2 < n
      ? `nums[${i}] + dp[${i + 2}] = ${nums[i]} + ${data.dpSnapshot[i + 2]} = ${include}`
      : `nums[${i}] = ${nums[i]}  (dp[${i + 2}] is out of bounds → 0)`;

  const exclExpr =
    i + 1 < n
      ? `dp[${i + 1}] = ${exclude}`
      : `0  (dp[${i + 1}] is out of bounds)`;

  return (
    `Computing dp[${i}]: ` +
    `include = ${inclExpr};  ` +
    `exclude = ${exclExpr};  ` +
    `dp[${i}] = max(${include}, ${exclude}) = ${result}.`
  );
}

// ─── Dependency arrows SVG ────────────────────────────────────────────────────

function DependencyArrows({
  currentI,
  n,
}: {
  currentI: number | null;
  n: number;
}) {
  const svgW = n * CELL_STEP - CELL_GAP;
  const ARC1 = 24; // depth for i+1 → i
  const ARC2 = 42; // depth for i+2 → i (deeper to avoid overlap)

  if (currentI === null) {
    return <div style={{ height: ARC2 + 10 }} />;
  }

  const tgt = cellCX(currentI);

  const excSrc = currentI + 1 < n ? cellCX(currentI + 1) : null;
  const incSrc = currentI + 2 < n ? cellCX(currentI + 2) : null;

  return (
    <svg
      width={svgW}
      height={ARC2 + 10}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <marker
          id="tab-arr-exc"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#2563EB" />
        </marker>
        <marker
          id="tab-arr-inc"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#16A34A" />
        </marker>
      </defs>

      {/* exclude: dp[i+1] → dp[i] */}
      {excSrc !== null && (
        <g>
          <path
            d={`M ${excSrc} 2 C ${excSrc} ${ARC1 + 4}, ${tgt} ${ARC1 + 4}, ${tgt} 2`}
            fill="none"
            stroke="#2563EB"
            strokeWidth={1.5}
            markerEnd="url(#tab-arr-exc)"
          />
          <text
            x={(excSrc + tgt) / 2}
            y={ARC1 + 16}
            textAnchor="middle"
            fontSize={9}
            fill="#2563EB"
            fontWeight={600}
          >
            skip
          </text>
        </g>
      )}

      {/* include: dp[i+2] → dp[i] */}
      {incSrc !== null && (
        <g>
          <path
            d={`M ${incSrc} 2 C ${incSrc} ${ARC2 + 2}, ${tgt} ${ARC2 + 2}, ${tgt} 2`}
            fill="none"
            stroke="#16A34A"
            strokeWidth={1.5}
            markerEnd="url(#tab-arr-inc)"
          />
          <text
            x={(incSrc + tgt) / 2}
            y={ARC2 + 8}
            textAnchor="middle"
            fontSize={9}
            fill="#16A34A"
            fontWeight={600}
          >
            rob
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Cell row component ───────────────────────────────────────────────────────

function CellRow({
  values,
  label,
  currentI,
  mode,
}: {
  values: number[];
  label: string;
  currentI: number | null;
  mode: "nums" | "dp";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide w-8 shrink-0">
        {label}
      </span>
      <div className="flex gap-2">
        {values.map((v, i) => {
          let box = "border-gray-200 bg-gray-50 text-gray-500";

          if (mode === "dp") {
            if (i === currentI) {
              box = "border-amber-500 bg-amber-50 text-amber-900";
            } else if (currentI !== null && i === currentI + 1) {
              box = "border-blue-500 bg-blue-50 text-blue-900";
            } else if (currentI !== null && i === currentI + 2) {
              box = "border-green-500 bg-green-50 text-green-900";
            } else if (v !== -1) {
              box = "border-emerald-400 bg-emerald-50 text-emerald-900";
            }
          } else {
            // nums row
            if (i === currentI) {
              box = "border-amber-400 bg-amber-50 text-amber-900";
            } else if (currentI !== null && i === currentI + 2) {
              box = "border-green-400 bg-green-50 text-green-900";
            } else {
              box = "border-gray-200 bg-white text-gray-800";
            }
          }

          const display =
            mode === "dp" ? (v === -1 ? "−1" : String(v)) : String(v);

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-mono font-semibold transition-colors duration-200 ${box}`}
              >
                {display}
              </div>
              <span className="text-[10px] text-gray-400">{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseRobberTabVisualizer() {
  const [inputVal, setInputVal]     = useState<string>("2, 7, 9, 3, 1");
  const [nums, setNums]             = useState<number[]>(DEFAULT_NUMS);
  const [inputError, setInputError] = useState<string>("");
  const [step, setStep]             = useState<number>(0);
  const [isPlaying, setIsPlaying]   = useState<boolean>(false);
  const [steps, setSteps]           = useState<StepData[]>(
    () => computeSteps(DEFAULT_NUMS),
  );

  const rebuild = useCallback((newNums: number[]): void => {
    setSteps(computeSteps(newNums));
    setStep(0);
    setIsPlaying(false);
  }, []);

  const applyInput = (): void => {
    const parsed = inputVal
      .split(/[\s,]+/)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0);
    if (parsed.length < 2 || parsed.length > 6) {
      setInputError("Enter 2–6 positive integers.");
      return;
    }
    setInputError("");
    setNums(parsed);
    rebuild(parsed);
  };

  const isDone = step >= steps.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep(s => s + 1), 800);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const currentData = step > 0 ? steps[step - 1] : null;
  const dpView =
    currentData?.dpSnapshot ?? Array.from<number>({ length: nums.length }).fill(-1);
  const currentI = currentData?.i ?? null;
  const answer   = dpView[0] !== -1 ? dpView[0] : "—";

  const handlePreset = (p: string): void => {
    const ns = p.split(",").map(Number);
    setInputVal(p.split(",").join(", "));
    setNums(ns);
    rebuild(ns);
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Header ── */}
      <div className="bg-gray-50 border-b border-gray-100 px-5 pt-5 pb-4">

        {/* Input row */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applyInput()}
            placeholder="e.g. 2, 7, 9, 3, 1"
            className="flex-1 min-w-36 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono bg-white focus:outline-none focus:border-emerald-500 text-gray-800"
          />
          {(["2,1,1,2", "1,2,3,1", "2,7,9,3,1"] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 font-mono"
            >
              [{p}]
            </button>
          ))}
        </div>
        {inputError && <p className="text-xs text-red-500 mb-3">{inputError}</p>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {([
            { label: "Current i",  value: currentI !== null ? currentI : "—", cls: "text-2xl font-bold text-amber-600" },
            { label: "Include",    value: currentData ? currentData.include : "—", cls: "text-2xl font-bold text-green-600" },
            { label: "Exclude",    value: currentData ? currentData.exclude : "—", cls: "text-2xl font-bold text-blue-600" },
            { label: "Result dp[0]", value: answer, cls: "text-2xl font-bold text-gray-900" },
          ] as { label: string; value: string | number; cls: string }[]).map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className={cls}>{value}</div>
            </div>
          ))}
        </div>

        {/* Array display */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 mb-4 space-y-3">
          <CellRow
            values={nums}
            label="nums"
            currentI={currentI}
            mode="nums"
          />
          <CellRow
            values={dpView}
            label="dp"
            currentI={currentI}
            mode="dp"
          />
          {/* Dependency arrows sit flush below dp row */}
          <div className="pl-11">
            <DependencyArrows currentI={currentI} n={nums.length} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
          {[
            { cls: "border-amber-500 bg-amber-50",   label: "Current dp[i]" },
            { cls: "border-green-500 bg-green-50",   label: "dp[i+2] (rob branch)" },
            { cls: "border-blue-500 bg-blue-50",     label: "dp[i+1] (skip branch)" },
            { cls: "border-emerald-400 bg-emerald-50", label: "Already computed" },
          ].map(({ cls, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded border-2 ${cls}`} />
              {label}
            </span>
          ))}
        </div>

        {/* Explanation */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-600 leading-relaxed min-h-11 mb-4">
          <span className="font-mono font-semibold text-emerald-700 mr-2">
            {currentI !== null ? `dp[${currentI}]` : "dp[?]"}
          </span>
          {getExplanation(currentData, nums, step)}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (isDone) { setStep(0); setIsPlaying(false); }
              else setIsPlaying(p => !p);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
            disabled={isPlaying || isDone}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <SkipForward size={15} /> Step
          </button>
          <button
            type="button"
            onClick={() => { setStep(0); setIsPlaying(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700"
          >
            <RotateCcw size={15} /> Reset
          </button>

          <div className="flex-1 flex items-center gap-2 ml-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums">
              {step}/{steps.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
