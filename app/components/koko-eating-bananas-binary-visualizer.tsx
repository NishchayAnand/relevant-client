"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Preset = {
  id: string;
  label: string;
  piles: number[];
  h: number;
};

const PRESETS: Preset[] = [
  { id: "example1", label: "piles = [3, 6, 7, 11], h = 8", piles: [3, 6, 7, 11], h: 8 },
  { id: "example2", label: "piles = [30, 11, 23, 4, 20], h = 5", piles: [30, 11, 23, 4, 20], h: 5 },
  { id: "example3", label: "piles = [30, 11, 23, 4, 20], h = 6", piles: [30, 11, 23, 4, 20], h: 6 },
];

const ALGORITHM_LINES = [
  "public int minEatingSpeed(int[] piles, int h) {",
  "",
  "    /* 1. Initialize:",
  "     *      a. Two pointers to define the boundaries of the search space.",
  "     *      b. A variable to track the minimum eating speed found so far.",
  "     */",
  "    int left = 1, right = Arrays.stream(piles).max().getAsInt();",
  "    int minimumSpeed = 0;",
  "",
  "    //2. Repeat while the search space is not empty.",
  "    while (left <= right) {",
  "",
  "        // 3. Calulate the middle element.",
  "        int middle = (left + right) / 2;",
  "",
  "        // 4. Track the total hours required at the current speed.",
  "        double totalHours = 0;",
  "        ",
  "        // 5. Iterate over each pile.",
  "        for (int pile : piles) {",
  "            // Add [pile / middle] to the total required hours.",
  "            totalHours += Math.ceil((double) pile / middle);",
  "        }",
  "",
  "        // 6. If the speed is too slow, eliminate it and smaller speeds.",
  "        if (totalHours > h) {",
  "            left = middle + 1; ",
  "",
  "        // 7. Otherwise, update the minimum speed and search for a smaller one.",
  "        } else { ",
  "            minimumSpeed = middle;",
  "            right = middle - 1;",
  "        }",
  "        ",
  "    }",
  "       ",
  "",
  "    // 8. Return the minimum valid eating speed.",
  "    return minimumSpeed;",
  "",
  "}",
];

type StepKind =
  | "init"
  | "loop"
  | "middle"
  | "reset"
  | "pile"
  | "check"
  | "move-left"
  | "accept"
  | "move-right"
  | "return"
  | "miss";

type Round = "idle" | "counting" | "over" | "ok";

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  ok: boolean | null;
  left: number;
  right: number;
  middle: number | null;
  totalHours: number | null;
  hours: (number | null)[];
  pileIndex: number | null;
  round: Round;
  minimumSpeed: number;
  minimumChanged: boolean;
  result: number | null;
};

function simulate(piles: number[], h: number): Step[] {
  const steps: Step[] = [];
  const max = Math.max(...piles);
  let left = 1;
  let right = max;
  let minimumSpeed = 0;
  const blank = () => piles.map(() => null as number | null);

  const push = (
    partial: Omit<Step, "left" | "right" | "minimumSpeed"> & { minimumSpeed?: number },
  ) => {
    steps.push({
      left,
      right,
      minimumSpeed: partial.minimumSpeed ?? minimumSpeed,
      ...partial,
    });
  };

  push({
    kind: "init",
    lines: [3, 4, 5, 6, 7, 8],
    description: `left = 1. right = max(piles) = ${max}. minimumSpeed = 0.`,
    ok: null,
    middle: null,
    totalHours: null,
    hours: blank(),
    pileIndex: null,
    round: "idle",
    minimumChanged: false,
    result: null,
  });

  while (true) {
    const open = left <= right;
    push({
      kind: "loop",
      lines: [10, 11],
      description: open
        ? `left (${left}) <= right (${right}), so the search space still has candidate speeds.`
        : `left (${left}) > right (${right}), so the search space is empty.`,
      ok: open ? null : false,
      middle: null,
      totalHours: null,
      hours: blank(),
      pileIndex: null,
      round: "idle",
      minimumChanged: false,
      result: null,
    });
    if (!open) break;

    const middle = Math.floor((left + right) / 2);
    push({
      kind: "middle",
      lines: [13, 14],
      description: `middle = (${left} + ${right}) / 2 = ${middle}. Try eating speed ${middle}.`,
      ok: null,
      middle,
      totalHours: null,
      hours: blank(),
      pileIndex: null,
      round: "idle",
      minimumChanged: false,
      result: null,
    });

    let totalHours = 0;
    const hours = blank();
    push({
      kind: "reset",
      lines: [16, 17],
      description: `totalHours = 0 for middle = ${middle}.`,
      ok: null,
      middle,
      totalHours: 0,
      hours: [...hours],
      pileIndex: null,
      round: "counting",
      minimumChanged: false,
      result: null,
    });

    piles.forEach((pile, index) => {
      const add = Math.ceil(pile / middle);
      const prev = totalHours;
      totalHours += add;
      hours[index] = add;
      push({
        kind: "pile",
        lines: [19, 20, 21, 22],
        description: `pile = ${pile}. ceil(${pile} / ${middle}) = ${add}. totalHours = ${prev} + ${add} = ${totalHours}.`,
        ok: null,
        middle,
        totalHours,
        hours: [...hours],
        pileIndex: index,
        round: "counting",
        minimumChanged: false,
        result: null,
      });
    });

    const slow = totalHours > h;
    push({
      kind: "check",
      lines: [25, 26],
      description: slow
        ? `totalHours (${totalHours}) > h (${h}), so middle = ${middle} is too slow.`
        : `totalHours (${totalHours}) <= h (${h}), so middle = ${middle} is a valid candidate.`,
      ok: !slow,
      middle,
      totalHours,
      hours: [...hours],
      pileIndex: null,
      round: slow ? "over" : "ok",
      minimumChanged: false,
      result: null,
    });

    if (slow) {
      const prev = left;
      left = middle + 1;
      push({
        kind: "move-left",
        lines: [27],
        description: `left = middle + 1 = ${left}. Eliminate speeds [${prev}, ${middle}].`,
        ok: null,
        middle,
        totalHours,
        hours: [...hours],
        pileIndex: null,
        round: "over",
        minimumChanged: false,
        result: null,
      });
    } else {
      const prevMin = minimumSpeed;
      minimumSpeed = middle;
      push({
        kind: "accept",
        lines: [29, 30, 31],
        description: `minimumSpeed = middle = ${middle}${
          prevMin === 0 ? "" : ` (was ${prevMin})`
        }.`,
        ok: true,
        middle,
        totalHours,
        hours: [...hours],
        pileIndex: null,
        round: "ok",
        minimumChanged: true,
        result: null,
      });
      const prevRight = right;
      right = middle - 1;
      push({
        kind: "move-right",
        lines: [32],
        description: `right = middle - 1 = ${right}. Eliminate speeds [${middle}, ${prevRight}] and look for a smaller valid speed.`,
        ok: null,
        middle,
        totalHours,
        hours: [...hours],
        pileIndex: null,
        round: "ok",
        minimumChanged: false,
        result: null,
      });
    }
  }

  push({
    kind: "return",
    lines: [38, 39],
    description: `return minimumSpeed = ${minimumSpeed}.`,
    ok: true,
    middle: null,
    totalHours: null,
    hours: blank(),
    pileIndex: null,
    round: "ok",
    minimumChanged: false,
    result: minimumSpeed,
  });

  return steps;
}

function AlgorithmPanel({ activeLines }: { activeLines: number[] }) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const first = activeLines[0];
    if (first == null) return;
    const el = lineRefs.current[first - 1];
    const container = el?.parentElement;
    if (!el || !container) return;
    const top = el.offsetTop - container.clientHeight / 3;
    container.scrollTop = Math.max(0, top);
  }, [activeLines]);

  return (
    <div className="font-mono text-[10.5px] leading-[1.5] overflow-auto flex-1 min-h-0">
      {ALGORITHM_LINES.map((line, idx) => {
        const lineNum = idx + 1;
        const isActive = activeLines.includes(lineNum);
        const isComment = /^\s*(\/\/|\/\*|\*)/.test(line);
        return (
          <div
            key={lineNum}
            ref={(el) => {
              lineRefs.current[idx] = el;
            }}
            className={`flex transition-colors duration-150 ${isActive ? "bg-amber-100/80" : ""}`}
            style={{
              borderLeft: `3px solid ${isActive ? "#f59e0b" : "transparent"}`,
            }}
          >
            <span
              className={`w-7 text-right pr-2 select-none tabular-nums shrink-0 ${
                isActive ? "text-amber-700 font-semibold" : "text-gray-300"
              }`}
            >
              {lineNum}
            </span>
            <span
              className={`whitespace-pre shrink-0 pr-3 ${
                isActive
                  ? "text-amber-900 font-semibold"
                  : isComment
                    ? "text-gray-400 italic"
                    : "text-gray-600"
              }`}
            >
              {line.length === 0 ? " " : line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PileRow({
  piles,
  hours,
  pileIndex,
  round,
}: {
  piles: number[];
  hours: (number | null)[];
  pileIndex: number | null;
  round: Round;
}) {
  const cellW = piles.length >= 5 ? 48 : 56;
  const gap = 8;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">piles</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-start gap-0.5 w-max">
          <div className="flex" style={{ gap }}>
            {piles.map((pile, idx) => {
              const counted = hours[idx] != null;
              const current = idx === pileIndex;
              let bg = "#f9fafb";
              let border = "#e5e7eb";
              let color = "#9ca3af";
              if (round === "ok" && counted) {
                bg = "#dcfce7";
                border = "#10b981";
                color = "#065f46";
              } else if (round === "over" && counted) {
                bg = "#ffe4e6";
                border = "#fb7185";
                color = "#9f1239";
              } else if (current) {
                bg = "#fffbeb";
                border = "#f59e0b";
                color = "#92400e";
              } else if (counted) {
                bg = "#eff6ff";
                border = "#93c5fd";
                color = "#1e40af";
              }
              return (
                <div
                  key={idx}
                  style={{
                    width: cellW,
                    height: 48,
                    background: bg,
                    border: `2px solid ${border}`,
                    color,
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    flexShrink: 0,
                    lineHeight: 1.1,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{pile}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>
                    {hours[idx] == null ? "—" : `${hours[idx]}h`}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex" style={{ gap }}>
            {piles.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: cellW,
                  textAlign: "center",
                  fontSize: 10,
                  color: idx === pileIndex ? "#d97706" : "#9ca3af",
                  fontFamily: "monospace",
                  fontWeight: idx === pileIndex ? 700 : 400,
                }}
              >
                {idx}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HoursMeter({ totalHours, h }: { totalHours: number | null; h: number }) {
  const value = totalHours ?? 0;
  const over = totalHours != null && totalHours > h;
  const scale = Math.max(h, value, 1);
  const fill = (value / scale) * 100;
  const limit = (h / scale) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        <span>
          totalHours{" "}
          <span className="font-mono normal-case tracking-normal text-gray-700">
            {totalHours ?? "—"}
          </span>
        </span>
        <span>
          h <span className="font-mono normal-case tracking-normal text-gray-700">{h}</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gray-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
            totalHours == null ? "bg-gray-200" : over ? "bg-rose-400" : "bg-emerald-400"
          }`}
          style={{ width: `${fill}%` }}
        />
        <div
          className="absolute top-[-3px] h-[16px] w-[2px] bg-gray-800 rounded-full"
          style={{ left: `calc(${limit}% - 1px)` }}
          title={`h = ${h}`}
        />
      </div>
      <div className="text-[10px] text-gray-400">The mark is the hour limit h.</div>
    </div>
  );
}

function SearchSpace({
  max,
  left,
  right,
  middle,
  minimumSpeed,
}: {
  max: number;
  left: number;
  right: number;
  middle: number | null;
  minimumSpeed: number;
}) {
  const span = Math.max(max, 1);
  const toPct = (k: number) => ((k - 1) / (span - 1 || 1)) * 100;
  const open = left <= right;
  const lo = open ? toPct(left) : 0;
  const hi = open ? toPct(right) : 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          search space over k
        </span>
        <span className="text-[10px] font-mono text-gray-400">
          [{left}, {right}]
        </span>
      </div>
      <div className="relative h-6 rounded-lg bg-rose-50 border border-rose-100">
        {open && (
          <div
            className="absolute inset-y-0 rounded-md bg-blue-100 border border-blue-300"
            style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 0.5)}%` }}
          />
        )}
        {middle != null && (
          <div
            className="absolute top-[-4px] h-[32px] w-[2px] bg-amber-500 rounded-full"
            style={{ left: `calc(${toPct(middle)}% - 1px)` }}
            title={`middle = ${middle}`}
          />
        )}
        {open && (
          <>
            <div
              className="absolute top-[-4px] h-[32px] w-[2px] bg-sky-600 rounded-full"
              style={{ left: `calc(${lo}% - 1px)` }}
              title={`left = ${left}`}
            />
            <div
              className="absolute top-[-4px] h-[32px] w-[2px] bg-violet-600 rounded-full"
              style={{ left: `calc(${hi}% - 1px)` }}
              title={`right = ${right}`}
            />
          </>
        )}
        {minimumSpeed > 0 && (
          <div
            className="absolute top-[-6px] h-[36px] w-[2px] bg-emerald-500 rounded-full"
            style={{ left: `calc(${toPct(minimumSpeed)}% - 1px)` }}
            title={`minimumSpeed = ${minimumSpeed}`}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
        <span>1</span>
        <span>max(piles) = {max}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block w-2 h-2 rounded-sm bg-blue-100 border border-blue-300" />
          candidate speeds
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block w-2 h-2 rounded-sm bg-rose-50 border border-rose-200" />
          eliminated
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block w-2 h-[8px] bg-emerald-500" />
          minimumSpeed
        </span>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize",
  loop: "Check search space",
  middle: "Pick middle",
  reset: "Reset totalHours",
  pile: "Add pile hours",
  check: "Compare with h",
  "move-left": "Discard middle and smaller",
  accept: "Save candidate",
  "move-right": "Look for smaller speed",
  return: "Return minimumSpeed",
  miss: "Return minimumSpeed",
};

function kindColor(step: Step | null) {
  if (!step) return "text-gray-400";
  if (step.kind === "return" || step.kind === "accept") return "text-emerald-600";
  if (step.ok === false || step.kind === "move-left") return "text-rose-500";
  if (step.kind === "move-right") return "text-violet-600";
  if (step.kind === "init" || step.kind === "reset") return "text-sky-600";
  return "text-amber-600";
}

export default function KokoEatingBananasBinaryVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0],
    [presetId],
  );
  const steps = useMemo(() => simulate(preset.piles, preset.h), [preset]);
  const isDone = step >= steps.length;
  const cur = step > 0 ? steps[step - 1] : null;
  const max = Math.max(...preset.piles);

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
        : cur?.kind === "pile"
          ? 260
          : cur?.kind === "check" || cur?.kind === "accept"
            ? 640
            : 440;
    const timer = setTimeout(() => setStep((value) => value + 1), wait);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step. Highlighted lines, including the comments, are the ones executing.";
  const formula =
    cur?.pileIndex != null
      ? `ceil(${preset.piles[cur.pileIndex]} / ${cur.middle}) = ${cur.hours[cur.pileIndex]}`
      : cur?.middle != null
        ? `middle = ${cur.middle}`
        : "ceil(pile / middle)";

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      <div className="border-b border-gray-100 bg-gray-50/40 px-5 py-3 flex items-center gap-1.5 flex-wrap min-h-[52px]">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
          Sample inputs
        </span>
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => loadPreset(item.id)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
              presetId === item.id
                ? "border-gray-400 bg-white text-gray-800"
                : "border-gray-200 text-gray-500 hover:bg-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:divide-x divide-gray-100 md:h-[36rem]">
        <div className="h-72 md:h-auto md:flex-1 md:min-h-0 min-w-0 px-4 pt-4 pb-4 flex flex-col overflow-hidden border-b md:border-b-0 border-gray-100">
          <AlgorithmPanel activeLines={cur?.lines ?? []} />
        </div>

        <div className="w-full md:w-[380px] md:min-h-0 shrink-0 px-5 pt-4 pb-4 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Current middle
              </div>
              <div className="font-mono text-lg font-bold text-gray-800 leading-tight">
                middle = {cur?.middle ?? "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                Hour limit
              </div>
              <div className="font-mono text-lg font-bold text-gray-800 leading-tight">h = {preset.h}</div>
            </div>
          </div>

          <SearchSpace
            max={max}
            left={cur ? cur.left : 1}
            right={cur ? cur.right : max}
            middle={cur?.middle ?? null}
            minimumSpeed={cur ? cur.minimumSpeed : 0}
          />

          <PileRow
            piles={preset.piles}
            hours={cur?.hours ?? preset.piles.map(() => null)}
            pileIndex={cur?.pileIndex ?? null}
            round={cur?.round ?? "idle"}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm font-bold text-gray-800 truncate">
            {formula}
          </div>

          <HoursMeter totalHours={cur?.totalHours ?? null} h={preset.h} />

          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-sky-600">left</span>
              <span className="font-semibold text-gray-700"> = {cur ? cur.left : "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-amber-600">middle</span>
              <span className="font-semibold text-gray-700"> = {cur?.middle ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-violet-600">right</span>
              <span className="font-semibold text-gray-700"> = {cur ? cur.right : "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">totalHours</span>
              <span className="font-semibold text-gray-700"> = {cur?.totalHours ?? "—"}</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              cur?.kind === "return"
                ? "border border-emerald-300 bg-emerald-50"
                : cur?.minimumChanged
                  ? "border border-emerald-200 bg-emerald-50/50"
                  : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
              minimumSpeed
            </div>
            <div
              className={`mt-0.5 font-mono text-sm font-bold ${
                cur && cur.minimumSpeed > 0 ? "text-emerald-700" : "text-gray-300"
              }`}
            >
              {cur ? cur.minimumSpeed : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-2.5 min-h-[4.25rem]">
        <div className={`text-[10px] font-semibold uppercase tracking-wide ${kindColor(cur)}`}>
          {cur ? KIND_LABEL[cur.kind] : "Ready"}
        </div>
        <div className="text-xs text-gray-600 leading-relaxed mt-0.5">{description}</div>
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
            if (!isDone && !isPlaying) setStep((value) => value + 1);
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
