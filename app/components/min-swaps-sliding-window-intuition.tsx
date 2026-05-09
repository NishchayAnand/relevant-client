"use client";

import { useState } from "react";


const ARR = [1, 0, 1, 0, 1, 1, 0, 1];
const K = 3;
const CELL_W = 44;
const GAP = 8;

type Step = {
  w: number;
  z: number;
  ms: number;
  outIdx: number;
  inIdx: number;
  outVal: number;
  inVal: number;
};

function buildSteps(): Step[] {
  const N = ARR.length;
  const steps: Step[] = [];
  let z = 0;
  for (let i = 0; i < K; i++) if (ARR[i] === 0) z++;
  let ms = z;
  steps.push({ w: 0, z, ms, outIdx: -1, inIdx: -1, outVal: -1, inVal: -1 });
  for (let i = 1; i <= N - K; i++) {
    const o = ARR[i - 1], n = ARR[i + K - 1];
    if (o === 0) z--;
    if (n === 0) z++;
    if (z < ms) ms = z;
    steps.push({ w: i, z, ms, outIdx: i - 1, inIdx: i + K - 1, outVal: o, inVal: n });
  }
  return steps;
}

const STEPS = buildSteps();

function cellClass(i: number, s: Step, cur: number): string {
  const inW = i >= s.w && i < s.w + K;
  if (cur > 0 && i === s.outIdx && s.outVal === 0) return "outgoing";
  if (cur > 0 && i === s.inIdx && s.inVal === 0) return "incoming";
  if (inW) return ARR[i] === 0 ? "window-zero" : "window-one";
  return "idle";
}

const cellStyles: Record<string, React.CSSProperties> = {
  base: {
    width: CELL_W, height: CELL_W, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 500, fontFamily: "var(--font-mono, monospace)",
    border: "1px solid", transition: "all 0.25s", flexShrink: 0,
  },
  idle: { background: "var(--color-background-secondary, #f5f5f5)", borderColor: "var(--color-border-tertiary, #e0e0e0)", color: "var(--color-text-tertiary, #aaa)" },
  "window-one": { background: "var(--color-background-secondary, #f5f5f5)", borderColor: "transparent", color: "var(--color-text-primary, #111)" },
  "window-zero": { background: "#FAEEDA", borderColor: "transparent", color: "#633806" },
  outgoing: { background: "#FCEBEB", borderColor: "#F09595", color: "#791F1F" },
  incoming: { background: "#EAF3DE", borderColor: "#97C459", color: "#27500A" },
};

export default function MinSwapsSlidingWindowIntuitionVisualizer({
  arr = ARR,
  k = K,
}: {
  arr?: number[];
  k?: number;
}) {
  const [cur, setCur] = useState(0);

  const steps = arr === ARR && k === K ? STEPS : buildSteps();
  const s = steps[cur];
  const N = arr.length;

  const winLeft = s.w * (CELL_W + GAP) - 6;
  const winWidth = k * CELL_W + (k - 1) * GAP + 12;

  const showOutArrow = cur > 0 && s.outVal === 0;
  const showInArrow = cur > 0 && s.inVal === 0;
  const outX = s.outIdx * (CELL_W + GAP) + CELL_W / 2;
  const inX = s.inIdx * (CELL_W + GAP) + CELL_W / 2;

  return (
    <div style={{ padding: "16px 24px 32px", fontFamily: "var(--font-sans, sans-serif)", userSelect: "none" }}>

      {/* Arrow SVG above cells */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <svg
          style={{ overflow: "visible", display: "block" }}
          width={N * CELL_W + (N - 1) * GAP}
          height={36}
        >
          <defs>
            <marker id="sw-arr-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="sw-arr-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#639922" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {showOutArrow && (
            <>
              <line x1={outX} y1={8} x2={outX} y2={30} stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#sw-arr-out)" />
              <text x={outX} y={6} textAnchor="middle" fontSize={11} fill="#E24B4A" fontFamily="var(--font-sans, sans-serif)">−1</text>
            </>
          )}
          {showInArrow && (
            <>
              <line x1={inX} y1={8} x2={inX} y2={30} stroke="#639922" strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#sw-arr-in)" />
              <text x={inX} y={6} textAnchor="middle" fontSize={11} fill="#639922" fontFamily="var(--font-sans, sans-serif)">+1</text>
            </>
          )}
        </svg>
      </div>

      {/* Cells row */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: GAP, position: "relative" }}>
          {/* Dashed window box */}
          <div
            style={{
              position: "absolute",
              top: -6, left: winLeft,
              width: winWidth, height: 56,
              borderRadius: 10,
              border: "1.5px dashed var(--color-border-primary, #888)",
              pointerEvents: "none",
              transition: "left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)",
            }}
          />
          {arr.map((val, i) => {
            const state = cellClass(i, s, cur);
            return (
              <div
                key={i}
                style={{ ...cellStyles.base, ...(cellStyles[state] ?? cellStyles.idle), position: "relative", zIndex: 1 }}
              >
                {val}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
        <button
          onClick={() => setCur((c) => Math.max(0, c - 1))}
          disabled={cur === 0}
          style={{
            cursor: cur === 0 ? "default" : "pointer",
            padding: "6px 18px", borderRadius: 6,
            border: "1px solid var(--color-border-tertiary, #ddd)",
            background: "none", color: "var(--color-text-secondary, #666)",
            fontSize: 13, fontFamily: "inherit",
            opacity: cur === 0 ? 0.3 : 1, transition: "opacity 0.15s",
          }}
        >
          ←
        </button>
        <button
          onClick={() => setCur((c) => Math.min(steps.length - 1, c + 1))}
          disabled={cur === steps.length - 1}
          style={{
            cursor: cur === steps.length - 1 ? "default" : "pointer",
            padding: "6px 18px", borderRadius: 6,
            border: "1px solid var(--color-border-tertiary, #ddd)",
            background: "none", color: "var(--color-text-secondary, #666)",
            fontSize: 13, fontFamily: "inherit",
            opacity: cur === steps.length - 1 ? 0.3 : 1, transition: "opacity 0.15s",
          }}
        >
          →
        </button>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 14 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            onClick={() => setCur(i)}
            style={{
              width: 5, height: 5, borderRadius: "50%", cursor: "pointer",
              background: i === cur ? "var(--color-text-primary, #111)" : "var(--color-border-secondary, #ccc)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

    </div>
  );
}
