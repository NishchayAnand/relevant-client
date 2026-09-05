"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "linear" | "quadratic" | "double";

type Cell = { key: string; value: number; homeIdx: number } | null;

type LastOp = {
  key: string;
  value: number;
  hash: number;
  home: number;
  probeIndices: number[]; // ordered probe attempts (indices actually visited)
  placedAt: number | null; // null → probing failed (table full / cycle)
};

// ─── Config ───────────────────────────────────────────────────────────────────

// Prime capacity — good for quadratic & double hashing coverage.
const CAPACITY = 7;

const KEY_POOL = [
  "apple",   // 530 % 7 = 5
  "banana",  // 609 % 7 = 0
  "cherry",  // 653 % 7 = 2
  "date",    // 414 % 7 = 1
  "fig",     // 310 % 7 = 2  (collision)
  "grape",   // 527 % 7 = 2  (collision)
  "kiwi",    // 436 % 7 = 2  (collision)
  "lemon",   // 539 % 7 = 0  (collision)
  "mango",   // 530 % 7 = 5  (collision)
  "peach",   // 513 % 7 = 2  (collision)
  "plum",    // 446 % 7 = 5  (collision)
];

// Sum-of-char-codes hash — traceable in the banner.
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h += key.charCodeAt(i);
  return h;
}

// Second hash for double hashing — non-zero, coprime to prime capacity.
function hash2Key(hash: number): number {
  return 1 + (hash % (CAPACITY - 1));
}

function probeIndex(strategy: Strategy, hash: number, i: number): number {
  switch (strategy) {
    case "linear":
      return (hash + i) % CAPACITY;
    case "quadratic":
      return (hash + i * i) % CAPACITY;
    case "double":
      return (hash + i * hash2Key(hash)) % CAPACITY;
  }
}

function makeInitial(): Cell[] {
  return Array.from({ length: CAPACITY }, () => null);
}

const STRATEGY_LABEL: Record<Strategy, string> = {
  linear: "Linear",
  quadratic: "Quadratic",
  double: "Double hashing",
};

const STRATEGY_FORMULA: Record<Strategy, string> = {
  linear: "(h + i) mod N",
  quadratic: "(h + i²) mod N",
  double: "(h + i · h₂) mod N",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HashMapOpenAddressingVisualizer() {
  const [strategy, setStrategy] = useState<Strategy>("linear");
  const [cells, setCells] = useState<Cell[]>(makeInitial);
  const [insertedCount, setInsertedCount] = useState(0);
  const [lastOp, setLastOp] = useState<LastOp | null>(null);

  const nextKey = useMemo(
    () => KEY_POOL[insertedCount] ?? null,
    [insertedCount]
  );
  const tableFull = cells.every((c) => c !== null);

  const handleInsert = () => {
    if (!nextKey || tableFull) return;
    const value = insertedCount + 1;
    const hash = hashKey(nextKey);
    const home = hash % CAPACITY;

    const probeIndices: number[] = [];
    let placedAt: number | null = null;
    // Try up to CAPACITY probes — bounded to avoid cycles in quadratic probing.
    for (let i = 0; i < CAPACITY; i++) {
      const idx = probeIndex(strategy, hash, i);
      probeIndices.push(idx);
      if (cells[idx] === null) {
        placedAt = idx;
        break;
      }
    }

    if (placedAt !== null) {
      const finalIdx = placedAt;
      setCells(
        cells.map((c, i) =>
          i === finalIdx ? { key: nextKey, value, homeIdx: home } : c
        )
      );
    }
    setLastOp({ key: nextKey, value, hash, home, probeIndices, placedAt });
    setInsertedCount(insertedCount + 1);
  };

  const handleReset = () => {
    setCells(makeInitial());
    setInsertedCount(0);
    setLastOp(null);
  };

  const handleStrategyChange = (s: Strategy) => {
    if (s === strategy) return;
    // Different probing strategies place keys in different slots — reset so
    // the demo stays internally consistent.
    setStrategy(s);
    setCells(makeInitial());
    setInsertedCount(0);
    setLastOp(null);
  };

  // Map bucket-index → 1-based probe-order (for badges on probed cells).
  const probeOrder = useMemo(() => {
    if (!lastOp) return new Map<number, number>();
    const map = new Map<number, number>();
    lastOp.probeIndices.forEach((idx, order) => {
      if (!map.has(idx)) map.set(idx, order + 1);
    });
    return map;
  }, [lastOp]);

  return (
    <div className="mt-5 mb-8 border border-gray-200 rounded-2xl overflow-hidden font-sans">
      {/* ── Strategy selector ── */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mr-1">
          Probing
        </span>
        {(Object.keys(STRATEGY_LABEL) as Strategy[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleStrategyChange(s)}
            className="h-7 px-2.5 text-[12px] font-medium rounded-md border transition-colors"
            style={{
              background: strategy === s ? "#4f46e5" : "#fff",
              borderColor: strategy === s ? "#4f46e5" : "#e5e7eb",
              color: strategy === s ? "#fff" : "#4b5563",
            }}
          >
            {STRATEGY_LABEL[s]}
          </button>
        ))}
        <span className="ml-auto text-[11px] font-mono text-gray-400 whitespace-nowrap">
          probe(i) = {STRATEGY_FORMULA[strategy]}
        </span>
      </div>

      {/* ── Status banner (fixed height so bucket rows don't jump) ── */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 h-[70px] flex items-center">
        {!lastOp ? (
          <p className="text-[12.5px] text-gray-500 leading-relaxed">
            Click <span className="font-medium text-gray-700">Insert</span> to place keys.
            On a collision, {STRATEGY_LABEL[strategy].toLowerCase()} probing walks the table
            until it finds an empty slot — every entry still lives in the array itself.
          </p>
        ) : (
          <div className="text-[12.5px] leading-relaxed">
            <div className="text-gray-500">
              <span className="font-mono text-gray-800">
                hash(&quot;{lastOp.key}&quot;)
              </span>{" "}
              = <span className="font-mono text-gray-800">{lastOp.hash}</span>
              {"  →  "}
              home ={" "}
              <span className="font-mono text-gray-800">
                bucket[{lastOp.home}]
              </span>
            </div>
            <div
              className="mt-0.5 font-medium flex flex-wrap items-center gap-x-1"
              style={{
                color:
                  lastOp.placedAt === null
                    ? "#b91c1c"
                    : lastOp.probeIndices.length === 1
                      ? "#047857"
                      : "#b45309",
              }}
            >
              {lastOp.placedAt === null ? (
                <>⛔ No empty slot found after {lastOp.probeIndices.length} probes</>
              ) : lastOp.probeIndices.length === 1 ? (
                <>
                  ✓ Empty — placed directly at{" "}
                  <span className="font-mono">bucket[{lastOp.placedAt}]</span>
                </>
              ) : (
                <>
                  ⚡ Collision — probed{" "}
                  <span className="font-mono">
                    {lastOp.probeIndices.map((p) => `[${p}]`).join(" → ")}
                  </span>{" "}
                  → placed at{" "}
                  <span className="font-mono">bucket[{lastOp.placedAt}]</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bucket array ── */}
      <div className="px-4 py-4 bg-white">
        <div className="flex flex-col gap-1.5">
          {cells.map((cell, i) => {
            const isPlaced = lastOp?.placedAt === i;
            const probeOrderNum = probeOrder.get(i);
            const wasProbed = probeOrderNum !== undefined;
            const wasProbedTaken = wasProbed && !isPlaced;

            let bucketBg = "#f8fafc";
            let bucketBorder = "#e2e8f0";
            let bucketColor = "#64748b";
            if (isPlaced) {
              bucketBg = "#dcfce7";
              bucketBorder = "#10b981";
              bucketColor = "#065f46";
            } else if (wasProbedTaken) {
              bucketBg = "#fef3c7";
              bucketBorder = "#f59e0b";
              bucketColor = "#92400e";
            }

            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md px-2 py-1"
              >
                <div className="relative w-14 h-9 shrink-0">
                  <div
                    className="absolute inset-0 rounded-md border-2 flex items-center justify-center font-mono text-[12.5px] font-bold transition-colors"
                    style={{
                      background: bucketBg,
                      borderColor: bucketBorder,
                      color: bucketColor,
                    }}
                  >
                    [{i}]
                  </div>
                  {wasProbed && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white"
                      style={{
                        background: isPlaced ? "#10b981" : "#f59e0b",
                        color: "#fff",
                      }}
                      title={
                        isPlaced
                          ? `Probe #${probeOrderNum} — placed here`
                          : `Probe #${probeOrderNum} — occupied, skipped`
                      }
                    >
                      {probeOrderNum}
                    </span>
                  )}
                </div>
                <span className="text-gray-300 text-base select-none">→</span>
                {cell === null ? (
                  <span className="font-mono text-[12.5px] text-gray-300 italic">
                    empty
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-md border-2 px-2.5 py-1 font-mono text-[12.5px] transition-all"
                      style={{
                        background: isPlaced ? "#dcfce7" : "#f8fafc",
                        borderColor: isPlaced ? "#10b981" : "#cbd5e1",
                        color: isPlaced ? "#065f46" : "#334155",
                        fontWeight: isPlaced ? 700 : 500,
                      }}
                    >
                      {cell.key}: {cell.value}
                    </span>
                    {cell.homeIdx !== i && (
                      <span className="text-[10.5px] text-gray-400 font-mono">
                        home was [{cell.homeIdx}]
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleInsert}
          disabled={!nextKey || tableFull}
          className="flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          Insert{" "}
          <span className="font-mono opacity-80">
            {tableFull
              ? "— table full"
              : nextKey
                ? `"${nextKey}"`
                : "— pool exhausted"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Reset"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}
