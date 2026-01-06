"use client"

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export default function RemoveElementVisualizer() {
  const [nums, setNums] = useState([3, 2, 2, 3]);
  const [val, setVal] = useState(3);
  const [i, setI] = useState(0);
  const [n, setN] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Click "Start" to begin visualization');
  const [isShifting, setIsShifting] = useState(false);
  const [shiftIndex, setShiftIndex] = useState(-1);

  const initialNums = [3, 2, 2, 3];
  const initialVal = 3;

  useEffect(() => {
    if (isPlaying && step < 100) {
      const timer = setTimeout(() => {
        executeStep();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, step, i, n]);

  const executeStep = () => {
    if (i >= n) {
      setMessage(`Done! Removed all occurrences of ${val}. New length: ${n}`);
      setIsPlaying(false);
      return;
    }

    if (nums[i] === val) {
      setMessage(`Found ${val} at index ${i}. Shifting elements left...`);
      setIsShifting(true);
      
      setTimeout(() => {
        const newNums = [...nums];
        for (let j = i; j < n - 1; j++) {
          newNums[j] = newNums[j + 1];
        }
        setNums(newNums);
        setN(n - 1);
        setIsShifting(false);
        setShiftIndex(-1);
        setMessage(`Shifted! Reduced length to ${n - 1}. Checking index ${i} again.`);
        setStep(step + 1);
      }, 600);
    } else {
      setMessage(`nums[${i}] = ${nums[i]} (not ${val}). Moving to next index.`);
      setI(i + 1);
      setStep(step + 1);
    }
  };

  const reset = () => {
    setNums([...initialNums]);
    setVal(initialVal);
    setI(0);
    setN(4);
    setStep(0);
    setIsPlaying(false);
    setIsShifting(false);
    setShiftIndex(-1);
    setMessage('Click "Start" to begin visualization');
  };

  const togglePlay = () => {
    if (i >= n) {
      reset();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="mt-5 mb-10">
      <div className="max-w-4xl mx-auto">

          <div className="p-6">
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-600">Current Index (i)</div>
                <div className="text-2xl font-bold text-indigo-600">{i}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-600">Array Length (n)</div>
                <div className="text-2xl font-bold text-indigo-600">{n}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-600">Target Value</div>
                <div className="text-2xl font-bold text-red-600">{val}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Status</div>
              <div className="text-base font-medium text-gray-800">{message}</div>
            </div>

            <div className="mt-15">
                <div className="flex flex-wrap gap-3 justify-center">
                    {nums.map((num, idx) => (
                        <div key={idx} className="relative">
                            <div
                                className={`w-16 h-16 flex items-center justify-center text-xl font-bold rounded-lg transition-all duration-300 ${
                                idx >= n
                                    ? 'bg-gray-200 text-gray-400 opacity-50'
                                    : idx === i
                                    ? 'bg-indigo-500 text-white scale-110 shadow-lg'
                                    : num === val
                                    ? 'bg-red-100 text-red-600 border-2 border-red-400'
                                    : 'bg-green-100 text-green-700 border-2 border-green-300'
                                } ${isShifting && idx >= i && idx < n ? 'animate-pulse' : ''}`}
                            >
                                {num}
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-1">
                                [{idx}]
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 justify-center mt-8">
                <button
                    onClick={togglePlay}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    {i >= n ? 'Restart' : isPlaying ? 'Pause' : 'Start'}
                </button>
                <button
                    onClick={executeStep}
                    disabled={isPlaying || i >= n}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <SkipForward size={20} />
                Step
                </button>
                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                    <RotateCcw size={20} />
                Reset
                </button>
            </div>
          </div>
        </div>
    </div>
  );
}