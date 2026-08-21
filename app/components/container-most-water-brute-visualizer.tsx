"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  heights: number[];
  expected: number;
};

const PRESETS: Preset[] = [
  {
    id: "small",
    label: "Small [4,3,2,1,4]",
    heights: [4, 3, 2, 1, 4],
    expected: 16,
  },
  {
    id: "leetcode",
    label: "LeetCode 11 · [1,8,6,2,5,4,8,3,7]",
    heights: [1, 8, 6, 2, 5, 4, 8, 3, 7],
    expected: 49,
  },
  {
    id: "ascending",
    label: "Ascending [1,2,3,4,5]",
    heights: [1, 2, 3, 4, 5],
    expected: 6,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKind =
  | "init"
  | "outer"
  | "pair-enter"
  | "pair-width"
  | "pair-minh"
  | "pair-area"
  | "pair-update"
  | "done";

type Step = {
  kind: StepKind;
  i?: number;
  j?: number;
  width?: number;
  minHeight?: number;
  area?: number;
  maxArea: number;
  bestPair: [number, number] | null;
  /** True only on the pair-update step where maxArea actually changed. */
  updated?: boolean;
  /** Exactly one line is active per step (except init/outer/done which map 1:1). */
  activeLines: number[];
  label: string;
};

// ─── Simulation ───────────────────────────────────────────────────────────────

function simulate(heights: number[]): Step[] {
  const steps: Step[] = [];
  let maxArea = 0;
  let bestPair: [number, number] | null = null;

  steps.push({
    kind: "init",
    maxArea: 0,
    bestPair: null,
    activeLines: [2],
    label: "init maxArea",
  });

  for (let i = 0; i < heights.length - 1; i++) {
    steps.push({
      kind: "outer",
      i,
      maxArea,
      bestPair,
      activeLines: [3],
      label: `outer i = ${i}`,
    });

    for (let j = i + 1; j < heights.length; j++) {
      const width = j - i;
      const minHeight = Math.min(heights[i], heights[j]);
      const area = minHeight * width;
      const willUpdate = area > maxArea;

      // Line 4 — inner loop enters with j.
      steps.push({
        kind: "pair-enter",
        i,
        j,
        maxArea,
        bestPair,
        activeLines: [4],
        label: `inner j = ${j}`,
      });

      // Line 5 — compute width.
      steps.push({
        kind: "pair-width",
        i,
        j,
        width,
        maxArea,
        bestPair,
        activeLines: [5],
        label: `width = ${width}`,
      });

      // Line 6 — compute minH.
      steps.push({
        kind: "pair-minh",
        i,
        j,
        width,
        minHeight,
        maxArea,
        bestPair,
        activeLines: [6],
        label: `minH = ${minHeight}`,
      });

      // Line 7 — compute area for this pair.
      steps.push({
        kind: "pair-area",
        i,
        j,
        width,
        minHeight,
        area,
        maxArea,
        bestPair,
        activeLines: [7],
        label: `area = ${area}`,
      });

      // Line 8 — update maxArea (or leave it).
      if (willUpdate) {
        maxArea = area;
        bestPair = [i, j];
      }
      steps.push({
        kind: "pair-update",
        i,
        j,
        width,
        minHeight,
        area,
        maxArea,
        bestPair,
        updated: willUpdate,
        activeLines: [8],
        label: willUpdate
          ? `maxArea := ${maxArea}`
          : `maxArea stays ${maxArea}`,
      });
    }
  }

  steps.push({
    kind: "done",
    maxArea,
    bestPair,
    activeLines: [11],
    label: `return ${maxArea}`,
  });

  return steps;
}

// ─── Code Panel ───────────────────────────────────────────────────────────────

type CodeLine = { line: number; text: string; indent: number };

const CODE: CodeLine[] = [
  { line: 1, text: "int maxArea(int[] height) {", indent: 0 },
  { line: 2, text: "int maxArea = 0;", indent: 1 },
  { line: 3, text: "for (int i = 0; i < height.length; i++) {", indent: 1 },
  { line: 4, text: "for (int j = i + 1; j < height.length; j++) {", indent: 2 },
  { line: 5, text: "int width    = j - i;", indent: 3 },
  { line: 6, text: "int minH     = Math.min(height[i], height[j]);", indent: 3 },
  { line: 7, text: "int area     = minH * width;", indent: 3 },
  { line: 8, text: "maxArea      = Math.max(maxArea, area);", indent: 3 },
  { line: 9, text: "}", indent: 2 },
  { line: 10, text: "}", indent: 1 },
  { line: 11, text: "return maxArea;", indent: 1 },
  { line: 12, text: "}", indent: 0 },
];

function colorize(text: string): React.ReactNode {
  const keywords = /\b(int|for|if|return|Math|min|max)\b/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = keywords.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    parts.push(
      <span key={`kw-${match.index}`} style={{ color: "#7c3aed", fontWeight: 500 }}>
        {match[0]}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts;
}

function CodePanel({ activeLines }: { activeLines: number[] }) {
  const activeSet = new Set(activeLines);
  return (
    <div className="font-mono">
      <div className="py-4 text-[13.5px] leading-[1.9] overflow-x-auto">
        {CODE.map(({ line, text, indent }) => {
          const isActive = activeSet.has(line);
          return (
            <div
              key={line}
              className="flex items-start pr-3 relative"
              style={{
                background: isActive
                  ? "rgba(16, 185, 129, 0.10)"
                  : "transparent",
                borderLeft: `3px solid ${isActive ? "#10b981" : "transparent"}`,
                transition: "background 0.15s",
              }}
            >
              <span
                className="tabular-nums select-none pr-3 text-right pl-3"
                style={{
                  width: 36,
                  color: isActive ? "#059669" : "#9ca3af",
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {line}
              </span>
              <span
                style={{
                  paddingLeft: indent * 16,
                  whiteSpace: "pre",
                  display: "inline-block",
                  color: isActive ? "#0f172a" : "#334155",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {colorize(text)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Container Visualizer (SVG) ───────────────────────────────────────────────

const CHART_X = 44;
const CHART_Y = 60;
const CHART_W = 460;
const CHART_H = 230;
const AXIS_Y = CHART_Y + CHART_H;

function ContainerVisualizer({
  heights,
  step,
  maxH,
}: {
  heights: number[];
  step: Step;
  maxH: number;
}) {
  const n = heights.length;
  const slot = CHART_W / n;
  const barW = Math.min(48, slot * 0.55);

  const barX = (idx: number) => CHART_X + slot * idx + slot / 2 - barW / 2;
  const barCenterX = (idx: number) => CHART_X + slot * idx + slot / 2;
  const yFor = (h: number) => AXIS_Y - (h / maxH) * CHART_H;

  const i = step.i ?? -1;
  const j = step.j ?? -1;
  const best = step.bestPair;

  // Choose gridline ticks: 0, then every 1 or 2 depending on maxH
  const tickStep = maxH <= 5 ? 1 : maxH <= 10 ? 2 : Math.ceil(maxH / 5);
  const ticks: number[] = [];
  for (let t = 0; t <= maxH; t += tickStep) ticks.push(t);
  if (ticks[ticks.length - 1] !== maxH) ticks.push(maxH);

  return (
    <svg
      viewBox={`0 0 520 380`}
      className="w-full h-auto"
      style={{ maxHeight: 460 }}
    >
      <defs>
        <marker
          id="cwmw-tick-l"
          viewBox="0 0 6 10"
          refX={0}
          refY={5}
          markerWidth={6}
          markerHeight={10}
          orient="auto"
        >
          <line x1={2} y1={0} x2={2} y2={10} stroke="#374151" strokeWidth={2} />
        </marker>
        <marker
          id="cwmw-tick-r"
          viewBox="0 0 6 10"
          refX={6}
          refY={5}
          markerWidth={6}
          markerHeight={10}
          orient="auto"
        >
          <line x1={4} y1={0} x2={4} y2={10} stroke="#374151" strokeWidth={2} />
        </marker>
        <pattern
          id="cwmw-water"
          x={0}
          y={0}
          width={12}
          height={12}
          patternUnits="userSpaceOnUse"
        >
          <rect width={12} height={12} fill="#0ea5e9" opacity={0.18} />
          <path d="M0 6 Q3 3 6 6 T12 6" stroke="#0ea5e9" strokeWidth={1} fill="none" opacity={0.55} />
        </pattern>
      </defs>

      {/* Horizontal gridlines */}
      {ticks.map(k => (
        <g key={`grid-${k}`}>
          <line
            x1={CHART_X}
            y1={yFor(k)}
            x2={CHART_X + CHART_W}
            y2={yFor(k)}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
          <text
            x={CHART_X - 8}
            y={yFor(k) + 3}
            textAnchor="end"
            fontSize={9}
            fill="#9ca3af"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            {k}
          </text>
        </g>
      ))}

      {/* Y-axis */}
      <line
        x1={CHART_X}
        y1={CHART_Y}
        x2={CHART_X}
        y2={AXIS_Y}
        stroke="#d1d5db"
      />
      {/* X-axis */}
      <line
        x1={CHART_X}
        y1={AXIS_Y}
        x2={CHART_X + CHART_W}
        y2={AXIS_Y}
        stroke="#374151"
        strokeWidth={1.5}
      />

      {/* Best-so-far container outline (only when there IS a best and it's not the current pair) */}
      {best &&
        (best[0] !== i || best[1] !== j) &&
        (() => {
          const bMin = Math.min(heights[best[0]], heights[best[1]]);
          return (
            <g>
              <rect
                x={barCenterX(best[0])}
                y={yFor(bMin)}
                width={barCenterX(best[1]) - barCenterX(best[0])}
                height={AXIS_Y - yFor(bMin)}
                fill="none"
                stroke="#10b981"
                strokeDasharray="4 3"
                strokeWidth={1.4}
              />
              <text
                x={(barCenterX(best[0]) + barCenterX(best[1])) / 2}
                y={yFor(bMin) - 4}
                fontSize={9}
                fill="#10b981"
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fontWeight={600}
              >
                best so far
              </text>
            </g>
          );
        })()}

      {/* Water rectangle for current pair */}
      {i >= 0 && j >= 0 && step.minHeight !== undefined && (
        <g>
          <rect
            x={barCenterX(i)}
            y={yFor(step.minHeight)}
            width={barCenterX(j) - barCenterX(i)}
            height={AXIS_Y - yFor(step.minHeight)}
            fill="url(#cwmw-water)"
          />
          <rect
            x={barCenterX(i)}
            y={yFor(step.minHeight)}
            width={barCenterX(j) - barCenterX(i)}
            height={AXIS_Y - yFor(step.minHeight)}
            fill="#38bdf8"
            fillOpacity={0.12}
            stroke="#0284c7"
            strokeOpacity={0.7}
            strokeWidth={1}
          />
          {/* Water surface highlight */}
          <line
            x1={barCenterX(i)}
            y1={yFor(step.minHeight)}
            x2={barCenterX(j)}
            y2={yFor(step.minHeight)}
            stroke="#0284c7"
            strokeWidth={1.5}
          />
        </g>
      )}

      {/* Bars */}
      {heights.map((h, idx) => {
        const isI = idx === i;
        const isJ = idx === j;
        let fill = "#9ca3af";
        let stroke = "#6b7280";
        if (isI) {
          fill = "#f59e0b";
          stroke = "#d97706";
        } else if (isJ) {
          fill = "#a855f7";
          stroke = "#7e22ce";
        }
        return (
          <g key={idx}>
            <rect
              x={barX(idx)}
              y={yFor(h)}
              width={barW}
              height={AXIS_Y - yFor(h)}
              fill={fill}
              stroke={stroke}
              strokeWidth={1}
              rx={2}
            />
            <text
              x={barCenterX(idx)}
              y={yFor(h) - 4}
              fontSize={9.5}
              fill={isI || isJ ? "#111827" : "#4b5563"}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              fontWeight={isI || isJ ? 700 : 500}
            >
              {h}
            </text>
            <text
              x={barCenterX(idx)}
              y={AXIS_Y + 14}
              fontSize={10}
              fill={isI || isJ ? "#111827" : "#6b7280"}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              fontWeight={isI || isJ ? 700 : 400}
            >
              {idx}
            </text>
          </g>
        );
      })}

      {/* i and j pointers */}
      {i >= 0 && (
        <g>
          <text
            x={barCenterX(i)}
            y={CHART_Y - 22}
            fontSize={12}
            fill="#f59e0b"
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            i
          </text>
          <text
            x={barCenterX(i)}
            y={CHART_Y - 8}
            fontSize={13}
            fill="#f59e0b"
            textAnchor="middle"
          >
            ▼
          </text>
        </g>
      )}
      {j >= 0 && (
        <g>
          <text
            x={barCenterX(j)}
            y={CHART_Y - 22}
            fontSize={12}
            fill="#a855f7"
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            j
          </text>
          <text
            x={barCenterX(j)}
            y={CHART_Y - 8}
            fontSize={13}
            fill="#a855f7"
            textAnchor="middle"
          >
            ▼
          </text>
        </g>
      )}

      {/* Area label centered on water */}
      {i >= 0 && j >= 0 && step.area !== undefined && step.minHeight !== undefined && (
        (() => {
          const midX = (barCenterX(i) + barCenterX(j)) / 2;
          const waterMidY = (yFor(step.minHeight) + AXIS_Y) / 2 + 3;
          const waterH = AXIS_Y - yFor(step.minHeight);
          // If water is too thin, place label just above the surface
          const y = waterH < 32 ? yFor(step.minHeight) - 6 : waterMidY;
          return (
            <g>
              <rect
                x={midX - 55}
                y={y - 12}
                width={110}
                height={18}
                rx={4}
                fill="#ffffff"
                stroke={step.updated ? "#10b981" : "#0284c7"}
                strokeWidth={1.25}
                opacity={0.95}
              />
              <text
                x={midX}
                y={y + 1}
                fontSize={11}
                fill={step.updated ? "#047857" : "#0369a1"}
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fontWeight={700}
              >
                {step.minHeight} × {step.width} = {step.area}
              </text>
            </g>
          );
        })()
      )}

      {/* Width bracket */}
      {i >= 0 && j >= 0 && step.width !== undefined && (
        <g>
          <line
            x1={barCenterX(i)}
            y1={AXIS_Y + 32}
            x2={barCenterX(j)}
            y2={AXIS_Y + 32}
            stroke="#374151"
            strokeWidth={1.5}
            markerStart="url(#cwmw-tick-l)"
            markerEnd="url(#cwmw-tick-r)"
          />
          <text
            x={(barCenterX(i) + barCenterX(j)) / 2}
            y={AXIS_Y + 46}
            fontSize={10}
            fill="#374151"
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            width = j − i = {step.width}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Variables panel ──────────────────────────────────────────────────────────

function VariablesPanel({ step }: { step: Step; heights: number[] }) {
  const empty = <span className="text-gray-300">—</span>;

  const items: { label: string; value: React.ReactNode }[] = [
    {
      label: "i",
      value:
        step.i !== undefined ? (
          <span className="text-amber-600">{step.i}</span>
        ) : (
          empty
        ),
    },
    {
      label: "j",
      value:
        step.j !== undefined ? (
          <span className="text-purple-600">{step.j}</span>
        ) : (
          empty
        ),
    },
    {
      label: "width",
      value:
        step.width !== undefined ? (
          <span className="text-gray-800">{step.width}</span>
        ) : (
          empty
        ),
    },
    {
      label: "minH",
      value:
        step.minHeight !== undefined ? (
          <span className="text-gray-800">{step.minHeight}</span>
        ) : (
          empty
        ),
    },
    {
      label: "area",
      value:
        step.area !== undefined ? (
          <span className={step.updated ? "text-emerald-600" : "text-sky-600"}>
            {step.area}
          </span>
        ) : (
          empty
        ),
    },
    {
      label: "maxArea",
      value: <span className="text-emerald-700">{step.maxArea}</span>,
    },
  ];

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-4 py-2 border-t border-gray-200 bg-gray-50/60 text-[12px] font-mono">
      {items.map(item => (
        <span key={item.label} className="inline-flex items-baseline gap-1.5">
          <span className="text-gray-400 uppercase tracking-wide text-[10px]">
            {item.label}
          </span>
          <span className="font-semibold tabular-nums">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContainerMostWaterBruteVisualizer() {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find(p => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const steps = useMemo(() => simulate(preset.heights), [preset]);
  const total = steps.length;
  const currentIdx = Math.min(stepIdx, total - 1);
  const step = steps[currentIdx];

  const maxH = useMemo(() => Math.max(...preset.heights), [preset]);

  const isDone = currentIdx >= total - 1;

  const goNext = useCallback(() => {
    setStepIdx(s => Math.min(s + 1, total - 1));
  }, [total]);

  const reset = useCallback(() => {
    setStepIdx(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    // Auto-play pacing per step kind. The moment-of-truth (pair-update) gets
    // a longer beat so the reader can see the maxArea change; setup lines
    // (pair-enter, pair-width, pair-minh) advance a bit faster.
    const wait =
      step.kind === "pair-update"
        ? 900
        : step.kind === "pair-area"
          ? 700
          : step.kind === "pair-minh"
            ? 600
            : step.kind === "pair-width"
              ? 500
              : step.kind === "pair-enter"
                ? 500
                : step.kind === "outer"
                  ? 550
                  : 700;
    const t = setTimeout(goNext, wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step.kind, goNext]);

  useEffect(() => {
    setStepIdx(0);
    setIsPlaying(false);
  }, [presetId]);

  return (
    <div className="my-6 flex flex-col gap-4">
      {/* ── Algorithm section (top, full width) ─────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <CodePanel activeLines={step.activeLines} />
      </div>

      {/* ── Visualization section (bottom, full width) ──────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Preset selector */}
        <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex justify-between items-center">
          <div>
          <div className="text-[10px] uppercase font-semibold tracking-wide text-gray-400 mb-1.5">
            Input
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  p.id === presetId
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-sky-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(p => !p)}
              disabled={isDone && !isPlaying}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={goNext}
              disabled={isDone}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <SkipForward size={12} />
              Step
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>

        {/* SVG (full width); minimal footer with variable status sits flush below */}
        <div className="p-4">
          <div className="rounded-lg bg-white overflow-hidden">
            <ContainerVisualizer
              heights={preset.heights}
              step={step}
              maxH={maxH}
            />
          </div>
        </div>
        <VariablesPanel step={step} heights={preset.heights} />
      </div>
    </div>
  );
}
