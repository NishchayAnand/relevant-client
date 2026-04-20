"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Shared ───────────────────────────────────────────────────────────────────

function StepNav({
  step,
  total,
  onPrev,
  onNext,
}: {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-4">
      <button
        onClick={onPrev}
        disabled={step === 0}
        className="p-1.5 rounded bg-gray-700 text-gray-300 disabled:opacity-30 hover:bg-gray-600 transition"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === step ? "bg-indigo-400" : "bg-gray-500"
            }`}
          />
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={step === total - 1}
        className="p-1.5 rounded bg-gray-700 text-gray-300 disabled:opacity-30 hover:bg-gray-600 transition"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded ${style}`}>
      {label}
    </span>
  );
}

// ─── 1. HashMap ───────────────────────────────────────────────────────────────

type HMEntry = { key: number; value: string; highlight?: "hit" };

const HASHMAP_STEPS: {
  desc: string;
  badge: string | null;
  badgeStyle: string;
  entries: HMEntry[];
  note: string | null;
}[] = [
  {
    desc: "Start with an empty HashMap.",
    badge: null,
    badgeStyle: "",
    entries: [],
    note: null,
  },
  {
    desc: 'put(1, "a") → O(1) insert. No ordering tracked.',
    badge: 'put(1, "a")',
    badgeStyle: "bg-indigo-900 text-indigo-300",
    entries: [{ key: 1, value: "a" }],
    note: null,
  },
  {
    desc: 'put(3, "c") → O(1) insert. Keys have no recency order.',
    badge: 'put(3, "c")',
    badgeStyle: "bg-indigo-900 text-indigo-300",
    entries: [{ key: 1, value: "a" }, { key: 3, value: "c" }],
    note: null,
  },
  {
    desc: 'put(2, "b") → O(1) insert.',
    badge: 'put(2, "b")',
    badgeStyle: "bg-indigo-900 text-indigo-300",
    entries: [{ key: 1, value: "a" }, { key: 3, value: "c" }, { key: 2, value: "b" }],
    note: null,
  },
  {
    desc: "get(3) → O(1) lookup ✓  But which key is least recently used?",
    badge: "get(3)",
    badgeStyle: "bg-green-900 text-green-300",
    entries: [
      { key: 1, value: "a" },
      { key: 3, value: "c", highlight: "hit" },
      { key: 2, value: "b" },
    ],
    note: "⚠ No way to determine recency — the HashMap has no concept of ordering.",
  },
];

export function LRUHashMapVisualizer() {
  const [step, setStep] = useState(0);
  const s = HASHMAP_STEPS[step];

  return (
    <div className="not-prose my-4 rounded-xl bg-gray-900 border border-gray-700 p-4 text-sm font-mono">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-sans uppercase tracking-wide">
          HashMap
        </span>
        {s.badge && <Badge label={s.badge} style={s.badgeStyle} />}
      </div>

      <div className="flex gap-2 flex-wrap min-h-16 items-center">
        {s.entries.length === 0 && (
          <span className="text-white text-xs italic">empty</span>
        )}
        {s.entries.map((e) => (
          <div
            key={e.key}
            className={`flex flex-col items-center rounded border px-3 py-2 transition-colors ${
              e.highlight === "hit"
                ? "border-green-500 bg-green-900/30 text-green-300"
                : "border-gray-600 bg-gray-800 text-white"
            }`}
          >
            <span className="text-[10px] opacity-70">key</span>
            <span className="font-bold">{e.key}</span>
            <div className="w-full border-t border-gray-600 my-1" />
            <span className="text-[10px] opacity-70">val</span>
            <span className="font-bold">{e.value}</span>
          </div>
        ))}
      </div>


      {s.note && (
        <div className="mt-3 text-xs text-white bg-amber-900/20 border border-amber-800 rounded px-3 py-1.5">
          {s.note}
        </div>
      )}

      <div className="mt-3 text-xs text-white font-sans bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5">{s.desc}</div>

      <StepNav
        step={step}
        total={HASHMAP_STEPS.length}
        onPrev={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
      />
    </div>
  );
}

// ─── 2. SinglyLinkedList ──────────────────────────────────────────────────────

type SLLNode = { key: number; highlight?: "scan" | "found" };

const SLL_STEPS: {
  desc: string;
  badge: string | null;
  badgeStyle: string;
  nodes: SLLNode[];
  scanLabel?: string;
  note?: string;
}[] = [
  {
    desc: "SinglyLinkedList with 3 entries. Most recently used is at HEAD.",
    badge: null,
    badgeStyle: "",
    nodes: [{ key: 1 }, { key: 3 }, { key: 2 }],
  },
  {
    desc: "access(3) → no pointer to the node — must scan from HEAD.",
    badge: "access(3)",
    badgeStyle: "bg-indigo-900 text-indigo-300",
    nodes: [{ key: 1, highlight: "scan" }, { key: 3 }, { key: 2 }],
    scanLabel: "checking node(1)...",
  },
  {
    desc: "key 1 ≠ 3. Move to next node.",
    badge: "access(3)",
    badgeStyle: "bg-indigo-900 text-indigo-300",
    nodes: [{ key: 1 }, { key: 3, highlight: "scan" }, { key: 2 }],
    scanLabel: "checking node(3)...",
  },
  {
    desc: "key 3 found! ✓  But this took O(n) traversal steps.",
    badge: "access(3)",
    badgeStyle: "bg-indigo-900 text-indigo-300",
    nodes: [{ key: 1 }, { key: 3, highlight: "found" }, { key: 2 }],
    scanLabel: "found at position 2",
    note: "⚠ Every access or update requires O(n) scan — this is the bottleneck.",
  },
];

export function LRUSinglyLinkedListVisualizer() {
  const [step, setStep] = useState(0);
  const s = SLL_STEPS[step];

  return (
    <div className="not-prose my-4 rounded-xl bg-gray-900 border border-gray-700 p-4 text-sm font-mono">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-sans uppercase tracking-wide">
          SinglyLinkedList
        </span>
        {s.badge && <Badge label={s.badge} style={s.badgeStyle} />}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <div className="text-gray-400 text-xs px-2 py-1 border border-dashed border-gray-600 rounded">
          HEAD
        </div>
        <span className="text-gray-400 text-xs">→</span>
        {s.nodes.map((n, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`flex items-center rounded border px-2 py-1 gap-1 transition-colors ${
                n.highlight === "scan"
                  ? "border-yellow-500 bg-yellow-900/30 text-yellow-300"
                  : n.highlight === "found"
                  ? "border-green-500 bg-green-900/30 text-green-300"
                  : "border-gray-600 bg-gray-800 text-white"
              }`}
            >
              <span className="font-bold">k={n.key}</span>
              <span className="text-[10px] opacity-60">| →</span>
            </div>
            {i < s.nodes.length - 1 && (
              <span className="text-gray-400 text-xs">→</span>
            )}
          </div>
        ))}
        <span className="text-gray-400 text-xs">→</span>
        <div className="text-gray-400 text-xs px-2 py-1 border border-dashed border-gray-600 rounded">
          null
        </div>
      </div>

      {s.scanLabel && (
        <p className="mt-2 text-xs text-yellow-400 italic">{s.scanLabel}</p>
      )}

      {s.note && (
        <div className="mt-3 text-xs text-white bg-amber-900/20 border border-amber-800 rounded px-3 py-1.5">
          {s.note}
        </div>
      )}

      <div className="mt-3 text-xs text-white font-sans bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5">{s.desc}</div>

      <StepNav
        step={step}
        total={SLL_STEPS.length}
        onPrev={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
      />
    </div>
  );
}

// ─── 3. HashMap + SinglyLinkedList ────────────────────────────────────────────

type HMSLLNode = { key: number; highlight?: "target" | "scan" | "prev" };

const HM_SLL_STEPS: {
  desc: string;
  badge: string | null;
  badgeStyle: string;
  nodes: HMSLLNode[];
  mapHighlight: number | null;
  note?: string;
}[] = [
  {
    desc: "HashMap stores key→node pointers. SinglyLinkedList maintains recency order.",
    badge: null,
    badgeStyle: "",
    nodes: [{ key: 1 }, { key: 3 }, { key: 2 }],
    mapHighlight: null,
  },
  {
    desc: "access(2) → HashMap lookup: O(1), direct pointer to node(2).",
    badge: "access(2)",
    badgeStyle: "bg-indigo-900 text-indigo-300",
    nodes: [{ key: 1 }, { key: 3 }, { key: 2, highlight: "target" }],
    mapHighlight: 2,
  },
  {
    desc: "Found node(2) instantly. Now need to remove it and move it to front.",
    badge: "remove node(2)",
    badgeStyle: "bg-amber-900 text-amber-300",
    nodes: [{ key: 1 }, { key: 3 }, { key: 2, highlight: "target" }],
    mapHighlight: null,
  },
  {
    desc: "Need node(2)'s predecessor to relink. No prev pointer — scan from HEAD.",
    badge: "scan for prev",
    badgeStyle: "bg-amber-900 text-amber-300",
    nodes: [{ key: 1, highlight: "scan" }, { key: 3 }, { key: 2, highlight: "target" }],
    mapHighlight: null,
    note: "⚠ HashMap gives O(1) lookup, but SinglyLinkedList has no prev pointer.",
  },
  {
    desc: "Predecessor node(3) found after O(n) scan. Removal is costly regardless.",
    badge: "scan for prev",
    badgeStyle: "bg-amber-900 text-amber-300",
    nodes: [{ key: 1 }, { key: 3, highlight: "prev" }, { key: 2, highlight: "target" }],
    mapHighlight: null,
    note: "⚠ Even with O(1) lookup, middle removal remains O(n).",
  },
];

export function LRUHashMapSinglyLinkedListVisualizer() {
  const [step, setStep] = useState(0);
  const s = HM_SLL_STEPS[step];

  const mapEntries = [
    { key: 1, active: s.mapHighlight === 1 },
    { key: 3, active: s.mapHighlight === 3 },
    { key: 2, active: s.mapHighlight === 2 },
  ];

  return (
    <div className="not-prose my-4 rounded-xl bg-gray-900 border border-gray-700 p-4 text-sm font-mono">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-sans uppercase tracking-wide">
          HashMap + SinglyLinkedList
        </span>
        {s.badge && <Badge label={s.badge} style={s.badgeStyle} />}
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* HashMap panel */}
        <div>
          <p className="text-[10px] text-gray-400 mb-1.5">HashMap</p>
          <div className="flex flex-col gap-1">
            {mapEntries.map((e) => (
              <div
                key={e.key}
                className={`flex items-center gap-2 rounded border px-2 py-1 text-xs transition-colors ${
                  e.active
                    ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                    : "border-gray-700 bg-gray-800 text-white"
                }`}
              >
                <span className="w-4 text-right font-bold">{e.key}</span>
                <span className="opacity-60">→</span>
                <span>node({e.key})</span>
              </div>
            ))}
          </div>
        </div>

        {/* SinglyLinkedList panel */}
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1.5">SinglyLinkedList</p>
          <div className="flex items-center gap-1 flex-wrap">
            <div className="text-gray-400 text-xs px-2 py-1 border border-dashed border-gray-600 rounded">
              HEAD
            </div>
            <span className="text-gray-400 text-xs">→</span>
            {s.nodes.map((n, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`flex items-center rounded border px-2 py-1 gap-1 transition-colors ${
                    n.highlight === "scan"
                      ? "border-yellow-500 bg-yellow-900/30 text-yellow-300"
                      : n.highlight === "target"
                      ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                      : n.highlight === "prev"
                      ? "border-amber-500 bg-amber-900/30 text-amber-300"
                      : "border-gray-600 bg-gray-800 text-white"
                  }`}
                >
                  <span>k={n.key}</span>
                  <span className="text-[10px] opacity-60">→</span>
                </div>
                {i < s.nodes.length - 1 && (
                  <span className="text-gray-400 text-xs">→</span>
                )}
              </div>
            ))}
            <span className="text-gray-400 text-xs">→ null</span>
          </div>
        </div>
      </div>

      {s.note && (
        <div className="mt-3 text-xs text-white bg-amber-900/20 border border-amber-800 rounded px-3 py-1.5">
          {s.note}
        </div>
      )}

      <div className="mt-3 text-xs text-white font-sans bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5">{s.desc}</div>

      <StepNav
        step={step}
        total={HM_SLL_STEPS.length}
        onPrev={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
      />
    </div>
  );
}

// ─── 4. HashMap + DoublyLinkedList ───────────────────────────────────────────

type DLLNode = { key: number; highlight?: "target" | "reconnect" | "inserted" };

const DLL_STEPS: {
  desc: string;
  badge: string | null;
  badgeStyle: string;
  nodes: DLLNode[];
  mapHighlight: number | null;
  note?: string;
}[] = [
  {
    desc: "HashMap stores key→node pointers. DoublyLinkedList nodes carry both prev and next.",
    badge: null,
    badgeStyle: "",
    nodes: [{ key: 1 }, { key: 3 }, { key: 2 }],
    mapHighlight: null,
  },
  {
    desc: "access(2) → HashMap lookup: O(1), direct pointer to node(2).",
    badge: "access(2)",
    badgeStyle: "bg-indigo-900 text-indigo-300",
    nodes: [{ key: 1 }, { key: 3 }, { key: 2, highlight: "target" }],
    mapHighlight: 2,
  },
  {
    desc: "node(2).prev = node(3), node(2).next = TAIL. Reconnect neighbors — no scan needed.",
    badge: "remove node(2)",
    badgeStyle: "bg-amber-900 text-amber-300",
    nodes: [{ key: 1 }, { key: 3, highlight: "reconnect" }, { key: 2, highlight: "target" }],
    mapHighlight: null,
    note: "node(3).next = TAIL · TAIL.prev = node(3) — O(1), prev pointer makes this instant.",
  },
  {
    desc: "node(2) inserted at HEAD. Full get/put operation now runs in O(1).",
    badge: "moved to HEAD",
    badgeStyle: "bg-green-900 text-green-300",
    nodes: [{ key: 2, highlight: "inserted" }, { key: 1 }, { key: 3 }],
    mapHighlight: null,
    note: "✓ HashMap gives O(1) lookup. DoublyLinkedList gives O(1) removal and reposition.",
  },
];

export function LRUDoublyLinkedListVisualizer() {
  const [step, setStep] = useState(0);
  const s = DLL_STEPS[step];

  const mapEntries = [
    { key: 1, active: s.mapHighlight === 1 },
    { key: 3, active: s.mapHighlight === 3 },
    { key: 2, active: s.mapHighlight === 2 },
  ];

  return (
    <div className="not-prose my-4 rounded-xl bg-gray-900 border border-gray-700 p-4 text-sm font-mono">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-sans uppercase tracking-wide">
          HashMap + DoublyLinkedList
        </span>
        {s.badge && <Badge label={s.badge} style={s.badgeStyle} />}
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* HashMap panel */}
        <div>
          <p className="text-[10px] text-gray-400 mb-1.5">HashMap</p>
          <div className="flex flex-col gap-1">
            {mapEntries.map((e) => (
              <div
                key={e.key}
                className={`flex items-center gap-2 rounded border px-2 py-1 text-xs transition-colors ${
                  e.active
                    ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                    : "border-gray-700 bg-gray-800 text-white"
                }`}
              >
                <span className="w-4 text-right font-bold">{e.key}</span>
                <span className="opacity-60">→</span>
                <span>node({e.key})</span>
              </div>
            ))}
          </div>
        </div>

        {/* DoublyLinkedList panel */}
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1.5">DoublyLinkedList</p>
          <div className="flex items-center flex-wrap gap-0.5">
            <div className="text-gray-400 text-xs px-2 py-1 border border-dashed border-gray-600 rounded">
              HEAD
            </div>
            {s.nodes.map((n, i) => (
              <div key={i} className="flex items-center">
                <span className="text-gray-400 text-xs px-1">⇄</span>
                <div
                  className={`flex flex-col items-center rounded border px-2 py-1 transition-colors ${
                    n.highlight === "target"
                      ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                      : n.highlight === "reconnect"
                      ? "border-amber-500 bg-amber-900/30 text-amber-300"
                      : n.highlight === "inserted"
                      ? "border-green-500 bg-green-900/30 text-green-300"
                      : "border-gray-600 bg-gray-800 text-white"
                  }`}
                >
                  <span className="text-[9px] opacity-60">p|n</span>
                  <span className="font-bold">k={n.key}</span>
                </div>
              </div>
            ))}
            <span className="text-gray-400 text-xs px-1">⇄</span>
            <div className="text-gray-400 text-xs px-2 py-1 border border-dashed border-gray-600 rounded">
              TAIL
            </div>
          </div>
        </div>
      </div>

      {s.note && (
        <div
          className={`mt-3 text-xs text-white rounded px-3 py-1.5 ${
            s.note.startsWith("✓")
              ? "bg-green-900/20 border border-green-800"
              : "bg-white/10 border border-white/20"
          }`}
        >
          {s.note}
        </div>
      )}

      <div className="mt-3 text-xs text-white font-sans bg-gray-800/50 border border-gray-700 rounded px-3 py-1.5">{s.desc}</div>

      <StepNav
        step={step}
        total={DLL_STEPS.length}
        onPrev={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
      />
    </div>
  );
}
