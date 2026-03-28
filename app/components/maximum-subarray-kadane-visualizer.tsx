'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

type MaximumSubarrayKadaneVisualizerProps = {
  nums?: number[];
};

export default function MaximumSubarrayKadaneVisualizer({
  nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4],
}: MaximumSubarrayKadaneVisualizerProps) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [currentSum, setCurrentSum] = useState(nums[0]);
  const [maxSum, setMaxSum] = useState(nums[0]);
  const [tempStart, setTempStart] = useState(0);
  const [bestStart, setBestStart] = useState(0);
  const [bestEnd, setBestEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('Click Play or Step to begin Kadane traversal');

  useEffect(() => {
    if (!isPlaying || currentIndex >= nums.length) {
      return;
    }

    const timer = setTimeout(() => {
      executeStep();
    }, 950);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, nums.length]);

  const executeStep = () => {
    if (currentIndex >= nums.length) {
      setIsPlaying(false);
      setMessage(
        `Complete! Best subarray is [${nums.slice(bestStart, bestEnd + 1).join(', ')}] with sum ${maxSum}`
      );
      return;
    }

    const value = nums[currentIndex];
    const extendSum = currentSum + value;
    const restartSum = value;

    let nextCurrentSum = extendSum;
    let nextTempStart = tempStart;
    let decisionText = `Index ${currentIndex}: Extend (${currentSum} + ${value} = ${extendSum})`;

    if (restartSum > extendSum) {
      nextCurrentSum = restartSum;
      nextTempStart = currentIndex;
      decisionText = `Index ${currentIndex}: Restart at ${value} (better than extending to ${extendSum})`;
    }

    let nextMaxSum = maxSum;
    let nextBestStart = bestStart;
    let nextBestEnd = bestEnd;
    let maxText = '';

    if (nextCurrentSum > maxSum) {
      nextMaxSum = nextCurrentSum;
      nextBestStart = nextTempStart;
      nextBestEnd = currentIndex;
      maxText = ` New max = ${nextMaxSum}.`;
    }

    setCurrentSum(nextCurrentSum);
    setTempStart(nextTempStart);
    setMaxSum(nextMaxSum);
    setBestStart(nextBestStart);
    setBestEnd(nextBestEnd);
    setMessage(`${decisionText}.${maxText}`);
    setCurrentIndex((prev) => prev + 1);
  };

  const reset = () => {
    setCurrentIndex(1);
    setCurrentSum(nums[0]);
    setMaxSum(nums[0]);
    setTempStart(0);
    setBestStart(0);
    setBestEnd(0);
    setIsPlaying(false);
    setMessage('Click Play or Step to begin Kadane traversal');
  };

  const togglePlay = () => {
    if (currentIndex >= nums.length) {
      reset();
      return;
    }

    setIsPlaying((prev) => !prev);
  };

  const activeStart = tempStart;
  const activeEnd = Math.min(currentIndex - 1, nums.length - 1);

  return (
    <div className="mt-6 mb-10 border rounded-2xl">
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Scanning Index</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.min(currentIndex, nums.length - 1)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Current Sum</div>
            <div className="text-2xl font-bold text-amber-600">{currentSum}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Max Sum</div>
            <div className="text-2xl font-bold text-green-600">{maxSum}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Best Range</div>
            <div className="text-xl font-bold text-indigo-600">[{bestStart}, {bestEnd}]</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5">
          <div className="text-sm font-medium text-gray-800 min-h-5">{message}</div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {nums.map((num, idx) => {
            const inActiveWindow = idx >= activeStart && idx <= activeEnd;
            const inBestWindow = idx >= bestStart && idx <= bestEnd;
            const isCursor = idx === currentIndex && currentIndex < nums.length;

            let cellClass = 'bg-gray-100 text-gray-700 border border-gray-300';

            if (inBestWindow) {
              cellClass = 'bg-green-100 text-green-900 border border-green-400';
            }

            if (inActiveWindow) {
              cellClass = 'bg-blue-500 text-white border border-blue-600 scale-105 shadow-lg';
            }

            if (isCursor) {
              cellClass = 'bg-amber-100 text-amber-900 border border-amber-400';
            }

            return (
              <div key={idx} className="relative flex flex-col items-center">
                <div className="text-[11px] font-medium text-gray-500 mb-1">
                  {isCursor ? 'i' : ''}
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
              [{nums.slice(activeStart, activeEnd + 1).join(', ')}]
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">Best Window So Far</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              [{nums.slice(bestStart, bestEnd + 1).join(', ')}]
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {currentIndex >= nums.length ? 'Restart' : isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={executeStep}
            disabled={isPlaying || currentIndex >= nums.length}
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