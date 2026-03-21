'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export function MinimumSizeSubarrayNestedVisualizer({ target = 7, nums = [2, 3, 1, 2, 4, 3] }) {
  const [i, setI] = useState(0);
  const [j, setJ] = useState(-1);
  const [currSum, setCurrSum] = useState(0);
  const [minLength, setMinLength] = useState(Infinity);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Start to visualize the nested loop approach');

  useEffect(() => {
    if (isPlaying && !(i >= nums.length)) {
      const timer = setTimeout(() => {
        executeStep();
      }, 800);
      return () => clearTimeout(timer);
    } else if (i >= nums.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, step, i, j]);

  const executeStep = () => {
    let newI = i;
    let newJ = j;
    let newSum = currSum;
    let newMsg = '';

    if (i >= nums.length) {
      setMessage(`Complete! Minimum length: ${minLength === Infinity ? 0 : minLength}`);
      return;
    }

    if (j < i) {
      newJ = i;
      newSum = nums[i];
      newMsg = `Start outer loop i=${i}, j=${i}, sum=${nums[i]}`;
    } else if (j < nums.length - 1 && newSum < target) {
      newJ = j + 1;
      newSum += nums[j + 1];
      newMsg = `Expand to j=${newJ}, sum=${newSum}`;
    } else if (newSum >= target) {
      const length = j - i + 1;
      if (length < minLength) {
        setMinLength(length);
        newMsg = `Found! Length=${length} (NEW MIN). Moving to next i.`;
      } else {
        newMsg = `Found! Length=${length}. Moving to next i.`;
      }
      newI = i + 1;
      newJ = -1;
      newSum = 0;
    } else {
      newI = i + 1;
      newJ = -1;
      newSum = 0;
      newMsg = `Sum < target. Move to i=${newI}`;
    }

    setI(newI);
    setJ(newJ);
    setCurrSum(newSum);
    setMessage(newMsg);
    setStep(step + 1);
  };

  const togglePlay = () => {
    if (i >= nums.length) {
      reset();
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const reset = () => {
    setI(0);
    setJ(-1);
    setCurrSum(0);
    setMinLength(Infinity);
    setIsPlaying(false);
    setStep(0);
    setMessage('Start to visualize the nested loop approach');
  };

  const isActive = (idx: number) => idx >= i && idx <= j && j !== -1;
  const result = minLength === Infinity ? 0 : minLength;

  return (
    <div className="mt-5 mb-10">
      <div className="max-w-4xl mx-auto">
        <div className="p-6">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-600">Outer (i)</div>
              <div className="text-2xl font-bold text-blue-600">{i}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-600">Inner (j)</div>
              <div className="text-2xl font-bold text-blue-600">{j === -1 ? '—' : j}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-600">Sum</div>
              <div className="text-2xl font-bold text-purple-600">{currSum}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-600">Min Len</div>
              <div className="text-2xl font-bold text-green-600">{result}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-4">
            <div className="text-sm text-gray-600">Target: {target}</div>
            <div className="text-sm font-medium text-gray-800 mt-1">{message}</div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {nums.map((num, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`w-12 h-12 flex items-center justify-center text-sm font-bold rounded-lg transition-all ${
                    isActive(idx)
                      ? 'bg-blue-500 text-white scale-110 shadow-lg'
                      : idx < i
                      ? 'bg-gray-300 text-gray-600'
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  {num}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">[{idx}]</div>
              </div>
            ))}
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
    </div>
  );
}

