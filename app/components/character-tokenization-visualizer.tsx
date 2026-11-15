'use client';

import { useEffect, useState } from 'react';

const TEXT = 'I am learning about LLMs';

const COLORS = [
  'bg-emerald-200 text-emerald-950',
  'bg-sky-200 text-sky-950',
  'bg-amber-200 text-amber-950',
  'bg-violet-200 text-violet-950',
  'bg-rose-200 text-rose-950',
  'bg-teal-200 text-teal-950',
];

function showSpace(character: string, hidden = false) {
  if (character !== ' ') return character;
  return <span className={hidden ? 'text-transparent' : 'text-neutral-400'}>␣</span>;
}

export function CharacterTokenizationVisualizer() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const done = step >= TEXT.length;

  useEffect(() => {
    if (!playing) return;
    if (step >= TEXT.length) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep((value) => value + 1), 1100);
    return () => window.clearTimeout(id);
  }, [playing, step]);

  function revealNext() {
    setPlaying(false);
    setStep((value) => Math.min(TEXT.length, value + 1));
  }

  function reset() {
    setPlaying(false);
    setStep(0);
  }

  function togglePlay() {
    if (done) {
      setStep(0);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={revealNext}
            disabled={done}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-700 hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300"
          >
            Step
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-neutral-700"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
        <span className="font-mono text-[11px] text-neutral-400">
          {step} / {TEXT.length}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Text
          </div>
          <div className="font-mono text-sm leading-7 text-neutral-800 dark:text-neutral-100">
            {TEXT.split('').map((character, index) => (
              <span
                key={index}
                className={`rounded px-0.5 py-0.5 ${
                  index < step ? COLORS[index % COLORS.length] : 'text-neutral-800 dark:text-neutral-100'
                }`}
              >
                {showSpace(character)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Tokens
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEXT.split('').map((character, index) => {
              const visible = index < step;
              return (
                <span
                  key={index}
                  className={`rounded-md border px-2 py-1 font-mono text-[13px] ${
                    visible
                      ? `${COLORS[index % COLORS.length]} border-transparent`
                      : 'border-dashed border-neutral-300 text-transparent'
                  }`}
                >
                  {showSpace(character, !visible)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
