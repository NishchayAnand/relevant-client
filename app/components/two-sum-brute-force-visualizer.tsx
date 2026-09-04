"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  nums: number[];
  target: number;
};

const PRESETS: Preset[] = [
  {
    id: "example",
    label: "[2,7,11,15] · target = 9",
    nums: [2, 7, 11, 15],
    target: 9,
  },
  {
    id: "unsorted",
    label: "[3,2,4] · target = 6",
    nums: [3, 2, 4],
    target: 6,
  },
  {
    id: "late-pair",
    label: "[2,7,11,15] · target = 26",
    nums: [2, 7, 11, 15],
    target: 26,
  },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public int[] twoSum(int[] nums, int target) {",
  "    for (int i = 0; i < nums.length; i++) {",
  "        for (int j = i + 1; j < nums.length; j++) {",
  "            if (nums[i] + nums[j] == target) {",
  "                return new int[]{i, j};",
  "            }",
  "        }",
  "    }",
  "    return new int[]{};",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind = "outer" | "inner" | "check" | "return_pair" | "return_empty";

type TriedPair = {
  i: number;
  j: number;
  sum: number;
  match: boolean;
};

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  sum: number | null;
  match: boolean | null;
  tried: TriedPair[];
  result: [number, number] | null;
};

function simulate(nums: number[], target: number): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  const tried: TriedPair[] = [];

  for (let i = 0; i < n; i++) {
    steps.push({
      kind: "outer",
      lines: [2],
      description: `Outer loop: i = ${i}. Fix nums[${i}] = ${nums[i]} and search for a complement to its right.`,
      i,
      j: null,
      sum: null,
      match: null,
      tried: [...tried],
      result: null,
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        kind: "inner",
        lines: [3],
        description: `Inner loop: j = ${j}. Pair nums[${i}] = ${nums[i]} with nums[${j}] = ${nums[j]}.`,
        i,
        j,
        sum: null,
        match: null,
        tried: [...tried],
        result: null,
      });

      const sum = nums[i] + nums[j];
      const match = sum === target;
      tried.push({ i, j, sum, match });

      steps.push({
        kind: "check",
        lines: [4],
        description: match
          ? `nums[${i}] + nums[${j}] = ${nums[i]} + ${nums[j]} = ${sum} == ${target}. Pair found.`
          : `nums[${i}] + nums[${j}] = ${nums[i]} + ${nums[j]} = ${sum} ≠ ${target}. Keep scanning.`,
        i,
        j,
        sum,
        match,
        tried: [...tried],
        result: null,
      });

      if (match) {
        steps.push({
          kind: "return_pair",
          lines: [5],
          description: `Return [${i}, ${j}] — the indices of the pair that sums to ${target}.`,
          i,
          j,
          sum,
          match: true,
          tried: [...tried],
          result: [i, j],
        });
        return steps;
      }
    }
  }

  steps.push({
    kind: "return_empty",
    lines: [9],
    description: "No pair sums to the target. Return an empty array.",
    i: null,
    j: null,
    sum: null,
    match: null,
    tried: [...tried],
    result: null,
  });

  return steps;
}

// ─── Left: algorithm ──────────────────────────────────────────────────────────

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.7] overflow-x-auto">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        return (
          <div
            key={lineNum}
            className={`flex transition-colors duration-150 ${
              isActive ? "bg-amber-100/80" : ""
            }`}
            style={{
              borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}`,
            }}
          >
            <span
              className={`w-7 text-right pr-2 select-none tabular-nums ${
                isActive ? "text-amber-700 font-semibold" : "text-gray-300"
              }`}
            >
              {lineNum}
            </span>
            <span
              className={`flex-1 whitespace-pre ${
                isActive ? "text-amber-900 font-semibold" : "text-gray-600"
              }`}
            >
              {line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Right: array + dry run ───────────────────────────────────────────────────

const CELL_W = 48;
const CELL_H = 48;
const GAP = 6;

function ArrayDisplay({
  nums,
  i,
  j,
  match,
  result,
}: {
  nums: number[];
  i: number | null;
  j: number | null;
  match: boolean | null;
  result: [number, number] | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex" style={{ gap: GAP }}>
        {nums.map((_, idx) => {
          const labels: { text: string; color: string }[] = [];
          if (idx === i) labels.push({ text: "i", color: "#d97706" });
          if (idx === j) labels.push({ text: "j", color: "#7c3aed" });
          return (
            <div
              key={idx}
              style={{
                width: CELL_W,
                height: 22,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
                flexShrink: 0,
              }}
            >
              {labels.map((l) => (
                <span key={l.text} style={{ color: l.color }}>
                  {l.text}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {nums.map((val, idx) => {
          const isI = idx === i;
          const isJ = idx === j;
          const inResult = result !== null && (idx === result[0] || idx === result[1]);
          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (inResult || match === true && (isI || isJ)) {
            bg = "#dcfce7";
            border = "#10b981";
            color = "#065f46";
          } else if (match === false && (isI || isJ)) {
            bg = "#fee2e2";
            border = "#f87171";
            color = "#991b1b";
          } else if (isI) {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (isJ) {
            bg = "#ede9fe";
            border = "#8b5cf6";
            color = "#5b21b6";
          }

          return (
            <div
              key={idx}
              style={{
                width: CELL_W,
                height: CELL_H,
                background: bg,
                border: `2px solid ${border}`,
                color,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                transition: "background 0.2s, border-color 0.2s, color 0.2s",
                flexShrink: 0,
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ gap: GAP }}>
        {nums.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              textAlign: "center",
              fontSize: 10,
              color: "#9ca3af",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {idx}
          </div>
        ))}
      </div>
    </div>
  );
}

function Equation({
  nums,
  target,
  i,
  j,
  sum,
  match,
}: {
  nums: number[];
  target: number;
  i: number | null;
  j: number | null;
  sum: number | null;
  match: boolean | null;
}) {
  const leftReady = i !== null && j !== null;
  const compared = sum !== null;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-sm h-[58px]">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className={i !== null ? "text-amber-700 font-semibold" : "text-gray-300"}>
          {i !== null ? nums[i] : "nums[i]"}
        </span>
        <span className="text-gray-400">+</span>
        <span className={j !== null ? "text-violet-700 font-semibold" : "text-gray-300"}>
          {j !== null ? nums[j] : "nums[j]"}
        </span>
        <span
          className={`font-bold ${
            match === true
              ? "text-emerald-600"
              : match === false
                ? "text-rose-500"
                : "text-gray-300"
          }`}
        >
          {compared ? (match ? "=" : "≠") : leftReady ? "?" : ""}
        </span>
        <span className="text-sky-700 font-semibold">{target}</span>
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${
          compared
            ? match
              ? "text-emerald-700"
              : "text-rose-600"
            : "text-transparent"
        }`}
      >
        {compared
          ? match
            ? `${sum} == ${target} → return {i, j}`
            : `${sum} ≠ ${target} → continue`
          : "placeholder"}
      </div>
    </div>
  );
}

function TriedPairs({
  nums,
  tried,
  current,
}: {
  nums: number[];
  tried: TriedPair[];
  current: { i: number | null; j: number | null };
}) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold shrink-0">
        Pairs checked
      </div>
      <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pr-1">
        {tried.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
            None yet
          </div>
        ) : (
          tried.map((p) => {
            const isCurrent = p.i === current.i && p.j === current.j;
            return (
              <div
                key={`${p.i}-${p.j}`}
                className={`flex items-center justify-between rounded-md px-2 py-1 font-mono text-[11px] border ${
                  p.match
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : isCurrent
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-white border-gray-100 text-gray-500"
                }`}
              >
                <span>
                  ({p.i}, {p.j}) · {nums[p.i]} + {nums[p.j]} = {p.sum}
                </span>
                <span className="font-semibold">{p.match ? "match" : "skip"}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  labelColor,
}: {
  label: string;
  value: string;
  labelColor?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
      <span className="font-semibold" style={{ color: labelColor ?? "#9ca3af" }}>
        {label}
      </span>
      <span className="font-semibold text-gray-700">= {value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<StepKind, string> = {
  outer: "Outer loop",
  inner: "Inner loop",
  check: "Compare sum",
  return_pair: "Return",
  return_empty: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  outer: "text-amber-600",
  inner: "text-violet-600",
  check: "text-sky-600",
  return_pair: "text-emerald-600",
  return_empty: "text-rose-600",
};

export default function TwoSumBruteForceVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const steps = useMemo(
    () => simulate(preset.nums, preset.target),
    [preset],
  );

  const isDone = step >= steps.length;
  const cur = step > 0 ? steps[step - 1] : null;

  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
  }, [presetId]);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    const wait =
      cur?.kind === "return_pair" || cur?.kind === "check"
        ? 900
        : cur?.kind === "inner"
          ? 650
          : 750;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to dry-run the nested loops. The highlighted line is the one currently executing.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const i = cur?.i ?? null;
  const j = cur?.j ?? null;
  const sum = cur?.sum ?? null;
  const match = cur?.match ?? null;
  const tried = cur?.tried ?? [];
  const result = cur?.result ?? null;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-3 flex items-center gap-1.5 flex-wrap min-h-[52px]">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
          Sample inputs
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => loadPreset(p.id)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
              presetId === p.id
                ? "border-gray-400 bg-white text-gray-800"
                : "border-gray-200 text-gray-500 hover:bg-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[28rem]">
        <div className="flex-1 min-w-0 px-5 pt-5 pb-5 flex flex-col gap-3 overflow-hidden">
          <AlgorithmPanel activeLines={lines} />
          <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-gray-200/70 shrink-0">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                kind ? KIND_COLOR[kind] : "text-gray-400"
              }`}
            >
              {kind ? KIND_LABEL[kind] : "Ready"}
            </span>
            <p className="text-xs text-gray-600 leading-relaxed h-[3.75rem] overflow-hidden">
              {description}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[380px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-4 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wide text-sky-600 font-semibold">
              Target
            </span>
            <span className="font-mono text-sm font-bold text-sky-700">
              {preset.target}
            </span>
          </div>

          <ArrayDisplay
            nums={preset.nums}
            i={i}
            j={j}
            match={match}
            result={result}
          />

          <Equation
            nums={preset.nums}
            target={preset.target}
            i={i}
            j={j}
            sum={sum}
            match={match}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="i"
              value={i === null ? "—" : String(i)}
              labelColor="#d97706"
            />
            <StatPill
              label="j"
              value={j === null ? "—" : String(j)}
              labelColor="#7c3aed"
            />
            <StatPill
              label="sum"
              value={sum === null ? "—" : String(sum)}
              labelColor="#0284c7"
            />
            <StatPill
              label="answer"
              value={result ? `[${result[0]}, ${result[1]}]` : "?"}
              labelColor="#059669"
            />
          </div>

          <TriedPairs
            nums={preset.nums}
            tried={tried}
            current={{ i, j }}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-3.5 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            if (isDone) {
              setStep(0);
              setIsPlaying(false);
            } else setIsPlaying((prev) => !prev);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isDone && !isPlaying) setStep((s) => s + 1);
          }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={13} /> Step
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setIsPlaying(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50"
        >
          <RotateCcw size={13} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1 bg-gray-200/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{
                width: `${steps.length ? (step / steps.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400 tabular-nums font-mono">
            {step}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
