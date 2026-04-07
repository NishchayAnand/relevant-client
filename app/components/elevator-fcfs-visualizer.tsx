"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";

const FLOORS = [6, 5, 4, 3, 2, 1];
const FLOOR_H = 52;
const ELV_COLORS = [
  { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489", label: "A" },
  { bg: "#E1F5EE", border: "#0F6E56", text: "#085041", label: "B" },
  { bg: "#FAEEDA", border: "#854F0B", text: "#633806", label: "C" },
  { bg: "#FAECE7", border: "#993C1D", text: "#712B13", label: "D" },
];
const ICONS = ["★", "◆", "▲", "●", "■", "♥"];

type ElevatorColor = (typeof ELV_COLORS)[number];
type BadgeType = "waiting" | "serving" | "done";

type Elevator = {
  id: number;
  floor: number;
  busy: boolean;
  target: number | null;
  label: string;
  color: ElevatorColor;
};

type QueueRequest = {
  floor: number;
  assignedTo: number | null;
};

type Person = {
  icon: string;
  served: boolean;
};

type PeopleByFloor = Partial<Record<number, Person[]>>;

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

export default function FCFSElevator() {
  const [numElvs, setNumElvs] = useState(3);
  const [elevators, setElevators] = useState<Elevator[]>(() => initElevators(3));
  const [queue, setQueue] = useState<QueueRequest[]>([]);
  const [people, setPeople] = useState<PeopleByFloor>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<ReactNode>(<>Press <b>Add request</b> or click a floor button to begin.</>);
  const [moving, setMoving] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((msg: LogEntry) => {
    setLogs(prev => [...prev, msg]);
  }, []);

  const reset = useCallback((count = numElvs) => {
    setElevators(initElevators(count));
    setQueue([]);
    setPeople({});
    setLogs([]);
    setMoving(false);
    setStatus(<>Reset. Press <b>Add request</b> or click a floor button to begin.</>);
  }, [numElvs]);

  const handleElvCountChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value, 10);
    setNumElvs(n);
    reset(n);
  };

  const addFloor = useCallback((f: number) => {
    if (moving) return;
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    setPeople(prev => ({
      ...prev,
      [f]: [...(prev[f] || []), { icon, served: false }],
    }));
    setQueue(prev => {
      const next = [...prev, { floor: f, assignedTo: null }];
      addLog({ text: `Request added: Floor ${f} — position ${next.length} in queue`, floor: f });
      setStatus(<>Floor <b>{f}</b> added. Queue: <b>{next.length}</b> request(s).</>);
      return next;
    });
  }, [moving, addLog]);

  const addRandom = useCallback(() => {
    const f = FLOORS[Math.floor(Math.random() * FLOORS.length)];
    addFloor(f);
  }, [addFloor]);

  const step = useCallback(() => {
    if (queue.length === 0 || moving) return;

    const idleElvs = elevators.filter(e => !e.busy);
    const toDispatch = Math.min(idleElvs.length, queue.length);
    if (toDispatch === 0) return;

    const newQueue = [...queue];
    const newElevators = [...elevators];

    for (let d = 0; d < toDispatch; d++) {
      const req = newQueue[d];
      const elv = idleElvs[d];
      req.assignedTo = elv.id;
      const elvIdx = newElevators.findIndex(e => e.id === elv.id);
      newElevators[elvIdx] = { ...newElevators[elvIdx], busy: true, target: req.floor };
      addLog({ text: `Elevator ${elv.label} dispatched: F${elv.floor} → F${req.floor}`, elvId: elv.id });
    }

    setElevators(newElevators);
    setQueue(newQueue);
    setMoving(true);

    setTimeout(() => {
      setElevators(prev => {
        const updated = [...prev];
        for (let d = 0; d < toDispatch; d++) {
          const req = newQueue[d];
          const idx = updated.findIndex(e => e.id === req.assignedTo);
          updated[idx] = { ...updated[idx], floor: req.floor, busy: false, target: null };
          addLog({ text: `Elevator ${updated[idx].label} arrived at F${req.floor} — passengers picked up`, elvId: req.assignedTo });
        }
        return updated;
      });
      setPeople(prev => {
        const next = { ...prev };
        for (let d = 0; d < toDispatch; d++) {
          const f = newQueue[d].floor;
          if (next[f]) next[f] = next[f].map(p => ({ ...p, served: true }));
        }
        return next;
      });
      setQueue(prev => {
        const remaining = prev.slice(toDispatch);
        setStatus(remaining.length > 0
          ? <><b>{remaining.length}</b> request(s) remaining.</>
          : <>All dispatched elevators arrived. Queue is empty.</>
        );
        return remaining;
      });
      setMoving(false);
    }, 700);
  }, [queue, elevators, moving, addLog]);

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
          onClick={addRandom}
          style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "none", background: "#534AB7", color: "#EEEDFE", fontWeight: 500 }}
        >
          + Add request
        </button>
        <button
          onClick={step}
          disabled={queue.length === 0 || moving}
          style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: queue.length === 0 || moving ? "default" : "pointer", border: "0.5px solid #ccc", background: "transparent", opacity: queue.length === 0 || moving ? 0.4 : 1 }}
        >
          Serve next ▶
        </button>
        <button
          onClick={() => reset()}
          style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: "pointer", border: "0.5px solid #ccc", background: "transparent" }}
        >
          Reset
        </button>
        <label style={{ fontSize: 13, color: "#666" }}>
          Elevators:&nbsp;
          <select
            value={numElvs}
            onChange={handleElvCountChange}
            style={{ fontSize: 13, padding: "3px 6px", borderRadius: 8, border: "0.5px solid #ccc", marginLeft: 4 }}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
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
              <div style={{ display: "flex", gap: 3, alignItems: "center", marginLeft: 8 }}>
                {(people[f] || []).map((p: Person, i: number) => (
                  <div key={i} style={{
                    width: 14, height: 14, borderRadius: "50%", fontSize: 9,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: p.served ? "#EAF3DE" : "#FAEEDA", flexShrink: 0,
                  }}>
                    {p.icon}
                  </div>
                ))}
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
                  transition: "top 0.65s cubic-bezier(.4,0,.2,1)",
                  top: floorTop(elv.floor),
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
              Request queue (FCFS)
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
              New requests go to the <b style={{ color: "#666" }}>back</b>.<br />
              Elevator serves from the <b style={{ color: "#666" }}>front</b>.
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