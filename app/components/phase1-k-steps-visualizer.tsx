"use client";

import { useCallback, useEffect, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

const DEFAULT_K = 4;

export default function Phase1KStepsVisualizer() {
  const [k] = useState(DEFAULT_K);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const slowPos = Math.min(step, k);
  const fastPos = Math.min(step * 2, k);

  const nodes = Array.from({ length: k + 1 }, (_, idx) => idx);

  const executeStep = useCallback(() => {
    setStep((prev) => {
      if (prev >= k) return prev;
      return prev + 1;
    });
  }, [k]);

  useEffect(() => {
    if (!isPlaying) return;
    if (step >= k) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      executeStep();
    }, 900);
    return () => clearTimeout(timer);
  }, [isPlaying, step, k, executeStep]);

  const reset = () => {
    setStep(0);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (step >= k) {
      reset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="my-6 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Pause" : step >= k ? "Restart" : "Play"}
        </button>
        <button
          onClick={executeStep}
          disabled={isPlaying || step >= k}
          className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          <SkipForward size={16} />
          Step
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
        >
          <RotateCcw size={16} />
          Reset
        </button>
        <div className="text-xs text-gray-500">step {step} of {k}</div>
      </div>

      <svg
        viewBox="0 0 760 180"
        className="w-full max-w-3xl"
        role="img"
        aria-label="Phase 1: slow and fast pointers traverse k nodes"
      >
        <defs>
          <marker id="arrowPhase1Steps" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="#6B7280" />
          </marker>
        </defs>

        <text x="40" y="28" fontSize="13" fill="#6B7280">non-cyclic path (k steps)</text>
        <text x="520" y="28" fontSize="13" fill="#6B7280">cycle entry</text>

        {nodes.map((node, idx) => {
          const x = 80 + idx * 120;
          const isEntry = idx === k;
          return (
            <g key={`node-${idx}`}>
              <circle
                cx={x}
                cy={90}
                r={22}
                fill={isEntry ? "#FEF3C7" : "#EFF6FF"}
                stroke={isEntry ? "#F59E0B" : "#60A5FA"}
                strokeWidth={2}
              />
              <text x={x} y={96} textAnchor="middle" fontSize={12} fill="#1F2937">
                {idx}
              </text>
            </g>
          );
        })}

        {nodes.slice(0, -1).map((_, idx) => {
          const x1 = 102 + idx * 120;
          const x2 = 138 + idx * 120;
          return (
            <line
              key={`edge-${idx}`}
              x1={x1}
              y1={90}
              x2={x2}
              y2={90}
              stroke="#6B7280"
              strokeWidth={2}
              markerEnd="url(#arrowPhase1Steps)"
            />
          );
        })}

        <g>
          <circle cx={80 + slowPos * 120} cy={60} r={7} fill="#10B981" />
          <text x={96 + slowPos * 120} y={64} fontSize={12} fill="#065F46">slow</text>
          <line
            x1={80 + slowPos * 120}
            y1={68}
            x2={80 + slowPos * 120}
            y2={78}
            stroke="#10B981"
            strokeWidth={2}
            markerEnd="url(#arrowPhase1Steps)"
          />
        </g>

        <g>
          <circle cx={80 + fastPos * 120} cy={40} r={7} fill="#2563EB" />
          <text x={96 + fastPos * 120} y={44} fontSize={12} fill="#1E3A8A">fast</text>
          <line
            x1={80 + fastPos * 120}
            y1={48}
            x2={80 + fastPos * 120}
            y2={58}
            stroke="#2563EB"
            strokeWidth={2}
            markerEnd="url(#arrowPhase1Steps)"
          />
        </g>

        <text x="260" y="165" fontSize="12" fill="#6B7280">
          slow moves 1 step, fast moves 2 steps per tick
        </text>
      </svg>
    </div>
  );
}
