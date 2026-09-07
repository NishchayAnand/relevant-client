"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  nums: number[];
};

const PRESETS: Preset[] = [
  {
    id: "example",
    label: "[100, 4, 200, 1, 3, 2]",
    nums: [100, 4, 200, 1, 3, 2],
  },
  {
    id: "with-duplicates",
    label: "[1, 2, 0, 1]",
    nums: [1, 2, 0, 1],
  },
  {
    id: "no-run",
    label: "[10, 5, 12, 3]",
    nums: [10, 5, 12, 3],
  },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public int longestConsecutive(int[] nums) {",
  "    Set<Integer> set = new HashSet<>();",
  "    for (int num : nums) {",
  "        set.add(num);",
  "    }",
  "    int maxLength = 0;",
  "    for (int num : set) {",
  "        if (!set.contains(num - 1)) {",
  "            int currLength = 1;",
  "            int current = num;",
  "            while (set.contains(current + 1)) {",
  "                currLength++;",
  "                current++;",
  "            }",
  "            maxLength = Math.max(maxLength, currLength);",
  "        }",
  "    }",
  "    return maxLength;",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "buildStart"
  | "buildAdd"
  | "initMax"
  | "outerLoop"
  | "checkStart"
  | "skipBranch"
  | "startBranch"
  | "whileCheck"
  | "whileExtend"
  | "updateMax"
  | "return";

type Sequence = {
  num: number;
  chain: number[];
  skipped: boolean;
};

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  setBuilt: boolean;
  setSoFar: number[];
  buildIdx: number | null;
  currentNum: number | null;
  lookupValue: number | null;
  lookupResult: boolean | null;
  currentChain: number[];
  currLength: number;
  maxLength: number;
  sequences: Sequence[];
};

function simulate(input: number[]): { setValues: number[]; steps: Step[] } {
  const setValues = [...new Set(input)];
  const setLookup = new Set(setValues);
  const steps: Step[] = [];

  // Phase 1 — build the set.
  steps.push({
    kind: "buildStart",
    lines: [2],
    description: "Create an empty HashSet.",
    setBuilt: false,
    setSoFar: [],
    buildIdx: null,
    currentNum: null,
    lookupValue: null,
    lookupResult: null,
    currentChain: [],
    currLength: 0,
    maxLength: 0,
    sequences: [],
  });

  const running: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const val = input[i];
    const alreadyIn = running.includes(val);
    if (!alreadyIn) running.push(val);
    steps.push({
      kind: "buildAdd",
      lines: [3, 4],
      description: alreadyIn
        ? `nums[${i}] = ${val} — already in the set. HashSet silently ignores duplicates.`
        : `nums[${i}] = ${val}. set.add(${val}) → { ${running.join(", ")} }.`,
      setBuilt: false,
      setSoFar: [...running],
      buildIdx: i,
      currentNum: null,
      lookupValue: null,
      lookupResult: null,
      currentChain: [],
      currLength: 0,
      maxLength: 0,
      sequences: [],
    });
  }

  let maxLength = 0;
  let sequences: Sequence[] = [];

  // Phase 2 — init max.
  steps.push({
    kind: "initMax",
    lines: [6],
    description: "Set is fully populated. Initialise maxLength = 0.",
    setBuilt: true,
    setSoFar: [...setValues],
    buildIdx: null,
    currentNum: null,
    lookupValue: null,
    lookupResult: null,
    currentChain: [],
    currLength: 0,
    maxLength,
    sequences: [...sequences],
  });

  // Phase 3 — iterate the set; each num either starts a run or is skipped.
  for (const num of setValues) {
    steps.push({
      kind: "outerLoop",
      lines: [7],
      description: `Outer loop: num = ${num}.`,
      setBuilt: true,
      setSoFar: [...setValues],
      buildIdx: null,
      currentNum: num,
      lookupValue: null,
      lookupResult: null,
      currentChain: [],
      currLength: 0,
      maxLength,
      sequences: [...sequences],
    });

    const predecessor = num - 1;
    const hasPredecessor = setLookup.has(predecessor);
    steps.push({
      kind: "checkStart",
      lines: [8],
      description: `set.contains(${predecessor}) → ${hasPredecessor}. ${
        hasPredecessor
          ? `${num} is NOT the start of a run.`
          : `${num} IS a run start — enter the if-branch.`
      }`,
      setBuilt: true,
      setSoFar: [...setValues],
      buildIdx: null,
      currentNum: num,
      lookupValue: predecessor,
      lookupResult: hasPredecessor,
      currentChain: [],
      currLength: 0,
      maxLength,
      sequences: [...sequences],
    });

    if (hasPredecessor) {
      sequences = [...sequences, { num, chain: [], skipped: true }];
      steps.push({
        kind: "skipBranch",
        lines: [16],
        description: `Skip ${num}. Its run will be walked out from a smaller start value.`,
        setBuilt: true,
        setSoFar: [...setValues],
        buildIdx: null,
        currentNum: num,
        lookupValue: predecessor,
        lookupResult: true,
        currentChain: [],
        currLength: 0,
        maxLength,
        sequences: [...sequences],
      });
      continue;
    }

    let currLength = 1;
    let current = num;
    let chain: number[] = [num];
    steps.push({
      kind: "startBranch",
      lines: [9, 10],
      description: `Start a fresh run at ${num}. currLength = 1, current = ${num}.`,
      setBuilt: true,
      setSoFar: [...setValues],
      buildIdx: null,
      currentNum: num,
      lookupValue: null,
      lookupResult: null,
      currentChain: [...chain],
      currLength,
      maxLength,
      sequences: [...sequences],
    });

    while (true) {
      const next = current + 1;
      const hasNext = setLookup.has(next);
      steps.push({
        kind: "whileCheck",
        lines: [11],
        description: `set.contains(${next}) → ${hasNext}.${
          hasNext ? " Extend the run." : " Exit the while-loop."
        }`,
        setBuilt: true,
        setSoFar: [...setValues],
        buildIdx: null,
        currentNum: num,
        lookupValue: next,
        lookupResult: hasNext,
        currentChain: [...chain],
        currLength,
        maxLength,
        sequences: [...sequences],
      });
      if (!hasNext) break;
      currLength += 1;
      current = next;
      chain = [...chain, next];
      steps.push({
        kind: "whileExtend",
        lines: [12, 13],
        description: `currLength → ${currLength}. current → ${current}.`,
        setBuilt: true,
        setSoFar: [...setValues],
        buildIdx: null,
        currentNum: num,
        lookupValue: null,
        lookupResult: null,
        currentChain: [...chain],
        currLength,
        maxLength,
        sequences: [...sequences],
      });
    }

    const oldMax = maxLength;
    const newMax = Math.max(maxLength, currLength);
    const isNewBest = newMax > maxLength;
    maxLength = newMax;
    sequences = [...sequences, { num, chain: [...chain], skipped: false }];
    steps.push({
      kind: "updateMax",
      lines: [15],
      description: `Chain complete → [${chain.join(", ")}]. maxLength = max(${oldMax}, ${currLength}) = ${maxLength}${
        isNewBest ? " (new best)." : "."
      }`,
      setBuilt: true,
      setSoFar: [...setValues],
      buildIdx: null,
      currentNum: num,
      lookupValue: null,
      lookupResult: null,
      currentChain: [],
      currLength,
      maxLength,
      sequences: [...sequences],
    });
  }

  steps.push({
    kind: "return",
    lines: [18],
    description: `All numbers processed. Return maxLength = ${maxLength}.`,
    setBuilt: true,
    setSoFar: [...setValues],
    buildIdx: null,
    currentNum: null,
    lookupValue: null,
    lookupResult: null,
    currentChain: [],
    currLength: 0,
    maxLength,
    sequences: [...sequences],
  });

  return { setValues, steps };
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

// ─── Right: dry-run pieces ────────────────────────────────────────────────────

function InputStrip({
  nums,
  activeIdx,
}: {
  nums: number[];
  activeIdx: number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        Input array
      </div>
      <div className="flex gap-1 flex-wrap">
        {nums.map((val, idx) => {
          const isActive = activeIdx === idx;
          return (
            <div
              key={idx}
              style={{
                minWidth: 26,
                height: 22,
                padding: "0 5px",
                background: isActive ? "#dbeafe" : "#f8fafc",
                border: `1.5px solid ${isActive ? "#3b82f6" : "#e5e7eb"}`,
                color: isActive ? "#1e40af" : "#94a3b8",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                transition:
                  "background 0.2s, border-color 0.2s, color 0.2s",
              }}
            >
              {val}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetDisplay({
  setValues,
  setSoFar,
  currentNum,
  lookupValue,
  currentChain,
  sequences,
}: {
  setValues: number[];
  setSoFar: number[];
  currentNum: number | null;
  lookupValue: number | null;
  currentChain: number[];
  sequences: Sequence[];
}) {
  const soFarSet = useMemo(() => new Set(setSoFar), [setSoFar]);
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        HashSet
      </div>
      <div className="flex flex-wrap gap-1.5">
        {setValues.map((v) => {
          const isAdded = soFarSet.has(v);
          const isCurrent = v === currentNum;
          const isLookup = v === lookupValue && isAdded;
          const inChain = currentChain.includes(v);
          const seq = sequences.find((s) => s.num === v);
          const wasSkipped = seq?.skipped;
          const wasStart = seq && !seq.skipped;

          let bg = "#ffffff";
          let border = "#e5e7eb";
          let color = "#6b7280";
          let borderStyle = "solid";

          if (!isAdded) {
            border = "#e5e7eb";
            borderStyle = "dashed";
            color = "transparent";
            bg = "#f9fafb";
          } else if (inChain) {
            bg = "#dcfce7";
            border = "#10b981";
            color = "#065f46";
          } else if (isLookup) {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (isCurrent) {
            bg = "#eff6ff";
            border = "#3b82f6";
            color = "#1e40af";
          } else if (wasSkipped) {
            bg = "#f9fafb";
            color = "#9ca3af";
          } else if (wasStart) {
            bg = "#f0fdf4";
            border = "#bbf7d0";
            color = "#166534";
          }

          return (
            <div
              key={v}
              style={{
                width: 40,
                height: 40,
                background: bg,
                border: `2px ${borderStyle} ${border}`,
                color,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 14,
                fontWeight: 700,
                transition:
                  "background 0.2s, border-color 0.2s, color 0.2s",
              }}
            >
              {isAdded ? v : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LookupCard({
  lookupValue,
  lookupResult,
}: {
  lookupValue: number | null;
  lookupResult: boolean | null;
}) {
  const active = lookupValue !== null && lookupResult !== null;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-sm h-[58px]">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className="text-gray-500">set.contains(</span>
        <span
          className={
            active ? "text-amber-700 font-semibold" : "text-gray-300"
          }
        >
          {active ? lookupValue : "x"}
        </span>
        <span className="text-gray-500">)</span>
        <span
          className={`font-bold ${
            active
              ? lookupResult
                ? "text-emerald-600"
                : "text-rose-500"
              : "text-gray-300"
          }`}
        >
          →
        </span>
        <span
          className={
            active
              ? lookupResult
                ? "text-emerald-700 font-semibold"
                : "text-rose-600 font-semibold"
              : "text-gray-300"
          }
        >
          {active ? String(lookupResult) : "?"}
        </span>
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${
          active
            ? lookupResult
              ? "text-emerald-700"
              : "text-rose-600"
            : "text-transparent"
        }`}
      >
        {active
          ? lookupResult
            ? "already in set · O(1)"
            : "not in set · O(1)"
          : "placeholder"}
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

function Sequences({
  sequences,
  currentChain,
  currentNum,
  maxLength,
  isBuilding,
}: {
  sequences: Sequence[];
  currentChain: number[];
  currentNum: number | null;
  maxLength: number;
  isBuilding: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold shrink-0">
        Sequences
      </div>
      <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pr-1">
        {sequences.length === 0 && !isBuilding ? (
          <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
            None yet
          </div>
        ) : (
          <>
            {sequences.map((s, idx) => {
              const isBest =
                !s.skipped && s.chain.length === maxLength && maxLength > 0;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[11px] ${
                    s.skipped
                      ? "bg-gray-50 border-gray-100 text-gray-400"
                      : isBest
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-white border-gray-100 text-gray-600"
                  }`}
                >
                  <span className="tabular-nums shrink-0">num={s.num}</span>
                  <span className="flex-1 min-w-0 truncate">
                    {s.skipped
                      ? `skipped · ${s.num - 1} exists`
                      : `[${s.chain.join(" → ")}]`}
                  </span>
                  {!s.skipped && (
                    <span className="font-semibold shrink-0">
                      len {s.chain.length}
                      {isBest ? " ★" : ""}
                    </span>
                  )}
                </div>
              );
            })}
            {isBuilding && (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-emerald-200 bg-emerald-50/60 px-2 py-1 font-mono text-[11px] text-emerald-700">
                <span className="tabular-nums shrink-0">num={currentNum}</span>
                <span className="flex-1 min-w-0 truncate">
                  [{currentChain.join(" → ")}]
                </span>
                <span className="font-semibold shrink-0 opacity-70">
                  building…
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<StepKind, string> = {
  buildStart: "Build set",
  buildAdd: "Build set",
  initMax: "Initialise",
  outerLoop: "Outer loop",
  checkStart: "Check start",
  skipBranch: "Skip",
  startBranch: "Run start",
  whileCheck: "While check",
  whileExtend: "Extend run",
  updateMax: "Update max",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  buildStart: "text-sky-600",
  buildAdd: "text-sky-600",
  initMax: "text-indigo-600",
  outerLoop: "text-amber-600",
  checkStart: "text-sky-600",
  skipBranch: "text-gray-500",
  startBranch: "text-emerald-600",
  whileCheck: "text-sky-600",
  whileExtend: "text-emerald-600",
  updateMax: "text-emerald-600",
  return: "text-emerald-600",
};

export default function LongestConsecutiveOptimizedVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId]
  );

  const { setValues, steps } = useMemo(() => simulate(preset.nums), [preset]);

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
      cur?.kind === "return"
        ? 900
        : cur?.kind === "buildStart" || cur?.kind === "initMax"
          ? 800
          : cur?.kind === "buildAdd"
            ? 480
            : cur?.kind === "outerLoop" || cur?.kind === "whileCheck"
              ? 600
              : 750;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to build the set and hunt for consecutive runs.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const setSoFar = cur?.setSoFar ?? [];
  const buildIdx = cur?.buildIdx ?? null;
  const currentNum = cur?.currentNum ?? null;
  const lookupValue = cur?.lookupValue ?? null;
  const lookupResult = cur?.lookupResult ?? null;
  const currentChain = cur?.currentChain ?? [];
  const currLength = cur?.currLength ?? 0;
  const maxLength = cur?.maxLength ?? 0;
  const sequences = cur?.sequences ?? [];
  const isBuilding = currentChain.length > 0;

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

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[34rem]">
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

        <div className="w-full md:w-[380px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-3 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <InputStrip nums={preset.nums} activeIdx={buildIdx} />

          <SetDisplay
            setValues={setValues}
            setSoFar={setSoFar}
            currentNum={currentNum}
            lookupValue={lookupValue}
            currentChain={currentChain}
            sequences={sequences}
          />

          <LookupCard
            lookupValue={lookupValue}
            lookupResult={lookupResult}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="num"
              value={currentNum === null ? "—" : String(currentNum)}
              labelColor="#3b82f6"
            />
            <StatPill
              label="currLength"
              value={String(currLength)}
              labelColor="#0f766e"
            />
            <StatPill
              label="maxLength"
              value={String(maxLength)}
              labelColor="#059669"
            />
          </div>

          <Sequences
            sequences={sequences}
            currentChain={currentChain}
            currentNum={currentNum}
            maxLength={maxLength}
            isBuilding={isBuilding}
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
