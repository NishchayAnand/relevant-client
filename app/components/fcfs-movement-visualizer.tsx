"use client"

import { useState, useEffect, useCallback } from "react";

const FLOORS = [6, 5, 4, 3, 2, 1];
const FLOOR_H = 68;
const ELV_COLOR = { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489" };

function floorTop(f: number) {
  return FLOORS.indexOf(f) * FLOOR_H + 5;
}

type Elevator = {
  floor: number;
  target: number | null;
  busy: boolean;
  transitionMs: number;
};

function initElevator(): Elevator {
  return { floor: 1, target: null, busy: false, transitionMs: 0 };
}

export default function FCFSMovementVisualizer() {
  const [elevator, setElevator] = useState<Elevator>(initElevator);
  const [queue, setQueue] = useState<number[]>([]);
  const [served, setServed] = useState<number[]>([]);

  const reset = useCallback(() => {
    setElevator(initElevator());
    setQueue([]);
    setServed([]);
  }, []);

  // Process the front of the FIFO queue whenever the elevator is free
  useEffect(() => {
    if (elevator.busy || queue.length === 0) return;

    const targetFloor = queue[0];
    const dist = Math.abs(elevator.floor - targetFloor);
    const travelMs = dist === 0 ? 300 : dist * 1000;

    setElevator(prev => ({ ...prev, busy: true, target: targetFloor, transitionMs: travelMs }));

    setTimeout(() => {
      setElevator(prev => ({ ...prev, floor: targetFloor, busy: false, target: null, transitionMs: 0 }));
      setQueue(prev => prev.slice(1));
      setServed(prev => [...prev.filter(f => f !== targetFloor), targetFloor]);
    }, travelMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, elevator]);

  const addRequest = useCallback((f: number) => {
    if (queue.includes(f)) return;
    setQueue(prev => [...prev, f]);
    setServed(prev => prev.filter(s => s !== f));
  }, [queue]);

  const totalH = FLOORS.length * FLOOR_H;
  const animFloor = elevator.target !== null ? elevator.target : elevator.floor;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          Press a floor button to add a destination — requests are served in arrival order.
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
            const queuePos = queue.indexOf(f);
            const isQueued = queuePos !== -1;
            const isNext = queuePos === 0;
            const isServed = served.includes(f) && !isQueued;

            return (
              <div key={f} style={{ display: "flex", alignItems: "center", height: FLOOR_H, borderTop: "0.5px solid #e0e0e0" }}>
                <div style={{ width: 32, fontSize: 12, color: "#999", textAlign: "right", paddingRight: 8, flexShrink: 0 }}>F{f}</div>
                {/* Elevator shaft */}
                <div style={{ width: 72, height: FLOOR_H, background: "#f5f5f5", borderLeft: "0.5px solid #ddd", borderRight: "0.5px solid #ddd", flexShrink: 0 }} />
                {/* Floor button + queue position badge */}
                <div style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <button
                    onClick={() => addRequest(f)}
                    disabled={isQueued}
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      border: "0.5px solid #ccc", fontSize: 11,
                      cursor: isQueued ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "background .15s",
                      ...(isNext
                        ? { background: ELV_COLOR.border, borderColor: ELV_COLOR.border, color: "#fff" }
                        : isQueued
                          ? { background: ELV_COLOR.bg, borderColor: ELV_COLOR.border, color: ELV_COLOR.text }
                          : isServed
                            ? { background: "#EAF3DE", borderColor: "#639922", color: "#3B6D11" }
                            : { background: "transparent", color: "#888" }),
                    }}
                  >
                    {f}
                  </button>
                  {/* Queue position tag */}
                  {isQueued && (
                    <span style={{
                      fontSize: 9, width: 15, height: 15, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isNext ? ELV_COLOR.border : "#e0e0e0",
                      color: isNext ? "#fff" : "#999", fontWeight: 700, flexShrink: 0,
                    }}>
                      {queuePos + 1}
                    </span>
                  )}
                </div>
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
                {elevator.busy && elevator.target !== null
                  ? elevator.target > elevator.floor ? "↑" : "↓"
                  : "·"
                }
              </div>
              <div style={{ fontSize: 12, color: ELV_COLOR.text, fontWeight: 600, marginTop: 1 }}>A</div>
              <div style={{ fontSize: 10, color: ELV_COLOR.text, opacity: 0.75 }}>F{elevator.floor}</div>
            </div>
          </div>
        </div>

        {/* Right: FIFO queue panel */}
        <div style={{ flex: 1, minWidth: 0, height: totalH + 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".07em" }}>
            Request Queue (FIFO)
          </div>

          {queue.length === 0 ? (
            <div style={{ fontSize: 12, color: "#bbb", padding: "8px 12px", borderRadius: 8, border: "0.5px dashed #e0e0e0", textAlign: "center" }}>
              No pending requests
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto" }}>
              {queue.map((f, i) => {
                const isFirst = i === 0;
                return (
                  <div key={`${f}-${i}`} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 12px", borderRadius: 8,
                    border: `0.5px solid ${isFirst ? ELV_COLOR.border : "#e0e0e0"}`,
                    background: isFirst ? ELV_COLOR.bg : "#fff",
                  }}>
                    {/* FIFO number */}
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isFirst ? ELV_COLOR.border : "#f0f0f0",
                      fontSize: 10, fontWeight: 700,
                      color: isFirst ? "#fff" : "#aaa",
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: isFirst ? 600 : 400, color: isFirst ? ELV_COLOR.text : "#666" }}>
                        Floor {f}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 1, color: isFirst ? ELV_COLOR.text : "#aaa", opacity: 0.8 }}>
                        {isFirst ? "Serving now" : `Arrival order #${i + 1} — waiting`}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                      background: isFirst ? ELV_COLOR.border : "#eee",
                      color: isFirst ? "#fff" : "#aaa",
                    }}>
                      {isFirst ? "Next" : "Queued"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
