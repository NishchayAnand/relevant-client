"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pause, Play, RotateCcw } from "lucide-react";

const N = 6;
const SOURCE = 0;
const EDGES: [number, number, number][] = [
  [0, 1, 4],
  [0, 2, 1],
  [1, 2, 2],
  [3, 4, 5],
  [1, 4, 6],
  [2, 4, 3],
  [3, 5, 2],
  [4, 5, 1],
];

const JAVA = [
  "public int[] dijkstra(int n, int[][] edges, int source) {",
  "",
  "    // Step 1: Build the adjacency list.",
  "    List<int[]>[] graph = new ArrayList[n];",
  "",
  "    for (int i = 0; i < n; i++) {",
  "        graph[i] = new ArrayList<>();",
  "    }",
  "",
  "    // Add edges to the adjacency list.",
  "    for (int[] edge: edges) {",
  "",
  "        int u = edge[0];",
  "        int v = edge[1];",
  "        int weight = edge[2];",
  "",
  "        graph[u].add(new int[]{v, weight});",
  "        // If the graph is undirected, add both directions.",
  "        graph[v].add(new int[]{u, weight});",
  "    }",
  "",
  "    // Step 2: Initialize the distance array.",
  "    int[] dist = new int[n];",
  "    // Initially, all nodes are unreachable (infinity).",
  "    Arrays.fill(dist, Integer.MAX_VALUE);",
  "",
  "    // Distance from the source to iteself is 0.",
  "    dist[source] = 0;",
  "",
  "    // Step 3: Create a min-priority queue.",
  "    PriorityQueue<int[]> pq = new PriorityQueue<>(",
  "        Comparator.comparingInt(a -> a[0])",
  "    );",
  "",
  "    // Add the source node with distance 0.",
  "    pf.offer(new int[]{0, source});",
  "",
  "    // Step 4: Process the nodes until the priority queue is empty.",
  "    while (!pq.empty()) {",
  "",
  "        // Extract the node with the smallest node distance.",
  "        int[] current = pq.poll();",
  "",
  "        int distance = current[0];",
  "        int node = current[1];",
  "",
  "        // Step 5: Skip outdates entries.",
  "        // A better distance might have been discovered ",
  "        // after this entry was inserted into the queue.",
  "        if (distance > dist[node]) {",
  "            continue;",
  "        }",
  "",
  "        // Step 6: Explore all neighbours of the current node.",
  "        for (int[] neighbour : graph[node] ) {",
  "",
  "            int nextNode = neighbour[0];",
  "            int weight = neighbour[1];",
  "",
  "            // Calculate the distance to the neighbour ",
  "            // through the current node.",
  "            int newDistance = distance + weight;",
  "",
  "            // Step 7: Relax the edge.",
  "            // Update the distance if we discover a shorter path.",
  "            if (newDistance < dist[nextNode]) {",
  "",
  "                dist[node] = newDistance;",
  "",
  "                // Insert the updated distance into the min-heap.",
  "                pq.offer(new int[]{newDistance, nextNode});",
  "            }",
  "        }",
  "    }",
  "",
  "    // Step 8: Return the shortest distances.",
  "    // Convert unreachable nodes from INF to -1.",
  "    for (int i = 0; i < n; i++) {",
  "",
  "        if (dist[i] == Integer.MAX_VALUE) {",
  "            dist[i] = -1;",
  "        }",
  "    }",
  "",
  "    return dist;",
  "}",
];

const PYTHON = [
  "import heapq",
  "",
  "def dijkstra(n, edges, source):",
  "",
  "    # Step 1: Build the adjacency list.",
  "    graph = [None] * n",
  "",
  "    for i in range(n):",
  "        graph[i] = []",
  "",
  "    # Add edges to the adjacency list.",
  "    for edge in edges:",
  "",
  "        u = edge[0]",
  "        v = edge[1]",
  "        weight = edge[2]",
  "",
  "        graph[u].append([v, weight])",
  "        # If the graph is undirected, add both directions.",
  "        graph[v].append([u, weight])",
  "",
  "    # Step 2: Initialize the distance array.",
  "    dist = [float(\"inf\")] * n",
  "",
  "    # Distance from the source to itself is 0.",
  "    dist[source] = 0",
  "",
  "    # Step 3: Create a min-priority queue.",
  "    pq = []",
  "",
  "    # Add the source node with distance 0.",
  "    heapq.heappush(pq, [0, source])",
  "",
  "    # Step 4: Process the nodes until the priority queue is empty.",
  "    while pq:",
  "",
  "        # Extract the node with the smallest known distance.",
  "        current = heapq.heappop(pq)",
  "",
  "        distance = current[0]",
  "        node = current[1]",
  "",
  "        # Step 5: Skip outdated entries.",
  "        # A better distance might have been discovered",
  "        # after this entry was inserted into the queue.",
  "        if distance > dist[node]:",
  "            continue",
  "",
  "        # Step 6: Explore all neighbours of the current node.",
  "        for neighbour in graph[node]:",
  "",
  "            next_node = neighbour[0]",
  "            weight = neighbour[1]",
  "",
  "            # Calculate the distance to the neighbour",
  "            # through the current node.",
  "            new_distance = distance + weight",
  "",
  "            # Step 7: Relax the edge.",
  "            # Update the distance if we discover a shorter path.",
  "            if new_distance < dist[next_node]:",
  "",
  "                dist[next_node] = new_distance",
  "",
  "                # Insert the updated distance into the min-heap.",
  "                heapq.heappush(pq, [new_distance, next_node])",
  "",
  "    # Step 8: Return the shortest distances.",
  "    # Convert unreachable nodes from inf to -1.",
  "    for i in range(n):",
  "",
  "        if dist[i] == float(\"inf\"):",
  "            dist[i] = -1",
  "",
  "    return dist",
];

type Language = "java" | "python";
type StepId =
  | "signature"
  | "allocate"
  | "init-for"
  | "init-list"
  | "edge-for"
  | "u"
  | "v"
  | "weight"
  | "add-uv"
  | "add-vu"
  | "dist-alloc"
  | "dist-fill"
  | "dist-source"
  | "pq-create"
  | "pq-cmp"
  | "offer-source"
  | "while"
  | "poll"
  | "distance"
  | "node"
  | "stale-if"
  | "continue"
  | "neighbour-for"
  | "next"
  | "edge-weight"
  | "new-distance"
  | "relax-if"
  | "assign"
  | "offer-update"
  | "return-for"
  | "unreachable"
  | "return";

const CODES: Record<Language, string[]> = { java: JAVA, python: PYTHON };

function locate(code: string[], snippet: string, occurrence = 0) {
  let seen = 0;
  for (let index = 0; index < code.length; index++) {
    if (code[index].includes(snippet)) {
      if (seen === occurrence) return index + 1;
      seen++;
    }
  }
  throw new Error(`Missing code line: ${snippet}`);
}

const LINE_OF: Record<Language, Record<StepId, number>> = {
  java: {
    signature: locate(JAVA, "public int[] dijkstra"),
    allocate: locate(JAVA, "List<int[]>[] graph"),
    "init-for": locate(JAVA, "for (int i = 0; i < n; i++)"),
    "init-list": locate(JAVA, "graph[i] = new ArrayList"),
    "edge-for": locate(JAVA, "for (int[] edge: edges)"),
    u: locate(JAVA, "int u = edge[0]"),
    v: locate(JAVA, "int v = edge[1]"),
    weight: locate(JAVA, "int weight = edge[2]"),
    "add-uv": locate(JAVA, "graph[u].add"),
    "add-vu": locate(JAVA, "graph[v].add"),
    "dist-alloc": locate(JAVA, "int[] dist = new int[n]"),
    "dist-fill": locate(JAVA, "Arrays.fill"),
    "dist-source": locate(JAVA, "dist[source] = 0"),
    "pq-create": locate(JAVA, "new PriorityQueue"),
    "pq-cmp": locate(JAVA, "Comparator.comparingInt"),
    "offer-source": locate(JAVA, "pf.offer"),
    while: locate(JAVA, "while (!pq.empty())"),
    poll: locate(JAVA, "pq.poll()"),
    distance: locate(JAVA, "int distance = current[0]"),
    node: locate(JAVA, "int node = current[1]"),
    "stale-if": locate(JAVA, "distance > dist[node]"),
    continue: locate(JAVA, "continue;"),
    "neighbour-for": locate(JAVA, "for (int[] neighbour"),
    next: locate(JAVA, "int nextNode = neighbour[0]"),
    "edge-weight": locate(JAVA, "int weight = neighbour[1]"),
    "new-distance": locate(JAVA, "int newDistance = distance + weight"),
    "relax-if": locate(JAVA, "newDistance < dist[nextNode]"),
    assign: locate(JAVA, "dist[node] = newDistance"),
    "offer-update": locate(JAVA, "new int[]{newDistance, nextNode}"),
    "return-for": locate(JAVA, "for (int i = 0; i < n; i++)", 1),
    unreachable: locate(JAVA, "dist[i] == Integer.MAX_VALUE"),
    return: locate(JAVA, "return dist"),
  },
  python: {
    signature: locate(PYTHON, "def dijkstra"),
    allocate: locate(PYTHON, "graph = [None] * n"),
    "init-for": locate(PYTHON, "for i in range(n):"),
    "init-list": locate(PYTHON, "graph[i] = []"),
    "edge-for": locate(PYTHON, "for edge in edges:"),
    u: locate(PYTHON, "u = edge[0]"),
    v: locate(PYTHON, "v = edge[1]"),
    weight: locate(PYTHON, "weight = edge[2]"),
    "add-uv": locate(PYTHON, "graph[u].append"),
    "add-vu": locate(PYTHON, "graph[v].append"),
    "dist-alloc": locate(PYTHON, "dist = [float"),
    "dist-fill": locate(PYTHON, "dist = [float"),
    "dist-source": locate(PYTHON, "dist[source] = 0"),
    "pq-create": locate(PYTHON, "pq = []"),
    "pq-cmp": locate(PYTHON, "pq = []"),
    "offer-source": locate(PYTHON, "[0, source]"),
    while: locate(PYTHON, "while pq:"),
    poll: locate(PYTHON, "heappop"),
    distance: locate(PYTHON, "distance = current[0]"),
    node: locate(PYTHON, "node = current[1]"),
    "stale-if": locate(PYTHON, "distance > dist[node]"),
    continue: locate(PYTHON, "continue"),
    "neighbour-for": locate(PYTHON, "for neighbour in graph[node]"),
    next: locate(PYTHON, "next_node = neighbour[0]"),
    "edge-weight": locate(PYTHON, "weight = neighbour[1]"),
    "new-distance": locate(PYTHON, "new_distance = distance + weight"),
    "relax-if": locate(PYTHON, "new_distance < dist[next_node]"),
    assign: locate(PYTHON, "dist[next_node] = new_distance"),
    "offer-update": locate(PYTHON, "[new_distance, next_node]"),
    "return-for": locate(PYTHON, "for i in range(n):", 1),
    unreachable: locate(PYTHON, 'dist[i] == float("inf")'),
    return: locate(PYTHON, "return dist"),
  },
};

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 140, y: 28 },
  1: { x: 46, y: 98 },
  2: { x: 234, y: 98 },
  4: { x: 140, y: 172 },
  3: { x: 46, y: 250 },
  5: { x: 234, y: 250 },
};

const NODE_R = 15;

type Pair = [number, number];
type Entry = { d: number; node: number; seq: number; fresh: boolean };

type Frame = {
  marks: StepId[];
  note: string;
  adj: (Pair[] | null)[] | null;
  dist: number[] | null;
  pq: { d: number; node: number; fresh: boolean }[];
  current: number | null;
  settled: number[];
  updated: number | null;
  activeEdge: Pair | null;
  tree: (number | null)[];
  added: number;
  focus: number[];
  hot: string[];
};

function showDist(value: number) {
  return value === Infinity ? "∞" : String(value);
}

function buildFrames(): Frame[] {
  const frames: Frame[] = [];
  let adj: (Pair[] | null)[] | null = null;
  let dist: number[] | null = null;
  const pq: Entry[] = [];
  let seq = 0;
  const settled: number[] = [];
  const tree: (number | null)[] = Array(N).fill(null);
  let added = 0;
  let current: number | null = null;
  let updated: number | null = null;
  let activeEdge: Pair | null = null;
  let focus: number[] = [];
  let hot: string[] = [];

  function begin() {
    for (const entry of pq) entry.fresh = false;
    updated = null;
    activeEdge = null;
    focus = [];
    hot = [];
  }

  function shownQueue() {
    return [...pq]
      .sort((a, b) => a.d - b.d || a.seq - b.seq)
      .map((entry) => ({ d: entry.d, node: entry.node, fresh: entry.fresh }));
  }

  function snap(marks: StepId[], note: string) {
    frames.push({
      marks,
      note,
      adj: adj === null ? null : adj.map((list) => (list === null ? null : list.map((pair) => [pair[0], pair[1]]))),
      dist: dist === null ? null : dist.slice(),
      pq: shownQueue(),
      current,
      settled: settled.slice(),
      updated,
      activeEdge: activeEdge === null ? null : [activeEdge[0], activeEdge[1]],
      tree: tree.slice(),
      added,
      focus: focus.slice(),
      hot: hot.slice(),
    });
  }

  function offer(d: number, node: number) {
    for (const entry of pq) entry.fresh = false;
    pq.push({ d, node, seq: seq++, fresh: true });
  }

  function poll() {
    pq.sort((a, b) => a.d - b.d || a.seq - b.seq);
    return pq.shift()!;
  }

  begin();
  current = null;
  snap(["signature"], "Call dijkstra with n = 6 and source = 0.");

  begin();
  adj = Array.from({ length: N }, () => null);
  snap(
    ["allocate"],
    "Allocate graph as an array of n lists. The slots are still empty.",
  );

  for (let i = 0; i < N; i++) {
    begin();
    adj[i] = [];
    focus = [i];
    current = i;
    snap(
      ["init-for", "init-list"],
      `Create an empty list for node ${i}.`,
    );
  }

  EDGES.forEach(([u, v, weight], index) => {
    begin();
    adj![u]!.push([v, weight]);
    adj![v]!.push([u, weight]);
    added = index + 1;
    activeEdge = [u, v];
    focus = [u, v];
    hot = [`${u}-${v}`, `${v}-${u}`];
    current = null;
    snap(
      ["edge-for", "u", "v", "weight", "add-uv", "add-vu"],
      `edges[${index}] = [${u}, ${v}, ${weight}] adds ${u} → ${v} and ${v} → ${u}.`,
    );
  });

  begin();
  dist = Array(N).fill(Infinity);
  current = null;
  snap(
    ["dist-alloc", "dist-fill"],
    "Fill dist with infinity. Every node starts unreachable.",
  );

  begin();
  dist[SOURCE] = 0;
  updated = SOURCE;
  current = SOURCE;
  snap(["dist-source"], "dist[source] = 0.");

  begin();
  current = null;
  updated = null;
  snap(
    ["pq-create", "pq-cmp"],
    "Create a min-heap ordered by the distance stored at index 0.",
  );

  begin();
  offer(0, SOURCE);
  snap(["offer-source"], "Offer [0, 0], the source with distance 0.");

  const pollMarks: StepId[] = ["while", "poll", "distance", "node", "stale-if"];

  while (pq.length > 0) {
    begin();
    const entry = poll();
    current = entry.node;
    const stale = entry.d > dist![entry.node];
    if (!stale) settled.push(entry.node);
    snap(
      stale ? [...pollMarks, "continue"] : pollMarks,
      stale
        ? `Poll [${entry.d}, ${entry.node}]. ${entry.d} > dist[${entry.node}] (${showDist(dist![entry.node])}), so skip this outdated entry.`
        : `Poll [${entry.d}, ${entry.node}]. distance = ${entry.d} matches dist[${entry.node}], so node ${entry.node} is settled.`,
    );
    if (stale) continue;

    for (const [nextNode, weight] of adj![entry.node]!) {
      const newDistance = entry.d + weight;
      const oldDistance = dist![nextNode];
      const better = newDistance < oldDistance;
      begin();
      current = entry.node;
      activeEdge = [entry.node, nextNode];
      focus = [entry.node];
      hot = [`${entry.node}-${nextNode}`];
      if (better) {
        dist![nextNode] = newDistance;
        tree[nextNode] = entry.node;
        updated = nextNode;
        offer(newDistance, nextNode);
      }
      snap(
        better
          ? ["neighbour-for", "next", "edge-weight", "new-distance", "relax-if", "assign", "offer-update"]
          : ["neighbour-for", "next", "edge-weight", "new-distance", "relax-if"],
        better
          ? `${entry.node} → ${nextNode} costs ${newDistance}, which is shorter than ${showDist(oldDistance)}. dist[${nextNode}] = ${newDistance}, and [${newDistance}, ${nextNode}] enters the queue.`
          : `${entry.node} → ${nextNode} costs ${newDistance}, which is not shorter than dist[${nextNode}] = ${showDist(oldDistance)}.`,
      );
    }
  }

  begin();
  current = null;
  snap(["while"], "The priority queue is empty, so the loop ends.");

  begin();
  snap(
    ["return-for", "unreachable", "return"],
    `Every distance is finite, so none become -1. return [${dist!.map(showDist).join(", ")}].`,
  );

  return frames;
}

const FRAMES = buildFrames();

function colorize(text: string, language: Language): ReactNode {
  const commentAt = language === "python" ? text.indexOf("#") : text.indexOf("//");
  const code = commentAt >= 0 ? text.slice(0, commentAt) : text;
  const comment = commentAt >= 0 ? text.slice(commentAt) : "";
  const keywords =
    language === "python"
      ? /\b(import|def|for|if|while|in|return|None)\b/g
      : /\b(public|int|for|if|while|new|return|void)\b/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = keywords.exec(code)) !== null) {
    if (match.index > last) parts.push(code.slice(last, match.index));
    parts.push(
      <span key={`${match.index}-${match[0]}`} style={{ color: "#4f46e5" }}>
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

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
];

function LanguageMenu({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(language);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = LANGUAGES.find((option) => option.id === language) ?? LANGUAGES[0];

  function placeMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 148);
    const height = LANGUAGES.length * 32 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < height + 8 ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setMenuStyle({ top, left, width });
  }

  useEffect(() => {
    if (!open) return;
    placeMenu();
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  function choose(next: Language) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const current = LANGUAGES.findIndex((option) => option.id === active);
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setActive(language);
      placeMenu();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(LANGUAGES[Math.min(LANGUAGES.length - 1, current + 1)].id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(LANGUAGES[Math.max(0, current - 1)].id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    }
  }

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Language"
            style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
            className="fixed z-50 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg shadow-neutral-900/5"
          >
            {LANGUAGES.map((option) => {
              const isSelected = option.id === language;
              const isActive = option.id === active;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(option.id)}
                  onClick={() => choose(option.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                    isActive ? "bg-neutral-100 text-neutral-900" : "text-neutral-600"
                  }`}
                >
                  <Check size={12} className={isSelected ? "text-neutral-800" : "opacity-0"} />
                  <span className={isSelected ? "font-medium" : ""}>{option.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        onKeyDown={onTriggerKeyDown}
        onClick={() => {
          setActive(language);
          if (!open) placeMenu();
          setOpen((value) => !value);
        }}
        className={`inline-flex min-w-[5.75rem] items-center justify-between gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium transition-colors ${
          open
            ? "border-neutral-300 text-neutral-900"
            : "border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        {selected.label}
        <ChevronDown size={13} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </>
  );
}

export default function DijkstraCodeVisualizer() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [language, setLanguage] = useState<Language>("java");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frame = FRAMES[index];
  const code = CODES[language];
  const activeLines = frame.marks.map((mark) => LINE_OF[language][mark]);
  const done = index >= FRAMES.length - 1;

  useEffect(() => {
    if (!playing || done) return;
    const timer = setTimeout(() => setIndex((value) => value + 1), 750);
    return () => clearTimeout(timer);
  }, [playing, done, index]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const lines = FRAMES[index].marks.map((mark) => LINE_OF[language][mark]);
    const line = lineRefs.current[Math.min(...lines) - 1];
    if (!scroller || !line) return;
    const top =
      line.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: Math.max(0, top - 36), behavior: "auto" });
  }, [index, language]);

  return (
    <div className="not-prose my-6 flex h-[90vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex h-[65px] shrink-0 items-center gap-2 border-b border-gray-100 px-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Language</span>
        <LanguageMenu language={language} onChange={setLanguage} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-gray-100 lg:flex-row lg:divide-x lg:divide-y-0">
        <div
          ref={scrollerRef}
          className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-neutral-50"
        >
          <div className="w-max min-w-full py-2">
            {code.map((text, lineIndex) => {
              const lineNumber = lineIndex + 1;
              const active = activeLines.includes(lineNumber);
              return (
                <div
                  key={lineNumber}
                  ref={(element) => {
                    lineRefs.current[lineIndex] = element;
                  }}
                  className="flex w-max min-w-full items-start pr-4 text-[12.5px] leading-5"
                  style={{ background: active ? "#eef2ff" : "#fafafa" }}
                >
                  <span
                    className="sticky left-0 w-9 shrink-0 select-none pr-2 text-right font-mono tabular-nums"
                    style={{
                      color: active ? "#4338ca" : "#a3a3a3",
                      background: active ? "#eef2ff" : "#fafafa",
                      boxShadow: active ? "inset 2px 0 0 #4f46e5" : "none",
                    }}
                  >
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre font-mono text-neutral-800">
                    {text.length > 0 ? colorize(text, language) : " "}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <StatePanel frame={frame} />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-1.5">
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIndex(0);
            }}
            disabled={index === 0 && !playing}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              if (done) {
                setIndex(0);
                setPlaying(true);
                return;
              }
              setPlaying((value) => !value);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
          >
            {playing && !done ? <Pause size={12} /> : <Play size={12} />}
            {done ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIndex((value) => Math.min(FRAMES.length - 1, value + 1));
            }}
            disabled={playing || done}
            className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            Step
          </button>
        </div>
        <p className="min-w-0 flex-1 text-sm text-neutral-600" aria-live="polite">
          {frame.note}
        </p>
        <p className="text-xs tabular-nums text-neutral-500">
          {index + 1}/{FRAMES.length}
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-gray-100 bg-neutral-50 px-3 py-1 font-mono text-[11px] text-neutral-500">
      {children}
    </div>
  );
}

function StatePanel({ frame }: { frame: Frame }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col divide-y divide-gray-100">
      <section className="flex min-h-0 flex-1 flex-col">
        <SectionLabel>Graph</SectionLabel>
        <div className="relative min-h-0 flex-1">
          <Graph frame={frame} />
        </div>
      </section>

      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <section className="min-w-0">
          <SectionLabel>dist</SectionLabel>
          <div className="px-3 py-2">
            {frame.dist === null ? (
              <div className="text-xs text-neutral-400">not created</div>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {frame.dist.map((value, node) => {
                  const settled = frame.settled.includes(node);
                  const tone =
                    frame.updated === node
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : frame.current === node
                        ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                        : settled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border-neutral-200 text-neutral-800";
                  return (
                    <div key={node} className={"rounded-md border px-0.5 py-1 text-center font-mono " + tone}>
                      <div className="text-[10px] text-neutral-400">{node}</div>
                      <div className="text-xs">{showDist(value)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        <section className="min-w-0">
          <SectionLabel>pq</SectionLabel>
          <div className="px-3 py-2">
            {frame.pq.length === 0 ? (
              <div className="text-xs text-neutral-400">empty</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {frame.pq.map((entry, entryIndex) => (
                  <span
                    key={`${entryIndex}-${entry.node}-${entry.d}`}
                    className={
                      "rounded-md border px-2 py-1 font-mono text-xs " +
                      (entry.fresh
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                        : "border-neutral-200 text-neutral-700")
                    }
                  >
                    [{entry.d}, {entry.node}]
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <SectionLabel>graph</SectionLabel>
        <div className="px-3 py-2">
          {frame.adj === null ? (
            <div className="text-xs text-neutral-400">not created</div>
          ) : (
            <div className="space-y-0.5 font-mono text-xs">
              {frame.adj.map((list, node) => {
                const focused = frame.focus.includes(node);
                return (
                  <div
                    key={node}
                    className={
                      "flex gap-2 rounded px-1.5 py-0.5 " +
                      (focused ? "bg-indigo-50 text-indigo-950" : "text-neutral-700")
                    }
                  >
                    <span className="w-3 text-neutral-400">{node}</span>
                    <span>
                      {list === null
                        ? "null"
                        : list.length === 0
                          ? "[]"
                          : list.map(([next, weight]) => {
                              const key = `${node}-${next}`;
                              const hot = frame.hot.includes(key);
                              return (
                                <span key={key} className={hot ? "font-semibold text-indigo-700" : ""}>
                                  [{next}, {weight}]{" "}
                                </span>
                              );
                            })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Graph({ frame }: { frame: Frame }) {
  const ordered = EDGES.map((edge, index) => {
    const visible = index < frame.added;
    const active =
      frame.activeEdge !== null &&
      ((frame.activeEdge[0] === edge[0] && frame.activeEdge[1] === edge[1]) ||
        (frame.activeEdge[0] === edge[1] && frame.activeEdge[1] === edge[0]));
    const tree =
      frame.tree[edge[0]] === edge[1] || frame.tree[edge[1]] === edge[0];
    const rank = !visible ? 0 : active ? 3 : tree ? 2 : 1;
    return { edge, index, visible, active, tree, rank };
  }).sort((a, b) => a.rank - b.rank);

  return (
    <svg viewBox="0 0 280 276" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graph for this dry run">
      {ordered.map(({ edge, visible, active, tree }) => {
        if (!visible) return null;
        const { x1, y1, x2, y2, mx, my } = segment(edge[0], edge[1]);
        const stroke = active ? "#4f46e5" : tree ? "#10b981" : "#d4d4d8";
        const width = active ? 2.75 : tree ? 2.25 : 1.5;
        const fill = active ? "#eef2ff" : tree ? "#ecfdf5" : "#ffffff";
        const pill = active ? "#a5b4fc" : tree ? "#6ee7b7" : "#e4e4e7";
        const text = active ? "#3730a3" : tree ? "#047857" : "#71717a";
        return (
          <g key={`${edge[0]}-${edge[1]}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
            <rect x={mx - 9} y={my - 8} width={18} height={16} rx={8} fill={fill} stroke={pill} />
            <text
              x={mx}
              y={my + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight={700}
              fill={text}
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            >
              {edge[2]}
            </text>
          </g>
        );
      })}
      {Array.from({ length: N }, (_, id) => {
        const { x, y } = POS[id];
        const settled = frame.settled.includes(id);
        let fill = "#ffffff";
        let stroke = "#d4d4d8";
        let text = "#3f3f46";
        if (settled) {
          fill = "#ecfdf5";
          stroke = "#059669";
          text = "#047857";
        }
        if (frame.current === id) {
          fill = "#eef2ff";
          stroke = "#4f46e5";
          text = "#312e81";
        }
        if (frame.updated === id) {
          fill = "#fffbeb";
          stroke = "#d97706";
          text = "#92400e";
        }
        return (
          <g key={id}>
            <circle cx={x} cy={y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={2} />
            <text
              x={x}
              y={y + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight={650}
              fill={text}
              fontFamily="var(--font-geist-sans), sans-serif"
            >
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function segment(u: number, v: number) {
  const a = POS[u];
  const b = POS[v];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const inset = NODE_R + 2;
  return {
    x1: a.x + (dx / len) * inset,
    y1: a.y + (dy / len) * inset,
    x2: b.x - (dx / len) * inset,
    y2: b.y - (dy / len) * inset,
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}
