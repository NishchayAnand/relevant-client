"use client"

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export default function TwoPointerVisualizer() {
  const [nums, setNums] = useState([0, 1, 2, 2, 3, 0, 4, 2]);
  const [val, setVal] = useState(2);
  const [slow, setSlow] = useState(0);
  const [fast, setFast] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('Click Play to start');

  const initialNums = [0, 1, 2, 2, 3, 0, 4, 2];

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        executeStep();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, slow, fast]);

  const executeStep = () => {
    if (fast >= initialNums.length) {
      setMessage(`Complete! New length: ${slow}`);
      setIsPlaying(false);
      return;
    }

    if (initialNums[fast] !== val) {
      setMessage(`nums[${fast}] = ${initialNums[fast]} ≠ ${val}, copy to nums[${slow}]`);
      const newNums = [...nums];
      newNums[slow] = initialNums[fast];
      setNums(newNums);
      setSlow(slow + 1);
      setFast(fast + 1);
    } else {
      setMessage(`nums[${fast}] = ${val}, skip (move fast pointer only)`);
      setFast(fast + 1);
    }
  };

  const reset = () => {
    setNums([...initialNums]);
    setSlow(0);
    setFast(0);
    setIsPlaying(false);
    setMessage('Click Play to start');
  };

  const togglePlay = () => {
    if (fast >= initialNums.length) reset();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl flex items-center justify-center">
      <div className="p-8 w-full">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">slow = </span>
              <span className="font-mono font-bold text-lg text-green-600">{slow}</span>
            </div>
            <div>
              <span className="text-gray-500">fast = </span>
              <span className="font-mono font-bold text-lg text-blue-600">{fast}</span>
            </div>
            <div>
              <span className="text-gray-500">val = </span>
              <span className="font-mono font-bold text-lg">{val}</span>
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
              disabled={isPlaying || fast >= initialNums.length}
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

        <div className="my-10 text-center text-sm text-gray-600 font-medium h-5">
          {message}
        </div>

        <div className="flex gap-2 justify-center mb-4">
          {nums.map((num, idx) => (
            <div key={idx} className="relative">
              <div
                className={`w-12 h-12 flex items-center justify-center font-mono font-semibold rounded border-2 transition-all ${
                  idx === slow && idx === fast
                    ? 'bg-purple-500 text-white border-purple-600 scale-110'
                    : idx === slow
                    ? 'bg-green-500 text-white border-green-600 scale-110'
                    : idx === fast
                    ? 'bg-blue-500 text-white border-blue-600 scale-110'
                    : idx < slow
                    ? 'bg-green-50 text-gray-700 border-green-300'
                    : num === val
                    ? 'bg-white text-red-500 border-red-300'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {num}
              </div>
              {idx === slow && idx === fast && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-purple-600">
                  both
                </div>
              )}
              {idx === slow && idx !== fast && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-green-600">
                  slow
                </div>
              )}
              {idx === fast && idx !== slow && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-blue-600">
                  fast
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}