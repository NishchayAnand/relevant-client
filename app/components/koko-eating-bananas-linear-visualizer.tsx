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
  "    // 1. Initialize \"k\" to 1.",
  "    int k = 1;",
  "",
  "    // 2. Repeat the following steps until we have an eligible \"k\".",
  "    while (true) {",
  "",
  "        // 3. Initialize a variable, \"cumHrs\" to 0, to store the cumulative hours required to eat",
  "        //    all piles at the rate of \"k\" bananas per hour.",
  "        double cumHrs = 0;",
  "",
  "        // 4. Iterate over each pile and add \"ceil(pile / k)\" to \"cumHrs\".",
  "        for (int pile : piles) {",
  "            cumHrs += Math.ceil((double) pile / k);",
  "        }",
  "",
  "        // 5. If the \"cumHrs\" is less than or equal to \"h\", return \"k\".",
  "        if (cumHrs <= h) {",
  "            return k;",
  "        }",
  "",
  "        // 6. Otherwise, increment \"k\" by 1.",
  "        k++;",
  "",
  "    }",
  "         ",
  "}",
];

type StepKind = "init" | "loop" | "reset" | "pile" | "check" | "return" | "bump";
type Round = "idle" | "counting" | "over" | "ok";

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  ok: boolean | null;
  k: number;
  cumHrs: number | null;
  hours: (number | null)[];
  pileIndex: number | null;
  round: Round;
  result: number | null;
};

function simulate(piles: number[], h: number): Step[] {
  const steps: Step[] = [];
  let k = 1;
  const blank = () => piles.map(() => null as number | null);

  const push = (partial: Omit<Step, "k">) => {
    steps.push({ k, ...partial });
  };

  push({
    kind: "init",
    lines: [3, 4],
    description: "k = 1.",
    ok: null,
    cumHrs: null,
    hours: blank(),
    pileIndex: null,
    round: "idle",
    result: null,
  });

  const fastest = Math.max(...piles, 1);
  while (k <= fastest) {
    push({
      kind: "loop",
      lines: [6, 7],
      description: `Try eating speed k = ${k}.`,
      ok: null,
      cumHrs: null,
      hours: blank(),
      pileIndex: null,
      round: "idle",
      result: null,
    });

    let cumHrs = 0;
    const hours = blank();
    push({
      kind: "reset",
      lines: [9, 10, 11],
      description: `cumHrs = 0 for k = ${k}.`,
      ok: null,
      cumHrs: 0,
      hours: [...hours],
      pileIndex: null,
      round: "counting",
      result: null,
    });

    piles.forEach((pile, index) => {
      const add = Math.ceil(pile / k);
      const prev = cumHrs;
      cumHrs += add;
      hours[index] = add;
      push({
        kind: "pile",
        lines: [13, 14, 15],
        description: `pile = ${pile}. ceil(${pile} / ${k}) = ${add}. cumHrs = ${prev} + ${add} = ${cumHrs}.`,
        ok: null,
        cumHrs,
        hours: [...hours],
        pileIndex: index,
        round: "counting",
        result: null,
      });
    });

    const ok = cumHrs <= h;
    push({
      kind: "check",
      lines: [18, 19],
      description: ok
        ? `cumHrs (${cumHrs}) <= h (${h}), so k = ${k} finishes in time.`
        : `cumHrs (${cumHrs}) > h (${h}), so k = ${k} is too slow.`,
      ok,
      cumHrs,
      hours: [...hours],
      pileIndex: null,
      round: ok ? "ok" : "over",
      result: null,
    });

    if (ok) {
      push({
        kind: "return",
        lines: [20],
        description: `return ${k}.`,
        ok: true,
        cumHrs,
        hours: [...hours],
        pileIndex: null,
        round: "ok",
        result: k,
      });
      return steps;
    }

    const previous = k;
    k += 1;
    push({
      kind: "bump",
      lines: [23, 24],
      description: `k = ${previous} + 1 = ${k}.`,
      ok: null,
      cumHrs: null,
      hours: blank(),
      pileIndex: null,
      round: "idle",
      result: null,
    });
  }

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

function HoursMeter({ cumHrs, h }: { cumHrs: number | null; h: number }) {
  const value = cumHrs ?? 0;
  const over = cumHrs != null && cumHrs > h;
  const scale = Math.max(h, value, 1);
  const fill = (value / scale) * 100;
  const limit = (h / scale) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        <span>
          cumHrs <span className="font-mono normal-case tracking-normal text-gray-700">{cumHrs ?? "—"}</span>
        </span>
        <span>
          h <span className="font-mono normal-case tracking-normal text-gray-700">{h}</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gray-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
            cumHrs == null ? "bg-gray-200" : over ? "bg-rose-400" : "bg-emerald-400"
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

const KIND_LABEL: Record<StepKind, string> = {
  init: "Initialize k",
  loop: "Next speed",
  reset: "Reset cumHrs",
  pile: "Add pile hours",
  check: "Compare with h",
  return: "Return k",
  bump: "Increment k",
};

function kindColor(step: Step | null) {
  if (!step) return "text-gray-400";
  if (step.kind === "return" || step.ok === true) return "text-emerald-600";
  if (step.ok === false) return "text-rose-500";
  if (step.kind === "bump") return "text-violet-600";
  if (step.kind === "init" || step.kind === "reset") return "text-sky-600";
  return "text-amber-600";
}

export default function KokoEatingBananasLinearVisualizer() {
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
    const wait = cur?.kind === "return" ? 900 : cur?.kind === "pile" ? 220 : cur?.kind === "check" ? 640 : 400;
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
      ? `ceil(${preset.piles[cur.pileIndex]} / ${cur.k}) = ${cur.hours[cur.pileIndex]}`
      : cur?.cumHrs != null
        ? `cumHrs = ${cur.cumHrs}`
        : "ceil(pile / k)";

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
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Eating speed</div>
              <div className="font-mono text-lg font-bold text-gray-800 leading-tight">
                k = {cur ? cur.k : "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Hour limit</div>
              <div className="font-mono text-lg font-bold text-gray-800 leading-tight">h = {preset.h}</div>
            </div>
          </div>

          <PileRow
            piles={preset.piles}
            hours={cur?.hours ?? preset.piles.map(() => null)}
            pileIndex={cur?.pileIndex ?? null}
            round={cur?.round ?? "idle"}
          />

          <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 font-mono text-sm font-bold text-gray-800 truncate">
            {formula}
          </div>

          <HoursMeter cumHrs={cur?.cumHrs ?? null} h={preset.h} />

          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <div>
              <span className="font-semibold text-amber-600">k</span>
              <span className="font-semibold text-gray-700"> = {cur ? cur.k : "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">cumHrs</span>
              <span className="font-semibold text-gray-700"> = {cur?.cumHrs ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">h</span>
              <span className="font-semibold text-gray-700"> = {preset.h}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">pile</span>
              <span className="font-semibold text-gray-700">
                {" "}
                = {cur?.pileIndex == null ? "—" : preset.piles[cur.pileIndex]}
              </span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 mt-auto ${
              cur?.kind === "return"
                ? "border border-emerald-300 bg-emerald-50"
                : "border border-gray-100 bg-gray-50/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Returned k</div>
            <div
              className={`mt-0.5 font-mono text-sm font-bold ${
                cur?.result == null ? "text-gray-300" : "text-emerald-700"
              }`}
            >
              {cur?.result ?? "—"}
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
