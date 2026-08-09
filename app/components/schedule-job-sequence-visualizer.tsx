"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

// ─── Participants ─────────────────────────────────────────────────────────────

type Participant = {
  id: string;
  label: string;
  sub?: string;
  role: "actor" | "service" | "store";
  bg: string;
  stroke: string;
  text: string;
};

const PARTICIPANTS: Participant[] = [
  {
    id: "client",
    label: "Client",
    role: "actor",
    bg: "#f3f4f6",
    stroke: "#9ca3af",
    text: "#374151",
  },
  {
    id: "scheduler",
    label: "Scheduler",
    sub: "Service",
    role: "service",
    bg: "#d1fae5",
    stroke: "#10b981",
    text: "#065f46",
  },
  {
    id: "db",
    label: "Database",
    role: "store",
    bg: "#ede9fe",
    stroke: "#8b5cf6",
    text: "#4c1d95",
  },
];

const LIFELINE_X: Record<string, number> = {
  client: 90,
  scheduler: 300,
  db: 510,
};

// ─── Scenarios ────────────────────────────────────────────────────────────────

type MessageType = "call" | "return" | "self";
type Status = "normal" | "success" | "error";

type Message = {
  from: string;
  to: string;
  label: string;
  type: MessageType;
  status?: Status;
  detail: string;
  /** Realistic p50 latency for this step, in milliseconds. */
  durationMs: number;
};

type Scenario = {
  key: string;
  name: string;
  outcome: "success" | "error" | "clientError";
  outcomeLabel: string;
  outcomeDetail: string;
  messages: Message[];
};

const SCENARIOS: Scenario[] = [
  {
    key: "invalid",
    name: "Invalid Request",
    outcome: "clientError",
    outcomeLabel: "400 Bad Request",
    outcomeDetail:
      "Client-side error: the request never touched the database. No transaction was opened.",
    messages: [
      {
        from: "client",
        to: "scheduler",
        label: "POST /jobs",
        type: "call",
        detail:
          "Client submits the job definition (name, type, command, schedule, ...) as a JSON payload.",
        durationMs: 30,
      },
      {
        from: "scheduler",
        to: "scheduler",
        label: "Validate Request",
        type: "self",
        status: "error",
        detail:
          "Validation fails — required fields missing, bad cron expression, or unsupported job type. The scheduler short-circuits before opening a transaction.",
        durationMs: 2,
      },
      {
        from: "scheduler",
        to: "client",
        label: "400 Bad Request",
        type: "return",
        status: "error",
        detail: "Scheduler responds with 400. No side effects on the DB.",
        durationMs: 30,
      },
    ],
  },
  {
    key: "success",
    name: "Success",
    outcome: "success",
    outcomeLabel: "201 Created",
    outcomeDetail:
      "Transaction committed: the job definition and its first Waiting execution row are now persisted.",
    messages: [
      {
        from: "client",
        to: "scheduler",
        label: "POST /jobs",
        type: "call",
        detail:
          "Client submits the job definition (name, type, command, schedule, ...) as a JSON payload.",
        durationMs: 30,
      },
      {
        from: "scheduler",
        to: "scheduler",
        label: "Validate Request",
        type: "self",
        status: "success",
        detail: "Validation passes. The scheduler proceeds to persist the job.",
        durationMs: 2,
      },
      {
        from: "scheduler",
        to: "db",
        label: "BEGIN TRANSACTION",
        type: "call",
        detail:
          "Open a transaction so the two inserts commit atomically — either both succeed or neither is visible.",
        durationMs: 5,
      },
      {
        from: "scheduler",
        to: "db",
        label: "Insert into Job Definition",
        type: "call",
        detail:
          "Persist the immutable job definition row (schedule, command, retry policy, owner, ...).",
        durationMs: 15,
      },
      {
        from: "scheduler",
        to: "db",
        label: "Insert into Job Execution (Status = Waiting)",
        type: "call",
        detail:
          "Create the first execution row with Status = Waiting and the next scheduled execution_time.",
        durationMs: 15,
      },
      {
        from: "scheduler",
        to: "db",
        label: "COMMIT",
        type: "call",
        status: "success",
        detail:
          "Both writes succeeded — commit the transaction. WAL fsync dominates the cost here.",
        durationMs: 25,
      },
      {
        from: "scheduler",
        to: "client",
        label: "201 Created  { jobId }",
        type: "return",
        status: "success",
        detail:
          "Return the generated jobId. The client can now query, cancel, or track the job.",
        durationMs: 30,
      },
    ],
  },
  {
    key: "db-error",
    name: "Database Error",
    outcome: "error",
    outcomeLabel: "500 Internal Server Error",
    outcomeDetail:
      "Transaction rolled back: nothing was persisted. The database is left in a consistent state.",
    messages: [
      {
        from: "client",
        to: "scheduler",
        label: "POST /jobs",
        type: "call",
        detail:
          "Client submits the job definition (name, type, command, schedule, ...) as a JSON payload.",
        durationMs: 30,
      },
      {
        from: "scheduler",
        to: "scheduler",
        label: "Validate Request",
        type: "self",
        status: "success",
        detail: "Validation passes.",
        durationMs: 2,
      },
      {
        from: "scheduler",
        to: "db",
        label: "BEGIN TRANSACTION",
        type: "call",
        detail:
          "Open a transaction so the two inserts commit atomically.",
        durationMs: 5,
      },
      {
        from: "scheduler",
        to: "db",
        label: "Insert into Job Definition",
        type: "call",
        detail: "First write succeeds.",
        durationMs: 15,
      },
      {
        from: "scheduler",
        to: "db",
        label: "Insert into Job Execution (Status = Waiting)",
        type: "call",
        status: "error",
        detail:
          "Second write fails — could be a constraint violation, deadlock, or connection timeout.",
        durationMs: 15,
      },
      {
        from: "scheduler",
        to: "db",
        label: "ROLLBACK",
        type: "call",
        status: "error",
        detail:
          "Roll back the transaction. The earlier Job Definition insert is undone — no partial state remains.",
        durationMs: 5,
      },
      {
        from: "scheduler",
        to: "client",
        label: "500 Internal Server Error",
        type: "return",
        status: "error",
        detail: "Return a 500 to the client. Safe to retry.",
        durationMs: 30,
      },
    ],
  },
];

// ─── Playback timing ──────────────────────────────────────────────────────────

/**
 * Wall-clock time (ms) shown to the user per real ms of latency. Scaling makes
 * each step observable while preserving proportion — a network hop still feels
 * an order of magnitude slower than validation.
 */
const PLAY_SCALE = 25;

/** Minimum visible time per step so a 2 ms validation doesn't blip past. */
const PLAY_MIN_MS = 220;

/** Target p99 API SLO — used as a reference budget in the UI. */
const SLO_TARGET_MS = 200;

function scenarioTotalMs(s: Scenario): number {
  return s.messages.reduce((sum, m) => sum + m.durationMs, 0);
}

function elapsedMsUpTo(s: Scenario, stepIdx: number): number {
  // stepIdx is 0-based index of the *last shown* message.
  if (stepIdx < 0) return 0;
  return s.messages
    .slice(0, stepIdx + 1)
    .reduce((sum, m) => sum + m.durationMs, 0);
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const SVG_WIDTH = 600;
const HEADER_Y = 30;
const HEADER_H = 48;
const LIFELINE_TOP = HEADER_Y + HEADER_H;
const ROW_START_Y = LIFELINE_TOP + 40;
const ROW_H = 70;
const SVG_BOTTOM_PAD = 30;

function scenarioHeight(s: Scenario) {
  return ROW_START_Y + s.messages.length * ROW_H + SVG_BOTTOM_PAD;
}

// ─── Colors by status ─────────────────────────────────────────────────────────

function statusColors(status: Status | undefined, active: boolean) {
  if (status === "error") {
    return {
      stroke: active ? "#ef4444" : "#fca5a5",
      text: active ? "#991b1b" : "#b91c1c",
    };
  }
  if (status === "success") {
    return {
      stroke: active ? "#10b981" : "#86efac",
      text: active ? "#065f46" : "#047857",
    };
  }
  return {
    stroke: active ? "#111827" : "#9ca3af",
    text: active ? "#111827" : "#6b7280",
  };
}

// ─── Arrow markers ────────────────────────────────────────────────────────────

function ArrowMarkers() {
  const defs: { id: string; color: string }[] = [
    { id: "seq-arrow-active", color: "#111827" },
    { id: "seq-arrow-idle", color: "#9ca3af" },
    { id: "seq-arrow-success", color: "#10b981" },
    { id: "seq-arrow-success-idle", color: "#86efac" },
    { id: "seq-arrow-error", color: "#ef4444" },
    { id: "seq-arrow-error-idle", color: "#fca5a5" },
  ];
  return (
    <defs>
      {defs.map(({ id, color }) => (
        <marker
          key={id}
          id={id}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
      ))}
    </defs>
  );
}

function markerFor(status: Status | undefined, active: boolean) {
  if (status === "error") {
    return active ? "url(#seq-arrow-error)" : "url(#seq-arrow-error-idle)";
  }
  if (status === "success") {
    return active
      ? "url(#seq-arrow-success)"
      : "url(#seq-arrow-success-idle)";
  }
  return active ? "url(#seq-arrow-active)" : "url(#seq-arrow-idle)";
}

// ─── Multi-line SVG text ──────────────────────────────────────────────────────

function MultilineText({
  x,
  y,
  lines,
  fill,
  fontSize = 11,
  fontWeight = 600,
  anchor = "middle",
  bold = true,
}: {
  x: number;
  y: number;
  lines: string[];
  fill: string;
  fontSize?: number;
  fontWeight?: number;
  anchor?: "start" | "middle" | "end";
  bold?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill}
      fontFamily="ui-sans-serif, system-ui"
      fontSize={fontSize}
      fontWeight={bold ? fontWeight : 400}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize + 2}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// ─── Message renderer ─────────────────────────────────────────────────────────

function MessageArrow({
  msg,
  y,
  isActive,
  isPast,
}: {
  msg: Message;
  y: number;
  isActive: boolean;
  isPast: boolean;
}) {
  const active = isActive;
  const shown = isActive || isPast;
  if (!shown) return null;

  const colors = statusColors(msg.status, isActive);
  const strokeWidth = active ? 2.2 : 1.4;
  const opacity = isPast && !active ? 0.65 : 1;
  const strokeDasharray = msg.type === "return" ? "6 4" : undefined;
  const marker = markerFor(msg.status, active);

  const labelLines = msg.label.split(/\n|  {2}/);

  if (msg.type === "self") {
    const x = LIFELINE_X[msg.from];
    const loopWidth = 42;
    const loopHeight = 32;
    const startY = y - loopHeight / 2 + 4;
    const endY = y + loopHeight / 2 + 4;
    const midX = x + loopWidth;

    const d = `M ${x + 2} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${x + 6} ${endY}`;

    return (
      <g opacity={opacity}>
        <path
          d={d}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          markerEnd={marker}
          style={{ transition: "stroke 0.2s" }}
        />
        <MultilineText
          x={x + loopWidth + 12}
          y={y + 4}
          anchor="start"
          lines={labelLines}
          fill={colors.text}
        />
        <DurationChip
          x={x + loopWidth + 12}
          y={y + 4 + (labelLines.length - 1) * 13 + 14}
          durationMs={msg.durationMs}
          anchor="start"
          active={active}
        />
      </g>
    );
  }

  const x1 = LIFELINE_X[msg.from];
  const x2 = LIFELINE_X[msg.to];
  const forward = x2 > x1;
  const xStart = x1 + (forward ? 4 : -4);
  const xEnd = x2 - (forward ? 6 : -6);

  const midX = (xStart + xEnd) / 2;

  return (
    <g opacity={opacity}>
      <line
        x1={xStart}
        y1={y + 12}
        x2={xEnd}
        y2={y + 12}
        stroke={colors.stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={marker}
        style={{ transition: "stroke 0.2s" }}
      />
      <MultilineText
        x={midX}
        y={y - (labelLines.length - 1) * 6}
        anchor="middle"
        lines={labelLines}
        fill={colors.text}
      />
      <DurationChip
        x={midX}
        y={y + 26}
        durationMs={msg.durationMs}
        anchor="middle"
        active={active}
      />
    </g>
  );
}

function DurationChip({
  x,
  y,
  durationMs,
  anchor,
  active,
}: {
  x: number;
  y: number;
  durationMs: number;
  anchor: "start" | "middle" | "end";
  active: boolean;
}) {
  const label = `~${durationMs} ms`;
  const width = Math.max(38, label.length * 6);
  const chipX =
    anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  return (
    <g>
      <rect
        x={chipX}
        y={y - 8}
        width={width}
        height={14}
        rx={4}
        fill={active ? "#111827" : "#f9fafb"}
        stroke={active ? "#111827" : "#e5e7eb"}
        strokeWidth={1}
      />
      <text
        x={anchor === "middle" ? x : anchor === "end" ? x - width / 2 : x + width / 2}
        y={y + 2}
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize={9}
        fontWeight={600}
        fill={active ? "#fff" : "#6b7280"}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Activation bar helper ────────────────────────────────────────────────────

function activationRanges(
  messages: Message[],
  currentIdx: number,
): Record<string, { top: number; bottom: number }[]> {
  // Very lightweight heuristic: activation starts when a participant is the
  // target of a call and ends when it is the source of a return, or on the
  // next message where it's not involved (self loops keep it active).
  const stack: Record<string, number | null> = {};
  const ranges: Record<string, { top: number; bottom: number }[]> = {};
  PARTICIPANTS.forEach(p => {
    stack[p.id] = null;
    ranges[p.id] = [];
  });

  for (let i = 0; i <= Math.min(currentIdx, messages.length - 1); i++) {
    const m = messages[i];
    const y = ROW_START_Y + i * ROW_H + 12;

    if (m.type === "call" || m.type === "self") {
      const target = m.to;
      if (stack[target] === null) stack[target] = y;
    } else if (m.type === "return") {
      const src = m.from;
      const start = stack[src];
      if (start !== null && start !== undefined) {
        ranges[src].push({ top: start, bottom: y });
        stack[src] = null;
      }
    }
  }

  // Close any still-open bars at the current step
  const closeY = ROW_START_Y + currentIdx * ROW_H + 24;
  for (const pid of Object.keys(stack)) {
    if (stack[pid] !== null && stack[pid] !== undefined) {
      ranges[pid].push({ top: stack[pid]!, bottom: closeY });
    }
  }
  return ranges;
}

// ─── Diagram ──────────────────────────────────────────────────────────────────

function SequenceDiagram({
  scenario,
  currentIdx,
}: {
  scenario: Scenario;
  currentIdx: number;
}) {
  const height = scenarioHeight(scenario);
  const lifelineBottom = height - SVG_BOTTOM_PAD;
  const bars = activationRanges(scenario.messages, currentIdx);

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${height}`}
      width="100%"
      style={{ maxWidth: SVG_WIDTH, display: "block", margin: "0 auto" }}
    >
      <ArrowMarkers />

      {/* Lifelines */}
      {PARTICIPANTS.map(p => (
        <line
          key={p.id}
          x1={LIFELINE_X[p.id]}
          x2={LIFELINE_X[p.id]}
          y1={LIFELINE_TOP}
          y2={lifelineBottom}
          stroke="#d1d5db"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}

      {/* Activation bars */}
      {PARTICIPANTS.map(p =>
        bars[p.id].map((r, idx) => (
          <rect
            key={`${p.id}-${idx}`}
            x={LIFELINE_X[p.id] - 5}
            y={r.top}
            width={10}
            height={Math.max(6, r.bottom - r.top)}
            fill={p.bg}
            stroke={p.stroke}
            strokeWidth={1}
            rx={2}
            opacity={0.9}
          />
        )),
      )}

      {/* Participant header boxes */}
      {PARTICIPANTS.map(p => {
        const x = LIFELINE_X[p.id];
        return (
          <g key={p.id}>
            <rect
              x={x - 70}
              y={HEADER_Y}
              width={140}
              height={HEADER_H}
              rx={8}
              fill={p.bg}
              stroke={p.stroke}
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={HEADER_Y + (p.sub ? 22 : 30)}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui"
              fontSize={13}
              fontWeight={700}
              fill={p.text}
            >
              {p.label}
            </text>
            {p.sub && (
              <text
                x={x}
                y={HEADER_Y + 38}
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui"
                fontSize={10}
                fontWeight={500}
                fill={p.text}
                opacity={0.7}
              >
                {p.sub}
              </text>
            )}
            {p.id === "db" && (
              // subtle DB cylinder hint
              <ellipse
                cx={x + 55}
                cy={HEADER_Y + 12}
                rx={4}
                ry={2}
                fill={p.stroke}
              />
            )}
          </g>
        );
      })}

      {/* Messages */}
      {scenario.messages.map((msg, i) => {
        const y = ROW_START_Y + i * ROW_H;
        return (
          <MessageArrow
            key={i}
            msg={msg}
            y={y}
            isActive={i === currentIdx}
            isPast={i < currentIdx}
          />
        );
      })}

      {/* Step indicator on the left gutter */}
      {scenario.messages.map((_, i) => {
        const y = ROW_START_Y + i * ROW_H + 12;
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;
        return (
          <g key={`idx-${i}`}>
            <circle
              cx={20}
              cy={y}
              r={9}
              fill={
                isActive ? "#111827" : isPast ? "#e5e7eb" : "transparent"
              }
              stroke={isActive || isPast ? "#111827" : "#e5e7eb"}
              strokeWidth={1.2}
            />
            <text
              x={20}
              y={y + 3}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui"
              fontSize={10}
              fontWeight={700}
              fill={isActive ? "#fff" : isPast ? "#6b7280" : "#9ca3af"}
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScheduleJobSequenceVisualizer() {
  const [scenarioKey, setScenarioKey] = useState<string>("success");
  const scenario = useMemo(
    () => SCENARIOS.find(s => s.key === scenarioKey)!,
    [scenarioKey],
  );

  const [step, setStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const total = scenario.messages.length;
  const currentIdx = step - 1;
  const isDone = step > total;

  const loadScenario = useCallback((key: string) => {
    setScenarioKey(key);
    setStep(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (step > total) {
      setIsPlaying(false);
      return;
    }
    // Wall-clock delay before the next arrow appears is derived from the
    // real latency of the message that is currently on screen. Step 0 uses
    // a short priming delay so the sequence doesn't jump instantly.
    const currentDuration =
      step === 0
        ? 12 // priming (12 ms real → ~300 ms with scale + floor)
        : scenario.messages[step - 1]?.durationMs ?? 30;
    const wait = Math.max(PLAY_MIN_MS, currentDuration * PLAY_SCALE);
    const t = setTimeout(() => setStep(s => s + 1), wait);
    return () => clearTimeout(t);
  }, [isPlaying, step, total, scenario]);

  const currentMessage =
    currentIdx >= 0 && currentIdx < total ? scenario.messages[currentIdx] : null;

  const totalMs = useMemo(() => scenarioTotalMs(scenario), [scenario]);
  const elapsedMs =
    step === 0 ? 0 : elapsedMsUpTo(scenario, Math.min(step - 1, total - 1));
  const sloPct = Math.min(100, (elapsedMs / SLO_TARGET_MS) * 100);
  const sloExceeded = elapsedMs > SLO_TARGET_MS;

  const stepBadge = (() => {
    if (step === 0)
      return {
        label: "Ready",
        color: "text-gray-400",
      };
    if (isDone) {
      if (scenario.outcome === "success")
        return { label: scenario.outcomeLabel, color: "text-emerald-600" };
      if (scenario.outcome === "error")
        return { label: scenario.outcomeLabel, color: "text-red-600" };
      return { label: scenario.outcomeLabel, color: "text-red-600" };
    }
    const status = currentMessage?.status ?? "normal";
    if (status === "success")
      return { label: "Step " + step, color: "text-emerald-600" };
    if (status === "error")
      return { label: "Step " + step, color: "text-red-600" };
    return { label: "Step " + step, color: "text-gray-500" };
  })();

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">
      {/* Scenario tabs */}
      <div className="flex gap-2 flex-wrap px-5 pt-4 pb-3 border-b border-gray-100 items-center">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide mr-1">
          Scenario
        </span>
        {SCENARIOS.map(s => {
          const isActive = scenarioKey === s.key;
          const outcomeColor =
            s.outcome === "success"
              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
              : s.outcome === "error"
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-amber-400 bg-amber-50 text-amber-700";
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => loadScenario(s.key)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isActive
                  ? outcomeColor
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Left: sequence diagram */}
        <div className="px-3 pt-4 pb-4 min-w-0 overflow-x-auto">
          <SequenceDiagram scenario={scenario} currentIdx={currentIdx} />
        </div>

        {/* Right: description + outcome + legend */}
        <div className="px-5 pt-5 pb-5 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col gap-1">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${stepBadge.color}`}
            >
              {stepBadge.label}
              {step > 0 && !isDone && (
                <span className="text-gray-400 font-normal">
                  {" "}
                  · {step} / {total}
                </span>
              )}
            </span>
            <p className="text-xs text-gray-700 leading-relaxed">
              {step === 0
                ? `Scenario: ${scenario.name}. Press Step to walk through the sequence one message at a time.`
                : currentMessage
                  ? currentMessage.detail
                  : scenario.outcomeDetail}
            </p>
          </div>

          {currentMessage && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-mono flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-gray-500 min-w-0">
                  <span className="text-gray-400">from</span>
                  <span className="font-semibold text-gray-700 truncate">
                    {
                      PARTICIPANTS.find(p => p.id === currentMessage.from)
                        ?.label
                    }
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold text-gray-700 truncate">
                    {PARTICIPANTS.find(p => p.id === currentMessage.to)?.label}
                  </span>
                </div>
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums"
                  style={{
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    color: "#374151",
                  }}
                  title="Realistic p50 latency for this step"
                >
                  ~{currentMessage.durationMs} ms
                </span>
              </div>
              <div
                className="text-gray-800 whitespace-pre-line"
                style={{
                  color:
                    currentMessage.status === "error"
                      ? "#991b1b"
                      : currentMessage.status === "success"
                        ? "#065f46"
                        : "#111827",
                }}
              >
                {currentMessage.label}
              </div>
            </div>
          )}

          {/* Latency panel */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                Request Latency
              </span>
              <span className="text-[9px] text-gray-400 font-mono">
                p99 target &lt; {SLO_TARGET_MS} ms
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold tabular-nums font-mono"
                style={{
                  color: sloExceeded
                    ? "#dc2626"
                    : elapsedMs > 0
                      ? "#065f46"
                      : "#9ca3af",
                }}
              >
                {elapsedMs}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                / {totalMs} ms
              </span>
              <span className="text-[10px] text-gray-400 ml-auto">
                elapsed
              </span>
            </div>
            {/* SLO gauge */}
            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${sloPct}%`,
                  background: sloExceeded ? "#ef4444" : "#10b981",
                }}
              />
              {/* SLO marker: only visible if the scenario budget fits */}
              {totalMs <= SLO_TARGET_MS && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-400"
                  style={{
                    left: `${(totalMs / SLO_TARGET_MS) * 100}%`,
                  }}
                  title={`Scenario total: ${totalMs} ms`}
                />
              )}
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Playback runs at {PLAY_SCALE}× real time so each step is visible.
              At this per-request latency, sustaining the{" "}
              <span className="font-mono">10K jobs/sec</span> throughput NFR
              needs roughly{" "}
              <span className="font-mono">
                {Math.ceil(10000 / (1000 / totalMs))}
              </span>{" "}
              concurrent in-flight requests across the scheduler fleet.
            </p>
          </div>

          {isDone && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background:
                  scenario.outcome === "success" ? "#d1fae5" : "#fee2e2",
                border: `1px solid ${
                  scenario.outcome === "success" ? "#10b981" : "#ef4444"
                }`,
                color: scenario.outcome === "success" ? "#065f46" : "#991b1b",
              }}
            >
              <div className="flex items-baseline justify-between mb-1">
                <div className="font-mono font-bold">
                  {scenario.outcomeLabel}
                </div>
                <div className="font-mono text-[11px] tabular-nums">
                  {totalMs} ms total
                </div>
              </div>
              <div className="leading-relaxed">{scenario.outcomeDetail}</div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Legend
            </span>
            <div className="flex flex-col gap-1 text-[10px] text-gray-500">
              <div className="flex items-center gap-2">
                <svg width={40} height={10}>
                  <line
                    x1={2}
                    y1={5}
                    x2={34}
                    y2={5}
                    stroke="#111827"
                    strokeWidth={1.6}
                    markerEnd="url(#seq-arrow-active)"
                  />
                </svg>
                <span>Request / call</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width={40} height={10}>
                  <line
                    x1={2}
                    y1={5}
                    x2={34}
                    y2={5}
                    stroke="#111827"
                    strokeWidth={1.6}
                    strokeDasharray="5 3"
                    markerEnd="url(#seq-arrow-active)"
                  />
                </svg>
                <span>Response / return (dashed)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block rounded-sm"
                  style={{
                    width: 10,
                    height: 10,
                    background: "#d1fae5",
                    border: "1.5px solid #10b981",
                  }}
                />
                <span>Activation bar (participant is busy)</span>
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
              setStep(0);
              setIsPlaying(false);
            } else setIsPlaying(p => !p);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isDone && !isPlaying) setStep(s => s + 1);
          }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setIsPlaying(false);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-200"
              style={{
                width: `${total ? (Math.min(step, total) / total) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {Math.min(step, total)}/{total}
          </span>
        </div>
      </div>
    </div>
  );
}
