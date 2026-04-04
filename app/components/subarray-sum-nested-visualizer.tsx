"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_NUMS = [1, 2, 3];
const DEFAULT_K = 3;

// Each step is one inner-loop body execution, or the outer-loop advance.
// j === -1 means the inner loop hasn't started yet for the current i.
type Stage = "idle" | "running" | "done";

type FoundEntry = { start: number; end: number; subarray: number[]; sum: number };

export default function SubarraySumNestedVisualizer() {
  const [numsInput, setNumsInput] = useState(DEFAULT_NUMS.join(", "));
  const [kInput, setKInput] = useState(String(DEFAULT_K));
  const [inputError, setInputError] = useState<string | null>(null);

  const [nums, setNums] = useState(DEFAULT_NUMS);
  const [k, setK] = useState(DEFAULT_K);

  const [stage, setStage] = useState<Stage>("idle");
  const [i, setI] = useState(0);
  const [j, setJ] = useState(-1);
  const [currentSum, setCurrentSum] = useState(0);
  const [count, setCount] = useState(0);
  const [found, setFound] = useState<FoundEntry[]>([]);
  const [message, setMessage] = useState("Press Play or Step to begin");
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = stage === "done";

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const timer = setTimeout(() => executeStep(), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, stage, i, j]);

  const executeStep = () => {
    if (stage === "idle") {
      setStage("running");
      setI(0);
      setJ(-1);
      setCurrentSum(0);
      setMessage("Outer loop: i = 0. Reset currentSum = 0.");
      return;
    }

    if (stage === "done") return;

    // ── Outer loop exhausted ──────────────────────────────────────────────────
    if (i >= nums.length) {
      setStage("done");
      setIsPlaying(false);
      setMessage(`Done. count = ${count}.`);
      return;
    }

    // ── j hasn't started for this i: begin inner loop (j = i) ────────────────
    if (j === -1) {
      const newJ = i;
      const newSum = nums[i];
      const matched = newSum === k;
      if (matched) {
        const newCount = count + 1;
        setCount(newCount);
        setFound((prev) => [
          ...prev,
          { start: i, end: newJ, subarray: [nums[i]], sum: newSum },
        ]);
        setMessage(
          `i=${i}, j=${newJ}: currentSum = ${newSum} = k. count = ${newCount}. ✓`
        );
      } else {
        setMessage(
          `i=${i}, j=${newJ}: currentSum = ${newSum} ≠ k.`
        );
      }
      setJ(newJ);
      setCurrentSum(newSum);
      return;
    }

    // ── Inner loop: advance j ─────────────────────────────────────────────────
    if (j < nums.length - 1) {
      const newJ = j + 1;
      const newSum = currentSum + nums[newJ];
      const matched = newSum === k;
      if (matched) {
        const newCount = count + 1;
        setCount(newCount);
        setFound((prev) => [
          ...prev,
          {
            start: i,
            end: newJ,
            subarray: nums.slice(i, newJ + 1),
            sum: newSum,
          },
        ]);
        setMessage(
          `i=${i}, j=${newJ}: currentSum = ${newSum} = k. count = ${newCount}. ✓`
        );
      } else {
        setMessage(`i=${i}, j=${newJ}: currentSum = ${newSum} ≠ k.`);
      }
      setJ(newJ);
      setCurrentSum(newSum);
      return;
    }

    // ── Inner loop exhausted: advance outer loop ──────────────────────────────
    const newI = i + 1;
    if (newI >= nums.length) {
      setStage("done");
      setIsPlaying(false);
      setI(newI);
      setJ(-1);
      setCurrentSum(0);
      setMessage(`Done. count = ${count}.`);
    } else {
      setI(newI);
      setJ(-1);
      setCurrentSum(0);
      setMessage(`Inner loop done for i=${i}. Outer loop: i = ${newI}. Reset currentSum = 0.`);
    }
  };

  const reset = (nextNums = nums, nextK = k) => {
    setStage("idle");
    setI(0);
    setJ(-1);
    setCurrentSum(0);
    setCount(0);
    setFound([]);
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
          <div className="flex gap-5 text-sm">
            <div>
              <span className="text-gray-500">i = </span>
              <span className="font-mono font-bold text-lg text-orange-500">
                {stage === "idle" ? "—" : i >= nums.length ? "—" : i}
              </span>
            </div>
            <div>
              <span className="text-gray-500">j = </span>
              <span className="font-mono font-bold text-lg text-blue-600">
                {stage === "idle" || j === -1 ? "—" : j}
              </span>
            </div>
            <div>
              <span className="text-gray-500">currentSum = </span>
              <span className="font-mono font-bold text-lg text-purple-600">
                {stage === "idle" ? "—" : currentSum}
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
              const isI = stage !== "idle" && idx === i && i < nums.length;
              const isJ = stage !== "idle" && j !== -1 && idx === j;
              const inRange = stage !== "idle" && j !== -1 && idx >= i && idx <= j && i < nums.length;
              const pastI = stage !== "idle" && idx < i;

              let cellClass = "bg-white text-gray-800 border-gray-200";
              if (inRange) {
                cellClass = "bg-blue-50 text-blue-800 border-blue-200";
              }
              if (isI && isJ) {
                cellClass = "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-orange-300";
              } else if (isI && !inRange) {
                cellClass = "bg-orange-50 text-orange-800 border-orange-300 ring-2 ring-orange-200";
              } else if (isJ) {
                cellClass = "bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-300";
              }
              if (pastI) {
                cellClass = "bg-gray-50 text-gray-400 border-gray-200";
              }

              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-xl border-2 font-mono font-bold flex items-center justify-center text-sm transition-all ${cellClass}`}>
                    {value}
                  </div>
                  <div className="flex gap-1 h-4">
                    {isI && <span className="text-[10px] text-orange-500 font-semibold">i</span>}
                    {isJ && <span className="text-[10px] text-blue-500 font-semibold">j</span>}
                    {!isI && !isJ && <span className="text-[10px] text-gray-400">[{idx}]</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Found subarrays */}
        {found.length > 0 && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-widest text-gray-400">
              Subarrays with sum = {k}
            </div>
            <div className="flex flex-col gap-1.5">
              {found.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm font-mono rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-200"
                >
                  <span className="text-gray-400">
                    [{entry.start}..{entry.end}]:
                  </span>
                  <span className="text-emerald-700 font-bold">
                    [{entry.subarray.join(", ")}]
                  </span>
                  <span className="ml-auto text-xs text-gray-400">sum = {entry.sum}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-50 border-2 border-orange-300 inline-block" />i (outer)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-300 inline-block" />j (inner / active subarray)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-300 inline-block" />sum = k
          </span>
        </div>
      </div>
    </div>
  );
}
