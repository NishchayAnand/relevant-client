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
  {
    id: "duplicates",
    label: "[3,3,4] · target = 6",
    nums: [3, 3, 4],
    target: 6,
  },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public int[] twoSum(int[] nums, int target) {",
  "    Map<Integer, Integer> map = new HashMap<>();",
  "    for (int i = 0; i < nums.length; i++) {",
  "        if (map.containsKey(target - nums[i]))",
  "            return new int[]{i, map.get(target - nums[i])};",
  "        map.put(nums[i], i);",
  "    }",
  "    return new int[]{};",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind = "init" | "loop" | "lookup" | "put" | "return_pair" | "return_empty";

type MapEntry = { value: number; index: number };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  value: number | null;
  complement: number | null;
  foundInMap: boolean | null;
  map: MapEntry[];
  lookingUp: number | null;
  inserting: number | null;
  partnerIndex: number | null;
  result: [number, number] | null;
};

function simulate(nums: number[], target: number): Step[] {
  const steps: Step[] = [];
  const map = new Map<number, number>();

  const snapshot = (): MapEntry[] =>
    Array.from(map.entries()).map(([value, index]) => ({ value, index }));

  steps.push({
    kind: "init",
    lines: [2],
    description: "Create an empty HashMap. Keys are values seen so far; values are their indices.",
    i: null,
    value: null,
    complement: null,
    foundInMap: null,
    map: [],
    lookingUp: null,
    inserting: null,
    partnerIndex: null,
    result: null,
  });

  for (let i = 0; i < nums.length; i++) {
    const value = nums[i];
    const complement = target - value;

    steps.push({
      kind: "loop",
      lines: [3],
      description: `i = ${i}. Current value nums[${i}] = ${value}. Need complement ${target} − ${value} = ${complement}.`,
      i,
      value,
      complement,
      foundInMap: null,
      map: snapshot(),
      lookingUp: null,
      inserting: null,
      partnerIndex: null,
      result: null,
    });

    const found = map.has(complement);
    const partnerIndex = found ? map.get(complement)! : null;

    steps.push({
      kind: "lookup",
      lines: [4],
      description: found
        ? `map.containsKey(${complement}) is true — ${complement} was stored at index ${partnerIndex}.`
        : `map.containsKey(${complement}) is false — ${complement} has not been seen yet.`,
      i,
      value,
      complement,
      foundInMap: found,
      map: snapshot(),
      lookingUp: complement,
      inserting: null,
      partnerIndex,
      result: null,
    });

    if (found && partnerIndex !== null) {
      steps.push({
        kind: "return_pair",
        lines: [5],
        description: `Return [${i}, ${partnerIndex}] — nums[${i}] (${value}) + nums[${partnerIndex}] (${complement}) = ${target}.`,
        i,
        value,
        complement,
        foundInMap: true,
        map: snapshot(),
        lookingUp: complement,
        inserting: null,
        partnerIndex,
        result: [i, partnerIndex],
      });
      return steps;
    }

    map.set(value, i);
    steps.push({
      kind: "put",
      lines: [6],
      description: `Store {${value} → ${i}} so a later element can find ${value} as its complement.`,
      i,
      value,
      complement,
      foundInMap: false,
      map: snapshot(),
      lookingUp: null,
      inserting: value,
      partnerIndex: null,
      result: null,
    });
  }

  steps.push({
    kind: "return_empty",
    lines: [8],
    description: "No pair sums to the target. Return an empty array.",
    i: null,
    value: null,
    complement: null,
    foundInMap: null,
    map: snapshot(),
    lookingUp: null,
    inserting: null,
    partnerIndex: null,
    result: null,
  });

  return steps;
}

// ─── Left: algorithm ──────────────────────────────────────────────────────────

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  return (
    <div className="font-mono text-[12px] leading-[1.7]">
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

// ─── Right: array + map ───────────────────────────────────────────────────────

const CELL_W = 48;
const CELL_H = 48;
const GAP = 6;

function ArrayDisplay({
  nums,
  i,
  partnerIndex,
  foundInMap,
  result,
  map,
}: {
  nums: number[];
  i: number | null;
  partnerIndex: number | null;
  foundInMap: boolean | null;
  result: [number, number] | null;
  map: MapEntry[];
}) {
  const stored = new Set(map.map((e) => e.index));

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex" style={{ gap: GAP }}>
        {nums.map((_, idx) => {
          const labels: { text: string; color: string }[] = [];
          if (idx === i) labels.push({ text: "i", color: "#d97706" });
          if (idx === partnerIndex) labels.push({ text: "seen", color: "#059669" });
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
          const isPartner = idx === partnerIndex;
          const inResult = result !== null && (idx === result[0] || idx === result[1]);
          const inMap = stored.has(idx);

          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (inResult || (foundInMap === true && (isI || isPartner))) {
            bg = "#dcfce7";
            border = "#10b981";
            color = "#065f46";
          } else if (isI && foundInMap === false) {
            bg = "#fee2e2";
            border = "#f87171";
            color = "#991b1b";
          } else if (isI) {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (isPartner) {
            bg = "#d1fae5";
            border = "#10b981";
            color = "#065f46";
          } else if (inMap) {
            bg = "#eef2ff";
            border = "#c7d2fe";
            color = "#3730a3";
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

function LookupEquation({
  target,
  value,
  complement,
  foundInMap,
}: {
  target: number;
  value: number | null;
  complement: number | null;
  foundInMap: boolean | null;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-sm h-[58px]">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-gray-400 text-[11px]">need</span>
        <span className="text-sky-700 font-semibold">{target}</span>
        <span className="text-gray-400">−</span>
        <span className={value !== null ? "text-amber-700 font-semibold" : "text-gray-300"}>
          {value !== null ? value : "nums[i]"}
        </span>
        <span className="text-gray-400">=</span>
        <span
          className={
            complement !== null ? "text-violet-700 font-semibold" : "text-gray-300"
          }
        >
          {complement !== null ? complement : "?"}
        </span>
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${
          foundInMap !== null && complement !== null
            ? foundInMap
              ? "text-emerald-700"
              : "text-rose-600"
            : "text-transparent"
        }`}
      >
        {foundInMap !== null && complement !== null
          ? foundInMap
            ? `map has ${complement} → return the pair`
            : `map has no ${complement} → insert current`
          : "placeholder"}
      </div>
    </div>
  );
}

function MapTable({
  map,
  lookingUp,
  inserting,
  foundInMap,
}: {
  map: MapEntry[];
  lookingUp: number | null;
  inserting: number | null;
  foundInMap: boolean | null;
}) {
  const miss =
    lookingUp !== null && foundInMap === false
      ? lookingUp
      : null;

  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold shrink-0">
        HashMap · value → index
      </div>
      <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pr-1">
        {map.length === 0 && miss === null ? (
          <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
            map is empty
          </div>
        ) : (
          <>
            {map.map((e) => {
              const isLookup = lookingUp === e.value;
              const isInsert = inserting === e.value;
              return (
                <div
                  key={`${e.value}-${e.index}`}
                  className={`flex items-center justify-between rounded-md px-2 py-1 font-mono text-[11px] border ${
                    isLookup && foundInMap
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : isInsert
                        ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                        : "bg-white border-gray-100 text-gray-600"
                  }`}
                >
                  <span>
                    {e.value} → {e.index}
                  </span>
                  <span className="font-semibold text-[10px] uppercase tracking-wide">
                    {isLookup && foundInMap ? "hit" : isInsert ? "put" : ""}
                  </span>
                </div>
              );
            })}
            {miss !== null && (
              <div className="flex items-center justify-between rounded-md px-2 py-1 font-mono text-[11px] border border-dashed border-rose-200 bg-rose-50 text-rose-700">
                <span>{miss} → ?</span>
                <span className="font-semibold text-[10px] uppercase tracking-wide">
                  miss
                </span>
              </div>
            )}
          </>
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
  init: "Init map",
  loop: "Loop",
  lookup: "Lookup",
  put: "Insert",
  return_pair: "Return",
  return_empty: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  loop: "text-amber-600",
  lookup: "text-violet-600",
  put: "text-indigo-600",
  return_pair: "text-emerald-600",
  return_empty: "text-rose-600",
};

export default function TwoSumHashMapVisualizer() {
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
      cur?.kind === "return_pair" || cur?.kind === "lookup"
        ? 900
        : cur?.kind === "put"
          ? 800
          : 700;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to dry-run the HashMap pass. The highlighted line is the one currently executing.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const i = cur?.i ?? null;
  const value = cur?.value ?? null;
  const complement = cur?.complement ?? null;
  const foundInMap = cur?.foundInMap ?? null;
  const map = cur?.map ?? [];
  const lookingUp = cur?.lookingUp ?? null;
  const inserting = cur?.inserting ?? null;
  const partnerIndex = cur?.partnerIndex ?? null;
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
            partnerIndex={partnerIndex}
            foundInMap={foundInMap}
            result={result}
            map={map}
          />

          <LookupEquation
            target={preset.target}
            value={value}
            complement={complement}
            foundInMap={foundInMap}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="i"
              value={i === null ? "—" : String(i)}
              labelColor="#d97706"
            />
            <StatPill
              label="complement"
              value={complement === null ? "—" : String(complement)}
              labelColor="#7c3aed"
            />
            <StatPill
              label="answer"
              value={result ? `[${result[0]}, ${result[1]}]` : "?"}
              labelColor="#059669"
            />
          </div>

          <MapTable
            map={map}
            lookingUp={lookingUp}
            inserting={inserting}
            foundInMap={foundInMap}
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
