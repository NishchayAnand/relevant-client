"use client"

import { useState, useEffect, useCallback } from "react";

const FLOORS = [6, 5, 4, 3, 2, 1];
const FLOOR_H = 68;
const ELV_COLOR = { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489" };

type Direction = "UP" | "DOWN";

function floorTop(f: number) {
  return FLOORS.indexOf(f) * FLOOR_H + 5;
}

type Elevator = {
  floor: number;
  direction: Direction;
  target: number | null;
  busy: boolean;
  transitionMs: number;
};

function initElevator(): Elevator {
  return { floor: 1, direction: "UP", target: null, busy: false, transitionMs: 0 };
}

// SCAN: continue in current direction; if nothing ahead, reverse and pick closest from other side
function scanNextFloor(
  currentFloor: number,
  direction: Direction,
  pending: number[]
): { floor: number; newDirection: Direction } | null {
  if (pending.length === 0) return null;

  if (direction === "UP") {
    const ahead = pending.filter(f => f >= currentFloor).sort((a, b) => a - b);
    if (ahead.length > 0) return { floor: ahead[0], newDirection: "UP" };
    const behind = pending.filter(f => f < currentFloor).sort((a, b) => b - a);
    if (behind.length > 0) return { floor: behind[0], newDirection: "DOWN" };
  } else {
    const ahead = pending.filter(f => f <= currentFloor).sort((a, b) => b - a);
    if (ahead.length > 0) return { floor: ahead[0], newDirection: "DOWN" };
    const behind = pending.filter(f => f > currentFloor).sort((a, b) => a - b);
    if (behind.length > 0) return { floor: behind[0], newDirection: "UP" };
  }

  return null;
}

export default function ScanMovementVisualizer() {
  const [elevator, setElevator] = useState<Elevator>(initElevator);
  const [pending, setPending] = useState<number[]>([]);
  const [served, setServed] = useState<number[]>([]);

  const reset = useCallback(() => {
    setElevator(initElevator());
    setPending([]);
    setServed([]);
  }, []);

  // SCAN dispatch: pick the next floor in current direction; reverse if nothing ahead
  useEffect(() => {
    if (elevator.busy || pending.length === 0) return;

    const next = scanNextFloor(elevator.floor, elevator.direction, pending);
    if (!next) return;

    const dist = Math.abs(elevator.floor - next.floor);
    const travelMs = dist === 0 ? 300 : dist * 1000;

    setElevator(prev => ({
      ...prev,
      busy: true,
      target: next.floor,
      direction: next.newDirection,
      transitionMs: travelMs,
    }));

    setTimeout(() => {
      setElevator(prev => ({ ...prev, floor: next.floor, busy: false, target: null, transitionMs: 0 }));
      setPending(prev => prev.filter(f => f !== next.floor));
      setServed(prev => [...prev.filter(f => f !== next.floor), next.floor]);
    }, travelMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, elevator]);

  const addRequest = useCallback((f: number) => {
    if (pending.includes(f)) return;
    setPending(prev => [...prev, f]);
    setServed(prev => prev.filter(s => s !== f));
  }, [pending]);

  // Split pending into current-sweep vs after-reverse for the right panel
  const dir = elevator.direction;
  const cur = elevator.floor;
  const currentSweep = dir === "UP"
    ? pending.filter(f => f >= cur).sort((a, b) => a - b)
    : pending.filter(f => f <= cur).sort((a, b) => b - a);
  const afterReverse = dir === "UP"
    ? pending.filter(f => f < cur).sort((a, b) => b - a)
    : pending.filter(f => f > cur).sort((a, b) => a - b);
  const reverseDir: Direction = dir === "UP" ? "DOWN" : "UP";

  const totalH = FLOORS.length * FLOOR_H;
  const animFloor = elevator.target !== null ? elevator.target : elevator.floor;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          Press floor buttons to add destinations — elevator sweeps in one direction, then reverses.
        </div>
        <button
          onClick={reset}
          style={{ flexShrink: 0, marginLeft: 16, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ddd", background: "transparent", color: "#999" }}
        >
          ↺ Reset
        </button>
      </div>

      <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>

        {/* Building */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          {FLOORS.map((f) => {
            const isPending = pending.includes(f);
            const isServed = served.includes(f) && !isPending;
            const inCurrentSweep = currentSweep.includes(f);
            const inAfterReverse = afterReverse.includes(f);

            return (
              <div key={f} style={{ display: "flex", alignItems: "center", height: FLOOR_H, borderTop: "0.5px solid #e0e0e0" }}>
                <div style={{ width: 32, fontSize: 12, color: "#999", textAlign: "right", paddingRight: 8, flexShrink: 0 }}>F{f}</div>
                {/* Shaft */}
                <div style={{ width: 72, height: FLOOR_H, background: "#f5f5f5", borderLeft: "0.5px solid #ddd", borderRight: "0.5px solid #ddd", flexShrink: 0 }} />
                {/* Floor button */}
                <button
                  onClick={() => addRequest(f)}
                  disabled={isPending}
                  style={{
                    marginLeft: 10, width: 26, height: 26, borderRadius: "50%",
                    border: "0.5px solid #ccc", fontSize: 11,
                    cursor: isPending ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background .15s",
                    ...(inCurrentSweep
                      ? { background: ELV_COLOR.bg, borderColor: ELV_COLOR.border, color: ELV_COLOR.text }
                      : inAfterReverse
                        ? { background: "#f5f5f5", borderColor: "#bbb", color: "#777", borderStyle: "dashed" }
                        : isServed
                          ? { background: "#EAF3DE", borderColor: "#639922", color: "#3B6D11" }
                          : { background: "transparent", color: "#888" }),
                  }}
                >
                  {f}
                </button>
              </div>
            );
          })}
          <div style={{ borderBottom: "0.5px solid #e0e0e0" }} />

          {/* Elevator car overlay */}
          <div style={{ position: "absolute", top: 0, left: 32, width: 72, height: totalH, pointerEvents: "none" }}>
            <div style={{
              position: "absolute", left: 4, width: 64, height: 56, borderRadius: 6,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: ELV_COLOR.bg, border: `1.5px solid ${ELV_COLOR.border}`,
              transition: `top ${elevator.transitionMs > 0 ? elevator.transitionMs : 400}ms cubic-bezier(.4,0,.2,1)`,
              top: floorTop(animFloor), zIndex: 10,
            }}>
              <div style={{ fontSize: 13, color: ELV_COLOR.text, fontWeight: 700, lineHeight: 1 }}>
                {pending.length > 0 ? (dir === "UP" ? "↑" : "↓") : "·"}
              </div>
              <div style={{ fontSize: 12, color: ELV_COLOR.text, fontWeight: 600, marginTop: 1 }}>A</div>
              <div style={{ fontSize: 10, color: ELV_COLOR.text, opacity: 0.75 }}>F{elevator.floor}</div>
            </div>
          </div>
        </div>

        {/* Right: SCAN sweep panel */}
        <div style={{ flex: 1, minWidth: 0, height: totalH + 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>

          {/* Direction status */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8,
            border: `0.5px solid ${ELV_COLOR.border}`, background: ELV_COLOR.bg,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#fff", border: `1.5px solid ${ELV_COLOR.border}`,
              fontSize: 14, fontWeight: 700, color: ELV_COLOR.text,
            }}>
              {pending.length > 0 ? (dir === "UP" ? "↑" : "↓") : "·"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: ELV_COLOR.text }}>
                F{elevator.floor} — {elevator.busy
                  ? `Moving ${dir === "UP" ? "up" : "down"} to F${elevator.target}`
                  : pending.length > 0 ? `Heading ${dir.toLowerCase()}` : "Idle"
                }
              </div>
              <div style={{ fontSize: 11, color: ELV_COLOR.text, opacity: 0.7, marginTop: 1 }}>
                SCAN: serve all {dir === "UP" ? "upward" : "downward"} requests, then reverse
              </div>
            </div>
          </div>

          {pending.length === 0 ? (
            <div style={{ fontSize: 12, color: "#bbb", padding: "8px 12px", borderRadius: 8, border: "0.5px dashed #e0e0e0", textAlign: "center" }}>
              No pending requests
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>

              {/* Current sweep */}
              {currentSweep.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: ELV_COLOR.text,
                    marginBottom: 5, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span>{dir === "UP" ? "↑" : "↓"}</span>
                    <span>Current Sweep — {dir === "UP" ? "going up" : "going down"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {currentSweep.map((f, i) => (
                      <div key={f} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "6px 12px", borderRadius: 8,
                        border: `0.5px solid ${i === 0 ? ELV_COLOR.border : "#c8c4f0"}`,
                        background: i === 0 ? ELV_COLOR.bg : "#f7f6fe",
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: i === 0 ? ELV_COLOR.border : "#d4d0f5",
                          fontSize: 9, fontWeight: 700,
                          color: i === 0 ? "#fff" : ELV_COLOR.text,
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: i === 0 ? 600 : 400, color: ELV_COLOR.text }}>
                          Floor {f}
                        </div>
                        {i === 0 && (
                          <span style={{
                            fontSize: 10, padding: "1px 7px", borderRadius: 99,
                            background: ELV_COLOR.border, color: "#fff", fontWeight: 500,
                          }}>
                            Next
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* After reverse */}
              {afterReverse.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "#999",
                    marginBottom: 5, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{ opacity: 0.5 }}>↔</span>
                    <span>{reverseDir === "UP" ? "↑" : "↓"} After Reverse — {reverseDir === "UP" ? "going up" : "going down"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {afterReverse.map((f, i) => (
                      <div key={f} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "6px 12px", borderRadius: 8,
                        border: "0.5px dashed #e0e0e0",
                        background: "#fafafa",
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "#e8e8e8",
                          fontSize: 9, fontWeight: 700, color: "#999",
                        }}>
                          {currentSweep.length + i + 1}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, color: "#888" }}>Floor {f}</div>
                        <span style={{
                          fontSize: 10, padding: "1px 7px", borderRadius: 99,
                          background: "#eee", color: "#aaa", fontWeight: 500,
                        }}>
                          After reverse
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
