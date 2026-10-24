'use client';

import { useEffect, useState } from 'react';

const TEXT = 'I am learning about LLMs';

const TOKENS: { text: string; id: number; vector: string; note: string }[] = [
  {
    text: 'I',
    id: 40,
    vector: '0.21, -0.08, 0.64',
    note: '"I" is in the vocabulary, so it becomes one token.',
  },
  {
    text: ' am',
    id: 1097,
    vector: '0.05, 0.44, -0.17',
    note: 'The space stays attached to "am". It is not a separate token.',
  },
  {
    text: ' learning',
    id: 7520,
    vector: '-0.31, 0.12, 0.55',
    note: '" learning" is another vocabulary entry, space included.',
  },
  {
    text: ' about',
    id: 922,
    vector: '0.18, 0.27, 0.09',
    note: '" about" matches a single vocabulary entry.',
  },
  {
    text: ' LL',
    id: 445,
    vector: '0.62, -0.22, 0.14',
    note: '"LLMs" is not one entry. The tokenizer takes the longest piece it knows: " LL".',
  },
  {
    text: 'Ms',
    id: 10110,
    vector: '-0.11, 0.48, 0.33',
    note: '"Ms" is the remaining piece. The model now has six IDs, not one word.',
  },
];

const COLORS = [
  'bg-emerald-200 text-emerald-950',
  'bg-sky-200 text-sky-950',
  'bg-amber-200 text-amber-950',
  'bg-violet-200 text-violet-950',
  'bg-rose-200 text-rose-950',
  'bg-teal-200 text-teal-950',
];

function showSpace(text: string) {
  if (!text.startsWith(' ')) return text;
  return (
    <>
      <span className="text-neutral-400">␣</span>
      {text.slice(1)}
    </>
  );
}

export function TokenizationVisualizer() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const done = step >= TOKENS.length;
  const current = step > 0 ? TOKENS[step - 1] : null;

  useEffect(() => {
    if (!playing) return;
    if (step >= TOKENS.length) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep((value) => value + 1), 1100);
    return () => window.clearTimeout(id);
  }, [playing, step]);

  function revealNext() {
    setPlaying(false);
    setStep((value) => Math.min(TOKENS.length, value + 1));
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

  let cursor = 0;
  const revealed = TOKENS.slice(0, step).map((token, index) => {
    const piece = { token, index, start: cursor };
    cursor += token.text.length;
    return piece;
  });
  const rest = TEXT.slice(cursor);

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Tokenization
        </span>
        <span className="font-mono text-[11px] text-neutral-400">
          {step} / {TOKENS.length}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Text
          </div>
          <div className="font-mono text-sm leading-7 text-neutral-800 dark:text-neutral-100">
            {step === 0 ? (
              <span className="rounded bg-emerald-200 px-1 py-0.5 text-emerald-950">&quot;{TEXT}&quot;</span>
            ) : (
              <>
                {revealed.map(({ token, index }) => (
                  <span key={token.id} className={`rounded px-0.5 py-0.5 ${COLORS[index]}`}>
                    {showSpace(token.text)}
                  </span>
                ))}
                {rest ? <span className="text-neutral-400">{rest}</span> : null}
              </>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Tokens
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TOKENS.map((token, index) => {
              const visible = index < step;
              return (
                <span
                  key={token.text}
                  className={`rounded-md border px-2 py-1 font-mono text-[13px] ${
                    visible
                      ? `${COLORS[index]} border-transparent`
                      : 'border-dashed border-neutral-300 text-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {visible ? showSpace(token.text) : '···'}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
          {current ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-neutral-700 dark:text-neutral-200">
              <span className={`rounded px-1.5 py-0.5 ${COLORS[step - 1]}`}>{showSpace(current.text)}</span>
              <span className="text-neutral-400">→</span>
              <span>
                id <span className="font-semibold text-neutral-900 dark:text-neutral-100">{current.id}</span>
              </span>
              <span className="text-neutral-400">→</span>
              <span className="text-neutral-500">[{current.vector}, …]</span>
            </div>
          ) : (
            <div className="font-mono text-[13px] text-neutral-400">token → id → embedding</div>
          )}
          <div className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {current
              ? current.note
              : 'This is still raw text. The tokenizer has not cut it into vocabulary pieces yet.'}
          </div>
          {done ? (
            <div className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              The model receives the IDs [{TOKENS.map((token) => token.id).join(', ')}]. Each ID selects a row in the embedding table.
            </div>
          ) : null}
        </div>

        <div className="text-[11px] leading-relaxed text-neutral-400">
          Example vocabulary. A real model uses its own merge rules and token IDs.
        </div>

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
      </div>
    </div>
  );
}
