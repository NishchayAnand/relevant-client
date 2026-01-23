"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

export default function StripCollisionVisualizer() {
  const [isPlaying, setIsPlaying] = useState(true);

  const animationPlayState = isPlaying ? "running" : "paused";

  return (
    <div className="my-6 flex flex-col items-center gap-4">

      <svg
        viewBox="0 0 720 180"
        className="w-full max-w-3xl"
        role="img"
        aria-label="Two pointers on a strip converge as one moves faster than the other"
      >
        <defs>
          <linearGradient id="stripGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E5E7EB" />
            <stop offset="100%" stopColor="#F3F4F6" />
          </linearGradient>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6" fill="#6B7280" />
          </marker>
        </defs>

        <rect x="40" y="70" width="640" height="40" rx="20" fill="url(#stripGradient)" />
        <line x1="80" y1="90" x2="640" y2="90" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="6 8" />

        <text x="60" y="145" fontSize="14" fill="#6B7280">behind (2x)</text>
        <text x="560" y="145" fontSize="14" fill="#6B7280">ahead (1x)</text>

        <g>
          <circle
            r="10"
            cy="90"
            fill="#2563EB"
            className="strip-fast"
            style={{ animationPlayState }}
          />
          <line
            y1="90"
            y2="90"
            stroke="#2563EB"
            strokeWidth="3"
            markerEnd="url(#arrow)"
            className="strip-fast-line"
            style={{ animationPlayState }}
          />
        </g>

        <g>
          <circle
            r="10"
            cy="90"
            fill="#F59E0B"
            className="strip-slow"
            style={{ animationPlayState }}
          />
          <line
            y1="90"
            y2="90"
            stroke="#F59E0B"
            strokeWidth="3"
            markerEnd="url(#arrow)"
            className="strip-slow-line"
            style={{ animationPlayState }}
          />
        </g>

        <text x="305" y="55" fontSize="13" fill="#6B7280">distance k → 0</text>
      </svg>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsPlaying((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="text-xs text-gray-500">Two pointers converge (2x vs 1x)</span>
      </div>

      <style jsx>{`
        .strip-fast {
          animation: fastPointer 3s linear infinite;
        }
        .strip-fast-line {
          animation: fastPointerLine 3s linear infinite;
        }
        .strip-slow {
          animation: slowPointer 3s linear infinite;
        }
        .strip-slow-line {
          animation: slowPointerLine 3s linear infinite;
        }
        @keyframes fastPointer {
          0% { cx: 120; }
          100% { cx: 520; }
        }
        @keyframes fastPointerLine {
          0% { x1: 120; x2: 170; }
          100% { x1: 520; x2: 570; }
        }
        @keyframes slowPointer {
          0% { cx: 460; }
          100% { cx: 520; }
        }
        @keyframes slowPointerLine {
          0% { x1: 460; x2: 495; }
          100% { x1: 520; x2: 555; }
        }
      `}</style>
    </div>
  );
}
