"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = { id: string; label: string; s: string };

const PRESETS: Preset[] = [
  { id: "52233", label: '"52233"', s: "52233" },
  { id: "5494", label: '"5494"', s: "5494" },
  { id: "1111111", label: '"1111111"', s: "1111111" },
];

const ALGORITHM_LINES = [
  "public int longestSemiRepetitiveSubstring(String s) {",
  "",
  "    //1. Initializa a variable to track the length of the longest valid substring found so far.",
  "    int maxLength = 1;",
  "",
  "    //2. Iterate over each starting index:",
  "    for (int i = 0; i < s.length() - 1; i++) {",
  "",
  "        // 3. Initialize a variable to track if the current substring already contains an adjacent equal pair.",
  "        boolean containsAdjacentPair = false;",
  "",
  "        // 4. Expand the current substring one digit at a time:",
  "        for (int j = i + 1; j < s.length(); j++) {",
  "",
  "            char digit = s.charAt(j);",
  "            char previousDigit = s.charAt(j-1);",
  "            // 5. If the current digit equals the digit immediately before it:",
  "            if (digit == previousDigit) {",
  "                /* 6. If an adjacent equal pair is observed before, stop expanding the",
  "                 *    current substring and move to the next starting index.",
  "                 */",
  "                if (containsAdjacentPair) {",
  "                    break;",
  "                } else {",
  "                    // 7. Otherwise, mark adjacent equal pair observed before as true.",
  "                    containsAdjacentPair = true;",
  "                }",
  "            }",
  "            // 8. Update max length if necessary.",
  "            maxLength = Math.max(maxLength, j - i + 1);",
  "",
  "        }",
  "",
  "    }",
  "",
  "    // 9. Return max length.",
  "    return maxLength;",
  "",
  "}",
];

type StepKind =
  | "init"
  | "outer"
  | "reset"
  | "inner"
  | "compare"
  | "markPair"
  | "break"
  | "update"
  | "return";

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  i: number | null;
  j: number | null;
  digit: string | null;
  previousDigit: string | null;
  equal: boolean | null;
  containsAdjacentPair: boolean;
  maxLength: number;
  windowEnd: number | null;
  pairAt: number | null;
  rejected: number | null;
  best: { start: number; length: number };
};

function simulate(input: string): Step[] {
  const steps: Step[] = [];
  let maxLength = 1;
  let best = { start: 0, length: input.length > 0 ? 1 : 0 };

  const push = (step: Omit<Step, "best" | "maxLength"> & { maxLength?: number }) => {
    steps.push({
      ...step,
      maxLength: step.maxLength ?? maxLength,
      best: { ...best },
    });
  };

  push({
    kind: "init",
    lines: [3, 4],
    description: "maxLength starts at 1. A single digit is always valid.",
    i: null,
    j: null,
    digit: null,
    previousDigit: null,
    equal: null,
    containsAdjacentPair: false,
    windowEnd: null,
    pairAt: null,
    rejected: null,
  });

  for (let i = 0; i < input.length - 1; i++) {
    push({
      kind: "outer",
      lines: [6, 7],
      description: `Outer loop: i = ${i}. Substrings start at '${input[i]}'.`,
      i,
      j: null,
      digit: null,
      previousDigit: null,
      equal: null,
      containsAdjacentPair: false,
      windowEnd: i,
      pairAt: null,
      rejected: null,
    });

    let containsAdjacentPair = false;
    let pairAt: number | null = null;

    push({
      kind: "reset",
      lines: [9, 10],
      description: "containsAdjacentPair = false. This start has not used its one allowed pair.",
      i,
      j: null,
      digit: null,
      previousDigit: null,
      equal: null,
      containsAdjacentPair,
      windowEnd: i,
      pairAt,
      rejected: null,
    });

    for (let j = i + 1; j < input.length; j++) {
      push({
        kind: "inner",
        lines: [12, 13],
        description: `Inner loop: j = ${j}. Expand the substring one digit to the right.`,
        i,
        j,
        digit: null,
        previousDigit: null,
        equal: null,
        containsAdjacentPair,
        windowEnd: j - 1,
        pairAt,
        rejected: null,
      });

      const digit = input[j];
      const previousDigit = input[j - 1];
      const equal = digit === previousDigit;

      push({
        kind: "compare",
        lines: [15, 16, 17, 18],
        description: equal
          ? `digit '${digit}' equals previousDigit '${previousDigit}'. This is an adjacent pair.`
          : `digit '${digit}' != previousDigit '${previousDigit}'. No new pair.`,
        i,
        j,
        digit,
        previousDigit,
        equal,
        containsAdjacentPair,
        windowEnd: j - 1,
        pairAt,
        rejected: null,
      });

      if (equal) {
        if (containsAdjacentPair) {
          push({
            kind: "break",
            lines: [19, 20, 21, 22, 23],
            description: `A pair was already used. '${previousDigit}${digit}' is a second pair, so stop this start.`,
            i,
            j,
            digit,
            previousDigit,
            equal: true,
            containsAdjacentPair,
            windowEnd: j - 1,
            pairAt,
            rejected: j,
          });
          break;
        }

        containsAdjacentPair = true;
        pairAt = j;
        push({
          kind: "markPair",
          lines: [25, 26],
          description: `First adjacent pair '${previousDigit}${digit}'. containsAdjacentPair = true.`,
          i,
          j,
          digit,
          previousDigit,
          equal: true,
          containsAdjacentPair,
          windowEnd: j - 1,
          pairAt,
          rejected: null,
        });
      }

      const length = j - i + 1;
      const oldMax = maxLength;
      const nextMax = Math.max(maxLength, length);
      const isNewBest = nextMax > maxLength;
      if (isNewBest) best = { start: i, length };
      maxLength = nextMax;

      push({
        kind: "update",
        lines: [29, 30],
        description: `Window "${input.slice(i, j + 1)}" has length ${length}. maxLength = max(${oldMax}, ${length}) = ${maxLength}${
          isNewBest ? " (new best)." : "."
        }`,
        i,
        j,
        digit,
        previousDigit,
        equal,
        containsAdjacentPair,
        maxLength,
        windowEnd: j,
        pairAt,
        rejected: null,
      });
    }
  }

  push({
    kind: "return",
    lines: [36, 37],
    description: `Every start has been explored. Return maxLength = ${maxLength}.`,
    i: null,
    j: null,
    digit: null,
    previousDigit: null,
    equal: null,
    containsAdjacentPair: false,
    maxLength,
    windowEnd: best.length > 0 ? best.start + best.length - 1 : null,
    pairAt: null,
    rejected: null,
  });

  return steps;
}

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;
    if (top < viewTop + 8 || bottom > viewBottom - 8) {
      scroller.scrollTop = Math.max(0, top - 48);
    }
  }, [activeLines]);

  return (
    <div ref={scrollerRef} className="font-mono text-[12px] leading-[1.7] overflow-auto min-h-0 flex-1">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        return (
          <div
            key={lineNum}
            ref={isActive && lineNum === activeLines[0] ? activeRef : undefined}
            className={`flex transition-colors duration-150 ${isActive ? "bg-amber-100/80" : ""}`}
            style={{ borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}` }}
          >
            <span
              className={`w-7 shrink-0 text-right pr-2 select-none tabular-nums ${
                isActive ? "text-amber-700 font-semibold" : "text-gray-300"
              }`}
            >
              {lineNum}
            </span>
            <span className={`flex-1 whitespace-pre ${isActive ? "text-amber-900 font-semibold" : "text-gray-600"}`}>
              {line || " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const CELL_W = 32;
const CELL_H = 36;
const CELL_GAP = 4;

function StringDisplay({
  s,
  i,
  j,
  windowEnd,
  pairAt,
  rejected,
  best,
  showBest,
}: {
  s: string;
  i: number | null;
  j: number | null;
  windowEnd: number | null;
  pairAt: number | null;
  rejected: number | null;
  best: { start: number; length: number };
  showBest: boolean;
}) {
  const bestEnd = best.length > 0 ? best.start + best.length - 1 : -1;
  const bestSubstring = best.length > 0 ? s.slice(best.start, bestEnd + 1) : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Input string</div>
        {best.length > 0 && (
          <span className="text-[10px] font-mono text-emerald-700">best · &quot;{bestSubstring}&quot;</span>
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
              color: idx === j ? "#7c3aed" : "transparent",
            }}
          >
            j
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((ch, idx) => {
          const inWindow = i !== null && windowEnd !== null && idx >= i && idx <= windowEnd;
          const inBadPair = rejected !== null && (idx === rejected || idx === rejected - 1);
          const inPair =
            pairAt !== null &&
            (idx === pairAt || idx === pairAt - 1) &&
            (inWindow || idx === j) &&
            !inBadPair;
          const isRejected = inBadPair;
          const isI = idx === i;
          const isJ = idx === j;
          const inBest = showBest && best.length > 0 && idx >= best.start && idx <= bestEnd;

          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (isRejected) {
            bg = "#fee2e2";
            border = "#f87171";
            color = "#991b1b";
          } else if (inPair) {
            bg = "#dcfce7";
            border = "#10b981";
            color = "#065f46";
          } else if (isJ) {
            bg = "#ede9fe";
            border = "#8b5cf6";
            color = "#5b21b6";
          } else if (isI) {
            bg = "#fef3c7";
            border = "#f59e0b";
            color = "#92400e";
          } else if (inWindow) {
            bg = "#eff6ff";
            border = "#93c5fd";
            color = "#1e40af";
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
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: 15,
                fontWeight: 700,
                boxShadow: inBest && !isRejected ? "0 0 0 2px #10b981" : undefined,
                transition: "background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s",
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
              color: idx === i ? "#d97706" : "transparent",
            }}
          >
            i
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((_, idx) => (
          <div
            key={idx}
            style={{ width: CELL_W, textAlign: "center", fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}
          >
            {idx}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareCard({
  digit,
  previousDigit,
  equal,
  secondPair,
}: {
  digit: string | null;
  previousDigit: string | null;
  equal: boolean | null;
  secondPair: boolean;
}) {
  const active = equal !== null && digit !== null && previousDigit !== null;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 font-mono text-sm h-[58px]">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span className={active ? "text-violet-700 font-semibold" : "text-gray-300"}>{active ? `'${digit}'` : "'?'"}</span>
        <span className="text-gray-500">==</span>
        <span className={active ? "text-amber-700 font-semibold" : "text-gray-300"}>
          {active ? `'${previousDigit}'` : "'?'"}
        </span>
        <span className={`font-bold ${active ? (equal ? "text-emerald-600" : "text-gray-400") : "text-gray-300"}`}>→</span>
        <span
          className={
            active ? (equal ? "text-emerald-700 font-semibold" : "text-gray-500 font-semibold") : "text-gray-300"
          }
        >
          {active ? String(equal) : "?"}
        </span>
      </div>
      <div
        className={`mt-1 text-center text-[11px] font-semibold h-[16px] ${
          active ? (equal ? (secondPair ? "text-rose-600" : "text-emerald-700") : "text-gray-500") : "text-transparent"
        }`}
      >
        {active
          ? equal
            ? secondPair
              ? "second pair → break"
              : "first pair → keep going"
            : "not a pair → keep going"
          : "placeholder"}
      </div>
    </div>
  );
}

function StatPill({ label, value, labelColor }: { label: string; value: string; labelColor?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
      <span className="font-semibold" style={{ color: labelColor ?? "#9ca3af" }}>
        {label}
      </span>
      <span className="font-semibold text-gray-700">= {value}</span>
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialise",
  outer: "Outer loop",
  reset: "Reset pair flag",
  inner: "Inner loop",
  compare: "Compare neighbors",
  markPair: "Mark pair",
  break: "Break",
  update: "Update max",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-indigo-600",
  outer: "text-amber-600",
  reset: "text-sky-600",
  inner: "text-violet-600",
  compare: "text-sky-600",
  markPair: "text-emerald-600",
  break: "text-rose-500",
  update: "text-emerald-600",
  return: "text-emerald-600",
};

export function LongestSemiRepetitiveNestedVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0], [presetId]);
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
    const wait = cur?.kind === "return" ? 900 : cur?.kind === "break" || cur?.kind === "markPair" ? 800 : 650;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => setPresetId(id), []);

  const description =
    cur?.description ?? "Press Play or Step. Each start grows until a second adjacent pair appears.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const i = cur?.i ?? null;
  const j = cur?.j ?? null;
  const best = cur?.best ?? { start: 0, length: 0 };
  const windowEnd = cur?.windowEnd ?? null;
  const windowText =
    i !== null && windowEnd !== null && windowEnd >= i ? preset.s.slice(i, windowEnd + 1) : "";
  const bestText = best.length > 0 ? preset.s.slice(best.start, best.start + best.length) : "";

  return (
    <div className="not-prose border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-3 flex items-center gap-1.5 flex-wrap min-h-[52px]">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">Sample inputs</span>
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

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[36rem]">
        <div className="flex-1 min-w-0 px-5 pt-5 pb-5 flex flex-col gap-3 overflow-hidden md:h-full">
          <AlgorithmPanel activeLines={lines} />
          <div className="flex flex-col gap-1 pt-3 border-t border-gray-200/70 shrink-0">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${kind ? KIND_COLOR[kind] : "text-gray-400"}`}>
              {kind ? KIND_LABEL[kind] : "Ready"}
            </span>
            <p className="text-xs text-gray-600 leading-relaxed h-[3.75rem] overflow-hidden">{description}</p>
          </div>
        </div>

        <div className="w-full md:w-[400px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-4 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <StringDisplay
            s={preset.s}
            i={kind === "return" ? best.start : i}
            j={kind === "return" ? null : j}
            windowEnd={windowEnd}
            pairAt={cur?.pairAt ?? null}
            rejected={cur?.rejected ?? null}
            best={best}
            showBest={kind === "return" || (cur?.maxLength ?? 0) > 1}
          />

          <CompareCard
            digit={cur?.digit ?? null}
            previousDigit={cur?.previousDigit ?? null}
            equal={cur?.equal ?? null}
            secondPair={
              kind === "break" ||
              (kind === "compare" && Boolean(cur?.equal) && Boolean(cur?.containsAdjacentPair))
            }
          />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill label="i" value={i === null ? "—" : String(i)} labelColor="#d97706" />
            <StatPill label="j" value={j === null ? "—" : String(j)} labelColor="#7c3aed" />
            <StatPill
              label="containsAdjacentPair"
              value={cur ? String(cur.containsAdjacentPair) : "false"}
              labelColor="#0f766e"
            />
            <StatPill label="maxLength" value={String(cur?.maxLength ?? 1)} labelColor="#059669" />
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Current window</div>
            <div className="mt-1 font-mono text-sm text-gray-700 h-[20px]">{windowText ? `"${windowText}"` : ""}</div>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Longest substring</span>
              <span className="font-mono text-sm font-bold text-emerald-700">{cur?.maxLength ?? 1}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-emerald-700/80 h-[16px]">{bestText ? `"${bestText}"` : ""}</div>
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
              style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
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
