"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_NUMS = [1, 2, 3];
const DEFAULT_K = 3;

type Stage = "idle" | "running" | "done";
type SubStep = 0 | 1 | 2;

export default function SubarraySumPrefixSumVisualizer() {
  const [numsInput, setNumsInput] = useState(DEFAULT_NUMS.join(", "));
  const [kInput, setKInput] = useState(String(DEFAULT_K));
  const [inputError, setInputError] = useState<string | null>(null);

  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [k, setK] = useState(DEFAULT_K);

  const [stage, setStage] = useState<Stage>("idle");
  const [i, setI] = useState(0);
  const [subStep, setSubStep] = useState<SubStep>(0);
  const [currentPrefixSum, setCurrentPrefixSum] = useState(0);
  const [freqMap, setFreqMap] = useState<Map<number, number>>(new Map([[0, 1]]));
  const [count, setCount] = useState(0);
  const [lookupKey, setLookupKey] = useState<number | null>(null);
  const [justUpdatedKey, setJustUpdatedKey] = useState<number | null>(null);
  const [message, setMessage] = useState("Press Play or Step to begin");
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = stage === "done";

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => executeStep(), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, stage, i, subStep]);

  const executeStep = () => {
    if (stage === "idle") {
      setStage("running");
      setI(0);
      setSubStep(0);
      setCurrentPrefixSum(0);
      setFreqMap(new Map([[0, 1]]));
      setCount(0);
      setLookupKey(null);
      setJustUpdatedKey(null);
      setMessage("Initialized map = {0: 1}. Starting loop at index 0.");
      return;
    }

    if (stage === "done") return;

    // ── Sub-step 0: add nums[i] to currentPrefixSum ───────────────────────────
    if (subStep === 0) {
      const prevSum = currentPrefixSum;
      const newSum = prevSum + nums[i];
      setCurrentPrefixSum(newSum);
      setLookupKey(null);
      setJustUpdatedKey(null);
      setMessage(
        `i=${i}: nums[${i}]=${nums[i]}. currentPrefixSum = ${prevSum} + ${nums[i]} = ${newSum}.`
      );
      setSubStep(1);
      return;
    }

    // ── Sub-step 1: look up (currentPrefixSum - k) in map, update count ───────
    if (subStep === 1) {
      const key = currentPrefixSum - k;
      const val = freqMap.get(key) ?? 0;
      setLookupKey(key);
      setJustUpdatedKey(null);
      if (val > 0) {
        const newCount = count + val;
        setCount(newCount);
        setMessage(
          `Lookup: ${currentPrefixSum} − k(${k}) = ${key}. Found in map (freq=${val}). count += ${val} → count = ${newCount}. ✓`
        );
      } else {
        setMessage(
          `Lookup: ${currentPrefixSum} − k(${k}) = ${key}. Not in map. count unchanged.`
        );
      }
      setSubStep(2);
      return;
    }

    // ── Sub-step 2: update map with currentPrefixSum ──────────────────────────
    const newMap = new Map(freqMap);
    const prev = newMap.get(currentPrefixSum) ?? 0;
    newMap.set(currentPrefixSum, prev + 1);
    setFreqMap(newMap);
    setJustUpdatedKey(currentPrefixSum);
    setLookupKey(null);

    const nextI = i + 1;
    if (nextI >= nums.length) {
      setStage("done");
      setIsPlaying(false);
      setI(nextI);
      setMessage(
        `Updated map: map[${currentPrefixSum}] = ${prev + 1}. Done! count = ${count}.`
      );
    } else {
      setI(nextI);
      setSubStep(0);
      setMessage(
        `Updated map: map[${currentPrefixSum}] = ${prev + 1}. Moving to i = ${nextI}.`
      );
    }
  };

  const reset = (nextNums = nums, nextK = k) => {
    setStage("idle");
    setI(0);
    setSubStep(0);
    setCurrentPrefixSum(0);
    setFreqMap(new Map([[0, 1]]));
    setCount(0);
    setLookupKey(null);
    setJustUpdatedKey(null);
    setIsPlaying(false);
    setNums(nextNums);
    setK(nextK);
    setMessage("Press Play or Step to begin");
  };

  const applyInputs = () => {
    const parsed = numsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number);

    if (parsed.length === 0 || parsed.some(isNaN)) {
      setInputError("nums must be a comma-separated list of integers, e.g. 1, 2, 3");
      return;
    }
    const parsedK = Number(kInput.trim());
    if (kInput.trim() === "" || isNaN(parsedK) || !Number.isInteger(parsedK)) {
      setInputError("k must be an integer");
      return;
    }
    setInputError(null);
    reset(parsed, parsedK);
  };

  const togglePlay = () => {
    if (isDone) { reset(); setIsPlaying(true); return; }
    setIsPlaying((prev) => !prev);
  };

  const mapEntries = Array.from(freqMap.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-6 space-y-5">

        {/* Input section */}
        <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-gray-400">nums</label>
            <input
              type="text"
              value={numsInput}
              onChange={(e) => setNumsInput(e.target.value)}
              disabled={isPlaying}
              placeholder="e.g. 1, 2, 3"
              className="font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-gray-400">k</label>
            <input
              type="text"
              value={kInput}
              onChange={(e) => setKInput(e.target.value)}
              disabled={isPlaying}
              placeholder="e.g. 3"
              className="font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <button
            onClick={applyInputs}
            disabled={isPlaying}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed self-end"
          >
            Apply
          </button>
          {inputError && (
            <p className="w-full text-xs text-red-500">{inputError}</p>
          )}
        </div>

        {/* Controls + live vars */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-5 text-sm">
            <div>
              <span className="text-gray-500">i = </span>
              <span className="font-mono font-bold text-lg text-orange-500">
                {stage === "idle" ? "—" : i >= nums.length ? "—" : i}
              </span>
            </div>
            <div>
              <span className="text-gray-500">currentPrefixSum = </span>
              <span className="font-mono font-bold text-lg text-purple-600">
                {stage === "idle" ? "—" : currentPrefixSum}
              </span>
            </div>
            <div>
              <span className="text-gray-500">count = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">{count}</span>
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
            <button onClick={() => reset()} className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 min-h-5">{message}</p>

        {/* k label */}
        <div className="text-sm text-gray-500">
          k = <span className="font-mono font-bold text-gray-800">{k}</span>
        </div>

        {/* nums array */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">nums</div>
          <div className="flex flex-wrap gap-2">
            {nums.map((value, idx) => {
              const isActive = stage !== "idle" && idx === i && i < nums.length;
              const isPast = stage !== "idle" && idx < i;

              let cellClass = "bg-white text-gray-800 border-gray-200";
              if (isActive) cellClass = "bg-orange-50 text-orange-800 border-orange-300 ring-2 ring-orange-200";
              if (isPast) cellClass = "bg-gray-50 text-gray-400 border-gray-200";

              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-xl border-2 font-mono font-bold flex items-center justify-center text-sm transition-all ${cellClass}`}>
                    {value}
                  </div>
                  <div className="h-4">
                    {isActive
                      ? <span className="text-[10px] text-orange-500 font-semibold">i</span>
                      : <span className="text-[10px] text-gray-400">[{idx}]</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HashMap visualization */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">
            frequencyPrefixSumMap
          </div>
          <div className="flex flex-wrap gap-2">
            {mapEntries.map(([key, freq]) => {
              const isLookup = lookupKey === key;
              const isUpdated = justUpdatedKey === key;

              let entryClass = "bg-white border-gray-200 text-gray-700";
              if (isLookup) entryClass = "bg-amber-50 border-amber-400 text-amber-800";
              if (isUpdated) entryClass = "bg-blue-50 border-blue-400 text-blue-800";

              return (
                <div
                  key={key}
                  className={`border-2 rounded-lg px-3 py-2 font-mono text-sm transition-all ${entryClass}`}
                >
                  <span className="font-bold">{key}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-bold">{freq}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lookup info banner */}
        {stage !== "idle" && lookupKey !== null && (
          <div className="text-sm rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 font-mono">
            <span className="text-gray-500">Looking up: </span>
            <span className="font-bold text-amber-800">{currentPrefixSum}</span>
            <span className="text-gray-500"> − k({k}) = </span>
            <span className="font-bold text-amber-800">{lookupKey}</span>
            {freqMap.has(lookupKey)
              ? <span className="text-emerald-600 ml-2">→ found (freq = {freqMap.get(lookupKey)})</span>
              : <span className="text-gray-400 ml-2">→ not found</span>
            }
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-50 border-2 border-orange-300 inline-block" />
            current index i
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-50 border-2 border-amber-400 inline-block" />
            map lookup key
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-400 inline-block" />
            map insert / update
          </span>
        </div>

      </div>
    </div>
  );
}
