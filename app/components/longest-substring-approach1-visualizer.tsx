"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Shared ───────────────────────────────────────────────────────────────────

function StepNav({
  step,
  total,
  onPrev,
  onNext,
}: {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
      <button
        onClick={onPrev}
        disabled={step === 0}
        className="p-1.5 rounded bg-gray-700 text-gray-300 disabled:opacity-30 hover:bg-gray-600 transition shrink-0"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex gap-1 flex-wrap justify-center flex-1 min-w-0">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${
              i === step ? "bg-indigo-400" : "bg-gray-500"
            }`}
          />
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={step === total - 1}
        className="p-1.5 rounded bg-gray-700 text-gray-300 disabled:opacity-30 hover:bg-gray-600 transition shrink-0"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Approach 1 Visualizer ────────────────────────────────────────────────────

type StepData = {
  desc: string;
  outerIdx: number | null;      // i pointer
  innerIdx: number | null;      // j pointer
  uniqueSet: string[];
  currLength: number;
  maxLength: number;
  status: "exploring" | "duplicate" | "complete";
  note?: string;
};

const INPUT_STRING = "abcabcbb";

function generateSteps(): StepData[] {
  const steps: StepData[] = [];

  let maxLength = 0;
  
  for (let i = 0; i < INPUT_STRING.length; i++) {
    const unique = new Set<string>();
    let currLength = 0;

    // Start exploring from index i
    steps.push({
      desc: `i=${i}: Start exploring from '${INPUT_STRING[i]}'`,
      outerIdx: i,
      innerIdx: null,
      uniqueSet: [],
      currLength: 0,
      maxLength,
      status: "exploring",
    });

    for (let j = i; j < INPUT_STRING.length; j++) {
      const ch = INPUT_STRING[j];

      if (!unique.has(ch)) {
        unique.add(ch);
        currLength++;
        maxLength = Math.max(maxLength, currLength);

        steps.push({
          desc: `j=${j}: Add '${ch}' to set. Substring = "${INPUT_STRING.substring(i, j + 1)}"`,
          outerIdx: i,
          innerIdx: j,
          uniqueSet: Array.from(unique),
          currLength,
          maxLength,
          status: "exploring",
        });
      } else {
        // Duplicate found
        steps.push({
          desc: `j=${j}: Duplicate '${ch}' found. Stop expanding from i=${i}.`,
          outerIdx: i,
          innerIdx: j,
          uniqueSet: Array.from(unique),
          currLength,
          maxLength,
          status: "duplicate",
          note: `✓ Max length updated: ${maxLength}`,
        });
        break;
      }
    }

    // If we reach end without duplicate
    if (unique.size === INPUT_STRING.length - i) {
      steps.push({
        desc: `i=${i}: Reached end of string. No more duplicates.`,
        outerIdx: i,
        innerIdx: null,
        uniqueSet: Array.from(unique),
        currLength,
        maxLength,
        status: "complete",
        note: `✓ Final max length: ${maxLength}`,
      });
    }
  }

  // Final step
  steps.push({
    desc: "All starting indices explored. Algorithm complete.",
    outerIdx: null,
    innerIdx: null,
    uniqueSet: [],
    currLength: 0,
    maxLength,
    status: "complete",
    note: `✓ Answer: ${maxLength}`,
  });

  return steps;
}

const STEPS = generateSteps();

export function LongestSubstringApproach1Visualizer() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  return (
    <div className="not-prose my-4 mt-4 rounded-xl bg-gray-900 border border-gray-700 p-4 text-sm font-mono">

      <div className="space-y-4">
        {/* String with pointers */}
        <div className="flex gap-2 items-center flex-wrap pt-4">
          <p className="text-[10px] text-white" style={{ color: '#fff' }}>Input:</p>
          <div className="flex gap-1 flex-wrap items-center">
            {INPUT_STRING.split("").map((ch, idx) => {
              const isI = idx === s.outerIdx;
              const isJ = idx === s.innerIdx;
              const inWindow = s.outerIdx !== null && idx >= s.outerIdx && idx <= (s.innerIdx ?? s.outerIdx);

              return (
                <div
                  key={idx}
                  className={`relative w-8 h-8 rounded border flex items-center justify-center text-white font-bold transition-colors ${
                    isI && isJ
                      ? "border-purple-500 bg-purple-900/30 text-purple-300"
                      : isI
                      ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                      : isJ
                      ? "border-green-500 bg-green-900/30 text-green-300"
                      : inWindow
                      ? "border-blue-500 bg-blue-900/20 text-blue-300"
                      : "border-gray-600 bg-gray-800"
                  }`}
                >
                  {ch}
                  {isI && (
                    <span className="absolute -top-5 text-[10px] text-indigo-300">i</span>
                  )}
                  {isJ && (
                    <span className="absolute -top-5 text-[10px] text-green-300">j</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* HashSet */}
        <div className="flex gap-2 items-center flex-wrap">
          <p className="text-[10px] text-white" style={{ color: '#fff' }}>
            HashSet ({s.uniqueSet.length}):
          </p>
          {s.uniqueSet.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {s.uniqueSet.map((ch) => (
                <div
                  key={ch}
                  className="border border-purple-500 bg-purple-900/20 text-purple-300 rounded px-2 py-1 text-xs font-mono"
                >
                  {ch}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white text-xs italic" style={{ color: '#fff' }}>empty</div>
          )}
        </div>

        {/* Metrics */}
        <div className="flex gap-4">
          <div className="border border-gray-700 bg-gray-800/50 rounded px-3 py-2">
            <p className="text-[10px] text-white" style={{ color: '#fff' }}>Current Length</p>
            <p className="text-lg font-bold text-white" style={{ color: '#fff' }}>{s.currLength}</p>
          </div>
          <div className="border border-gray-700 bg-gray-800/50 rounded px-3 py-2">
            <p className="text-[10px] text-white" style={{ color: '#fff' }}>Max Length</p>
            <p className="text-lg font-bold text-green-300" style={{ color: '#fff' }}>{s.maxLength}</p>
          </div>
        </div>
      </div>

      {s.note && (
        <div className="mt-3 text-xs text-white bg-amber-900/20 border border-amber-800 rounded px-3 py-1.5">
          {s.note}
        </div>
      )}

      <div className="mt-3 text-xs text-white font-sans bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5">
        {s.desc}
      </div>

      <StepNav
        step={step}
        total={STEPS.length}
        onPrev={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
      />
    </div>
  );
}
