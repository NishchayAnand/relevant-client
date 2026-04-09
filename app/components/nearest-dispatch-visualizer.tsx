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
type BadgeType = "waiting" | "serving" | "done";

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
  const startFloors = [1, Math.ceil(FLOORS.length / 2) + 1, FLOORS[0], 3];
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

export default function NearestDispatchVisualizer() {
  const [elevators, setElevators] = useState<Elevator[]>(() => initElevators(3));
  const [queue, setQueue] = useState<QueueRequest[]>([]);
  const [people, setPeople] = useState<PeopleByFloor>({});

  const reset = useCallback(() => {
    setElevators(initElevators(3));
    setQueue([]);
    setPeople({});
  }, []);

  // Auto-dispatch: whenever there is an unassigned request and an idle elevator, dispatch immediately
  useEffect(() => {
    const pendingIdx = queue.findIndex(r => r.assignedTo === null);
    if (pendingIdx === -1) return;
    const idleElvs = elevators.filter(e => !e.busy);
    if (idleElvs.length === 0) return;

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
    const elvLabel = nearestElv.label;
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
    setQueue(prev => {
      const next = [...prev, { floor: f, assignedTo: null }];
      return next;
    });
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
      {/* How to use + Reset */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
          Press a numbered floor button to call an elevator. The nearest idle elevator is dispatched automatically.
        </div>
        <button
          onClick={() => reset()}
          style={{ flexShrink: 0, marginLeft: 16, fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ddd", background: "transparent", color: "#999" }}
        >
          ↺ Reset
        </button>
      </div>
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
            {elevators.map((elv) => (
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
                  transition: `top ${elv.transitionMs > 0 ? elv.transitionMs : 400}ms cubic-bezier(.4,0,.2,1)`,
                  top: floorTop(elv.busy && elv.target !== null ? elv.target : elv.floor),
                  zIndex: 10,
                }}>
                  <div style={{ fontSize: 12, color: elv.color.text, fontWeight: 600 }}>{elv.label}</div>
                  <div style={{ fontSize: 11, color: elv.color.text }}>F{elv.floor}</div>
                </div>
              </div>
            ))}
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
                return (
                  <div key={elv.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    border: `0.5px solid ${elv.color.border}`,
                    background: elv.color.bg,
                  }}>
                    {/* Color dot + label */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "#fff", border: `1.5px solid ${elv.color.border}`,
                      fontSize: 12, fontWeight: 700, color: elv.color.text,
                    }}>
                      {elv.label}
                    </div>
                    {/* Floor info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: elv.color.text }}>
                        {isMoving
                          ? <>F{elv.floor} → F{elv.target}</>
                          : <>F{elv.floor}</>
                        }
                      </div>
                      <div style={{ fontSize: 11, color: elv.color.text, opacity: 0.7, marginTop: 1 }}>
                        {isMoving ? `En route to floor ${elv.target}` : "Idle — waiting for request"}
                      </div>
                    </div>
                    {/* Status pill */}
                    <div style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                      background: isMoving ? elv.color.border : "#eee",
                      color: isMoving ? "#fff" : "#aaa",
                      flexShrink: 0,
                    }}>
                      {isMoving ? "Moving" : "Idle"}
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
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>Floor {req.floor}</div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                          {assigned && elv ? `Assigned to Elevator ${elv.label}` : "Waiting for an elevator"}
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