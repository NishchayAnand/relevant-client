"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  label: string;
  strs: string[];
};

const PRESETS: Preset[] = [
  {
    id: "example",
    label: '["eat","tea","tan","ate","nat","bat"]',
    strs: ["eat", "tea", "tan", "ate", "nat", "bat"],
  },
  {
    id: "single",
    label: '["a"]',
    strs: ["a"],
  },
  {
    id: "empty",
    label: '[""]',
    strs: [""],
  },
  {
    id: "mixed",
    label: '["abc","bca","xyz","zyx","cab"]',
    strs: ["abc", "bca", "xyz", "zyx", "cab"],
  },
];

// ─── Code shown on the left ───────────────────────────────────────────────────

const ALGORITHM_LINES = [
  "public List<List<String>> groupAnagrams(String[] strs) {",
  "    Map<Map, List<String>> anagramMap = new HashMap<>();",
  "    for (String str : strs) {",
  "        Map<Character, Integer> frequencyMap = str.chars()",
  "            .mapToObj(c -> (char) c)",
  "            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));",
  "        anagramMap.computeIfAbsent(frequencyMap, k -> new ArrayList<>()).add(str);",
  "    }",
  "    return new ArrayList<>(anagramMap.values());",
  "}",
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind =
  | "init"
  | "loop_pick"
  | "scan_char"
  | "bucket_new"
  | "bucket_add"
  | "return";

type FreqEntry = { ch: string; count: number };
type Bucket = { key: string; entries: FreqEntry[]; strings: string[] };

type Step = {
  kind: StepKind;
  lines: number[];
  description: string;
  strIndex: number | null;
  charIndex: number | null;
  freqEntries: FreqEntry[];
  currentKey: string | null;
  buckets: Bucket[];
  bucketNew: string | null;
  bucketHit: string | null;
  addedString: string | null;
  result: string[][] | null;
};

function entriesFromMap(m: Map<string, number>): FreqEntry[] {
  return Array.from(m.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ch, count]) => ({ ch, count }));
}

function signatureFromEntries(entries: FreqEntry[]): string {
  return entries.map((e) => `${e.ch}${e.count}`).join(":");
}

function cloneBuckets(buckets: Bucket[]): Bucket[] {
  return buckets.map((b) => ({
    key: b.key,
    entries: b.entries.map((e) => ({ ...e })),
    strings: [...b.strings],
  }));
}

function simulate(strs: string[]): Step[] {
  const steps: Step[] = [];
  const buckets = new Map<string, Bucket>();

  const bucketList = (): Bucket[] =>
    cloneBuckets(Array.from(buckets.values()));

  steps.push({
    kind: "init",
    lines: [2],
    description:
      "Create an empty HashMap. Keys are frequency maps; values are lists of strings that share the same frequency map.",
    strIndex: null,
    charIndex: null,
    freqEntries: [],
    currentKey: null,
    buckets: [],
    bucketNew: null,
    bucketHit: null,
    addedString: null,
    result: null,
  });

  for (let s = 0; s < strs.length; s++) {
    const str = strs[s];
    const freq = new Map<string, number>();

    steps.push({
      kind: "loop_pick",
      lines: [3],
      description: `Pick strs[${s}] = "${str}". Compute its frequency map next.`,
      strIndex: s,
      charIndex: null,
      freqEntries: [],
      currentKey: null,
      buckets: bucketList(),
      bucketNew: null,
      bucketHit: null,
      addedString: null,
      result: null,
    });

    for (let c = 0; c < str.length; c++) {
      const ch = str[c];
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
      steps.push({
        kind: "scan_char",
        lines: [4, 5, 6],
        description: `Read '${ch}' at position ${c}. frequencyMap['${ch}'] = ${freq.get(ch)}.`,
        strIndex: s,
        charIndex: c,
        freqEntries: entriesFromMap(freq),
        currentKey: null,
        buckets: bucketList(),
        bucketNew: null,
        bucketHit: null,
        addedString: null,
        result: null,
      });
    }

    const entries = entriesFromMap(freq);
    const key = signatureFromEntries(entries);
    const existed = buckets.has(key);

    if (!existed) {
      buckets.set(key, { key, entries, strings: [] });
    }
    const bucket = buckets.get(key)!;
    bucket.strings.push(str);

    steps.push({
      kind: existed ? "bucket_add" : "bucket_new",
      lines: [7],
      description: existed
        ? `frequencyMap already exists as a key — append "${str}" to its list.`
        : `frequencyMap is a new key — create a fresh list and add "${str}".`,
      strIndex: s,
      charIndex: null,
      freqEntries: entries,
      currentKey: key,
      buckets: bucketList(),
      bucketNew: existed ? null : key,
      bucketHit: existed ? key : null,
      addedString: str,
      result: null,
    });
  }

  const result = Array.from(buckets.values()).map((b) => b.strings);
  steps.push({
    kind: "return",
    lines: [9],
    description: `Return anagramMap.values() — ${result.length} group${
      result.length === 1 ? "" : "s"
    } in total.`,
    strIndex: null,
    charIndex: null,
    freqEntries: [],
    currentKey: null,
    buckets: bucketList(),
    bucketNew: null,
    bucketHit: null,
    addedString: null,
    result,
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

// ─── Right: strings row ───────────────────────────────────────────────────────

function StringsRow({
  strs,
  strIndex,
  bucketColors,
  keyByString,
}: {
  strs: string[];
  strIndex: number | null;
  bucketColors: Record<string, string>;
  keyByString: (idx: number) => string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {strs.map((s, idx) => {
        const isCurrent = idx === strIndex;
        const key = keyByString(idx);
        const bucketColor = key ? bucketColors[key] : undefined;

        let bg = "#f9fafb";
        let border = "#e5e7eb";
        let color = "#374151";

        if (isCurrent) {
          bg = "#fef3c7";
          border = "#f59e0b";
          color = "#92400e";
        } else if (bucketColor) {
          bg = `${bucketColor}22`;
          border = bucketColor;
          color = "#0f172a";
        }

        return (
          <div
            key={idx}
            style={{
              background: bg,
              border: `2px solid ${border}`,
              color,
              borderRadius: 8,
              padding: "4px 8px",
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: 700,
              transition: "background 0.2s, border-color 0.2s, color 0.2s",
            }}
            title={`strs[${idx}] = "${s}"`}
          >
            {s || <span className="text-gray-300">""</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Current string letters ──────────────────────────────────────────────────

function CurrentStringLetters({
  str,
  charIndex,
}: {
  str: string | null;
  charIndex: number | null;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 h-[64px] flex flex-col items-center justify-center gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        Current string
      </div>
      {str !== null && str.length > 0 ? (
        <div className="flex gap-1">
          {str.split("").map((ch, idx) => {
            const isActive = idx === charIndex;
            return (
              <div
                key={idx}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: isActive ? "#fef3c7" : "#ffffff",
                  border: `1.5px solid ${isActive ? "#f59e0b" : "#e5e7eb"}`,
                  color: isActive ? "#92400e" : "#374151",
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {ch}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 font-mono">
          {str === "" ? '""' : "—"}
        </div>
      )}
    </div>
  );
}

// ─── Frequency map pills ─────────────────────────────────────────────────────

function FreqMapView({
  entries,
  currentKey,
}: {
  entries: FreqEntry[];
  currentKey: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        Frequency map
      </div>
      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 px-2 py-1.5 text-[11px] text-gray-400 font-mono">
          empty
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {entries.map((e) => (
            <span
              key={e.ch}
              className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                currentKey
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {e.ch}:{e.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Buckets list ─────────────────────────────────────────────────────────────

const BUCKET_COLORS = [
  "#10b981",
  "#6366f1",
  "#f97316",
  "#e11d48",
  "#0ea5e9",
  "#14b8a6",
  "#a855f7",
  "#eab308",
];

function bucketColorFor(index: number): string {
  return BUCKET_COLORS[index % BUCKET_COLORS.length];
}

function BucketsList({
  buckets,
  bucketNew,
  bucketHit,
  addedString,
  bucketColors,
}: {
  buckets: Bucket[];
  bucketNew: string | null;
  bucketHit: string | null;
  addedString: string | null;
  bucketColors: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold shrink-0">
        anagramMap · frequency map → strings
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
        {buckets.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 px-2 py-2 text-[11px] text-gray-400 font-mono">
            map is empty
          </div>
        ) : (
          buckets.map((b) => {
            const isNew = bucketNew === b.key;
            const isHit = bucketHit === b.key;
            const highlight = isNew || isHit;
            const color = bucketColors[b.key];
            return (
              <div
                key={b.key}
                className="rounded-md border px-2 py-1.5 font-mono text-[11px] transition-colors"
                style={{
                  background: highlight ? `${color}18` : "#ffffff",
                  borderColor: highlight ? color : "#f1f5f9",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="truncate"
                    style={{ color: highlight ? color : "#64748b" }}
                  >
                    {b.entries.map((e) => `${e.ch}${e.count}`).join(" ")}
                  </span>
                  {highlight && (
                    <span
                      className="text-[9px] uppercase font-semibold tracking-wide shrink-0"
                      style={{ color }}
                    >
                      {isNew ? "new" : "hit"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {b.strings.map((s, idx) => {
                    const isJustAdded =
                      highlight && addedString === s && idx === b.strings.length - 1;
                    return (
                      <span
                        key={`${s}-${idx}`}
                        className={`px-1.5 py-0.5 rounded ${
                          isJustAdded
                            ? "font-bold"
                            : "font-normal text-gray-600"
                        }`}
                        style={{
                          background: isJustAdded ? `${color}30` : "#f8fafc",
                          color: isJustAdded ? color : undefined,
                          border: `1px solid ${
                            isJustAdded ? color : "#e2e8f0"
                          }`,
                        }}
                      >
                        {s || '""'}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

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
  init: "Init map",
  loop_pick: "Pick string",
  scan_char: "Scan char",
  bucket_new: "New bucket",
  bucket_add: "Append",
  return: "Return",
};

const KIND_COLOR: Record<StepKind, string> = {
  init: "text-sky-600",
  loop_pick: "text-amber-600",
  scan_char: "text-violet-600",
  bucket_new: "text-emerald-600",
  bucket_add: "text-indigo-600",
  return: "text-emerald-700",
};

export default function GroupAnagramsFrequencyMapVisualizer() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const steps = useMemo(() => simulate(preset.strs), [preset]);
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
      cur?.kind === "return" || cur?.kind === "bucket_new" || cur?.kind === "bucket_add"
        ? 900
        : cur?.kind === "scan_char"
          ? 500
          : 700;
    const t = setTimeout(() => setStep((s) => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, step, cur?.kind]);

  const loadPreset = useCallback((id: string) => {
    setPresetId(id);
  }, []);

  const description =
    cur?.description ??
    "Press Play or Step to dry-run the frequency-map approach. The highlighted line is the one currently executing.";
  const lines = cur?.lines ?? [];
  const kind = cur?.kind ?? null;
  const strIndex = cur?.strIndex ?? null;
  const charIndex = cur?.charIndex ?? null;
  const freqEntries = cur?.freqEntries ?? [];
  const currentKey = cur?.currentKey ?? null;
  const buckets = cur?.buckets ?? [];
  const bucketNew = cur?.bucketNew ?? null;
  const bucketHit = cur?.bucketHit ?? null;
  const addedString = cur?.addedString ?? null;
  const result = cur?.result ?? null;

  const bucketColors = useMemo(() => {
    const map: Record<string, string> = {};
    buckets.forEach((b, idx) => {
      map[b.key] = bucketColorFor(idx);
    });
    return map;
  }, [buckets]);

  const keyByString = useCallback(
    (idx: number): string | null => {
      const str = preset.strs[idx];
      // Only mark as "grouped" if this string has been placed in a bucket by this step
      // — i.e. it appears in one of the buckets we currently show.
      for (const b of buckets) {
        if (b.strings.includes(str)) {
          // But avoid marking the currently-in-progress string until it's been added.
          if (idx === strIndex && !addedString) continue;
          return b.key;
        }
      }
      return null;
    },
    [buckets, preset.strs, strIndex, addedString],
  );

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

        <div className="w-full md:w-[400px] shrink-0 px-5 pt-5 pb-5 flex flex-col gap-3 border-t md:border-t-0 border-gray-100 overflow-hidden">
          <StringsRow
            strs={preset.strs}
            strIndex={strIndex}
            bucketColors={bucketColors}
            keyByString={keyByString}
          />

          <CurrentStringLetters
            str={strIndex !== null ? preset.strs[strIndex] : null}
            charIndex={charIndex}
          />

          <FreqMapView entries={freqEntries} currentKey={currentKey} />

          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <StatPill
              label="i"
              value={strIndex === null ? "—" : String(strIndex)}
              labelColor="#d97706"
            />
            <StatPill
              label="buckets"
              value={String(buckets.length)}
              labelColor="#0284c7"
            />
            <StatPill
              label="answer"
              value={result ? `${result.length} groups` : "?"}
              labelColor="#059669"
            />
          </div>

          <BucketsList
            buckets={buckets}
            bucketNew={bucketNew}
            bucketHit={bucketHit}
            addedString={addedString}
            bucketColors={bucketColors}
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
