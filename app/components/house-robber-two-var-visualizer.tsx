"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Types & simulation ───────────────────────────────────────────────────────

const DEFAULT_NUMS: number[] = [2, 7, 9, 3, 1];

type StepData = {
  i: number;
  result: number;
  next: number;          // value of `next`        AFTER shift
  nextToNext: number;    // value of `nextToNext`   AFTER shift
  prevNext: number;      // value of `next`        BEFORE shift (= dp[i+1])
  prevNextToNext: number;// value of `nextToNext`  BEFORE shift (= dp[i+2])
};

function computeSteps(nums: number[]): StepData[] {
  const n = nums.length;
  let next = 0, nextToNext = 0;
  const steps: StepData[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const prevNext = next;
    const prevNextToNext = nextToNext;
    const result = Math.max(nums[i] + nextToNext, next);
    nextToNext = next;
    next = result;
    steps.push({ i, result, next, nextToNext, prevNext, prevNextToNext });
  }

  return steps;
}

// ─── House row ────────────────────────────────────────────────────────────────

function HouseRow({ nums, currentI }: { nums: number[]; currentI: number | null }) {
  return (
    <div className="flex gap-2">
      {nums.map((v, i) => {
        const isCurrent = i === currentI;
        const isDone    = currentI !== null && i > currentI;
        let box = "border-gray-200 bg-white text-gray-700";
        if (isCurrent) box = "border-amber-400 bg-amber-50 text-amber-900";
        else if (isDone) box = "border-gray-200 bg-gray-50 text-gray-400";

        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold font-mono transition-colors duration-200 ${box}`}>
              {v}
            </div>
            <span className="text-[10px] text-gray-300">{i}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Variable box ─────────────────────────────────────────────────────────────

function VarBox({
  label,
  sublabel,
  value,
  color,
  dim,
}: {
  label: string;
  sublabel: string;
  value: number;
  color: "blue" | "green" | "amber";
  dim?: boolean;
}) {
  const palette = {
    blue:   { border: "border-blue-300",   bg: "bg-blue-50",   text: "text-blue-800",   label: "text-blue-600"   },
    green:  { border: "border-green-300",  bg: "bg-green-50",  text: "text-green-800",  label: "text-green-600"  },
    amber:  { border: "border-amber-400",  bg: "bg-amber-50",  text: "text-amber-900",  label: "text-amber-700"  },
  }[color];

  return (
    <div className={`flex flex-col items-center gap-1 transition-opacity duration-200 ${dim ? "opacity-30" : ""}`}>
      <span className={`text-[10px] font-mono font-semibold uppercase tracking-wide ${palette.label}`}>{label}</span>
      <div className={`w-20 h-14 rounded-xl border-2 flex items-center justify-center ${palette.border} ${palette.bg}`}>
        <span className={`text-2xl font-bold font-mono tabular-nums ${palette.text}`}>{value}</span>
      </div>
      <span className="text-[9px] text-gray-400 font-mono">{sublabel}</span>
    </div>
  );
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function SidePanel({
  data,
  nums,
  step,
  totalSteps,
}: {
  data: StepData | null;
  nums: number[];
  step: number;
  totalSteps: number;
}) {
  const isDone = step >= totalSteps && totalSteps > 0;

  if (isDone && data) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">answer</span>
        <span className="text-3xl font-bold font-mono text-emerald-600">{data.result}</span>
        <span className="text-xs text-gray-400 font-mono">result at i=0</span>
      </div>
    );
  }

  if (!data || step === 0) {
    return (
      <p className="text-xs text-gray-400 leading-relaxed">
        Same as tabulation, but only two variables instead of the full array.
        <br /><br />
        <span className="font-mono text-blue-600">next</span> tracks <span className="font-mono text-gray-600">dp[i+1]</span>,{" "}
        <span className="font-mono text-green-600">nextToNext</span> tracks <span className="font-mono text-gray-600">dp[i+2]</span>.
        Both start at <span className="font-mono text-gray-600">0</span>.
      </p>
    );
  }

  const { i, result, prevNext, prevNextToNext } = data;
  const n = nums.length;
  const include = nums[i] + prevNextToNext;
  const exclude = prevNext;

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">i = {i}</div>

      {/* Compute */}
      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex items-baseline gap-2">
          <span className="text-green-600 w-24 shrink-0">rob house {i}</span>
          <span className="text-gray-500">
            {nums[i]}
            {i + 2 < n ? `+${prevNextToNext}` : ""}
            {" = "}{include}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-blue-600 w-24 shrink-0">skip house {i}</span>
          <span className="text-gray-500">{prevNext}</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1.5 border-t border-gray-100">
          <span className="text-amber-700 font-semibold w-24 shrink-0">result</span>
          <span className="text-gray-700 font-semibold">
            max({include}, {exclude}) = {result}
          </span>
        </div>
      </div>

      {/* Shift */}
      <div className="space-y-1 pt-1 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Shift</div>
        <div className="font-mono text-xs text-gray-500 space-y-1">
          <div><span className="text-green-600">nextToNext</span> ← {prevNext} <span className="text-gray-400">(was next)</span></div>
          <div><span className="text-blue-600">next</span> ← {result} <span className="text-gray-400">(result)</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseRobberTwoVarVisualizer() {
  const [nums, setNums]           = useState<number[]>(DEFAULT_NUMS);
  const [step, setStep]           = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [steps, setSteps]         = useState<StepData[]>(() => computeSteps(DEFAULT_NUMS));

  const rebuild = useCallback((newNums: number[]): void => {
    setSteps(computeSteps(newNums));
    setStep(0);
    setIsPlaying(false);
  }, []);

  const isDone = step >= steps.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const currentData = step > 0 ? steps[step - 1] : null;
  const currentI    = currentData?.i ?? null;

  // Variables to display
  const nextVal        = currentData?.next        ?? 0;
  const nextToNextVal  = currentData?.nextToNext  ?? 0;
  const resultVal      = currentData?.result      ?? null;

  const handlePreset = (p: string): void => {
    setNums(p.split(",").map(Number));
    rebuild(p.split(",").map(Number));
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Main two-column layout ── */}
      <div className="flex divide-x divide-gray-100">

        {/* Left: array + variables */}
        <div className="px-5 pt-5 pb-5 shrink-0 flex flex-col gap-5">

          {/* nums array */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">nums</span>
            <HouseRow nums={nums} currentI={currentI} />
          </div>

          {/* Variable boxes: nextToNext ← next ← result */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">variables</span>
            <div className="flex items-center gap-3">
              <VarBox
                label="nextToNext"
                sublabel="dp[i+2]"
                value={nextToNextVal}
                color="green"
                dim={step === 0}
              />
              {/* shift arrow */}
              <div className="flex flex-col items-center gap-0.5 -mt-3">
                <span className="text-[9px] text-gray-300">←</span>
              </div>
              <VarBox
                label="next"
                sublabel="dp[i+1]"
                value={nextVal}
                color="blue"
                dim={step === 0}
              />
              {resultVal !== null && (
                <>
                  <div className="flex flex-col items-center gap-0.5 -mt-3">
                    <span className="text-[9px] text-gray-300">←</span>
                  </div>
                  <VarBox
                    label="result"
                    sublabel={`dp[${currentI}]`}
                    value={resultVal}
                    color="amber"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: presets + step info */}
        <div className="flex-1 flex flex-col px-5 pt-5 pb-5 gap-4 min-w-0">
          <div className="flex gap-2 flex-wrap">
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
          <SidePanel
            data={currentData}
            nums={nums}
            step={step}
            totalSteps={steps.length}
          />
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
