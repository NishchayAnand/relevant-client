"use client";

import { useRef, useState, type PointerEvent } from "react";

const FONT = "var(--font-geist-sans), ui-sans-serif, sans-serif";
const ROAD = "#c4c4c8";
const ROUTE = "#4f46e5";
const ROUTE_TEXT = "#4338ca";
const INK = "#171717";

const VB_W = 1320;
const VB_H = 840;
const VIEW = { x: 330, y: 300, width: 960, height: 540 };

type Id =
  | "cp"
  | "jantar"
  | "windsor"
  | "museum"
  | "ig"
  | "rajendra"
  | "kb"
  | "paharganj"
  | "ndls"
  | "ajmeri"
  | "cc"
  | "rf"
  | "barakhamba"
  | "mh"
  | "ito"
  | "dg"
  | "bangla"
  | "khan"
  | "pm"
  | "jm"
  | "patel"
  | "jhande"
  | "talk"
  | "rb"
  | "ramnagar"
  | "udyog"
  | "jaipur"
  | "sadar"
  | "kashmere"
  | "lodhi"
  | "kamla"
  | "nirman"
  | "ramlila";

const FOCUS = new Set<Id>(["cp", "barakhamba", "mh", "ito", "jantar", "windsor", "udyog", "museum", "jaipur", "ig", "khan", "lodhi"]);

const POS: Record<Id, { x: number; y: number }> = {
  kb: { x: 90, y: 250 },
  rajendra: { x: 250, y: 330 },
  paharganj: { x: 420, y: 240 },
  ndls: { x: 620, y: 240 },
  ajmeri: { x: 820, y: 220 },
  cc: { x: 1000, y: 220 },
  rf: { x: 1160, y: 260 },
  cp: { x: 420, y: 380 },
  barakhamba: { x: 620, y: 380 },
  mh: { x: 820, y: 400 },
  ito: { x: 1000, y: 380 },
  dg: { x: 1120, y: 310 },
  jantar: { x: 420, y: 490 },
  windsor: { x: 620, y: 520 },
  museum: { x: 820, y: 540 },
  ig: { x: 1040, y: 550 },
  bangla: { x: 150, y: 565 },
  patel: { x: 78, y: 162 },
  jhande: { x: 250, y: 166 },
  talk: { x: 64, y: 638 },
  rb: { x: 300, y: 646 },
  ramnagar: { x: 730, y: 210 },
  udyog: { x: 720, y: 530 },
  jaipur: { x: 930, y: 545 },
  khan: { x: 1120, y: 640 },
  pm: { x: 1248, y: 440 },
  jm: { x: 1272, y: 286 },
  sadar: { x: 280, y: 42 },
  kashmere: { x: 900, y: 46 },
  lodhi: { x: 1120, y: 770 },
  kamla: { x: 700, y: 118 },
  nirman: { x: 740, y: 670 },
  ramlila: { x: 620, y: 300 },
};

type Edge = { u: Id; v: Id; km: number; points: Array<[number, number]> };

function road(u: Id, v: Id, km: number, bends: Array<[number, number]> = []): Edge {
  return { u, v, km, points: [[POS[u].x, POS[u].y], ...bends, [POS[v].x, POS[v].y]] };
}

const EDGES: Edge[] = [
  road("cp", "jantar", 0.7),
  road("jantar", "windsor", 0.8),
  road("windsor", "udyog", 0.4),
  road("udyog", "museum", 0.4),
  road("museum", "jaipur", 0.4),
  road("jaipur", "ig", 0.5),
  road("cp", "rajendra", 2.1),
  road("rajendra", "kb", 2.7),
  road("cp", "paharganj", 1.1),
  road("paharganj", "ndls", 1.1),
  road("ndls", "ramnagar", 0.6),
  road("ramnagar", "ajmeri", 0.6),
  road("ajmeri", "cc", 2.4),
  road("cc", "rf", 1.3),
  road("cp", "barakhamba", 0.8),
  road("barakhamba", "mh", 1.0),
  road("mh", "ito", 2.1),
  road("ito", "dg", 1.5),
  road("dg", "rf", 1.8),
  road("paharganj", "rajendra", 2.2),
  road("paharganj", "ramlila", 1.4),
  road("ramlila", "ajmeri", 1.5),
  road("jantar", "barakhamba", 0.9),
  road("windsor", "mh", 1.7),
  road("museum", "ito", 2.4),
  road("dg", "cc", 2.7),
  road("ajmeri", "dg", 2.2),
  road("cp", "bangla", 1.4, [[300, 440]]),
  road("jantar", "bangla", 1.2),
  road("museum", "khan", 0.8),
  road("ig", "khan", 1.4),
  road("ito", "pm", 1.1),
  road("dg", "pm", 1.6),
  road("cc", "jm", 0.6, [[1140, 138], [1272, 138]]),
  road("rf", "jm", 1.2, [[1272, 260]]),
  road("rajendra", "jhande", 1.3),
  road("kb", "jhande", 1.7),
  road("kb", "patel", 2.2),
  road("bangla", "talk", 1.1),
  road("jantar", "rb", 2.0),
  road("bangla", "rb", 1.6),
  road("jhande", "sadar", 1.5),
  road("ndls", "kamla", 0.5),
  road("kamla", "ramnagar", 0.4),
  road("udyog", "nirman", 0.5),
  road("ajmeri", "kashmere", 1.9, [[900, 200]]),
  road("khan", "lodhi", 1.2),
];

function inFocus(edge: Edge) {
  return FOCUS.has(edge.u) && FOCUS.has(edge.v);
}

const PATHS = [
  { id: "p1", km: 4.3, edges: ["cp|jantar", "jantar|windsor", "udyog|windsor", "museum|udyog", "khan|museum", "khan|lodhi"] },
  { id: "p2", km: 5.3, edges: ["barakhamba|cp", "barakhamba|jantar", "jantar|windsor", "udyog|windsor", "museum|udyog", "khan|museum", "khan|lodhi"] },
  { id: "p3", km: 5.8, edges: ["cp|jantar", "jantar|windsor", "udyog|windsor", "museum|udyog", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p4", km: 6.3, edges: ["barakhamba|cp", "barakhamba|mh", "mh|windsor", "udyog|windsor", "museum|udyog", "khan|museum", "khan|lodhi"] },
  { id: "p5", km: 6.8, edges: ["barakhamba|cp", "barakhamba|jantar", "jantar|windsor", "udyog|windsor", "museum|udyog", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p6", km: 7.1, edges: ["cp|jantar", "barakhamba|jantar", "barakhamba|mh", "mh|windsor", "udyog|windsor", "museum|udyog", "khan|museum", "khan|lodhi"] },
  { id: "p7", km: 7.8, edges: ["barakhamba|cp", "barakhamba|mh", "mh|windsor", "udyog|windsor", "museum|udyog", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p8", km: 8.3, edges: ["barakhamba|cp", "barakhamba|mh", "ito|mh", "ito|museum", "khan|museum", "khan|lodhi"] },
  { id: "p9", km: 8.6, edges: ["cp|jantar", "barakhamba|jantar", "barakhamba|mh", "mh|windsor", "udyog|windsor", "museum|udyog", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p10", km: 9.1, edges: ["cp|jantar", "barakhamba|jantar", "barakhamba|mh", "ito|mh", "ito|museum", "khan|museum", "khan|lodhi"] },
  { id: "p11", km: 9.7, edges: ["cp|jantar", "jantar|windsor", "mh|windsor", "ito|mh", "ito|museum", "khan|museum", "khan|lodhi"] },
  { id: "p12", km: 9.8, edges: ["barakhamba|cp", "barakhamba|mh", "ito|mh", "ito|museum", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p13", km: 10.6, edges: ["cp|jantar", "barakhamba|jantar", "barakhamba|mh", "ito|mh", "ito|museum", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p14", km: 10.7, edges: ["barakhamba|cp", "barakhamba|jantar", "jantar|windsor", "mh|windsor", "ito|mh", "ito|museum", "khan|museum", "khan|lodhi"] },
  { id: "p15", km: 11.2, edges: ["cp|jantar", "jantar|windsor", "mh|windsor", "ito|mh", "ito|museum", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
  { id: "p16", km: 12.2, edges: ["barakhamba|cp", "barakhamba|jantar", "jantar|windsor", "mh|windsor", "ito|mh", "ito|museum", "jaipur|museum", "ig|jaipur", "ig|khan", "khan|lodhi"] },
];

const LAND = "#eef1f4";
const PILL_H = 18;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.25;
const DULL = "#c5c5cc";
const DULL_INK = "#a3a3ab";

type Anchor = "above" | "below" | "left" | "right";

const DULL_LABELS: Array<{ id: Id; lines: string[]; x: number; y: number; anchor: Anchor }> = [
  { id: "kb", lines: ["Karol Bagh"], x: 108, y: 250, anchor: "right" },
  { id: "patel", lines: ["Patel Nagar"], x: 96, y: 162, anchor: "right" },
  { id: "jhande", lines: ["Jhandewalan"], x: 268, y: 166, anchor: "right" },
  { id: "sadar", lines: ["Sadar Bazar"], x: 298, y: 42, anchor: "right" },
  { id: "kashmere", lines: ["Kashmere Gate"], x: 918, y: 46, anchor: "right" },
  { id: "kamla", lines: ["Kamla Market"], x: 700, y: 100, anchor: "above" },
  { id: "talk", lines: ["Talkatora"], x: 82, y: 638, anchor: "right" },
  { id: "rb", lines: ["Rashtrapati", "Bhavan"], x: 300, y: 622, anchor: "above" },
  { id: "rajendra", lines: ["Rajendra Place"], x: 250, y: 308, anchor: "above" },
  { id: "paharganj", lines: ["Paharganj"], x: 420, y: 218, anchor: "above" },
  { id: "ramnagar", lines: ["Ram Nagar"], x: 730, y: 188, anchor: "above" },
  { id: "ndls", lines: ["New Delhi", "Railway Station"], x: 620, y: 218, anchor: "above" },
  { id: "ajmeri", lines: ["Ajmeri Gate"], x: 820, y: 198, anchor: "above" },
  { id: "cc", lines: ["Chandni Chowk"], x: 1000, y: 200, anchor: "above" },
  { id: "rf", lines: ["Red Fort"], x: 1160, y: 238, anchor: "above" },
  { id: "ito", lines: ["ITO"], x: 1000, y: 358, anchor: "above" },
  { id: "dg", lines: ["Delhi Gate"], x: 1102, y: 310, anchor: "left" },
  { id: "udyog", lines: ["Udyog Bhawan"], x: 700, y: 508, anchor: "above" },
  { id: "museum", lines: ["National Museum"], x: 840, y: 518, anchor: "above" },
  { id: "jaipur", lines: ["Jaipur House"], x: 980, y: 523, anchor: "above" },
  { id: "ig", lines: ["India Gate"], x: 1058, y: 550, anchor: "right" },
  { id: "bangla", lines: ["Bangla Sahib"], x: 150, y: 542, anchor: "above" },
  { id: "khan", lines: ["Khan Market"], x: 1140, y: 640, anchor: "right" },
  { id: "pm", lines: ["Pragati", "Maidan"], x: 1248, y: 464, anchor: "below" },
  { id: "jm", lines: ["Jama Masjid"], x: 1254, y: 318, anchor: "left" },
  { id: "lodhi", lines: ["Lodhi Garden"], x: 1138, y: 770, anchor: "right" },
  { id: "nirman", lines: ["Nirman Bhawan"], x: 788, y: 670, anchor: "right" },
  { id: "ramlila", lines: ["Ramlila Maidan"], x: 602, y: 300, anchor: "left" },
];
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function clampOrigin(x: number, y: number, width: number, height: number) {
  const loX = Math.min(VIEW.x, VIEW.x + VIEW.width - width);
  const hiX = Math.max(VIEW.x, VIEW.x + VIEW.width - width);
  const loY = Math.min(VIEW.y, VIEW.y + VIEW.height - height);
  const hiY = Math.max(VIEW.y, VIEW.y + VIEW.height - height);
  return {
    x: Math.min(hiX, Math.max(loX, x)),
    y: Math.min(hiY, Math.max(loY, y)),
  };
}

const LABELS: Array<{ id: Id; name: string; lift: number; below?: boolean; mark?: string }> = [
  { id: "cp", name: "Connaught Place", lift: 18, mark: "START" },
  { id: "barakhamba", name: "Barakhamba", lift: 18 },
  { id: "mh", name: "Mandi House", lift: 18 },
  { id: "ito", name: "ITO", lift: 18 },
  { id: "jantar", name: "Jantar Mantar", lift: 24, below: true },
  { id: "windsor", name: "Windsor Place", lift: 18 },
  { id: "udyog", name: "Udyog Bhawan", lift: 36, below: true },
  { id: "museum", name: "National Museum", lift: 32 },
  { id: "jaipur", name: "Jaipur House", lift: 20 },
  { id: "ig", name: "India Gate", lift: 18 },
  { id: "khan", name: "Khan Market", lift: 18 },
  { id: "lodhi", name: "Lodhi Garden", lift: 22, below: true, mark: "END" },
];

function edgeKey(u: Id, v: Id) {
  return [u, v].sort().join("|");
}

function pathD(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

function kmText(value: number) {
  return `${value.toFixed(1)} km`;
}

function pillSpot(edge: Edge) {
  const [x0, y0] = edge.points[0];
  const [x1, y1] = edge.points[edge.points.length - 1];
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
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
  return roads;
})();

export default function ShortestPathSubpathVisualizer() {
  const [selected, setSelected] = useState(PATHS[0].id);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: VIEW.x, y: VIEW.y });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const activeIndex = Math.max(0, PATHS.findIndex((path) => path.id === selected));
  const active = PATHS[activeIndex];
  const activeEdges = new Set(active.edges);
  const frameWidth = VIEW.width / zoom;
  const frameHeight = VIEW.height / zoom;
  const frame = {
    x: origin.x,
    y: origin.y,
    width: frameWidth,
    height: frameHeight,
  };

  function changeZoom(direction: 1 | -1) {
    const next = clampZoom(zoom + direction * ZOOM_STEP);
    if (next === zoom) return;
    const centerX = origin.x + frameWidth / 2;
    const centerY = origin.y + frameHeight / 2;
    const nextWidth = VIEW.width / next;
    const nextHeight = VIEW.height / next;
    setZoom(next);
    setOrigin(clampOrigin(centerX - nextWidth / 2, centerY - nextHeight / 2, nextWidth, nextHeight));
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only available for an active pointer.
    }
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: origin.x, originY: origin.y };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - start.x) / rect.width) * frameWidth;
    const dy = ((event.clientY - start.y) / rect.height) * frameHeight;
    setOrigin(clampOrigin(start.originX - dx, start.originY - dy, frameWidth, frameHeight));
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="relative">
      <svg
        viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
        className={`block h-auto w-full touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        role="application"
        aria-label={`Map between Connaught Place and Lodhi Garden. Path ${activeIndex + 1} is selected, ${active.km.toFixed(1)} km. Drag to move the map.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill={LAND} />
        <defs>
          <filter id="subpath-pin-shadow" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.5" floodColor="#1e1b4b" floodOpacity="0.4" />
            <feDropShadow dx="0" dy="0" stdDeviation="2.6" floodColor="#4f46e5" floodOpacity="0.55" />
          </filter>
        </defs>
        <g pointerEvents="none" opacity={0.5}>
          {CLOTH.map((road, index) => (
            <path key={`cloth-${index}`} d={road.d} fill="none" stroke={road.trace ? "#b7c3ce" : "#ffffff"} strokeWidth={road.width} strokeLinecap="round" />
          ))}
        </g>
        {EDGES.filter((edge) => !inFocus(edge)).map((edge) => (
          <path key={`dull-${edge.u}-${edge.v}`} d={pathD(edge.points)} fill="none" stroke="#e4e4e7" strokeWidth={6} strokeLinecap="round" />
        ))}
        {EDGES.filter(inFocus).map((edge) => (
          <path key={`road-${edge.u}-${edge.v}`} d={pathD(edge.points)} fill="none" stroke={ROAD} strokeWidth={8} strokeLinecap="round" />
        ))}
        {EDGES.filter(inFocus).map((edge) => {
          if (!activeEdges.has(edgeKey(edge.u, edge.v))) return null;
          return (
            <path key={`route-${edge.u}-${edge.v}`} d={pathD(edge.points)} fill="none" stroke={ROUTE} strokeWidth={3.2} strokeLinecap="round" />
          );
        })}
        {EDGES.filter(inFocus).map((edge) => {
          const key = edgeKey(edge.u, edge.v);
          const text = kmText(edge.km);
          const width = text.length * 6.4 + 12;
          const spot = pillSpot(edge);
          const onRoute = activeEdges.has(key);
          return (
            <g key={`pill-${edge.u}-${edge.v}`} data-pill={key}>
              <rect x={spot.x - width / 2} y={spot.y - PILL_H / 2} width={width} height={PILL_H} rx={9} fill="#ffffff" stroke={onRoute ? "#c7d2fe" : "#e4e4e7"} />
              <text x={spot.x} y={spot.y + 3.5} textAnchor="middle" fontFamily={FONT} fontSize={11} fontWeight={700} fill={onRoute ? ROUTE_TEXT : "#3f3f46"}>
                {text}
              </text>
            </g>
          );
        })}
        {(Object.keys(POS) as Id[]).filter((id) => !FOCUS.has(id)).map((id) => (
          <g key={id}>
            <circle cx={POS[id].x} cy={POS[id].y} r={4.5} fill={DULL} />
            <circle cx={POS[id].x} cy={POS[id].y} r={1.6} fill="#ffffff" />
          </g>
        ))}
        {(Object.keys(POS) as Id[]).filter((id) => FOCUS.has(id)).map((id) => (
          <g key={id}>
            <circle cx={POS[id].x} cy={POS[id].y} r={6} fill={ROUTE} filter="url(#subpath-pin-shadow)" />
            <circle cx={POS[id].x} cy={POS[id].y} r={2.2} fill="#ffffff" />
          </g>
        ))}
        {DULL_LABELS.filter((label) => !FOCUS.has(label.id)).map((label) => {
          const textAnchor = label.anchor === "left" ? "end" : label.anchor === "right" ? "start" : "middle";
          const lineH = 15;
          const block = label.lines.length * lineH;
          const firstY = label.anchor === "above" ? label.y - block + 12 : label.anchor === "below" ? label.y + 14 : label.y - ((label.lines.length - 1) * lineH) / 2;
          return (
            <text
              key={label.id}
              x={label.x}
              y={firstY}
              textAnchor={textAnchor}
              fontFamily={FONT}
              fontSize={13}
              fontWeight={500}
              fill={DULL_INK}
              stroke={LAND}
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {label.lines.map((line, index) => (
                <tspan key={line} x={label.x} dy={index === 0 ? 0 : lineH}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
        {LABELS.map((label) => {
          const x = POS[label.id].x;
          const y = label.below ? POS[label.id].y + label.lift : POS[label.id].y - label.lift - (label.mark ? 15 : 0);
          return (
            <text
              key={label.id}
              data-label={label.id}
              x={x}
              y={y}
              textAnchor="middle"
              fontFamily={FONT}
              fontSize={15}
              fontWeight={500}
              fill={INK}
              stroke={LAND}
              strokeWidth={5}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {label.name}
              {label.mark ? (
                <tspan x={x} dy={15} fontSize={11} fontWeight={500} fill={ROUTE_TEXT}>
                  {label.mark}
                </tspan>
              ) : null}
            </text>
          );
        })}
      </svg>
      <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => changeZoom(1)}
          className="flex h-7 w-7 items-center justify-center border-b border-neutral-200 text-[16px] leading-none text-neutral-800 disabled:text-neutral-300"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => changeZoom(-1)}
          className="flex h-7 w-7 items-center justify-center text-[16px] leading-none text-neutral-800 disabled:text-neutral-300"
        >
          −
        </button>
      </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-3 py-3">
        {PATHS.map((path, index) => {
          const pressed = path.id === active.id;
          return (
            <button
              key={path.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setSelected(path.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium leading-none ${
                pressed ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              <span>Path {index + 1}</span>
              <span className={pressed ? "text-indigo-700" : "text-neutral-500"}>{path.km.toFixed(1)} km</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
