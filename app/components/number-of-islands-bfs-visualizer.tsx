"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, number[][]> = {
  "simple":    [[1,0,1],[1,0,1],[0,0,0]],
  "3 islands": [[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]],
  "1 island":  [[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]],
};

// ─── Island colour palette ────────────────────────────────────────────────────

const PALETTE = [
  { bg: "#d1fae5", border: "#10b981", text: "#065f46" }, // emerald
  { bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" }, // violet
  { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" }, // orange
  { bg: "#fce7f3", border: "#ec4899", text: "#831843" }, // pink
];

// ─── Simulation ───────────────────────────────────────────────────────────────

type StepKind = "scan" | "new_island" | "bfs_process" | "resume_scan" | "done";

type Step = {
  islandSnap:  (number | null)[][];
  inQueueSnap: boolean[][];
  queueSnap:   [number, number][];  // ordered FIFO — index 0 = front
  active:      [number, number] | null;   // just-dequeued cell (amber)
  scanPos:     [number, number] | null;   // outer-loop cursor (dashed ring)
  islandCount: number;
  description: string;
  kind:        StepKind;
};

function simulate(grid: number[][]): Step[] {
  const R = grid.length, C = grid[0].length;
  const visited:  boolean[][]         = Array.from({ length: R }, () => Array(C).fill(false));
  const islandId: (number | null)[][] = Array.from({ length: R }, () => Array(C).fill(null));
  const inQueue:  boolean[][]         = Array.from({ length: R }, () => Array(C).fill(false));
  const steps: Step[] = [];
  let count = 0;

  function snap(
    queue: [number, number][],
    active: [number, number] | null,
    scanPos: [number, number] | null,
    description: string,
    kind: StepKind,
  ) {
    steps.push({
      islandSnap:  islandId.map(r => [...r]),
      inQueueSnap: inQueue.map(r => [...r]),
      queueSnap:   [...queue],
      active, scanPos, islandCount: count, description, kind,
    });
  }

  function bfs(si: number, sj: number, id: number) {
    const queue: [number, number][] = [[si, sj]];
    visited[si][sj]  = true;
    islandId[si][sj] = id;
    inQueue[si][sj]  = true;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      inQueue[x][y] = false;

      const added: [number, number][] = [];
      const dirs: [number, number][] = [[-1, 0], [0, -1], [1, 0], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = x + dr, nc = y + dc;
        if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1 && !visited[nr][nc]) {
          visited[nr][nc]  = true;
          islandId[nr][nc] = id;
          inQueue[nr][nc]  = true;
          queue.push([nr, nc]);
          added.push([nr, nc]);
        }
      }

      const addedStr = added.length
        ? ` → enqueued: ${added.map(([r, c]) => `(${r},${c})`).join(", ")}`
        : " → no new neighbours";

      snap([...queue], [x, y], null,
        `Dequeued (${x}, ${y})${addedStr}.`,
        "bfs_process");
    }
  }

  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      if (grid[i][j] === 0 || visited[i][j]) {
        snap([], null, [i, j],
          grid[i][j] === 0
            ? `Scan at (${i}, ${j}): water — skip.`
            : `Scan at (${i}, ${j}): already visited — skip.`,
          "scan");
      } else {
        count++;
        // enqueue the start cell before snapping
        visited[i][j]  = true;
        islandId[i][j] = count;
        inQueue[i][j]  = true;
        snap([[i, j]], null, [i, j],
          `Scan at (${i}, ${j}): unvisited land — island ${count} starts here. Enqueue (${i}, ${j}) and begin BFS.`,
          "new_island");
        bfs(i, j, count);
        snap([], null, [i, j],
          `BFS complete. Island ${count} fully explored. Outer loop resumes at (${i}, ${j}) → moving to next cell.`,
          "resume_scan");
      }
    }
  }

  snap([], null, null,
    `Scan complete. Found ${count} island${count !== 1 ? "s" : ""}.`,
    "done");
  return steps;
}

// ─── Grid cell ────────────────────────────────────────────────────────────────

const CELL = 44;
const GAP  = 4;

function GridCell({
  value,
  isActive,
  isInQueue,
  isScan,
  islandId,
}: {
  value: number;
  isActive: boolean;
  isInQueue: boolean;
  isScan: boolean;
  islandId: number | null;
}) {
  let bg = "#f9fafb", border = "#e5e7eb", text = "#9ca3af";

  if (value === 0) {
    bg = "#dbeafe"; border = "#bfdbfe"; text = "#60a5fa";
  } else if (isActive) {
    bg = "#fef3c7"; border = "#f59e0b"; text = "#92400e";
  } else if (isInQueue) {
    bg = "#e0f2fe"; border = "#0ea5e9"; text = "#0369a1";
  } else if (islandId !== null) {
    const p = PALETTE[(islandId - 1) % PALETTE.length];
    bg = p.bg; border = p.border; text = p.text;
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {isScan && (
        <div style={{
          position: "absolute", inset: -4,
          borderRadius: 12,
          border: "2px dashed #6b7280",
          pointerEvents: "none",
          zIndex: 1,
        }} />
      )}
      <div style={{
        width: CELL, height: CELL,
        background: bg,
        border: `2px solid ${border}`,
        color: text,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "monospace",
        transition: "background 0.2s, border-color 0.2s",
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Grid display ─────────────────────────────────────────────────────────────

function GridDisplay({
  grid,
  islandSnap,
  inQueueSnap,
  active,
  scanPos,
}: {
  grid: number[][];
  islandSnap:  (number | null)[][];
  inQueueSnap: boolean[][];
  active:  [number, number] | null;
  scanPos: [number, number] | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Column headers */}
      <div style={{ display: "flex", marginLeft: 30, gap: GAP }}>
        {grid[0].map((_, c) => (
          <div key={c} style={{ width: CELL, textAlign: "center", fontSize: 10, color: "#9ca3af" }}>
            {c}
          </div>
        ))}
      </div>

      {grid.map((row, r) => (
        <div key={r} style={{ display: "flex", alignItems: "center", gap: GAP }}>
          <div style={{ width: 26, textAlign: "right", fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>
            {r}
          </div>
          {row.map((val, c) => (
            <GridCell
              key={c}
              value={val}
              isActive={active !== null && active[0] === r && active[1] === c}
              isInQueue={inQueueSnap[r][c]}
              isScan={scanPos !== null && scanPos[0] === r && scanPos[1] === c}
              islandId={islandSnap[r][c]}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Queue display ────────────────────────────────────────────────────────────

function QueueDisplay({ queue }: { queue: [number, number][] }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      minHeight: 34,
      flexWrap: "wrap",
    }}>
      <span style={{
        fontSize: 10,
        color: "#9ca3af",
        fontFamily: "monospace",
        flexShrink: 0,
        letterSpacing: "0.05em",
      }}>
        QUEUE
      </span>

      {queue.length === 0 ? (
        <span style={{ fontSize: 10, color: "#d1d5db", fontStyle: "italic" }}>empty</span>
      ) : (
        <>
          {/* front label */}
          <span style={{ fontSize: 9, color: "#0ea5e9", fontWeight: 600, flexShrink: 0 }}>front</span>
          {queue.map(([r, c], idx) => (
            <div
              key={idx}
              style={{
                background: idx === 0 ? "#0ea5e9" : "#e0f2fe",
                border: `1.5px solid #0ea5e9`,
                color: idx === 0 ? "#ffffff" : "#0369a1",
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {r},{c}
            </div>
          ))}
          <span style={{ fontSize: 9, color: "#9ca3af", flexShrink: 0 }}>back</span>
        </>
      )}
    </div>
  );
}

// ─── Island legend ────────────────────────────────────────────────────────────

function IslandLegend({ count }: { count: number }) {
  if (count === 0) return <span className="text-xs text-gray-400">No islands found yet.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => {
        const p = PALETTE[i % PALETTE.length];
        return (
          <span
            key={i}
            className="text-xs font-medium px-2 py-1 rounded-md"
            style={{ background: p.bg, border: `1.5px solid ${p.border}`, color: p.text }}
          >
            Island {i + 1}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NumberOfIslandsBFSVisualizer() {
  const [presetKey, setPresetKey] = useState<string>("3 islands");
  const [grid, setGrid]           = useState<number[][]>(PRESETS["3 islands"]);
  const [steps, setSteps]         = useState<Step[]>(() => simulate(PRESETS["3 islands"]));
  const [step, setStep]           = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const loadPreset = useCallback((key: string) => {
    const g = PRESETS[key];
    setPresetKey(key);
    setGrid(g);
    setSteps(simulate(g));
    setStep(0);
    setIsPlaying(false);
  }, []);

  const isDone = step >= steps.length;

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const t = setTimeout(() => setStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [isPlaying, step, isDone]);

  const currentStep = step > 0 ? steps[step - 1] : null;
  const R = grid.length, C = grid[0].length;

  const islandSnap  = currentStep?.islandSnap  ?? Array.from({ length: R }, () => Array(C).fill(null));
  const inQueueSnap = currentStep?.inQueueSnap ?? Array.from({ length: R }, () => Array(C).fill(false));
  const queueSnap   = currentStep?.queueSnap   ?? [];
  const active      = currentStep?.active   ?? null;
  const scanPos     = currentStep?.scanPos  ?? null;
  const islandCount = currentStep?.islandCount ?? 0;
  const description = currentStep?.description
    ?? "Scan cells left → right, top → bottom. On each unvisited land cell, enqueue it and run BFS to flood the whole island.";
  const kind = currentStep?.kind ?? null;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mt-5 mb-10">

      {/* ── Main two-column layout ── */}
      <div className="flex divide-x divide-gray-100">

        {/* Left: grid + queue */}
        <div className="px-5 pt-5 pb-5 shrink-0 flex flex-col gap-4">
          <GridDisplay
            grid={grid}
            islandSnap={islandSnap}
            inQueueSnap={inQueueSnap}
            active={active}
            scanPos={scanPos}
          />
          {/* Queue display sits below the grid */}
          <QueueDisplay queue={queueSnap} />
        </div>

        {/* Right: presets + status */}
        <div className="flex-1 flex flex-col px-5 pt-5 pb-5 gap-4 min-w-0">

          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            {Object.keys(PRESETS).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => loadPreset(key)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  presetKey === key
                    ? "border-gray-400 bg-gray-100 text-gray-800"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Island counter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Islands found</span>
              <span className={`text-2xl font-bold tabular-nums font-mono ${
                islandCount > 0 ? "text-gray-800" : "text-gray-300"
              }`}>
                {islandCount}
              </span>
            </div>
            <IslandLegend count={islandCount} />
          </div>

          {/* Step description */}
          <div className="flex flex-col gap-1">
            {kind === "scan" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Scan</span>
            )}
            {kind === "new_island" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">New island</span>
            )}
            {kind === "bfs_process" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">BFS</span>
            )}
            {kind === "resume_scan" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Outer loop resumes</span>
            )}
            {kind === "done" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Done</span>
            )}
            <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Legend</span>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {[
                { color: "#fef3c7", border: "#f59e0b", dashed: false, label: "Active (dequeued)" },
                { color: "#e0f2fe", border: "#0ea5e9", dashed: false, label: "In queue" },
                { color: "#dbeafe", border: "#bfdbfe", dashed: false, label: "Water" },
                { color: "#f9fafb", border: "#e5e7eb", dashed: false, label: "Unvisited land" },
                { color: "transparent", border: "#6b7280", dashed: true, label: "Scan cursor" },
              ].map(({ color, border, dashed, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span style={{
                    display: "inline-block", width: 10, height: 10, borderRadius: 3,
                    background: color, border: `1.5px ${dashed ? "dashed" : "solid"} ${border}`,
                  }} />
                  <span style={{ color: "#6b7280" }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="border-t border-gray-100 px-5 py-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (isDone) { setStep(0); setIsPlaying(false); }
            else setIsPlaying(p => !p);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isDone ? "Restart" : isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => { if (!isDone && !isPlaying) setStep(s => s + 1); }}
          disabled={isPlaying || isDone}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <SkipForward size={15} /> Step
        </button>
        <button
          type="button"
          onClick={() => { setStep(0); setIsPlaying(false); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <div className="flex-1 flex items-center gap-2 ml-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-200"
              style={{ width: `${steps.length ? (step / steps.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">{step}/{steps.length}</span>
        </div>
      </div>
    </div>
  );
}
