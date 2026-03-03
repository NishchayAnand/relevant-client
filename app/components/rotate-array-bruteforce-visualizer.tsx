"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const DEFAULT_NUMS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_K = 3;
const LENGTH = DEFAULT_NUMS.length;

type Phase = "fill" | "copy" | "done";

export default function RotateArrayBruteForceVisualizer() {
  const [nums, setNums] = useState(DEFAULT_NUMS);
  const [temp, setTemp] = useState<(number | null)[]>(() => Array(LENGTH).fill(null));
  const [phase, setPhase] = useState<Phase>("fill");
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Press Play to start filling the temp array");

  useEffect(() => {
    if (!isPlaying || phase === "done") return;
    const timer = setTimeout(() => executeStep(), 1100);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, cursor, nums, temp]);

  const executeStep = () => {
    if (phase === "done") {
      setIsPlaying(false);
      return;
    }

    if (phase === "fill") {
      const destination = (cursor + DEFAULT_K) % LENGTH;
      setTemp((prev) => {
        const next = [...prev];
        next[destination] = nums[cursor];
        return next;
      });

      const isLast = cursor + 1 === LENGTH;
      setMessage(
        `Placed nums[${cursor}] (${nums[cursor]}) into temp[${destination}]`
      );

      if (isLast) {
        setCursor(0);
        setPhase("copy");
        setMessage(
          `Temp array ready. Start copying back to nums in the next step.`
        );
        return;
      }

      setCursor((prev) => prev + 1);
      return;
    }

    if (phase === "copy") {
      const value = temp[cursor];
      if (value === null) {
        setMessage(`Temp slot ${cursor} is not ready yet.`);
        setIsPlaying(false);
        return;
      }

      setNums((prev) => {
        const next = [...prev];
        next[cursor] = value;
        return next;
      });

      const isLast = cursor + 1 === LENGTH;
      setMessage(`Copied temp[${cursor}] (${value}) back to nums[${cursor}]`);

      if (isLast) {
        setPhase("done");
        setIsPlaying(false);
        setMessage("Rotation complete! nums now reflects temp.");
        return;
      }

      setCursor((prev) => prev + 1);
      return;
    }
  };

  const reset = () => {
    setNums(DEFAULT_NUMS);
    setTemp(Array(LENGTH).fill(null));
    setPhase("fill");
    setCursor(0);
    setIsPlaying(false);
    setMessage("Press Play to start filling the temp array");
  };

  const togglePlay = () => {
    if (phase === "done") {
      reset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const activeSourceIndex = phase === "fill" ? cursor : null;
  const activeTempIndex = phase === "fill"
    ? (cursor + DEFAULT_K) % LENGTH
    : phase === "copy"
    ? cursor
    : null;
  const activeCopyIndex = phase === "copy" ? cursor : null;

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">k = </span>
              <span className="font-mono font-bold text-lg text-indigo-600">
                {DEFAULT_K}
              </span>
            </div>
            <div>
              <span className="text-gray-500">phase = </span>
              <span className="font-mono font-bold text-lg text-sky-600">
                {phase}
              </span>
            </div>
            <div>
              <span className="text-gray-500">index = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {phase === "done" ? "-" : cursor}
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
              disabled={isPlaying || phase === "done"}
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

        <div className="my-6 text-center text-sm text-gray-600 font-medium min-h-5">
          {message}
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">
              Original / current nums
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {nums.map((num, idx) => (
                <div key={`nums-${idx}`} className="text-center">
                  <div
                    className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 font-mono text-lg font-semibold transition-all ${
                      activeSourceIndex === idx
                        ? "bg-blue-100 text-blue-800 border-blue-300 scale-105"
                        : activeCopyIndex === idx
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 scale-105"
                        : "bg-white text-gray-800 border-gray-300"
                    }`}
                  >
                    {num}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">idx {idx}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">
              Temporary array
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {temp.map((value, idx) => (
                <div key={`temp-${idx}`} className="text-center">
                  <div
                    className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 font-mono text-lg font-semibold transition-all ${
                      activeTempIndex === idx
                        ? "bg-amber-100 text-amber-800 border-amber-300 scale-105"
                        : value !== null
                        ? "bg-slate-50 text-slate-800 border-slate-300"
                        : "bg-white text-gray-300 border-dashed border-gray-300"
                    }`}
                  >
                    {value ?? "-"}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">idx {idx}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}