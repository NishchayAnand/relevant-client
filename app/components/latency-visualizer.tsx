"use client"

import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = {
  packet: "#4A90D9",
  response: "#5BBD8A",
  processing: "#E8A44A",
};

function useColorScheme() {
  const [dark, setDark] = useState(
    () => (typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false : false)
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

function getThemeColors(dark: boolean) {
  return dark
    ? {
        bg: "#1a1a18",
        node: "#2e2e2b",
        text: "#c2c0b6",
        muted: "#6b6963",
        wire: "#3a3a36",
      }
    : {
        bg: "#ffffff",
        node: "#f1efe8",
        text: "#2c2c2a",
        muted: "#888780",
        wire: "#c8c6be",
      };
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

interface SceneCanvasProps {
  netDelay: number;
  srvDelay: number;
  progress: number | null;
}

function SceneCanvas({ netDelay, srvDelay, progress }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dark = useColorScheme();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = getThemeColors(dark);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = 40;
    const nodeR = 28;
    const clientX = pad + nodeR;
    const serverX = W - pad - nodeR;
    const midY = H / 2;

    // Wire
    ctx.save();
    ctx.strokeStyle = c.wire;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(clientX + nodeR, midY);
    ctx.lineTo(serverX - nodeR, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Client node
    ctx.save();
    ctx.fillStyle = c.node;
    ctx.beginPath();
    ctx.arc(clientX, midY, nodeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.wire;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = '500 12px "Anthropic Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Client", clientX, midY);
    ctx.restore();

    // Server node
    ctx.save();
    ctx.fillStyle = c.node;
    ctx.beginPath();
    ctx.arc(serverX, midY, nodeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.wire;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = '500 12px "Anthropic Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Server", serverX, midY);
    ctx.restore();

    const wireStart = clientX + nodeR + 6;
    const wireEnd = serverX - nodeR - 6;
    const wireLen = wireEnd - wireStart;

    // Labels
    ctx.save();
    ctx.font = '11px "Anthropic Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = c.muted;
    ctx.fillText("You", clientX, midY + nodeR + 16);
    ctx.fillText("api.server.com", serverX, midY + nodeR + 16);
    ctx.restore();

    if (progress === null) return;

    const total = netDelay + srvDelay + netDelay;
    const t1 = netDelay / total;
    const t2 = (netDelay + srvDelay) / total;

    // Phase 1: request packet going right
    if (progress <= t1) {
      const p = easeInOut(progress / t1);
      const px = wireStart + wireLen * p;
      ctx.save();
      ctx.fillStyle = COLORS.packet;
      ctx.beginPath();
      ctx.arc(px, midY - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.packet;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.max(wireStart, px - 40), midY - 12);
      ctx.lineTo(px, midY - 12);
      ctx.stroke();
      ctx.restore();
    }

    // Phase 2: server processing pulse
    if (progress > t1 && progress <= t2) {
      const p = (progress - t1) / (t2 - t1);
      const pulse = Math.sin(p * Math.PI * 6) * 0.35 + 0.65;
      ctx.save();
      ctx.fillStyle = c.node;
      ctx.beginPath();
      ctx.arc(serverX, midY, nodeR * (1 + pulse * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.processing;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = c.text;
      ctx.font = '500 12px "Anthropic Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Server", serverX, midY);
      ctx.restore();

      for (let i = 0; i < 3; i++) {
        const angle = p * Math.PI * 4 + (i * Math.PI * 2) / 3;
        const r = nodeR + 10;
        const ox = serverX + Math.cos(angle) * r;
        const oy = midY + Math.sin(angle) * r;
        ctx.save();
        ctx.fillStyle = COLORS.processing;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Phase 3: response packet going left
    if (progress > t2) {
      const p = easeInOut((progress - t2) / (1 - t2));
      const px = wireEnd - wireLen * p;
      ctx.save();
      ctx.fillStyle = COLORS.response;
      ctx.beginPath();
      ctx.arc(px, midY + 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.response;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.min(wireEnd, px + 40), midY + 12);
      ctx.lineTo(px, midY + 12);
      ctx.stroke();
      ctx.restore();
    }

    // Done: glow client
    if (progress >= 0.98) {
      ctx.save();
      ctx.strokeStyle = COLORS.response;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(clientX, midY, nodeR + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [progress, netDelay, srvDelay, dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement?.clientWidth || 400;
    canvas.width = w * dpr;
    canvas.height = 200 * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.parentElement?.clientWidth || 400;
      canvas.width = w * dpr;
      canvas.height = 200 * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      draw();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 200, display: "block" }}
    />
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
}

function StatCard({ label, value, unit, color }: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--color-background-secondary, #f1efe8)",
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--color-text-secondary, #888780)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: color || "var(--color-text-primary, #2c2c2a)",
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary, #888780)",
              marginLeft: 2,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

interface BreakdownRowProps {
  color: string;
  name: string;
  pct: number;
  ms: number;
}

function BreakdownRow({ color, name, pct, ms }: BreakdownRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderBottom: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))",
        fontSize: 13,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          color: "var(--color-text-secondary, #888780)",
        }}
      >
        {name}
      </span>
      <div
        style={{
          flex: 2,
          background: "var(--color-background-secondary, #f1efe8)",
          borderRadius: 3,
          height: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.4s",
          }}
        />
      </div>
      <span
        style={{
          minWidth: 50,
          textAlign: "right",
          fontWeight: 500,
          color: "var(--color-text-primary, #2c2c2a)",
        }}
      >
        {ms}ms
      </span>
    </div>
  );
}

function getQuality(total: number) {
  if (total < 100) return { label: "Excellent", color: COLORS.response };
  if (total < 250) return { label: "Good", color: COLORS.packet };
  if (total < 500) return { label: "Noticeable", color: COLORS.processing };
  return { label: "High lag", color: "#D45A4A" };
}

function getPhaseInfo(progress: number | null, netDelay: number, srvDelay: number) {
  if (progress === null) return { text: "Press send to animate", color: "var(--color-text-secondary, #888780)" };
  const total = netDelay + srvDelay + netDelay;
  const t1 = netDelay / total;
  const t2 = (netDelay + srvDelay) / total;
  if (progress < t1) return { text: "Request traveling to server...", color: COLORS.packet };
  if (progress < t2) return { text: "Server processing...", color: COLORS.processing };
  if (progress < 1) return { text: "Response traveling back...", color: COLORS.response };
  return { text: `Delivered! Total: ${total}ms`, color: COLORS.response };
}

export function LatencyVisualizer() {
  const [netDelay, setNetDelay] = useState(80);
  const [srvDelay, setSrvDelay] = useState(60);
  const [progress, setProgress] = useState<number | null>(null);
  const animRef = useRef<number | null>(null);

  const total = netDelay * 2 + srvDelay;
  const quality = getQuality(total);
  const phase = getPhaseInfo(progress, netDelay, srvDelay);

  const sendRequest = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const duration = Math.min(total * 8, 4000);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setProgress(p);
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [total]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const maxMs = total;
  const reqPct = Math.round((netDelay / maxMs) * 100);
  const srvPct = Math.round((srvDelay / maxMs) * 100);

  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", padding: "1.5rem 0" }}>

      {/* Canvas */}
      <div style={{ marginBottom: "1.5rem" }}>
        <SceneCanvas netDelay={netDelay} srvDelay={srvDelay} progress={progress} />
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: "1.5rem" }}>
        {[
          { label: "Network delay", value: netDelay, set: setNetDelay },
          { label: "Server processing", value: srvDelay, set: setSrvDelay },
        ].map(({ label, value, set }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary, #888780)",
                minWidth: 120,
              }}
            >
              {label}
            </span>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                minWidth: 52,
                textAlign: "right",
                color: "var(--color-text-primary, #2c2c2a)",
              }}
            >
              {value} ms
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: "1.5rem",
        }}
      >
        <StatCard label="Total latency" value={total} unit="ms" color={undefined} />
        <StatCard label="Round-trip network" value={netDelay * 2} unit="ms" color={undefined} />
        <StatCard label="Quality" value={quality.label} unit={undefined} color={quality.color} />
      </div>

      {/* Breakdown */}
      <div
        style={{
          border: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: "1rem",
        }}
      >
        <BreakdownRow color={COLORS.packet} name="Request travels to server" pct={reqPct} ms={netDelay} />
        <BreakdownRow color={COLORS.processing} name="Server processes request" pct={srvPct} ms={srvDelay} />
        <div style={{ borderBottom: "none" }}>
          <BreakdownRow color={COLORS.response} name="Response travels back" pct={reqPct} ms={netDelay} />
        </div>
      </div>

      {/* Send button + phase tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={sendRequest}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            fontSize: 13,
            fontWeight: 500,
            border: "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))",
            borderRadius: 8,
            background: "var(--color-background-primary, #fff)",
            color: "var(--color-text-primary, #2c2c2a)",
            cursor: "pointer",
          }}
        >
          Send request ↗
        </button>
        <span style={{ fontSize: 12, color: phase.color, transition: "color 0.3s" }}>
          {phase.text}
        </span>
      </div>
    </div>
  );
}