"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Film,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
} from "lucide-react";

// ─── Simulation constants ─────────────────────────────────────────────────────

/** Each tick represents ~33 ms of playback (roughly 30 fps). */
const TICK_MS = 33;

/** Wall-clock delay between auto-advance ticks when playing. */
const AUTO_INTERVAL_MS = 700;

/** Max items sitting in each buffer before back-pressure kicks in. */
const BUFFER_MAX = 4;

/** How many ticks the demo runs before pausing. */
const MAX_TICKS = 24;

// ─── Types ────────────────────────────────────────────────────────────────────

type Packet = { id: number; pts: number };

type StageKey =
  | "idle"
  | "input"
  | "demux"
  | "video_dec"
  | "audio_dec"
  | "video_buf"
  | "audio_buf"
  | "video_ren"
  | "audio_ren";

type State = {
  tick: number;
  clockMs: number;
  input: Packet | null;
  demux: Packet | null;
  videoDec: Packet | null;
  audioDec: Packet | null;
  videoBuf: Packet[];
  audioBuf: Packet[];
  videoRen: Packet | null;
  audioRen: Packet | null;
  framesRendered: number;
  samplesRendered: number;
  lastStages: StageKey[];
};

function initialState(): State {
  return {
    tick: 0,
    clockMs: 0,
    input: null,
    demux: null,
    videoDec: null,
    audioDec: null,
    videoBuf: [],
    audioBuf: [],
    videoRen: null,
    audioRen: null,
    framesRendered: 0,
    samplesRendered: 0,
    lastStages: ["idle"],
  };
}

// ─── Simulation ───────────────────────────────────────────────────────────────

/**
 * Advance the pipeline by one tick. Every stage takes one tick, and we
 * process from right to left so upstream items don't clobber downstream slots.
 */
function step(prev: State): State {
  const activated: StageKey[] = [];

  // Renderers consume whatever they were showing last tick.
  const framesRendered = prev.framesRendered + (prev.videoRen ? 1 : 0);
  const samplesRendered = prev.samplesRendered + (prev.audioRen ? 1 : 0);

  // Buffers → renderers.
  const nextVideoRen = prev.videoBuf[0] ?? null;
  const nextAudioRen = prev.audioBuf[0] ?? null;
  if (nextVideoRen) activated.push("video_ren");
  if (nextAudioRen) activated.push("audio_ren");

  const videoBufAfterPop = prev.videoBuf.slice(1);
  const audioBufAfterPop = prev.audioBuf.slice(1);

  // Decoders → buffers.
  const nextVideoBuf = [...videoBufAfterPop];
  if (prev.videoDec) {
    nextVideoBuf.push(prev.videoDec);
    activated.push("video_buf");
  }
  const nextAudioBuf = [...audioBufAfterPop];
  if (prev.audioDec) {
    nextAudioBuf.push(prev.audioDec);
    activated.push("audio_buf");
  }

  // Demux → decoders (same packet fans out into both lanes).
  const nextVideoDec = prev.demux;
  const nextAudioDec = prev.demux;
  if (prev.demux) {
    activated.push("video_dec");
    activated.push("audio_dec");
  }

  // Input → demux.
  const nextDemux = prev.input;
  if (prev.input) activated.push("demux");

  // Source pushes a new packet with a fresh PTS every tick.
  const nextTick = prev.tick + 1;
  const nextInput: Packet = {
    id: nextTick,
    pts: nextTick * TICK_MS,
  };
  activated.push("input");

  // Playback clock only advances once we're actually rendering.
  const nextClock =
    nextVideoRen !== null || prev.videoRen !== null
      ? prev.clockMs + TICK_MS
      : prev.clockMs;

  return {
    tick: nextTick,
    clockMs: nextClock,
    input: nextInput,
    demux: nextDemux,
    videoDec: nextVideoDec,
    audioDec: nextAudioDec,
    videoBuf: nextVideoBuf.slice(-BUFFER_MAX),
    audioBuf: nextAudioBuf.slice(-BUFFER_MAX),
    videoRen: nextVideoRen,
    audioRen: nextAudioRen,
    framesRendered,
    samplesRendered,
    lastStages: activated,
  };
}

// ─── Narration ────────────────────────────────────────────────────────────────

function narrateStage(s: State): { title: string; detail: string } {
  if (s.tick === 0) {
    return {
      title: "Ready",
      detail:
        "Press Play or Step. play() invokes the PlaybackController, which drives every stage below.",
    };
  }
  if (s.videoRen) {
    return {
      title: "Renderers display Frame " + s.videoRen.id,
      detail: `VideoRenderer draws frame #${s.videoRen.id} onto the surface; AudioRenderer sends the matching PCM samples to the sound card. The Synchronizer picks them because their PTS matches the PlaybackClock (${formatClock(s.clockMs)}).`,
    };
  }
  if (s.videoBuf.length > 0 || s.audioBuf.length > 0) {
    return {
      title: "Buffers filling",
      detail:
        "Decoded frames/samples land in their buffers. Buffering ahead gives the renderer a smooth supply and lets the Synchronizer wait for matching timestamps.",
    };
  }
  if (s.videoDec || s.audioDec) {
    return {
      title: "Decoding",
      detail:
        "Video Decoder decompresses H.264 packets into raw pixel frames. In parallel, the Audio Decoder decompresses AAC packets into PCM samples.",
    };
  }
  if (s.demux) {
    return {
      title: "Demux splits container",
      detail: `Demultiplexer takes .mp4 packet P${s.demux.id} and forks it into a video (H.264) packet and an audio (AAC) packet, each carrying PTS = ${s.demux.pts} ms.`,
    };
  }
  return {
    title: "Reading .mp4",
    detail: "Container packets stream in from disk or the network.",
  };
}

function formatClock(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const s = Math.floor(totalMs / 1000);
  const rem = totalMs - s * 1000;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const mmm = String(rem).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const CANVAS_W = 700;
const CANVAS_H = 420;

type Box = { x: number; y: number; w: number; h: number };

const BOX: Record<Exclude<StageKey, "idle">, Box> = {
  input: { x: 10, y: 170, w: 84, h: 90 },
  demux: { x: 110, y: 170, w: 84, h: 90 },
  video_dec: { x: 220, y: 40, w: 108, h: 70 },
  video_buf: { x: 344, y: 40, w: 108, h: 70 },
  video_ren: { x: 468, y: 22, w: 130, h: 106 },
  audio_dec: { x: 220, y: 320, w: 108, h: 70 },
  audio_buf: { x: 344, y: 320, w: 108, h: 70 },
  audio_ren: { x: 468, y: 302, w: 130, h: 106 },
};

const CLOCK_BOX = { x: 10, y: 300, w: 184, h: 96 };

// ─── Small visual helpers ─────────────────────────────────────────────────────

function PacketChip({
  id,
  kind,
  size = "md",
}: {
  id: number;
  kind: "container" | "video" | "audio";
  size?: "sm" | "md";
}) {
  const palette = {
    container: { bg: "#ede9fe", stroke: "#8b5cf6", text: "#4c1d95", prefix: "P" },
    video: { bg: "#dbeafe", stroke: "#3b82f6", text: "#1e3a8a", prefix: "V" },
    audio: { bg: "#fef3c7", stroke: "#f59e0b", text: "#78350f", prefix: "A" },
  }[kind];
  const w = size === "sm" ? 20 : 30;
  const h = size === "sm" ? 20 : 22;
  return (
    <div
      className="flex items-center justify-center rounded font-mono font-bold"
      style={{
        width: w,
        height: h,
        background: palette.bg,
        border: `1.5px solid ${palette.stroke}`,
        color: palette.text,
        fontSize: size === "sm" ? 9 : 10,
        lineHeight: 1,
      }}
    >
      {palette.prefix}
      {id}
    </div>
  );
}

function StageBox({
  box,
  title,
  subtitle,
  active,
  accent,
  children,
}: {
  box: Box;
  title: string;
  subtitle?: string;
  active: boolean;
  accent?: string;
  children?: React.ReactNode;
}) {
  const accentColor = accent ?? "#64748b";
  return (
    <div
      className="absolute rounded-lg bg-white flex flex-col"
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        border: `1.5px solid ${active ? accentColor : "#e5e7eb"}`,
        boxShadow: active ? `0 0 0 3px ${accentColor}25` : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div
        className="px-2 pt-1 pb-0.5 border-b border-gray-100"
        style={{ background: active ? `${accentColor}10` : "#f9fafb" }}
      >
        <div
          className="text-[9px] font-semibold uppercase tracking-wide leading-tight"
          style={{ color: accentColor }}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-[8px] text-gray-500 leading-tight font-mono">
            {subtitle}
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center px-1 py-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

// ─── The mini "TV" renderer ───────────────────────────────────────────────────

const TV_COLORS = [
  "#fef3c7",
  "#a7f3d0",
  "#bfdbfe",
  "#fbcfe8",
  "#e9d5ff",
  "#fed7aa",
  "#fecaca",
  "#c7d2fe",
];

function VideoScreen({
  frame,
  active,
}: {
  frame: Packet | null;
  active: boolean;
}) {
  const colors = frame
    ? [0, 1, 2, 3, 4, 5, 6, 7].map(
        i => TV_COLORS[(frame.id + i) % TV_COLORS.length],
      )
    : null;

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-1"
      style={{ opacity: frame ? 1 : 0.5 }}
    >
      <div
        className="relative rounded-sm overflow-hidden"
        style={{
          width: "100%",
          height: 44,
          background: "#020617",
          border: `1.5px solid ${active ? "#3b82f6" : "#334155"}`,
        }}
      >
        {colors ? (
          <div className="grid grid-cols-4 grid-rows-2 w-full h-full">
            {colors.map((c, i) => (
              <div
                key={i}
                style={{ background: c, transition: "background 0.2s" }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-[10px] font-mono">
            no signal
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-[10px] font-mono">
        <Film size={10} className="text-blue-500" />
        <span className="text-gray-600">
          Frame{" "}
          <span className="font-bold text-blue-700">
            #{frame ? frame.id : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}

function AudioSpeaker({
  sample,
  active,
}: {
  sample: Packet | null;
  active: boolean;
}) {
  const bars = 12;
  const seed = sample?.id ?? 0;
  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-1"
      style={{ opacity: sample ? 1 : 0.5 }}
    >
      <div
        className="flex items-end justify-center gap-[2px]"
        style={{ height: 44, width: "100%", padding: "2px 4px" }}
      >
        {Array.from({ length: bars }).map((_, i) => {
          const phase = (seed * 0.7 + i * 0.9) % 6.283;
          const h = sample
            ? 6 + Math.abs(Math.sin(phase)) * 30
            : 4;
          return (
            <div
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 1,
                background: active
                  ? "linear-gradient(180deg, #f59e0b, #b45309)"
                  : "#e5e7eb",
                transition: "height 0.2s, background 0.2s",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-[10px] font-mono">
        <Volume2 size={10} className="text-amber-500" />
        <span className="text-gray-600">
          Sample{" "}
          <span className="font-bold text-amber-700">
            #{sample ? sample.id : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Arrows overlay (SVG) ─────────────────────────────────────────────────────

function ArrowsOverlay({ activatedEdges }: { activatedEdges: Set<string> }) {
  const edges: {
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    curve?: number; // horizontal Q-curve control offset
    dashed?: boolean;
    label?: { text: string; x: number; y: number };
  }[] = [
    {
      id: "input-demux",
      from: { x: BOX.input.x + BOX.input.w, y: BOX.input.y + BOX.input.h / 2 },
      to: { x: BOX.demux.x, y: BOX.demux.y + BOX.demux.h / 2 },
    },
    {
      id: "demux-video_dec",
      from: {
        x: BOX.demux.x + BOX.demux.w,
        y: BOX.demux.y + BOX.demux.h / 2 - 20,
      },
      to: { x: BOX.video_dec.x, y: BOX.video_dec.y + BOX.video_dec.h / 2 },
      curve: 40,
    },
    {
      id: "demux-audio_dec",
      from: {
        x: BOX.demux.x + BOX.demux.w,
        y: BOX.demux.y + BOX.demux.h / 2 + 20,
      },
      to: { x: BOX.audio_dec.x, y: BOX.audio_dec.y + BOX.audio_dec.h / 2 },
      curve: 40,
    },
    {
      id: "video_dec-video_buf",
      from: {
        x: BOX.video_dec.x + BOX.video_dec.w,
        y: BOX.video_dec.y + BOX.video_dec.h / 2,
      },
      to: {
        x: BOX.video_buf.x,
        y: BOX.video_buf.y + BOX.video_buf.h / 2,
      },
    },
    {
      id: "video_buf-video_ren",
      from: {
        x: BOX.video_buf.x + BOX.video_buf.w,
        y: BOX.video_buf.y + BOX.video_buf.h / 2,
      },
      to: {
        x: BOX.video_ren.x,
        y: BOX.video_ren.y + BOX.video_ren.h / 2,
      },
    },
    {
      id: "audio_dec-audio_buf",
      from: {
        x: BOX.audio_dec.x + BOX.audio_dec.w,
        y: BOX.audio_dec.y + BOX.audio_dec.h / 2,
      },
      to: {
        x: BOX.audio_buf.x,
        y: BOX.audio_buf.y + BOX.audio_buf.h / 2,
      },
    },
    {
      id: "audio_buf-audio_ren",
      from: {
        x: BOX.audio_buf.x + BOX.audio_buf.w,
        y: BOX.audio_buf.y + BOX.audio_buf.h / 2,
      },
      to: {
        x: BOX.audio_ren.x,
        y: BOX.audio_ren.y + BOX.audio_ren.h / 2,
      },
    },
    {
      id: "clock-video_ren",
      from: {
        x: CLOCK_BOX.x + CLOCK_BOX.w - 30,
        y: CLOCK_BOX.y,
      },
      to: {
        x: BOX.video_ren.x + BOX.video_ren.w / 2 - 20,
        y: BOX.video_ren.y + BOX.video_ren.h,
      },
      dashed: true,
      label: {
        text: "sync",
        x: (CLOCK_BOX.x + CLOCK_BOX.w + BOX.video_ren.x) / 2 - 30,
        y: BOX.video_ren.y + BOX.video_ren.h + 24,
      },
    },
    {
      id: "clock-audio_ren",
      from: {
        x: CLOCK_BOX.x + CLOCK_BOX.w - 10,
        y: CLOCK_BOX.y + CLOCK_BOX.h - 10,
      },
      to: {
        x: BOX.audio_ren.x + BOX.audio_ren.w / 2 - 20,
        y: BOX.audio_ren.y,
      },
      dashed: true,
    },
  ];

  return (
    <svg
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker
          id="pipe-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
        </marker>
        <marker
          id="pipe-arrow-active"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#0f172a" />
        </marker>
        <marker
          id="pipe-arrow-sync"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
        </marker>
      </defs>

      {edges.map(edge => {
        const active = activatedEdges.has(edge.id);
        const sync = edge.dashed === true;
        const stroke = sync ? "#10b981" : active ? "#0f172a" : "#94a3b8";
        const marker = sync
          ? "url(#pipe-arrow-sync)"
          : active
            ? "url(#pipe-arrow-active)"
            : "url(#pipe-arrow)";
        const strokeWidth = active ? 2 : 1.3;
        const strokeDasharray = sync ? "4 3" : undefined;

        let d: string;
        if (edge.curve !== undefined) {
          const cx1 = edge.from.x + edge.curve;
          const cy1 = edge.from.y;
          const cx2 = edge.to.x - edge.curve;
          const cy2 = edge.to.y;
          d = `M ${edge.from.x} ${edge.from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${edge.to.x} ${edge.to.y}`;
        } else {
          d = `M ${edge.from.x} ${edge.from.y} L ${edge.to.x} ${edge.to.y}`;
        }

        return (
          <g key={edge.id}>
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              markerEnd={marker}
              style={{ transition: "stroke 0.2s" }}
            />
            {edge.label && (
              <text
                x={edge.label.x}
                y={edge.label.y}
                fontFamily="ui-monospace, monospace"
                fontSize={9}
                fill="#10b981"
                fontWeight={600}
              >
                {edge.label.text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Clock display ────────────────────────────────────────────────────────────

function ClockDisplay({
  clockMs,
  playing,
  active,
}: {
  clockMs: number;
  playing: boolean;
  active: boolean;
}) {
  return (
    <div
      className="absolute rounded-lg"
      style={{
        left: CLOCK_BOX.x,
        top: CLOCK_BOX.y,
        width: CLOCK_BOX.w,
        height: CLOCK_BOX.h,
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        border: `1.5px solid ${active ? "#10b981" : "#334155"}`,
        boxShadow: active ? "0 0 0 3px rgba(16,185,129,0.25)" : undefined,
        color: "#a7f3d0",
      }}
    >
      <div
        className="flex items-center justify-between px-2 py-1 border-b"
        style={{ borderColor: "#1e293b" }}
      >
        <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide">
          <Clock size={10} /> PlaybackClock
        </div>
        <div className="flex items-center gap-1 text-[8px] font-mono">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: playing ? "#22c55e" : "#f59e0b",
              boxShadow: playing ? "0 0 4px #22c55e" : undefined,
            }}
          />
          {playing ? "playing" : "paused"}
        </div>
      </div>
      <div className="px-3 pt-1.5 pb-2 flex flex-col items-center">
        <div
          className="font-mono font-bold tabular-nums"
          style={{ fontSize: 22, color: "#d1fae5" }}
        >
          {formatClock(clockMs)}
        </div>
        <div className="text-[8px] font-mono text-slate-400">
          drives Synchronizer → renderers
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VideoPlaybackPipelineVisualizer() {
  const [state, setState] = useState<State>(() => initialState());
  const [isPlaying, setIsPlaying] = useState(false);

  const isDone = state.tick >= MAX_TICKS;

  const advance = useCallback(() => {
    setState(prev => step(prev));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    const t = setTimeout(advance, AUTO_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [isPlaying, isDone, state.tick, advance]);

  const reset = () => {
    setState(initialState());
    setIsPlaying(false);
  };

  const activeStages = useMemo(
    () => new Set(state.lastStages),
    [state.lastStages],
  );

  // Which arrows to highlight: any arrow whose destination stage was activated.
  const activatedEdges = useMemo(() => {
    const s = new Set<string>();
    if (activeStages.has("demux")) s.add("input-demux");
    if (activeStages.has("video_dec")) s.add("demux-video_dec");
    if (activeStages.has("audio_dec")) s.add("demux-audio_dec");
    if (activeStages.has("video_buf")) s.add("video_dec-video_buf");
    if (activeStages.has("audio_buf")) s.add("audio_dec-audio_buf");
    if (activeStages.has("video_ren")) s.add("video_buf-video_ren");
    if (activeStages.has("audio_ren")) s.add("audio_buf-audio_ren");
    return s;
  }, [activeStages]);

  const narration = narrateStage(state);

  const avDriftMs = state.videoRen
    ? state.videoRen.pts - state.clockMs + TICK_MS
    : 0;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-md"
            style={{
              width: 26,
              height: 26,
              background: "#0f172a",
              color: "#10b981",
            }}
          >
            <Play size={13} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-800">
              Video Player
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              tick {state.tick} · {formatClock(state.clockMs)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <Film size={12} className="text-blue-500" />
            <span className="font-mono">{state.framesRendered} frames</span>
          </div>
          <div className="flex items-center gap-1">
            <Volume2 size={12} className="text-amber-500" />
            <span className="font-mono">{state.samplesRendered} samples</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-emerald-500" />
            <span className="font-mono">
              drift {avDriftMs >= 0 ? "+" : ""}
              {avDriftMs} ms
            </span>
          </div>
        </div>
      </div>

      {/* Main body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Left: pipeline canvas */}
        <div className="p-4 min-w-0 overflow-x-auto">
          <div
            className="relative mx-auto"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              maxWidth: "100%",
            }}
          >
            <ArrowsOverlay activatedEdges={activatedEdges} />

            {/* Input */}
            <StageBox
              box={BOX.input}
              title=".mp4 packets"
              subtitle="container"
              active={activeStages.has("input")}
              accent="#8b5cf6"
            >
              <div className="flex flex-col items-center gap-0.5">
                {state.input ? (
                  <PacketChip id={state.input.id} kind="container" />
                ) : (
                  <span className="text-[9px] text-gray-400">—</span>
                )}
                <span className="text-[8px] text-gray-500 font-mono">
                  arriving
                </span>
              </div>
            </StageBox>

            {/* Demux */}
            <StageBox
              box={BOX.demux}
              title="Demux"
              subtitle="V/A split"
              active={activeStages.has("demux")}
              accent="#64748b"
            >
              {state.demux ? (
                <div className="flex flex-col items-center gap-1">
                  <PacketChip id={state.demux.id} kind="container" />
                  <div className="flex gap-1">
                    <PacketChip
                      id={state.demux.id}
                      kind="video"
                      size="sm"
                    />
                    <PacketChip
                      id={state.demux.id}
                      kind="audio"
                      size="sm"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-[9px] text-gray-400">—</span>
              )}
            </StageBox>

            {/* Video Decoder */}
            <StageBox
              box={BOX.video_dec}
              title="Video Decoder"
              subtitle="H.264 → frame"
              active={activeStages.has("video_dec")}
              accent="#3b82f6"
            >
              {state.videoDec ? (
                <PacketChip id={state.videoDec.id} kind="video" />
              ) : (
                <span className="text-[9px] text-gray-400">idle</span>
              )}
            </StageBox>

            {/* Video Buffer */}
            <StageBox
              box={BOX.video_buf}
              title="Video Buffer"
              subtitle={`queue ${state.videoBuf.length}/${BUFFER_MAX}`}
              active={activeStages.has("video_buf")}
              accent="#3b82f6"
            >
              {state.videoBuf.length === 0 ? (
                <span className="text-[9px] text-gray-400">empty</span>
              ) : (
                <div className="flex gap-1 flex-wrap justify-center">
                  {state.videoBuf.map((p, i) => (
                    <PacketChip
                      key={i}
                      id={p.id}
                      kind="video"
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </StageBox>

            {/* Video Renderer (TV) */}
            <StageBox
              box={BOX.video_ren}
              title="Video Renderer"
              subtitle="displays frame"
              active={activeStages.has("video_ren")}
              accent="#3b82f6"
            >
              <VideoScreen
                frame={state.videoRen}
                active={activeStages.has("video_ren")}
              />
            </StageBox>

            {/* Audio Decoder */}
            <StageBox
              box={BOX.audio_dec}
              title="Audio Decoder"
              subtitle="AAC → PCM"
              active={activeStages.has("audio_dec")}
              accent="#f59e0b"
            >
              {state.audioDec ? (
                <PacketChip id={state.audioDec.id} kind="audio" />
              ) : (
                <span className="text-[9px] text-gray-400">idle</span>
              )}
            </StageBox>

            {/* Audio Buffer */}
            <StageBox
              box={BOX.audio_buf}
              title="Audio Buffer"
              subtitle={`queue ${state.audioBuf.length}/${BUFFER_MAX}`}
              active={activeStages.has("audio_buf")}
              accent="#f59e0b"
            >
              {state.audioBuf.length === 0 ? (
                <span className="text-[9px] text-gray-400">empty</span>
              ) : (
                <div className="flex gap-1 flex-wrap justify-center">
                  {state.audioBuf.map((p, i) => (
                    <PacketChip
                      key={i}
                      id={p.id}
                      kind="audio"
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </StageBox>

            {/* Audio Renderer (Speaker) */}
            <StageBox
              box={BOX.audio_ren}
              title="Audio Renderer"
              subtitle="plays samples"
              active={activeStages.has("audio_ren")}
              accent="#f59e0b"
            >
              <AudioSpeaker
                sample={state.audioRen}
                active={activeStages.has("audio_ren")}
              />
            </StageBox>

            {/* Playback Clock */}
            <ClockDisplay
              clockMs={state.clockMs}
              playing={isPlaying}
              active={
                activeStages.has("video_ren") ||
                activeStages.has("audio_ren")
              }
            />
          </div>
        </div>

        {/* Right: narration + legend */}
        <div className="p-5 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {narration.title}
            </span>
            <p className="text-xs text-gray-700 leading-relaxed">
              {narration.detail}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Buffers
            </span>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1 text-[11px] items-center">
              <span className="flex items-center gap-1 text-blue-700">
                <Film size={11} /> Video
              </span>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-200"
                  style={{
                    width: `${(state.videoBuf.length / BUFFER_MAX) * 100}%`,
                  }}
                />
              </div>
              <span className="font-mono tabular-nums text-gray-600">
                {state.videoBuf.length}/{BUFFER_MAX}
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <Volume2 size={11} /> Audio
              </span>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-200"
                  style={{
                    width: `${(state.audioBuf.length / BUFFER_MAX) * 100}%`,
                  }}
                />
              </div>
              <span className="font-mono tabular-nums text-gray-600">
                {state.audioBuf.length}/{BUFFER_MAX}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Legend
            </span>
            <div className="flex flex-col gap-1 text-[10px] text-gray-600">
              <div className="flex items-center gap-2">
                <PacketChip id={0} kind="container" size="sm" />
                <span>
                  <span className="font-mono">P#</span> — container packet
                  from <span className="font-mono">.mp4</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PacketChip id={0} kind="video" size="sm" />
                <span>
                  <span className="font-mono">V#</span> — video packet /
                  decoded frame
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PacketChip id={0} kind="audio" size="sm" />
                <span>
                  <span className="font-mono">A#</span> — audio packet /
                  decoded sample
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg width={30} height={8}>
                  <line
                    x1={2}
                    y1={4}
                    x2={26}
                    y2={4}
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    markerEnd="url(#pipe-arrow-sync)"
                  />
                </svg>
                <span>Sync from PlaybackClock (matches PTS to time)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-gray-100 px-5 py-4 flex gap-2 items-center">
        <button
          type="button"
          onClick={() => {
            if (isDone) {
              reset();
              return;
            }
            setIsPlaying(p => !p);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isPlaying || isDone) return;
            advance();
          }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{ width: `${(state.tick / MAX_TICKS) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {Math.min(state.tick, MAX_TICKS)}/{MAX_TICKS}
          </span>
        </div>
      </div>
    </div>
  );
}
