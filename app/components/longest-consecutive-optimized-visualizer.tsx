"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_NUMS = [100, 4, 200, 1, 3, 2, 2];

// Mirrors the three phases of the optimized algorithm:
// buildSet    → for(int num: nums) set.add(num)
// startCheck  → if (!set.contains(num-1)) gate — one step per element in the set iteration
// innerCheck  → each iteration of while(set.contains(current+1))
type Stage = "buildSet" | "startCheck" | "innerCheck" | "done";

type ResultEntry = {
  num: number;
  chain: number[];
  currLength: number;
  skipped: boolean;
};

export default function LongestConsecutiveOptimizedVisualizer() {
  const [nums] = useState(DEFAULT_NUMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stage, setStage] = useState<Stage>("buildSet");
  const [setIndex, setSetIndex] = useState(0);       // index into setValues (outer loop)
  const [innerCurrent, setInnerCurrent] = useState(0); // value of `current` in inner loop
  const [currLength, setCurrLength] = useState(1);
  const [maxLength, setMaxLength] = useState(0);
  const [currentChain, setCurrentChain] = useState<number[]>([]);
  const [querying, setQuerying] = useState<number | null>(null); // value being looked up
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [message, setMessage] = useState("Press Play or Step to build the set");

  // mirrors: Set<Integer> set = new HashSet<>(); for(int num: nums) set.add(num);
  const numsSet = useMemo(() => new Set(nums), [nums]);
  const setValues = useMemo(() => [...numsSet].sort((a, b) => a - b), [numsSet]);

  const isDone = stage === "done";

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => executeStep(), 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, stage, setIndex, innerCurrent]);

  const executeStep = () => {
    // ── Phase 1: populate set ─────────────────────────────────────────────────
    if (stage === "buildSet") {
      setStage("startCheck");
      setMessage(`Set populated: {${setValues.join(", ")}}. Now iterating over set.`);
      return;
    }

    // ── Phase 2: if (!set.contains(num-1)) ───────────────────────────────────
    // One step per element: check predecessor, skip or start chain
    if (stage === "startCheck") {
      if (setIndex >= setValues.length) {
        setStage("done");
        setIsPlaying(false);
        setQuerying(null);
        setMessage(`Done. maxLength = ${maxLength}.`);
        return;
      }
      const num = setValues[setIndex];
      const prevValue = num - 1;

      if (numsSet.has(prevValue)) {
        // true → num is already part of a longer sequence, skip it
        setQuerying(prevValue); // amber on predecessor (explains why we skip)
        setResults((prev) => [...prev, { num, chain: [], currLength: 0, skipped: true }]);
        setMessage(`num = ${num}: set.contains(${prevValue}) → true. Already part of a longer sequence, skip.`);
        setSetIndex((prev) => prev + 1);
        // stage stays "startCheck" — move to next element
      } else {
        // false → num is the beginning of a sequence
        setQuerying(null); // prevValue not in set, no chip to highlight
        setInnerCurrent(num);
        setCurrLength(1);
        setCurrentChain([num]);
        setMessage(`num = ${num}: set.contains(${prevValue}) → false. Sequence start! chain = [${num}], currLength = 1.`);
        setStage("innerCheck");
      }
      return;
    }

    // ── Phase 3: while(set.contains(current+1)) ──────────────────────────────
    // One step per while-condition check
    if (stage === "innerCheck") {
      const num = setValues[setIndex];
      const lookupValue = innerCurrent + 1;

      if (numsSet.has(lookupValue)) {
        // true → extend chain
        const newCurrLength = currLength + 1;
        setQuerying(lookupValue); // amber on successor
        setCurrLength(newCurrLength);
        setInnerCurrent(lookupValue);
        setCurrentChain((prev) => [...prev, lookupValue]);
        setMessage(`set.contains(${lookupValue}) → true. current = ${lookupValue}, currLength = ${newCurrLength}.`);
      } else {
        // false → exit while loop, record result
        const newMax = Math.max(maxLength, currLength);
        setQuerying(null); // value not in set, nothing to highlight
        setResults((prev) => [...prev, { num, chain: currentChain, currLength, skipped: false }]);
        setMaxLength(newMax);
        setCurrentChain([]);
        setMessage(`set.contains(${lookupValue}) → false. Chain complete. currLength = ${currLength}, maxLength = ${newMax}.`);
        setSetIndex((prev) => prev + 1);
        setStage("startCheck");
      }
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setStage("buildSet");
    setSetIndex(0);
    setInnerCurrent(0);
    setCurrLength(1);
    setMaxLength(0);
    setCurrentChain([]);
    setQuerying(null);
    setResults([]);
    setMessage("Press Play or Step to build the set");
  };

  const togglePlay = () => {
    if (isDone) { reset(); setIsPlaying(true); return; }
    setIsPlaying((prev) => !prev);
  };

  const completedResults = results.filter((r) => !r.skipped);

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-6 space-y-5">

        {/* Controls + live vars */}
        <div className="flex items-center justify-between">
          <div className="flex gap-5 text-sm">
            <div>
              <span className="text-gray-500">currLength = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {stage === "buildSet" ? "—" : currLength}
              </span>
            </div>
            <div>
              <span className="text-gray-500">maxLength = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {stage === "buildSet" ? "—" : maxLength}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={togglePlay} className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={executeStep}
              disabled={isPlaying || isDone}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <SkipForward size={18} />
            </button>
            <button onClick={reset} className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 min-h-5">{message}</p>

        {/* Set — outer for loop */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">
            set <span className="normal-case text-gray-300">(outer loop — unique elements only)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {setValues.map((value, idx) => {
              const isActive = stage !== "buildSet" && idx === setIndex;
              const isPast = stage !== "buildSet" && idx < setIndex;
              const resultEntry = results.find((r) => r.num === value);
              const wasSkipped = resultEntry?.skipped;

              let cellClass = "bg-white text-gray-800 border-gray-200";
              if (isActive) {
                cellClass = "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-200";
              } else if (isPast && wasSkipped) {
                cellClass = "bg-gray-50 text-gray-400 border-gray-200";
              } else if (isPast && !wasSkipped) {
                cellClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
              }

              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-12 h-12 rounded-xl border-2 font-mono font-bold flex items-center justify-center text-sm transition-all ${cellClass}`}
                  >
                    {value}
                  </div>
                  {isPast && wasSkipped && (
                    <span className="text-[10px] text-gray-400">skip</span>
                  )}
                  {isPast && !wasSkipped && (
                    <span className="text-[10px] text-emerald-500 font-semibold">start</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* HashSet with lookup highlight */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">
            HashSet <span className="normal-case text-gray-300">(O(1) lookup)</span>
          </div>
          <div
            className={`flex flex-wrap gap-2 rounded-xl border-2 p-3 transition-colors ${
              stage === "buildSet"
                ? "border-dashed border-gray-200 bg-gray-50"
                : "border-indigo-100 bg-indigo-50/40"
            }`}
          >
            {stage === "buildSet" ? (
              <span className="text-sm text-gray-400 italic">empty — build first</span>
            ) : (
              setValues.map((value) => {
                const inChain = currentChain.includes(value);
                const isQueried = value === querying;
                let cellClass = "bg-white text-gray-600 border-indigo-200";
                if (isQueried) {
                  cellClass = "bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200";
                } else if (inChain) {
                  cellClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                }
                return (
                  <div key={value} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-12 h-12 rounded-xl border-2 font-mono font-bold flex items-center justify-center text-sm transition-all ${cellClass}`}
                    >
                      {value}
                    </div>
                    {isQueried && (
                      <span className="text-[10px] text-amber-600 font-semibold">lookup</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Current chain being built (inner loop) */}
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

        {/* Completed sequence results */}
        {completedResults.length > 0 && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">Sequences found</div>
            <div className="flex flex-col gap-1.5">
              {completedResults.map((entry, idx) => {
                const isBest = entry.currLength === maxLength;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-sm font-mono rounded-lg px-3 py-2 ${
                      isBest
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
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
            <span className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-300 inline-block" />current element
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-300 inline-block" />set lookup
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-300 inline-block" />in chain
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-50 border-2 border-gray-200 inline-block" />skipped
          </span>
        </div>
      </div>
    </div>
  );
}
