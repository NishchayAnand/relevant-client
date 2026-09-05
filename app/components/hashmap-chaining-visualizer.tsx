"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Entry = { key: string; value: number };
type Bucket = Entry[];

type LastOp = {
  key: string;
  value: number;
  hash: number;
  bucket: number;
  collision: boolean;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const CAPACITY = 5;

// Ordered so the user first sees a few clean inserts and then a natural
// collision — teaches "different bucket vs. same bucket" without extra prose.
const KEY_POOL = [
  "apple",   // 530 % 5 = 0
  "banana",  // 609 % 5 = 4
  "cherry",  // 653 % 5 = 3
  "date",    // 414 % 5 = 4  (collision with banana)
  "fig",     // 310 % 5 = 0  (collision with apple)
  "grape",   // 527 % 5 = 2
  "kiwi",    // 436 % 5 = 1
  "lemon",   // 539 % 5 = 4  (collision)
  "mango",   // 530 % 5 = 0  (collision)
  "peach",   // 513 % 5 = 3  (collision)
  "plum",    // 446 % 5 = 1  (collision)
];

// Sum of char codes — small enough to display and trace in the banner.
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h += key.charCodeAt(i);
  return h;
}

function makeInitial(): Bucket[] {
  return Array.from({ length: CAPACITY }, () => []);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HashMapChainingVisualizer() {
  const [buckets, setBuckets] = useState<Bucket[]>(makeInitial);
  const [insertedCount, setInsertedCount] = useState(0);
  const [lastOp, setLastOp] = useState<LastOp | null>(null);

  const nextKey = useMemo(
    () => KEY_POOL[insertedCount] ?? null,
    [insertedCount]
  );

  const handleInsert = () => {
    if (!nextKey) return;
    const value = insertedCount + 1;
    const hash = hashKey(nextKey);
    const bucket = hash % CAPACITY;
    const collision = buckets[bucket].length > 0;

    // Head-insert — O(1), matches how chained hash maps typically append.
    setBuckets(
      buckets.map((b, i) =>
        i === bucket ? [{ key: nextKey, value }, ...b] : b
      )
    );
    setLastOp({ key: nextKey, value, hash, bucket, collision });
    setInsertedCount(insertedCount + 1);
  };

  const handleReset = () => {
    setBuckets(makeInitial());
    setInsertedCount(0);
    setLastOp(null);
  };

  return (
    <div className="mt-5 mb-8 border border-gray-200 rounded-2xl overflow-hidden font-sans">
      {/* ── Status banner (fixed height so buckets don't jump) ── */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 h-[70px] flex items-center">
        {!lastOp ? (
          <p className="text-[12.5px] text-gray-500 leading-relaxed">
            Click <span className="font-medium text-gray-700">Insert</span> to
            place keys one at a time. Each key's hash is reduced{" "}
            <span className="font-mono text-gray-700">mod {CAPACITY}</span> to
            pick a bucket — collisions get chained.
          </p>
        ) : (
          <div className="text-[12.5px] leading-relaxed">
            <div className="text-gray-500">
              <span className="font-mono text-gray-800">
                hash(&quot;{lastOp.key}&quot;)
              </span>{" "}
              = <span className="font-mono text-gray-800">{lastOp.hash}</span>
              {"  →  "}
              <span className="font-mono text-gray-800">
                {lastOp.hash} mod {CAPACITY} = {lastOp.bucket}
              </span>
            </div>
            <div
              className="mt-0.5 font-medium"
              style={{ color: lastOp.collision ? "#b45309" : "#047857" }}
            >
              {lastOp.collision ? (
                <>
                  ⚡ Collision — prepended to existing chain at{" "}
                  <span className="font-mono">bucket[{lastOp.bucket}]</span>
                </>
              ) : (
                <>
                  ✓ No collision — started a new chain at{" "}
                  <span className="font-mono">bucket[{lastOp.bucket}]</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bucket array ── */}
      <div className="px-4 py-4 bg-white">
        <div className="flex flex-col gap-1.5">
          {buckets.map((chain, i) => {
            const isTarget = lastOp?.bucket === i;
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
                style={{
                  background: isTarget ? "#ecfeff" : "transparent",
                }}
              >
                <div
                  className="w-14 h-9 shrink-0 rounded-md border-2 flex items-center justify-center font-mono text-[12.5px] font-bold transition-colors"
                  style={{
                    background: isTarget ? "#cffafe" : "#f8fafc",
                    borderColor: isTarget ? "#06b6d4" : "#e2e8f0",
                    color: isTarget ? "#0e7490" : "#64748b",
                  }}
                >
                  [{i}]
                </div>
                <span className="text-gray-300 text-base select-none">→</span>

                {chain.length === 0 ? (
                  <span className="font-mono text-[12.5px] text-gray-300 italic">
                    null
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {chain.map((e, idx) => {
                      const isNew =
                        isTarget && lastOp?.key === e.key && idx === 0;
                      return (
                        <span
                          key={`${e.key}-${idx}`}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="rounded-md border-2 px-2.5 py-1 font-mono text-[12.5px] transition-all"
                            style={{
                              background: isNew ? "#dcfce7" : "#f8fafc",
                              borderColor: isNew ? "#10b981" : "#cbd5e1",
                              color: isNew ? "#065f46" : "#334155",
                              fontWeight: isNew ? 700 : 500,
                            }}
                          >
                            {e.key}: {e.value}
                          </span>
                          <span className="text-gray-300 text-base select-none">
                            →
                          </span>
                        </span>
                      );
                    })}
                    <span className="font-mono text-[12.5px] text-gray-300 italic">
                      null
                    </span>
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
          disabled={!nextKey}
          className="flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          Insert{" "}
          <span className="font-mono opacity-80">
            {nextKey ? `"${nextKey}"` : "— pool exhausted"}
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
