"use client"

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";

const FLOORS = [6, 5, 4, 3, 2, 1];
const FLOOR_H = 68;
const ELV_COLORS = [
  { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489", label: "A" },
  { bg: "#E1F5EE", border: "#0F6E56", text: "#085041", label: "B" },
  { bg: "#FAEEDA", border: "#854F0B", text: "#633806", label: "C" },
  { bg: "#FAECE7", border: "#993C1D", text: "#712B13", label: "D" },
];
const PERSON_ICON = "🧍";

type Direction = "UP" | "DOWN" | "IDLE";
type ElevatorColor = (typeof ELV_COLORS)[number];
type DispatchStrategy = "direction-aware" | "idle" | "nearest";

type Elevator = {
  id: number;
  floor: number;
  direction: Direction;
  target: number | null;
  label: string;
  color: ElevatorColor;
  transitionMs: number;
};

type QueueRequest = {
  floor: number;
  direction: Direction;
  assignedTo: number | null;
  strategy: DispatchStrategy | null;
};

type Person = {
  served: boolean;
  direction: Direction;
};

type PeopleByFloor = Partial<Record<number, Person>>;

const DIR_ARROW: Record<Direction, string> = { UP: "↑", DOWN: "↓", IDLE: "·" };

const STRATEGY_META: Record<DispatchStrategy, { bg: string; border: string; color: string; label: string; step: string }> = {
  "direction-aware": { bg: "#EEEDFE", border: "#534AB7", color: "#3C3489", label: "Direction Match",  step: "1" },
  "idle":            { bg: "#E1F5EE", border: "#0F6E56", color: "#085041", label: "Idle Fallback",     step: "2" },
  "nearest":         { bg: "#FAEEDA", border: "#854F0B", color: "#633806", label: "Nearest Fallback",  step: "3" },
};

function floorTop(f: number) {
  return FLOORS.indexOf(f) * FLOOR_H + 5;
}

function isDirectionEligible(elv: Elevator, req: QueueRequest): boolean {
  if (elv.direction !== req.direction) return false;
  if (req.direction === "UP" && elv.floor > req.floor) return false;
  if (req.direction === "DOWN" && elv.floor < req.floor) return false;
  return true;
}

function initElevators(): Elevator[] {
  return [
    { id: 0, floor: 1, direction: "IDLE", target: null, label: "A", color: ELV_COLORS[0], transitionMs: 0 },
    { id: 1, floor: 1, direction: "IDLE", target: null, label: "B", color: ELV_COLORS[1], transitionMs: 0 },
    { id: 2, floor: 1, direction: "IDLE", target: null, label: "C", color: ELV_COLORS[2], transitionMs: 0 },
  ];
}

function StrategyBadge({ strategy }: { strategy: DispatchStrategy }) {
  const s = STRATEGY_META[strategy];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, padding: "2px 8px",
      borderRadius: 99, fontWeight: 600,
      background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 14, height: 14, borderRadius: "50%",
        background: s.border, color: "#fff", fontSize: 9, fontWeight: 700,
      }}>{s.step}</span>
      {s.label}
    </span>
  );
}

function WaitingBadge() {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, padding: "1px 7px",
      borderRadius: 99, fontWeight: 500,
      background: "#FAEEDA", color: "#854F0B",
    }}>
      Waiting
    </span>
  );
}

export default function PriorityDispatchVisualizer() {
  const [elevators, setElevators] = useState<Elevator[]>(() => initElevators());
  const [queue, setQueue] = useState<QueueRequest[]>([]);
  const [people, setPeople] = useState<PeopleByFloor>({});

  const reset = useCallback(() => {
    setElevators(initElevators());
    setQueue([]);
    setPeople({});
  }, []);

  // Auto-dispatch: Priority → Direction-Aware → Idle → Nearest
  useEffect(() => {
    const pendingIdx = queue.findIndex(r => r.assignedTo === null);
    if (pendingIdx === -1) return;

    const req = queue[pendingIdx];

    let chosenElv: Elevator | null = null;
    let strategy: DispatchStrategy | null = null;

    // Strategy 1: Direction-Aware — same direction, hasn't passed the floor
    const eligible = elevators.filter(e => isDirectionEligible(e, req));
    if (eligible.length > 0) {
      chosenElv = eligible.reduce((best, e) =>
        Math.abs(e.floor - req.floor) < Math.abs(best.floor - req.floor) ? e : best
      );
      strategy = "direction-aware";
    }

    // Strategy 2: Idle — nearest idle elevator
    if (!chosenElv) {
      const idleElvs = elevators.filter(e => e.direction === "IDLE");
      if (idleElvs.length > 0) {
        chosenElv = idleElvs.reduce((best, e) =>
          Math.abs(e.floor - req.floor) < Math.abs(best.floor - req.floor) ? e : best
        );
        strategy = "idle";
      }
    }

    // Strategy 3: Nearest — closest elevator regardless of state
    if (!chosenElv) {
      chosenElv = elevators.reduce((best, e) =>
        Math.abs(e.floor - req.floor) < Math.abs(best.floor - req.floor) ? e : best
      );
      strategy = "nearest";
    }

    if (!chosenElv || !strategy) return;

    const dist = Math.abs(chosenElv.floor - req.floor);
    const travelMs = dist === 0 ? 400 : dist * 1000;
    const dispatchDir: Direction = req.direction !== "IDLE"
      ? req.direction
      : (chosenElv.floor <= req.floor ? "UP" : "DOWN");

    const elvId = chosenElv.id;
    const targetFloor = req.floor;
    const chosenStrategy = strategy;

    setElevators(prev => prev.map(e =>
      e.id === elvId ? { ...e, direction: dispatchDir, target: targetFloor, transitionMs: travelMs } : e
    ));
    setQueue(prev => prev.map((r, i) =>
      i === pendingIdx ? { ...r, assignedTo: elvId, strategy: chosenStrategy } : r
    ));

    setTimeout(() => {
      setElevators(prev => prev.map(e =>
        e.id === elvId ? { ...e, floor: targetFloor, direction: "IDLE", target: null, transitionMs: 0 } : e
      ));
      setPeople(prev => {
        const next = { ...prev };
        if (next[targetFloor]) next[targetFloor] = { served: true, direction: req.direction };
        return next;
      });
      setQueue(prev => prev.filter(r => !(r.floor === targetFloor && r.assignedTo === elvId)));
    }, travelMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, elevators]);

  const addRequest = useCallback((f: number, dir: Direction) => {
    setPeople(prev => ({ ...prev, [f]: { served: false, direction: dir } }));
    setQueue(prev => [...prev, { floor: f, direction: dir, assignedTo: null, strategy: null }]);
  }, []);

  const totalH = FLOORS.length * FLOOR_H;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem 0" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          Use <strong style={{ color: "#666" }}>↑</strong> / <strong style={{ color: "#666" }}>↓</strong> to call an elevator.
        </div>
        <button
          onClick={reset}
          style={{ flexShrink: 0, marginLeft: 16, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ddd", background: "transparent", color: "#999" }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Strategy legend */}
      {(() => {
        const activeStrategy = queue.find(r => r.assignedTo !== null)?.strategy ?? null;
        return (
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14,
            padding: "8px 12px", borderRadius: 8, border: "0.5px solid #e8e8e8", background: "#fafafa",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "#999", fontWeight: 600, marginRight: 4 }}>Priority order:</span>
            {(["direction-aware", "idle", "nearest"] as DispatchStrategy[]).map((s, i) => {
              const m = STRATEGY_META[s];
              const isActive = activeStrategy === s;
              return (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {i > 0 && <span style={{ fontSize: 11, color: "#ccc" }}>→</span>}
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                    background: isActive ? m.border : m.bg,
                    color: isActive ? "#fff" : m.color,
                    border: `0.5px solid ${m.border}`,
                    transition: "background 0.3s, color 0.3s",
                  }}>
                    {m.step}. {m.label}
                  </span>
                </span>
              );
            })}
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>

        {/* Left: Building simulator */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          {FLOORS.map((f) => {
            const person = people[f];
            return (
              <div key={f} style={{ display: "flex", alignItems: "center", height: FLOOR_H, borderTop: "0.5px solid #e0e0e0" }}>
                <div style={{ width: 32, fontSize: 12, color: "#999", textAlign: "right", paddingRight: 8, flexShrink: 0 }}>F{f}</div>
                {elevators.map((elv) => (
                  <div key={elv.id} style={{ width: 72, height: FLOOR_H, background: "#f5f5f5", borderLeft: "0.5px solid #ddd", borderRight: "0.5px solid #ddd", flexShrink: 0 }} />
                ))}
                {/* UP / DOWN call buttons */}
                <div style={{ marginLeft: 10, display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
                  {f < FLOORS[0] && (
                    <button
                      onClick={() => addRequest(f, "UP")}
                      style={{
                        width: 24, height: 22, borderRadius: 5,
                        border: "0.5px solid #ccc",
                        fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "background .15s",
                        ...(queue.some(r => r.floor === f && r.direction === "UP") || elevators.some(e => e.target === f && e.direction === "UP")
                          ? { background: "#EEEDFE", borderColor: "#534AB7", color: "#3C3489" }
                          : { background: "transparent", color: "#888" }),
                      }}
                    >↑</button>
                  )}
                  {f > FLOORS[FLOORS.length - 1] && (
                    <button
                      onClick={() => addRequest(f, "DOWN")}
                      style={{
                        width: 24, height: 22, borderRadius: 5,
                        border: "0.5px solid #ccc",
                        fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "background .15s",
                        ...(queue.some(r => r.floor === f && r.direction === "DOWN") || elevators.some(e => e.target === f && e.direction === "DOWN")
                          ? { background: "#EEEDFE", borderColor: "#534AB7", color: "#3C3489" }
                          : { background: "transparent", color: "#888" }),
                      }}
                    >↓</button>
                  )}
                </div>
                {/* Person icon */}
                <div style={{ marginLeft: 6, flexShrink: 0 }}>
                  {person && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", fontSize: 13,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: person.served ? "#EAF3DE" : "#FAEEDA",
                      border: `1px solid ${person.served ? "#639922" : "#EF9F27"}`,
                    }}>
                      {PERSON_ICON}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ borderBottom: "0.5px solid #e0e0e0" }} />

          {/* Elevator cars overlay */}
          <div style={{ position: "absolute", top: 0, left: 32, height: totalH, display: "flex", pointerEvents: "none" }}>
            {elevators.map((elv) => {
              const animFloor = elv.target !== null ? elv.target : elv.floor;
              return (
                <div key={elv.id} style={{ position: "relative", width: 72, height: totalH }}>
                  <div style={{
                    position: "absolute",
                    left: 4,
                    width: 64,
                    height: 56,
                    borderRadius: 6,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: elv.color.bg,
                    border: `1.5px solid ${elv.color.border}`,
                    transition: `top ${elv.transitionMs > 0 ? elv.transitionMs : 400}ms cubic-bezier(.4,0,.2,1), background 0.3s, border-color 0.3s`,
                    top: floorTop(animFloor),
                    zIndex: 10,
                  }}>
                    <div style={{ fontSize: 13, color: elv.color.text, fontWeight: 700, lineHeight: 1 }}>
                      {DIR_ARROW[elv.direction]}
                    </div>
                    <div style={{ fontSize: 12, color: elv.color.text, fontWeight: 600, marginTop: 1 }}>{elv.label}</div>
                    <div style={{ fontSize: 10, color: elv.color.text, opacity: 0.75 }}>F{elv.floor}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Details panel */}
        <div style={{ flex: 1, minWidth: 0, height: totalH + 1, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>

          {/* Elevators */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>
              Elevators
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {elevators.map((elv) => {
                const isMoving = elv.direction !== "IDLE" && elv.target !== null;
                return (
                  <div key={elv.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    border: `0.5px solid ${elv.color.border}`,
                    background: elv.color.bg,
                    transition: "background 0.3s, border-color 0.3s",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "#fff", border: `1.5px solid ${elv.color.border}`,
                      fontSize: 13, fontWeight: 700, color: elv.color.text,
                    }}>
                      {DIR_ARROW[elv.direction]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: elv.color.text }}>
                        {elv.label} — {isMoving ? <>F{elv.floor} → F{elv.target}</> : <>F{elv.floor}</>}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 1, color: elv.color.text, opacity: 0.7 }}>
                        {isMoving
                          ? `Moving ${elv.direction.toLowerCase()} to floor ${elv.target}`
                          : "Idle — available for dispatch"
                        }
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                      background: isMoving ? elv.color.border : "#eee",
                      color: isMoving ? "#fff" : "#aaa",
                    }}>
                      {isMoving ? `${elv.direction === "UP" ? "↑" : "↓"} Moving` : "Idle"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Queue */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>
              Pending Requests
            </div>
            {queue.length === 0 ? (
              <div style={{ fontSize: 12, color: "#bbb", padding: "8px 12px", borderRadius: 8, border: "0.5px dashed #e0e0e0", textAlign: "center" }}>
                No pending requests
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                {queue.map((req, i) => {
                  const assigned = req.assignedTo != null;
                  const elv = assigned ? elevators.find(e => e.id === req.assignedTo) : null;
                  const sm = req.strategy ? STRATEGY_META[req.strategy] : null;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 12px", borderRadius: 8,
                      border: `0.5px solid ${sm ? sm.border : "#e0e0e0"}`,
                      background: sm ? sm.bg : "#fff",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", flexShrink: 0, width: 16, textAlign: "center" }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                          Floor {req.floor} {req.direction === "UP" ? "↑" : "↓"}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 1, color: sm ? sm.color : "#aaa", fontWeight: sm ? 500 : 400 }}>
                          {assigned && elv && req.strategy
                            ? `Elevator ${elv.label} dispatched`
                            : "Evaluating strategies…"
                          }
                        </div>
                      </div>
                      {assigned && elv && req.strategy
                        ? <StrategyBadge strategy={req.strategy} />
                        : <WaitingBadge />
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
