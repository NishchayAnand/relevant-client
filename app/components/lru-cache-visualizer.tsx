"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CacheEntry = { key: number; value: number };

type LastOp = {
  label: string;
  result: string | null;
  evicted: number | null;
  changedKey: number | null;
} | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LRUCacheVisualizer() {
  const [capacityInput, setCapacityInput] = useState("3");
  const [capacity, setCapacity] = useState(3);
  const [initialized, setInitialized] = useState(false);

  const [cache, setCache] = useState<CacheEntry[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [lastOp, setLastOp] = useState<LastOp>(null);

  const handleInit = () => {
    const cap = parseInt(capacityInput, 10);
    if (isNaN(cap) || cap < 1) return;
    setCapacity(cap);
    setCache([]);
    setLastOp(null);
    setInitialized(true);
  };

  const handleReset = () => {
    setCache([]);
    setLastOp(null);
    setInitialized(false);
  };

  const handleGet = () => {
    const key = parseInt(keyInput, 10);
    if (isNaN(key)) return;

    let next = [...cache];
    const idx = next.findIndex(e => e.key === key);
    let result: string;

    if (idx === -1) {
      result = "-1";
    } else {
      const [hit] = next.splice(idx, 1);
      next.unshift(hit);
      result = String(hit.value);
    }

    setCache(next);
    setLastOp({ label: `get(${key})`, result, evicted: null, changedKey: idx !== -1 ? key : null });
  };

  const handlePut = () => {
    const key = parseInt(keyInput, 10);
    const value = parseInt(valueInput, 10);
    if (isNaN(key) || isNaN(value)) return;

    let next = [...cache];
    const idx = next.findIndex(e => e.key === key);
    if (idx !== -1) next.splice(idx, 1);
    next.unshift({ key, value });

    let evicted: number | null = null;
    if (next.length > capacity) {
      evicted = next[next.length - 1].key;
      next = next.slice(0, capacity);
    }

    setCache(next);
    setLastOp({ label: `put(${key}, ${value})`, result: null, evicted, changedKey: key });
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="mt-5 mb-10 border border-gray-200 rounded-2xl overflow-hidden">

      {/* Controls panel */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-gray-50">
        {!initialized ? (
          /* ── Init form ── */
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Capacity</label>
              <input
                type="number"
                min={1}
                max={8}
                value={capacityInput}
                onChange={e => setCapacityInput(e.target.value)}
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={handleInit}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              Initialize
            </button>
          </div>
        ) : (
          /* ── Operation form ── */
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Key</label>
                <input
                  type="number"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Value</label>
                <input
                  type="number"
                  value={valueInput}
                  onChange={e => setValueInput(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button
                onClick={handleGet}
                disabled={keyInput === ""}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                get(key)
              </button>
              <button
                onClick={handlePut}
                disabled={keyInput === "" || valueInput === ""}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                put(key, value)
              </button>
              <button
                onClick={handleReset}
                className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 ml-auto"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Last operation result */}
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm min-h-10 flex items-center gap-2">
              {lastOp ? (
                <>
                  <span className="font-mono font-semibold text-indigo-700">{lastOp.label}</span>
                  {lastOp.result !== null && (
                    <span className={`font-medium ${lastOp.result === "-1" ? "text-red-500" : "text-green-600"}`}>
                      → {lastOp.result === "-1" ? "−1 (key not found)" : `${lastOp.result}`}
                    </span>
                  )}
                  {lastOp.evicted !== null && (
                    <span className="text-orange-500 font-medium">· evicted key {lastOp.evicted}</span>
                  )}
                  {lastOp.result === null && lastOp.evicted === null && (
                    <span className="text-gray-500">· key updated</span>
                  )}
                </>
              ) : (
                <span className="text-gray-400">
                  LRUCache({capacity}) — enter a key and call get or put
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cache visualization */}
      {initialized && (
        <div className="bg-white px-5 py-6">
          <div className="flex justify-between text-xs text-gray-400 mb-3 px-1">
            <span>MRU (most recent)</span>
            <span>LRU (least recent)</span>
          </div>

          <div className="flex items-start gap-2 flex-wrap">
            {/* Filled slots */}
            {cache.map((entry, i) => {
              const isChanged = entry.key === lastOp?.changedKey;
              const isMRU = i === 0;
              const isLRU = i === cache.length - 1 && cache.length === capacity;

              return (
                <div key={entry.key} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-gray-400">
                      {isMRU ? "MRU" : isLRU ? "LRU" : `pos ${i + 1}`}
                    </span>
                    <div
                      className={`w-20 rounded-xl border-2 py-3 flex flex-col items-center gap-0.5 transition-all
                        ${isChanged
                          ? "bg-indigo-50 border-indigo-400 scale-105"
                          : isMRU
                          ? "bg-green-50 border-green-300"
                          : isLRU
                          ? "bg-orange-50 border-orange-300"
                          : "bg-white border-gray-200"
                        }
                      `}
                    >
                      <span className="text-xs text-gray-400">key</span>
                      <span className="font-mono font-bold text-lg text-gray-800">{entry.key}</span>
                      <span className="text-xs text-gray-400">val</span>
                      <span className="font-mono font-semibold text-gray-600">{entry.value}</span>
                    </div>
                  </div>
                  {i < capacity - 1 && (
                    <span className="text-gray-300 text-lg mt-5">→</span>
                  )}
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: capacity - cache.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2">
                {(cache.length > 0 || i > 0) && (
                  <span className="text-gray-200 text-lg mt-5">→</span>
                )}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-300">—</span>
                  <div className="w-20 rounded-xl border-2 border-dashed border-gray-200 py-3 flex flex-col items-center justify-center h-19">
                    <span className="text-gray-300 text-sm">empty</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Capacity indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium">{cache.length} / {capacity} slots used</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all"
                style={{ width: `${(cache.length / capacity) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
