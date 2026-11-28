'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskId =
  | 'validate'
  | 'stock'
  | 'price'
  | 'funds'
  | 'limits'
  | 'risk'
  | 'execute';

type Task = {
  id: TaskId;
  label: string;
  short: string;
  detail: string;
  dependsOn: TaskId[];
};

const TASKS: Task[] = [
  {
    id: 'validate',
    label: 'Validate customer',
    short: 'Customer',
    detail: 'Confirm the account is active and KYC is complete.',
    dependsOn: [],
  },
  {
    id: 'stock',
    label: 'Verify stock',
    short: 'Stock',
    detail: 'Confirm RELIANCE is listed and the market is open.',
    dependsOn: [],
  },
  {
    id: 'price',
    label: 'Fetch price',
    short: 'Price',
    detail: 'Read the live quote so the cost of 100 shares is known.',
    dependsOn: [],
  },
  {
    id: 'limits',
    label: 'Check limits',
    short: 'Limits',
    detail: 'Check position and concentration limits for this symbol.',
    dependsOn: ['validate', 'stock'],
  },
  {
    id: 'funds',
    label: 'Check funds',
    short: 'Funds',
    detail: 'Balance must cover 100 shares at the live price.',
    dependsOn: ['validate', 'price'],
  },
  {
    id: 'risk',
    label: 'Assess risk',
    short: 'Risk',
    detail: 'Margin, circuit, and order-size checks.',
    dependsOn: ['funds', 'limits'],
  },
  {
    id: 'execute',
    label: 'Execute order',
    short: 'Execute',
    detail: 'Submit the buy for 100 shares of Reliance Industries.',
    dependsOn: ['risk'],
  },
];

const BY_ID = Object.fromEntries(TASKS.map((task) => [task.id, task])) as Record<TaskId, Task>;

const CARD_W = 188;
const CARD_H = 64;
const CANVAS_W = 612;
const CANVAS_H = 374;

const POSITION: Record<TaskId, { x: number; y: number }> = {
  price: { x: 12, y: 14 },
  validate: { x: 212, y: 14 },
  stock: { x: 412, y: 14 },
  funds: { x: 112, y: 108 },
  limits: { x: 312, y: 108 },
  risk: { x: 212, y: 202 },
  execute: { x: 212, y: 296 },
};

const EDGES = TASKS.flatMap((task) => task.dependsOn.map((from) => ({ from, to: task.id })));

type Tone = 'info' | 'warn' | 'done';
type Note = { text: string; tone: Tone } | null;

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function unmetDependencies(id: TaskId, done: Set<TaskId>) {
  return BY_ID[id].dependsOn.filter((dep) => !done.has(dep));
}

function readyTasks(done: Set<TaskId>) {
  return TASKS.filter((task) => !done.has(task.id) && unmetDependencies(task.id, done).length === 0);
}

function edgePath(from: TaskId, to: TaskId) {
  const source = POSITION[from];
  const target = POSITION[to];
  const x1 = source.x + CARD_W / 2;
  const y1 = source.y + CARD_H;
  const x2 = target.x + CARD_W / 2;
  const y2 = target.y;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function taskStatus(id: TaskId, done: Set<TaskId>) {
  if (done.has(id)) return 'done' as const;
  if (unmetDependencies(id, done).length === 0) return 'ready' as const;
  return 'blocked' as const;
}

function statusLabel(id: TaskId, done: Set<TaskId>) {
  const status = taskStatus(id, done);
  if (status === 'done') return 'Done';
  if (status === 'ready') return 'Ready';
  const waiting = unmetDependencies(id, done).map((dep) => BY_ID[dep].short);
  return `Needs ${joinLabels(waiting)}`;
}

export default function StockOrderWorkflowVisualizer() {
  const [order, setOrder] = useState<TaskId[]>([]);
  const [note, setNote] = useState<Note>(null);
  const [hovered, setHovered] = useState<TaskId | null>(null);
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const fit = () => {
      const available = frame.clientWidth;
      setScale(available > 0 ? Math.min(1, available / CANVAS_W) : 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const done = new Set(order);
  const ready = readyTasks(done);
  const latest = order[order.length - 1] ?? null;
  const finished = order.length === TASKS.length;

  const intro = `Pick a ready task to run it. ${joinLabels(readyTasks(new Set()).map((task) => task.label))} have no dependencies, so any of them can go first.`;
  const message = note?.text ?? intro;
  const tone = note?.tone ?? 'info';

  function trigger(id: TaskId) {
    const task = BY_ID[id];
    const status = taskStatus(id, done);

    if (status === 'done') {
      setNote({
        tone: 'info',
        text: `${task.label} already ran as step ${order.indexOf(id) + 1}.`,
      });
      return;
    }

    if (status === 'blocked') {
      const waiting = unmetDependencies(id, done).map((dep) => BY_ID[dep].label);
      setNote({
        tone: 'warn',
        text: `${task.label} cannot run yet. It is waiting on ${joinLabels(waiting)}.`,
      });
      return;
    }

    const next = [...order, id];
    const nextDone = new Set(next);
    const newlyReady = TASKS.filter((candidate) => {
      if (nextDone.has(candidate.id)) return false;
      const wasReady = unmetDependencies(candidate.id, done).length === 0;
      const nowReady = unmetDependencies(candidate.id, nextDone).length === 0;
      return !wasReady && nowReady;
    });

    setOrder(next);

    if (next.length === TASKS.length) {
      setNote({
        tone: 'done',
        text: `${task.label} is step ${next.length}. Every dependency was respected, so this is a valid execution order. Reset and start with a different ready task to build another one.`,
      });
      return;
    }

    const unlocked =
      newlyReady.length === 0
        ? 'No new task is ready yet.'
        : `${joinLabels(newlyReady.map((candidate) => candidate.label))} ${newlyReady.length === 1 ? 'is' : 'are'} now ready.`;

    setNote({
      tone: 'info',
      text: `${task.label} is step ${next.length}. ${unlocked}`,
    });
  }

  function undo() {
    if (order.length === 0) return;
    const removed = order[order.length - 1];
    setOrder(order.slice(0, -1));
    setNote({
      tone: 'info',
      text: `Removed ${BY_ID[removed].label} from the order. It is ready to run again.`,
    });
  }

  function reset() {
    setOrder([]);
    setNote(null);
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="text-sm font-semibold text-gray-900">
          Buy 100 shares of Reliance Industries
        </div>
        <div className="mt-1 text-xs leading-relaxed text-gray-500">
          Run a task only when it is ready. Arrows point from a task to the tasks that must wait
          for it. Each click is appended to the execution order.
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-blue-500 bg-blue-50" />
            Ready
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-gray-200 bg-gray-50" />
            Waiting
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-emerald-500 bg-emerald-50" />
            Done, numbered in the order you chose
          </span>
        </div>
      </div>

      <div className="px-4 py-4">
        <div ref={frameRef} className="w-full">
          <div
            className="relative mx-auto"
            style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
          >
            <div
              className="absolute top-0 left-0"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
          <svg
            width={CANVAS_W}
            height={CANVAS_H}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="absolute inset-0"
            aria-hidden="true"
          >
            <defs>
              <marker id="stock-order-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#d1d5db" />
              </marker>
              <marker id="stock-order-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#3b82f6" />
              </marker>
              <marker id="stock-order-arrow-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#34d399" />
              </marker>
            </defs>
            {EDGES.map((edge) => {
              const sourceDone = done.has(edge.from);
              const targetDone = done.has(edge.to);
              const hot = hovered === edge.from || hovered === edge.to;
              const stroke = targetDone ? '#34d399' : sourceDone ? '#93c5fd' : '#d1d5db';
              const marker = targetDone
                ? 'url(#stock-order-arrow-done)'
                : hot
                  ? 'url(#stock-order-arrow-hot)'
                  : 'url(#stock-order-arrow)';
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={edgePath(edge.from, edge.to)}
                  fill="none"
                  stroke={hot && !targetDone ? '#3b82f6' : stroke}
                  strokeWidth={hot ? 2.2 : 1.5}
                  markerEnd={marker}
                />
              );
            })}
          </svg>

          {TASKS.map((task) => {
            const status = taskStatus(task.id, done);
            const pos = POSITION[task.id];
            const step = order.indexOf(task.id);
            return (
              <button
                key={task.id}
                type="button"
                title={task.detail}
                onClick={() => trigger(task.id)}
                onMouseEnter={() => setHovered(task.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(task.id)}
                onBlur={() => setHovered(null)}
                aria-label={`${task.label}. ${statusLabel(task.id, done)}. ${task.detail}`}
                className={cn(
                  'absolute flex flex-col justify-center rounded-xl border px-2.5 text-left transition-colors',
                  status === 'ready' && 'cursor-pointer border-blue-500 bg-blue-50 hover:bg-blue-100',
                  status === 'blocked' && 'cursor-not-allowed border-gray-200 bg-gray-50',
                  status === 'done' && 'cursor-pointer border-emerald-500 bg-emerald-50',
                  latest === task.id && 'ring-2 ring-emerald-400',
                )}
                style={{ left: pos.x, top: pos.y, width: CARD_W, height: CARD_H }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'min-w-0 truncate text-[13px] font-medium',
                      status === 'ready' && 'text-blue-950',
                      status === 'blocked' && 'text-gray-400',
                      status === 'done' && 'text-emerald-950',
                    )}
                  >
                    {task.label}
                  </span>
                  {status === 'done' && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                      {step + 1}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'mt-0.5 truncate text-[11px]',
                    status === 'ready' && 'text-blue-700',
                    status === 'blocked' && 'text-gray-400',
                    status === 'done' && 'text-emerald-700',
                  )}
                >
                  {statusLabel(task.id, done)}
                </span>
              </button>
            );
          })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Ready tasks
          </span>
          <span className="text-[11px] tabular-nums text-gray-400">
            {ready.length} can run
          </span>
        </div>
        {ready.length === 0 ? (
          <div className="mt-2 text-xs text-gray-500">
            {finished ? 'Nothing left to run.' : 'No task is ready.'}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {ready.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => trigger(task.id)}
                className="rounded-lg border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100"
              >
                Run {task.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Execution order
          </span>
          <span className="text-[11px] tabular-nums text-gray-400">
            {order.length} / {TASKS.length}
          </span>
        </div>
        {order.length === 0 ? (
          <div className="mt-2 text-xs text-gray-400">No tasks yet. Choose one of the ready tasks.</div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {order.map((id, index) => (
              <div key={id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium',
                    index === order.length - 1
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-emerald-200 bg-white text-emerald-800',
                  )}
                >
                  <span className="font-semibold tabular-nums">{index + 1}</span>
                  {BY_ID[id].label}
                </span>
                {index < order.length - 1 && <span className="text-xs text-gray-300">→</span>}
              </div>
            ))}
          </div>
        )}
        <div
          aria-live="polite"
          className={cn(
            'mt-3 min-h-10 rounded-lg px-3 py-2 text-xs leading-relaxed',
            tone === 'warn' && 'bg-amber-50 text-amber-900',
            tone === 'done' && 'bg-emerald-50 text-emerald-900',
            tone === 'info' && 'bg-gray-50 text-gray-600',
          )}
        >
          {message}
        </div>
      </div>

      <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
        <button
          type="button"
          onClick={undo}
          disabled={order.length === 0}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
        >
          <Undo2 size={15} /> Undo
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>
    </div>
  );
}
