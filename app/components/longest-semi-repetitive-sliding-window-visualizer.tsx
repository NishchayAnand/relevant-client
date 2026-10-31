"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";

type Preset = { id: string; label: string; s: string };

const PRESETS: Preset[] = [
  { id: "52233", label: '"52233"', s: "52233" },
  { id: "5494", label: '"5494"', s: "5494" },
  { id: "1111111", label: '"1111111"', s: "1111111" },
];

const ALGORITHM_LINES = [
  "public int longestSemiRepetitiveSubstring(String s) {",
  "",
  "    // 1. Initialize",
  "    int left = 0;",
  "    int adjacentEqualPairCount = 0;",
  "    int maxLength = 1;",
  "",
  "    // 2. Expand the current window",
  "    for (int right = 0; right < s.length(); right++) {",
  "        // 3. Update the count of adjacent equal pairs.",
  "        if (right > 0 && s.charAt(right) == s.charAt(right - 1)) adjacentEqualPairCount++;",
  "",
  "        // 4. Shrink the current window to make it valid.",
  "        while (adjacentEqualPairCount > 1) {",
  "            if (s.charAt(left) == s.charAt(left + 1)) adjacentEqualPairCount--;",
  "            left++;",
  "        }",
  "",
  "        // 5. Update the length of the longest valid substring if necessary.",
  "        maxLength = Math.max(maxLength, right - left + 1);",
  "",
  "",
  "    }",
  "",
  "    // 6. Return the length of the longest valid substring.",
  "    return maxLength;",
  "",
  "}",
];

const QUESTIONS: Record<number, { q: string; a: string }> = {
  11: {
    q: "What if no equal characters are found?",
    a: "The condition is false, so this line does not increment adjacentEqualPairCount. The new character still stays in the window. A window with no adjacent pair is valid: semi-repetitive means at most one pair, and zero is allowed.",
  },
  15: {
    q: "Will left + 1 always exist?",
    a: "Yes. This line runs only while adjacentEqualPairCount is greater than 1. Two adjacent pairs need at least three characters, so the window [left, right] is long enough that left + 1 still sits inside it, and inside the string.",
  },
};

type StepKind = "init" | "expand" | "pair" | "while" | "shrink" | "moveLeft" | "update" | "return";

type Compare = {
  i: number;
  j: number;
  leftText: string;
  rightText: string;
  leftCh: string;
  rightCh: string;
  equal: boolean;
  note: string;
};

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  left: number;
  right: number | null;
  count: number;
  maxLength: number;
  pairStarts: number[];
  best: { start: number; length: number };
  compare: Compare | null;
  whileEnter: boolean | null;
  prevMax: number | null;
  isNewBest: boolean;
  removedPair: number | null;
  departed: number | null;
};

type PushExtras = {
  compare?: Compare | null;
  whileEnter?: boolean | null;
  prevMax?: number | null;
  isNewBest?: boolean;
  removedPair?: number | null;
  departed?: number | null;
};

function simulate(input: string): Step[] {
  const steps: Step[] = [];
  let left = 0;
  let right: number | null = null;
  let count = 0;
  let maxLength = 1;
  let best = { start: 0, length: 0 };
  let pairStarts: number[] = [];

  const push = (kind: StepKind, lines: number[], description: string, extras: PushExtras = {}) => {
    steps.push({
      kind,
      lines,
      description,
      left,
      right,
      count,
      maxLength,
      pairStarts: [...pairStarts],
      best: { ...best },
      compare: extras.compare ?? null,
      whileEnter: extras.whileEnter ?? null,
      prevMax: extras.prevMax ?? null,
      isNewBest: extras.isNewBest ?? false,
      removedPair: extras.removedPair ?? null,
      departed: extras.departed ?? null,
    });
  };

  push("init", [3, 4, 5, 6], "left = 0, adjacentEqualPairCount = 0, maxLength = 1. A single digit is always valid.");

  for (let r = 0; r < input.length; r++) {
    right = r;
    push("expand", [8, 9], `right = ${r}. '${input[r]}' joins the window.`);

    if (r === 0) {
      push("pair", [10, 11], "right is 0, so there is no previous character. The count stays 0.");
    } else {
      const equal = input[r] === input[r - 1];
      if (equal) {
        count++;
        pairStarts = [...pairStarts, r - 1];
      }
      push(
        "pair",
        [10, 11],
        equal
          ? `'${input[r]}' equals '${input[r - 1]}'. The count increases to ${count}.`
          : `'${input[r]}' does not equal '${input[r - 1]}'. No new pair, so the count stays ${count}.`,
        {
          compare: {
            i: r - 1,
            j: r,
            leftText: `s[${r - 1}]`,
            rightText: `s[${r}]`,
            leftCh: input[r - 1],
            rightCh: input[r],
            equal,
            note: equal ? "count increases" : "count unchanged",
          },
        },
      );
    }

    while (true) {
      if (count > 1) {
        if (left + 1 >= input.length) {
          throw new Error("left + 1 is outside the string");
        }
        push("while", [13, 14], `The count is ${count}, which is greater than 1. Shrink from the left.`, {
          whileEnter: true,
        });

        const edgeEqual = input[left] === input[left + 1];
        let removed: number | null = null;
        if (edgeEqual) {
          count--;
          removed = left;
          pairStarts = pairStarts.filter((i) => i !== left);
        }
        push(
          "shrink",
          [15],
          edgeEqual
            ? `'${input[left]}' equals '${input[left + 1]}'. That edge is a pair, so the count drops to ${count}.`
            : `'${input[left]}' does not equal '${input[left + 1]}'. That edge is not a pair, so the count stays ${count}.`,
          {
            compare: {
              i: left,
              j: left + 1,
              leftText: `s[${left}]`,
              rightText: `s[${left + 1}]`,
              leftCh: input[left],
              rightCh: input[left + 1],
              equal: edgeEqual,
              note: edgeEqual ? "count decreases" : "count unchanged",
            },
            removedPair: removed,
          },
        );

        const oldLeft = left;
        left++;
        push("moveLeft", [16], `left moves from ${oldLeft} to ${left}. '${input[oldLeft]}' leaves the window.`, {
          departed: oldLeft,
        });
      } else {
        push("while", [13, 14], `The count is ${count}, so the window is valid. The shrink loop does not run.`, {
          whileEnter: false,
        });
        break;
      }
    }

    const length = r - left + 1;
    const prevMax = maxLength;
    const slice = input.slice(left, r + 1);
    if (length > best.length) best = { start: left, length };
    maxLength = Math.max(maxLength, length);
    push(
      "update",
      [19, 20],
      maxLength > prevMax
        ? `Window "${slice}" has length ${length}. maxLength = max(${prevMax}, ${length}) = ${maxLength}.`
        : `Window "${slice}" has length ${length}. maxLength stays ${maxLength}.`,
      { prevMax, isNewBest: maxLength > prevMax },
    );
  }

  push("return", [25, 26], `The scan is finished. Return maxLength = ${maxLength}.`);
  return steps;
}

function AlgorithmPanel({
  activeLines,
  openLine,
  onQuestionEnter,
  onQuestionLeave,
  onQuestionClick,
}: {
  activeLines: number[];
  openLine: number | null;
  onQuestionEnter: (line: number) => void;
  onQuestionLeave: () => void;
  onQuestionClick: (line: number) => void;
}) {
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
    <div ref={scrollerRef} className="font-mono text-[12px] leading-[1.7] overflow-auto min-h-0 min-w-0 flex-1">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        const question = QUESTIONS[lineNum];
        const questionOpen = openLine === lineNum;
        return (
          <div
            key={lineNum}
            ref={isActive && lineNum === activeLines[0] ? activeRef : undefined}
            className={`flex min-w-full w-max transition-colors duration-150 ${isActive ? "bg-amber-100/80" : ""}`}
            style={{ borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}` }}
          >
            <div className={`sticky left-0 z-[1] flex shrink-0 items-start ${isActive ? "bg-amber-100" : "bg-white"}`}>
              <span
                className={`w-7 text-right pr-1.5 select-none tabular-nums ${
                  isActive ? "text-amber-700 font-semibold" : "text-gray-300"
                }`}
              >
                {lineNum}
              </span>
              <span className="w-5 h-[1.7em] flex items-center justify-center">
                {question ? (
                  <button
                    type="button"
                    aria-label={question.q}
                    aria-expanded={questionOpen}
                    onMouseEnter={() => onQuestionEnter(lineNum)}
                    onMouseLeave={onQuestionLeave}
                    onFocus={() => onQuestionEnter(lineNum)}
                    onBlur={onQuestionLeave}
                    onClick={() => onQuestionClick(lineNum)}
                    className={`w-4 h-4 rounded-full text-[10px] font-sans font-bold leading-none flex items-center justify-center cursor-help transition-colors ${
                      questionOpen
                        ? "bg-amber-500 text-white"
                        : isActive
                          ? "bg-amber-400 text-white"
                          : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    }`}
                  >
                    ?
                  </button>
                ) : null}
              </span>
            </div>
            <span className={`whitespace-pre pl-1.5 ${isActive ? "text-amber-900 font-semibold" : "text-gray-600"}`}>
              {line || " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const CELL_W = 30;
const CELL_H = 34;
const CELL_GAP = 4;

function StringDisplay({ s, step }: { s: string; step: Step | null }) {
  const left = step?.left ?? null;
  const right = step?.right ?? null;
  const compare = step?.compare ?? null;
  const pairSet = useMemo(() => {
    const set = new Set<number>();
    for (const i of step?.pairStarts ?? []) {
      set.add(i);
      set.add(i + 1);
    }
    return set;
  }, [step]);
  const best = step?.best ?? { start: 0, length: 0 };
  const bestEnd = best.length > 0 ? best.start + best.length - 1 : -1;
  const removedPair = step?.removedPair ?? null;
  const departed = step?.departed ?? null;
  const showPointers = step !== null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Input string</div>
        {step && right !== null ? (
          step.count > 1 ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">
              invalid · {step.count} pairs
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">valid window</span>
          )
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-transparent">valid window</span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <div className="w-max mx-auto">
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
              color: showPointers && idx === right ? "#7c3aed" : "transparent",
            }}
          >
            R
          </div>
        ))}
      </div>

      <div className="flex" style={{ gap: CELL_GAP }}>
        {s.split("").map((ch, idx) => {
          const inWindow = right !== null && left !== null && idx >= left && idx <= right;
          const inPair = pairSet.has(idx);
          const inRemoved =
            removedPair !== null && (idx === removedPair || idx === removedPair + 1) && !inPair;
          const isDeparted = departed === idx;
          const isEntering = step?.kind === "expand" && idx === right;
          const inCompare = compare !== null && (idx === compare.i || idx === compare.j);
          const inBest = best.length > 0 && idx >= best.start && idx <= bestEnd;

          let bg = "#f9fafb";
          let border = "#e5e7eb";
          let color = "#374151";

          if (inRemoved) {
            bg = "#ffe4e6";
            border = "#fb7185";
            color = "#9f1239";
          } else if (inPair) {
            bg = "#dcfce7";
            border = "#10b981";
            color = "#065f46";
          } else if (isDeparted) {
            bg = "#fff1f2";
            border = "#fda4af";
            color = "#9f1239";
          } else if (isEntering) {
            bg = "#f5f3ff";
            border = "#8b5cf6";
            color = "#5b21b6";
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
                boxShadow: inCompare ? "0 0 0 2px #7c3aed" : undefined,
                outline: inBest ? "2px solid #10b981" : "none",
                outlineOffset: 1,
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
              color: showPointers && idx === left ? "#d97706" : "transparent",
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
            style={{ width: CELL_W, textAlign: "center", fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}
          >
            {idx}
          </div>
        ))}
      </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-gray-500 pt-0.5">
        <span className="inline-flex items-center gap-1">
          <span className="font-mono font-bold text-amber-600">L</span> left
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-mono font-bold text-violet-600">R</span> right
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-500" /> pair
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-300" /> window
        </span>
      </div>
    </div>
  );
}

function Readout({ step }: { step: Step | null }) {
  let body: ReactNode = <span className="text-gray-300">—</span>;

  if (step?.compare) {
    const c = step.compare;
    body = (
      <>
        <div className="flex items-center justify-center gap-1.5 flex-wrap font-mono text-sm">
          <span className="text-gray-400">{c.leftText}</span>
          <span className="text-violet-700 font-semibold">&apos;{c.leftCh}&apos;</span>
          <span className="text-gray-500">==</span>
          <span className="text-gray-400">{c.rightText}</span>
          <span className="text-violet-700 font-semibold">&apos;{c.rightCh}&apos;</span>
          <span className={`font-bold ${c.equal ? "text-emerald-600" : "text-gray-400"}`}>→</span>
          <span className={`font-semibold ${c.equal ? "text-emerald-700" : "text-gray-500"}`}>{String(c.equal)}</span>
        </div>
        <div className={`mt-1 text-center text-[11px] font-semibold ${c.equal ? "text-emerald-700" : "text-gray-500"}`}>
          {c.note}
        </div>
      </>
    );
  } else if (step?.kind === "pair") {
    body = (
      <div className="text-center text-[12px] text-gray-500 font-medium">right is 0 — no previous character</div>
    );
  } else if (step?.kind === "while" && step.whileEnter !== null) {
    const enter = step.whileEnter;
    body = (
      <>
        <div className="flex items-center justify-center gap-1.5 font-mono text-sm">
          <span className={enter ? "text-rose-600 font-semibold" : "text-gray-700 font-semibold"}>{step.count}</span>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-700">1</span>
          <span className="text-gray-400">→</span>
          <span className={`font-semibold ${enter ? "text-rose-600" : "text-emerald-700"}`}>{String(enter)}</span>
        </div>
        <div className={`mt-1 text-center text-[11px] font-semibold ${enter ? "text-rose-600" : "text-emerald-700"}`}>
          {enter ? "window is invalid" : "window is valid"}
        </div>
      </>
    );
  } else if (step?.kind === "update" && step.prevMax !== null && step.right !== null) {
    const length = step.right - step.left + 1;
    body = (
      <>
        <div className="flex items-center justify-center gap-1.5 font-mono text-sm text-gray-700">
          <span>max(</span>
          <span>{step.prevMax}</span>
          <span>,</span>
          <span>{length}</span>
          <span>)</span>
          <span className="text-gray-400">=</span>
          <span className="font-semibold text-emerald-700">{step.maxLength}</span>
        </div>
        <div className="mt-1 text-center text-[11px] font-semibold text-gray-500">
          {step.isNewBest ? "new longest window" : "maxLength unchanged"}
        </div>
      </>
    );
  } else if (step?.kind === "expand" && step.right !== null) {
    body = (
      <div className="text-center font-mono text-sm text-violet-700 font-semibold">right = {step.right}</div>
    );
  } else if (step?.kind === "moveLeft") {
    body = <div className="text-center font-mono text-sm text-amber-700 font-semibold">left = {step.left}</div>;
  } else if (step?.kind === "return") {
    body = (
      <div className="text-center font-mono text-sm text-emerald-700 font-semibold">return {step.maxLength}</div>
    );
  } else if (step?.kind === "init") {
    body = <div className="text-center font-mono text-[12px] text-gray-500">left = 0 · count = 0 · maxLength = 1</div>;
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 h-[68px] flex flex-col justify-center">
      {body}
    </div>
  );
}

function StateList({ step }: { step: Step | null }) {
  const count = step?.count ?? null;
  const rows: { label: string; value: string; color: string }[] = [
    { label: "left", value: step ? String(step.left) : "—", color: "#d97706" },
    { label: "right", value: step && step.right !== null ? String(step.right) : "—", color: "#7c3aed" },
    {
      label: "adjacentEqualPairCount",
      value: count === null ? "—" : String(count),
      color: count !== null && count > 1 ? "#e11d48" : "#0f766e",
    },
    { label: "maxLength", value: step ? String(step.maxLength) : "—", color: "#059669" },
  ];

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 font-mono text-[12px]">
          <span className="font-semibold" style={{ color: row.color }}>
            {row.label}
          </span>
          <span className="font-semibold text-gray-800 tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function WindowCard({ s, step }: { s: string; step: Step | null }) {
  const right = step?.right ?? null;
  const left = step?.left ?? 0;
  const text = step && right !== null && right >= left ? s.slice(left, right + 1) : "";
  const length = step && right !== null && right >= left ? right - left + 1 : null;
  const invalid = (step?.count ?? 0) > 1;
  const pairs = step?.pairStarts ?? [];
  const removed = step?.removedPair ?? null;

  return (
    <div className={`rounded-lg border px-3 py-2 ${invalid ? "border-rose-200 bg-rose-50/70" : "border-gray-100 bg-gray-50/70"}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Current window</div>
        {length !== null && (
          <span className="font-mono text-[11px] text-gray-500">
            {right} − {left} + 1 = {length}
          </span>
        )}
      </div>
      <div className="mt-1 font-mono text-sm text-gray-700 h-[20px]">{text ? `"${text}"` : ""}</div>
      <div className="mt-1 flex items-center gap-1.5 h-[18px] text-[11px]">
        <span className="text-gray-400">pairs</span>
        {pairs.length === 0 && removed === null ? (
          <span className="text-gray-400">{text ? "none" : ""}</span>
        ) : (
          <>
            {pairs.map((i) => (
              <span key={i} className="font-mono font-semibold text-emerald-700">
                {s[i]}
                {s[i + 1]}
              </span>
            ))}
            {removed !== null && (
              <span className="font-mono font-semibold text-rose-500 line-through">
                {s[removed]}
                {s[removed + 1]}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize",
  expand: "Expand window",
  pair: "Count pairs",
  while: "Check window",
  shrink: "Drop left edge",
  moveLeft: "Move left",
  update: "Update max",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-indigo-600",
  expand: "text-violet-600",
  pair: "text-sky-600",
  while: "text-amber-600",
  shrink: "text-rose-600",
  moveLeft: "text-amber-600",
  update: "text-emerald-600",
  return: "text-emerald-600",
};

export function LongestSemiRepetitiveSlidingWindowVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [pinnedLine, setPinnedLine] = useState<number | null>(null);

  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0], [presetId]);
  const steps = useMemo(() => simulate(preset.s), [preset]);
  const isDone = step >= steps.length;
  const cur = step > 0 ? steps[step - 1] : null;
  const openLine = hoverLine ?? pinnedLine;
  const openQuestion = openLine !== null ? QUESTIONS[openLine] : null;

  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
    setHoverLine(null);
    setPinnedLine(null);
  }, [presetId]);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    const wait =
      cur?.kind === "return" ? 900 : cur?.kind === "shrink" || cur?.kind === "pair" || cur?.isNewBest ? 780 : cur?.kind === "while" ? 560 : 650;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind, cur?.isNewBest]);

  const loadPreset = useCallback((id: string) => setPresetId(id), []);

  const description =
    cur?.description ?? "Press Play or Step. The highlighted line is the one executing. Hover a ? for a pop question.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const best = cur?.best ?? { start: 0, length: 0 };
  const bestText = best.length > 0 ? preset.s.slice(best.start, best.start + best.length) : "";

  return (
    <div id="sliding-window-dry-run" className="not-prose border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
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

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[38rem]">
        <div className="flex-1 min-w-0 px-5 pt-5 pb-5 flex flex-col gap-3 overflow-hidden md:h-full">
          <AlgorithmPanel
            activeLines={lines}
            openLine={openLine}
            onQuestionEnter={setHoverLine}
            onQuestionLeave={() => setHoverLine(null)}
            onQuestionClick={(line) => setPinnedLine((current) => (current === line ? null : line))}
          />
          <div className="flex flex-col gap-1 pt-3 border-t border-gray-200/70 shrink-0">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${kind ? KIND_COLOR[kind] : "text-gray-400"}`}>
              {kind ? KIND_LABEL[kind] : "Ready"}
            </span>
            <div className="text-xs text-gray-600 leading-relaxed h-[3.75rem] overflow-hidden">{description}</div>
          </div>
        </div>

        <div className="relative w-full md:w-[420px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-3 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <StringDisplay s={preset.s} step={cur} />
          <StateList step={cur} />
          <Readout step={cur} />
          <WindowCard s={preset.s} step={cur} />

          <div
            className={`rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 mt-auto ${
              cur?.kind === "return" || cur?.isNewBest ? "ring-2 ring-emerald-300" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Longest substring</span>
              <span className="font-mono text-sm font-bold text-emerald-700">{cur ? cur.maxLength : "—"}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-emerald-700/80 h-[16px]">
              {bestText
                ? `"${bestText}" · ${best.start}–${best.start + best.length - 1}`
                : ""}
            </div>
          </div>

          {openQuestion && openLine !== null && (
            <div className="absolute left-5 right-5 bottom-4 z-20 rounded-xl border border-amber-300 bg-amber-50 shadow-lg px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Pop question · line {openLine}
                </span>
                {pinnedLine === openLine ? (
                  <button
                    type="button"
                    aria-label="Dismiss question"
                    onClick={() => setPinnedLine(null)}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-700/70">Click ? to pin</span>
                )}
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-amber-950 leading-snug">{openQuestion.q}</div>
              <div className="mt-1.5 text-[12px] leading-relaxed text-amber-950/90">{openQuestion.a}</div>
            </div>
          )}
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
