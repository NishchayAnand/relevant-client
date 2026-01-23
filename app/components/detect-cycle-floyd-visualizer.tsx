"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const DEFAULT_VALUES = [3, 2, 0, -4];
const DEFAULT_POS = 1;

const buildNextIndices = (length: number, pos: number) =>
  Array.from({ length }, (_, idx) => (idx === length - 1 ? pos : idx + 1));

export default function DetectCycleFloydVisualizer() {
  const [values] = useState<number[]>(DEFAULT_VALUES);
  const [pos] = useState(DEFAULT_POS);
  const [slow, setSlow] = useState(0);
  const [fast, setFast] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Press Play to start");
  const [metAt, setMetAt] = useState<number | null>(null);

  const nextIndices = useMemo(
    () => buildNextIndices(values.length, pos),
    [values.length, pos]
  );

  const executeStep = useCallback(() => {
    if (metAt !== null) return;
    const nextSlow = nextIndices[slow];
    const nextFast = nextIndices[nextIndices[fast]];

    setSlow(nextSlow);
    setFast(nextFast);

    if (nextSlow === nextFast) {
      setMetAt(nextSlow);
      setIsPlaying(false);
      setMessage(`Pointers meet at index ${nextSlow}. Cycle detected!`);
      return;
    }

    setMessage(`slow → ${nextSlow}, fast → ${nextFast}`);
  }, [fast, metAt, nextIndices, slow]);

  useEffect(() => {
    if (!isPlaying || metAt !== null) return;
    const timer = setTimeout(() => {
      executeStep();
    }, 900);
    return () => clearTimeout(timer);
  }, [executeStep, isPlaying, metAt]);

  const reset = () => {
    setSlow(0);
    setFast(0);
    setIsPlaying(false);
    setMetAt(null);
    setMessage("Press Play to start");
  };

  const togglePlay = () => {
    if (metAt !== null) {
      reset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="mt-6 mb-10 border rounded-2xl">
      <div className="p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 text-sm">
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
              <span className="text-gray-500">meeting = </span>
              <span className="font-mono font-bold text-lg text-amber-600">
                {metAt ?? "?"}
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
              disabled={isPlaying || metAt !== null}
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
            const isSlow = idx === slow;
            const isFast = idx === fast;
            const isMet = idx === metAt;
            const isLast = idx === values.length - 1;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className={`rounded-2xl border px-4 py-3 min-w-35 text-center transition-all ${
                    isMet
                      ? "bg-amber-50 border-amber-300 shadow-sm"
                      : isSlow && isFast
                      ? "bg-purple-50 border-purple-300"
                      : isSlow
                      ? "bg-emerald-50 border-emerald-300"
                      : isFast
                      ? "bg-blue-50 border-blue-300"
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

        <div className="mt-4 text-xs text-gray-500 text-center">
          slow moves 1 step, fast moves 2 steps. Collision implies a cycle.
        </div>
      </div>
    </div>
  );
}
