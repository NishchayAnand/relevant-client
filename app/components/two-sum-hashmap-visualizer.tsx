"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const DEFAULT_NUMS = [2, 7, 11, 15];
const DEFAULT_TARGET = 22;

type StepResult = {
  done: boolean;
  found: boolean;
  message: string;
  complement: number;
};

export default function TwoSumHashMapVisualizer() {
  const [nums] = useState(DEFAULT_NUMS);
  const [target] = useState(DEFAULT_TARGET);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mapState, setMapState] = useState<Map<number, number>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Press Play or Step to start");
  const [foundPair, setFoundPair] = useState<[number, number] | null>(null);
  const [lastComplement, setLastComplement] = useState<number | null>(null);

  const mapEntries = useMemo(() => Array.from(mapState.entries()), [mapState]);

  useEffect(() => {
    if (!isPlaying || foundPair || currentIndex >= nums.length) return;
    const timer = setTimeout(() => {
      executeStep();
    }, 1100);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, foundPair, mapState]);

  const executeStep = () => {
    if (foundPair) {
      setIsPlaying(false);
      return;
    }

    if (currentIndex >= nums.length) {
      setMessage("Reached end of array without finding a valid pair.");
      setIsPlaying(false);
      return;
    }

    const value = nums[currentIndex];
    const complement = target - value;
    setLastComplement(complement);

    const stepResult: StepResult = {
      done: false,
      found: false,
      complement,
      message: "",
    };

    if (mapState.has(complement)) {
      const complementIndex = mapState.get(complement)!;
      setFoundPair([complementIndex, currentIndex]);
      stepResult.done = true;
      stepResult.found = true;
      stepResult.message = `Found! nums[${complementIndex}] (${complement}) + nums[${currentIndex}] (${value}) = ${target}`;
      setIsPlaying(false);
    } else {
      const nextMap = new Map(mapState);
      nextMap.set(value, currentIndex);
      setMapState(nextMap);
      setCurrentIndex((prev) => prev + 1);
      stepResult.message = `Index ${currentIndex}: need ${complement}. Not in map, so store {${value}: ${currentIndex}}.`;
    }

    setMessage(stepResult.message);
  };

  const reset = () => {
    setCurrentIndex(0);
    setMapState(new Map());
    setIsPlaying(false);
    setMessage("Press Play or Step to start");
    setFoundPair(null);
    setLastComplement(null);
  };

  const togglePlay = () => {
    if (foundPair || currentIndex >= nums.length) {
      reset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">target = </span>
              <span className="font-mono font-bold text-lg text-indigo-600">{target}</span>
            </div>
            <div>
              <span className="text-gray-500">i = </span>
              <span className="font-mono font-bold text-lg text-blue-600">{currentIndex}</span>
            </div>
            <div>
              <span className="text-gray-500">complement = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {lastComplement ?? "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">answer = </span>
              <span className="font-mono font-bold text-lg text-amber-600">
                {foundPair ? `[${foundPair[0]}, ${foundPair[1]}]` : "?"}
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
              disabled={isPlaying || !!foundPair || currentIndex >= nums.length}
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

        <div className="mb-8">
          <div className="mb-2 text-sm font-semibold text-gray-700">Array traversal</div>
          <div className="flex flex-wrap gap-2">
            {nums.map((num, idx) => {
              const isCurrent = idx === currentIndex && !foundPair && currentIndex < nums.length;
              const isVisited = idx < currentIndex;
              const isInAnswer = foundPair?.includes(idx);

              return (
                <div key={idx} className="relative">
                  <div
                    className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center font-mono font-semibold transition-all ${
                      isInAnswer
                        ? "bg-amber-500 text-white border-amber-600 scale-105"
                        : isCurrent
                        ? "bg-blue-500 text-white border-blue-600 scale-105"
                        : isVisited
                        ? "bg-emerald-50 text-gray-800 border-emerald-300"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {num}
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-1">[{idx}]</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-gray-700">HashMap state (value → index)</div>
          {mapEntries.length === 0 ? (
            <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">
              map is empty
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mapEntries.map(([value, index]) => (
                <div
                  key={`${value}-${index}`}
                  className="px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-mono text-sm"
                >
                  {value} → {index}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}