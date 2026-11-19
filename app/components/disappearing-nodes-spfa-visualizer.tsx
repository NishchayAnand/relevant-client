"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pause, Play, RotateCcw, SkipBack } from "lucide-react";

const N = 9;
const DISAPPEAR = [20, 4, 8, 10, 9, 12, 9, 12, 15];
const EDGES: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 5],
  [1, 2, 1],
  [1, 3, 4],
  [2, 3, 2],
  [2, 4, 6],
  [3, 4, 1],
  [3, 5, 5],
  [4, 5, 2],
  [4, 6, 3],
  [5, 6, 2],
  [5, 7, 4],
  [6, 7, 2],
];

const JAVA = [
  "public int[] minimumTime(int n, int[][] edges, int[] disappear) {",
  "",
  "    // Step 1: Build an adjacency list to effective access ",
  "    // the neighbours of each node.",
  "    List<int[]>[] graph = new ArrayList[n];",
  "    for (int i = 0; i < n; i++) {",
  "        graph[i] = new ArrayList<>();",
  "    }",
  "",
  "    for (int[] edge :  edges) {",
  "",
  "        int u = edge[0];",
  "        int v = edge[1];",
  "        int weight = edge[2];",
  "",
  "        // Since the graph is undirected, add the edge ",
  "        // to the adjacency list of both vertices.",
  "        graph[u].add(new int[]{v, weight});",
  "        graph[v].add(new int[]{u, weight});",
  "    }",
  "",
  "    // Step 2: Initialize the shortest known arrival time for ",
  "    // for each node as infinity.",
  "    int[] answer = new int[n];",
  "    Arrays.fill(answer, Integer.MAX_VALUE);",
  "",
  "    // Use a FIFO queue to process nodes whose distances ",
  "    // have been improved. A node can be enqueued multiple times.",
  "    Queue<Integer> queue = new LinkedList<>();",
  "",
  "    // The source node is reachable at time 0.",
  "    answer[0] = 0;",
  "    queue.offer(0);",
  "",
  "    // Step 3: Keep processing until no further distance",
  "    // improvements can be discovered.",
  "    while (!queue.isEmpty()) {",
  "",
  "        // Step 4: Process the oldest enqueued node.",
  "        int currentNode = queue.poll();",
  "",
  "        // Step 5: Explore all neighbours to check if we can reach",
  "        // them through a shorter valid path.",
  "        for (int[] neighbour : graph[currentNode]) {",
  "",
  "            int nextNode = neighbour[0];",
  "            int weight = neighbour[1];",
  "",
  "            // Step 6: Calculate the arrival time at the neighbour",
  "            // using the shortest known time to the current node.",
  "            int newTime = answer[currentNode] + weight;",
  "",
  "            // Step 7: Relax the edge if:",
  "            // 1. We discover a shorter arrival time",
  "            // 2. The neighbour is reached before it disappears.",
  "            if ( newTime < answer[nextNode] && ",
  "                newTime < disappear[nextNode] ) {",
  "                    ",
  "                    // Update the shortest known arrival time ",
  "                    // and enqueue the neighbour for further exploration.",
  "                    answer[nextNode] = newTime;",
  "                    queue.offer(nextNode);",
  "                }",
  "        }",
  "    }",
  "",
  "    // Step 8: Nodes whose distances remain infinity are unreachable",
  "    // or cannot be reached before disappearing.",
  "    for (int i = 0; i < n; i++) {",
  "        if (answer[i] == Math.MAX_VALUE) {",
  "            answer[i] = -1;",
  "        }",
  "    }",
  "",
  "    return answer;",
  "",
  "}",
];

const PYTHON = [
  "from collections import deque",
  "",
  "def minimum_time(n, edges, disappear):",
  "",
  "    # Step 1: Build an adjacency list to effective access ",
  "    # the neighbours of each node.",
  "    graph = [None] * n",
  "    for i in range(n):",
  "        graph[i] = []",
  "",
  "    for edge in edges:",
  "",
  "        u = edge[0]",
  "        v = edge[1]",
  "        weight = edge[2]",
  "",
  "        # Since the graph is undirected, add the edge ",
  "        # to the adjacency list of both vertices.",
  "        graph[u].append([v, weight])",
  "        graph[v].append([u, weight])",
  "",
  "    # Step 2: Initialize the shortest known arrival time for ",
  "    # for each node as infinity.",
  "    answer = [float(\"inf\")] * n",
  "",
  "    # Use a FIFO queue to process nodes whose distances ",
  "    # have been improved. A node can be enqueued multiple times.",
  "    queue = deque()",
  "",
  "    # The source node is reachable at time 0.",
  "    answer[0] = 0",
  "    queue.append(0)",
  "",
  "    # Step 3: Keep processing until no further distance",
  "    # improvements can be discovered.",
  "    while queue:",
  "",
  "        # Step 4: Process the oldest enqueued node.",
  "        current_node = queue.popleft()",
  "",
  "        # Step 5: Explore all neighbours to check if we can reach",
  "        # them through a shorter valid path.",
  "        for neighbour in graph[current_node]:",
  "",
  "            next_node = neighbour[0]",
  "            weight = neighbour[1]",
  "",
  "            # Step 6: Calculate the arrival time at the neighbour",
  "            # using the shortest known time to the current node.",
  "            new_time = answer[current_node] + weight",
  "",
  "            # Step 7: Relax the edge if:",
  "            # 1. We discover a shorter arrival time",
  "            # 2. The neighbour is reached before it disappears.",
  "            if new_time < answer[next_node] and new_time < disappear[next_node]:",
  "",
  "                # Update the shortest known arrival time ",
  "                # and enqueue the neighbour for further exploration.",
  "                answer[next_node] = new_time",
  "                queue.append(next_node)",
  "",
  "    # Step 8: Nodes whose distances remain infinity are unreachable",
  "    # or cannot be reached before disappearing.",
  "    for i in range(n):",
  "        if answer[i] == float(\"inf\"):",
  "            answer[i] = -1",
  "",
  "    return answer",
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
  | "answer-alloc"
  | "answer-fill"
  | "queue-create"
  | "answer-source"
  | "offer-source"
  | "while"
  | "poll"
  | "neighbour-for"
  | "next"
  | "edge-weight"
  | "new-time"
  | "relax-if"
  | "relax-limit"
  | "assign"
  | "offer-update"
  | "return-for"
  | "unreachable"
  | "set-missing"
  | "return";

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
    signature: locate(JAVA, "public int[] minimumTime"),
    allocate: locate(JAVA, "List<int[]>[] graph"),
    "init-for": locate(JAVA, "for (int i = 0; i < n; i++)"),
    "init-list": locate(JAVA, "graph[i] = new ArrayList"),
    "edge-for": locate(JAVA, "for (int[] edge"),
    u: locate(JAVA, "int u = edge[0]"),
    v: locate(JAVA, "int v = edge[1]"),
    weight: locate(JAVA, "int weight = edge[2]"),
    "add-uv": locate(JAVA, "graph[u].add"),
    "add-vu": locate(JAVA, "graph[v].add"),
    "answer-alloc": locate(JAVA, "int[] answer = new int[n]"),
    "answer-fill": locate(JAVA, "Arrays.fill"),
    "queue-create": locate(JAVA, "new LinkedList"),
    "answer-source": locate(JAVA, "answer[0] = 0"),
    "offer-source": locate(JAVA, "queue.offer(0)"),
    while: locate(JAVA, "while (!queue.isEmpty())"),
    poll: locate(JAVA, "queue.poll()"),
    "neighbour-for": locate(JAVA, "for (int[] neighbour"),
    next: locate(JAVA, "int nextNode = neighbour[0]"),
    "edge-weight": locate(JAVA, "int weight = neighbour[1]"),
    "new-time": locate(JAVA, "int newTime = answer[currentNode] + weight"),
    "relax-if": locate(JAVA, "newTime < answer[nextNode]"),
    "relax-limit": locate(JAVA, "newTime < disappear[nextNode]"),
    assign: locate(JAVA, "answer[nextNode] = newTime"),
    "offer-update": locate(JAVA, "queue.offer(nextNode)"),
    "return-for": locate(JAVA, "for (int i = 0; i < n; i++)", 1),
    unreachable: locate(JAVA, "answer[i] == Math.MAX_VALUE"),
    "set-missing": locate(JAVA, "answer[i] = -1"),
    return: locate(JAVA, "return answer"),
  },
  python: {
    signature: locate(PYTHON, "def minimum_time"),
    allocate: locate(PYTHON, "graph = [None] * n"),
    "init-for": locate(PYTHON, "for i in range(n):"),
    "init-list": locate(PYTHON, "graph[i] = []"),
    "edge-for": locate(PYTHON, "for edge in edges:"),
    u: locate(PYTHON, "u = edge[0]"),
    v: locate(PYTHON, "v = edge[1]"),
    weight: locate(PYTHON, "weight = edge[2]"),
    "add-uv": locate(PYTHON, "graph[u].append"),
    "add-vu": locate(PYTHON, "graph[v].append"),
    "answer-alloc": locate(PYTHON, "answer = [float"),
    "answer-fill": locate(PYTHON, "answer = [float"),
    "queue-create": locate(PYTHON, "queue = deque()"),
    "answer-source": locate(PYTHON, "answer[0] = 0"),
    "offer-source": locate(PYTHON, "queue.append(0)"),
    while: locate(PYTHON, "while queue:"),
    poll: locate(PYTHON, "queue.popleft()"),
    "neighbour-for": locate(PYTHON, "for neighbour in graph"),
    next: locate(PYTHON, "next_node = neighbour[0]"),
    "edge-weight": locate(PYTHON, "weight = neighbour[1]"),
    "new-time": locate(PYTHON, "new_time = answer[current_node] + weight"),
    "relax-if": locate(PYTHON, "new_time < answer[next_node]"),
    "relax-limit": locate(PYTHON, "new_time < disappear[next_node]"),
    assign: locate(PYTHON, "answer[next_node] = new_time"),
    "offer-update": locate(PYTHON, "queue.append(next_node)"),
    "return-for": locate(PYTHON, "for i in range(n):", 1),
    unreachable: locate(PYTHON, "answer[i] == float"),
    "set-missing": locate(PYTHON, "answer[i] = -1"),
    return: locate(PYTHON, "return answer"),
  },
};

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 52, y: 46 },
  1: { x: 148, y: 46 },
  3: { x: 244, y: 46 },
  5: { x: 340, y: 46 },
  7: { x: 436, y: 46 },
  2: { x: 100, y: 156 },
  4: { x: 196, y: 156 },
  6: { x: 292, y: 156 },
  8: { x: 436, y: 156 },
};

const NODE_R = 15;

type Pair = [number, number];
type Tone = "update" | "reject-time" | "reject-disappear";

type Frame = {
  marks: StepId[];
  note: string;
  adj: (Pair[] | null)[] | null;
  answer: number[] | null;
  queue: number[];
  fresh: number | null;
  current: number | null;
  updated: number | null;
  activeEdge: Pair | null;
  edgeTone: Tone | null;
  parent: (number | null)[];
  focus: number[];
  hot: string[];
  scan: number | null;
};

function showAnswer(value: number) {
  if (value === Infinity) return "∞";
  if (value === -1) return "−1";
  return String(value);
}

function buildFrames(): Frame[] {
  const frames: Frame[] = [];
  let adj: (Pair[] | null)[] | null = null;
  let answer: number[] | null = null;
  const queue: number[] = [];
  const parent: (number | null)[] = Array(N).fill(null);
  let fresh: number | null = null;
  let current: number | null = null;
  let updated: number | null = null;
  let activeEdge: Pair | null = null;
  let edgeTone: Tone | null = null;
  let focus: number[] = [];
  let hot: string[] = [];
  let scan: number | null = null;

  function begin() {
    fresh = null;
    updated = null;
    activeEdge = null;
    edgeTone = null;
    focus = [];
    hot = [];
    scan = null;
  }

  function snap(marks: StepId[], note: string) {
    frames.push({
      marks,
      note,
      adj: adj === null ? null : adj.map((list) => (list === null ? null : list.map((pair) => [pair[0], pair[1]] as Pair))),
      answer: answer === null ? null : answer.slice(),
      queue: queue.slice(),
      fresh,
      current,
      updated,
      activeEdge: activeEdge === null ? null : [activeEdge[0], activeEdge[1]],
      edgeTone,
      parent: parent.slice(),
      focus: focus.slice(),
      hot: hot.slice(),
      scan,
    });
  }

  begin();
  current = null;
  snap(["signature"], "Start with n = 9, the 13 roads, and disappear = [20, 4, 8, 10, 9, 12, 9, 12, 15].");

  begin();
  adj = Array.from({ length: N }, () => null);
  snap(["allocate"], "graph is an array of 9 lists. Every slot is still null.");

  for (let i = 0; i < N; i++) {
    begin();
    adj![i] = [];
    focus = [i];
    current = i;
    snap(["init-for", "init-list"], `i = ${i}. graph[${i}] is an empty list.`);
  }

  EDGES.forEach(([u, v, weight], index) => {
    begin();
    adj![u]!.push([v, weight]);
    adj![v]!.push([u, weight]);
    activeEdge = [u, v];
    focus = [u, v];
    hot = [`${u}-${v}`, `${v}-${u}`];
    current = null;
    snap(
      ["edge-for", "u", "v", "weight", "add-uv", "add-vu"],
      `edges[${index}] = [${u}, ${v}, ${weight}]. Add [${v}, ${weight}] to graph[${u}] and [${u}, ${weight}] to graph[${v}].`,
    );
  });

  begin();
  answer = Array(N).fill(Infinity);
  current = null;
  snap(["answer-alloc", "answer-fill"], "answer has one slot per node, each filled with infinity.");

  begin();
  snap(["queue-create"], "queue is an empty FIFO list. A node can be offered again after a later improvement.");

  begin();
  answer[0] = 0;
  updated = 0;
  current = 0;
  snap(["answer-source"], "The source is reachable at time 0, so answer[0] = 0.");

  begin();
  queue.push(0);
  fresh = 0;
  current = 0;
  snap(["offer-source"], "Offer 0. The queue is [0].");

  const readMarks: StepId[] = ["neighbour-for", "next", "edge-weight", "new-time", "relax-if", "relax-limit"];

  while (queue.length > 0) {
    begin();
    const node = queue.shift()!;
    current = node;
    snap(
      ["while", "poll"],
      `Poll ${node}, the oldest entry. answer[${node}] = ${showAnswer(answer[node])}. The queue is [${queue.join(", ")}].`,
    );

    for (const [nextNode, weight] of adj![node]!) {
      const old = answer[nextNode];
      const newTime = answer[node] + weight;
      const shorter = newTime < old;
      const inTime = newTime < DISAPPEAR[nextNode];
      begin();
      current = node;
      activeEdge = [node, nextNode];
      focus = [node, nextNode];
      hot = [`${node}-${nextNode}`];
      if (shorter && inTime) {
        answer[nextNode] = newTime;
        parent[nextNode] = node;
        queue.push(nextNode);
        fresh = nextNode;
        updated = nextNode;
        edgeTone = "update";
        snap(
          [...readMarks, "assign", "offer-update"],
          `newTime = ${showAnswer(answer[node])} + ${weight} = ${newTime}. ${newTime} < answer[${nextNode}] (${showAnswer(old)}) and ${newTime} < disappear[${nextNode}] (${DISAPPEAR[nextNode]}). answer[${nextNode}] = ${newTime}, and ${nextNode} is offered.`,
        );
      } else if (!shorter) {
        edgeTone = "reject-time";
        snap(
          readMarks,
          `newTime = ${showAnswer(answer[node])} + ${weight} = ${newTime}, which is not smaller than answer[${nextNode}] = ${showAnswer(old)}.`,
        );
      } else {
        edgeTone = "reject-disappear";
        snap(
          readMarks,
          `newTime = ${showAnswer(answer[node])} + ${weight} = ${newTime} is shorter than answer[${nextNode}] = ${showAnswer(old)}, but ${newTime} is not before disappear[${nextNode}] = ${DISAPPEAR[nextNode]}.`,
        );
      }
    }
  }

  begin();
  current = null;
  snap(["while"], "The queue is empty, so the loop ends.");

  for (let i = 0; i < N; i++) {
    begin();
    scan = i;
    current = i;
    if (answer![i] === Infinity) {
      answer![i] = -1;
      updated = i;
      snap(
        ["return-for", "unreachable", "set-missing"],
        `i = ${i}. answer[${i}] is still infinity, so it becomes −1.`,
      );
    } else {
      snap(
        ["return-for", "unreachable"],
        `i = ${i}. answer[${i}] = ${showAnswer(answer![i])}, so the infinity check does not change it.`,
      );
    }
  }

  begin();
  current = null;
  snap(["return"], `return [${answer!.map(showAnswer).join(", ")}].`);

  return frames;
}

const FRAMES = buildFrames();

function colorize(text: string, language: Language): ReactNode {
  const commentAt = language === "python" ? text.indexOf("#") : text.indexOf("//");
  const code = commentAt >= 0 ? text.slice(0, commentAt) : text;
  const comment = commentAt >= 0 ? text.slice(commentAt) : "";
  const keywords =
    language === "python"
      ? /\b(from|import|def|for|if|while|in|return|and|None)\b/g
      : /\b(public|int|for|if|while|new|return)\b/g;
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

const CODES: Record<Language, string[]> = { java: JAVA, python: PYTHON };

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
    function onKeyDown(event: globalThis.KeyboardEvent) {
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

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
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

export default function DisappearingNodesSpfaVisualizer() {
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
    const timer = setTimeout(() => setIndex((value) => value + 1), 900);
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
    const top = line.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: Math.max(0, top - 36), behavior: "auto" });
  }, [index, language]);

  return (
    <div className="not-prose my-6 grid h-[680px] max-h-[680px] min-h-[680px] grid-rows-[52px_minmax(0,1fr)_52px_64px] overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex h-[52px] max-h-[52px] items-center gap-x-4 overflow-hidden border-b border-gray-100 px-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Language</span>
        <LanguageMenu language={language} onChange={setLanguage} />
      </div>
      <div className="grid min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:divide-x lg:divide-gray-100">
        <div ref={scrollerRef} className="h-full min-h-0 min-w-0 overflow-x-auto overflow-y-auto bg-neutral-50 [scrollbar-gutter:stable]">
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
                  <span className="whitespace-pre font-mono text-neutral-800">{text.length > 0 ? colorize(text, language) : " "}</span>
                </div>
              );
            })}
          </div>
        </div>
        <StatePanel frame={frame} />
      </div>
      <div className="flex h-[52px] max-h-[52px] min-h-[52px] items-center overflow-hidden border-t border-gray-100 px-4">
        <span className="line-clamp-2 text-[13px] leading-5 text-neutral-600" aria-live="polite">
          {frame.note}
        </span>
      </div>
      <div className="flex h-16 max-h-16 min-h-16 items-center justify-between gap-3 overflow-hidden border-t border-gray-100 px-4">
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
              setIndex((value) => Math.max(0, value - 1));
            }}
            disabled={playing || index === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            <SkipBack size={12} />
            Back
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
        <span className="shrink-0 text-xs tabular-nums text-neutral-500">
          {index + 1}/{FRAMES.length}
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="border-b border-gray-100 bg-neutral-50 px-3 py-1 font-mono text-[11px] text-neutral-500">{children}</div>;
}

function StatePanel({ frame }: { frame: Frame }) {
  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_188px_168px] overflow-hidden">
      <section className="flex min-h-0 flex-col overflow-hidden">
        <SectionLabel>nodes</SectionLabel>
        <div className="relative min-h-0 flex-1">
          <Graph frame={frame} />
        </div>
      </section>
      <section className="flex h-[188px] max-h-[188px] min-h-[188px] flex-col overflow-hidden border-t border-gray-100">
        <SectionLabel>answer · queue</SectionLabel>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wide text-neutral-400">disappear</div>
          <div className="mb-1.5 grid grid-cols-9 gap-1">
            {DISAPPEAR.map((value, node) => (
              <div key={`d-${node}`} className="rounded-md border border-neutral-200 px-0.5 py-1 text-center font-mono text-neutral-500">
                <div className="text-[10px] text-neutral-400">{node}</div>
                <div className="text-[11px]">{value}</div>
              </div>
            ))}
          </div>
          {frame.answer === null ? (
            <div className="text-xs text-neutral-400">answer not created</div>
          ) : (
            <>
            <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wide text-neutral-400">answer</div>
            <div className="grid grid-cols-9 gap-1">
              {frame.answer.map((value, node) => {
                const tone =
                  frame.updated === node
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : frame.current === node
                      ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                      : frame.scan === node
                        ? "border-neutral-400 bg-neutral-50 text-neutral-800"
                        : value === -1
                          ? "border-rose-200 bg-rose-50 text-rose-900"
                          : value !== Infinity
                            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                            : "border-neutral-200 text-neutral-800";
                return (
                  <div key={node} className={"rounded-md border px-0.5 py-1 text-center font-mono " + tone}>
                    <div className="text-[10px] text-neutral-400">{node}</div>
                    <div className="text-xs">{showAnswer(value)}</div>
                  </div>
                );
              })}
            </div>
            </>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="mr-1 font-mono text-[11px] text-neutral-400">queue</span>
            {frame.queue.length === 0 ? (
              <span className="text-xs text-neutral-400">empty</span>
            ) : (
              frame.queue.map((node, entry) => (
                <span
                  key={`${entry}-${node}`}
                  className={
                    "rounded-md border px-2 py-0.5 font-mono text-xs " +
                    (frame.fresh === node && entry === frame.queue.length - 1
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : entry === 0
                        ? "border-indigo-200 bg-indigo-50 text-indigo-950"
                        : "border-neutral-200 text-neutral-700")
                  }
                >
                  {node}
                </span>
              ))
            )}
          </div>
        </div>
      </section>
      <section className="flex h-[168px] max-h-[168px] min-h-[168px] flex-col overflow-hidden border-t border-gray-100">
        <SectionLabel>graph</SectionLabel>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5">
          {frame.adj === null ? (
            <div className="text-xs text-neutral-400">not created</div>
          ) : (
            <div className="space-y-0.5 font-mono text-[11px] leading-4">
              {frame.adj.map((list, node) => {
                const focused = frame.focus.includes(node);
                return (
                  <div key={node} className={"flex gap-2 rounded px-1.5 " + (focused ? "bg-indigo-50 text-indigo-950" : "text-neutral-700")}>
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
  const ordered = EDGES.map((edge) => {
    const active =
      frame.activeEdge !== null &&
      ((frame.activeEdge[0] === edge[0] && frame.activeEdge[1] === edge[1]) ||
        (frame.activeEdge[0] === edge[1] && frame.activeEdge[1] === edge[0]));
    const tree = frame.parent[edge[0]] === edge[1] || frame.parent[edge[1]] === edge[0];
    const rank = active ? 3 : tree ? 2 : 1;
    return { edge, active, tree, rank };
  }).sort((a, b) => a.rank - b.rank);

  return (
    <svg viewBox="0 0 488 214" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Nine nodes connected by the example roads">
      {ordered.map(({ edge, active, tree }) => {
        const { x1, y1, x2, y2, mx, my } = segment(edge[0], edge[1]);
        const failed = active && frame.edgeTone === "reject-disappear";
        const stroke = failed ? "#e11d48" : active ? "#4f46e5" : tree ? "#10b981" : "#d4d4d8";
        const width = active ? 2.75 : tree ? 2.25 : 1.5;
        const fill = failed ? "#fff1f2" : active ? "#eef2ff" : tree ? "#ecfdf5" : "#ffffff";
        const pill = failed ? "#fda4af" : active ? "#a5b4fc" : tree ? "#6ee7b7" : "#e4e4e7";
        const text = failed ? "#be123c" : active ? "#3730a3" : tree ? "#047857" : "#71717a";
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
        const value = frame.answer?.[id];
        const finite = value !== undefined && value !== Infinity && value !== -1;
        let fill = "#ffffff";
        let stroke = "#d4d4d8";
        let text = "#3f3f46";
        if (finite) {
          fill = "#ecfdf5";
          stroke = "#059669";
          text = "#047857";
        }
        if (value === -1) {
          fill = "#fff1f2";
          stroke = "#e11d48";
          text = "#be123c";
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
