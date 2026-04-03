"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_NUMS = [100, 4, 200, 1, 3, 2, 2];

// Mirrors the three phases of the algorithm:
// buildSet  → for(int num: nums) set.add(num)
// outerEnter → start of the outer for(int num: nums) body
// innerCheck → each iteration of while(set.contains(start+1))
type Stage = "buildSet" | "outerEnter" | "innerCheck" | "done";

type ScanEntry = {
  num: number;
  chain: number[];
  currLength: number;
};

export default function LongestConsecutiveSetVisualizer() {
  const [nums] = useState(DEFAULT_NUMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stage, setStage] = useState<Stage>("buildSet");
  const [scanIndex, setScanIndex] = useState(0);    // outer loop: index into nums
  const [innerStart, setInnerStart] = useState(0);  // inner loop: current value of `start`
  const [currLength, setCurrLength] = useState(1);
  const [maxLength, setMaxLength] = useState(1);
  const [currentChain, setCurrentChain] = useState<number[]>([]);
  const [querying, setQuerying] = useState<number | null>(null); // value being looked up
  const [scanned, setScanned] = useState<ScanEntry[]>([]);
  const [message, setMessage] = useState("Press Play or Step to build the set");

  // mirrors: Set<Integer> set = new HashSet<>();
  const numsSet = useMemo(() => new Set(nums), [nums]);
  const setValues = useMemo(() => [...numsSet].sort((a, b) => a - b), [numsSet]);

  const isDone = stage === "done";

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => executeStep(), 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, stage, scanIndex, innerStart]);

  const executeStep = () => {
    // ── Phase 1: populate set ─────────────────────────────────────────────────
    if (stage === "buildSet") {
      setStage("outerEnter");
      setMessage(`Set populated: {${setValues.join(", ")}}. Now iterating over nums.`);
      return;
    }

    // ── Phase 2: enter outer for-loop body ────────────────────────────────────
    // mirrors: int currLength = 1; int start = num;
    if (stage === "outerEnter") {
      if (scanIndex >= nums.length) {
        setStage("done");
        setIsPlaying(false);
        setMessage(`Done. maxLength = ${maxLength}.`);
        return;
      }
      const num = nums[scanIndex];
      setInnerStart(num);
      setCurrLength(1);
      setCurrentChain([num]);
      setQuerying(num + 1);
      setMessage(`Outer loop: num = ${num}. Initialize start = ${num}, currLength = 1.`);
      setStage("innerCheck");
      return;
    }

    // ── Phase 3: inner while(set.contains(start+1)) ───────────────────────────
    if (stage === "innerCheck") {
      const num = nums[scanIndex];
      const lookupValue = innerStart + 1;

      if (numsSet.has(lookupValue)) {
        // true branch: currLength++; start++;
        const newCurrLength = currLength + 1;
        setCurrLength(newCurrLength);
        setInnerStart(lookupValue);
        setCurrentChain((prev) => [...prev, lookupValue]);
        setQuerying(lookupValue + 1);
        setMessage(
          `set.contains(${lookupValue}) → true.  start = ${lookupValue}, currLength = ${newCurrLength}.`
        );
      } else {
        // false branch: exit while loop, update maxLength
        const newMax = Math.max(maxLength, currLength);
        setScanned((prev) => [...prev, { num, chain: currentChain, currLength }]);
        setMaxLength(newMax);
        setQuerying(null);
        setMessage(
          `set.contains(${lookupValue}) → false.  Loop exits. currLength = ${currLength}, maxLength = ${newMax}.`
        );
        setScanIndex((prev) => prev + 1);
        setStage("outerEnter");
      }
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setStage("buildSet");
    setScanIndex(0);
    setInnerStart(0);
    setCurrLength(1);
    setMaxLength(1);
    setCurrentChain([]);
    setQuerying(null);
    setScanned([]);
    setMessage("Press Play or Step to build the set");
  };

  const togglePlay = () => {
    if (isDone) { reset(); setIsPlaying(true); return; }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-6 space-y-5">

        {/* Controls + live vars */}
        <div className="flex items-center justify-between">
          <div className="flex gap-5 text-sm">
            <div>
              <span className="text-gray-500">currLength = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {stage === "buildSet" ? "-" : currLength}
              </span>
            </div>
            <div>
              <span className="text-gray-500">maxLength = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {stage === "buildSet" ? "-" : maxLength}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePlay} className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button onClick={executeStep} disabled={isPlaying || isDone}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
              <SkipForward size={18} />
            </button>
            <button onClick={reset} className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 min-h-5">{message}</p>

        {/* nums — outer for loop */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">
            nums <span className="normal-case text-gray-300">(outer loop)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nums.map((value, idx) => {
              const isActive = stage !== "buildSet" && idx === scanIndex;
              const isPast = stage !== "buildSet" && idx < scanIndex;
              const classes = isActive
                ? "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-200"
                : isPast
                ? "bg-gray-50 text-gray-400 border-gray-200"
                : "bg-white text-gray-800 border-gray-200";
              return (
                <div key={idx} className="text-center">
                  <div className={`w-12 h-12 rounded-xl border-2 font-mono font-bold flex items-center justify-center text-sm transition-all ${classes}`}>
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">[{idx}]</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HashSet with per-value lookup highlight */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">
            HashSet <span className="normal-case text-gray-300">(O(1) lookup)</span>
          </div>
          <div className={`flex flex-wrap gap-2 rounded-xl border-2 p-3 transition-colors ${stage === "buildSet" ? "border-dashed border-gray-200 bg-gray-50" : "border-indigo-100 bg-indigo-50/40"}`}>
            {stage === "buildSet"
              ? <span className="text-sm text-gray-400 italic">empty — build first</span>
              : setValues.map((value) => {
                  const inChain = currentChain.includes(value);
                  const isQueried = value === querying;
                  let cellClass = "bg-white text-gray-600 border-indigo-200";
                  if (isQueried) cellClass = "bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200";
                  else if (inChain) cellClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  return (
                    <div key={value} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded-xl border-2 font-mono font-bold flex items-center justify-center text-sm transition-all ${cellClass}`}>
                        {value}
                      </div>
                      {isQueried && (
                        <span className="text-[10px] text-amber-600 font-semibold">lookup</span>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Current chain being built (inner loop progress) */}
        {stage === "innerCheck" && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">
              Inner loop — chain so far
            </div>
            <div className="font-mono font-semibold text-blue-800 text-sm">
              [{currentChain.join(" → ")}]
              <span className="ml-2 text-gray-400 font-normal text-xs">currLength = {currLength}</span>
            </div>
          </div>
        )}

        {/* Completed outer-loop iterations */}
        {scanned.length > 0 && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">Results</div>
            <div className="flex flex-col gap-1.5">
              {scanned.map((entry, idx) => {
                const isBest = entry.currLength === maxLength;
                return (
                  <div key={idx} className={`flex items-center gap-2 text-sm font-mono rounded-lg px-3 py-2 ${isBest ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-100"}`}>
                    <span className="text-gray-400">num={entry.num}:</span>
                    <span className={isBest ? "text-emerald-700 font-bold" : "text-gray-700"}>
                      [{entry.chain.join(" → ")}]
                    </span>
                    <span className="ml-auto text-xs text-gray-400">length={entry.currLength}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-300 inline-block" />current num
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-300 inline-block" />set lookup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-300 inline-block" />in chain
          </span>
        </div>
      </div>
    </div>
  );
}
