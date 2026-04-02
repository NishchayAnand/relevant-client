"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_NUMS = [100, 4, 200, 1, 3, 2, 2];

type Stage = "sorting" | "scan" | "done";

type ComparisonType = "duplicate" | "consecutive" | "break";

export default function LongestConsecutiveSortingVisualizer() {
  const [nums] = useState(DEFAULT_NUMS);
  const [sortedNums, setSortedNums] = useState<number[]>([]);
  const [scanIndex, setScanIndex] = useState(1);
  const [currLength, setCurrLength] = useState(1);
  const [maxLength, setMaxLength] = useState(1);
  const [stage, setStage] = useState<Stage>("sorting");
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Press Play or Step to start sorting");
  const [lastComparison, setLastComparison] = useState<ComparisonType | null>(null);

  useEffect(() => {
    if (!isPlaying || stage === "done") {
      return;
    }

    const timer = setTimeout(() => {
      executeStep();
    }, 900);

    return () => clearTimeout(timer);
  }, [isPlaying, stage, scanIndex, sortedNums, currLength, maxLength]);

  const executeStep = () => {
    if (stage === "sorting") {
      const finalSorted = [...nums].sort((a, b) => a - b);
      setSortedNums(finalSorted);
      setStage("scan");
      setMessage(`Sorted in one step -> [${finalSorted.join(", ")}]`);
      return;
    }

    if (stage === "scan") {
      if (sortedNums.length === 0) {
        setStage("done");
        setIsPlaying(false);
        setMessage("Array is empty. Answer is 0.");
        return;
      }

      if (scanIndex >= sortedNums.length) {
        setStage("done");
        setIsPlaying(false);
        setMessage(`Scan complete. Longest length = ${maxLength}.`);
        return;
      }

      const prev = sortedNums[scanIndex - 1];
      const current = sortedNums[scanIndex];

      if (current === prev) {
        setLastComparison("duplicate");
        setMessage(
          `nums[${scanIndex}] = ${current} is duplicate of ${prev}; skip it.`
        );
        setScanIndex((prevIndex) => prevIndex + 1);
        return;
      }

      if (current === prev + 1) {
        const nextCurr = currLength + 1;
        const nextMax = Math.max(maxLength, nextCurr);
        setCurrLength(nextCurr);
        setMaxLength(nextMax);
        setLastComparison("consecutive");
        setMessage(
          `${prev} -> ${current} is consecutive, currLength = ${nextCurr}, maxLength = ${nextMax}.`
        );
        setScanIndex((prevIndex) => prevIndex + 1);
        return;
      }

      setCurrLength(1);
      setLastComparison("break");
      setMessage(
        `${prev} -> ${current} breaks sequence, reset currLength to 1.`
      );
      setScanIndex((prevIndex) => prevIndex + 1);
      return;
    }
  };

  const reset = () => {
    setSortedNums([]);
    setScanIndex(1);
    setCurrLength(1);
    setMaxLength(1);
    setStage("sorting");
    setIsPlaying(false);
    setLastComparison(null);
    setMessage("Press Play or Step to start sorting");
  };

  const togglePlay = () => {
    if (stage === "done") {
      reset();
      setIsPlaying(true);
      return;
    }

    setIsPlaying((prev) => !prev);
  };

  const sortedDisplay = useMemo(() => {
    if (stage === "sorting" && sortedNums.length === 0) {
      return nums.map(() => "_");
    }

    return sortedNums;
  }, [nums, sortedNums, stage]);

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">stage = </span>
              <span className="font-mono font-bold text-lg text-indigo-600">{stage}</span>
            </div>
            <div>
              <span className="text-gray-500">currLength = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">{currLength}</span>
            </div>
            <div>
              <span className="text-gray-500">maxLength = </span>
              <span className="font-mono font-bold text-lg text-amber-600">{maxLength}</span>
            </div>
            <div>
              <span className="text-gray-500">scanIndex = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {stage === "sorting" ? "-" : Math.min(scanIndex, sortedNums.length - 1)}
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
              disabled={isPlaying || stage === "done"}
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

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-700 font-medium min-h-5">{message}</div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-gray-700">Original array</div>
          <div className="flex flex-wrap gap-2">
            {nums.map((num, idx) => (
              <div key={`raw-${idx}`} className="text-center">
                <div className="w-12 h-12 rounded-lg border border-gray-300 bg-gray-50 text-gray-800 font-mono font-semibold flex items-center justify-center">
                  {num}
                </div>
                <div className="mt-1 text-xs text-gray-500">[{idx}]</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-gray-700">Sorted array state</div>
          <div className="flex flex-wrap gap-2">
            {sortedDisplay.map((value, idx) => {
              const inScan = stage !== "sorting" && (idx === scanIndex || idx === scanIndex - 1);
              const activeClass = inScan
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-white text-gray-800 border-gray-300";

              return (
                <div key={`sorted-${idx}`} className="text-center">
                  <div
                    className={`w-12 h-12 rounded-lg border font-mono font-semibold flex items-center justify-center transition-colors ${activeClass}`}
                  >
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">[{idx}]</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3 text-xs uppercase tracking-[0.12em]">
          <div
            className={`rounded-lg border px-3 py-2 ${
              lastComparison === "duplicate"
                ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                : "border-gray-200 bg-gray-50 text-gray-500"
            }`}
          >
            Duplicate: skip
          </div>
          <div
            className={`rounded-lg border px-3 py-2 ${
              lastComparison === "consecutive"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-gray-50 text-gray-500"
            }`}
          >
            Consecutive: currLength + 1
          </div>
          <div
            className={`rounded-lg border px-3 py-2 ${
              lastComparison === "break"
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-gray-200 bg-gray-50 text-gray-500"
            }`}
          >
            Break: currLength = 1
          </div>
        </div>
      </div>
    </div>
  );
}
