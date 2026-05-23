"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

type ArrivedEvent = {
  id: number;
  /** Time (ms since visualizer start) when the event arrived. */
  t: number;
  /** Has this event been "captured" by a completed batch yet? */
  captured: boolean;
};

const TIMELINE_WINDOW_MS = 18_000;
const EVENT_INTERVAL_MS = 600;
const TICK_MS = 100;

export default function BatchVsRealityVisualizer() {
  const [batchIntervalMs, setBatchIntervalMs] = useState(5_000);
  const [now, setNow] = useState(0);
  const [events, setEvents] = useState<ArrivedEvent[]>([]);
  const [lastBatchAt, setLastBatchAt] = useState(0);
  const [lastBatchCount, setLastBatchCount] = useState(0);
  const [flashBatch, setFlashBatch] = useState(false);
  const [isRunning, setIsRunning] = useState(true);

  const startRef = useRef<number>(0);
  const lastEventAtRef = useRef<number>(0);
  const eventIdRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) return;

    startRef.current = performance.now() - now;

    const interval = setInterval(() => {
      const t = performance.now() - startRef.current;
      setNow(t);

      if (t - lastEventAtRef.current >= EVENT_INTERVAL_MS) {
        lastEventAtRef.current = t;
        setEvents((prev) => [
          ...prev.filter((e) => t - e.t < TIMELINE_WINDOW_MS + 2_000),
          { id: eventIdRef.current++, t, captured: false },
        ]);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const handleToggle = () => setIsRunning((r) => !r);

  const handleReset = () => {
    setIsRunning(false);
    setNow(0);
    setEvents([]);
    setLastBatchAt(0);
    setLastBatchCount(0);
    setFlashBatch(false);
    lastEventAtRef.current = 0;
    eventIdRef.current = 0;
  };

  useEffect(() => {
    if (now - lastBatchAt < batchIntervalMs) return;
    setEvents((prev) => {
      const captured = prev.filter((e) => !e.captured).length;
      setLastBatchCount(captured);
      return prev.map((e) => ({ ...e, captured: true }));
    });
    setLastBatchAt(now);
    setFlashBatch(true);
    const id = setTimeout(() => setFlashBatch(false), 450);
    return () => clearTimeout(id);
  }, [now, lastBatchAt, batchIntervalMs]);

  const liveCount = events.filter((e) => !e.captured).length;
  const staleness = Math.max(0, now - lastBatchAt);
  const stalenessPct = Math.min(100, (staleness / batchIntervalMs) * 100);

  const windowStart = Math.max(0, now - TIMELINE_WINDOW_MS);
  const visibleEvents = events.filter((e) => e.t >= windowStart);
  const toPct = (t: number) =>
    ((t - windowStart) / TIMELINE_WINDOW_MS) * 100;

  const batchTicks: number[] = [];
  for (let t = lastBatchAt; t >= windowStart; t -= batchIntervalMs) {
    batchTicks.push(t);
  }

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-6 sm:p-8 w-full">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="text-sm text-gray-500">
            Continuous events &middot; batch every{" "}
            <span className="font-mono font-medium text-gray-800">
              {(batchIntervalMs / 1000).toFixed(0)}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">batch interval</span>
            <input
              type="range"
              min={2000}
              max={10000}
              step={1000}
              value={batchIntervalMs}
              onChange={(e) => setBatchIntervalMs(Number(e.target.value))}
              className="accent-gray-800"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Reality (event stream)</span>
            <span className="font-mono">now</span>
          </div>

          <div className="relative h-14 rounded-lg bg-gray-50 border overflow-hidden">
            {batchTicks.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 border-l border-dashed border-gray-300"
                style={{ left: `${toPct(t)}%` }}
              />
            ))}

            {visibleEvents.map((e) => (
              <div
                key={e.id}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-colors duration-300 ${
                  e.captured ? "bg-gray-300" : "bg-blue-500"
                }`}
                style={{ left: `${toPct(e.t)}%` }}
              />
            ))}

            <div
              className="absolute top-0 bottom-0 w-px bg-gray-800"
              style={{ left: `${toPct(now)}%` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-800" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>-{(TIMELINE_WINDOW_MS / 1000).toFixed(0)}s</span>
            <span>batch boundaries (dashed) &middot; uncaptured events (blue)</span>
            <span>0s</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500 mb-1">Reality (live count)</div>
            <div className="font-mono text-2xl font-semibold text-blue-600 tabular-nums">
              {events.length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              every event that has actually happened
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 transition-colors duration-300 ${
              flashBatch ? "bg-amber-50 border-amber-300" : ""
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">Batch system shows</div>
            <div className="font-mono text-2xl font-semibold text-gray-800 tabular-nums">
              {events.length - liveCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              last batch added{" "}
              <span className="font-mono">+{lastBatchCount}</span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500 mb-1">Staleness</div>
            <div className="font-mono text-2xl font-semibold text-gray-800 tabular-nums">
              {(staleness / 1000).toFixed(1)}s
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-100"
                style={{ width: `${stalenessPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs text-gray-500 leading-relaxed">
          Events arrive continuously, but the batch system only learns about
          them when its next window closes. The gap between{" "}
          <span className="text-blue-600 font-medium">reality</span> and{" "}
          <span className="text-gray-800 font-medium">what the system shows</span>{" "}
          is the unavoidable cost of slicing an unbounded stream into batches.
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 sm:px-8 py-3 border-t bg-gray-50 rounded-b-2xl">
        <div className="text-xs text-gray-500">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${
              isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          {isRunning ? "Streaming" : "Paused"}
          <span className="ml-2 font-mono text-gray-400">
            t = {(now / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border rounded-md hover:bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleToggle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Start
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
