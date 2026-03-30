"use client";

import { useState } from 'react';

type Step = {
  title: string;
  message: string;
  helper: string;
  array: number[];
  pivotIndex: number | null;
  pair?: [number, number];
  suffixRange?: [number, number];
  swapTarget?: number | null;
  jIndex?: number | null;
};

const steps: Step[] = [
  {
    title: 'Step 1. Look at the rightmost pair',
    message: 'Does nums[4]=5 < nums[5]=4? No. Keep scanning left.',
    helper: 'Purple markers show the i/i+1 comparison we are evaluating.',
    array: [1, 2, 3, 6, 5, 4],
    pivotIndex: null,
    pair: [4, 5],
    suffixRange: [5, 5],
  },
  {
    title: 'Step 2. Move i left',
    message: 'Check nums[3]=6 < nums[4]=5? Still false, continue.',
    helper: 'Suffix grows while it stays descending.',
    array: [1, 2, 3, 6, 5, 4],
    pivotIndex: null,
    pair: [3, 4],
    suffixRange: [4, 5],
  },
  {
    title: 'Step 3. Pivot found',
    message: 'nums[2]=3 < nums[3]=6, so pivot index = 2.',
    helper: 'Amber marks the pivot; blue is the suffix we will later reverse.',
    array: [1, 2, 3, 6, 5, 4],
    pivotIndex: 2,
    pair: [2, 3],
    suffixRange: [3, 5],
  },
  {
    title: 'Step 4. Scan suffix for swap target',
    message: 'Move j from the end until nums[j] > pivot. nums[5]=4 works immediately.',
    helper: 'Teal shows the first value bigger than the pivot.',
    array: [1, 2, 3, 6, 5, 4],
    pivotIndex: 2,
    suffixRange: [3, 5],
    swapTarget: 5,
    jIndex: 5,
  },
  {
    title: 'Step 5. Swap pivot and target',
    message: 'Swap indices 2 and 5 → [1,2,4,6,5,3]. Pivot position stays the same, value changes.',
    helper: 'Pivot (amber) now holds value 4; suffix is still descending.',
    array: [1, 2, 4, 6, 5, 3],
    pivotIndex: 2,
    suffixRange: [3, 5],
    swapTarget: 5,
  },
  {
    title: 'Step 6. Reverse the suffix',
    message: 'Reverse indices 3…5: [6,5,3] → [3,5,6]. This yields the next permutation.',
    helper: 'Suffix becomes ascending, giving the smallest tail after the pivot.',
    array: [1, 2, 4, 3, 5, 6],
    pivotIndex: 2,
    suffixRange: [3, 5],
  },
];

function StepButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export default function NextPermutationGreedyVisualizer() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  const isSuffix = (index: number) =>
    step.suffixRange ? index >= step.suffixRange[0] && index <= step.suffixRange[1] : false;

  const pivotValue = step.pivotIndex !== null ? step.array[step.pivotIndex] : null;
  const suffixValues = step.suffixRange
    ? step.array.slice(step.suffixRange[0], step.suffixRange[1] + 1)
    : [];
  const swapValue =
    typeof step.swapTarget === 'number' ? step.array[step.swapTarget] : null;

  return (
    <div className="my-6 rounded-2xl border border-gray-200 bg-white text-gray-800">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
            Step {stepIndex + 1} / {steps.length}
          </span>
        </div>
        
      </div>

      <section className="grid gap-3 border-b border-gray-50 px-5 py-4 text-sm md:grid-cols-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Pivot</p>
          <p className="mt-1 font-mono text-lg font-semibold text-amber-900">
            {pivotValue !== null ? `nums[${step.pivotIndex}] = ${pivotValue}` : '—'}
          </p>
          <p className="text-xs text-amber-800/80">
            {pivotValue !== null ? 'Rightmost i where nums[i] < nums[i+1].' : 'Not found yet'}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-800">
            {step.suffixRange ? `Suffix ${step.suffixRange[0]}…${step.suffixRange[1]}` : 'Suffix'}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-blue-900">
            {suffixValues.length ? `[${suffixValues.join(', ')}]` : '—'}
          </p>
          <p className="text-xs text-blue-800/80">
            {suffixValues.length ? 'Descending region to the right of pivot.' : 'Building descending suffix.'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Action</p>
          <p className="mt-1 text-gray-700">{step.message}</p>
          {swapValue !== null && (
            <p className="text-xs text-gray-500">Swap target value: {swapValue}</p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-center gap-4 px-5 py-6">
        {step.array.map((value, index) => {
          const isPivot = step.pivotIndex === index && step.pivotIndex !== null;
          const isSwap = typeof step.swapTarget === 'number' && index === step.swapTarget;
          const isPair = step.pair ? step.pair.includes(index) : false;
          const isJ = step.jIndex === index;

          let classes = 'border-gray-300 bg-gray-50 text-gray-800';
          if (isSuffix(index)) {
            classes = 'border-blue-200 bg-blue-50 text-blue-700';
          }
          if (isSwap) {
            classes = 'border-sky-400 bg-sky-50 text-sky-800';
          }
          if (isPivot) {
            classes = 'border-amber-400 bg-amber-50 text-amber-800';
          }
          if (isPair && !isPivot && !isSwap) {
            classes = 'border-purple-200 bg-purple-50 text-purple-700';
          }

          const topLabel = (() => {
            if (isPivot) return 'pivot';
            if (isJ) return 'j';
            if (step.pair) {
              if (index === step.pair[0]) return 'i';
              if (index === step.pair[1]) return 'i+1';
            }
            return '';
          })();

          return (
            <div key={`${value}-${index}`} className="flex flex-col items-center text-xs text-gray-500">
              <div className="h-4 text-[11px] font-semibold text-gray-500">
                {topLabel}
              </div>
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-mono text-lg font-semibold ${classes}`}
              >
                {value}
              </div>
              <span className="mt-1 font-mono">i={index}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 px-5 pb-4 text-[11px] font-medium text-gray-500">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-amber-300" /> Pivot
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-sky-300" /> Swap target
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-blue-200" /> Descending suffix
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-purple-200" /> i / i+1 comparison
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-gray-100 px-5 py-4">
        <StepButton label="Prev" onClick={() => setStepIndex((s) => Math.max(s - 1, 0))} disabled={stepIndex === 0} />
        <StepButton
          label="Next"
          onClick={() => setStepIndex((s) => Math.min(s + 1, steps.length - 1))}
          disabled={stepIndex === steps.length - 1}
        />
        <StepButton label="Reset" onClick={() => setStepIndex(0)} disabled={stepIndex === 0} />
      </footer>
    </div>
  );
}
