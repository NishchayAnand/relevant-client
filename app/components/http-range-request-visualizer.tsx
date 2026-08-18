"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Cloud,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_BYTES = 12 * 1024 * 1024; // 12 MB clip
const MOOV_END = 256 * 1024; // metadata (moov atom) sits in the first 256 KB
const VIDEO_DURATION_S = 120; // 2-minute clip
const CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB per media fetch — ~20s of buffer

// ─── Types ────────────────────────────────────────────────────────────────────

type ByteRange = { start: number; end: number };

type StepKind =
  | "request"
  | "response"
  | "parse-metadata"
  | "play"
  | "seek"
  | "wait";

type Step = {
  kind: StepKind;
  range?: ByteRange;
  playhead?: number;
  narration: string;
};

type Preset = {
  id: string;
  label: string;
  description: string;
  steps: Step[];
};

type Message = {
  kind: "request" | "response";
  method?: "GET";
  status?: number;
  range?: ByteRange;
  atStep: number;
};

type SimState = {
  downloaded: ByteRange[];
  inflight: ByteRange | null;
  playhead: number;
  narration: string;
  currentMessage: Message | null;
  metadataLoaded: boolean;
  history: Message[];
  seekedTo?: number;
  isBufferHit?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bytesToTime(byte: number): number {
  if (byte <= MOOV_END) return 0;
  return (
    ((byte - MOOV_END) / (TOTAL_BYTES - MOOV_END)) * VIDEO_DURATION_S
  );
}

function timeToBytes(time: number): number {
  return Math.floor(
    MOOV_END + (time / VIDEO_DURATION_S) * (TOTAL_BYTES - MOOV_END),
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(s: number): string {
  const clamped = Math.max(0, Math.min(VIDEO_DURATION_S, s));
  const mm = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}

function mergeRanges(ranges: ByteRange[]): ByteRange[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: ByteRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].start <= last.end + 1) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

function isTimeBuffered(ranges: ByteRange[], time: number): boolean {
  const byte = timeToBytes(time);
  return ranges.some(r => byte >= r.start && byte <= r.end);
}

function rangeSize(r: ByteRange): number {
  return r.end - r.start + 1;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const SEEK_FWD_BYTE = timeToBytes(90);
const SEEK_FWD_CHUNK_END = Math.min(TOTAL_BYTES - 1, SEEK_FWD_BYTE + CHUNK_BYTES - 1);

const PRESETS: Preset[] = [
  {
    id: "sequential",
    label: "Sequential Playback",
    description: "Load metadata, buffer ahead, and stream in order.",
    steps: [
      {
        kind: "request",
        range: { start: 0, end: MOOV_END - 1 },
        narration:
          "Browser sends its first GET with Range: bytes=0-262143 to fetch just the moov atom (metadata).",
      },
      {
        kind: "response",
        range: { start: 0, end: MOOV_END - 1 },
        narration:
          "Server replies 206 Partial Content with the metadata — codec, duration, and the sample-to-byte table.",
      },
      {
        kind: "parse-metadata",
        narration:
          "Browser parses moov: duration=120s, video=H.264, audio=AAC. It now knows how to translate playback time → byte offset.",
      },
      {
        kind: "request",
        range: { start: MOOV_END, end: MOOV_END + CHUNK_BYTES - 1 },
        narration:
          "Second GET fetches the first ~2 MB of media data — enough to start playback with a healthy buffer.",
      },
      {
        kind: "response",
        range: { start: MOOV_END, end: MOOV_END + CHUNK_BYTES - 1 },
        narration:
          "First mdat chunk arrives as 206 Partial Content. Buffered window is now ~0–22s.",
      },
      {
        kind: "play",
        playhead: 4,
        narration: "Playback starts. Playhead at 4s, plenty of buffer ahead.",
      },
      {
        kind: "play",
        playhead: 12,
        narration: "Playhead at 12s. The buffer window is starting to shrink.",
      },
      {
        kind: "request",
        range: {
          start: MOOV_END + CHUNK_BYTES,
          end: MOOV_END + 2 * CHUNK_BYTES - 1,
        },
        narration:
          "Buffer-ahead refill: browser preemptively requests the next 2 MB before the buffer drains.",
      },
      {
        kind: "response",
        range: {
          start: MOOV_END + CHUNK_BYTES,
          end: MOOV_END + 2 * CHUNK_BYTES - 1,
        },
        narration:
          "Second mdat chunk arrives. Continuous playback is maintained without a stall.",
      },
      {
        kind: "play",
        playhead: 24,
        narration: "Playhead at 24s. Streaming continues sequentially.",
      },
    ],
  },
  {
    id: "seek-forward",
    label: "Seek Forward (Unbuffered)",
    description: "User jumps past the buffered window — a new range fetch is required.",
    steps: [
      {
        kind: "request",
        range: { start: 0, end: MOOV_END - 1 },
        narration: "Initial metadata fetch.",
      },
      {
        kind: "response",
        range: { start: 0, end: MOOV_END - 1 },
        narration: "Metadata received.",
      },
      {
        kind: "request",
        range: { start: MOOV_END, end: MOOV_END + CHUNK_BYTES - 1 },
        narration: "Fetch the first 2 MB of media.",
      },
      {
        kind: "response",
        range: { start: MOOV_END, end: MOOV_END + CHUNK_BYTES - 1 },
        narration: "First mdat chunk received. Buffered 0–22s.",
      },
      {
        kind: "play",
        playhead: 6,
        narration: "Playback at 6s.",
      },
      {
        kind: "seek",
        playhead: 90,
        narration:
          "User scrubs to 90s — well outside the buffered window. Any in-flight fetch is cancelled.",
      },
      {
        kind: "request",
        range: { start: SEEK_FWD_BYTE, end: SEEK_FWD_CHUNK_END },
        narration:
          "New GET with Range header pointing directly at the byte offset for 90s. No wasted bytes from 22s→90s.",
      },
      {
        kind: "response",
        range: { start: SEEK_FWD_BYTE, end: SEEK_FWD_CHUNK_END },
        narration:
          "Server jumps to that offset and streams a fresh 2 MB of mdat. This is why range requests make seeking cheap.",
      },
      {
        kind: "play",
        playhead: 94,
        narration: "Playback resumes from 90s.",
      },
    ],
  },
  {
    id: "seek-backward",
    label: "Seek Backward (Buffered)",
    description: "Seek into an already-downloaded range — no network round-trip.",
    steps: [
      {
        kind: "request",
        range: { start: 0, end: MOOV_END - 1 },
        narration: "Initial metadata fetch.",
      },
      {
        kind: "response",
        range: { start: 0, end: MOOV_END - 1 },
        narration: "Metadata received.",
      },
      {
        kind: "request",
        range: { start: MOOV_END, end: MOOV_END + CHUNK_BYTES - 1 },
        narration: "Initial mdat fetch.",
      },
      {
        kind: "response",
        range: { start: MOOV_END, end: MOOV_END + CHUNK_BYTES - 1 },
        narration: "Buffered 0–22s.",
      },
      {
        kind: "play",
        playhead: 15,
        narration: "Playhead at 15s.",
      },
      {
        kind: "seek",
        playhead: 3,
        narration:
          "User scrubs back to 3s. The byte for 3s is already inside the buffered range.",
      },
      {
        kind: "wait",
        narration:
          "Cache hit: no HTTP request is issued. Playback resumes instantly from the local buffer.",
      },
      {
        kind: "play",
        playhead: 8,
        narration:
          "Playhead resumes from 3s and moves forward. Zero network traffic used for this seek.",
      },
    ],
  },
];

// ─── Simulation ───────────────────────────────────────────────────────────────

function simulate(preset: Preset, stepIdx: number): SimState {
  const state: SimState = {
    downloaded: [],
    inflight: null,
    playhead: 0,
    narration: "Press Play or click a step to start.",
    currentMessage: null,
    metadataLoaded: false,
    history: [],
  };
  for (let i = 0; i <= stepIdx && i < preset.steps.length; i++) {
    const step = preset.steps[i];
    switch (step.kind) {
      case "request": {
        state.inflight = step.range ?? null;
        state.currentMessage = {
          kind: "request",
          method: "GET",
          range: step.range,
          atStep: i,
        };
        state.history = [
          ...state.history,
          { kind: "request", method: "GET", range: step.range, atStep: i },
        ];
        state.narration = step.narration;
        break;
      }
      case "response": {
        if (step.range) {
          state.downloaded = mergeRanges([...state.downloaded, step.range]);
        }
        state.inflight = null;
        state.currentMessage = {
          kind: "response",
          status: 206,
          range: step.range,
          atStep: i,
        };
        state.history = [
          ...state.history,
          { kind: "response", status: 206, range: step.range, atStep: i },
        ];
        state.narration = step.narration;
        break;
      }
      case "parse-metadata": {
        state.metadataLoaded = true;
        state.currentMessage = null;
        state.narration = step.narration;
        break;
      }
      case "play": {
        if (step.playhead !== undefined) state.playhead = step.playhead;
        state.currentMessage = null;
        state.narration = step.narration;
        break;
      }
      case "seek": {
        if (step.playhead !== undefined) {
          state.playhead = step.playhead;
          state.seekedTo = step.playhead;
          state.isBufferHit = isTimeBuffered(state.downloaded, step.playhead);
        }
        state.inflight = null;
        state.currentMessage = null;
        state.narration = step.narration;
        break;
      }
      case "wait": {
        state.currentMessage = null;
        state.narration = step.narration;
        break;
      }
    }
  }
  return state;
}

// ─── Layout constants (SVG) ───────────────────────────────────────────────────

const CANVAS_W = 720;
const CANVAS_H = 460;

const FILE_BAR_X = 90;
const FILE_BAR_W = 600;
const FILE_BAR_Y = 62;
const FILE_BAR_H = 30;

const TIMELINE_X = 90;
const TIMELINE_W = 600;
const TIMELINE_Y = 410;
const TIMELINE_H = 22;

const SERVER_LABEL_Y = 26;
const CLIENT_LABEL_Y = 372;

const ARROW_TOP_Y = FILE_BAR_Y + FILE_BAR_H + 30; // ~122
const ARROW_BOTTOM_Y = CLIENT_LABEL_Y - 30; // ~342

// ─── Byte/time bar helpers ────────────────────────────────────────────────────

function byteToBarX(byte: number): number {
  return FILE_BAR_X + (byte / (TOTAL_BYTES - 1)) * FILE_BAR_W;
}

function timeToBarX(time: number): number {
  return (
    TIMELINE_X + (Math.max(0, Math.min(VIDEO_DURATION_S, time)) / VIDEO_DURATION_S) * TIMELINE_W
  );
}

function rangeToTimeSpan(r: ByteRange): { start: number; end: number } {
  return { start: bytesToTime(r.start), end: bytesToTime(r.end) };
}

// ─── Server-side file bar ─────────────────────────────────────────────────────

function ServerFileBar({
  downloaded,
  inflight,
}: {
  downloaded: ByteRange[];
  inflight: ByteRange | null;
}) {
  const moovX = byteToBarX(0);
  const moovW = byteToBarX(MOOV_END) - moovX;
  return (
    <g>
      {/* Base file bar */}
      <rect
        x={FILE_BAR_X}
        y={FILE_BAR_Y}
        width={FILE_BAR_W}
        height={FILE_BAR_H}
        rx={4}
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth={1}
      />
      {/* moov atom region */}
      <rect
        x={moovX}
        y={FILE_BAR_Y}
        width={Math.max(3, moovW)}
        height={FILE_BAR_H}
        fill="#dbeafe"
        stroke="#93c5fd"
        strokeWidth={1}
        rx={3}
      />
      {/* Downloaded overlay (green) */}
      {downloaded.map((r, i) => {
        const x = byteToBarX(r.start);
        const w = Math.max(1, byteToBarX(r.end) - x);
        return (
          <rect
            key={`d-${i}`}
            x={x}
            y={FILE_BAR_Y + 3}
            width={w}
            height={FILE_BAR_H - 6}
            fill="#10b981"
            fillOpacity={0.55}
            stroke="#059669"
            strokeWidth={0.75}
            rx={2}
          />
        );
      })}
      {/* Inflight overlay (orange pulse) */}
      {inflight && (
        <rect
          x={byteToBarX(inflight.start)}
          y={FILE_BAR_Y + 3}
          width={Math.max(2, byteToBarX(inflight.end) - byteToBarX(inflight.start))}
          height={FILE_BAR_H - 6}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 3"
          rx={2}
        >
          <animate
            attributeName="stroke-opacity"
            values="1;0.35;1"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </rect>
      )}
      {/* Byte tick labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const byte = Math.round(frac * TOTAL_BYTES);
        const x = byteToBarX(byte);
        return (
          <g key={`tick-${frac}`}>
            <line
              x1={x}
              y1={FILE_BAR_Y + FILE_BAR_H}
              x2={x}
              y2={FILE_BAR_Y + FILE_BAR_H + 4}
              stroke="#9ca3af"
              strokeWidth={1}
            />
            <text
              x={x}
              y={FILE_BAR_Y + FILE_BAR_H + 15}
              textAnchor="middle"
              fontSize={9}
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              fill="#6b7280"
            >
              {formatBytes(byte)}
            </text>
          </g>
        );
      })}
      {/* moov label */}
      <text
        x={moovX + moovW / 2}
        y={FILE_BAR_Y - 4}
        textAnchor="middle"
        fontSize={9}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fill="#2563eb"
        fontWeight={600}
      >
        moov
      </text>
      {/* mdat label */}
      <text
        x={FILE_BAR_X + (byteToBarX(MOOV_END) - FILE_BAR_X) + (FILE_BAR_W - (byteToBarX(MOOV_END) - FILE_BAR_X)) / 2}
        y={FILE_BAR_Y - 4}
        textAnchor="middle"
        fontSize={9}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fill="#6b7280"
        fontWeight={600}
      >
        mdat (audio + video samples)
      </text>
    </g>
  );
}

// ─── Client-side timeline ─────────────────────────────────────────────────────

function ClientTimeline({
  downloaded,
  playhead,
  seekedTo,
}: {
  downloaded: ByteRange[];
  playhead: number;
  seekedTo?: number;
}) {
  const bufferedTimeRanges = downloaded
    .map(rangeToTimeSpan)
    .filter(r => r.end > 0);
  return (
    <g>
      {/* Base timeline */}
      <rect
        x={TIMELINE_X}
        y={TIMELINE_Y}
        width={TIMELINE_W}
        height={TIMELINE_H}
        rx={4}
        fill="#f3f4f6"
        stroke="#d1d5db"
        strokeWidth={1}
      />
      {/* Buffered segments */}
      {bufferedTimeRanges.map((r, i) => {
        const x = timeToBarX(r.start);
        const w = Math.max(1, timeToBarX(r.end) - x);
        return (
          <rect
            key={`buf-${i}`}
            x={x}
            y={TIMELINE_Y + 3}
            width={w}
            height={TIMELINE_H - 6}
            fill="#10b981"
            fillOpacity={0.55}
            rx={2}
          />
        );
      })}
      {/* Playhead */}
      <g>
        <line
          x1={timeToBarX(playhead)}
          y1={TIMELINE_Y - 4}
          x2={timeToBarX(playhead)}
          y2={TIMELINE_Y + TIMELINE_H + 4}
          stroke="#dc2626"
          strokeWidth={2}
        />
        <circle
          cx={timeToBarX(playhead)}
          cy={TIMELINE_Y + TIMELINE_H / 2}
          r={4.5}
          fill="#dc2626"
        />
      </g>
      {/* Seek marker (when seeking to a specific time) */}
      {seekedTo !== undefined && Math.abs(seekedTo - playhead) < 0.01 && (
        <g>
          <circle
            cx={timeToBarX(seekedTo)}
            cy={TIMELINE_Y + TIMELINE_H / 2}
            r={9}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.5}
          >
            <animate
              attributeName="r"
              values="9;13;9"
              dur="1.1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.9;0.15;0.9"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
      {/* Ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const t = frac * VIDEO_DURATION_S;
        const x = timeToBarX(t);
        return (
          <g key={`ttick-${frac}`}>
            <line
              x1={x}
              y1={TIMELINE_Y + TIMELINE_H}
              x2={x}
              y2={TIMELINE_Y + TIMELINE_H + 4}
              stroke="#9ca3af"
              strokeWidth={1}
            />
            <text
              x={x}
              y={TIMELINE_Y + TIMELINE_H + 15}
              textAnchor="middle"
              fontSize={9}
              fontFamily="ui-monospace, SFMono-Regular, monospace"
              fill="#6b7280"
            >
              {formatTime(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Middle band: animated request/response arrow ─────────────────────────────

function MessageArrow({ message }: { message: Message | null }) {
  const centerX = CANVAS_W / 2;

  if (!message) {
    return (
      <g>
        {/* Faded static bidirectional hint */}
        <line
          x1={centerX}
          y1={ARROW_TOP_Y}
          x2={centerX}
          y2={ARROW_BOTTOM_Y}
          stroke="#e5e7eb"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        <text
          x={centerX + 12}
          y={(ARROW_TOP_Y + ARROW_BOTTOM_Y) / 2}
          fontSize={10}
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          fill="#9ca3af"
        >
          HTTP/1.1 · idle
        </text>
      </g>
    );
  }

  const isRequest = message.kind === "request";
  const color = isRequest ? "#f59e0b" : "#059669";
  const stroke = isRequest ? "#d97706" : "#047857";
  // Request arrow points UP (client → server). Response arrow points DOWN.
  const y1 = isRequest ? ARROW_BOTTOM_Y : ARROW_TOP_Y;
  const y2 = isRequest ? ARROW_TOP_Y : ARROW_BOTTOM_Y;

  const labelLines = isRequest
    ? [
        "GET /video.mp4 HTTP/1.1",
        `Range: bytes=${message.range?.start}-${message.range?.end}`,
      ]
    : [
        `HTTP/1.1 ${message.status ?? 206} Partial Content`,
        `Content-Range: bytes=${message.range?.start}-${message.range?.end}/${TOTAL_BYTES}`,
      ];

  // Animated packet position along the arrow
  const packetTravelFrom = y1;
  const packetTravelTo = y2;

  return (
    <g>
      {/* Arrow line */}
      <line
        x1={centerX}
        y1={y1}
        x2={centerX}
        y2={y2}
        stroke={stroke}
        strokeWidth={2}
        markerEnd={isRequest ? "url(#arrow-up)" : "url(#arrow-down)"}
      />
      {/* Animated packet */}
      <circle r={5} fill={color} stroke={stroke} strokeWidth={1} cx={centerX}>
        <animate
          attributeName="cy"
          from={packetTravelFrom}
          to={packetTravelTo}
          dur="0.9s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Header lines */}
      <g>
        <rect
          x={centerX + 14}
          y={(y1 + y2) / 2 - 20}
          width={260}
          height={40}
          rx={5}
          fill="#ffffff"
          stroke={stroke}
          strokeWidth={1}
        />
        {labelLines.map((line, i) => (
          <text
            key={i}
            x={centerX + 22}
            y={(y1 + y2) / 2 - 6 + i * 14}
            fontSize={10}
            fontFamily="ui-monospace, SFMono-Regular, monospace"
            fill="#111827"
            fontWeight={i === 0 ? 700 : 400}
          >
            {line}
          </text>
        ))}
      </g>
      {/* Direction icon on the left of arrow */}
      <g transform={`translate(${centerX - 34}, ${(y1 + y2) / 2 - 8})`}>
        <rect
          width={20}
          height={16}
          rx={4}
          fill={color}
          fillOpacity={0.15}
          stroke={stroke}
          strokeWidth={1}
        />
        <text
          x={10}
          y={12}
          textAnchor="middle"
          fontSize={9}
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          fontWeight={700}
          fill={stroke}
        >
          {isRequest ? "REQ" : "RES"}
        </text>
      </g>
    </g>
  );
}

// ─── Server & Client badges ───────────────────────────────────────────────────

function ServerBadge() {
  return (
    <g>
      <rect
        x={FILE_BAR_X - 10}
        y={SERVER_LABEL_Y - 14}
        width={140}
        height={20}
        rx={10}
        fill="#eff6ff"
        stroke="#93c5fd"
        strokeWidth={1}
      />
      <circle cx={FILE_BAR_X - 2} cy={SERVER_LABEL_Y - 4} r={5} fill="#2563eb" />
      <text
        x={FILE_BAR_X + 8}
        y={SERVER_LABEL_Y}
        fontSize={11}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fill="#1e3a8a"
        fontWeight={600}
      >
        Server · video.mp4
      </text>
      <text
        x={FILE_BAR_X + FILE_BAR_W}
        y={SERVER_LABEL_Y}
        textAnchor="end"
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fill="#6b7280"
      >
        Accept-Ranges: bytes · {formatBytes(TOTAL_BYTES)}
      </text>
    </g>
  );
}

function ClientBadge({
  metadataLoaded,
  buffered,
  playhead,
  isPlaying,
}: {
  metadataLoaded: boolean;
  buffered: number;
  playhead: number;
  isPlaying: boolean;
}) {
  return (
    <g>
      <rect
        x={TIMELINE_X - 10}
        y={CLIENT_LABEL_Y - 14}
        width={170}
        height={20}
        rx={10}
        fill="#f0fdf4"
        stroke="#86efac"
        strokeWidth={1}
      />
      <circle cx={TIMELINE_X - 2} cy={CLIENT_LABEL_Y - 4} r={5} fill="#059669" />
      <text
        x={TIMELINE_X + 8}
        y={CLIENT_LABEL_Y}
        fontSize={11}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fill="#064e3b"
        fontWeight={600}
      >
        Browser · &lt;video&gt;
      </text>
      <text
        x={TIMELINE_X + TIMELINE_W}
        y={CLIENT_LABEL_Y}
        textAnchor="end"
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fill="#6b7280"
      >
        {metadataLoaded ? "moov ✓" : "moov …"} · buffered {formatBytes(buffered)} · {formatTime(playhead)} {isPlaying ? "▶" : "❚❚"}
      </text>
    </g>
  );
}

// ─── Arrow markers ────────────────────────────────────────────────────────────

function ArrowDefs() {
  return (
    <defs>
      <marker
        id="arrow-down"
        viewBox="0 0 10 10"
        refX={9}
        refY={5}
        markerWidth={7}
        markerHeight={7}
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#047857" />
      </marker>
      <marker
        id="arrow-up"
        viewBox="0 0 10 10"
        refX={9}
        refY={5}
        markerWidth={7}
        markerHeight={7}
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
      </marker>
    </defs>
  );
}

// ─── HTTP console (side panel) ────────────────────────────────────────────────

function HttpConsole({
  currentMessage,
  history,
}: {
  currentMessage: Message | null;
  history: Message[];
}) {
  const activeReq =
    currentMessage?.kind === "request"
      ? currentMessage
      : [...history].reverse().find(m => m.kind === "request") ?? null;
  const activeRes =
    currentMessage?.kind === "response"
      ? currentMessage
      : [...history].reverse().find(m => m.kind === "response") ?? null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <span className="text-[10px] uppercase font-semibold tracking-wide text-gray-500">
          HTTP Console
        </span>
        <span className="text-[10px] text-gray-400 font-mono">DevTools · Network</span>
      </div>
      {/* Request */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
            <ArrowUp size={11} /> Request
          </span>
          {activeReq && currentMessage?.kind === "request" && (
            <span className="text-[9px] text-amber-500 font-mono ml-auto animate-pulse">
              in flight…
            </span>
          )}
        </div>
        {activeReq ? (
          <pre className="text-[10.5px] font-mono leading-snug text-gray-800 whitespace-pre-wrap">
{`GET /video.mp4 HTTP/1.1
Host: cdn.example.com
Range: bytes=${activeReq.range?.start}-${activeReq.range?.end}
Accept: video/mp4`}
          </pre>
        ) : (
          <p className="text-[10.5px] text-gray-400 font-mono italic">
            No request yet.
          </p>
        )}
      </div>
      {/* Response */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <ArrowDown size={11} /> Response
          </span>
          {activeRes && currentMessage?.kind === "response" && (
            <span className="text-[9px] text-emerald-500 font-mono ml-auto animate-pulse">
              streaming…
            </span>
          )}
        </div>
        {activeRes ? (
          <pre className="text-[10.5px] font-mono leading-snug text-gray-800 whitespace-pre-wrap">
{`HTTP/1.1 ${activeRes.status ?? 206} Partial Content
Content-Range: bytes=${activeRes.range?.start}-${activeRes.range?.end}/${TOTAL_BYTES}
Content-Length: ${activeRes.range ? rangeSize(activeRes.range) : 0}
Content-Type: video/mp4`}
          </pre>
        ) : (
          <p className="text-[10.5px] text-gray-400 font-mono italic">
            Waiting for the first response.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Video preview mock ───────────────────────────────────────────────────────

function VideoPreview({
  playhead,
  metadataLoaded,
  isPlaying,
  isSeeking,
  isBuffering,
}: {
  playhead: number;
  metadataLoaded: boolean;
  isPlaying: boolean;
  isSeeking: boolean;
  isBuffering: boolean;
}) {
  const percent = (playhead / VIDEO_DURATION_S) * 100;
  const status = !metadataLoaded
    ? "Loading metadata…"
    : isBuffering
      ? "Buffering…"
      : isSeeking
        ? "Seeking…"
        : isPlaying
          ? "Playing"
          : "Paused";
  const statusColor = !metadataLoaded
    ? "text-gray-400"
    : isBuffering
      ? "text-amber-500"
      : isSeeking
        ? "text-amber-500"
        : "text-emerald-500";

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1.5">
          <MonitorPlay size={12} className="text-gray-500" />
          <span className="text-[10px] uppercase font-semibold tracking-wide text-gray-500">
            &lt;video&gt; element
          </span>
        </div>
        <span className={`text-[10px] font-mono ${statusColor}`}>{status}</span>
      </div>
      <div
        className="relative aspect-video"
        style={{
          background:
            "linear-gradient(135deg, #1f2937 0%, #111827 40%, #0b1220 100%)",
        }}
      >
        {/* Playing indicator: subtle color band that shifts with playhead */}
        <div
          className="absolute inset-0"
          style={{
            background: metadataLoaded
              ? `radial-gradient(circle at ${20 + percent * 0.6}% ${
                  40 + Math.sin(playhead / 5) * 20
                }%, rgba(59,130,246,0.28), transparent 55%), radial-gradient(circle at ${
                  80 - percent * 0.4
                }% ${60 - Math.cos(playhead / 4) * 20}%, rgba(236,72,153,0.22), transparent 55%)`
              : "none",
            transition: "background 0.5s ease",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/90">
          <div className="text-xl font-mono tabular-nums font-bold">
            {formatTime(playhead)}
          </div>
          <div className="text-[10px] font-mono text-white/60">
            {formatTime(VIDEO_DURATION_S - playhead)} remaining
          </div>
          {isBuffering && (
            <div className="mt-1 text-[10px] uppercase tracking-wide font-semibold text-amber-300 animate-pulse">
              Buffering
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/10">
          <div
            className="h-full bg-red-500 transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Metrics chip row ─────────────────────────────────────────────────────────

function Metrics({
  downloadedBytes,
  playhead,
  requestCount,
  metadataLoaded,
}: {
  downloadedBytes: number;
  playhead: number;
  requestCount: number;
  metadataLoaded: boolean;
}) {
  const items: { label: string; value: string; hint?: string }[] = [
    {
      label: "Downloaded",
      value: formatBytes(downloadedBytes),
      hint: `${((downloadedBytes / TOTAL_BYTES) * 100).toFixed(1)}% of file`,
    },
    {
      label: "Playhead",
      value: formatTime(playhead),
      hint: `${((playhead / VIDEO_DURATION_S) * 100).toFixed(0)}%`,
    },
    {
      label: "Requests",
      value: `${requestCount}`,
      hint: metadataLoaded ? "range GETs" : "moov pending",
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => (
        <div
          key={item.label}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5"
        >
          <div className="text-[9px] uppercase tracking-wide text-gray-400">
            {item.label}
          </div>
          <div className="text-sm font-mono tabular-nums font-semibold text-gray-800">
            {item.value}
          </div>
          {item.hint && (
            <div className="text-[9px] font-mono text-gray-400 mt-0.5">
              {item.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HttpRangeRequestVisualizer() {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [step, setStep] = useState<number>(-1); // -1 = initial (nothing has happened yet)
  const [isPlaying, setIsPlaying] = useState(false);

  const preset = useMemo(
    () => PRESETS.find(p => p.id === presetId) ?? PRESETS[0],
    [presetId],
  );

  const total = preset.steps.length;
  const clampedStep = Math.min(step, total - 1);
  const state = useMemo(
    () => simulate(preset, clampedStep),
    [preset, clampedStep],
  );

  const isDone = step >= total - 1;

  const reset = useCallback(() => {
    setStep(-1);
    setIsPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    setStep(s => Math.min(s + 1, total - 1));
  }, [total]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    if (step >= total - 1) {
      setIsPlaying(false);
      return;
    }
    const currentKind =
      step >= 0 ? preset.steps[Math.min(step, total - 1)].kind : "wait";
    // Requests/responses need a bit more time to appreciate the arrow animation.
    const wait =
      currentKind === "request" || currentKind === "response"
        ? 1400
        : currentKind === "seek"
          ? 900
          : 1100;
    const t = setTimeout(goNext, wait);
    return () => clearTimeout(t);
  }, [isPlaying, step, total, preset, goNext]);

  // Reset simulation whenever preset changes
  useEffect(() => {
    setStep(-1);
    setIsPlaying(false);
  }, [presetId]);

  const currentStepMeta = step >= 0 ? preset.steps[clampedStep] : null;

  const downloadedBytes = state.downloaded.reduce(
    (sum, r) => sum + rangeSize(r),
    0,
  );
  const requestCount = state.history.filter(m => m.kind === "request").length;

  const isBuffering =
    currentStepMeta?.kind === "request" && !state.metadataLoaded
      ? true
      : currentStepMeta?.kind === "request" &&
          !isTimeBuffered(state.downloaded, state.playhead)
        ? true
        : false;

  const isSeeking = currentStepMeta?.kind === "seek";

  return (
    <div className="my-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white border border-blue-200">
            <Cloud size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              HTTP Range Requests · MP4 over the wire
            </div>
            <div className="text-[11px] text-gray-500">
              Watch the browser fetch just the byte ranges it needs — moov
              metadata first, then mdat chunks on demand.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(p => !p)}
            disabled={isDone && !isPlaying}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={goNext}
            disabled={isDone}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <SkipForward size={12} />
            Step
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Preset selector */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-white">
        <div className="text-[10px] uppercase font-semibold tracking-wide text-gray-400 mb-1.5">
          Scenario
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPresetId(p.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                p.id === presetId
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1.5">
          {preset.description}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        {/* Left: SVG canvas */}
        <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full h-auto"
            style={{ maxHeight: 520 }}
          >
            <ArrowDefs />
            <ServerBadge />
            <ServerFileBar
              downloaded={state.downloaded}
              inflight={state.inflight}
            />
            <MessageArrow message={state.currentMessage} />
            <ClientBadge
              metadataLoaded={state.metadataLoaded}
              buffered={downloadedBytes}
              playhead={state.playhead}
              isPlaying={isPlaying && !isDone}
            />
            <ClientTimeline
              downloaded={state.downloaded}
              playhead={state.playhead}
              seekedTo={state.seekedTo}
            />
          </svg>
        </div>

        {/* Right: console + narration */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <VideoPreview
            playhead={state.playhead}
            metadataLoaded={state.metadataLoaded}
            isPlaying={isPlaying && !isDone && currentStepMeta?.kind === "play"}
            isSeeking={isSeeking}
            isBuffering={isBuffering}
          />
          <Metrics
            downloadedBytes={downloadedBytes}
            playhead={state.playhead}
            requestCount={requestCount}
            metadataLoaded={state.metadataLoaded}
          />
          <HttpConsole
            currentMessage={state.currentMessage}
            history={state.history}
          />
        </div>
      </div>

      {/* Narration */}
      <div className="px-4 pb-4">
        <div
          className="rounded-lg border px-3 py-2 flex items-start gap-2"
          style={{
            background:
              currentStepMeta?.kind === "request"
                ? "#fffbeb"
                : currentStepMeta?.kind === "response"
                  ? "#ecfdf5"
                  : currentStepMeta?.kind === "seek"
                    ? "#fef3c7"
                    : "#f9fafb",
            borderColor:
              currentStepMeta?.kind === "request"
                ? "#fcd34d"
                : currentStepMeta?.kind === "response"
                  ? "#86efac"
                  : currentStepMeta?.kind === "seek"
                    ? "#fbbf24"
                    : "#e5e7eb",
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            <StepBadge kind={currentStepMeta?.kind ?? "wait"} step={step} total={total} />
          </div>
          <div className="text-[12px] leading-relaxed text-gray-800 flex-1">
            {state.narration}
            {state.seekedTo !== undefined &&
              currentStepMeta?.kind === "seek" && (
                <span className="ml-1 text-[11px] text-gray-500">
                  Buffer at {formatTime(state.seekedTo)}:{" "}
                  <span
                    className={`font-mono font-semibold ${
                      state.isBufferHit ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {state.isBufferHit ? "HIT (no request)" : "MISS (fetch needed)"}
                  </span>
                </span>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBadge({
  kind,
  step,
  total,
}: {
  kind: StepKind;
  step: number;
  total: number;
}) {
  const label =
    step < 0
      ? "READY"
      : kind === "request"
        ? "GET"
        : kind === "response"
          ? "206"
          : kind === "parse-metadata"
            ? "PARSE"
            : kind === "seek"
              ? "SEEK"
              : kind === "play"
                ? "PLAY"
                : "WAIT";
  const color =
    step < 0
      ? "#6b7280"
      : kind === "request"
        ? "#d97706"
        : kind === "response"
          ? "#059669"
          : kind === "seek"
            ? "#b45309"
            : kind === "play"
              ? "#2563eb"
              : "#6b7280";
  return (
    <div
      className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        background: "#fff",
        border: `1px solid ${color}`,
        color,
      }}
    >
      {label}
      {step >= 0 && (
        <span className="ml-1 text-gray-400 font-normal">
          {step + 1}/{total}
        </span>
      )}
    </div>
  );
}
