"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const DEFAULT_VALUES = [3, 2, 0, -4];
const DEFAULT_POS = 1; // tail connects to index 1

const buildNextIndices = (length: number, pos: number) => {
  return Array.from({ length }, (_, idx) => {
    if (idx === length - 1) return pos;
    return idx + 1;
  });
};

export default function DetectCycleVisitedSetVisualizer() {
  const [values] = useState<number[]>(DEFAULT_VALUES);
  const [pos] = useState(DEFAULT_POS);
  const [currentIndex, setCurrentIndex] = useState<number | null>(0);
  const [visitedOrder, setVisitedOrder] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Press Play to start the traversal");
  const [cycleAt, setCycleAt] = useState<number | null>(null);
  const [steps, setSteps] = useState(0);

  const nextIndices = useMemo(
    () => buildNextIndices(values.length, pos),
    [values.length, pos]
  );

  const visitedSet = useMemo(
    () => new Set(visitedOrder),
    [visitedOrder]
  );

  const executeStep = useCallback(() => {
    if (currentIndex === null) {
      setMessage("Reached null. No cycle found.");
      setIsPlaying(false);
      return;
    }

    if (visitedSet.has(currentIndex)) {
      setCycleAt(currentIndex);
      setMessage(`Node ${currentIndex} was seen again. Cycle detected!`);
      setIsPlaying(false);
      return;
    }

    setVisitedOrder((prev) => [...prev, currentIndex]);
    const next = nextIndices[currentIndex];
    setCurrentIndex(next ?? null);
    setSteps((prev) => prev + 1);
    setMessage(`Visited node ${currentIndex}. Move to next → ${next}.`);
  }, [currentIndex, nextIndices, visitedSet]);

  useEffect(() => {
    if (!isPlaying) return;
    if (cycleAt !== null) return;
    const timer = setTimeout(() => {
      executeStep();
    }, 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, cycleAt, executeStep]);

  const reset = () => {
    setCurrentIndex(0);
    setVisitedOrder([]);
    setIsPlaying(false);
    setMessage("Press Play to start the traversal");
    setCycleAt(null);
    setSteps(0);
  };

  const togglePlay = () => {
    if (cycleAt !== null || currentIndex === null) {
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
              <span className="text-gray-500">current = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {currentIndex ?? "null"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">pos = </span>
              <span className="font-mono font-bold text-lg text-indigo-600">
                {pos}
              </span>
            </div>
            <div>
              <span className="text-gray-500">cycle at = </span>
              <span className="font-mono font-bold text-lg text-amber-600">
                {cycleAt ?? "?"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">steps = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {steps}
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
              disabled={isPlaying || cycleAt !== null || currentIndex === null}
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

        <div className="flex flex-wrap items-center justify-center gap-2">
          {values.map((value, idx) => {
            const isVisited = visitedSet.has(idx);
            const isCurrent = idx === currentIndex;
            const isCycleEntry = idx === cycleAt;
            const isLast = idx === values.length - 1;
            const isCycleTarget = idx === pos;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className={`rounded-2xl border px-4 py-3 min-w-35 text-center transition-all ${
                    isCycleEntry
                      ? "bg-amber-50 border-amber-300 shadow-sm"
                      : isCurrent
                      ? "bg-blue-50 border-blue-300"
                      : isVisited
                      ? "bg-emerald-50 border-emerald-200"
                    : isCycleTarget
                      ? "bg-indigo-50 border-indigo-300"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="text-xs text-gray-500">index</div>
                  <div className="font-mono text-lg font-semibold text-gray-800">
                    {idx}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">value</div>
                  <div className="font-mono text-base font-semibold text-indigo-700">
                    {value}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">next</div>
                  <div className="font-mono text-base font-semibold text-gray-700">
                    → {nextIndices[idx]}
                  </div>
                  {isCycleTarget && (
                    <div className="mt-2 text-[10px] text-indigo-600">
                      cycle target (index {pos})
                    </div>
                  )}
                  {isLast && (
                    <div className="mt-2 text-[10px] text-amber-600">
                      tail points to index {pos}
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div className="text-gray-300 text-2xl font-semibold">→</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-gray-500">
          <div className="font-medium text-gray-600">
            Cycle link (tail index {values.length - 1} → index {pos})
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
              tail index {values.length - 1}
            </span>
            <svg
              width="140"
              height="40"
              viewBox="0 0 140 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M6 34 C35 4, 105 4, 134 34"
                stroke="#F59E0B"
                strokeWidth="2"
                fill="none"
              />
              <path d="M128 30 L134 34 L126 35" fill="#F59E0B" />
            </svg>
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">
              index {pos}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs text-gray-500 mb-2">Visited set</div>
          <div className="flex flex-wrap gap-2">
            {visitedOrder.length === 0 ? (
              <span className="text-xs text-gray-400">(empty)</span>
            ) : (
              visitedOrder.map((idx) => (
                <span
                  key={`visited-${idx}`}
                  className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700"
                >
                  {idx}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
