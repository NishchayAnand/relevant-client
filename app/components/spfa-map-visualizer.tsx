"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from "lucide-react";
import { LanguageMenu, type Language } from "./dijkstra-code-visualizer";
import {
  CLOTH,
  EDGE_LABEL_AT,
  EDGES,
  FONT,
  LABELS,
  MAX_ZOOM,
  MIN_ZOOM,
  MapLabel,
  NODE_IDS,
  PLACE_NAME,
  POS,
  ROAD,
  ROUTE,
  ROUTE_ACTIVE,
  ROUTE_TEXT,
  SEARCH,
  VB_H,
  VB_W,
  VIEW,
  ZOOM_STEP,
  clampOrigin,
  clampZoom,
  edgeKey,
  findEdge,
  kmLabel,
  pathD,
} from "./delhi-shortest-path-visualizer";

type NodeId = (typeof NODE_IDS)[number];

type SpfaKind = "fill" | "setup" | "source" | "poll" | "edge" | "done";

type SpfaStep = {
  dist: Record<NodeId, number>;
  parent: Record<NodeId, NodeId | null>;
  queue: NodeId[];
  current: NodeId | null;
  edge: [NodeId, NodeId] | null;
  edgeIndex: number | null;
  edgeCount: number;
  updated: NodeId[];
  relaxed: boolean;
  enqueued: boolean;
  kind: SpfaKind;
  caption: string;
  progress: string;
};

const SPFA_ADJ = Object.fromEntries(NODE_IDS.map((id) => [id, [] as Array<{ v: NodeId; km: number }>])) as Record<
  NodeId,
  Array<{ v: NodeId; km: number }>
>;
for (const edge of EDGES) {
  SPFA_ADJ[edge.u].push({ v: edge.v, km: edge.km });
  SPFA_ADJ[edge.v].push({ v: edge.u, km: edge.km });
}

function distLabel(km: number) {
  return Number.isFinite(km) ? kmLabel(km) : "not reached";
}

const SPFA_STEPS: SpfaStep[] = (() => {
  const blankDist = () => Object.fromEntries(NODE_IDS.map((id) => [id, Number.POSITIVE_INFINITY])) as Record<NodeId, number>;
  const blankParent = () => Object.fromEntries(NODE_IDS.map((id) => [id, null])) as Record<NodeId, NodeId | null>;
  const dist = blankDist();
  const parent = blankParent();
  const hops = Object.fromEntries(NODE_IDS.map((id) => [id, 0])) as Record<NodeId, number>;
  const queue: NodeId[] = [];
  const inQueue = new Set<NodeId>();
  const steps: SpfaStep[] = [];

  function push(partial: Omit<SpfaStep, "dist" | "parent" | "queue">) {
    steps.push({ ...partial, dist: { ...dist }, parent: { ...parent }, queue: [...queue] });
  }

  push({
    current: null,
    edge: null,
    edgeIndex: null,
    edgeCount: 0,
    updated: [],
    relaxed: false,
    enqueued: false,
    kind: "fill",
    caption: "Every place starts unreached, with no known distance.",
    progress: "Prepare the distances",
  });
  push({
    current: null,
    edge: null,
    edgeIndex: null,
    edgeCount: 0,
    updated: [],
    relaxed: false,
    enqueued: false,
    kind: "setup",
    caption: "A queue will hold the places whose roads still need to be explored.",
    progress: "Prepare the queue",
  });

  dist.cp = 0;
  queue.push("cp");
  inQueue.add("cp");
  push({
    current: "cp",
    edge: null,
    edgeIndex: null,
    edgeCount: SPFA_ADJ.cp.length,
    updated: ["cp"],
    relaxed: false,
    enqueued: true,
    kind: "source",
    caption: "Connaught Place is the starting point, so its distance is 0 km, and it is the only place waiting.",
    progress: "Start from Connaught Place",
  });

  while (queue.length > 0) {
    const u = queue.shift() as NodeId;
    inQueue.delete(u);
    const roads = SPFA_ADJ[u];
    push({
      current: u,
      edge: null,
      edgeIndex: null,
      edgeCount: roads.length,
      updated: [],
      relaxed: false,
      enqueued: false,
      kind: "poll",
      caption: `Take ${PLACE_NAME[u]} off the queue and explore the ${roads.length} roads that leave it. ${queue.length === 0 ? "Nothing else is waiting." : `${queue.length} ${queue.length === 1 ? "place is" : "places are"} still waiting.`}`,
      progress: `Exploring ${PLACE_NAME[u]}`,
    });

    roads.forEach((road, edgeIndex) => {
      const candidate = Math.round((dist[u] + road.km) * 10) / 10;
      const before = dist[road.v];
      const base = {
        current: u,
        edge: [u, road.v] as [NodeId, NodeId],
        edgeIndex,
        edgeCount: roads.length,
        kind: "edge" as const,
        progress: `${PLACE_NAME[u]} · road ${edgeIndex + 1} of ${roads.length}`,
      };
      if (!(candidate + 1e-9 < before)) {
        push({
          ...base,
          updated: [],
          relaxed: false,
          enqueued: false,
          caption: `${PLACE_NAME[u]} to ${PLACE_NAME[road.v]}: ${kmLabel(candidate)} is not shorter than ${distLabel(before)}, so nothing changes.`,
        });
        return;
      }
      const already = inQueue.has(road.v);
      dist[road.v] = candidate;
      parent[road.v] = u;
      hops[road.v] = hops[u] + 1;
      if (hops[road.v] >= NODE_IDS.length) {
        throw new Error("Unexpected negative cycle in the Delhi map");
      }
      if (!already) {
        queue.push(road.v);
        inQueue.add(road.v);
      }
      const first = !Number.isFinite(before);
      push({
        ...base,
        updated: [road.v],
        relaxed: true,
        enqueued: !already,
        caption: first
          ? `${PLACE_NAME[road.v]} is reached for the first time, ${kmLabel(candidate)} via ${PLACE_NAME[u]}, and joins the queue.`
          : already
            ? `${PLACE_NAME[u]} to ${PLACE_NAME[road.v]}: ${kmLabel(candidate)} is shorter than ${kmLabel(before)}. ${PLACE_NAME[road.v]} is already waiting, so it stays in the queue.`
            : `${PLACE_NAME[u]} to ${PLACE_NAME[road.v]}: ${kmLabel(candidate)} is shorter than ${kmLabel(before)}, so ${PLACE_NAME[road.v]} joins the queue again.`,
      });
    });
  }

  push({
    current: null,
    edge: null,
    edgeIndex: null,
    edgeCount: 0,
    updated: [],
    relaxed: false,
    enqueued: false,
    kind: "done",
    caption: "The queue is empty. These are the shortest distances from Connaught Place.",
    progress: "Every reached place has been explored",
  });

  const finalDist = steps[steps.length - 1].dist;
  for (const id of NODE_IDS) {
    const want = Math.round(SEARCH.dist[id] * 10) / 10;
    if (Math.abs(finalDist[id] - want) > 0.05) {
      throw new Error(`SPFA distance for ${id} is ${finalDist[id]}, expected ${want}`);
    }
  }
  return steps;
})();

const SPFA_CODE: Record<Language, string[]> = {
  java: [
    "public int[] shortestPath(int V, List<List<int[]>> adj, int source) {",
    "",
    "    int[] dist = new int[V];",
    "    Arrays.fill(dist, Integer.MAX_VALUE);",
    "",
    "    // Tracks whether a vertex is already present in the queue",
    "    boolean[] inQueue = new boolean[V];",
    "",
    "    // Tracks the number of edges in the predecessor path",
    "    int[] pathEdges = new int[V];",
    "",
    "    Queue<Integer> queue = new LinkedList<>();",
    "",
    "    // Initialize source",
    "    dist[source] = 0;",
    "    queue.offer(source);",
    "    inQueue[source] = true;",
    "",
    "    while (!queue.isEmpty()) {",
    "",
    "        int u = queue.poll();",
    "        inQueue[u] = false;",
    "",
    "        // Explore outgoing edges of u",
    "        for (int[] edge : adj.get(u)) {",
    "",
    "            int v = edge[0];",
    "            int weight = edge[1];",
    "",
    "            // Relaxation",
    "            if (dist[u] != Integer.MAX_VALUE &&",
    "                dist[u] + weight < dist[v]) {",
    "",
    "                dist[v] = dist[u] + weight;",
    "",
    "                pathEdges[v] = pathEdges[u] + 1;",
    "",
    "                // Detect reachable negative-weight cycle",
    "                if (pathEdges[v] >= V) {",
    "                    throw new IllegalStateException(",
    "                        \"Negative-weight cycle detected\"",
    "                    );",
    "                }",
    "",
    "                // Add v only if it is not already in the queue",
    "                if (!inQueue[v]) {",
    "                    queue.offer(v);",
    "                    inQueue[v] = true;",
    "                }",
    "            }",
    "        }",
    "    }",
    "",
    "    return dist;",
    "}",
  ],
  python: [
    "def shortest_path(V, adj, source):",
    "",
    "    dist = [math.inf] * V",
    "",
    "    # Tracks whether a vertex is already present in the queue",
    "    in_queue = [False] * V",
    "",
    "    # Tracks the number of edges in the predecessor path",
    "    path_edges = [0] * V",
    "",
    "    queue = deque()",
    "",
    "    # Initialize source",
    "    dist[source] = 0",
    "    queue.append(source)",
    "    in_queue[source] = True",
    "",
    "    while queue:",
    "",
    "        u = queue.popleft()",
    "        in_queue[u] = False",
    "",
    "        # Explore outgoing edges of u",
    "        for edge in adj[u]:",
    "",
    "            v = edge[0]",
    "            weight = edge[1]",
    "",
    "            # Relaxation",
    "            if (dist[u] != math.inf and",
    "                    dist[u] + weight < dist[v]):",
    "",
    "                dist[v] = dist[u] + weight",
    "",
    "                path_edges[v] = path_edges[u] + 1",
    "",
    "                # Detect reachable negative-weight cycle",
    "                if path_edges[v] >= V:",
    "                    raise ValueError(\"Negative-weight cycle detected\")",
    "",
    "                # Add v only if it is not already in the queue",
    "                if not in_queue[v]:",
    "                    queue.append(v)",
    "                    in_queue[v] = True",
    "",
    "    return dist",
  ],
};

type SpfaMark =
  | "fill"
  | "setup"
  | "source"
  | "loop"
  | "poll"
  | "scan"
  | "v"
  | "weight"
  | "guard"
  | "compare"
  | "assign"
  | "hops"
  | "cycle"
  | "wait"
  | "offer"
  | "ret";

const SPFA_SNIPPETS: Record<Language, Record<SpfaMark, string[]>> = {
  java: {
    fill: ["int[] dist = new int[V]", "Arrays.fill"],
    setup: ["boolean[] inQueue", "int[] pathEdges", "Queue<Integer> queue"],
    source: ["dist[source] = 0", "queue.offer(source)", "inQueue[source] = true"],
    loop: ["while (!queue.isEmpty())"],
    poll: ["int u = queue.poll()", "inQueue[u] = false"],
    scan: ["for (int[] edge : adj.get(u))"],
    v: ["int v = edge[0]"],
    weight: ["int weight = edge[1]"],
    guard: ["if (dist[u] != Integer.MAX_VALUE &&"],
    compare: ["dist[u] + weight < dist[v]"],
    assign: ["dist[v] = dist[u] + weight"],
    hops: ["pathEdges[v] = pathEdges[u] + 1"],
    cycle: ["if (pathEdges[v] >= V)"],
    wait: ["if (!inQueue[v])"],
    offer: ["queue.offer(v)", "inQueue[v] = true"],
    ret: ["return dist;"],
  },
  python: {
    fill: ["dist = [math.inf] * V"],
    setup: ["in_queue = [False] * V", "path_edges = [0] * V", "queue = deque()"],
    source: ["dist[source] = 0", "queue.append(source)", "in_queue[source] = True"],
    loop: ["while queue:"],
    poll: ["u = queue.popleft()", "in_queue[u] = False"],
    scan: ["for edge in adj[u]:"],
    v: ["v = edge[0]"],
    weight: ["weight = edge[1]"],
    guard: ["if (dist[u] != math.inf and"],
    compare: ["dist[u] + weight < dist[v]"],
    assign: ["dist[v] = dist[u] + weight"],
    hops: ["path_edges[v] = path_edges[u] + 1"],
    cycle: ["if path_edges[v] >= V:"],
    wait: ["if not in_queue[v]:"],
    offer: ["queue.append(v)", "in_queue[v] = True"],
    ret: ["return dist"],
  },
};

const SPFA_LINES = Object.fromEntries(
  (Object.keys(SPFA_CODE) as Language[]).map((language) => [
    language,
    Object.fromEntries(
      (Object.keys(SPFA_SNIPPETS[language]) as SpfaMark[]).map((mark) => [
        mark,
        SPFA_SNIPPETS[language][mark].map((snippet) => {
          const index = SPFA_CODE[language].findIndex((line) => line.includes(snippet));
          if (index === -1) throw new Error(`Missing ${language} code line: ${snippet}`);
          return index;
        }),
      ]),
    ),
  ]),
) as Record<Language, Record<SpfaMark, number[]>>;

function spfaMarks(item: SpfaStep): SpfaMark[] {
  if (item.kind === "fill") return ["fill"];
  if (item.kind === "setup") return ["setup"];
  if (item.kind === "source") return ["source"];
  if (item.kind === "done") return ["ret"];
  if (item.kind === "poll") return ["loop", "poll"];
  const marks: SpfaMark[] = ["scan", "v", "weight", "guard", "compare"];
  if (item.relaxed) {
    marks.push("assign", "hops", "cycle", "wait");
    if (item.enqueued) marks.push("offer");
  }
  return marks;
}

function colorizeCode(text: string, language: Language): ReactNode {
  const commentAt = text.indexOf(language === "python" ? "#" : "//");
  const code = commentAt >= 0 ? text.slice(0, commentAt) : text;
  const comment = commentAt >= 0 ? text.slice(commentAt) : "";
  const keywords =
    language === "python" ? /\b(def|while|for|in|if|and|not|raise|return)\b/g : /\b(public|int|boolean|while|for|if|new|throw|return)\b/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = keywords.exec(code)) !== null) {
    if (match.index > last) parts.push(code.slice(last, match.index));
    parts.push(
      <span key={`${match.index}-${match[0]}`} style={{ color: ROUTE }}>
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < code.length) parts.push(code.slice(last));
  if (comment) {
    parts.push(
      <span key="comment" style={{ color: "#737373", fontStyle: "italic" }}>
        {comment}
      </span>,
    );
  }
  return parts;
}

const SPFA_ZOOM = 1.75;
const SPFA_SPLIT_MIN = 30;
const SPFA_SPLIT_MAX = 65;

function focusOf(item: SpfaStep) {
  if (item.edge) {
    const [u, v] = item.edge;
    return { x: (POS[u].x + POS[v].x) / 2, y: (POS[u].y + POS[v].y) / 2 };
  }
  if (item.current) return POS[item.current];
  return POS.cp;
}

function originFor(center: { x: number; y: number }, zoom: number) {
  const width = VIEW.width / zoom;
  const height = VIEW.height / zoom;
  return clampOrigin(center.x - width / 2, center.y - height / 2, width, height);
}

export function SpfaMapVisualizer() {
  const [step, setStep] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [language, setLanguage] = useState<Language>("java");
  const [zoom, setZoom] = useState(SPFA_ZOOM);
  const [origin, setOrigin] = useState(() => originFor(POS.cp, SPFA_ZOOM));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const [resizing, setResizing] = useState(false);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const snap = SPFA_STEPS[step];
  const done = step === SPFA_STEPS.length - 1;
  const activeLines = spfaMarks(snap).flatMap((mark) => SPFA_LINES[language][mark]);
  const before = step > 0 ? SPFA_STEPS[step - 1].dist : snap.dist;

  useEffect(() => {
    if (!playing || done) return;
    const timer = setTimeout(() => setStep((value) => Math.min(SPFA_STEPS.length - 1, value + 1)), 350);
    return () => clearTimeout(timer);
  }, [playing, done, step]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  useEffect(() => {
    if (snap.current) setOrigin(originFor(focusOf(snap), zoom));
  }, [snap, zoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const line = lineRefs.current[Math.min(...activeLines)];
    if (!scroller || !line) return;
    const lineTop = line.offsetTop;
    const lineBottom = lineTop + line.offsetHeight * activeLines.length;
    if (lineTop < scroller.scrollTop || lineBottom > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTo({ top: Math.max(0, lineTop - 24) });
    }
  }, [step, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onChange() {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const current = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setFullscreen(current === rootRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  function toggleFullscreen() {
    const root = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!root) return;
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
    const current = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (current) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else doc.webkitExitFullscreen?.();
      return;
    }
    if (root.requestFullscreen) void root.requestFullscreen();
    else root.webkitRequestFullscreen?.();
  }

  function goTo(next: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(SPFA_STEPS.length - 1, next)));
  }

  function clampSplit(value: number) {
    return Math.min(SPFA_SPLIT_MAX, Math.max(SPFA_SPLIT_MIN, value));
  }

  function onSplitDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only available for an active pointer.
    }
    setResizing(true);
  }

  function onSplitMove(event: PointerEvent<HTMLDivElement>) {
    if (!resizing) return;
    const rect = splitRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(clampSplit(((event.clientX - rect.left) / rect.width) * 100));
  }

  function onSplitUp() {
    setResizing(false);
  }

  function onSplitKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setSplit((value) => clampSplit(value + (event.key === "ArrowLeft" ? -5 : 5)));
  }

  const reachedCount = NODE_IDS.filter((id) => Number.isFinite(snap.dist[id])).length;
  const status =
    snap.kind === "done"
      ? "done"
      : snap.kind === "poll"
        ? "explore"
        : snap.relaxed
          ? snap.enqueued
            ? "queued"
            : "shorter"
          : snap.kind === "edge"
            ? "no change"
            : "start";
  const fromId = snap.edge?.[0] ?? (snap.kind === "poll" ? snap.current : null);
  const toId = snap.edge?.[1];
  const details: [string, string][] = [
    ["From", fromId ? `${PLACE_NAME[fromId]} · ${Number.isFinite(before[fromId]) ? kmLabel(before[fromId]) : "not reached"}` : "–"],
    [
      "To",
      toId
        ? `${PLACE_NAME[toId]} · ${
            snap.relaxed
              ? Number.isFinite(before[toId])
                ? `${kmLabel(before[toId])} → ${kmLabel(snap.dist[toId])}`
                : `now ${kmLabel(snap.dist[toId])}`
              : Number.isFinite(before[toId])
                ? kmLabel(before[toId])
                : "not reached"
          }`
        : "–",
    ],
    ["Road length", snap.edge ? kmLabel(findEdge(snap.edge[0], snap.edge[1]).km) : "–"],
    [
      "Distance via this road",
      snap.edge && Number.isFinite(before[snap.edge[0]])
        ? kmLabel(Math.round((before[snap.edge[0]] + findEdge(snap.edge[0], snap.edge[1]).km) * 10) / 10)
        : "–",
    ],
  ];
  const treeKeys = new Set(NODE_IDS.filter((id) => snap.parent[id]).map((id) => edgeKey(snap.parent[id] as NodeId, id)));
  const freshKeys = new Set(snap.edge && snap.relaxed ? [edgeKey(snap.edge[0], snap.edge[1])] : []);
  const checking = snap.edge ? findEdge(snap.edge[0], snap.edge[1]) : null;
  const frameWidth = VIEW.width / zoom;
  const frameHeight = VIEW.height / zoom;

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
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: origin.x, originY: origin.y };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only available for an active pointer.
    }
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const rect = event.currentTarget.getBoundingClientRect();
    const fit = zoom <= MIN_ZOOM ? Math.min : Math.max;
    const scale = fit(rect.width / frameWidth, rect.height / frameHeight);
    setOrigin(clampOrigin(start.originX - dx / scale, start.originY - dy / scale, frameWidth, frameHeight));
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }

  const hot = status === "queued" || status === "shorter";

  return (
    <div
      ref={rootRef}
      className={`not-prose overflow-hidden bg-white ${
        fullscreen ? "flex h-full w-full flex-col" : "my-6 rounded-2xl border border-neutral-200"
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Language</span>
        <LanguageMenu language={language} onChange={setLanguage} portalRoot={fullscreen ? rootRef.current : null} />
        <button
          type="button"
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          aria-pressed={fullscreen}
          onClick={toggleFullscreen}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <div
        ref={splitRef}
        style={{ "--spfa-split": `${split}%` } as CSSProperties}
        className={`flex flex-col md:flex-row ${fullscreen ? "min-h-0 flex-1" : "md:h-[620px]"}`}
      >
        <div className="flex min-h-0 min-w-0 flex-col md:w-[var(--spfa-split)] md:shrink-0">
          <div ref={scrollerRef} className="relative max-h-[360px] min-h-0 flex-1 overflow-auto bg-neutral-50 md:max-h-none">
            <div className="w-max min-w-full py-2">
              {SPFA_CODE[language].map((text, lineIndex) => {
                const active = activeLines.includes(lineIndex);
                return (
                  <div
                    key={lineIndex}
                    ref={(element) => {
                      lineRefs.current[lineIndex] = element;
                    }}
                    className="flex w-max min-w-full items-start pr-3 text-[11.5px] leading-[18px]"
                    style={{ background: active ? "#eef2ff" : "#fafafa" }}
                  >
                    <span
                      className="sticky left-0 w-8 shrink-0 select-none pr-2 text-right font-mono tabular-nums"
                      style={{
                        color: active ? ROUTE_TEXT : "#a3a3a3",
                        background: active ? "#eef2ff" : "#fafafa",
                        boxShadow: active ? `inset 2px 0 0 ${ROUTE}` : "none",
                      }}
                    >
                      {lineIndex + 1}
                    </span>
                    <span className="whitespace-pre font-mono text-neutral-800">{text.length > 0 ? colorizeCode(text, language) : " "}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          aria-valuemin={SPFA_SPLIT_MIN}
          aria-valuemax={SPFA_SPLIT_MAX}
          aria-valuenow={Math.round(split)}
          tabIndex={0}
          onPointerDown={onSplitDown}
          onPointerMove={onSplitMove}
          onPointerUp={onSplitUp}
          onPointerCancel={onSplitUp}
          onKeyDown={onSplitKey}
          className="group relative hidden w-px shrink-0 cursor-col-resize touch-none bg-neutral-200 outline-none md:block"
        >
          <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
          <span
            className={`absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
              resizing ? "bg-indigo-500" : "bg-neutral-300 group-hover:bg-neutral-400 group-focus-visible:bg-indigo-500"
            }`}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-neutral-200 md:border-t-0">
          <div className="relative md:min-h-0 md:flex-1">
            <svg
              viewBox={`${origin.x} ${origin.y} ${frameWidth} ${frameHeight}`}
              preserveAspectRatio={zoom <= MIN_ZOOM ? "xMidYMid meet" : "xMidYMid slice"}
              style={{ background: "#eef1f4" }}
              className={`block h-auto w-full touch-none select-none md:h-full ${dragging ? "cursor-grabbing [&_*]:cursor-grabbing" : "cursor-grab"}`}
              role="img"
              aria-label={`${snap.progress}. ${snap.caption}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <defs>
                <filter id="spfa-pin-shadow" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
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
              {EDGES.map((edge) => (
                <path
                  key={`street-${edge.u}-${edge.v}`}
                  d={pathD(edge.points)}
                  fill="none"
                  stroke={ROAD}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {EDGES.map((edge) => {
                const key = edgeKey(edge.u, edge.v);
                if (!treeKeys.has(key)) return null;
                return (
                  <path
                    key={`tree-${edge.u}-${edge.v}`}
                    d={pathD(edge.points)}
                    fill="none"
                    stroke={ROUTE}
                    strokeWidth={freshKeys.has(key) ? 4.4 : 3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
              {checking ? (
                <path
                  d={pathD(checking.points)}
                  fill="none"
                  stroke={ROUTE_ACTIVE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="6 6"
                  pointerEvents="none"
                />
              ) : null}
              {EDGES.map((edge) => {
                const key = edgeKey(edge.u, edge.v);
                const onTree = treeKeys.has(key);
                const spot = EDGE_LABEL_AT[key];
                return (
                  <g key={`km-${edge.u}-${edge.v}`} pointerEvents="none">
                    <rect
                      x={spot.x - 23}
                      y={spot.y - 8}
                      width={46}
                      height={16}
                      rx={8}
                      fill="#ffffff"
                      stroke={onTree ? "#c7d2fe" : "#e4e4e7"}
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
                      fill={onTree ? ROUTE_TEXT : "#3f3f46"}
                    >
                      {kmLabel(edge.km)}
                    </text>
                  </g>
                );
              })}
              {NODE_IDS.map((id) => {
                const reached = Number.isFinite(snap.dist[id]);
                const fresh = snap.updated.includes(id);
                const waiting = snap.queue.includes(id);
                return (
                  <g key={id} pointerEvents="none">
                    {fresh ? <circle cx={POS[id].x} cy={POS[id].y} r={11} fill="none" stroke={ROUTE} strokeWidth={1.6} /> : null}
                    {snap.current === id ? (
                      <circle cx={POS[id].x} cy={POS[id].y} r={11} fill="none" stroke={ROUTE_ACTIVE} strokeWidth={1.4} strokeDasharray="3 3" />
                    ) : null}
                    <circle
                      cx={POS[id].x}
                      cy={POS[id].y}
                      r={6}
                      fill={reached ? ROUTE : waiting ? "#a5b4fc" : "#d4d4d8"}
                      filter={reached ? "url(#spfa-pin-shadow)" : undefined}
                    />
                    <circle cx={POS[id].x} cy={POS[id].y} r={2.2} fill="#ffffff" />
                  </g>
                );
              })}
              {LABELS.map((label) => {
                const reached = Number.isFinite(snap.dist[label.id]);
                const fresh = snap.updated.includes(label.id);
                return (
                  <MapLabel
                    key={label.id}
                    lines={label.lines}
                    x={label.x}
                    y={label.id === "rf" ? label.y - 18 : label.y}
                    anchor={label.anchor}
                    kind={label.kind}
                    active={fresh}
                    dim={!reached && !snap.queue.includes(label.id)}
                    note={reached ? kmLabel(snap.dist[label.id]) : undefined}
                    noteFresh={fresh}
                  />
                );
              })}
            </svg>
            <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom >= MAX_ZOOM}
                onClick={() => changeZoom(1)}
                className="flex h-7 w-7 items-center justify-center text-[16px] leading-none text-neutral-800 disabled:text-neutral-300"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= MIN_ZOOM}
                onClick={() => changeZoom(-1)}
                className="flex h-7 w-7 items-center justify-center border-t border-neutral-200 text-[16px] leading-none text-neutral-800 disabled:text-neutral-300"
              >
                −
              </button>
            </div>
          </div>
          <div className="shrink-0 space-y-3 border-t border-neutral-200 px-3 py-3">
            <div className="flex items-center gap-3" aria-live="polite">
              <span
                className={`w-[84px] shrink-0 whitespace-nowrap rounded-md py-1 text-center text-[10.5px] font-semibold uppercase tracking-wide ${
                  hot ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {status}
              </span>
              <p className="flex h-[3lh] min-w-0 flex-1 items-center text-[12.5px] leading-snug text-neutral-800">
                <span className="line-clamp-3">{snap.caption}</span>
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              {details.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[11px] text-neutral-500">{label}</dt>
                  <dd className={`truncate font-medium ${value === "–" ? "text-neutral-300" : "text-neutral-800"}`}>{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-neutral-500">
                <span className="font-medium text-neutral-700">Waiting</span>
                <span className="tabular-nums">{snap.queue.length === 0 ? "none" : `${snap.queue.length} ${snap.queue.length === 1 ? "place" : "places"}`}</span>
              </div>
              <div className="flex h-7 items-center gap-1 overflow-x-auto">
                {snap.queue.length === 0 ? (
                  <span className="text-[12px] text-neutral-300">–</span>
                ) : (
                  snap.queue.map((id, index) => {
                    const justAdded = snap.enqueued && index === snap.queue.length - 1;
                    return (
                      <span
                        key={`${id}-${index}`}
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          justAdded ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {PLACE_NAME[id]}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-neutral-500">
                <span className="font-medium text-neutral-700">Roads from here</span>
                <span className="tabular-nums">
                  {snap.edgeCount === 0 ? "–" : snap.edgeIndex === null ? `${snap.edgeCount} roads` : `${snap.edgeIndex + 1} of ${snap.edgeCount}`}
                </span>
              </div>
              <div className="flex gap-px" aria-hidden="true">
                {Array.from({ length: Math.max(snap.edgeCount, 1) }, (_, index) => {
                  const current = snap.edgeIndex === index;
                  const scanned = snap.edgeIndex !== null && index < snap.edgeIndex;
                  return (
                    <span
                      key={index}
                      className={`h-2 flex-1 rounded-[2px] ${
                        snap.edgeCount === 0 ? "bg-neutral-100" : current ? "bg-indigo-700" : scanned ? "bg-neutral-300" : "bg-neutral-100"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-neutral-500">
                <span className="font-medium text-neutral-700">Places reached</span>
                <span className="tabular-nums">
                  {reachedCount} of {NODE_IDS.length}
                </span>
              </div>
              <div className="flex gap-px">
                {NODE_IDS.map((id) => {
                  const value = snap.dist[id];
                  const fresh = snap.updated.includes(id);
                  const reached = Number.isFinite(value);
                  return (
                    <span
                      key={id}
                      title={`${PLACE_NAME[id]}: ${reached ? kmLabel(value) : "not reached"}`}
                      className={`h-2 flex-1 rounded-[2px] ${fresh ? "bg-indigo-700" : reached ? "bg-indigo-300" : "bg-neutral-100"}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(0)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-medium leading-none text-neutral-700"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              if (done) {
                setStep(0);
                setPlaying(true);
                return;
              }
              setPlaying((value) => !value);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-medium leading-none text-neutral-700"
          >
            {playing && !done ? <Pause size={12} /> : <Play size={12} />}
            {done ? "Replay" : playing ? "Pause" : "Play"}
          </button>
        </div>
        <span className="text-[12px] tabular-nums text-neutral-500">
          {step + 1} / {SPFA_STEPS.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-medium leading-none text-neutral-700 disabled:text-neutral-300"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            disabled={done}
            className="inline-flex items-center rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium leading-none text-indigo-700 disabled:border-neutral-200 disabled:bg-white disabled:text-neutral-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
