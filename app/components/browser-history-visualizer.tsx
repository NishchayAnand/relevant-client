'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

interface HistoryStep {
  operation: string;
  history: string[];
  current: number;
  result: string | null;
}

export default function BrowserHistoryVisualizer() {
  const steps: HistoryStep[] = [
    {
      operation: 'BrowserHistory("leetcode.com")',
      history: ['leetcode.com'],
      current: 0,
      result: null,
    },
    {
      operation: 'visit("google.com")',
      history: ['leetcode.com', 'google.com'],
      current: 1,
      result: null,
    },
    {
      operation: 'visit("facebook.com")',
      history: ['leetcode.com', 'google.com', 'facebook.com'],
      current: 2,
      result: null,
    },
    {
      operation: 'visit("youtube.com")',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'youtube.com'],
      current: 3,
      result: null,
    },
    {
      operation: 'back(1)',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'youtube.com'],
      current: 2,
      result: 'facebook.com',
    },
    {
      operation: 'back(1)',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'youtube.com'],
      current: 1,
      result: 'google.com',
    },
    {
      operation: 'forward(1)',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'youtube.com'],
      current: 2,
      result: 'facebook.com',
    },
    {
      operation: 'visit("linkedin.com")',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'linkedin.com'],
      current: 3,
      result: null,
    },
    {
      operation: 'forward(2)',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'linkedin.com'],
      current: 3,
      result: 'linkedin.com',
    },
    {
      operation: 'back(2)',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'linkedin.com'],
      current: 1,
      result: 'google.com',
    },
    {
      operation: 'back(7)',
      history: ['leetcode.com', 'google.com', 'facebook.com', 'linkedin.com'],
      current: 0,
      result: 'leetcode.com',
    },
  ];

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentStep = steps[stepIndex];
  const inputSequence = steps.map((step) => step.operation);

  useEffect(() => {
    if (!isPlaying || stepIndex >= steps.length - 1) return;
    const timer = setTimeout(() => {
      setStepIndex((prev) => prev + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex]);

  const reset = () => {
    setStepIndex(0);
    setIsPlaying(false);
  };

  const nextStep = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const togglePlay = () => {
    if (stepIndex >= steps.length - 1) {
      reset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="mt-8 mb-10 border rounded-2xl overflow-hidden">
      <div className="p-8">
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Input Sequence</div>
          <div className="text-xs text-gray-500 mb-3">Start from the first command, then apply each operation in order:</div>
          <div className="flex flex-wrap gap-2">
            {inputSequence.map((operation, idx) => (
              <div
                key={idx}
                className="px-3 py-2 rounded border border-gray-200 bg-gray-50 text-xs font-mono text-gray-700 break-all"
              >
                {idx + 1}. {operation}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className="p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={nextStep}
              disabled={isPlaying || stepIndex >= steps.length - 1}
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

        <div className="mb-3 text-xs text-gray-600">
          Step <span className="font-mono font-bold text-gray-800">{stepIndex + 1}</span> / {steps.length}
        </div>

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Operation</div>
          <div className="text-sm font-mono text-gray-800 bg-gray-50 p-3 rounded border border-gray-200 break-all">
            {currentStep.operation}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3">Current URL</div>
          <div className="text-lg font-mono font-bold text-blue-600 bg-blue-50 p-3 rounded border border-blue-200 break-all">
            {currentStep.history[currentStep.current]}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">History</div>
          <div className="flex flex-wrap gap-2">
            {currentStep.history.map((url, idx) => (
              <div
                key={idx}
                className={`px-3 py-2 rounded border text-sm font-mono break-all ${
                  idx === currentStep.current
                    ? 'bg-blue-500 text-white border-blue-600 font-bold'
                    : idx < currentStep.current
                    ? 'bg-gray-100 text-gray-700 border-gray-300'
                    : 'bg-white text-gray-400 border-gray-300'
                }`}
              >
                {url}
              </div>
            ))}
          </div>
        </div>

        {currentStep.result && (
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <span className="text-gray-600">Returns: </span>
            <span className="font-mono font-bold text-green-700">"{currentStep.result}"</span>
          </div>
        )}
      </div>
    </div>
  );
}
