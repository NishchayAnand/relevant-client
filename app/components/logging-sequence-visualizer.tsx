'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Database,
  FileText,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Terminal,
} from 'lucide-react';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type Participant = 'app' | 'logger' | 'pipeline' | 'dest';
type Appender = 'console' | 'file' | 'database' | 'remote';
type ScenarioId = 'debug' | 'info';

type LogRecord = {
  timestamp: string;
  level: Level;
  message: string;
  thread: string;
};

type StepKind = 'call' | 'note' | 'pass' | 'check' | 'discard' | 'append' | 'done';

type FlowStep = {
  kind: StepKind;
  from?: Participant;
  to?: Participant;
  label: string;
  narration: string;
  revealRecord?: boolean;
  checkResult?: 'accept' | 'reject';
  appender?: Appender;
};

type Scenario = {
  id: ScenarioId;
  label: string;
  description: string;
  record: LogRecord;
  steps: FlowStep[];
};

const MIN_LEVEL: Level = 'INFO';
const LEVEL_RANK: Record<Level, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

const PARTICIPANTS: { id: Participant; label: string; color: string; bg: string }[] = [
  { id: 'app', label: 'Application', color: '#4f46e5', bg: '#e0e7ff' },
  { id: 'logger', label: 'Logger', color: '#2563eb', bg: '#dbeafe' },
  { id: 'pipeline', label: 'Pipeline', color: '#059669', bg: '#d1fae5' },
  { id: 'dest', label: 'Appenders', color: '#d97706', bg: '#fef3c7' },
];

const PARTICIPANT_X: Record<Participant, number> = {
  app: 88,
  logger: 248,
  pipeline: 420,
  dest: 600,
};

const APPENDERS: { id: Appender; label: string; icon: typeof Monitor }[] = [
  { id: 'console', label: 'console', icon: Terminal },
  { id: 'file', label: 'file', icon: FileText },
  { id: 'database', label: 'database', icon: Database },
  { id: 'remote', label: 'remote', icon: Monitor },
];

const CANVAS_W = 700;
const HEADER_Y = 18;
const HEADER_H = 38;
const FIRST_ROW_Y = 92;
const ROW_H = 46;
const NOTE_H = 62;
const AUTO_MS = 1100;

function buildSteps(record: LogRecord): FlowStep[] {
  const accepted = LEVEL_RANK[record.level] >= LEVEL_RANK[MIN_LEVEL];

  const steps: FlowStep[] = [
    {
      kind: 'call',
      from: 'app',
      to: 'logger',
      label: `log("${shorten(record.message)}", ${record.level})`,
      narration: `The application calls the logger with a message and a ${record.level} severity.`,
    },
    {
      kind: 'note',
      label: 'Create LogRecord',
      narration:
        'The logger builds a LogRecord: timestamp, severity, message, and the emitting thread name.',
      revealRecord: true,
    },
    {
      kind: 'pass',
      from: 'logger',
      to: 'pipeline',
      label: 'pass record',
      narration: 'The same record is handed to the logging pipeline for filtering and delivery.',
    },
    {
      kind: 'check',
      label: `${record.level} ${accepted ? '≥' : '<'} min ${MIN_LEVEL}`,
      narration: accepted
        ? `${record.level} meets the configured minimum of ${MIN_LEVEL}, so the record is kept.`
        : `${record.level} is below the configured minimum of ${MIN_LEVEL}, so the record is dropped immediately.`,
      checkResult: accepted ? 'accept' : 'reject',
    },
  ];

  if (!accepted) {
    steps.push({
      kind: 'discard',
      from: 'pipeline',
      to: 'logger',
      label: 'discard',
      narration:
        'Nothing is written. Console, file, database, and remote appenders never see this record.',
    });
    steps.push({
      kind: 'done',
      label: 'Done',
      narration: 'The application continues. A discarded DEBUG log has no effect on destinations.',
    });
    return steps;
  }

  const deliveries: { appender: Appender; extra: string }[] = [
    { appender: 'console', extra: 'printed to stdout for the operator' },
    { appender: 'file', extra: 'appended to the local log file' },
    { appender: 'database', extra: 'inserted for later query' },
    { appender: 'remote', extra: 'shipped to the remote logging system' },
  ];

  for (const { appender, extra } of deliveries) {
    steps.push({
      kind: 'append',
      from: 'pipeline',
      to: 'dest',
      appender,
      label: appender,
      narration: `The pipeline writes the record to the ${appender} appender — ${extra}.`,
    });
  }

  steps.push({
    kind: 'done',
    label: 'Done',
    narration: 'Every configured destination received the same LogRecord. The call is complete.',
  });

  return steps;
}

function shorten(message: string) {
  return message.length > 22 ? `${message.slice(0, 20)}…` : message;
}

const SCENARIO_DEFS: Omit<Scenario, 'steps'>[] = [
  {
    id: 'debug',
    label: 'DEBUG discarded',
    description: `Min level is ${MIN_LEVEL}. A DEBUG record is dropped before any appender runs.`,
    record: {
      timestamp: '14:32:07.184',
      level: 'DEBUG',
      message: 'cache miss key=user:42',
      thread: 'http-nio-exec-3',
    },
  },
  {
    id: 'info',
    label: 'INFO accepted',
    description: `Min level is ${MIN_LEVEL}. An INFO record is forwarded to every appender.`,
    record: {
      timestamp: '14:32:07.188',
      level: 'INFO',
      message: 'payment captured',
      thread: 'http-nio-exec-1',
    },
  },
];

const SCENARIOS: Scenario[] = SCENARIO_DEFS.map((scenario) => ({
  ...scenario,
  steps: buildSteps(scenario.record),
}));

function rowHeight(kind: StepKind) {
  if (kind === 'note') return NOTE_H;
  if (kind === 'done') return 0;
  return ROW_H;
}

function stepY(steps: FlowStep[], index: number) {
  let y = FIRST_ROW_Y;
  for (let i = 0; i < index; i++) {
    y += rowHeight(steps[i].kind);
  }
  return y;
}

function canvasHeight(steps: FlowStep[]) {
  const last = steps.reduce((y, step) => y + rowHeight(step.kind), FIRST_ROW_Y);
  return Math.max(280, last + 36);
}

function SequenceCanvas({
  steps,
  current,
  record,
  recordVisible,
  litAppenders,
  discarded,
}: {
  steps: FlowStep[];
  current: number;
  record: LogRecord;
  recordVisible: boolean;
  litAppenders: Appender[];
  discarded: boolean;
}) {
  const height = canvasHeight(steps);
  const visible = steps.slice(0, Math.max(0, current + 1)).filter((s) => s.kind !== 'done');

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${height}`} className="w-full h-auto" role="img">
      <defs>
        <marker id="seq-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#334155" />
        </marker>
        <marker id="seq-arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
        </marker>
        <marker id="seq-arrow-fail" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" />
        </marker>
      </defs>

      {PARTICIPANTS.map((p) => {
        const x = PARTICIPANT_X[p.id];
        const active =
          current >= 0 &&
          (steps[current]?.from === p.id ||
            steps[current]?.to === p.id ||
            (steps[current]?.kind === 'note' && p.id === 'logger') ||
            (steps[current]?.kind === 'check' && p.id === 'pipeline'));
        return (
          <g key={p.id}>
            <line
              x1={x}
              y1={HEADER_Y + HEADER_H}
              x2={x}
              y2={height - 12}
              stroke={active ? p.color : '#cbd5e1'}
              strokeWidth={active ? 2 : 1.25}
              strokeDasharray="5 4"
            />
            <rect
              x={x - 62}
              y={HEADER_Y}
              width={124}
              height={HEADER_H}
              rx={8}
              fill={active ? p.bg : '#f8fafc'}
              stroke={p.color}
              strokeWidth={active ? 2 : 1.25}
            />
            <text
              x={x}
              y={HEADER_Y + 24}
              textAnchor="middle"
              className="fill-slate-800"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {p.label}
            </text>
          </g>
        );
      })}

      {visible.map((step, i) => {
        const y = stepY(steps, i);
        const isCurrent = i === current;
        const color =
          step.kind === 'discard'
            ? '#dc2626'
            : isCurrent
              ? '#2563eb'
              : '#334155';
        const marker =
          step.kind === 'discard'
            ? 'url(#seq-arrow-fail)'
            : isCurrent
              ? 'url(#seq-arrow-active)'
              : 'url(#seq-arrow)';

        if (step.kind === 'note') {
          const x = PARTICIPANT_X.logger;
          return (
            <g key={i} opacity={isCurrent ? 1 : 0.72}>
              <rect
                x={x - 78}
                y={y - 18}
                width={156}
                height={52}
                rx={6}
                fill="#fef9c3"
                stroke="#d97706"
                strokeWidth={isCurrent ? 2 : 1.25}
              />
              <text
                x={x}
                y={y + 2}
                textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 600, fill: '#78350f' }}
              >
                Create LogRecord
              </text>
              <text
                x={x}
                y={y + 18}
                textAnchor="middle"
                style={{ fontSize: 9, fill: '#92400e' }}
              >
                {recordVisible
                  ? `${record.timestamp} · ${record.level}`
                  : 'timestamp, level, message, thread'}
              </text>
            </g>
          );
        }

        if (step.kind === 'check') {
          const accepted = step.checkResult === 'accept';
          const x = PARTICIPANT_X.pipeline;
          return (
            <g key={i} opacity={isCurrent ? 1 : 0.72}>
              <rect
                x={x - 86}
                y={y - 16}
                width={172}
                height={36}
                rx={6}
                fill={accepted ? '#ecfdf5' : '#fef2f2'}
                stroke={accepted ? '#059669' : '#dc2626'}
                strokeWidth={isCurrent ? 2 : 1.25}
              />
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: accepted ? '#065f46' : '#991b1b',
                }}
              >
                {accepted ? 'alt accepted  ' : 'alt discarded  '}
                {step.label}
              </text>
            </g>
          );
        }

        if (!step.from || !step.to) return null;

        const x1 = PARTICIPANT_X[step.from];
        const x2 = PARTICIPANT_X[step.to];
        const dashed = step.kind === 'discard';

        return (
          <g key={i} opacity={isCurrent ? 1 : 0.55}>
            <line
              x1={x1}
              y1={y}
              x2={x2 + (x2 > x1 ? -8 : 8)}
              y2={y}
              stroke={color}
              strokeWidth={isCurrent ? 2 : 1.4}
              strokeDasharray={dashed ? '5 4' : undefined}
              markerEnd={marker}
            />
            <circle
              cx={Math.min(x1, x2) - 16}
              cy={y}
              r={9}
              fill={isCurrent ? '#2563eb' : '#64748b'}
            />
            <text
              x={Math.min(x1, x2) - 16}
              y={y + 3.5}
              textAnchor="middle"
              style={{ fontSize: 9, fontWeight: 700, fill: '#fff' }}
            >
              {i + 1}
            </text>
            <text
              x={(x1 + x2) / 2}
              y={y - 8}
              textAnchor="middle"
              style={{ fontSize: 11, fontWeight: isCurrent ? 600 : 500, fill: color }}
            >
              {step.label}
            </text>
            {dashed && (
              <text
                x={(x1 + x2) / 2}
                y={y + 16}
                textAnchor="middle"
                style={{ fontSize: 10, fill: '#dc2626' }}
              >
                × below threshold
              </text>
            )}
          </g>
        );
      })}

      {APPENDERS.map((appender, i) => {
        const lit = litAppenders.includes(appender.id);
        const x = PARTICIPANT_X.dest + (i % 2 === 0 ? -28 : 28);
        const y = height - 28;
        return (
          <g key={appender.id} opacity={discarded && !lit ? 0.35 : 1}>
            <rect
              x={x - 24}
              y={y - 10}
              width={48}
              height={18}
              rx={4}
              fill={lit ? '#fef3c7' : '#f8fafc'}
              stroke={lit ? '#d97706' : '#cbd5e1'}
            />
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              style={{ fontSize: 8, fontWeight: 600, fill: lit ? '#92400e' : '#94a3b8' }}
            >
              {appender.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function LoggingSequenceVisualizer() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('info');
  const [step, setStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[1];
  const steps = scenario.steps;
  const total = steps.length;
  const clamped = Math.min(Math.max(step, -1), total - 1);
  const current = clamped >= 0 ? steps[clamped] : null;
  const isDone = step >= total - 1 && step >= 0;

  const recordVisible = steps.slice(0, clamped + 1).some((s) => s.revealRecord);
  const discarded = steps.slice(0, clamped + 1).some((s) => s.kind === 'discard');
  const litAppenders = steps
    .slice(0, clamped + 1)
    .filter((s): s is FlowStep & { appender: Appender } => Boolean(s.appender))
    .map((s) => s.appender);

  const goNext = useCallback(() => {
    setStep((prev) => {
      if (prev >= total - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [total]);

  const reset = useCallback(() => {
    setStep(-1);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    reset();
  }, [scenarioId, reset]);

  useEffect(() => {
    if (!isPlaying) return;
    if (isDone) {
      setIsPlaying(false);
      return;
    }
    const t = setTimeout(goNext, AUTO_MS);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone, goNext]);

  const narration = useMemo(() => {
    if (!current) {
      return 'Press Step or Play to walk the logging pipeline. Switch scenario to see discard vs delivery.';
    }
    return current.narration;
  }, [current]);

  return (
    <div className="my-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white border border-indigo-200">
            <Bug size={16} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              Logging pipeline · sequence walkthrough
            </div>
            <div className="text-[11px] text-gray-500">
              Configured minimum level is {MIN_LEVEL}. Step through call, record, filter, and append.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={isDone && !isPlaying}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={isDone}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <SkipForward size={12} />
            Step
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-gray-100">
        <div className="text-[10px] uppercase font-semibold tracking-wide text-gray-400 mb-1.5">
          Scenario
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenarioId(s.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                s.id === scenarioId
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1.5">{scenario.description}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-slate-50/60 px-2 py-3">
          <SequenceCanvas
            steps={steps}
            current={clamped}
            record={scenario.record}
            recordVisible={recordVisible}
            litAppenders={litAppenders}
            discarded={discarded}
          />
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-[10px] uppercase font-semibold tracking-wide text-gray-400 mb-2">
              LogRecord
            </div>
            {recordVisible ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
                <dt className="text-gray-400">timestamp</dt>
                <dd className="font-mono text-gray-800">{scenario.record.timestamp}</dd>
                <dt className="text-gray-400">level</dt>
                <dd>
                  <span
                    className={`font-mono font-semibold ${
                      scenario.record.level === 'DEBUG' ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {scenario.record.level}
                  </span>
                </dd>
                <dt className="text-gray-400">message</dt>
                <dd className="font-mono text-gray-800">{scenario.record.message}</dd>
                <dt className="text-gray-400">thread</dt>
                <dd className="font-mono text-gray-800">{scenario.record.thread}</dd>
              </dl>
            ) : (
              <p className="text-[12px] text-gray-400">
                Empty until the logger constructs the record.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-[10px] uppercase font-semibold tracking-wide text-gray-400 mb-2">
              Appenders
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {APPENDERS.map((appender) => {
                const Icon = appender.icon;
                const lit = litAppenders.includes(appender.id);
                return (
                  <div
                    key={appender.id}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${
                      lit
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : discarded
                          ? 'border-red-100 bg-red-50/40 text-red-400 line-through'
                          : 'border-gray-200 bg-white text-gray-400'
                    }`}
                  >
                    <Icon size={12} />
                    {appender.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex items-start gap-2 px-4 py-3 border-t border-gray-200"
        style={{
          background:
            current?.kind === 'discard'
              ? '#fef2f2'
              : current?.kind === 'append' || current?.checkResult === 'accept'
                ? '#ecfdf5'
                : '#f8fafc',
        }}
      >
        <div
          className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border shrink-0 mt-0.5"
          style={{
            borderColor:
              current?.kind === 'discard'
                ? '#dc2626'
                : current?.kind === 'append'
                  ? '#059669'
                  : '#64748b',
            color:
              current?.kind === 'discard'
                ? '#dc2626'
                : current?.kind === 'append'
                  ? '#059669'
                  : '#64748b',
          }}
        >
          {current ? current.kind : 'ready'}
          {clamped >= 0 && (
            <span className="ml-1 text-gray-400 font-normal">
              {clamped + 1}/{total}
            </span>
          )}
        </div>
        <p className="text-[12px] leading-relaxed text-gray-800">{narration}</p>
      </div>
    </div>
  );
}
