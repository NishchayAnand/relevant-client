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

// ─── Approach 2 Visualizer ────────────────────────────────────────────────────

type StepData = {
  desc: string;
  i: number;
  j: number;
  lastSeenMap: Record<string, number>;
  currLength: number;
  maxLength: number;
  action: "expand" | "shrink" | "init";
  note?: string;
};

const INPUT_STRING = "abcdcafg";

function generateSteps(): StepData[] {
  const steps: StepData[] = [];
  const lastSeen: Record<string, number> = {};
  let i = 0;
  let maxLength = 0;

  // Initial state
  steps.push({
    desc: "Initialize: i=0, j=0. lastSeen map is empty.",
    i,
    j: 0,
    lastSeenMap: { ...lastSeen },
    currLength: 0,
    maxLength,
    action: "init",
  });

  // Sliding window loop
  for (let j = 0; j < INPUT_STRING.length; j++) {
    const ch = INPUT_STRING[j];

    // Check if duplicate within window
    if (lastSeen[ch] !== undefined && lastSeen[ch] >= i) {
      const oldI = i;
      i = lastSeen[ch] + 1;
      steps.push({
        desc: `j=${j}: Found duplicate '${ch}' at previous index ${lastSeen[ch]}. Shrink window: i=${oldI} → i=${i}`,
        i,
        j,
        lastSeenMap: { ...lastSeen },
        currLength: j - i,
        maxLength,
        action: "shrink",
        note: `Window shrunk from [${oldI}, ${j}] to [${i}, ${j}]`,
      });
    }

    // Update lastSeen
    lastSeen[ch] = j;

    // Calculate current length
    const currLength = j - i + 1;
    maxLength = Math.max(maxLength, currLength);

    steps.push({
      desc: `j=${j}: Expand window with '${ch}'. Window = "${INPUT_STRING.substring(i, j + 1)}"`,
      i,
      j,
      lastSeenMap: { ...lastSeen },
      currLength,
      maxLength,
      action: "expand",
      note: `${currLength === maxLength ? `✓ Max length updated to ${maxLength}` : ""}`,
    });
  }

  // Final step
  steps.push({
    desc: "Algorithm complete. All characters processed.",
    i,
    j: INPUT_STRING.length - 1,
    lastSeenMap: { ...lastSeen },
    currLength: 0,
    maxLength,
    action: "init",
    note: `✓ Answer: ${maxLength}`,
  });

  return steps;
}

const STEPS = generateSteps();

export function LongestSubstringApproach2Visualizer() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  return (
    <div className="not-prose my-4 mt-4 rounded-xl bg-gray-900 border border-gray-700 p-4 text-sm font-mono">

      <div className="space-y-4 pt-4">
        {/* String with pointers */}
        <div className="flex gap-2 items-center flex-wrap">
          <p className="text-[10px] text-white" style={{ color: '#fff' }}>Input:</p>
          <div className="flex gap-1 flex-wrap items-center">
            {INPUT_STRING.split("").map((ch, idx) => {
              const isI = idx === s.i;
              const isJ = idx === s.j;
              const inWindow = idx >= s.i && idx <= s.j;

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

        {/* LastSeen Map */}
        <div className="flex gap-2 items-center flex-wrap">
          <p className="text-[10px] text-white" style={{ color: '#fff' }}>
            lastSeen Map:
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(s.lastSeenMap)
              .sort()
              .map((ch) => (
                <div
                  key={ch}
                  className="border border-orange-500 bg-orange-900/20 text-orange-300 rounded px-2 py-1 text-xs font-mono"
                >
                  {ch}: {s.lastSeenMap[ch]}
                </div>
              ))}
            {Object.keys(s.lastSeenMap).length === 0 && (
              <div className="text-white text-xs italic" style={{ color: '#fff' }}>
                empty
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex gap-4 flex-wrap">
          <div className="border border-gray-700 bg-gray-800/50 rounded px-3 py-2">
            <p className="text-[10px] text-white" style={{ color: '#fff' }}>Current Length</p>
            <p className="text-lg font-bold text-white" style={{ color: '#fff' }}>{s.currLength}</p>
          </div>
          <div className="border border-gray-700 bg-gray-800/50 rounded px-3 py-2">
            <p className="text-[10px] text-white" style={{ color: '#fff' }}>Max Length</p>
            <p className="text-lg font-bold text-green-300" style={{ color: '#fff' }}>{s.maxLength}</p>
          </div>
          <div className="border border-gray-700 bg-gray-800/50 rounded px-3 py-2">
            <p className="text-[10px] text-white" style={{ color: '#fff' }}>Window Size</p>
            <p className="text-lg font-bold text-blue-300" style={{ color: '#fff' }}>{s.j - s.i + 1}</p>
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
