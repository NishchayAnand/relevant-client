"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CacheEntry = { key: number; value: number };

type LastOp = {
  label: string;
  type: "get" | "put";
  hit: boolean | null;
  returned: string | null;
  evicted: number | null;
  changedKey: number | null;
} | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LRUCacheVisualizer() {
  const [capacity, setCapacity] = useState(3);
  const [cache, setCache] = useState<CacheEntry[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [lastOp, setLastOp] = useState<LastOp>(null);

  const changeCapacity = (delta: number) => {
    const next = Math.min(6, Math.max(1, capacity + delta));
    setCapacity(next);
    setCache([]);
    setLastOp(null);
  };

  const handleReset = () => {
    setCache([]);
    setLastOp(null);
    setKeyInput("");
    setValueInput("");
  };

  const handleGet = () => {
    const key = parseInt(keyInput, 10);
    if (isNaN(key)) return;
    let next = [...cache];
    const idx = next.findIndex(e => e.key === key);
    const hit = idx !== -1;
    const returned = hit ? String(cache[idx].value) : "-1";
    if (hit) {
      const [entry] = next.splice(idx, 1);
      next.unshift(entry);
    }
    setCache(next);
    setLastOp({ label: `get(${key})`, type: "get", hit, returned, evicted: null, changedKey: hit ? key : null });
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
    setLastOp({ label: `put(${key}, ${value})`, type: "put", hit: null, returned: null, evicted, changedKey: key });
  };

  const keyValid = keyInput !== "" && !isNaN(parseInt(keyInput, 10));
  const valueValid = valueInput !== "" && !isNaN(parseInt(valueInput, 10));

  return (
    <div className="mt-5 mb-10 border border-gray-200 rounded-2xl overflow-hidden font-sans">

      {/* ── Control panel ── */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-end gap-3 flex-wrap">

          {/* Capacity stepper */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">capacity</label>
            <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden h-9">
              <button
                onClick={() => changeCapacity(-1)}
                disabled={capacity <= 1}
                className="px-2.5 h-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
              >−</button>
              <span className="px-3 text-sm font-mono font-semibold text-gray-800 select-none">{capacity}</span>
              <button
                onClick={() => changeCapacity(1)}
                disabled={capacity >= 6}
                className="px-2.5 h-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
              >+</button>
            </div>
          </div>

          {/* Divider */}
          <div className="self-stretch w-px bg-gray-200 my-0.5" />

          {/* Key input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">key</label>
            <input
              type="number"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && keyValid) handleGet(); }}
              placeholder="1"
              className="w-20 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Value input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">value</label>
            <input
              type="number"
              value={valueInput}
              onChange={e => setValueInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && keyValid && valueValid) handlePut(); }}
              placeholder="10"
              className="w-20 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={handleGet}
              disabled={!keyValid}
              className="h-9 px-4 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              GET (read)
            </button>
            <button
              onClick={handlePut}
              disabled={!keyValid || !valueValid}
              className="h-9 px-4 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              PUT (write)
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="ml-auto mb-0.5 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear cache"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Result banner */}
        {lastOp && (
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm border
            ${lastOp.type === "get" && lastOp.hit
              ? "bg-green-50 border-green-200 text-green-800"
              : lastOp.type === "get" && !lastOp.hit
              ? "bg-red-50 border-red-200 text-red-700"
              : lastOp.evicted !== null
              ? "bg-orange-50 border-orange-200 text-orange-800"
              : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            <span className="font-mono font-semibold">{lastOp.label}</span>
            {lastOp.type === "get" && lastOp.hit && (
              <span>→ <strong>{lastOp.returned}</strong> <span className="opacity-60">(cache hit · moved to front)</span></span>
            )}
            {lastOp.type === "get" && !lastOp.hit && (
              <span>→ <strong>−1</strong> <span className="opacity-60">(key not found)</span></span>
            )}
            {lastOp.type === "put" && lastOp.evicted === null && (
              <span className="opacity-60">inserted at front</span>
            )}
            {lastOp.type === "put" && lastOp.evicted !== null && (
              <span>inserted · <strong>evicted key {lastOp.evicted}</strong> <span className="opacity-60">(was LRU)</span></span>
            )}
          </div>
        )}
      </div>

      {/* Cache visualization */}
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
    </div>
  );
}
