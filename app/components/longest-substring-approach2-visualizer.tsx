"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  s: string;
};

const PRESETS: Preset[] = [
  { id: "abcabcbb", label: '"abcabcbb"', s: "abcabcbb" },
  { id: "bbbbb", label: '"bbbbb"', s: "bbbbb" },
  { id: "abba", label: '"abba"', s: "abba" },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public int lengthOfLongestSubstring(String s) {",
  "    int maxLength = 0;",
  "    Map<Character, Integer> lastSeen = new HashMap<>();",
  "    int left = 0;",
  "    for (int right = 0; right < s.length(); right++) {",
  "        char ch = s.charAt(right);",
  "        if (lastSeen.containsKey(ch) && lastSeen.get(ch) >= left) {",
  "            left = lastSeen.get(ch) + 1;",
  "        }",
  "        lastSeen.put(ch, right);",
  "        maxLength = Math.max(maxLength, right - left + 1);",
  "    }",
  "    return maxLength;",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "init"
  | "loopHeader"
  | "checkDup"
  | "shrink"
  | "put"
  | "updateMax"
  | "return";

type CheckResult = "miss" | "stale" | "hit" | null;

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  left: number;
  right: number | null;
  ch: string | null;
  lastSeen: Record<string, number>;
  prevIndex: number | null;
  checkResult: CheckResult;
  windowLen: number;
  maxLength: number;
  best: { start: number; length: number };
};

function simulate(input: string): Step[] {
  const steps: Step[] = [];
  const lastSeen: Record<string, number> = {};
  let left = 0;
  let maxLength = 0;
  let best = { start: 0, length: 0 };

  steps.push({
    kind: "init",
    lines: [2, 3, 4],
    description:
      "Initialise maxLength = 0, lastSeen = {}, left = 0. The window starts empty at the left edge.",
    left: 0,
    right: null,
    ch: null,
    lastSeen: {},
    prevIndex: null,
    checkResult: null,
    windowLen: 0,
    maxLength: 0,
    best,
  });

  for (let right = 0; right < input.length; right++) {
    steps.push({
      kind: "loopHeader",
      lines: [5],
      description: `right = ${right}. Expand the window's right edge onto '${input[right]}'.`,
      left,
      right,
      ch: null,
      lastSeen: { ...lastSeen },
      prevIndex: null,
      checkResult: null,
      windowLen: right - left + 1,
      maxLength,
      best,
    });

    const ch = input[right];
    const prevIndex = lastSeen[ch] !== undefined ? lastSeen[ch] : null;
    const inMap = prevIndex !== null;
    const inWindow = inMap && (prevIndex as number) >= left;
    const checkResult: CheckResult = !inMap ? "miss" : inWindow ? "hit" : "stale";

    steps.push({
      kind: "checkDup",
      lines: [6, 7],
      description: !inMap
        ? `ch = '${ch}'. lastSeen.containsKey('${ch}') → false. First time seeing it.`
        : inWindow
          ? `ch = '${ch}'. lastSeen.get('${ch}') = ${prevIndex} ≥ left = ${left}. Duplicate inside the window.`
          : `ch = '${ch}'. lastSeen.get('${ch}') = ${prevIndex} < left = ${left}. Stale — previous occurrence is outside the window.`,
      left,
      right,
      ch,
      lastSeen: { ...lastSeen },
      prevIndex,
      checkResult,
      windowLen: right - left + 1,
      maxLength,
      best,
    });

    if (inWindow) {
      const oldLeft = left;
      left = (prevIndex as number) + 1;
      steps.push({
        kind: "shrink",
        lines: [8],
        description: `Jump left: ${oldLeft} → ${left} (one past the previous '${ch}' at index ${prevIndex}).`,
        left,
        right,
        ch,
        lastSeen: { ...lastSeen },
        prevIndex,
        checkResult: "hit",
        windowLen: right - left + 1,
        maxLength,
        best,
      });
    }

    lastSeen[ch] = right;
    steps.push({
      kind: "put",
      lines: [10],
      description: `lastSeen.put('${ch}', ${right}). The most recent index of '${ch}' is now ${right}.`,
      left,
      right,
      ch,
      lastSeen: { ...lastSeen },
      prevIndex,
      checkResult,
      windowLen: right - left + 1,
      maxLength,
      best,
    });

    const windowLen = right - left + 1;
    const oldMax = maxLength;
    const isNewBest = windowLen > maxLength;
    if (isNewBest) {
      maxLength = windowLen;
      best = { start: left, length: windowLen };
    }
    steps.push({
      kind: "updateMax",
      lines: [11],
      description: `Window [${left}, ${right}] has length ${windowLen}. maxLength = max(${oldMax}, ${windowLen}) = ${maxLength}${
        isNewBest ? " (new best)." : "."
      }`,
      left,
      right,
      ch,
      lastSeen: { ...lastSeen },
      prevIndex: null,
      checkResult: null,
      windowLen,
      maxLength,
      best,
    });
  }

  steps.push({
    kind: "return",
    lines: [13],
    description: `Every character processed once. Return maxLength = ${maxLength}.`,
    left,
    right: input.length > 0 ? input.length - 1 : null,
    ch: null,
    lastSeen: { ...lastSeen },
    prevIndex: null,
    checkResult: null,
    windowLen: input.length > 0 ? input.length - 1 - left + 1 : 0,
    maxLength,
    best,
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

// ─── Right: dry-run pieces ────────────────────────────────────────────────────

const CELL_W = 32;
const CELL_H = 36;
const CELL_GAP = 4;

function StringDisplay({
  s,
  left,
  right,
  prevIndex,
  checkResult,
  best,
}: {
  s: string;
  left: number;
  right: number | null;
  prevIndex: number | null;
  checkResult: CheckResult;
  best: { start: number; length: number };
}) {
  const bestEnd = best.length > 0 ? best.start + best.length - 1 : -1;
  const bestSubstring = best.length > 0 ? s.slice(best.start, bestEnd + 1) : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          Input string
        </div>
        {best.length > 0 && (
          <span className="text-[10px] font-mono text-emerald-700">
            best · &quot;{bestSubstring}&quot;
          </span>
        )}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              height: 14,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              color: idx === right ? "#7c3aed" : "transparent",
            }}
          >
            R
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((ch, idx) => {
          const isLeft = idx === left && right !== null;
          const isRight = idx === right;
          const inWindow =
            right !== null && idx >= left && idx <= right;
          const isPrev = prevIndex !== null && idx === prevIndex;
          const inBest =
            best.length > 0 && idx >= best.start && idx <= bestEnd;

          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (isPrev && checkResult === "hit") {
            bg = "#fee2e2";
            border = "#f87171";
            color = "#991b1b";
          } else if (isPrev && checkResult === "stale") {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (isRight) {
            if (checkResult === "hit") {
              bg = "#fee2e2";
              border = "#f87171";
              color = "#991b1b";
            } else if (checkResult === "miss" || checkResult === "stale") {
              bg = "#dcfce7";
              border = "#10b981";
              color = "#065f46";
            } else {
              bg = "#ede9fe";
              border = "#8b5cf6";
              color = "#5b21b6";
            }
          } else if (isLeft) {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (inWindow) {
            bg = "#eff6ff";
            border = "#93c5fd";
            color = "#1e40af";
          }

          const boxShadow =
            inBest && !isRight && !isLeft && !(isPrev && checkResult)
              ? "0 0 0 2px #10b981"
              : undefined;

          return (
            <div
              key={idx}
              style={{
                width: CELL_W,
                height: CELL_H,
                background: bg,
                border: `2px solid ${border}`,
                color,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: 700,
                transition:
                  "background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s",
                boxShadow,
              }}
            >
              {ch}
            </div>
          );
        })}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              height: 14,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              color: idx === left ? "#d97706" : "transparent",
            }}
          >
            L
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{
              width: CELL_W,
              textAlign: "center",
              fontSize: 10,
              color: "#9ca3af",
              fontFamily: "monospace",
            }}
          >
            {idx}
          </div>
        ))}
      </div>
    </div>
  );
}

function LastSeenMap({
  lastSeen,
  ch,
  kind,
  checkResult,
}: {
  lastSeen: Record<string, number>;
  ch: string | null;
  kind: StepKind | null;
  checkResult: CheckResult;
}) {
  const entries = Object.entries(lastSeen);
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        lastSeen
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[44px] items-center">
        {entries.length === 0 ? (
          <span className="text-[11px] text-gray-400 italic">empty</span>
        ) : (
          entries.map(([c, idx]) => {
            const isLookup = c === ch && checkResult !== null && kind !== "put";
            const isPut = c === ch && kind === "put";
            let bg = "#f8fafc";
            let border = "#e5e7eb";
            let color = "#374151";
            if (isPut) {
              bg = "#dcfce7";
              border = "#10b981";
              color = "#065f46";
            } else if (isLookup && checkResult === "hit") {
              bg = "#fee2e2";
              border = "#f87171";
              color = "#991b1b";
            } else if (isLookup && checkResult === "stale") {
              bg = "#fef3c7";
              border = "#f59e0b";
              color = "#92400e";
            } else if (isLookup) {
              bg = "#fef3c7";
              border = "#f59e0b";
              color = "#92400e";
            }
            return (
              <div
                key={c}
                className="flex flex-col items-center rounded-md border-2 px-2 py-0.5 font-mono transition-colors"
                style={{
                  background: bg,
                  borderColor: border,
                  color,
                  minWidth: 36,
                }}
              >
                <span className="text-[13px] font-bold leading-tight">{c}</span>
                <span className="text-[10px] tabular-nums leading-tight opacity-80">
                  {idx}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LookupCard({
  ch,
  left,
  prevIndex,
  checkResult,
}: {
  ch: string | null;
  left: number;
  prevIndex: number | null;
  checkResult: CheckResult;
}) {
  const active = checkResult !== null && ch !== null;
  const resultColor =
    checkResult === "hit"
      ? "text-rose-600"
      : checkResult === "stale"
        ? "text-amber-700"
        : checkResult === "miss"
          ? "text-emerald-700"
          : "text-gray-300";
  const resultBold =
    checkResult === "hit"
      ? "text-rose-500"
      : checkResult === "stale"
        ? "text-amber-600"
        : checkResult === "miss"
          ? "text-emerald-600"
          : "text-gray-300";

  const main =
    !active
      ? "lastSeen.containsKey('x') && lastSeen.get('x') ≥ left"
      : checkResult === "miss"
        ? `lastSeen.containsKey('${ch}') → false`
        : `lastSeen.get('${ch}') = ${prevIndex}  ≥  left = ${left}`;

  const footer =
    checkResult === "miss"
      ? "not in map · keep left"
      : checkResult === "stale"
        ? `${prevIndex} ≥ ${left} → false · ignore (outside window)`
        : checkResult === "hit"
          ? `${prevIndex} ≥ ${left} → true · shrink left to ${prevIndex! + 1}`
          : "";

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-[12.5px] h-[58px]">
      <div className="flex items-center justify-center gap-1.5 flex-wrap text-center">
        <span className={active ? "text-gray-700" : "text-gray-300"}>{main}</span>
        {active && checkResult !== "miss" && (
          <>
            <span className={`font-bold ${resultBold}`}>→</span>
            <span className={`font-semibold ${resultColor}`}>
              {checkResult === "hit" ? "true" : "false"}
            </span>
          </>
        )}
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${
          active ? resultColor : "text-transparent"
        }`}
      >
        {footer || "placeholder"}
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
      <span
        className="font-semibold"
        style={{ color: labelColor ?? "#9ca3af" }}
      >
        {label}
      </span>
      <span className="font-semibold text-gray-700">= {value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialise",
  loopHeader: "Expand right",
  checkDup: "Check duplicate",
  shrink: "Shrink left",
  put: "Update lastSeen",
  updateMax: "Update max",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-indigo-600",
  loopHeader: "text-violet-600",
  checkDup: "text-sky-600",
  shrink: "text-rose-500",
  put: "text-emerald-600",
  updateMax: "text-emerald-600",
  return: "text-emerald-600",
};

export function LongestSubstringApproach2Visualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId]
  );

  const steps = useMemo(() => simulate(preset.s), [preset]);

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
        : cur?.kind === "init"
          ? 800
          : cur?.kind === "loopHeader"
            ? 550
            : cur?.kind === "shrink"
              ? 900
              : 720;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step. The right pointer expands; a duplicate inside the window jumps left forward.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const left = cur?.left ?? 0;
  const right = cur?.right ?? null;
  const ch = cur?.ch ?? null;
  const lastSeen = cur?.lastSeen ?? {};
  const prevIndex = cur?.prevIndex ?? null;
  const checkResult = cur?.checkResult ?? null;
  const windowLen = cur?.windowLen ?? 0;
  const maxLength = cur?.maxLength ?? 0;
  const best = cur?.best ?? { start: 0, length: 0 };

  const bestSubstring =
    best.length > 0
      ? preset.s.slice(best.start, best.start + best.length)
      : "";

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
          <StringDisplay
            s={preset.s}
            left={left}
            right={right}
            prevIndex={prevIndex}
            checkResult={checkResult}
            best={best}
          />

          <LastSeenMap
            lastSeen={lastSeen}
            ch={ch}
            kind={kind}
            checkResult={checkResult}
          />

          <LookupCard
            ch={ch}
            left={left}
            prevIndex={prevIndex}
            checkResult={checkResult}
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="left"
              value={String(left)}
              labelColor="#d97706"
            />
            <StatPill
              label="right"
              value={right === null ? "—" : String(right)}
              labelColor="#7c3aed"
            />
            <StatPill
              label="window"
              value={right === null ? "—" : String(windowLen)}
              labelColor="#0f766e"
            />
            <StatPill
              label="maxLength"
              value={String(maxLength)}
              labelColor="#059669"
            />
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                Longest substring
              </span>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {maxLength}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-emerald-700/80 h-[16px]">
              {bestSubstring ? `"${bestSubstring}"` : ""}
            </div>
          </div>
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
