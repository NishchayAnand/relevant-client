"use client"

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export default function MajorityElementFrequencyMapVisualizer() {
  const [nums, setNums] = useState([2, 2, 1, 1, 1, 2, 2]);
  const [freqMap, setFreqMap] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [majorityElement, setMajorityElement] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('Click "Start" to begin visualization');
  const [highlightNum, setHighlightNum] = useState<number | null>(null);

  const initialNums = [2, 2, 1, 1, 1, 2, 2];
  const n = nums.length;
  const threshold = Math.floor(n / 2);

  useEffect(() => {
    if (isPlaying && currentIndex < nums.length && majorityElement === null) {
      const timer = setTimeout(() => {
        executeStep();
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentIndex >= nums.length || majorityElement !== null) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIndex, majorityElement]);

  const executeStep = () => {
    if (currentIndex >= nums.length || majorityElement !== null) {
      return;
    }

    const num = nums[currentIndex];
    const newFreqMap = { ...freqMap };
    
    setHighlightNum(num);
    
    if (newFreqMap[num]) {
      newFreqMap[num] = newFreqMap[num] + 1;
      setMessage(`Found ${num} again! Incrementing count: ${newFreqMap[num] - 1} → ${newFreqMap[num]}`);
    } else {
      newFreqMap[num] = 1;
      setMessage(`First occurrence of ${num}. Added to map with count: 1`);
    }

    setFreqMap(newFreqMap);

    setTimeout(() => {
      if (newFreqMap[num] > threshold) {
        setMajorityElement(num);
        setMessage(`🎉 Found majority element: ${num} (appears ${newFreqMap[num]} times, threshold: ${threshold})`);
        setIsPlaying(false);
      } else {
        setMessage(`Count of ${num} is ${newFreqMap[num]} (threshold: ${threshold}). Continue...`);
        setCurrentIndex(currentIndex + 1);
        setHighlightNum(null);
      }
    }, 800);
  };

  const reset = () => {
    setNums([...initialNums]);
    setFreqMap({});
    setCurrentIndex(0);
    setMajorityElement(null);
    setIsPlaying(false);
    setHighlightNum(null);
    setMessage('Click "Start" to begin visualization');
  };

  const togglePlay = () => {
    if (currentIndex >= nums.length || majorityElement !== null) {
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
              <div className="text-sm text-gray-600">Current Index</div>
              <div className="text-2xl font-bold text-indigo-600">{currentIndex}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Array Length (n)</div>
              <div className="text-2xl font-bold text-indigo-600">{n}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Threshold (⌊n/2⌋)</div>
              <div className="text-2xl font-bold text-purple-600">{threshold}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
            <div className="text-sm text-gray-600 mb-2">Status</div>
            <div className="text-base font-medium text-gray-800">{message}</div>
          </div>

          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-700 mb-3">Input Array</div>
            <div className="flex flex-wrap gap-3 justify-center">
              {nums.map((num, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`w-16 h-16 flex items-center justify-center text-xl font-bold rounded-lg transition-all duration-300 ${
                      idx === currentIndex
                        ? 'bg-indigo-500 text-white scale-110 shadow-lg'
                        : idx < currentIndex
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    }`}
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

          <div className="bg-linear-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
            <div className="text-sm font-semibold text-gray-700 mb-4">Frequency Map</div>
            {Object.keys(freqMap).length === 0 ? (
              <div className="text-center text-gray-500 py-8">Empty map - no elements processed yet</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.entries(freqMap).map(([num, count]) => (
                  <div
                    key={num}
                    className={`bg-white p-4 rounded-lg shadow-md transition-all duration-300 ${
                      Number(num) === highlightNum
                        ? 'ring-4 ring-indigo-400 scale-105'
                        : count > threshold
                        ? 'ring-4 ring-green-400'
                        : ''
                    }`}
                  >
                    <div className="text-2xl font-bold text-gray-800 mb-1">{num}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Count:</span>
                      <span
                        className={`text-lg font-bold ${
                          count > threshold ? 'text-green-600' : 'text-indigo-600'
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    {count > threshold && (
                      <div className="mt-2 text-xs text-green-600 font-semibold">
                        ✓ Majority!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {majorityElement !== null && (
            <div className="mt-6 bg-green-100 border-2 border-green-400 rounded-xl p-4 text-center">
              <div className="text-sm text-green-700 font-semibold mb-1">Majority Element Found!</div>
              <div className="text-4xl font-bold text-green-700">{majorityElement}</div>
              <div className="text-sm text-green-600 mt-2">
                Appears {freqMap[majorityElement]} times (more than {threshold})
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {currentIndex >= nums.length || majorityElement !== null ? 'Restart' : isPlaying ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={executeStep}
              disabled={isPlaying || currentIndex >= nums.length || majorityElement !== null}
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