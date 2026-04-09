"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";

const FLOORS = [6, 5, 4, 3, 2, 1];
const FLOOR_H = 52;
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

type LogEntry = {
  text: string;
  elvId?: number | null;
  floor?: number;
};

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<ReactNode>(<>Click a floor button to make a request.</>);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((msg: LogEntry) => {
    setLogs(prev => [...prev, msg]);
  }, []);

  const reset = useCallback(() => {
    setElevators(initElevators(3));
    setQueue([]);
    setPeople({});
    setLogs([]);
    setStatus(<>Reset. Click a floor button to make a request.</>);
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
    addLog({ text: `Elevator ${nearestElv.label} dispatched: F${nearestElv.floor} → F${req.floor} (${minDist} floor${minDist !== 1 ? 's' : ''} away)`, elvId: nearestElv.id });
    setStatus(<>Elevator <b>{nearestElv.label}</b> heading to F<b>{req.floor}</b> &mdash; <b>{minDist}</b> floor{minDist !== 1 ? 's' : ''} away.</>);

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
        setStatus(remaining.length > 0
          ? <><b>{remaining.length}</b> request(s) remaining.</>
          : <>All requests served.</>);
        return remaining;
      });
      addLog({ text: `Elevator ${elvLabel} arrived at F${targetFloor} — passengers picked up`, elvId: elvId });
    }, travelMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, elevators]);

  const addFloor = useCallback((f: number) => {
    setPeople(prev => ({ ...prev, [f]: { served: false } }));
    setQueue(prev => {
      const next = [...prev, { floor: f, assignedTo: null }];
      addLog({ text: `Request added: Floor ${f}`, floor: f });
      return next;
    });
  }, [addLog]);

  const addRandom = useCallback(() => {
    const f = FLOORS[Math.floor(Math.random() * FLOORS.length)];
    addFloor(f);
  }, [addFloor]);

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
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <button
          onClick={() => reset()}
          style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ccc", background: "transparent" }}
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#888", marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { bg: "#FAEEDA", border: "#EF9F27", label: "Waiting" },
          { bg: "#EEEDFE", border: "#534AB7", label: "Being served" },
          { bg: "#EAF3DE", border: "#639922", label: "Served" },
        ].map(({ bg, border, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: bg, border: `1px solid ${border}`, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* Status */}
      <div style={{ fontSize: 13, color: "#888", marginBottom: 12, minHeight: 18 }}>{status}</div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Building */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          {FLOORS.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", height: FLOOR_H, borderTop: "0.5px solid #e0e0e0" }}>
              <div style={{ width: 32, fontSize: 12, color: "#999", textAlign: "right", paddingRight: 8, flexShrink: 0 }}>F{f}</div>
              {elevators.map((elv) => (
                <div key={elv.id} style={{ width: 58, height: FLOOR_H, background: "#f5f5f5", borderLeft: "0.5px solid #ddd", borderRight: "0.5px solid #ddd", flexShrink: 0 }} />
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
              <div key={elv.id} style={{ position: "relative", width: 58, height: totalH }}>
                <div style={{
                  position: "absolute",
                  left: 4,
                  width: 50,
                  height: 42,
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
                  <div style={{ fontSize: 11, color: elv.color.text, fontWeight: 500 }}>{elv.label}</div>
                  <div style={{ fontSize: 10, color: elv.color.text }}>F{elv.floor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Elevator status cards */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {elevators.map((elv) => (
              <div key={elv.id} style={{
                flex: 1, minWidth: 100, border: `0.5px solid ${elv.color.border}`,
                borderRadius: 8, padding: "10px 12px", background: "#fff",
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: elv.color.text, marginBottom: 4 }}>
                  Elevator {elv.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 500, color: elv.color.text }}>F{elv.floor}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  {elv.busy ? `Going to F${elv.target}` : "Idle"}
                </div>
              </div>
            ))}
          </div>

          {/* Queue */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 500, color: "#999", textTransform: "uppercase", letterSpacing: ".04em", margin: "0 0 8px" }}>
              Nearest Dispatch Queue
            </h3>
            {queue.length === 0 ? (
              <div style={{ fontSize: 13, color: "#aaa", padding: "6px 0" }}>No requests yet</div>
            ) : (
              queue.map((req, i) => {
                const isActive = req.assignedTo != null || (i === 0 && elevators.some(e => !e.busy));
                const statusEl = req.assignedTo != null
                  ? <Badge type="serving">Elv {ELV_COLORS[req.assignedTo].label}</Badge>
                  : i === 0 && elevators.some(e => !e.busy)
                    ? <Badge type="serving">Next</Badge>
                    : <Badge type="waiting">Waiting</Badge>;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, fontSize: 13,
                    padding: "6px 10px", borderRadius: 8, marginBottom: 4,
                    border: "0.5px solid #ddd",
                    background: isActive ? "#f5f5f5" : "#fff",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", fontSize: 11,
                      fontWeight: 500, display: "flex", alignItems: "center",
                      justifyContent: "center", background: "#eee", color: "#888", flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <span>Floor {req.floor}</span>
                    {statusEl}
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
              The <b style={{ color: "#666" }}>nearest</b> idle elevator is selected for each request.<br />
              Travel time is <b style={{ color: "#666" }}>~1 second per floor</b>.
            </div>
          </div>
        </div>
      </div>

      {/* Log */}
      <div ref={logRef} style={{
        marginTop: 16, borderTop: "0.5px solid #eee", paddingTop: 10,
        maxHeight: 100, overflowY: "auto",
      }}>
        {logs.map((entry, i) => {
          const elv = entry.elvId != null ? elevators.find(e => e.id === entry.elvId) : null;
          return (
            <div key={i} style={{ fontSize: 12, color: "#aaa", padding: "1px 0" }}>
              {elv
                ? <><span style={{ color: elv.color.border, fontWeight: 500 }}>Elevator {elv.label}</span>{" "}{entry.text.replace(`Elevator ${elv.label} `, "")}</>
                : entry.text
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}