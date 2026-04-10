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

type ElevatorColor = (typeof ELV_COLORS)[number];
type BadgeType = "waiting" | "serving" | "done" | "ineligible";

type Elevator = {
  id: number;
  floor: number;
  busy: boolean;
  target: number | null;
  label: string;
  color: ElevatorColor;
  transitionMs: number;
};

type QueueRequest = {
  floor: number;
  assignedTo: number | null;
};

type Person = {
  served: boolean;
};

type PeopleByFloor = Partial<Record<number, Person>>;

type BadgeProps = {
  type: BadgeType;
  children: ReactNode;
};

function floorTop(f: number) {
  return FLOORS.indexOf(f) * FLOOR_H + 5;
}

function initElevators(count: number): Elevator[] {
  const startFloors = [4, 5, FLOORS[0], 3];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    floor: startFloors[i] || 1,
    busy: false,
    target: null,
    label: ELV_COLORS[i].label,
    color: ELV_COLORS[i],
    transitionMs: 0,
  }));
}

function Badge({ type, children }: BadgeProps) {
  const styles: Record<BadgeType, CSSProperties> = {
    waiting: { background: "#FAEEDA", color: "#854F0B" },
    serving: { background: "#EEEDFE", color: "#3C3489" },
    done: { background: "#EAF3DE", color: "#3B6D11" },
    ineligible: { background: "#f0f0f0", color: "#aaa" },
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

export default function IdleDispatchVisualizer() {
  const [elevators, setElevators] = useState<Elevator[]>(() => initElevators(3));
  const [queue, setQueue] = useState<QueueRequest[]>([]);
  const [people, setPeople] = useState<PeopleByFloor>({});

  const reset = useCallback(() => {
    setElevators(initElevators(3));
    setQueue([]);
    setPeople({});
  }, []);

  const hasPendingRequest = queue.some(r => r.assignedTo === null);

  // Auto-dispatch: only idle elevators are eligible — if all are busy, request waits
  useEffect(() => {
    const pendingIdx = queue.findIndex(r => r.assignedTo === null);
    if (pendingIdx === -1) return;

    // IdleElevatorDispatch: ONLY idle elevators are eligible
    const idleElvs = elevators.filter(e => !e.busy);
    if (idleElvs.length === 0) return; // All busy — request must wait

    const req = queue[pendingIdx];
    let nearestElv = idleElvs[0];
    let minDist = Math.abs(nearestElv.floor - req.floor);
    for (const elv of idleElvs) {
      const dist = Math.abs(elv.floor - req.floor);
      if (dist < minDist) { nearestElv = elv; minDist = dist; }
    }

    const travelMs = minDist === 0 ? 400 : minDist * 1000;

    setElevators(prev => prev.map(e =>
      e.id === nearestElv.id ? { ...e, busy: true, target: req.floor, transitionMs: travelMs } : e
    ));
    setQueue(prev => prev.map((r, i) => i === pendingIdx ? { ...r, assignedTo: nearestElv.id } : r));

    const elvId = nearestElv.id;
    const targetFloor = req.floor;
    setTimeout(() => {
      setElevators(prev => prev.map(e =>
        e.id === elvId ? { ...e, floor: targetFloor, busy: false, target: null, transitionMs: 0 } : e
      ));
      setPeople(prev => {
        const next = { ...prev };
        if (next[targetFloor]) next[targetFloor] = { served: true };
        return next;
      });
      setQueue(prev => {
        const remaining = prev.filter(r => !(r.floor === targetFloor && r.assignedTo === elvId));
        return remaining;
      });
    }, travelMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, elevators]);

  const addFloor = useCallback((f: number) => {
    setPeople(prev => ({ ...prev, [f]: { served: false } }));
    setQueue(prev => [...prev, { floor: f, assignedTo: null }]);
  }, []);

  const getFloorBtnClass = (f: number): CSSProperties => {
    const inQ = queue.filter(x => x.floor === f).length;
    const isServing = elevators.some(e => e.busy && e.target === f);
    if (isServing) return { background: "#EEEDFE", borderColor: "#534AB7", color: "#3C3489" };
    if (inQ > 0) return { background: "#FAEEDA", borderColor: "#EF9F27", color: "#854F0B" };
    return {};
  };

  const totalH = FLOORS.length * FLOOR_H;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem 0" }}>
      {/* Hint + Reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          Press a numbered floor button to call an elevator.
        </div>
        <button
          onClick={() => reset()}
          style={{ flexShrink: 0, marginLeft: 16, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ddd", background: "transparent", color: "#999" }}
        >
          ↺ Reset
        </button>
      </div>

      {/* "All elevators busy" notice */}
      {hasPendingRequest && elevators.every(e => e.busy) && (
        <div style={{
          marginBottom: 12, padding: "8px 14px", borderRadius: 8,
          background: "#FEF3C7", border: "0.5px solid #F59E0B",
          fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>⏳</span>
          <span>All elevators are busy — request is waiting for one to become idle.</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>

        {/* Left: Building simulator */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          {FLOORS.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", height: FLOOR_H, borderTop: "0.5px solid #e0e0e0" }}>
              <div style={{ width: 32, fontSize: 12, color: "#999", textAlign: "right", paddingRight: 8, flexShrink: 0 }}>F{f}</div>
              {elevators.map((elv) => (
                <div key={elv.id} style={{ width: 72, height: FLOOR_H, background: "#f5f5f5", borderLeft: "0.5px solid #ddd", borderRight: "0.5px solid #ddd", flexShrink: 0 }} />
              ))}
              <button
                onClick={() => addFloor(f)}
                style={{
                  marginLeft: 10, width: 26, height: 26, borderRadius: "50%",
                  border: "0.5px solid #ccc", background: "transparent",
                  fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, transition: "background .15s",
                  ...getFloorBtnClass(f),
                }}
              >
                {f}
              </button>
              <div style={{ marginLeft: 8, flexShrink: 0 }}>
                {people[f] && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: people[f].served ? "#EAF3DE" : "#FAEEDA",
                    border: `1px solid ${people[f].served ? "#639922" : "#EF9F27"}`,
                  }}>
                    {PERSON_ICON}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div style={{ borderBottom: "0.5px solid #e0e0e0" }} />

          {/* Elevator cars overlay */}
          <div style={{ position: "absolute", top: 0, left: 32, height: totalH, display: "flex", pointerEvents: "none" }}>
            {elevators.map((elv) => {
              const ineligible = hasPendingRequest && elv.busy;
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
                    top: floorTop(elv.busy && elv.target !== null ? elv.target : elv.floor),
                    zIndex: 10,
                  }}>
                    <div style={{ fontSize: 12, color: ineligible ? "#aaa" : elv.color.text, fontWeight: 600 }}>{elv.label}</div>
                    <div style={{ fontSize: 11, color: ineligible ? "#aaa" : elv.color.text }}>F{elv.floor}</div>
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
                const isMoving = elv.busy && elv.target !== null;
                const ineligible = hasPendingRequest && isMoving;
                return (
                  <div key={elv.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    border: `0.5px solid ${ineligible ? "#e0e0e0" : elv.color.border}`,
                    background: ineligible ? "#fafafa" : elv.color.bg,
                    opacity: ineligible ? 0.65 : 1,
                    transition: "opacity 0.3s, background 0.3s, border-color 0.3s",
                  }}>
                    {/* Label */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "#fff",
                      border: `1.5px solid ${ineligible ? "#ddd" : elv.color.border}`,
                      fontSize: 12, fontWeight: 700,
                      color: ineligible ? "#bbb" : elv.color.text,
                    }}>
                      {elv.label}
                    </div>
                    {/* Floor info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: ineligible ? "#aaa" : elv.color.text }}>
                        {isMoving
                          ? <>F{elv.floor} → F{elv.target}</>
                          : <>F{elv.floor}</>
                        }
                      </div>
                      <div style={{ fontSize: 11, color: ineligible ? "#bbb" : elv.color.text, opacity: ineligible ? 1 : 0.7, marginTop: 1 }}>
                        {isMoving
                          ? (ineligible ? "Busy — not eligible for dispatch" : `En route to floor ${elv.target}`)
                          : "Idle — waiting for request"
                        }
                      </div>
                    </div>
                    {/* Status pill */}
                    {ineligible ? (
                      <div style={{
                        fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                        background: "#e8e8e8", color: "#aaa", flexShrink: 0,
                      }}>
                        Ineligible
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                        background: isMoving ? elv.color.border : "#eee",
                        color: isMoving ? "#fff" : "#aaa",
                        flexShrink: 0,
                      }}>
                        {isMoving ? "Moving" : "Idle"}
                      </div>
                    )}
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
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>Floor {req.floor}</div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                          {assigned && elv
                            ? `Assigned to Elevator ${elv.label}`
                            : "Waiting for an idle elevator"
                          }
                        </div>
                      </div>
                      {assigned && elv
                        ? <Badge type="serving">Elv {elv.label}</Badge>
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
