"use client";

import { useState } from "react";

const VB_W = 1240;
const VB_H = 520;
const ROAD = "#c4c4c8";
const ROUTE = "#4f46e5";
const ROUTE_TEXT = "#4338ca";
const ROUTE_ACTIVE = "#3730a3";
const FONT = "var(--font-geist-sans), ui-sans-serif, sans-serif";

const NODE_IDS = [
  "cp",
  "jantar",
  "windsor",
  "museum",
  "ig",
  "rajendra",
  "kb",
  "paharganj",
  "ndls",
  "ajmeri",
  "cc",
  "rf",
  "barakhamba",
  "mh",
  "ito",
  "dg",
] as const;

type NodeId = (typeof NODE_IDS)[number];
type DestId = "ig" | "kb" | "rf" | "ndls" | "cc";
type Selection = DestId | "all";
type Anchor = "above" | "below" | "left" | "right";
type Kind = "source" | "dest" | "mid";

const NAMES: Record<NodeId, string> = {
  cp: "Connaught Place",
  jantar: "Jantar Mantar",
  windsor: "Windsor Place",
  museum: "National Museum",
  ig: "India Gate",
  rajendra: "Rajendra Place",
  kb: "Karol Bagh",
  paharganj: "Paharganj",
  ndls: "New Delhi Railway Station",
  ajmeri: "Ajmeri Gate",
  cc: "Chandni Chowk",
  rf: "Red Fort",
  barakhamba: "Barakhamba",
  mh: "Mandi House",
  ito: "ITO",
  dg: "Delhi Gate",
};

const POS: Record<NodeId, { x: number; y: number }> = {
  kb: { x: 90, y: 140 },
  rajendra: { x: 250, y: 220 },
  paharganj: { x: 420, y: 130 },
  ndls: { x: 620, y: 130 },
  ajmeri: { x: 820, y: 110 },
  cc: { x: 1000, y: 110 },
  rf: { x: 1160, y: 150 },
  cp: { x: 420, y: 270 },
  barakhamba: { x: 620, y: 270 },
  mh: { x: 820, y: 290 },
  ito: { x: 1000, y: 270 },
  dg: { x: 1120, y: 200 },
  jantar: { x: 420, y: 380 },
  windsor: { x: 620, y: 410 },
  museum: { x: 820, y: 430 },
  ig: { x: 1040, y: 440 },
};

type Edge = {
  u: NodeId;
  v: NodeId;
  km: number;
  road: string;
  points: Array<[number, number]>;
};

function road(u: NodeId, v: NodeId, km: number, name: string, bends: Array<[number, number]> = []): Edge {
  return {
    u,
    v,
    km,
    road: name,
    points: [[POS[u].x, POS[u].y], ...bends, [POS[v].x, POS[v].y]],
  };
}

const EDGES: Edge[] = [
  road("cp", "jantar", 0.7, "Janpath"),
  road("jantar", "windsor", 0.8, "Janpath"),
  road("windsor", "museum", 0.8, "Janpath"),
  road("museum", "ig", 0.9, "Kartavya Path"),
  road("cp", "rajendra", 2.1, "Pusa Road"),
  road("rajendra", "kb", 2.7, "Pusa Road"),
  road("cp", "paharganj", 1.1, "Chelmsford Road"),
  road("paharganj", "ndls", 1.1, "Chelmsford Road"),
  road("ndls", "ajmeri", 1.2, "Qutub Road"),
  road("ajmeri", "cc", 2.4, "S.P. Mukherjee Marg"),
  road("cc", "rf", 1.3, "Chandni Chowk"),
  road("cp", "barakhamba", 0.8, "Barakhamba Road"),
  road("barakhamba", "mh", 1.0, "Sikandra Road"),
  road("mh", "ito", 2.1, "Bahadur Shah Zafar Marg"),
  road("ito", "dg", 1.5, "Mahatma Gandhi Marg"),
  road("dg", "rf", 1.8, "Mahatma Gandhi Marg"),
  road("paharganj", "rajendra", 2.2, "DB Gupta Road"),
  road("paharganj", "ajmeri", 2.9, "Bhavbhuti Marg", [[620, 190]]),
  road("jantar", "barakhamba", 0.9, "Tolstoy Marg"),
  road("windsor", "mh", 1.7, "Copernicus Marg"),
  road("museum", "ito", 2.4, "Tilak Marg"),
  road("dg", "cc", 2.7, "Netaji Subhash Marg"),
  road("ajmeri", "dg", 2.2, "Jawaharlal Nehru Marg"),
];

const DESTINATIONS: DestId[] = ["ig", "kb", "rf", "ndls", "cc"];
const RIVER_ROUTE: NodeId[] = ["cp", "barakhamba", "mh", "ito", "dg", "rf"];

function edgeKey(u: NodeId, v: NodeId) {
  return [u, v].sort().join("|");
}

function pathD(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

const CLOTH = (() => {
  let seed = 29;
  const rnd = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const roads: Array<{ d: string; width: number; trace: boolean }> = [];
  const add = (x0: number, y0: number, x1: number, y1: number, width: number, trace = false) => {
    const points: Array<[number, number]> = [[x0, y0]];
    if (rnd() < 0.42) {
      const t = 0.28 + rnd() * 0.44;
      points.push([x0 + (x1 - x0) * t + (rnd() - 0.5) * 16, y0 + (y1 - y0) * t + (rnd() - 0.5) * 16]);
    }
    points.push([x1, y1]);
    roads.push({ d: pathD(points), width, trace });
  };

  const xs: number[] = [];
  for (let x = -28; x < VB_W + 60; x += 34 + rnd() * 78) xs.push(x);
  const ys: number[] = [];
  for (let y = -22; y < VB_H + 50; y += 22 + rnd() * 58) ys.push(y);
  const jx = xs.map(() => ys.map(() => (rnd() - 0.5) * 22));
  const jy = xs.map(() => ys.map(() => (rnd() - 0.5) * 16));
  const px = (i: number, j: number) => xs[i] + jx[i][j];
  const py = (i: number, j: number) => ys[j] + jy[i][j];

  for (let j = 0; j < ys.length; j += 1) {
    for (let i = 0; i < xs.length - 1; i += 1) {
      if (rnd() < 0.22) continue;
      add(px(i, j), py(i, j), px(i + 1, j), py(i + 1, j), rnd() < 0.14 ? 1.55 : 0.95);
    }
  }
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      if (rnd() < 0.28) continue;
      add(px(i, j), py(i, j), px(i, j + 1), py(i, j + 1), rnd() < 0.12 ? 1.45 : 0.9);
    }
  }

  const traces: Array<[number, number, number, number]> = [
    [70, -8, 390, 530],
    [540, 548, 1010, 18],
    [930, -12, 1270, 250],
  ];
  for (const [x0, y0, x1, y1] of traces) add(x0, y0, x1, y1, 1.15, true);

  return roads;
})();

function findEdge(u: NodeId, v: NodeId) {
  const edge = EDGES.find((item) => (item.u === u && item.v === v) || (item.u === v && item.v === u));
  if (!edge) throw new Error(`Missing road ${u}-${v}`);
  return edge;
}

function shortestFrom(source: NodeId) {
  const dist = Object.fromEntries(NODE_IDS.map((node) => [node, Number.POSITIVE_INFINITY])) as Record<NodeId, number>;
  const prev = Object.fromEntries(NODE_IDS.map((node) => [node, null])) as Record<NodeId, NodeId | null>;
  dist[source] = 0;
  const used = new Set<NodeId>();

  while (used.size < NODE_IDS.length) {
    let best: NodeId | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const node of NODE_IDS) {
      if (!used.has(node) && dist[node] < bestDist) {
        best = node;
        bestDist = dist[node];
      }
    }
    if (best === null || bestDist === Number.POSITIVE_INFINITY) break;
    used.add(best);
    for (const edge of EDGES) {
      const other = edge.u === best ? edge.v : edge.v === best ? edge.u : null;
      if (other === null || used.has(other)) continue;
      const next = dist[best] + edge.km;
      if (next < dist[other]) {
        dist[other] = next;
        prev[other] = best;
      }
    }
  }

  return { dist, prev };
}

function pathTo(prev: Record<NodeId, NodeId | null>, target: NodeId) {
  const nodes: NodeId[] = [];
  let cursor: NodeId | null = target;
  const seen = new Set<NodeId>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    nodes.push(cursor);
    cursor = prev[cursor];
  }
  return nodes.reverse();
}

function routeKm(nodes: NodeId[]) {
  let total = 0;
  for (let i = 0; i < nodes.length - 1; i++) total += findEdge(nodes[i], nodes[i + 1]).km;
  return total;
}

const SEARCH = shortestFrom("cp");
const PATHS = Object.fromEntries(DESTINATIONS.map((id) => [id, pathTo(SEARCH.prev, id)])) as Record<DestId, NodeId[]>;
const PATH_KEYS = Object.fromEntries(
  DESTINATIONS.map((id) => [id, PATHS[id].slice(0, -1).map((node, index) => edgeKey(node, PATHS[id][index + 1]))]),
) as Record<DestId, string[]>;
const TREE_KEYS = new Set(DESTINATIONS.flatMap((id) => PATH_KEYS[id]));
const RIVER_KEYS = new Set(RIVER_ROUTE.slice(0, -1).map((node, index) => edgeKey(node, RIVER_ROUTE[index + 1])));
const RIVER_KM = routeKm(RIVER_ROUTE);

const LABELS: Array<{ id: NodeId; lines: string[]; x: number; y: number; anchor: Anchor; kind: Kind }> = [
  { id: "kb", lines: ["Karol Bagh"], x: 90, y: 122, anchor: "above", kind: "dest" },
  { id: "rajendra", lines: ["Rajendra Place"], x: 250, y: 238, anchor: "below", kind: "mid" },
  { id: "paharganj", lines: ["Paharganj"], x: 402, y: 130, anchor: "left", kind: "mid" },
  { id: "ndls", lines: ["New Delhi", "Railway Station"], x: 620, y: 108, anchor: "above", kind: "dest" },
  { id: "ajmeri", lines: ["Ajmeri Gate"], x: 820, y: 92, anchor: "above", kind: "mid" },
  { id: "cc", lines: ["Chandni Chowk"], x: 1000, y: 90, anchor: "above", kind: "dest" },
  { id: "rf", lines: ["Red Fort"], x: 1160, y: 128, anchor: "above", kind: "dest" },
  { id: "cp", lines: ["Connaught Place"], x: 442, y: 308, anchor: "right", kind: "source" },
  { id: "barakhamba", lines: ["Barakhamba"], x: 648, y: 308, anchor: "right", kind: "mid" },
  { id: "mh", lines: ["Mandi House"], x: 820, y: 338, anchor: "below", kind: "mid" },
  { id: "ito", lines: ["ITO"], x: 1000, y: 250, anchor: "above", kind: "mid" },
  { id: "dg", lines: ["Delhi Gate"], x: 1138, y: 200, anchor: "right", kind: "mid" },
  { id: "jantar", lines: ["Jantar Mantar"], x: 402, y: 380, anchor: "left", kind: "mid" },
  { id: "windsor", lines: ["Windsor Place"], x: 620, y: 456, anchor: "below", kind: "mid" },
  { id: "museum", lines: ["National Museum"], x: 820, y: 468, anchor: "below", kind: "mid" },
  { id: "ig", lines: ["India Gate"], x: 1058, y: 440, anchor: "right", kind: "dest" },
];

function kmLabel(km: number) {
  return `${km.toFixed(1)} km`;
}

const ICON_POS: Record<DestId, { x: number; y: number }> = {
  kb: { x: 58, y: 22 },
  ndls: { x: 456, y: 46 },
  cc: { x: 976, y: 16 },
  rf: { x: 1076, y: 78 },
  ig: { x: 1146, y: 412 },
};

function DestGlyph({ id }: { id: DestId }) {
  if (id === "rf") {
    return (
      <>
        <path d="M1 33 H47" />
        <path d="M5 33 V19 M15 33 V19 M3 19 H17" />
        <path d="M6 19 V16 H14 V19" />
        <path d="M7 16 Q10 8 13 16 M10 8 V5" />
        <path d="M8 24 V29 H12 V24 Q10 22 8 24" />
        <path d="M19 33 V16 H29 V33" />
        <path d="M21.5 33 V23 Q24 17 26.5 23 V33" />
        <path d="M19 16 V13 H21 V16 M22.2 16 V13 H24 V16 M25.2 16 V13 H27 V16 M28 16 V13 H29 V16" />
        <path d="M24 13 V6 M24 8 H28.5 V11.5 H24" />
        <path d="M33 33 V19 M43 33 V19 M31 19 H45" />
        <path d="M34 19 V16 H42 V19" />
        <path d="M35 16 Q38 8 41 16 M38 8 V5" />
        <path d="M36 24 V29 H40 V24 Q38 22 36 24" />
      </>
    );
  }
  if (id === "ig") {
    return (
      <>
        <path d="M6 33 V13 H42 V33" />
        <path d="M15 33 V21 Q24 11 33 21 V33" />
        <path d="M3 13 H45" />
        <path d="M8 13 V8 H40 V13" />
        <path d="M16 8 V4 H32 V8" />
        <path d="M22 4 V1 H26" />
      </>
    );
  }
  if (id === "ndls") {
    return (
      <>
        <path d="M3 31 H45" />
        <path d="M9 31 V15 H35 V31" />
        <path d="M9 22 H35" />
        <path d="M13 15 V10 H20 V15" />
        <path d="M14 15 V22 M20 15 V22 M26 15 V22 M32 15 V22" />
        <circle cx="16" cy="31" r="2.5" />
        <circle cx="29" cy="31" r="2.5" />
        <path d="M35 20 H41 V26 H35" />
      </>
    );
  }
  if (id === "cc") {
    return (
      <>
        <path d="M3 15 H45 L40 21 H8 Z" />
        <path d="M12 21 V33 H36 V21" />
        <path d="M24 21 V33" />
        <path d="M12 27 H24 M24 27 H36" />
        <path d="M22 10 C22 5 30 5 30 10" />
        <path d="M24.5 9.2 C24.5 6.4 28.2 6.4 28.2 9.2" />
      </>
    );
  }
  return (
    <>
      <path d="M10 13 H38 V33 H10 Z" />
      <path d="M16 13 C16 6 32 6 32 13" />
      <path d="M10 19 H38" />
    </>
  );
}

function MapLabel({
  lines,
  x,
  y,
  anchor,
  kind,
  km,
  active,
  dim,
  onClick,
}: {
  lines: string[];
  x: number;
  y: number;
  anchor: Anchor;
  kind: Kind;
  km?: string;
  active: boolean;
  dim: boolean;
  onClick?: () => void;
}) {
  const textAnchor = anchor === "left" ? "end" : anchor === "right" ? "start" : "middle";
  const lineH = 16;
  const extra = kind === "mid" ? 0 : lineH;
  const block = lines.length * lineH + extra;
  const firstY = anchor === "above" ? y - block + 12 : anchor === "below" ? y + 14 : y - ((lines.length - 1) * lineH) / 2;
  const nameFill = dim ? "#d4d4d8" : active ? ROUTE_ACTIVE : kind === "mid" ? "#52525b" : "#171717";
  const kmFill = dim ? "#e4e4e7" : active ? ROUTE_ACTIVE : ROUTE_TEXT;

  return (
    <text
      x={x}
      y={firstY}
      textAnchor={textAnchor}
      fontFamily={FONT}
      fontSize={kind === "mid" ? 13 : 15}
      fontWeight={600}
      fill={nameFill}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : lineH}>
          {line}
        </tspan>
      ))}
      {kind === "source" ? (
        <tspan x={x} dy={15} fontSize={11} fill={kmFill}>
          START
        </tspan>
      ) : null}
      {kind === "dest" ? (
        <tspan x={x} dy={15} fontSize={12} fill={kmFill}>
          {km}
        </tspan>
      ) : null}
    </text>
  );
}

export default function DelhiShortestPathVisualizer() {
  const [selected, setSelected] = useState<Selection>("all");
  const activeKeys = selected === "all" ? TREE_KEYS : new Set(PATH_KEYS[selected]);

  function roleOf(edge: Edge): "shortest" | "alternate" | "other" {
    const key = edgeKey(edge.u, edge.v);
    if (activeKeys.has(key)) return "shortest";
    if (selected === "rf" && RIVER_KEYS.has(key)) return "alternate";
    return "other";
  }

  function shown(id: NodeId) {
    if (selected === "all" || id === "cp") return true;
    if (PATHS[selected].includes(id)) return true;
    return selected === "rf" && RIVER_ROUTE.includes(id);
  }

  function choose(id: NodeId) {
    if (id === "cp" || selected === id) {
      setSelected("all");
      return;
    }
    setSelected(id as DestId);
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <style>{`
        @keyframes delhi-route-march {
          to { stroke-dashoffset: -40; }
        }
        .delhi-route-march {
          animation: delhi-route-march 1.15s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .delhi-route-march { animation: none; }
        }
      `}</style>

      <div className="bg-white">
        <div className="relative">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="block h-auto w-full select-none"
            role="group"
            aria-label="Schematic map of roads and places in central Delhi, with shortest routes from Connaught Place"
          >
            <defs>
              <filter id="delhi-pin-shadow" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
                <feDropShadow dx="0" dy="1.2" stdDeviation="1.5" floodColor="#1e1b4b" floodOpacity="0.4" />
                <feDropShadow dx="0" dy="0" stdDeviation="2.6" floodColor="#4f46e5" floodOpacity="0.55" />
              </filter>
            </defs>
            <rect width={VB_W} height={VB_H} fill="#eef1f4" />
            <g pointerEvents="none" opacity={0.5}>
              {CLOTH.map((road, index) => (
                <path
                  key={`cloth-${index}`}
                  d={road.d}
                  fill="none"
                  stroke={road.trace ? "#b7c3ce" : "#ffffff"}
                  strokeWidth={road.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>

            {EDGES.map((edge) => {
              const quiet = roleOf(edge) === "other" && selected !== "all";
              return (
                <path
                  key={`street-${edge.u}-${edge.v}`}
                  d={pathD(edge.points)}
                  fill="none"
                  stroke={quiet ? "#ececee" : ROAD}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>{`${edge.road}, ${kmLabel(edge.km)}`}</title>
                </path>
              );
            })}
            {EDGES.map((edge) => {
              if (roleOf(edge) !== "shortest") return null;
              return (
                <path
                  key={`short-${edge.u}-${edge.v}`}
                  d={pathD(edge.points)}
                  fill="none"
                  stroke={ROUTE}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {selected !== "all" && EDGES.map((edge) => {
              if (roleOf(edge) !== "shortest") return null;
              return (
                <path
                  key={`march-${edge.u}-${edge.v}`}
                  d={pathD(edge.points)}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeDasharray="5 12"
                  className="delhi-route-march"
                />
              );
            })}
            {selected === "rf" && EDGES.map((edge) => {
              if (roleOf(edge) !== "alternate") return null;
              return (
                <path
                  key={`alt-${edge.u}-${edge.v}`}
                  d={pathD(edge.points)}
                  fill="none"
                  stroke={ROUTE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="1.5 7"
                />
              );
            })}

            {NODE_IDS.map((id) => {
              const on = shown(id);
              const clickable = id === "cp" || (DESTINATIONS as string[]).includes(id);
              return (
                <g
                  key={id}
                  opacity={on ? 1 : 0.35}
                  style={{ cursor: clickable ? "pointer" : "default" }}
                  onClick={clickable ? () => choose(id) : undefined}
                >
                  {clickable ? <circle cx={POS[id].x} cy={POS[id].y} r={18} fill="transparent" /> : null}
                  <circle
                    cx={POS[id].x}
                    cy={POS[id].y}
                    r={clickable ? 6 : 4.5}
                    fill={on ? ROUTE : "#d4d4d8"}
                    filter={clickable ? "url(#delhi-pin-shadow)" : undefined}
                  />
                  <circle cx={POS[id].x} cy={POS[id].y} r={clickable ? 2.2 : 1.6} fill="#ffffff" />
                </g>
              );
            })}

            {selected === "rf" && (
              <g>
                <rect x={888} y={228} width={54} height={16} rx={8} fill={ROUTE} />
                <text x={915} y={239} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff" fontFamily={FONT}>
                  {kmLabel(RIVER_KM)}
                </text>
              </g>
            )}

            {LABELS.map((label) => {
              const destination = label.kind === "dest";
              return (
                <MapLabel
                  key={label.id}
                  lines={label.lines}
                  x={label.x}
                  y={label.y}
                  anchor={label.anchor}
                  kind={label.kind}
                  km={destination ? kmLabel(SEARCH.dist[label.id]) : undefined}
                  active={destination && selected === label.id}
                  dim={!shown(label.id)}
                  onClick={label.kind === "mid" ? undefined : () => choose(label.id)}
                />
              );
            })}
            {DESTINATIONS.map((id) => {
              const place = ICON_POS[id];
              const active = selected === id;
              const dim = !shown(id);
              return (
                <g
                  key={`icon-${id}`}
                  transform={`translate(${place.x} ${place.y})`}
                  fill="none"
                  stroke={dim ? "#d4d4d8" : active ? ROUTE_ACTIVE : ROUTE_TEXT}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ cursor: "pointer" }}
                  onClick={() => choose(id)}
                  aria-hidden="true"
                >
                  <DestGlyph id={id} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex flex-nowrap items-center gap-1 border-t border-neutral-200 px-3 py-2.5">
        {DESTINATIONS.map((id) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-full border px-1.5 py-1 text-[11px] transition-colors ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              <span className="font-medium">{NAMES[id]}</span>
              <span className={`ml-1 tabular-nums ${active ? "text-indigo-100" : "font-semibold text-indigo-700"}`}>
                {kmLabel(SEARCH.dist[id])}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSelected("all")}
          disabled={selected === "all"}
          className={`ml-auto whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${
            selected === "all"
              ? "cursor-default border-neutral-200 bg-neutral-50 text-neutral-400"
              : "border-neutral-300 bg-white text-neutral-800 hover:border-indigo-300 hover:bg-indigo-50"
          }`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
