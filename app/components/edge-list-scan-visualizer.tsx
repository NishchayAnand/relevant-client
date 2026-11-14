"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const EDGES = [
  [0, 1, 4],
  [0, 2, 1],
  [1, 2, 2],
  [3, 4, 5],
  [1, 4, 6],
  [2, 4, 3],
  [3, 5, 2],
  [4, 5, 1],
];

function parseNode(value: string) {
  return /^-?\d+$/.test(value) ? Number(value) : null;
}

function touches(edge: number[], node: number) {
  return edge[0] === node || edge[1] === node;
}

function other(edge: number[], node: number) {
  return edge[0] === node ? edge[1] : edge[0];
}

function format(edge: number[]) {
  return `[${edge[0]}, ${edge[1]}, ${edge[2]}]`;
}

export default function EdgeListScanVisualizer() {
  const [nodeText, setNodeText] = useState("3");
  const [cursor, setCursor] = useState(-1);
  const node = parseNode(nodeText);
  const done = cursor >= EDGES.length - 1 && cursor >= 0;
  const checked = cursor < 0 ? 0 : cursor + 1;
  const found =
    node === null ? [] : EDGES.slice(0, Math.max(checked, 0)).filter((edge) => touches(edge, node));

  let status = "Enter a node, then step through each row.";
  if (node !== null && cursor < 0) {
    status = `Each inner array is one edge. Neighbours of ${node} are not grouped.`;
  } else if (node !== null && cursor >= 0 && !done) {
    const edge = EDGES[cursor];
    status = touches(edge, node)
      ? `${format(edge)} contains ${node}. Keep stepping through the other rows.`
      : `${format(edge)} does not contain ${node}.`;
  } else if (node !== null && done) {
    status = `Read all ${EDGES.length} rows to find ${found.length} neighbours.`;
  }

  function setNode(value: string) {
    if (value !== "" && value !== "-" && !/^-?\d{0,6}$/.test(value)) return;
    setNodeText(value);
    setCursor(-1);
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          Neighbours of
          <input
            type="text"
            inputMode="numeric"
            aria-label="Node"
            value={nodeText}
            onChange={(event) => setNode(event.target.value)}
            className="w-14 rounded-md border border-neutral-200 bg-white px-2 py-1 text-center font-mono text-sm font-semibold text-neutral-900 outline-none focus:border-neutral-400"
          />
        </label>
        <p className="text-xs tabular-nums text-neutral-500">
          {checked}/{EDGES.length} rows read
        </p>
      </div>

      <div className="px-4 py-4 font-mono text-sm">
        <p className="mb-2 text-xs text-neutral-400">[source, destination, weight]</p>
        <div className="text-neutral-500">edges = [</div>
        <ol>
          {EDGES.map((edge, index) => {
            const seen = cursor >= index;
            const current = cursor === index && !done;
            const hit = node !== null && touches(edge, node);
            const last = index === EDGES.length - 1;
            const tone = current
              ? "bg-indigo-50 text-indigo-950"
              : seen && hit
                ? "bg-emerald-50 text-emerald-900"
                : seen
                  ? "text-neutral-400"
                  : "text-neutral-800";
            return (
              <li key={edge.join("-")} className={"flex items-center rounded-md px-2 py-1 " + tone}>
                <span className="w-6 text-xs text-neutral-400">{index}</span>
                <span className="text-neutral-400">[</span>
                <ArrayCell value={edge[0]} mark={seen && node !== null && edge[0] === node} />
                <span className="text-neutral-300">, </span>
                <ArrayCell value={edge[1]} mark={seen && node !== null && edge[1] === node} />
                <span className="text-neutral-300">, </span>
                <ArrayCell value={edge[2]} />
                <span className="text-neutral-400">{last ? "]" : "],"}</span>
                <span className="pl-4 font-sans text-xs">
                  {seen && node !== null ? (hit ? `neighbour ${other(edge, node)}` : "skip") : ""}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="text-neutral-500">]</div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
        <p className="text-sm text-neutral-600" aria-live="polite">
          {status}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor(-1)}
            disabled={cursor < 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setCursor((index) => index + 1)}
            disabled={node === null || done}
            className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            Step
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrayCell({ value, mark = false }: { value: number; mark?: boolean }) {
  return (
    <span className={"inline-block w-3 text-center " + (mark ? "font-semibold text-emerald-700" : "")}>
      {value}
    </span>
  );
}
