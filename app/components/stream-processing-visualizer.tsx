"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

type StreamEvent = {
  id: number;
  /** Time (ms since visualizer start) when the event arrived. */
  t: number;
  /** Simulated end-to-end processing latency in ms (event → result). */
  latencyMs: number;
};

const TIMELINE_WINDOW_MS = 18_000;
const TICK_MS = 100;
const MIN_LATENCY_MS = 8;
const MAX_LATENCY_MS = 35;

export default function StreamProcessingVisualizer() {
  const [eventIntervalMs, setEventIntervalMs] = useState(600);
  const [now, setNow] = useState(0);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pulseAt, setPulseAt] = useState(0);

  const startRef = useRef<number>(0);
  const lastEventAtRef = useRef<number>(0);
  const eventIdRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) return;

    startRef.current = performance.now() - now;

    const interval = setInterval(() => {
      const t = performance.now() - startRef.current;
      setNow(t);

      if (t - lastEventAtRef.current >= eventIntervalMs) {
        lastEventAtRef.current = t;
        const latencyMs =
          MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
        setEvents((prev) => [
          ...prev.filter((e) => t - e.t < TIMELINE_WINDOW_MS + 2_000),
          { id: eventIdRef.current++, t, latencyMs },
        ]);
        setPulseAt(t);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, eventIntervalMs]);

  const handleToggle = () => setIsRunning((r) => !r);

  const handleReset = () => {
    setIsRunning(false);
    setNow(0);
    setEvents([]);
    setPulseAt(0);
    lastEventAtRef.current = 0;
    eventIdRef.current = 0;
  };

  const windowStart = Math.max(0, now - TIMELINE_WINDOW_MS);
  const visibleEvents = events.filter((e) => e.t >= windowStart);
  const toPct = (t: number) =>
    ((t - windowStart) / TIMELINE_WINDOW_MS) * 100;

  const avgLatency =
    events.length === 0
      ? 0
      : events.reduce((sum, e) => sum + e.latencyMs, 0) / events.length;

  const pulseAge = now - pulseAt;
  const pulseAlpha = pulseAt > 0 && pulseAge < 600 ? 1 - pulseAge / 600 : 0;

  const eventsPerSec = (1000 / eventIntervalMs).toFixed(1);

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-6 sm:p-8 w-full">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="text-sm text-gray-500">
            Continuous events &middot; processed at{" "}
            <span className="font-mono font-medium text-emerald-700">
              ~{eventsPerSec}/s
            </span>{" "}
            with no batching
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">event rate</span>
            <input
              type="range"
              min={200}
              max={1500}
              step={100}
              value={1700 - eventIntervalMs}
              onChange={(e) =>
                setEventIntervalMs(1700 - Number(e.target.value))
              }
              className="accent-emerald-600"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Continuous flow (events arrive &amp; emit instantly)</span>
            <span className="font-mono">now</span>
          </div>

          <div className="relative h-14 rounded-lg bg-gradient-to-r from-emerald-50/0 via-emerald-50/40 to-emerald-50 border overflow-hidden">
            <div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-emerald-300/70"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(16,185,129,0.55) 0 6px, rgba(16,185,129,0) 6px 10px)",
              }}
            />

            {visibleEvents.map((e) => {
              const age = now - e.t;
              const arriving = age < e.latencyMs;
              return (
                <div
                  key={e.id}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-colors duration-200 ${
                    arriving ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                  style={{ left: `${toPct(e.t)}%` }}
                />
              );
            })}

            <div
              className="absolute top-0 bottom-0"
              style={{ left: `${toPct(now)}%` }}
            >
              {pulseAlpha > 0 && (
                <div
                  className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500"
                  style={{
                    width: 28 + (1 - pulseAlpha) * 40,
                    height: 28 + (1 - pulseAlpha) * 40,
                    opacity: pulseAlpha * 0.7,
                  }}
                />
              )}
              <div className="absolute top-0 bottom-0 w-px bg-emerald-600" />
              <div className="absolute -top-1 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>-{(TIMELINE_WINDOW_MS / 1000).toFixed(0)}s</span>
            <span>
              event arrival (blue) &middot; processed (green) &middot; no batch
              boundaries
            </span>
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

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500 mb-1">
              Stream system shows
            </div>
            <div className="font-mono text-2xl font-semibold text-emerald-600 tabular-nums">
              {events.length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              updated the moment each event is emitted
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-gray-500 mb-1">
              End-to-end latency
            </div>
            <div className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
              {avgLatency.toFixed(0)}
              <span className="text-sm text-gray-400 font-normal ml-1">ms</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-100"
                style={{
                  width: `${Math.min(100, (avgLatency / 200) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs text-gray-500 leading-relaxed">
          Each event is processed the instant it&apos;s generated. The system
          is{" "}
          <span className="text-emerald-700 font-medium">pushed</span> a
          notification per event rather than{" "}
          <span className="text-gray-800 font-medium">polling</span> for
          changes — so{" "}
          <span className="text-blue-600 font-medium">reality</span> and{" "}
          <span className="text-emerald-700 font-medium">
            what the system shows
          </span>{" "}
          stay locked together with only milliseconds of lag.
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
