"use client";

import { useRef, useState, type PointerEvent } from "react";

const VB_W = 1320;
const VB_H = 840;
const VIEW = { x: 0, y: 0, width: VB_W, height: VB_H };
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.25;
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
  "bangla",
  "khan",
  "pm",
  "jm",
  "patel",
  "jhande",
  "talk",
  "rb",
  "ramnagar",
  "udyog",
  "jaipur",
  "sadar",
  "kashmere",
  "lodhi",
  "kamla",
  "nirman",
  "ramlila",
] as const;

type NodeId = (typeof NODE_IDS)[number];
type DestId = "bangla" | "ndls" | "nirman" | "talk" | "rb" | "kamla" | "khan" | "ig" | "jhande" | "lodhi" | "kb" | "sadar" | "pm" | "kashmere" | "dg" | "cc" | "jm" | "patel" | "rf";
type Selection = NodeId | "all";
type Anchor = "above" | "below" | "left" | "right";
type Kind = "source" | "dest" | "mid";

const POS: Record<NodeId, { x: number; y: number }> = {
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
  road("windsor", "udyog", 0.4, "Janpath"),
  road("udyog", "museum", 0.4, "Janpath"),
  road("museum", "jaipur", 0.4, "Kartavya Path"),
  road("jaipur", "ig", 0.5, "Kartavya Path"),
  road("cp", "rajendra", 2.1, "Pusa Road"),
  road("rajendra", "kb", 2.7, "Pusa Road"),
  road("cp", "paharganj", 1.1, "Chelmsford Road"),
  road("paharganj", "ndls", 1.1, "Chelmsford Road"),
  road("ndls", "ramnagar", 0.6, "Qutub Road"),
  road("ramnagar", "ajmeri", 0.6, "Qutub Road"),
  road("ajmeri", "cc", 2.4, "S.P. Mukherjee Marg"),
  road("cc", "rf", 1.3, "Chandni Chowk"),
  road("cp", "barakhamba", 0.8, "Barakhamba Road"),
  road("barakhamba", "mh", 1.0, "Sikandra Road"),
  road("mh", "ito", 2.1, "Bahadur Shah Zafar Marg"),
  road("ito", "dg", 1.5, "Mahatma Gandhi Marg"),
  road("dg", "rf", 1.8, "Mahatma Gandhi Marg"),
  road("paharganj", "rajendra", 2.2, "DB Gupta Road"),
  road("paharganj", "ramlila", 1.4, "Bhavbhuti Marg"),
  road("ramlila", "ajmeri", 1.5, "Bhavbhuti Marg"),
  road("jantar", "barakhamba", 0.9, "Tolstoy Marg"),
  road("windsor", "mh", 1.7, "Copernicus Marg"),
  road("museum", "ito", 2.4, "Tilak Marg"),
  road("dg", "cc", 2.7, "Netaji Subhash Marg"),
  road("ajmeri", "dg", 2.2, "Jawaharlal Nehru Marg"),
  road("cp", "bangla", 1.4, "Baba Kharak Singh Marg", [[300, 440]]),
  road("jantar", "bangla", 1.2, "Ashoka Road"),
  road("museum", "khan", 0.8, "Prithviraj Road"),
  road("ig", "khan", 1.4, "Dr. Zakir Hussain Marg"),
  road("ito", "pm", 1.1, "Bhairon Marg"),
  road("dg", "pm", 1.6, "Ring Road"),
  road("cc", "jm", 0.6, "Urdu Bazaar", [[1140, 138], [1272, 138]]),
  road("rf", "jm", 1.2, "Esplanade Road", [[1272, 260]]),
  road("rajendra", "jhande", 1.3, "Pusa Road"),
  road("kb", "jhande", 1.7, "Faiz Road"),
  road("kb", "patel", 2.2, "Pusa Road"),
  road("bangla", "talk", 1.1, "Talkatora Road"),
  road("jantar", "rb", 2.0, "Rafi Marg"),
  road("bangla", "rb", 1.6, "Mother Teresa Crescent"),
  road("jhande", "sadar", 1.5, "Rani Jhansi Marg"),
  road("ndls", "kamla", 0.5, "Kamla Market Road"),
  road("kamla", "ramnagar", 0.4, "Qutub Road"),
  road("udyog", "nirman", 0.5, "Maulana Azad Road"),
  road("ajmeri", "kashmere", 1.9, "Lothian Road", [[900, 200]]),
  road("khan", "lodhi", 1.2, "Lodhi Road"),
];

const DESTINATIONS: DestId[] = ["bangla", "ndls", "nirman", "talk", "rb", "kamla", "khan", "ig", "jhande", "lodhi", "kb", "sadar", "pm", "kashmere", "dg", "cc", "jm", "patel", "rf"];
const RIVER_ROUTE: NodeId[] = ["cp", "barakhamba", "mh", "ito", "dg", "rf"];

function edgeKey(u: NodeId, v: NodeId) {
  return [u, v].sort().join("|");
}

function pathD(points: Array<[number, number]>) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

function edgeAnchor(points: Array<[number, number]>, fraction: number) {
  let total = 0;
  const lengths: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const len = Math.hypot(points[index + 1][0] - points[index][0], points[index + 1][1] - points[index][1]);
    lengths.push(len);
    total += len;
  }
  let remain = total * fraction;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remain <= lengths[index] || index === lengths.length - 1) {
      const len = lengths[index] || 1;
      const t = lengths[index] === 0 ? 0 : remain / lengths[index];
      const [x0, y0] = points[index];
      const [x1, y1] = points[index + 1];
      return {
        x: x0 + (x1 - x0) * t,
        y: y0 + (y1 - y0) * t,
        nx: -(y1 - y0) / len,
        ny: (x1 - x0) / len,
      };
    }
    remain -= lengths[index];
  }
  return { x: points[0][0], y: points[0][1], nx: 0, ny: -1 };
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
const PATHS = Object.fromEntries(NODE_IDS.map((id) => [id, pathTo(SEARCH.prev, id)])) as Record<NodeId, NodeId[]>;
const PATH_KEYS = Object.fromEntries(
  NODE_IDS.map((id) => [id, PATHS[id].slice(0, -1).map((node, index) => edgeKey(node, PATHS[id][index + 1]))]),
) as Record<NodeId, string[]>;
const TREE_KEYS = new Set(NODE_IDS.filter((id) => id !== "cp").flatMap((id) => PATH_KEYS[id]));
const RIVER_KEYS = new Set(RIVER_ROUTE.slice(0, -1).map((node, index) => edgeKey(node, RIVER_ROUTE[index + 1])));
const RIVER_KM = routeKm(RIVER_ROUTE);

const LABELS: Array<{ id: NodeId; lines: string[]; x: number; y: number; anchor: Anchor; kind: Kind }> = [
  { id: "kb", lines: ["Karol Bagh"], x: 108, y: 250, anchor: "right", kind: "dest" },
  { id: "patel", lines: ["Patel Nagar"], x: 96, y: 162, anchor: "right", kind: "dest" },
  { id: "jhande", lines: ["Jhandewalan"], x: 268, y: 166, anchor: "right", kind: "dest" },
  { id: "sadar", lines: ["Sadar Bazar"], x: 298, y: 42, anchor: "right", kind: "dest" },
  { id: "kashmere", lines: ["Kashmere Gate"], x: 918, y: 46, anchor: "right", kind: "dest" },
  { id: "kamla", lines: ["Kamla Market"], x: 700, y: 100, anchor: "above", kind: "dest" },
  { id: "talk", lines: ["Talkatora"], x: 82, y: 638, anchor: "right", kind: "dest" },
  { id: "rb", lines: ["Rashtrapati", "Bhavan"], x: 300, y: 622, anchor: "above", kind: "dest" },
  { id: "rajendra", lines: ["Rajendra Place"], x: 250, y: 308, anchor: "above", kind: "mid" },
  { id: "paharganj", lines: ["Paharganj"], x: 420, y: 218, anchor: "above", kind: "mid" },
  { id: "ramnagar", lines: ["Ram Nagar"], x: 730, y: 188, anchor: "above", kind: "mid" },
  { id: "ndls", lines: ["New Delhi", "Railway Station"], x: 620, y: 218, anchor: "above", kind: "dest" },
  { id: "ajmeri", lines: ["Ajmeri Gate"], x: 820, y: 198, anchor: "above", kind: "mid" },
  { id: "cc", lines: ["Chandni Chowk"], x: 1000, y: 200, anchor: "above", kind: "dest" },
  { id: "rf", lines: ["Red Fort"], x: 1160, y: 238, anchor: "above", kind: "dest" },
  { id: "cp", lines: ["Connaught Place"], x: 442, y: 418, anchor: "right", kind: "source" },
  { id: "barakhamba", lines: ["Barakhamba"], x: 620, y: 358, anchor: "above", kind: "mid" },
  { id: "mh", lines: ["Mandi House"], x: 820, y: 378, anchor: "above", kind: "mid" },
  { id: "ito", lines: ["ITO"], x: 1000, y: 358, anchor: "above", kind: "mid" },
  { id: "dg", lines: ["Delhi Gate"], x: 1102, y: 310, anchor: "left", kind: "dest" },
  { id: "jantar", lines: ["Jantar Mantar"], x: 360, y: 468, anchor: "above", kind: "mid" },
  { id: "windsor", lines: ["Windsor Place"], x: 575, y: 498, anchor: "above", kind: "mid" },
  { id: "udyog", lines: ["Udyog Bhawan"], x: 700, y: 508, anchor: "above", kind: "mid" },
  { id: "museum", lines: ["National Museum"], x: 840, y: 518, anchor: "above", kind: "mid" },
  { id: "jaipur", lines: ["Jaipur House"], x: 980, y: 523, anchor: "above", kind: "mid" },
  { id: "ig", lines: ["India Gate"], x: 1058, y: 550, anchor: "right", kind: "dest" },
  { id: "bangla", lines: ["Bangla Sahib"], x: 150, y: 542, anchor: "above", kind: "dest" },
  { id: "khan", lines: ["Khan Market"], x: 1140, y: 640, anchor: "right", kind: "dest" },
  { id: "pm", lines: ["Pragati", "Maidan"], x: 1248, y: 464, anchor: "below", kind: "dest" },
  { id: "jm", lines: ["Jama Masjid"], x: 1254, y: 318, anchor: "left", kind: "dest" },
  { id: "lodhi", lines: ["Lodhi Garden"], x: 1138, y: 770, anchor: "right", kind: "dest" },
  { id: "nirman", lines: ["Nirman Bhawan"], x: 788, y: 670, anchor: "right", kind: "dest" },
  { id: "ramlila", lines: ["Ramlila Maidan"], x: 602, y: 300, anchor: "left", kind: "mid" },
];

const PLACE_NAME = Object.fromEntries(LABELS.map((label) => [label.id, label.lines.join(" ")])) as Record<NodeId, string>;

function kmLabel(km: number) {
  return `${km.toFixed(1)} km`;
}

const EDGE_LABEL_AT: Record<string, { x: number; y: number }> = (() => {
  const nameBoxes = LABELS.map((label) => {
    const fontSize = 15;
    const lineH = 16;
    const block = label.lines.length * lineH + (label.kind === "source" ? lineH : 0);
    const firstY =
      label.anchor === "above"
        ? label.y - block + 12
        : label.anchor === "below"
          ? label.y + 14
          : label.y - ((label.lines.length - 1) * lineH) / 2;
    const width = Math.max(...label.lines.map((line) => line.length)) * fontSize * 0.58;
    const x = label.anchor === "left" ? label.x - width : label.anchor === "right" ? label.x : label.x - width / 2;
    const y = firstY - fontSize * 0.85;
    return { x: x - 4, y: y - 2, x2: x + width + 4, y2: y + block + 2 };
  });
  const pins = NODE_IDS.map((id) => POS[id]);
  const pillHits = (x: number, y: number, box: { x: number; y: number; x2: number; y2: number }) =>
    x - 24 < box.x2 && x + 24 > box.x && y - 9 < box.y2 && y + 9 > box.y;

  const placed: Array<[number, number]> = [];
  const spots: Record<string, { x: number; y: number }> = {};
  const lengthOf = (points: Array<[number, number]>) =>
    points.slice(0, -1).reduce((sum, point, index) => sum + Math.hypot(points[index + 1][0] - point[0], points[index + 1][1] - point[1]), 0);
  const ordered = [...EDGES].sort((a, b) => lengthOf(a.points) - lengthOf(b.points));
  for (const edge of ordered) {
    let best = { x: 0, y: 0 };
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const fraction of [0.5, 0.34, 0.66, 0.24, 0.76]) {
      const anchor = edgeAnchor(edge.points, fraction);
      for (const sign of [1, -1]) {
        const x = anchor.x + anchor.nx * 16 * sign;
        const y = anchor.y + anchor.ny * 16 * sign;
        let score = 14 - Math.abs(fraction - 0.5) * 18;
        if (x < 28 || y < 16 || x > VB_W - 28 || y > VB_H - 16) score -= 800;
        if (nameBoxes.some((box) => pillHits(x, y, box))) score -= 600;
        let nearestPin = Number.POSITIVE_INFINITY;
        for (const pin of pins) nearestPin = Math.min(nearestPin, Math.hypot(pin.x - x, pin.y - y));
        if (nearestPin < 22) score -= (22 - nearestPin) * 20;
        let nearestLabel = Number.POSITIVE_INFINITY;
        for (const [bx, by] of placed) nearestLabel = Math.min(nearestLabel, Math.hypot(bx - x, by - y));
        if (nearestLabel < 50) score -= (50 - nearestLabel) * 14;
        score += Math.min(nearestPin, 60);
        score += Math.min(nearestLabel, 80);
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
    }
    spots[edgeKey(edge.u, edge.v)] = best;
    placed.push([best.x, best.y]);
  }
  return spots;
})();

function MapLabel({
  lines,
  x,
  y,
  anchor,
  kind,
  active,
  dim,
  onClick,
}: {
  lines: string[];
  x: number;
  y: number;
  anchor: Anchor;
  kind: Kind;
  active: boolean;
  dim: boolean;
  onClick?: (event: { stopPropagation: () => void }) => void;
}) {
  const textAnchor = anchor === "left" ? "end" : anchor === "right" ? "start" : "middle";
  const lineH = 16;
  const extra = kind === "source" ? lineH : 0;
  const block = lines.length * lineH + extra;
  const firstY = anchor === "above" ? y - block + 12 : anchor === "below" ? y + 14 : y - ((lines.length - 1) * lineH) / 2;
  const nameFill = dim ? "#d4d4d8" : active ? ROUTE_ACTIVE : "#171717";
  const kmFill = dim ? "#e4e4e7" : active ? ROUTE_ACTIVE : ROUTE_TEXT;
  const fontSize = 15;
  const longest = Math.max(...lines.map((line) => line.length), kind === "source" ? 5 : 0);
  const textWidth = longest * fontSize * 0.62;
  const hitX = anchor === "left" ? x - textWidth - 8 : anchor === "right" ? x - 8 : x - textWidth / 2 - 8;
  const hitY = firstY - fontSize;
  const hitW = textWidth + 16;
  const hitH = block + 8;

  return (
    <g
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
      pointerEvents={onClick ? "auto" : "none"}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onClick(event);
              }
            }
          : undefined
      }
    >
      {onClick ? <rect x={hitX} y={hitY} width={hitW} height={hitH} fill="transparent" /> : null}
      <text x={x} y={firstY} textAnchor={textAnchor} fontFamily={FONT} fontSize={fontSize} fontWeight={600} fill={nameFill}>
        {lines.map((line, index) => (
          <tspan key={line} x={x} dy={index === 0 ? 0 : lineH}>
            {line}
          </tspan>
        ))}
        {kind === "source" ? (
          <tspan x={x} dy={15} fontSize={11} fontWeight={600} fill={kmFill}>
            START
          </tspan>
        ) : null}
      </text>
    </g>
  );
}

export default function DelhiShortestPathVisualizer() {
  const [selected, setSelected] = useState<Selection>("all");
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: VIEW.x, y: VIEW.y });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const moved = useRef(false);
  const suppressClick = useRef(false);
  const activeKeys = selected === "all" ? TREE_KEYS : new Set(PATH_KEYS[selected]);
  const frameWidth = VIEW.width / zoom;
  const frameHeight = VIEW.height / zoom;
  const frame = { x: origin.x, y: origin.y, width: frameWidth, height: frameHeight };

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
    moved.current = false;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: origin.x, originY: origin.y };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!moved.current) {
      if (Math.hypot(dx, dy) < 5) return;
      moved.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is only available for an active pointer.
      }
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin(clampOrigin(start.originX - (dx / rect.width) * frameWidth, start.originY - (dy / rect.height) * frameHeight, frameWidth, frameHeight));
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    if (moved.current) suppressClick.current = true;
    drag.current = null;
    moved.current = false;
    setDragging(false);
  }

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
    setSelected(id === "cp" || selected === id ? "all" : id);
  }

  return (
    <div
      className="not-prose my-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        setSelected("all");
      }}
    >
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
            viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
            className={`block h-auto w-full touch-none select-none ${dragging ? "cursor-grabbing [&_*]:cursor-grabbing" : "cursor-grab"}`}
            role="group"
            aria-label="Schematic map of roads and places in central Delhi, with shortest routes from Connaught Place. Drag to move the map."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
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

            {EDGES.map((edge) => {
              const role = roleOf(edge);
              const quiet = role === "other" && selected !== "all";
              const spot = EDGE_LABEL_AT[edgeKey(edge.u, edge.v)];
              const text = kmLabel(edge.km);
              const width = 46;
              const height = 16;
              return (
                <g key={`km-${edge.u}-${edge.v}`} pointerEvents="none">
                  <rect
                    x={spot.x - width / 2}
                    y={spot.y - height / 2}
                    width={width}
                    height={height}
                    rx={8}
                    fill={quiet ? "#f8f8f9" : "#ffffff"}
                    stroke={quiet ? "#ececee" : role === "other" ? "#e4e4e7" : "#c7d2fe"}
                    strokeWidth={1}
                  />
                  <text
                    x={spot.x}
                    y={spot.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily={FONT}
                    fontSize={11}
                    fontWeight={700}
                    fill={quiet ? "#d4d4d8" : role === "other" ? "#3f3f46" : ROUTE_TEXT}
                  >
                    {text}
                  </text>
                </g>
              );
            })}

            {NODE_IDS.map((id) => {
              const on = shown(id);
              return (
                <g key={id} opacity={on ? 1 : 0.35} pointerEvents="none">
                  <circle
                    cx={POS[id].x}
                    cy={POS[id].y}
                    r={6}
                    fill={on ? ROUTE : "#d4d4d8"}
                    filter="url(#delhi-pin-shadow)"
                  />
                  <circle cx={POS[id].x} cy={POS[id].y} r={2.2} fill="#ffffff" />
                </g>
              );
            })}

            {selected === "rf" && (
              <g>
                <rect x={888} y={338} width={54} height={16} rx={8} fill={ROUTE} />
                <text x={915} y={349} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff" fontFamily={FONT}>
                  {kmLabel(RIVER_KM)}
                </text>
              </g>
            )}

            {LABELS.map((label) => {
              return (
                <MapLabel
                  key={label.id}
                  lines={label.lines}
                  x={label.x}
                  y={label.y}
                  anchor={label.anchor}
                  kind={label.kind}
                  active={selected === label.id}
                  dim={!shown(label.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    choose(label.id);
                  }}
                />
              );
            })}
            {NODE_IDS.map((id) => {
              return (
                <circle
                  key={`hit-${id}`}
                  cx={POS[id].x}
                  cy={POS[id].y}
                  r={22}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    choose(id);
                  }}
                />
              );
            })}
          </svg>
          <div
            className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white"
            onClick={(event) => event.stopPropagation()}
          >
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
          {selected !== "all" && (
            <div
              className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-indigo-200 bg-white/95 px-3 py-1.5 text-center text-[12px] font-medium text-neutral-800"
              onClick={(event) => event.stopPropagation()}
            >
              Shortest distance between {PLACE_NAME.cp} and {PLACE_NAME[selected]} ={" "}
              <span className="font-semibold text-indigo-700">{kmLabel(SEARCH.dist[selected])}</span>
            </div>
          )}
          <div
            className="group absolute bottom-3 left-3 z-10"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-describedby="delhi-path-hint"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white/55 text-[13px] font-semibold leading-none text-indigo-700 shadow-sm backdrop-blur-[1px]"
            >
              !
            </button>
            <p
              id="delhi-path-hint"
              role="tooltip"
              className="pointer-events-none absolute bottom-0 left-full ml-2 hidden w-56 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-neutral-800 shadow-sm group-hover:block group-focus-within:block"
            >
              Click on the node to see its shortest path highlighted
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
