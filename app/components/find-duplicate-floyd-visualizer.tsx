"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const DEFAULT_NUMS = [1, 3, 4, 2, 2];

type Phase = "Detect Cycle" | "Find the Entry Point" | "Found";

type PointerLabel = {
  text: string;
  color: string;
};

export default function FindDuplicateFloydVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [slow, setSlow] = useState(0);
  const [fast, setFast] = useState(0);
  const [finder, setFinder] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("Detect Cycle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Phase 1: Press Play to start");
  const [foundDuplicate, setFoundDuplicate] = useState<number | null>(null);
  const [steps, setSteps] = useState(0);

  const maxIndex = nums.length - 1;

  const pointers = useMemo(() => {
    return nums.map((_, idx) => {
      const labels: PointerLabel[] = [];
      if (idx === slow) labels.push({ text: "slow", color: "bg-emerald-600" });
      if (idx === fast) labels.push({ text: "fast", color: "bg-blue-600" });
      if (finder !== null && idx === finder)
        labels.push({ text: "finder", color: "bg-purple-600" });
      return labels;
    });
  }, [nums, slow, fast, finder]);

  const incomingCounts = useMemo(() => {
    const counts = Array(nums.length).fill(0);
    nums.forEach((next) => {
      if (next >= 0 && next < nums.length) counts[next] += 1;
    });
    return counts;
  }, [nums]);

  useEffect(() => {
    if (!isPlaying || phase === "Found") return;
    const timer = setTimeout(() => {
      executeStep();
    }, 1100);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, slow, fast, finder, steps]);

  const executeStep = () => {
    if (phase === "Found") return;

    if (phase === "Detect Cycle") {
      const nextSlow = nums[slow];
      const nextFast = nums[nums[fast]];
      setSlow(nextSlow);
      setFast(nextFast);
      setSteps((prev) => prev + 1);

      if (steps > 0 && nextSlow === nextFast) {
        setPhase("Find the Entry Point");
        setFinder(0);
        setMessage(
          `Phase 1 complete. slow and fast met at index ${nextSlow}. Reset finder to index 0.`
        );
        return;
      }

      setMessage(
        `Phase 1: slow -> ${nextSlow}, fast -> ${nextFast}`
      );
      return;
    }

    if (phase === "Find the Entry Point" && finder !== null) {
      const nextSlow = nums[slow];
      const nextFinder = nums[finder];
      setSlow(nextSlow);
      setFinder(nextFinder);
      setSteps((prev) => prev + 1);

      if (nextSlow === nextFinder) {
        setPhase("Found");
        setFoundDuplicate(nextSlow);
        setIsPlaying(false);
        setMessage(
          `Phase 2 complete. Cycle entry found at index ${nextSlow} → duplicate number = ${nextSlow}.`
        );
        return;
      }

      setMessage(
        `Phase 2: slow -> ${nextSlow}, finder -> ${nextFinder}. Moving both one step.`
      );
    }
  };

  const reset = () => {
    setNums(DEFAULT_NUMS);
    setSlow(0);
    setFast(0);
    setFinder(null);
    setPhase("Detect Cycle");
    setIsPlaying(false);
    setSteps(0);
    setFoundDuplicate(null);
    setMessage("Phase 1: Press Play to start");
  };

  const togglePlay = () => {
    if (phase === "Found") {
      reset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">phase = </span>
              <span className="font-mono font-bold text-lg text-indigo-600">
                {phase}
              </span>
            </div>
            <div>
              <span className="text-gray-500">slow = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {slow}
              </span>
            </div>
            <div>
              <span className="text-gray-500">fast = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {fast}
              </span>
            </div>
            <div>
              <span className="text-gray-500">finder = </span>
              <span className="font-mono font-bold text-lg text-purple-600">
                {finder ?? "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">duplicate = </span>
              <span className="font-mono font-bold text-lg text-amber-600">
                {foundDuplicate ?? "?"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={executeStep}
              disabled={isPlaying || phase === "Found"}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <SkipForward size={18} />
            </button>
            <button
              onClick={reset}
              className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="my-6 text-center text-sm text-gray-600 font-medium min-h-6">
          {message}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {nums.map((value, idx) => {
            const isDuplicateIndex = foundDuplicate === idx;
            const incoming = incomingCounts[idx];
            const highlightIncoming = incoming > 1;
            return (
              <div
                key={idx}
                className={`relative rounded-2xl border p-4 min-w-37.5 text-center transition-all ${
                  isDuplicateIndex
                    ? "bg-amber-50 border-amber-300 shadow-sm"
                    : highlightIncoming
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex flex-wrap justify-center gap-1 mb-2">
                  {pointers[idx].map((label) => (
                    <span
                      key={label.text}
                      className={`${label.color} text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide`}
                    >
                      {label.text}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-gray-500">node index</div>
                <div className="font-mono text-lg font-semibold text-gray-800">
                  {idx}
                </div>

                <div className="mt-3 text-xs text-gray-500">next pointer</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-lg font-semibold text-indigo-700">
                    {value}
                  </span>
                </div>

                <div className="mt-3 text-[11px] text-gray-400">
                  incoming: {incoming}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
