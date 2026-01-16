"use client"

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export default function MajorityElementSortingVisualizer() {
  const [nums, setNums] = useState([2, 2, 1, 1, 1, 2, 2]);
  const [sortedNums, setSortedNums] = useState<number[]>([]);
  const [step, setStep] = useState<'initial' | 'sorting' | 'sorted' | 'found'>('initial');
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('Click "Start" to begin visualization');
  const [majorityElement, setMajorityElement] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [sortingPhase, setSortingPhase] = useState(0);

  const initialNums = [2, 2, 1, 1, 1, 2, 2];
  const n = nums.length;
  const middleIndex = Math.floor(n / 2);

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        executeStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, step, sortingPhase]);

  const executeStep = () => {
    if (step === 'initial') {
      setMessage('Starting sorting process...');
      setStep('sorting');
      setSortingPhase(0);
    } else if (step === 'sorting') {
      // Simulate bubble sort animation with phases
      if (sortingPhase === 0) {
        setMessage('Comparing and swapping elements...');
        const temp = [...nums];
        // First pass
        for (let i = 0; i < temp.length - 1; i++) {
          if (temp[i] > temp[i + 1]) {
            [temp[i], temp[i + 1]] = [temp[i + 1], temp[i]];
          }
        }
        setSortedNums(temp);
        setSortingPhase(1);
      } else if (sortingPhase === 1) {
        setMessage('Continuing to sort...');
        const temp = [...sortedNums];
        // Second pass
        for (let i = 0; i < temp.length - 2; i++) {
          if (temp[i] > temp[i + 1]) {
            [temp[i], temp[i + 1]] = [temp[i + 1], temp[i]];
          }
        }
        setSortedNums(temp);
        setSortingPhase(2);
      } else if (sortingPhase === 2) {
        setMessage('Almost sorted...');
        const temp = [...sortedNums];
        // Final pass - complete sort
        temp.sort((a, b) => a - b);
        setSortedNums(temp);
        setStep('sorted');
      }
    } else if (step === 'sorted') {
      setMessage(`Array is now sorted! Finding element at middle index [${middleIndex}]...`);
      setHighlightIndex(middleIndex);
      setTimeout(() => {
        setStep('found');
      }, 800);
    } else if (step === 'found') {
      const majority = sortedNums[middleIndex];
      setMajorityElement(majority);
      setMessage(`🎉 Majority element is ${majority} at index [${middleIndex}]`);
      setIsPlaying(false);
    }
  };

  const reset = () => {
    setNums([...initialNums]);
    setSortedNums([]);
    setStep('initial');
    setMajorityElement(null);
    setIsPlaying(false);
    setHighlightIndex(null);
    setSortingPhase(0);
    setMessage('Click "Start" to begin visualization');
  };

  const togglePlay = () => {
    if (step === 'found') {
      reset();
    }
    setIsPlaying(!isPlaying);
  };

  const displayArray = step === 'initial' ? nums : sortedNums.length > 0 ? sortedNums : nums;
  const isSorted = step === 'sorted' || step === 'found';

  return (
    <div className="mt-5 mb-10">
      <div className="max-w-4xl mx-auto">
        <div className="p-6">
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Array Length (n)</div>
              <div className="text-2xl font-bold text-indigo-600">{n}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Middle Index (⌊n/2⌋)</div>
              <div className="text-2xl font-bold text-purple-600">{middleIndex}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Current Step</div>
              <div className="text-lg font-bold text-green-600 capitalize">{step}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
            <div className="text-sm text-gray-600 mb-2">Status</div>
            <div className="text-base font-medium text-gray-800">{message}</div>
          </div>

          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-700 mb-3">
              {step === 'initial' ? 'Original Array' : 'Sorted Array'}
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {displayArray.map((num, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`w-16 h-16 flex items-center justify-center text-xl font-bold rounded-lg transition-all duration-300 ${
                      idx === highlightIndex && isSorted
                        ? 'bg-green-500 text-white scale-110 shadow-lg ring-4 ring-green-300'
                        : step === 'sorting'
                        ? 'bg-yellow-400 text-gray-800 animate-pulse'
                        : isSorted
                        ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                        : 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    }`}
                  >
                    {num}
                  </div>
                  <div className={`text-center text-xs mt-1 ${
                    idx === middleIndex && isSorted ? 'text-green-600 font-bold' : 'text-gray-500'
                  }`}>
                    [{idx}]
                    {idx === middleIndex && isSorted && <div className="text-green-600">↑ middle</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
            <div className="text-sm font-semibold text-gray-700 mb-4">Algorithm Explanation</div>
            <div className="space-y-3 text-sm text-gray-700">
              <div className={`p-3 rounded-lg ${step === 'initial' ? 'bg-blue-200' : 'bg-white'}`}>
                <span className="font-semibold">Step 1:</span> Sort the array in ascending order
                {step === 'initial' && <span className="ml-2 text-blue-700">← Current</span>}
              </div>
              <div className={`p-3 rounded-lg ${step === 'sorting' ? 'bg-yellow-200' : 'bg-white'}`}>
                <span className="font-semibold">Step 2:</span> Performing the sort operation
                {step === 'sorting' && <span className="ml-2 text-yellow-700">← Current</span>}
              </div>
              <div className={`p-3 rounded-lg ${step === 'sorted' ? 'bg-indigo-200' : 'bg-white'}`}>
                <span className="font-semibold">Step 3:</span> Access the middle element at index ⌊n/2⌋
                {step === 'sorted' && <span className="ml-2 text-indigo-700">← Current</span>}
              </div>
              <div className={`p-3 rounded-lg ${step === 'found' ? 'bg-green-200' : 'bg-white'}`}>
                <span className="font-semibold">Step 4:</span> Return the middle element as the majority element
                {step === 'found' && <span className="ml-2 text-green-700">← Current</span>}
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-semibold text-blue-800 mb-1">💡 Why does this work?</div>
              <div className="text-xs text-blue-700">
                Since the majority element appears more than ⌊n/2⌋ times, it must occupy the middle position after sorting!
              </div>
            </div>
          </div>

          {majorityElement !== null && (
            <div className="mt-6 bg-green-100 border-2 border-green-400 rounded-xl p-4 text-center">
              <div className="text-sm text-green-700 font-semibold mb-1">Majority Element Found!</div>
              <div className="text-4xl font-bold text-green-700">{majorityElement}</div>
              <div className="text-sm text-green-600 mt-2">
                Located at middle index [{middleIndex}] after sorting
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              {step === 'found' ? 'Restart' : isPlaying ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={executeStep}
              disabled={isPlaying || step === 'found'}
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
