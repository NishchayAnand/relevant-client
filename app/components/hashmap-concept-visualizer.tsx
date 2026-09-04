"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Entry = { key: string; value: string };

type LastOp = {
  label: string;
  type: "put" | "get" | "remove";
  key: string;
  hash: number;
  index: number;
  outcome: "inserted" | "updated" | "hit" | "miss" | "removed" | "no-op";
  returned: string | null;
  changedKey: string | null;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashString(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    // Java-style: h = 31*h + charCode, wrapped to 32-bit.
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return h;
}

function indexFor(hash: number, capacity: number): number {
  return ((hash % capacity) + capacity) % capacity;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HashMapConceptVisualizer() {
  const [capacity, setCapacity] = useState(5);
  const [buckets, setBuckets] = useState<Entry[][]>(() =>
    Array.from({ length: 5 }, () => []),
  );
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [lastOp, setLastOp] = useState<LastOp>(null);

  const changeCapacity = (delta: number) => {
    const next = Math.min(9, Math.max(3, capacity + delta));
    setCapacity(next);
    setBuckets(Array.from({ length: next }, () => []));
    setLastOp(null);
  };

  const handleReset = () => {
    setBuckets(Array.from({ length: capacity }, () => []));
    setLastOp(null);
    setKeyInput("");
    setValueInput("");
  };

  const handlePut = () => {
    const key = keyInput.trim();
    const value = valueInput.trim();
    if (!key || !value) return;

    const hash = hashString(key);
    const index = indexFor(hash, capacity);
    const next = buckets.map((chain) => chain.map((e) => ({ ...e })));
    const existingIdx = next[index].findIndex((e) => e.key === key);
    let outcome: "inserted" | "updated";
    if (existingIdx !== -1) {
      next[index][existingIdx].value = value;
      outcome = "updated";
    } else {
      next[index].push({ key, value });
      outcome = "inserted";
    }

    setBuckets(next);
    setLastOp({
      label: `put("${key}", "${value}")`,
      type: "put",
      key,
      hash,
      index,
      outcome,
      returned: null,
      changedKey: key,
    });
  };

  const handleGet = () => {
    const key = keyInput.trim();
    if (!key) return;

    const hash = hashString(key);
    const index = indexFor(hash, capacity);
    const found = buckets[index].find((e) => e.key === key);

    setLastOp({
      label: `get("${key}")`,
      type: "get",
      key,
      hash,
      index,
      outcome: found ? "hit" : "miss",
      returned: found ? found.value : null,
      changedKey: found ? key : null,
    });
  };

  const handleRemove = () => {
    const key = keyInput.trim();
    if (!key) return;

    const hash = hashString(key);
    const index = indexFor(hash, capacity);
    const existingIdx = buckets[index].findIndex((e) => e.key === key);

    if (existingIdx === -1) {
      setLastOp({
        label: `remove("${key}")`,
        type: "remove",
        key,
        hash,
        index,
        outcome: "no-op",
        returned: null,
        changedKey: null,
      });
      return;
    }

    const next = buckets.map((chain) => chain.map((e) => ({ ...e })));
    next[index].splice(existingIdx, 1);
    setBuckets(next);
    setLastOp({
      label: `remove("${key}")`,
      type: "remove",
      key,
      hash,
      index,
      outcome: "removed",
      returned: null,
      changedKey: null,
    });
  };

  const keyValid = keyInput.trim().length > 0;
  const valueValid = valueInput.trim().length > 0;

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
                disabled={capacity <= 3}
                className="px-2.5 h-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
              >
                −
              </button>
              <span className="px-3 text-sm font-mono font-semibold text-gray-800 select-none">
                {capacity}
              </span>
              <button
                onClick={() => changeCapacity(1)}
                disabled={capacity >= 9}
                className="px-2.5 h-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
              >
                +
              </button>
            </div>
          </div>

          <div className="self-stretch w-px bg-gray-200 my-0.5" />

          {/* Key input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">key</label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && keyValid && valueValid) handlePut();
              }}
              placeholder="apple"
              className="w-28 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Value input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">value</label>
            <input
              type="text"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && keyValid && valueValid) handlePut();
              }}
              placeholder="1"
              className="w-24 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={handlePut}
              disabled={!keyValid || !valueValid}
              className="h-9 px-4 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              PUT
            </button>
            <button
              onClick={handleGet}
              disabled={!keyValid}
              className="h-9 px-4 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              GET
            </button>
            <button
              onClick={handleRemove}
              disabled={!keyValid}
              className="h-9 px-4 text-sm font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              REMOVE
            </button>
          </div>

          <button
            onClick={handleReset}
            className="ml-auto mb-0.5 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear the map"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Result banner */}
        {lastOp && (
          <div
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm border flex-wrap ${
              lastOp.outcome === "hit" || lastOp.outcome === "inserted" || lastOp.outcome === "removed"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : lastOp.outcome === "updated"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                  : lastOp.outcome === "miss" || lastOp.outcome === "no-op"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            <span className="font-mono font-semibold">{lastOp.label}</span>
            <span className="opacity-70 font-mono text-xs">
              hash = {lastOp.hash} · bucket = {lastOp.hash} mod {capacity} ={" "}
              <strong>{lastOp.index}</strong>
            </span>
            <span className="ml-auto font-medium">
              {lastOp.outcome === "hit" && (
                <>
                  → <strong>{lastOp.returned}</strong>{" "}
                  <span className="opacity-60">(match in chain)</span>
                </>
              )}
              {lastOp.outcome === "miss" && (
                <>
                  → <strong>null</strong>{" "}
                  <span className="opacity-60">(key not in bucket)</span>
                </>
              )}
              {lastOp.outcome === "inserted" && (
                <span className="opacity-70">appended to chain</span>
              )}
              {lastOp.outcome === "updated" && (
                <span className="opacity-70">value replaced in place</span>
              )}
              {lastOp.outcome === "removed" && (
                <span className="opacity-70">entry removed from chain</span>
              )}
              {lastOp.outcome === "no-op" && (
                <span className="opacity-70">nothing to remove</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Bucket visualization ── */}
      <div className="bg-white px-5 py-5">
        <div className="flex justify-between text-xs text-gray-400 mb-3 px-1">
          <span>buckets (index → chain of entries)</span>
          <span>
            {buckets.reduce((n, chain) => n + chain.length, 0)} entries
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {buckets.map((chain, i) => {
            const isActive = lastOp?.index === i;
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 border transition-colors"
                style={{
                  background: isActive ? "#ecfeff" : "#ffffff",
                  borderColor: isActive ? "#67e8f9" : "#f1f5f9",
                }}
              >
                <span
                  className="font-mono text-[12px] tabular-nums font-semibold shrink-0 w-6 text-right"
                  style={{ color: isActive ? "#0e7490" : "#94a3b8" }}
                >
                  [{i}]
                </span>
                <span
                  className="text-[12px] shrink-0"
                  style={{ color: isActive ? "#0e7490" : "#cbd5e1" }}
                >
                  →
                </span>
                {chain.length === 0 ? (
                  <span className="text-[12px] text-gray-300 font-mono italic">
                    empty
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {chain.map((e, idx) => {
                      const isChanged =
                        isActive && lastOp?.changedKey === e.key;
                      const isChainLink = idx < chain.length - 1;
                      return (
                        <span
                          key={`${e.key}-${idx}`}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="px-2 py-0.5 rounded-md font-mono text-[12px] border transition-all"
                            style={{
                              background: isChanged ? "#dcfce7" : "#f8fafc",
                              borderColor: isChanged ? "#10b981" : "#e2e8f0",
                              color: isChanged ? "#065f46" : "#334155",
                              fontWeight: isChanged ? 700 : 500,
                            }}
                          >
                            {e.key}: {e.value}
                          </span>
                          {isChainLink && (
                            <span className="text-gray-300 text-sm">→</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
