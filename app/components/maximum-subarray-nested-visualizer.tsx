'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

type MaximumSubarrayNestedVisualizerProps = {
  nums?: number[];
};

export function MaximumSubarrayNestedVisualizer({
  nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4],
}: MaximumSubarrayNestedVisualizerProps) {
  const [i, setI] = useState(0);
  const [j, setJ] = useState(-1);
  const [currentSum, setCurrentSum] = useState(0);
  const [maxSum, setMaxSum] = useState(Number.NEGATIVE_INFINITY);
  const [bestStart, setBestStart] = useState(0);
  const [bestEnd, setBestEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Click Play or Step to begin exploring every subarray');

  useEffect(() => {
    if (!isPlaying || i >= nums.length) {
      return;
    }

    const timer = setTimeout(() => {
      executeStep();
    }, 850);

    return () => clearTimeout(timer);
  }, [isPlaying, i, j, step, nums.length]);

  const updateBestRange = (candidateSum: number, start: number, end: number) => {
    if (candidateSum > maxSum) {
      setMaxSum(candidateSum);
      setBestStart(start);
      setBestEnd(end);
      return true;
    }

    return false;
  };

  const executeStep = () => {
    if (i >= nums.length) {
      setIsPlaying(false);
      setMessage(
        `Complete! Best subarray is [${nums.slice(bestStart, bestEnd + 1).join(', ')}] with sum ${maxSum}`
      );
      return;
    }

    if (j < i) {
      const nextSum = nums[i];
      const foundBetter = updateBestRange(nextSum, i, i);

      setJ(i);
      setCurrentSum(nextSum);
      setMessage(
        foundBetter
          ? `Start at i=${i}. Subarray [${nums[i]}] gives a new max sum ${nextSum}`
          : `Start at i=${i}. Subarray [${nums[i]}] gives sum ${nextSum}`
      );
      setStep((prev) => prev + 1);
      return;
    }

    if (j < nums.length - 1) {
      const nextJ = j + 1;
      const nextSum = currentSum + nums[nextJ];
      const foundBetter = updateBestRange(nextSum, i, nextJ);

      setJ(nextJ);
      setCurrentSum(nextSum);
      setMessage(
        foundBetter
          ? `Extend to j=${nextJ}. Subarray [${nums.slice(i, nextJ + 1).join(', ')}] sets new max sum ${nextSum}`
          : `Extend to j=${nextJ}. Current subarray sum becomes ${nextSum}`
      );
      setStep((prev) => prev + 1);
      return;
    }

    const nextI = i + 1;

    if (nextI >= nums.length) {
      setI(nextI);
      setJ(-1);
      setCurrentSum(0);
      setIsPlaying(false);
      setMessage(
        `Complete! Best subarray is [${nums.slice(bestStart, bestEnd + 1).join(', ')}] with sum ${maxSum}`
      );
      setStep((prev) => prev + 1);
      return;
    }

    setI(nextI);
    setJ(-1);
    setCurrentSum(0);
    setMessage(`Finished all subarrays starting at i=${i}. Move outer loop to i=${nextI}`);
    setStep((prev) => prev + 1);
  };

  const reset = () => {
    setI(0);
    setJ(-1);
    setCurrentSum(0);
    setMaxSum(Number.NEGATIVE_INFINITY);
    setBestStart(0);
    setBestEnd(0);
    setIsPlaying(false);
    setStep(0);
    setMessage('Click Play or Step to begin exploring every subarray');
  };

  const togglePlay = () => {
    if (i >= nums.length) {
      reset();
      return;
    }

    setIsPlaying((prev) => !prev);
  };

  const hasStarted = j >= i;
  const hasBestRange = maxSum !== Number.NEGATIVE_INFINITY;
  const bestSubarray = hasBestRange ? nums.slice(bestStart, bestEnd + 1) : [];

  return (
    <div className="mt-6 mb-10 border rounded-2xl">
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Outer Index (i)</div>
            <div className="text-2xl font-bold text-blue-600">{Math.min(i, nums.length - 1)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Inner Index (j)</div>
            <div className="text-2xl font-bold text-indigo-600">{hasStarted ? j : '—'}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Current Sum</div>
            <div className="text-2xl font-bold text-amber-600">{hasStarted ? currentSum : '—'}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Max Sum</div>
            <div className="text-2xl font-bold text-green-600">
              {hasBestRange ? maxSum : '—'}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5">
          <div className="text-sm text-gray-600">Array: [{nums.join(', ')}]</div>
          <div className="text-sm font-medium text-gray-800 mt-1 min-h-5">{message}</div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {nums.map((num, idx) => {
            const inCurrentRange = hasStarted && idx >= i && idx <= j;
            const inBestRange = hasBestRange && idx >= bestStart && idx <= bestEnd;

            let cellClass = 'bg-gray-100 text-gray-700 border border-gray-300';

            if (inBestRange) {
              cellClass = 'bg-green-100 text-green-900 border border-green-400';
            }

            if (inCurrentRange) {
              cellClass = 'bg-blue-500 text-white border border-blue-600 scale-105 shadow-lg';
            }

            return (
              <div key={idx} className="relative flex flex-col items-center">
                <div className="text-[11px] font-medium text-gray-500 mb-1">
                  {idx === i && i < nums.length ? 'i' : idx === j ? 'j' : ''}
                </div>
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${cellClass}`}
                >
                  {num}
                </div>
                <div className="text-xs text-gray-500 mt-1">[{idx}]</div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">Current Window</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {hasStarted ? `[${nums.slice(i, j + 1).join(', ')}]` : 'Not started'}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">Best Window So Far</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {hasBestRange ? `[${bestSubarray.join(', ')}]` : 'Not found yet'}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {i >= nums.length ? 'Restart' : isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={executeStep}
            disabled={isPlaying || i >= nums.length}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-400"
          >
            <SkipForward size={16} />
            Step
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}