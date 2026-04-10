"use client"

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";

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
type BadgeType = "waiting" | "serving" | "fallback";

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
  usedFallback: boolean;
};

type Person = {
  served: boolean;
  direction: Direction;
};

type PeopleByFloor = Partial<Record<number, Person>>;

type BadgeProps = {
  type: BadgeType;
  children: ReactNode;
};

function floorTop(f: number) {
  return FLOORS.indexOf(f) * FLOOR_H + 5;
}

// An elevator is eligible if it's moving in the same direction and hasn't yet passed the floor
function isEligible(elv: Elevator, req: QueueRequest): boolean {
  if (elv.direction !== req.direction) return false;
  if (req.direction === "UP" && elv.floor > req.floor) return false;
  if (req.direction === "DOWN" && elv.floor < req.floor) return false;
  return true;
}

function initElevators(): Elevator[] {
  // A: going UP from F2, B: going DOWN from F5, C: idle at F3
  return [
    { id: 0, floor: 2, direction: "UP", target: 6, label: "A", color: ELV_COLORS[0], transitionMs: 0 },
    { id: 1, floor: 5, direction: "DOWN", target: 1, label: "B", color: ELV_COLORS[1], transitionMs: 0 },
    { id: 2, floor: 3, direction: "IDLE", target: null, label: "C", color: ELV_COLORS[2], transitionMs: 0 },
  ];
}

const DIR_ARROW: Record<Direction, string> = { UP: "↑", DOWN: "↓", IDLE: "·" };

function Badge({ type, children }: BadgeProps) {
  const styles: Record<BadgeType, CSSProperties> = {
    waiting: { background: "#FAEEDA", color: "#854F0B" },
    serving: { background: "#EEEDFE", color: "#3C3489" },
    fallback: { background: "#FEF3C7", color: "#92400E" },
  };
  return (
    <span style={{
      display: "inline-block", fontSize: 10, padding: "1px 7px",
      borderRadius: 99, fontWeight: 500, ...styles[type]
    }}>
      {children}
    </span>
  );
}

export default function DirectionAwareVisualizer() {
  const [elevators, setElevators] = useState<Elevator[]>(() => initElevators());
  const [queue, setQueue] = useState<QueueRequest[]>([]);
  const [people, setPeople] = useState<PeopleByFloor>({});

  const reset = useCallback(() => {
    setElevators(initElevators());
    setQueue([]);
    setPeople({});
  }, []);

  const hasPendingRequest = queue.some(r => r.assignedTo === null);

  // Kick off the pre-set elevator movements on mount
  useEffect(() => {
    // Elevator A: F2 → F6 (UP), 4 floors
    const travelA = 4 * 1000;
    setElevators(prev => prev.map(e =>
      e.id === 0 ? { ...e, transitionMs: travelA } : e
    ));
    setTimeout(() => {
      setElevators(prev => prev.map(e =>
        e.id === 0 ? { ...e, floor: 6, direction: "IDLE", target: null, transitionMs: 0 } : e
      ));
    }, travelA);

    // Elevator B: F5 → F1 (DOWN), 4 floors
    const travelB = 4 * 1000;
    setElevators(prev => prev.map(e =>
      e.id === 1 ? { ...e, transitionMs: travelB } : e
    ));
    setTimeout(() => {
      setElevators(prev => prev.map(e =>
        e.id === 1 ? { ...e, floor: 1, direction: "IDLE", target: null, transitionMs: 0 } : e
      ));
    }, travelB);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dispatch
  useEffect(() => {
    const pendingIdx = queue.findIndex(r => r.assignedTo === null);
    if (pendingIdx === -1) return;

    const req = queue[pendingIdx];

    // Step 1: find eligible elevators (same direction, haven't passed the floor)
    const eligible = elevators.filter(e => isEligible(e, req));

    let chosenElv: Elevator | null = null;
    let usedFallback = false;

    if (eligible.length > 0) {
      // Pick closest eligible
      chosenElv = eligible.reduce((best, e) =>
        Math.abs(e.floor - req.floor) < Math.abs(best.floor - req.floor) ? e : best
      );
    } else {
      // Fallback: pick nearest idle elevator
      const idleElvs = elevators.filter(e => e.direction === "IDLE");
      if (idleElvs.length === 0) return; // no idle fallback either — wait
      chosenElv = idleElvs.reduce((best, e) =>
        Math.abs(e.floor - req.floor) < Math.abs(best.floor - req.floor) ? e : best
      );
      usedFallback = true;
    }

    if (!chosenElv) return;

    const dist = Math.abs(chosenElv.floor - req.floor);
    const travelMs = dist === 0 ? 400 : dist * 1000;
    const dispatchDir: Direction = req.direction === "IDLE"
      ? (chosenElv.floor <= req.floor ? "UP" : "DOWN")
      : req.direction;

    const elvId = chosenElv.id;
    const targetFloor = req.floor;

    setElevators(prev => prev.map(e =>
      e.id === elvId ? { ...e, direction: dispatchDir, target: targetFloor, transitionMs: travelMs } : e
    ));
    setQueue(prev => prev.map((r, i) =>
      i === pendingIdx ? { ...r, assignedTo: elvId, usedFallback } : r
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
    setQueue(prev => [...prev, { floor: f, direction: dir, assignedTo: null, usedFallback: false }]);
  }, []);

  // Check eligibility of each elevator for any pending unassigned request (for dimming)
  const pendingReqs = queue.filter(r => r.assignedTo === null);
  const ineligibleIds = new Set<number>();
  if (pendingReqs.length > 0) {
    for (const elv of elevators) {
      const anyEligible = pendingReqs.some(r => isEligible(elv, r));
      if (!anyEligible && elv.direction !== "IDLE") {
        ineligibleIds.add(elv.id);
      }
    }
  }

  const totalH = FLOORS.length * FLOOR_H;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem 0" }}>
      {/* Hint + Reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          Use <strong style={{ color: "#666" }}>↑</strong> / <strong style={{ color: "#666" }}>↓</strong> to call an elevator in a direction. Only elevators going the <strong style={{ color: "#666" }}>same way</strong> that haven't passed the floor are eligible. Falls back to nearest idle elevator if none qualify.
        </div>
        <button
          onClick={reset}
          style={{ flexShrink: 0, marginLeft: 16, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ddd", background: "transparent", color: "#999" }}
        >
          ↺ Reset
        </button>
      </div>

      {/* No eligible + no idle warning */}
      {hasPendingRequest && elevators.every(e => e.direction !== "IDLE") && pendingReqs.length > 0 && (
        <div style={{
          marginBottom: 12, padding: "8px 14px", borderRadius: 8,
          background: "#FEF3C7", border: "0.5px solid #F59E0B",
          fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>⏳</span>
          <span>No eligible or idle elevator available — request is waiting.</span>
        </div>
      )}

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
                        border: "0.5px solid #ccc", background: "transparent",
                        fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "background .15s",
                        ...(queue.some(r => r.floor === f && r.direction === "UP") || elevators.some(e => e.target === f)
                          ? { background: "#EEEDFE", borderColor: "#534AB7", color: "#3C3489" }
                          : { color: "#888" }),
                      }}
                    >↑</button>
                  )}
                  {f > FLOORS[FLOORS.length - 1] && (
                    <button
                      onClick={() => addRequest(f, "DOWN")}
                      style={{
                        width: 24, height: 22, borderRadius: 5,
                        border: "0.5px solid #ccc", background: "transparent",
                        fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "background .15s",
                        ...(queue.some(r => r.floor === f && r.direction === "DOWN") || elevators.some(e => e.target === f)
                          ? { background: "#EEEDFE", borderColor: "#534AB7", color: "#3C3489" }
                          : { color: "#888" }),
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
              const ineligible = ineligibleIds.has(elv.id);
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
                    background: ineligible ? "#f0f0f0" : elv.color.bg,
                    border: `1.5px solid ${ineligible ? "#ddd" : elv.color.border}`,
                    opacity: ineligible ? 0.55 : 1,
                    transition: `top ${elv.transitionMs > 0 ? elv.transitionMs : 400}ms cubic-bezier(.4,0,.2,1), opacity 0.3s, background 0.3s, border-color 0.3s`,
                    top: floorTop(animFloor),
                    zIndex: 10,
                  }}>
                    <div style={{ fontSize: 13, color: ineligible ? "#bbb" : elv.color.text, fontWeight: 700, lineHeight: 1 }}>
                      {DIR_ARROW[elv.direction]}
                    </div>
                    <div style={{ fontSize: 12, color: ineligible ? "#bbb" : elv.color.text, fontWeight: 600, marginTop: 1 }}>{elv.label}</div>
                    <div style={{ fontSize: 10, color: ineligible ? "#bbb" : elv.color.text, opacity: 0.75 }}>F{elv.floor}</div>
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
                const ineligible = ineligibleIds.has(elv.id);
                return (
                  <div key={elv.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    border: `0.5px solid ${ineligible ? "#e0e0e0" : elv.color.border}`,
                    background: ineligible ? "#fafafa" : elv.color.bg,
                    opacity: ineligible ? 0.65 : 1,
                    transition: "opacity 0.3s, background 0.3s, border-color 0.3s",
                  }}>
                    {/* Label + direction */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "#fff",
                      border: `1.5px solid ${ineligible ? "#ddd" : elv.color.border}`,
                      fontSize: 13, fontWeight: 700,
                      color: ineligible ? "#bbb" : elv.color.text,
                    }}>
                      {DIR_ARROW[elv.direction]}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: ineligible ? "#aaa" : elv.color.text }}>
                        {elv.label} — {isMoving ? <>F{elv.floor} → F{elv.target}</> : <>F{elv.floor}</>}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 1, color: ineligible ? "#ccc" : elv.color.text, opacity: ineligible ? 1 : 0.7 }}>
                        {ineligible
                          ? "Wrong direction / already passed — ineligible"
                          : isMoving
                            ? `Moving ${elv.direction.toLowerCase()} to floor ${elv.target}`
                            : "Idle — available as fallback"
                        }
                      </div>
                    </div>
                    {/* Pill */}
                    <div style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                      background: ineligible ? "#e8e8e8" : isMoving ? elv.color.border : "#eee",
                      color: ineligible ? "#aaa" : isMoving ? "#fff" : "#aaa",
                    }}>
                      {ineligible ? "Ineligible" : isMoving ? `${elv.direction === "UP" ? "↑" : "↓"} Moving` : "Idle"}
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
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 12px", borderRadius: 8,
                      border: `0.5px solid ${assigned && elv ? elv.color.border : "#e0e0e0"}`,
                      background: assigned && elv ? elv.color.bg : "#fff",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", flexShrink: 0, width: 16, textAlign: "center" }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                          Floor {req.floor} {req.direction === "UP" ? "↑" : "↓"}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                          {assigned && elv
                            ? req.usedFallback
                              ? `Fallback → Elevator ${elv.label} (idle)`
                              : `Direction match → Elevator ${elv.label}`
                            : "Waiting for a matching elevator"
                          }
                        </div>
                      </div>
                      {assigned && elv
                        ? <Badge type={req.usedFallback ? "fallback" : "serving"}>
                            {req.usedFallback ? "Fallback" : `Elv ${elv.label}`}
                          </Badge>
                        : <Badge type="waiting">Waiting</Badge>
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
