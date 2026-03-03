"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_NUMS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_K = 3;

type Phase = "initial" | "whole" | "first" | "rest" | "done";

type Step = {
  phase: Phase;
  label: string;
  start: number;
  end: number;
};

function buildSteps(length: number, k: number): Step[] {
  const effective = k % length;
  return [
    { phase: "whole", label: "Reverse entire array", start: 0, end: length - 1 },
    { phase: "first", label: "Reverse first k elements", start: 0, end: effective - 1 },
    { phase: "rest", label: "Reverse remaining elements", start: effective, end: length - 1 },
  ];
}

export default function RotateArrayReverseVisualizer() {
  const [nums, setNums] = useState(DEFAULT_NUMS);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [startPtr, setStartPtr] = useState(0);
  const [endPtr, setEndPtr] = useState(DEFAULT_NUMS.length - 1);
  const [phase, setPhase] = useState<Phase>("initial");
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Press Play to start reversing");

  const steps = buildSteps(DEFAULT_NUMS.length, DEFAULT_K);
  const currentStep = steps[phaseIndex];

  useEffect(() => {
    if (!isPlaying || phase === "done" || !currentStep) return;
    const timer = setTimeout(() => executeStep(), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, startPtr, endPtr, currentStep]);

  const executeStep = () => {
    if (!currentStep) {
      setPhase("done");
      setIsPlaying(false);
      setMessage("Rotation finished: array is now rotated.");
      return;
    }

    setPhase(currentStep.phase);

    if (startPtr >= endPtr) {
      const nextPhaseIndex = phaseIndex + 1;
      const nextStep = steps[nextPhaseIndex];
      if (!nextStep) {
        setPhase("done");
        setIsPlaying(false);
        setMessage("Rotation finished: array is now rotated.");
        return;
      }
      setPhaseIndex(nextPhaseIndex);
      setStartPtr(nextStep.start);
      setEndPtr(nextStep.end);
      setMessage(nextStep.label);
      return;
    }

    setNums((prev) => {
      const next = [...prev];
      [next[startPtr], next[endPtr]] = [next[endPtr], next[startPtr]];
      return next;
    });
    setMessage(
      `${currentStep.label}: swapped nums[${startPtr}] and nums[${endPtr}]`
    );
    setStartPtr((prev) => prev + 1);
    setEndPtr((prev) => prev - 1);
  };

  const reset = () => {
    setNums(DEFAULT_NUMS);
    setPhaseIndex(0);
    setPhase("initial");
    setStartPtr(0);
    setEndPtr(DEFAULT_NUMS.length - 1);
    setIsPlaying(false);
    setMessage("Press Play to start reversing");
  };

  const togglePlay = () => {
    if (phase === "done") {
      reset();
      setIsPlaying(true);
      return;
    }
    if (phase === "initial") {
      setPhase(steps[0].phase);
      setMessage(steps[0].label);
    }
    setIsPlaying((prev) => !prev);
  };

  const highlightRange = currentStep
    ? { start: currentStep.start, end: currentStep.end }
    : null;

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">k = </span>
              <span className="font-mono font-bold text-lg text-indigo-600">
                {DEFAULT_K}
              </span>
            </div>
            <div>
              <span className="text-gray-500">phase = </span>
              <span className="font-mono font-bold text-lg text-sky-600">
                {phase}
              </span>
            </div>
            <div>
              <span className="text-gray-500">start | end = </span>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {phase === "done" ? "-" : `${startPtr} | ${endPtr}`}
              </span>
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
              disabled={isPlaying || phase === "done"}
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

        <div className="text-center text-sm text-gray-600 font-medium min-h-5">
          {message}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {nums.map((num, idx) => {
            const isStart = idx === startPtr && phase !== "done";
            const isEnd = idx === endPtr && phase !== "done";
            const isWithinRange = highlightRange
              ? idx >= highlightRange.start && idx <= highlightRange.end
              : false;

            return (
              <div key={idx} className="text-center">
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 font-mono text-lg font-semibold transition-all ${
                    isStart
                      ? "bg-blue-100 text-blue-800 border-blue-300 scale-105"
                      : isEnd
                      ? "bg-purple-100 text-purple-800 border-purple-300 scale-105"
                      : isWithinRange
                      ? "bg-slate-50 text-slate-800 border-slate-300"
                      : "bg-white text-gray-800 border-gray-300"
                  }`}
                  aria-label={`nums[${idx}] = ${num}`}
                >
                  {num}
                </div>
                <div className="mt-1 text-xs text-gray-400">idx {idx}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">
            Phases
          </div>
          <ol className="flex flex-col gap-2 text-sm text-gray-600">
            {steps.map((step, idx) => (
              <li
                key={step.phase}
                className={`rounded-xl border px-3 py-2 font-medium transition-colors ${
                  idx === phaseIndex
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : idx < phaseIndex
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white"
                }`}
              >
                {step.label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}