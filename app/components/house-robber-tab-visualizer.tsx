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

// ─── Formula panel ────────────────────────────────────────────────────────────

function FormulaPanel({
  data,
  nums,
  step,
}: {
  data: StepData | null;
  nums: number[];
  step: number;
}) {
  if (step === 0) {
    return (
      <p className="text-sm text-gray-400 py-3">
        Fill <span className="font-mono text-gray-600">dp[]</span> from right to left.
        At each index <span className="font-mono text-gray-600">i</span>:{" "}
        <span className="font-mono text-gray-700">dp[i] = max(nums[i] + dp[i+2],&nbsp;dp[i+1])</span>
      </p>
    );
  }
  if (!data) return null;

  const { i, include, exclude, result } = data;
  const n = nums.length;

  const inclExpr =
    i + 2 < n
      ? `nums[${i}] + dp[${i + 2}]  =  ${nums[i]} + ${data.dpSnapshot[i + 2]}  =  ${include}`
      : `nums[${i}]  (i+2 out of bounds)  =  ${include}`;

  const exclExpr =
    i + 1 < n
      ? `dp[${i + 1}]  =  ${exclude}`
      : `0  (i+1 out of bounds)`;

  const rows: { key: string; label: string; expr: string; value: number | string; color: string }[] = [
    { key: "inc", label: "include", expr: inclExpr, value: include, color: "text-green-700" },
    { key: "exc", label: "exclude", expr: exclExpr, value: exclude, color: "text-blue-700"  },
    { key: "res", label: `dp[${i}]`, expr: `max(${include}, ${exclude})`, value: result,  color: "text-amber-700" },
  ];

  return (
    <div className="divide-y divide-gray-100">
      {rows.map(({ key, label, expr, value, color }, idx) => (
        <div key={key} className={`flex items-baseline gap-3 py-2 ${idx === 2 ? "font-semibold" : ""}`}>
          <span className={`font-mono text-[11px] w-16 shrink-0 ${color}`}>{label}</span>
          <span className="font-mono text-xs text-gray-500 flex-1">{expr}</span>
          <span className={`font-mono text-sm tabular-nums ${color}`}>{value}</span>
        </div>
      ))}
    </div>
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
    <div className="flex items-start gap-3">
      {/* Row label */}
      <div className="w-8 shrink-0 pt-2.5 flex flex-col items-start gap-0.5">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-none">
          {label}
        </span>
        {mode === "dp" && (
          <span className="text-[9px] text-gray-300 leading-none whitespace-nowrap">← i</span>
        )}
      </div>

      {/* Cells */}
      <div className="flex gap-2">
        {values.map((v, i) => {
          let box = "border-gray-200 bg-gray-50 text-gray-400";

          if (mode === "dp") {
            if (i === currentI) {
              box = "border-amber-500 bg-amber-50 text-amber-900";
            } else if (currentI !== null && i === currentI + 1) {
              box = "border-blue-400 bg-blue-50 text-blue-800";
            } else if (currentI !== null && i === currentI + 2) {
              box = "border-green-500 bg-green-50 text-green-800";
            } else if (v !== -1) {
              box = "border-emerald-300 bg-emerald-50 text-emerald-800";
            }
          } else {
            if (i === currentI) {
              box = "border-amber-400 bg-amber-50 text-amber-900";
            } else if (currentI !== null && i === currentI + 2) {
              box = "border-green-400 bg-green-50 text-green-800";
            } else {
              box = "border-gray-200 bg-white text-gray-700";
            }
          }

          const display = mode === "dp" ? (v === -1 ? "−1" : String(v)) : String(v);

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-mono font-semibold transition-colors duration-200 ${box}`}
              >
                {display}
              </div>
              <span className="text-[10px] text-gray-300">{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseRobberTabVisualizer() {
  const [nums, setNums]           = useState<number[]>(DEFAULT_NUMS);
  const [step, setStep]           = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [steps, setSteps]         = useState<StepData[]>(
    () => computeSteps(DEFAULT_NUMS),
  );

  const rebuild = useCallback((newNums: number[]): void => {
    setSteps(computeSteps(newNums));
    setStep(0);
    setIsPlaying(false);
  }, []);

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

  const handlePreset = (p: string): void => {
    const ns = p.split(",").map(Number);
    setNums(ns);
    rebuild(ns);
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Main two-column layout ── */}
      <div className="flex gap-0 divide-x divide-gray-100">

        {/* Left: arrays + arrows */}
        <div className="px-5 pt-5 pb-5 shrink-0 space-y-2.5">
          <CellRow values={nums}   label="nums" currentI={currentI} mode="nums" />
          <CellRow values={dpView} label="dp"   currentI={currentI} mode="dp"   />
          <div className="pl-11">
            <DependencyArrows currentI={currentI} n={nums.length} />
          </div>
        </div>

        {/* Right: presets + formula */}
        <div className="flex-1 flex flex-col px-5 pt-5 pb-5 min-w-0">
          {/* Presets */}
          <div className="flex gap-2 flex-wrap mb-4">
            {(["2,1,1,2", "1,2,3,1", "2,7,9,3,1"] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handlePreset(p)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 font-mono"
              >
                [{p}]
              </button>
            ))}
          </div>
          {/* Formula */}
          <div className="flex-1">
            <FormulaPanel data={currentData} nums={nums} step={step} />
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="border-t border-gray-100 px-5 py-4 flex gap-2">
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button
          type="button"
          onClick={() => { setStep(0); setIsPlaying(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">{step}/{steps.length}</span>
        </div>
      </div>
    </div>
  );
}
