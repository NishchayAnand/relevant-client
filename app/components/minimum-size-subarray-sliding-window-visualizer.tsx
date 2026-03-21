'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

const NUMS = [2, 3, 1, 2, 4, 3];
const TARGET = 7;

type Phase = 'expand' | 'shrink' | 'done';

export default function MinimumSizeSubarraySlidingWindowVisualizer() {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(-1);
  const [currSum, setCurrSum] = useState(0);
  const [minLength, setMinLength] = useState(Infinity);
  const [phase, setPhase] = useState<Phase>('expand');
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Press Play or Step to begin');

  useEffect(() => {
    if (isPlaying && phase !== 'done') {
      const timer = setTimeout(executeStep, 900);
      return () => clearTimeout(timer);
    }
    if (phase === 'done') setIsPlaying(false);
  }, [isPlaying, step, phase]);

  const executeStep = () => {
    if (phase === 'done') return;

    if (phase === 'expand') {
      const newRight = right + 1;
      const newSum = currSum + NUMS[newRight];
      setRight(newRight);
      setCurrSum(newSum);
      setMessage(`Expand → right=${newRight}, add ${NUMS[newRight]}, currSum=${newSum}`);
      if (newSum >= TARGET) {
        setPhase('shrink');
      } else if (newRight >= NUMS.length - 1) {
        setPhase('done');
      }
    } else if (phase === 'shrink') {
      const len = right - left + 1;
      const newMin = Math.min(minLength, len);
      const newSum = currSum - NUMS[left];
      const newLeft = left + 1;
      setMinLength(newMin);
      setCurrSum(newSum);
      setLeft(newLeft);
      setMessage(
        `Shrink ← left=${newLeft}, remove ${NUMS[left]}, currSum=${newSum}${newMin < minLength ? ` — new min length: ${newMin}` : ''}`
      );
      if (newSum < TARGET) {
        if (right >= NUMS.length - 1) {
          setPhase('done');
        } else {
          setPhase('expand');
        }
      }
    }

    setStep(s => s + 1);
  };

  const reset = () => {
    setLeft(0);
    setRight(-1);
    setCurrSum(0);
    setMinLength(Infinity);
    setPhase('expand');
    setIsPlaying(false);
    setStep(0);
    setMessage('Press Play or Step to begin');
  };

  const togglePlay = () => {
    if (phase === 'done') { reset(); return; }
    setIsPlaying(p => !p);
  };

  const result = minLength === Infinity ? 0 : minLength;

  return (
    <div className="mt-5 mb-10">
      <div className="max-w-4xl mx-auto">
        <div className="p-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">left</div>
              <div className="text-2xl font-bold text-blue-600">{left}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">right</div>
              <div className="text-2xl font-bold text-blue-600">{right === -1 ? '—' : right}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">currSum</div>
              <div className={`text-2xl font-bold ${currSum >= TARGET ? 'text-green-600' : 'text-purple-600'}`}>
                {currSum}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500">minLength</div>
              <div className="text-2xl font-bold text-orange-500">{result === 0 && phase !== 'done' ? '∞' : result}</div>
            </div>
          </div>

          {/* Message */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 mb-5 text-sm font-medium text-gray-700">
            {phase === 'done' ? `✓ Done — minimum subarray length: ${result}` : message}
          </div>

          {/* Array */}
          <div className="flex gap-2 justify-center mb-6">
            {NUMS.map((num, idx) => {
              const inWindow = right >= 0 && idx >= left && idx <= right;
              const isLeft = idx === left && right >= 0;
              const isRight = idx === right;
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-400 h-4">
                    {isLeft && isRight ? 'L/R' : isLeft ? 'L' : isRight ? 'R' : ''}
                  </div>
                  <div
                    className={`w-12 h-12 flex items-center justify-center text-sm font-bold rounded-lg transition-all ${
                      inWindow
                        ? 'bg-blue-500 text-white scale-110 shadow-md'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {num}
                  </div>
                  <div className="text-xs text-gray-400">[{idx}]</div>
                </div>
              );
            })}
          </div>

          {/* Target reference */}
          <div className="text-center text-xs text-gray-500 mb-5">
            target = {TARGET} &nbsp;|&nbsp; currSum {currSum >= TARGET ? '≥' : '<'} target
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {phase === 'done' ? 'Restart' : isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={executeStep}
              disabled={isPlaying || phase === 'done'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
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
