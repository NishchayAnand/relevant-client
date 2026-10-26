'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Database, HardDrive, Monitor, RotateCcw, Server } from 'lucide-react';

type Phase =
  | 'writing-disk'
  | 'writing-index'
  | 'live'
  | 'dropping-index'
  | 'dropping-disk';

type StoredObject = {
  key: string;
  contentType: string;
  payload: string;
  location: string;
  phase: Phase;
};

type Op = 'put' | 'get' | 'delete';

type Trace = {
  op: Op;
  step: number;
  key: string;
  location: string | null;
  ok: boolean;
  detail: string;
};

type Packet = {
  x: number;
  direction: 'request' | 'response';
  label: string;
  op: Op;
};

const STEP_MS = 760;
const PACKET_MS = STEP_MS - 90;

const LOCATION_IDS = ['7f3a', '91c2', 'c04e', '18ab', 'd77b', '4e21', 'aa90', 'b316'];

const EXAMPLES = [
  { key: 'user-123-profile', contentType: 'image/jpeg', payload: 'profile photo' },
  { key: 'report-2026', contentType: 'application/pdf', payload: 'Q1 report' },
  { key: 'sensor-42', contentType: 'application/json', payload: '{"temp":21}' },
];

function settle(list: StoredObject[]): StoredObject[] {
  return list
    .filter((object) => object.phase !== 'dropping-index' && object.phase !== 'dropping-disk')
    .map((object) => ({ ...object, phase: 'live' as Phase }));
}

function inIndex(phase: Phase) {
  return phase === 'writing-index' || phase === 'live' || phase === 'dropping-index';
}

function accent(op: Op) {
  if (op === 'put') return { border: '#a5b4fc', bg: '#eef2ff', text: '#3730a3', dot: '#6366f1' };
  if (op === 'get') return { border: '#6ee7b7', bg: '#ecfdf5', text: '#065f46', dot: '#10b981' };
  return { border: '#fda4af', bg: '#fff1f2', text: '#9f1239', dot: '#f43f5e' };
}

function stepLabels(trace: Trace): string[] {
  if (trace.op === 'put') {
    return [
      'Request in flight',
      `Write bytes to ${trace.location}`,
      'Record key and location',
      'Response in flight',
    ];
  }
  if (trace.op === 'get') {
    return trace.ok
      ? [
          'Request in flight',
          `Look up ${trace.key} in index`,
          `Read bytes from ${trace.location}`,
          'Response in flight',
        ]
      : [
          'Request in flight',
          `Look up ${trace.key} in index · no row`,
          'Disk is not read',
          'Response in flight',
        ];
  }
  return trace.ok
    ? [
        'Request in flight',
        'Drop key from index',
        `Drop ${trace.location} from disk`,
        'Response in flight',
      ]
    : [
        'Request in flight',
        'Index has no row for this key',
        'Disk is not changed',
        'Response in flight',
      ];
}

export default function ObjectStoreMachineVisualizer() {
  const [keyInput, setKeyInput] = useState(EXAMPLES[0].key);
  const [contentType, setContentType] = useState(EXAMPLES[0].contentType);
  const [payload, setPayload] = useState(EXAMPLES[0].payload);
  const [objects, setObjects] = useState<StoredObject[]>([]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [packet, setPacket] = useState<Packet | null>(null);

  const objectsRef = useRef<StoredObject[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const sync = (next: StoredObject[]) => {
    objectsRef.current = next;
    setObjects(next);
  };

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const after = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const begin = () => {
    clearTimers();
    setPacket(null);
    const settled = settle(objectsRef.current);
    sync(settled);
    return settled;
  };

  const allocateLocation = (list: StoredObject[]) => {
    const used = new Set(list.map((object) => object.location));
    for (const id of LOCATION_IDS) {
      const location = `blobs/${id}`;
      if (!used.has(location)) return location;
    }
    return `blobs/${Math.random().toString(16).slice(2, 6)}`;
  };

  const launchPacket = (direction: 'request' | 'response', label: string, op: Op) => {
    const startX = direction === 'request' ? 0 : 1;
    const endX = direction === 'request' ? 1 : 0;
    setPacket({ x: startX, direction, label, op });
    after(30, () => {
      setPacket((current) => (current ? { ...current, x: endX } : null));
    });
  };

  const handlePut = () => {
    const key = keyInput.trim();
    const data = payload.trim();
    const metadata = contentType.trim() || 'application/octet-stream';
    if (!key || !data) return;

    const settled = begin();
    const existing = settled.find((object) => object.key === key);
    const location = existing?.location ?? allocateLocation(settled);
    const record: StoredObject = {
      key,
      contentType: metadata,
      payload: data,
      location,
      phase: 'writing-disk',
    };

    setTrace({
      op: 'put',
      step: 0,
      key,
      location,
      ok: true,
      detail: `put("${key}", "${data}")`,
    });
    launchPacket('request', `PUT ${key} · ${data.length}B`, 'put');

    after(STEP_MS, () => {
      setPacket(null);
      setTrace((t) => (t ? { ...t, step: 1 } : t));
      sync([...settled.filter((object) => object.key !== key), record]);
    });
    after(STEP_MS * 2, () => {
      setTrace((t) => (t ? { ...t, step: 2 } : t));
      sync(
        objectsRef.current.map((object) =>
          object.key === key ? { ...object, phase: 'writing-index' } : object,
        ),
      );
    });
    after(STEP_MS * 3, () => {
      setTrace((t) => (t ? { ...t, step: 3 } : t));
      sync(
        objectsRef.current.map((object) =>
          object.key === key ? { ...object, phase: 'live' } : object,
        ),
      );
      launchPacket('response', '200 OK', 'put');
    });
    after(STEP_MS * 4, () => {
      setPacket(null);
    });
  };

  const handleGet = () => {
    const key = keyInput.trim();
    if (!key) return;

    const settled = begin();
    const found = settled.find((object) => object.key === key);
    setTrace({
      op: 'get',
      step: 0,
      key,
      location: found?.location ?? null,
      ok: Boolean(found),
      detail: found ? `get("${key}") → ${found.payload}` : `get("${key}") → nothing`,
    });
    launchPacket('request', `GET ${key}`, 'get');

    after(STEP_MS, () => {
      setPacket(null);
      setTrace((t) => (t ? { ...t, step: 1 } : t));
    });
    after(STEP_MS * 2, () => {
      setTrace((t) => (t ? { ...t, step: 2 } : t));
    });
    after(STEP_MS * 3, () => {
      setTrace((t) => (t ? { ...t, step: 3 } : t));
      const label = found ? `200 OK · ${found.payload.length}B` : '404 Not Found';
      launchPacket('response', label, 'get');
    });
    after(STEP_MS * 4, () => {
      setPacket(null);
    });
  };

  const handleDelete = () => {
    const key = keyInput.trim();
    if (!key) return;

    const settled = begin();
    const found = settled.find((object) => object.key === key);
    setTrace({
      op: 'delete',
      step: 0,
      key,
      location: found?.location ?? null,
      ok: Boolean(found),
      detail: `delete("${key}")`,
    });
    launchPacket('request', `DELETE ${key}`, 'delete');

    after(STEP_MS, () => {
      setPacket(null);
      setTrace((t) => (t ? { ...t, step: 1 } : t));
      if (found) {
        sync(
          objectsRef.current.map((object) =>
            object.key === key ? { ...object, phase: 'dropping-index' } : object,
          ),
        );
      }
    });
    after(STEP_MS * 2, () => {
      setTrace((t) => (t ? { ...t, step: 2 } : t));
      if (found) {
        sync(
          objectsRef.current.map((object) =>
            object.key === key ? { ...object, phase: 'dropping-disk' } : object,
          ),
        );
      }
    });
    after(STEP_MS * 3, () => {
      setTrace((t) => (t ? { ...t, step: 3 } : t));
      if (found) {
        sync(objectsRef.current.filter((object) => object.key !== key));
      }
      launchPacket('response', '204 No Content', 'delete');
    });
    after(STEP_MS * 4, () => {
      setPacket(null);
    });
  };

  const handleReset = () => {
    clearTimers();
    sync([]);
    setTrace(null);
    setPacket(null);
  };

  const keyValid = keyInput.trim().length > 0;
  const payloadValid = payload.trim().length > 0;
  const colors = trace ? accent(trace.op) : null;

  const clientHot = Boolean(trace && (trace.step === 0 || trace.step === 3));
  const apiHot = Boolean(trace && (trace.step === 0 || trace.step === 3));
  const indexHot = Boolean(
    trace &&
      ((trace.op === 'put' && trace.step === 2) ||
        (trace.op === 'get' && trace.step === 1) ||
        (trace.op === 'delete' && trace.step === 1)),
  );
  const diskHot = Boolean(
    trace &&
      ((trace.op === 'put' && trace.step === 1) ||
        (trace.op === 'get' && trace.ok && trace.step === 2) ||
        (trace.op === 'delete' && trace.ok && trace.step === 2)),
  );

  return (
    <div className="mt-5 mb-10 border border-gray-200 rounded-2xl overflow-hidden font-sans bg-white">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-end gap-3 flex-wrap">
          <Field label="key">
            <input
              type="text"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && keyValid && payloadValid) handlePut();
              }}
              className="w-44 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </Field>
          <Field label="metadata">
            <input
              type="text"
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              placeholder="image/jpeg"
              className="w-40 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </Field>
          <Field label="data">
            <input
              type="text"
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && keyValid && payloadValid) handlePut();
              }}
              className="w-36 h-9 border border-gray-200 rounded-lg px-3 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </Field>
          <div className="flex gap-2">
            <ActionButton label="Put" onClick={handlePut} disabled={!keyValid || !payloadValid} tone="put" />
            <ActionButton label="Get" onClick={handleGet} disabled={!keyValid} tone="get" />
            <ActionButton label="Delete" onClick={handleDelete} disabled={!keyValid} tone="delete" />
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto mb-0.5 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear the machine"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.key}
              type="button"
              onClick={() => {
                setKeyInput(example.key);
                setContentType(example.contentType);
                setPayload(example.payload);
              }}
              className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-xs font-mono text-gray-600 hover:border-gray-300"
            >
              {example.key}
            </button>
          ))}
        </div>

        {trace && colors && (
          <div className="mt-3">
            <div
              className="mb-2 px-3 py-2 rounded-lg text-sm border font-mono"
              style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
            >
              <span className="font-semibold">{trace.detail}</span>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-4 gap-2 list-none p-0 m-0">
              {stepLabels(trace).map((label, index) => {
                const active = trace.step === index;
                return (
                  <li
                    key={`${label}-${index}`}
                    className="rounded-lg border px-2.5 py-2 text-xs leading-snug flex items-start gap-1.5"
                    style={{
                      background: active ? colors.bg : '#ffffff',
                      borderColor: active ? colors.border : '#f1f5f9',
                      color: active ? colors.text : '#94a3b8',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span className="font-mono tabular-nums">{index + 1}.</span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      <div className="px-5 py-6" aria-label="Single-machine object store">
        <div className="grid grid-cols-[112px_minmax(96px,1fr)_minmax(0,2.4fr)] items-stretch gap-3 min-h-[320px]">
          <ClientNode active={clientHot} op={trace?.op ?? null} />
          <WireNode packet={packet} />
          <ServerNode
            objects={objects}
            trace={trace}
            apiHot={apiHot}
            indexHot={indexHot}
            diskHot={diskHot}
          />
        </div>
      </div>
    </div>
  );
}

function ClientNode({ active, op }: { active: boolean; op: Op | null }) {
  const colors = op ? accent(op) : null;
  return (
    <div
      className="rounded-xl border flex flex-col items-center justify-center gap-2 py-6 transition-colors"
      style={{
        borderColor: active && colors ? colors.border : '#e5e7eb',
        background: active && colors ? colors.bg : '#ffffff',
      }}
    >
      <div
        className="w-14 h-10 rounded-md border-2 flex items-center justify-center shadow-sm"
        style={{
          borderColor: active && colors ? colors.dot : '#cbd5e1',
          background: '#ffffff',
        }}
      >
        <Monitor size={18} color={active && colors ? colors.dot : '#64748b'} />
      </div>
      <div className="w-10 h-1 rounded-sm bg-gray-200" />
      <div className="w-14 h-1 rounded-sm bg-gray-300" />
      <span className="text-xs text-gray-500 font-medium mt-1">client</span>
    </div>
  );
}

function WireNode({ packet }: { packet: Packet | null }) {
  const colors = packet ? accent(packet.op) : null;
  return (
    <div className="relative flex items-center">
      <div
        className="w-full h-px"
        style={{
          background: 'repeating-linear-gradient(90deg, #cbd5e1 0 6px, transparent 6px 12px)',
        }}
      />
      <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-between pointer-events-none px-0.5 text-[9px] text-gray-300 font-mono select-none">
        <span>→</span>
        <span>←</span>
      </div>
      {packet && colors && (
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-sm whitespace-nowrap"
          style={{
            left: `${packet.x * 100}%`,
            background: colors.bg,
            borderColor: colors.border,
            color: colors.text,
            transition: `left ${PACKET_MS}ms linear`,
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
          <span className="font-mono text-[10px] font-semibold tracking-tight">{packet.label}</span>
        </div>
      )}
    </div>
  );
}

function ServerNode({
  objects,
  trace,
  apiHot,
  indexHot,
  diskHot,
}: {
  objects: StoredObject[];
  trace: Trace | null;
  apiHot: boolean;
  indexHot: boolean;
  diskHot: boolean;
}) {
  const colors = trace ? accent(trace.op) : null;
  const alive = trace !== null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-slate-200">
        <div className="flex items-center gap-2">
          <Server size={14} />
          <span className="text-[11px] font-mono tracking-tight">server · one machine</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LED color="#10b981" blink />
          <LED color={alive && colors ? colors.dot : '#475569'} blink={alive} />
          <LED color="#475569" />
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        <div
          className="rounded-lg border px-3 py-1.5 transition-colors"
          style={{
            borderColor: apiHot && colors ? colors.border : '#e2e8f0',
            background: apiHot && colors ? colors.bg : '#ffffff',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
              Object store API
            </span>
            <span className="font-mono text-[10px] text-gray-500">put · get · delete</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Panel icon={<Database size={13} />} title="Metadata index" subtitle="key → location" hot={indexHot} trace={trace}>
            {objects.filter((object) => inIndex(object.phase)).length === 0 ? (
              <p className="text-[11px] text-gray-300 font-mono italic">empty</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {objects
                  .filter((object) => inIndex(object.phase))
                  .map((object) => {
                    const hot =
                      object.phase === 'writing-index' ||
                      object.phase === 'dropping-index' ||
                      (trace?.op === 'get' && trace.step === 1 && trace.key === object.key) ||
                      (trace?.op === 'delete' && trace.step === 1 && trace.key === object.key);
                    const tone = trace ? accent(trace.op) : accent('put');
                    return (
                      <li
                        key={object.key}
                        className="rounded-md border px-2 py-1 transition-colors"
                        style={{
                          background: hot ? tone.bg : '#f8fafc',
                          borderColor: hot ? tone.border : '#e2e8f0',
                        }}
                      >
                        <div className="font-mono text-[11px] font-semibold text-slate-800 break-words">
                          {object.key}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5 break-words">
                          {object.contentType} · {object.location}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Panel>

          <Panel icon={<HardDrive size={13} />} title="Disk /dev/sda" subtitle="bytes by location" hot={diskHot} trace={trace}>
            {objects.length === 0 ? (
              <p className="text-[11px] text-gray-300 font-mono italic">empty</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {objects.map((object) => {
                  const hot =
                    object.phase === 'writing-disk' ||
                    object.phase === 'dropping-disk' ||
                    (trace?.op === 'get' && trace.ok && trace.step === 2 && trace.key === object.key);
                  const tone = trace ? accent(trace.op) : accent('put');
                  return (
                    <li
                      key={object.location}
                      className="rounded-md border px-2 py-1 flex items-center gap-2 transition-colors"
                      style={{
                        background: hot ? tone.bg : '#f8fafc',
                        borderColor: hot ? tone.border : '#e2e8f0',
                      }}
                    >
                      <span
                        className="inline-block w-1.5 h-6 rounded-sm"
                        style={{ background: hot ? tone.dot : '#cbd5e1' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] font-semibold text-slate-800">
                          {object.location}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5 break-words">
                          {object.payload} · {object.payload.length} bytes
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  hot,
  trace,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  hot: boolean;
  trace: Trace | null;
  children: ReactNode;
}) {
  const tone = trace ? accent(trace.op) : null;
  return (
    <section
      className="rounded-lg border p-2.5 min-h-[140px] transition-colors"
      style={{
        borderColor: hot && tone ? tone.border : '#e2e8f0',
        background: hot && tone ? tone.bg : '#ffffff',
      }}
    >
      <div className="mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
          <span style={{ color: hot && tone ? tone.dot : '#64748b' }}>{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{subtitle}</span>
      </div>
      {children}
    </section>
  );
}

function LED({ color, blink = false }: { color: string; blink?: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${blink ? 'animate-pulse' : ''}`}
      style={{ background: color }}
    />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      {children}
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone: Op;
}) {
  const className =
    tone === 'put'
      ? 'bg-indigo-600 hover:bg-indigo-700'
      : tone === 'get'
        ? 'bg-emerald-600 hover:bg-emerald-700'
        : 'bg-rose-600 hover:bg-rose-700';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-4 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${className}`}
    >
      {label}
    </button>
  );
}
