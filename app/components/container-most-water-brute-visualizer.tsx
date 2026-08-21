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

type StepKind = "init" | "outer" | "pair" | "done";

type Step = {
  kind: StepKind;
  i?: number;
  j?: number;
  width?: number;
  minHeight?: number;
  area?: number;
  maxArea: number;
  bestPair: [number, number] | null;
  updated?: boolean;
  activeLines: number[];
  narration: string;
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
    narration:
      "Initialize maxArea = 0. This variable will track the largest container we have seen so far.",
  });

  for (let i = 0; i < heights.length - 1; i++) {
    steps.push({
      kind: "outer",
      i,
      maxArea,
      bestPair,
      activeLines: [3],
      narration: `Outer loop: pick i = ${i} (height[${i}] = ${heights[i]}). Now try every j > i.`,
    });

    for (let j = i + 1; j < heights.length; j++) {
      const width = j - i;
      const minHeight = Math.min(heights[i], heights[j]);
      const area = minHeight * width;
      const updated = area > maxArea;
      if (updated) {
        maxArea = area;
        bestPair = [i, j];
      }
      steps.push({
        kind: "pair",
        i,
        j,
        width,
        minHeight,
        area,
        maxArea,
        bestPair,
        updated,
        activeLines: updated ? [4, 5, 6, 7, 8] : [4, 5, 6, 7],
        narration: `Pair (i=${i}, j=${j}): width = ${j} − ${i} = ${width}, minHeight = min(${heights[i]}, ${heights[j]}) = ${minHeight}, area = ${minHeight} × ${width} = ${area}. ${
          updated
            ? `New maxArea = ${maxArea}!`
            : `maxArea stays at ${maxArea}.`
        }`,
      });
    }
  }

  steps.push({
    kind: "done",
    maxArea,
    bestPair,
    activeLines: [10],
    narration: `Return maxArea = ${maxArea}${
      bestPair ? ` (best pair: i = ${bestPair[0]}, j = ${bestPair[1]}).` : "."
    }`,
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
  { line: 5, text: "int width = j - i;", indent: 3 },
  { line: 6, text: "int minH  = Math.min(height[i], height[j]);", indent: 3 },
  { line: 7, text: "int area  = minH * width;", indent: 3 },
  { line: 8, text: "maxArea   = Math.max(maxArea, area);", indent: 3 },
  { line: 9, text: "} }", indent: 1 },
  { line: 10, text: "return maxArea;", indent: 1 },
  { line: 11, text: "}", indent: 0 },
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
      <span key={`kw-${match.index}`} style={{ color: "#a855f7" }}>
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
    <div className="rounded-lg bg-neutral-950 text-neutral-200 text-[12px] font-mono leading-[1.55] py-3 overflow-hidden">
      {CODE.map(({ line, text, indent }) => {
        const isActive = activeSet.has(line);
        return (
          <div
            key={line}
            className="flex items-start px-2 relative"
            style={{
              background: isActive ? "rgba(16, 185, 129, 0.14)" : "transparent",
              borderLeft: `2px solid ${isActive ? "#10b981" : "transparent"}`,
              transition: "background 0.15s",
            }}
          >
            <span
              className="tabular-nums select-none pr-2 text-right"
              style={{ width: 24, color: isActive ? "#10b981" : "#525252" }}
            >
              {line}
            </span>
            <span
              style={{
                paddingLeft: indent * 14,
                whiteSpace: "pre",
                minHeight: 18,
                display: "inline-block",
              }}
            >
              {colorize(text)}
            </span>
          </div>
        );
      })}
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

function VariablesPanel({
  step,
  heights,
}: {
  step: Step;
  heights: number[];
}) {
  const rows: { label: string; value: React.ReactNode; accent?: string }[] = [
    {
      label: "i",
      value:
        step.i !== undefined ? (
          <span>
            <span className="text-amber-600 font-bold">{step.i}</span>
            <span className="text-gray-400"> → height[i] = </span>
            <span className="font-bold">{heights[step.i]}</span>
          </span>
        ) : (
          <span className="text-gray-400 italic">—</span>
        ),
    },
    {
      label: "j",
      value:
        step.j !== undefined ? (
          <span>
            <span className="text-purple-600 font-bold">{step.j}</span>
            <span className="text-gray-400"> → height[j] = </span>
            <span className="font-bold">
              {step.j !== undefined ? heights[step.j] : ""}
            </span>
          </span>
        ) : (
          <span className="text-gray-400 italic">—</span>
        ),
    },
    {
      label: "width",
      value:
        step.width !== undefined ? (
          <span className="font-bold">{step.width}</span>
        ) : (
          <span className="text-gray-400 italic">—</span>
        ),
    },
    {
      label: "minH",
      value:
        step.minHeight !== undefined ? (
          <span className="font-bold">{step.minHeight}</span>
        ) : (
          <span className="text-gray-400 italic">—</span>
        ),
    },
    {
      label: "area",
      value:
        step.area !== undefined ? (
          <span
            className={`font-bold ${
              step.updated ? "text-emerald-600" : "text-sky-600"
            }`}
          >
            {step.area}
          </span>
        ) : (
          <span className="text-gray-400 italic">—</span>
        ),
    },
    {
      label: "maxArea",
      value: (
        <span className="font-bold text-emerald-700">
          {step.maxArea}
          {step.bestPair && (
            <span className="text-gray-400 font-normal">
              {" "}
              (from i={step.bestPair[0]}, j={step.bestPair[1]})
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <span className="text-[10px] uppercase font-semibold tracking-wide text-gray-500">
          Variables
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(row => (
          <div
            key={row.label}
            className="px-3 py-1.5 flex items-baseline gap-3 text-[12px] font-mono"
          >
            <span className="text-gray-500 w-16 shrink-0">{row.label}</span>
            <span className="text-gray-800">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContainerMostWaterBruteVisualizer() {
  const [presetId, setPresetId] = useState<string>(PRESETS[1].id);
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
    // Pair steps get a slightly longer beat than outer-loop transitions
    const wait = step.kind === "pair" ? 900 : step.kind === "outer" ? 650 : 800;
    const t = setTimeout(goNext, wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step.kind, goNext]);

  useEffect(() => {
    setStepIdx(0);
    setIsPlaying(false);
  }, [presetId]);

  return (
    <div className="my-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-white">
        <div>
          <div className="text-[11px] text-gray-500">
          Press Play or Step to start the dry run.
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

      {/* Preset selector */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-white">
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
          <span className="ml-auto text-[10px] text-gray-500 font-mono self-center">
            Expected maxArea ={" "}
            <span className="text-gray-800 font-semibold">{preset.expected}</span>
          </span>
        </div>
      </div>

      {/* Main grid: SVG (left) + Code + Variables (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        {/* Left: visual */}
        <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <ContainerVisualizer heights={preset.heights} step={step} maxH={maxH} />
        </div>

        {/* Right: code + variables */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <CodePanel activeLines={step.activeLines} />
          <VariablesPanel step={step} heights={preset.heights} />
        </div>
      </div>

      {/* Narration */}
      <div className="px-4 pb-4">
        <div
          className="rounded-lg border px-3 py-2 flex items-start gap-2"
          style={{
            background:
              step.kind === "pair" && step.updated
                ? "#ecfdf5"
                : step.kind === "pair"
                  ? "#f0f9ff"
                  : step.kind === "outer"
                    ? "#fff7ed"
                    : step.kind === "done"
                      ? "#f0fdf4"
                      : "#f9fafb",
            borderColor:
              step.kind === "pair" && step.updated
                ? "#86efac"
                : step.kind === "pair"
                  ? "#7dd3fc"
                  : step.kind === "outer"
                    ? "#fdba74"
                    : step.kind === "done"
                      ? "#86efac"
                      : "#e5e7eb",
          }}
        >
          <StepBadge step={step} stepIdx={currentIdx} total={total} />
          <div className="text-[12px] leading-relaxed text-gray-800 flex-1">
            {step.narration}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBadge({
  step,
  stepIdx,
  total,
}: {
  step: Step;
  stepIdx: number;
  total: number;
}) {
  const label =
    step.kind === "init"
      ? "INIT"
      : step.kind === "outer"
        ? "OUTER"
        : step.kind === "pair"
          ? step.updated
            ? "NEW MAX"
            : "PAIR"
          : "DONE";
  const color =
    step.kind === "init"
      ? "#6b7280"
      : step.kind === "outer"
        ? "#d97706"
        : step.kind === "pair"
          ? step.updated
            ? "#059669"
            : "#0284c7"
          : "#059669";
  return (
    <div className="flex-shrink-0 mt-0.5">
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{
          background: "#fff",
          border: `1px solid ${color}`,
          color,
        }}
      >
        {label}
        <span className="ml-1 text-gray-400 font-normal">
          {stepIdx + 1}/{total}
        </span>
      </div>
    </div>
  );
}
