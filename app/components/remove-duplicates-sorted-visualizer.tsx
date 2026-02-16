"use client"

import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export default function RemoveDuplicatesSortedVisualizer() {
  const initialNums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];

  const [nums, setNums] = useState([...initialNums]);
  const [k, setK] = useState(1);
  const [i, setI] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('Click Play or Step to begin');

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      executeStep();
    }, 900);

    return () => clearTimeout(timer);
  }, [isPlaying, i, k]);

  const executeStep = () => {
    if (i >= nums.length) {
      setMessage(`Complete! Unique count (k) = ${k}. Unique part: [${nums.slice(0, k).join(', ')}]`);
      setIsPlaying(false);
      return;
    }

    const current = nums[i];
    const previous = nums[i - 1];

    if (current !== previous) {
      const nextNums = [...nums];
      nextNums[k] = current;
      setNums(nextNums);
      setMessage(`nums[${i}] = ${current} is new, write to nums[${k}] and move k`);
      setK(k + 1);
    } else {
      setMessage(`nums[${i}] = ${current} is duplicate, move i only`);
    }

    setI(i + 1);
  };

  const reset = () => {
    setNums([...initialNums]);
    setK(1);
    setI(1);
    setIsPlaying(false);
    setMessage('Click Play or Step to begin');
  };

  const togglePlay = () => {
    if (i >= nums.length) {
      reset();
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const uniqueBoundary = Math.max(k - 1, 0);

  return (
    <div className="mt-8 mb-10 border rounded-2xl flex items-center justify-center">
      <div className="p-8 w-full">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">k (write) = </span>
              <span className="font-mono font-bold text-lg text-green-600">{k}</span>
            </div>
            <div>
              <span className="text-gray-500">i (read) = </span>
              <span className="font-mono font-bold text-lg text-blue-600">{i}</span>
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
              disabled={isPlaying || i >= nums.length}
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

        <div className="my-10 text-center text-sm text-gray-600 font-medium min-h-5">
          {message}
        </div>

        <div className="flex gap-2 justify-center mb-3 flex-wrap">
          {nums.map((num, idx) => {
            const isReadPointer = idx === i;
            const isWritePointer = idx === k;

            let cellClass = 'bg-white text-gray-700 border-gray-300';

            if (isReadPointer && isWritePointer) {
              cellClass = 'bg-purple-500 text-white border-purple-600 scale-110';
            } else if (isWritePointer) {
              cellClass = 'bg-green-500 text-white border-green-600 scale-110';
            } else if (isReadPointer) {
              cellClass = 'bg-blue-500 text-white border-blue-600 scale-110';
            } else if (idx <= uniqueBoundary) {
              cellClass = 'bg-green-50 text-gray-700 border-green-300';
            }

            return (
              <div key={idx} className="relative">
                <div
                  className={`w-12 h-12 flex items-center justify-center font-mono font-semibold rounded border-2 transition-all ${cellClass}`}
                >
                  {num}
                </div>

                {isReadPointer && isWritePointer && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-purple-600">
                    i & k
                  </div>
                )}
                {isWritePointer && !isReadPointer && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-green-600">
                    k
                  </div>
                )}
                {isReadPointer && !isWritePointer && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-blue-600">
                    i
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 text-center">
          Green zone (0..k-1) stores the compacted unique elements.
        </p>
      </div>
    </div>
  );
}
