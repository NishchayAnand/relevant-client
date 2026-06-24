"use client";

import React, { useMemo, useState } from "react";
import { Plus, Minus, RotateCcw, Sparkles } from "lucide-react";

const HASH_SPACE = 360;
const SERVER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

type Server = { id: string; hash: number };
type Key = { id: string; hash: number };

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % HASH_SPACE + HASH_SPACE) % HASH_SPACE;
}

function assignKeyToServer(keyHash: number, servers: Server[]): string | null {
  if (servers.length === 0) return null;
  const sorted = [...servers].sort((a, b) => a.hash - b.hash);
  for (const s of sorted) {
    if (s.hash >= keyHash) return s.id;
  }
  return sorted[0].id;
}

function polar(angle: number, radius: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

const INITIAL_SERVERS: Server[] = [
  { id: "S1", hash: hashString("server-alpha") },
  { id: "S2", hash: hashString("server-beta") },
  { id: "S3", hash: hashString("server-gamma") },
];

const INITIAL_KEYS: Key[] = [
  "user:42",
  "user:108",
  "session:abc",
  "session:xyz",
  "cart:9001",
  "cart:7",
  "img:logo",
  "img:avatar",
  "doc:readme",
  "doc:changelog",
].map((id) => ({ id, hash: hashString(id) }));

export default function ConsistentHashingVisualizer() {
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [keys, setKeys] = useState<Key[]>(INITIAL_KEYS);
  const [serverCounter, setServerCounter] = useState(INITIAL_SERVERS.length);
  const [keyCounter, setKeyCounter] = useState(0);
  const [remappedIds, setRemappedIds] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState<string>(
    "Initialized ring with 3 servers and 10 keys"
  );
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const serverColor = useMemo(() => {
    const map = new Map<string, string>();
    servers
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((s, i) => map.set(s.id, SERVER_COLORS[i % SERVER_COLORS.length]));
    return map;
  }, [servers]);

  const assignments = useMemo(() => {
    const map = new Map<string, string | null>();
    keys.forEach((k) => map.set(k.id, assignKeyToServer(k.hash, servers)));
    return map;
  }, [keys, servers]);

  const handleAddServer = () => {
    const id = `S${serverCounter + 1}`;
    const newServer: Server = { id, hash: hashString(`${id}-${Date.now()}`) };
    const before = new Map<string, string | null>();
    keys.forEach((k) => before.set(k.id, assignKeyToServer(k.hash, servers)));
    const nextServers = [...servers, newServer];
    const remapped = new Set<string>();
    keys.forEach((k) => {
      const after = assignKeyToServer(k.hash, nextServers);
      if (after !== before.get(k.id)) remapped.add(k.id);
    });
    setServers(nextServers);
    setServerCounter(serverCounter + 1);
    setRemappedIds(remapped);
    setLastAction(
      `Added ${id} → ${remapped.size} of ${keys.length} keys remapped (${
        keys.length > 0
          ? `${Math.round((remapped.size / keys.length) * 100)}%`
          : "0%"
      })`
    );
  };

  const handleRemoveServer = () => {
    if (servers.length === 0) return;
    const removed = servers[servers.length - 1];
    const before = new Map<string, string | null>();
    keys.forEach((k) => before.set(k.id, assignKeyToServer(k.hash, servers)));
    const nextServers = servers.filter((s) => s.id !== removed.id);
    const remapped = new Set<string>();
    keys.forEach((k) => {
      const after = assignKeyToServer(k.hash, nextServers);
      if (after !== before.get(k.id)) remapped.add(k.id);
    });
    setServers(nextServers);
    setRemappedIds(remapped);
    setLastAction(
      `Removed ${removed.id} → ${remapped.size} of ${keys.length} keys remapped${
        nextServers.length === 0 ? " (no servers left!)" : ""
      }`
    );
  };

  const handleAddKey = () => {
    const id = `key:${keyCounter + 1}`;
    const newKey: Key = { id, hash: hashString(`${id}-${Math.random()}`) };
    setKeys([...keys, newKey]);
    setKeyCounter(keyCounter + 1);
    setRemappedIds(new Set([id]));
    setLastAction(
      `Added ${id} → assigned to ${assignKeyToServer(
        newKey.hash,
        servers
      ) ?? "no server"}`
    );
  };

  const handleReset = () => {
    setServers(INITIAL_SERVERS);
    setKeys(INITIAL_KEYS);
    setServerCounter(INITIAL_SERVERS.length);
    setKeyCounter(0);
    setRemappedIds(new Set());
    setLastAction("Reset to initial ring");
  };

  const SVG_SIZE = 420;
  const cx = SVG_SIZE / 2;
  const cy = SVG_SIZE / 2;
  const ringR = 150;
  const serverR = 14;
  const keyR = 5;

  return (
    <div className="mt-8 mb-10 border rounded-2xl">
      <div className="p-6 sm:p-8 w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-shrink-0 mx-auto">
            <svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="block"
            >
              <circle
                cx={cx}
                cy={cy}
                r={ringR}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={2}
              />

              {[0, 90, 180, 270].map((angle) => {
                const outer = polar(angle, ringR + 8, cx, cy);
                const labelPos = polar(angle, ringR + 24, cx, cy);
                return (
                  <g key={angle}>
                    <line
                      x1={polar(angle, ringR, cx, cy).x}
                      y1={polar(angle, ringR, cx, cy).y}
                      x2={outer.x}
                      y2={outer.y}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fontSize={10}
                      fill="#9ca3af"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="ui-monospace, monospace"
                    >
                      {angle === 0 ? "0" : `${angle}°`}
                    </text>
                  </g>
                );
              })}

              <g>
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#9ca3af"
                  fontFamily="ui-monospace, monospace"
                >
                  hash ring
                </text>
                <text
                  x={cx}
                  y={cy + 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#d1d5db"
                  fontFamily="ui-monospace, monospace"
                >
                  clockwise →
                </text>
              </g>

              {keys.map((k) => {
                const assignedTo = assignments.get(k.id);
                const color = assignedTo
                  ? serverColor.get(assignedTo) ?? "#9ca3af"
                  : "#d1d5db";
                const isRemapped = remappedIds.has(k.id);
                const isHovered = hoveredKey === k.id;
                const pos = polar(k.hash, ringR, cx, cy);
                const labelPos = polar(k.hash, ringR - 14, cx, cy);

                let chord: React.ReactNode = null;
                if (assignedTo && (isHovered || isRemapped)) {
                  const server = servers.find((s) => s.id === assignedTo);
                  if (server) {
                    const sPos = polar(server.hash, ringR, cx, cy);
                    chord = (
                      <path
                        d={`M ${pos.x} ${pos.y} A ${ringR} ${ringR} 0 0 1 ${sPos.x} ${sPos.y}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={isRemapped ? 2 : 1.5}
                        strokeDasharray={isRemapped ? "4 3" : undefined}
                        opacity={isRemapped ? 0.9 : 0.6}
                      />
                    );
                  }
                }

                return (
                  <g
                    key={k.id}
                    onMouseEnter={() => setHoveredKey(k.id)}
                    onMouseLeave={() => setHoveredKey(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {chord}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isRemapped || isHovered ? keyR + 1.5 : keyR}
                      fill={color}
                      stroke={isRemapped ? "#111827" : "#ffffff"}
                      strokeWidth={isRemapped ? 1.5 : 1}
                    />
                    {isHovered && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                        fill="#374151"
                        fontFamily="ui-monospace, monospace"
                      >
                        {k.id}
                      </text>
                    )}
                  </g>
                );
              })}

              {servers.map((s) => {
                const pos = polar(s.hash, ringR, cx, cy);
                const labelPos = polar(s.hash, ringR + 30, cx, cy);
                const color = serverColor.get(s.id) ?? "#374151";
                return (
                  <g key={s.id}>
                    <rect
                      x={pos.x - serverR / 2}
                      y={pos.y - serverR / 2}
                      width={serverR}
                      height={serverR}
                      rx={3}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      transform={`rotate(45 ${pos.x} ${pos.y})`}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill={color}
                      fontFamily="ui-monospace, monospace"
                    >
                      {s.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border p-3">
                <div className="text-[11px] text-gray-500 mb-1">Servers</div>
                <div className="font-mono text-xl font-semibold text-gray-800 tabular-nums">
                  {servers.length}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[11px] text-gray-500 mb-1">Keys</div>
                <div className="font-mono text-xl font-semibold text-blue-600 tabular-nums">
                  {keys.length}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-[11px] text-gray-500 mb-1">
                  Remapped (last op)
                </div>
                <div className="font-mono text-xl font-semibold text-amber-600 tabular-nums">
                  {remappedIds.size}
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    /{keys.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 border rounded-lg px-3 py-2 mb-4 leading-relaxed">
              <span className="font-medium text-gray-700">Last action: </span>
              {lastAction}
            </div>

            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="px-3 py-2 bg-gray-50 border-b text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Key → Server assignments
              </div>
              <div className="max-h-44 overflow-y-auto divide-y">
                {keys.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">
                    no keys
                  </div>
                )}
                {keys.map((k) => {
                  const assignedTo = assignments.get(k.id);
                  const color = assignedTo
                    ? serverColor.get(assignedTo) ?? "#9ca3af"
                    : "#9ca3af";
                  const isRemapped = remappedIds.has(k.id);
                  return (
                    <div
                      key={k.id}
                      onMouseEnter={() => setHoveredKey(k.id)}
                      onMouseLeave={() => setHoveredKey(null)}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors ${
                        hoveredKey === k.id ? "bg-gray-50" : ""
                      } ${isRemapped ? "bg-amber-50/60" : ""}`}
                    >
                      <span className="text-gray-700 truncate">{k.id}</span>
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className="w-2 h-2 rounded-sm rotate-45"
                          style={{ background: color }}
                        />
                        <span style={{ color }}>{assignedTo ?? "—"}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[11px] text-gray-500 leading-relaxed">
              Each key is owned by the first server reached when going{" "}
              <span className="font-medium text-gray-700">clockwise</span> from
              its hashed position. When the cluster changes, only the keys in
              the affected arc move — on average{" "}
              <span className="font-mono text-amber-600">k/n</span>, not all{" "}
              <span className="font-mono">k</span>.
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 sm:px-8 py-3 border-t bg-gray-50 rounded-b-2xl flex-wrap">
        <div className="text-xs text-gray-500">
          Hover a key to see which server owns it. Highlighted keys are the ones
          remapped by the last action.
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddKey}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border rounded-md hover:bg-white"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Add key
          </button>
          <button
            onClick={handleRemoveServer}
            disabled={servers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
            Remove server
          </button>
          <button
            onClick={handleAddServer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add server
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border rounded-md hover:bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
