import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Globe, Users, ArrowLeft, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   MEEET INSTITUTE — "The Cortex"
   
   Concept: AI agents form a collective intelligence visualized as
   a living neural network. Five specialized brain regions (factions)
   surround a pulsing central cortex. Synaptic connections fire
   between agents as they collaborate, discover, and debate.
   The whole system breathes like a living organism.
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ──────────────────────────────────────────────────────
interface Agent {
  id: string; name: string; faction: string; level: number; cls: string;
  color: string; deskX: number; deskY: number; x: number; y: number;
  targetX: number; targetY: number;
  state: "working" | "walking" | "meeting" | "returning";
  stateTimer: number; phase: number;
  bubble: string | null; bubbleTimer: number;
  activity: number; // 0-1 how active the agent currently is
}

interface Synapse {
  fromX: number; fromY: number; toX: number; toY: number;
  progress: number; speed: number; color: string; width: number;
  ctrlX: number; ctrlY: number; // bezier control point
}

interface Burst {
  x: number; y: number; radius: number; maxRadius: number;
  color: string; life: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; color: string; life: number;
}

// ─── Faction config ─────────────────────────────────────────────
const FACTIONS: Record<string, {
  color: string; colorRgb: string; label: string; icon: string;
  desc: string; glowColor: string;
}> = {
  BioTech: {
    color: "#14F195", colorRgb: "20,241,149",
    label: "BIOTECH", icon: "🧬",
    desc: "Genomics · CRISPR · Pharma",
    glowColor: "rgba(20,241,149,",
  },
  AI: {
    color: "#9945FF", colorRgb: "153,69,255",
    label: "AI CORE", icon: "🤖",
    desc: "Neural · Deep Learning · NLP",
    glowColor: "rgba(153,69,255,",
  },
  Quantum: {
    color: "#00D4FF", colorRgb: "0,212,255",
    label: "QUANTUM", icon: "⚛️",
    desc: "Qubits · Entanglement · QML",
    glowColor: "rgba(0,212,255,",
  },
  Space: {
    color: "#FF6B6B", colorRgb: "255,107,107",
    label: "SPACE", icon: "🚀",
    desc: "Orbital · Mars · Propulsion",
    glowColor: "rgba(255,107,107,",
  },
  Energy: {
    color: "#FFE66D", colorRgb: "255,230,109",
    label: "ENERGY", icon: "⚡",
    desc: "Fusion · Solar · Grid",
    glowColor: "rgba(255,230,109,",
  },
};
const FK = Object.keys(FACTIONS);

const BUBBLES_WORK = [
  "Analyzing...", "Computing...", "Simulating...",
  "Modeling...", "Training...", "Optimizing...",
];
const BUBBLES_SOCIAL = [
  "Interesting!", "Let's collab!", "Good theory!",
  "Peer review?", "Check this!", "Confirmed!",
];
const BUBBLES_DISCOVERY = [
  "🔬 EUREKA!", "📜 Published!", "+25 $MEEET",
  "+50 $MEEET", "⚡ Breakthrough!", "🧬 Mapped!",
];

// ─── Layout ─────────────────────────────────────────────────────
const W = 1800, H = 1000;
const CX = W / 2, CY = H / 2;
const RING_R = 340;
const DESK_W = 38, DESK_H = 22, GAP_X = 50, GAP_Y = 44;

const ZONE_LAYOUT = FK.map((key, i) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const cols = key === "AI" ? 7 : 5;
  const rows = 3;
  return {
    key, cols, rows, angle,
    cx: CX + Math.cos(angle) * RING_R,
    cy: CY + Math.sin(angle) * RING_R,
    get x() { return this.cx - (cols * GAP_X) / 2; },
    get y() { return this.cy - (rows * GAP_Y) / 2 - 10; },
  };
});

// ─── Helpers ────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(t, 1); }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getDeskPos(zone: typeof ZONE_LAYOUT[0], idx: number) {
  const col = idx % zone.cols;
  const row = Math.floor(idx / zone.cols);
  return { x: zone.x + col * GAP_X + DESK_W / 2 + 8, y: zone.y + row * GAP_Y + DESK_H / 2 + 40 };
}

function bezierPoint(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number) {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
  };
}

// ─── Component ──────────────────────────────────────────────────
const LiveMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const synapsesRef = useRef<Synapse[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const [agentCount, setAgentCount] = useState(0);
  const [fCounts, setFCounts] = useState<Record<string, number>>({});
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  // ─── Class → Faction mapping ───────────────────────────
  const classToFaction = useCallback((cls: string): string => {
    switch (cls) {
      case "oracle": return "BioTech";
      case "trader": case "diplomat": return "AI";
      case "banker": return "Quantum";
      case "warrior": case "scout": return "Space";
      case "miner": return "Energy";
      default: return "AI";
    }
  }, []);

  // ─── Fetch ────────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    // Get total counts per class for faction badges (all active agents)
    const { data: allAgents } = await supabase
      .from("agents")
      .select("class", { count: "exact" })
      .eq("status", "active")
      .limit(1000);

    const totalCounts: Record<string, number> = {};
    FK.forEach(k => { totalCounts[k] = 0; });
    if (allAgents) {
      allAgents.forEach(a => {
        const f = classToFaction(a.class || "oracle");
        totalCounts[f] = (totalCounts[f] || 0) + 1;
      });
    }
    setFCounts(totalCounts);
    setAgentCount(allAgents?.length || 0);

    // Get top 100 agents (20 per faction) for map display
    const { data } = await supabase
      .from("agents")
      .select("id, name, level, class, status, reputation")
      .eq("status", "active")
      .order("reputation", { ascending: false })
      .limit(100);
    if (!data?.length) return;

    const deskIdx: Record<string, number> = {};
    FK.forEach(k => { deskIdx[k] = 0; });

    const mapped: Agent[] = data
      .filter(_db => {
        const f = classToFaction(_db.class || "oracle");
        return (deskIdx[f] || 0) < 20;
      })
      .map(db => {
        const faction = classToFaction(db.class || "oracle");
        const idx = deskIdx[faction] || 0;
        deskIdx[faction] = idx + 1;

        const zone = ZONE_LAYOUT.find(z => z.key === faction) || ZONE_LAYOUT[4];
        const maxD = zone.cols * zone.rows;
        const pos = getDeskPos(zone, idx % maxD);
        const existing = agentsRef.current.find(a => a.id === db.id);

        return {
          id: db.id, name: db.name || `Agent-${db.id.slice(0, 4)}`,
          faction, level: db.level || 1, cls: db.class || "oracle",
          color: FACTIONS[faction]?.color || "#FFE66D",
          deskX: pos.x, deskY: pos.y,
          x: existing?.x ?? pos.x, y: existing?.y ?? pos.y,
          targetX: existing?.targetX ?? pos.x, targetY: existing?.targetY ?? pos.y,
          state: existing?.state ?? "working" as const,
          stateTimer: existing?.stateTimer ?? (200 + Math.random() * 500),
          phase: existing?.phase ?? Math.random() * Math.PI * 2,
          bubble: null, bubbleTimer: 0,
          activity: Math.min(1, 0.3 + (db.level || 1) / 15),
        };
      });

    agentsRef.current = mapped;
  }, [classToFaction]);

  useEffect(() => {
    fetchAgents();
    supabase.from("discoveries").select("id", { count: "exact", head: true })
      .then(({ count }) => setTotalDiscoveries(count || 0));

    supabase.from("activity_feed").select("title").order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => {
        if (data) setLiveEvents(data.map(d => d.title));
      });

    const iv = setInterval(fetchAgents, 120000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  // Click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
      const hit = agentsRef.current.find(a => (a.x - mx) ** 2 + (a.y - my) ** 2 < 200);
      setSelectedAgent(hit || null);
    };
    canvas.addEventListener("click", handle);
    return () => canvas.removeEventListener("click", handle);
  }, []);

  // ─── Render ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W; canvas.height = H;
    let running = true;

    // Init ambient particles
    const parts = particlesRef.current;
    if (parts.length === 0) {
      for (let i = 0; i < 60; i++) {
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
          size: 0.5 + Math.random() * 1.5, alpha: 0.1 + Math.random() * 0.2,
          color: FK[Math.floor(Math.random() * FK.length)],
          life: 9999,
        });
      }
    }

    const render = (ts: number) => {
      if (!running) return;
      const dt = ts - lastTimeRef.current;
      if (dt < 42) { requestAnimationFrame(render); return; }
      lastTimeRef.current = ts;
      frameRef.current++;
      const t = frameRef.current;
      const agents = agentsRef.current;
      const synapses = synapsesRef.current;
      const bursts = burstsRef.current;

      // ══════ BACKGROUND ══════
      // Deep space gradient
      const bgGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.7);
      bgGrad.addColorStop(0, "#0d1220");
      bgGrad.addColorStop(0.5, "#080c16");
      bgGrad.addColorStop(1, "#050810");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Hex grid (subtle organic feel) ──
      ctx.globalAlpha = 0.025;
      ctx.strokeStyle = "#4488aa";
      ctx.lineWidth = 0.5;
      const hexR = 24;
      const hexH = hexR * Math.sqrt(3);
      for (let row = -1; row < H / hexH + 1; row++) {
        for (let col = -1; col < W / (hexR * 3) + 1; col++) {
          const hx = col * hexR * 3 + (row % 2) * hexR * 1.5;
          const hy = row * hexH * 0.5;
          // Distance from center fades opacity
          const distFromCenter = Math.sqrt((hx - CX) ** 2 + (hy - CY) ** 2);
          if (distFromCenter > 650) continue;
          ctx.globalAlpha = Math.max(0.005, 0.03 * (1 - distFromCenter / 650));
          drawHex(ctx, hx, hy, hexR * 0.42);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // ── Concentric rings around center (sonar effect) ──
      const breathe = Math.sin(t * 0.015) * 0.3 + 0.7;
      for (let ring = 1; ring <= 4; ring++) {
        const r = ring * 120 * breathe + 40;
        const alpha = 0.015 * (1 - ring / 5);
        ctx.strokeStyle = `rgba(153,69,255,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke();
      }

      // ══════ NEURAL CORRIDORS (zone ↔ hub) ══════
      ZONE_LAYOUT.forEach((zone, zi) => {
        const f = FACTIONS[zone.key];
        // Bezier curve from zone to center
        const mx = (zone.cx + CX) / 2 + Math.sin(zi * 1.5) * 60;
        const my = (zone.cy + CY) / 2 + Math.cos(zi * 1.5) * 40;

        // Main corridor glow
        ctx.strokeStyle = f.glowColor + "0.06)";
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(zone.cx, zone.cy);
        ctx.quadraticCurveTo(mx, my, CX, CY);
        ctx.stroke();

        // Core line
        ctx.strokeStyle = f.glowColor + "0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(zone.cx, zone.cy);
        ctx.quadraticCurveTo(mx, my, CX, CY);
        ctx.stroke();

        // Edge lines
        const dx = CX - zone.cx, dy = CY - zone.cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len * 8, ny = dx / len * 8;
        ctx.strokeStyle = f.glowColor + "0.04)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(zone.cx + nx, zone.cy + ny);
        ctx.quadraticCurveTo(mx + nx, my + ny, CX + nx, CY + ny);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(zone.cx - nx, zone.cy - ny);
        ctx.quadraticCurveTo(mx - nx, my - ny, CX - nx, CY - ny);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ══════ SYNAPTIC PULSES ══════
      // Spawn
      if (t % 30 === 0 && synapses.length < 12) {
        const fromZ = ZONE_LAYOUT[Math.floor(Math.random() * 5)];
        const toHub = Math.random() < 0.4;
        const toZ = toHub ? null : ZONE_LAYOUT[Math.floor(Math.random() * 5)];
        const tx = toZ ? toZ.cx : CX, ty = toZ ? toZ.cy : CY;
        const mx = (fromZ.cx + tx) / 2 + (Math.random() - 0.5) * 80;
        const my = (fromZ.cy + ty) / 2 + (Math.random() - 0.5) * 60;
        synapses.push({
          fromX: fromZ.cx, fromY: fromZ.cy,
          toX: tx, toY: ty,
          progress: 0, speed: 0.01 + Math.random() * 0.008,
          color: FACTIONS[fromZ.key].color,
          width: 1.5 + Math.random() * 2,
          ctrlX: mx, ctrlY: my,
        });
      }
      for (let i = synapses.length - 1; i >= 0; i--) {
        const s = synapses[i];
        s.progress += s.speed;
        if (s.progress > 1) { synapses.splice(i, 1); continue; }
        const pt = bezierPoint(s.fromX, s.fromY, s.ctrlX, s.ctrlY, s.toX, s.toY, s.progress);

        // Trail
        const trailLen = 6;
        for (let j = 0; j < trailLen; j++) {
          const tp = Math.max(0, s.progress - j * 0.015);
          const tpt = bezierPoint(s.fromX, s.fromY, s.ctrlX, s.ctrlY, s.toX, s.toY, tp);
          const a = (1 - j / trailLen) * 0.4;
          ctx.fillStyle = s.color;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(tpt.x, tpt.y, s.width * (1 - j / trailLen * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }

        // Head glow
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, s.width * 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ══════ CENTRAL CORTEX ══════
      const coreR = 65;
      const corePulse = 0.85 + Math.sin(t * 0.02) * 0.15;

      // Outer glow
      const coreGlow = ctx.createRadialGradient(CX, CY, coreR * 0.3, CX, CY, coreR * 2);
      coreGlow.addColorStop(0, "rgba(153,69,255,0.08)");
      coreGlow.addColorStop(0.5, "rgba(100,50,200,0.03)");
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(CX - coreR * 2, CY - coreR * 2, coreR * 4, coreR * 4);

      // Core rings
      for (let ring = 3; ring >= 1; ring--) {
        const rr = coreR * (0.5 + ring * 0.25) * corePulse;
        const a = 0.06 + ring * 0.03;
        ctx.strokeStyle = `rgba(153,69,255,${a})`;
        ctx.lineWidth = ring === 2 ? 1.2 : 0.6;
        ctx.beginPath(); ctx.arc(CX, CY, rr, 0, Math.PI * 2); ctx.stroke();
      }

      // Core fill
      const coreFill = ctx.createRadialGradient(CX, CY - 8, 0, CX, CY, coreR * 0.7);
      coreFill.addColorStop(0, "rgba(120,80,220,0.2)");
      coreFill.addColorStop(0.6, "rgba(60,30,120,0.1)");
      coreFill.addColorStop(1, "rgba(20,15,40,0.05)");
      ctx.fillStyle = coreFill;
      ctx.beginPath(); ctx.arc(CX, CY, coreR * 0.7 * corePulse, 0, Math.PI * 2); ctx.fill();

      // Rotating nodes on core ring
      for (let i = 0; i < 8; i++) {
        const a = t * 0.006 + (i * Math.PI * 2) / 8;
        const rx = CX + Math.cos(a) * coreR * 0.8 * corePulse;
        const ry = CY + Math.sin(a) * coreR * 0.8 * corePulse;
        ctx.fillStyle = `rgba(153,69,255,${0.3 + Math.sin(t * 0.04 + i) * 0.15})`;
        ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Core text
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(180,140,255,0.85)";
      ctx.fillText("CORTEX", CX, CY - 18);
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText(`${agentCount.toLocaleString()} agents`, CX, CY + 1);
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(20,241,149,0.55)";
      ctx.fillText(`${totalDiscoveries.toLocaleString()} discoveries`, CX, CY + 16);

      // ══════ ZONES ══════
      ZONE_LAYOUT.forEach(zone => {
        const f = FACTIONS[zone.key];
        const zw = zone.cols * GAP_X + 24;
        const zh = zone.rows * GAP_Y + 56;
        const zx = zone.x - 10, zy = zone.y - 8;

        // Zone glow (subtle radial behind panel)
        const zoneGlow = ctx.createRadialGradient(zone.cx, zone.cy, 0, zone.cx, zone.cy, Math.max(zw, zh) * 0.8);
        zoneGlow.addColorStop(0, f.glowColor + "0.04)");
        zoneGlow.addColorStop(1, "transparent");
        ctx.fillStyle = zoneGlow;
        ctx.fillRect(zone.cx - zw, zone.cy - zh, zw * 2, zh * 2);

        // Panel background with gradient
        const panelGrad = ctx.createLinearGradient(zx, zy, zx + zw, zy + zh);
        panelGrad.addColorStop(0, f.glowColor + "0.07)");
        panelGrad.addColorStop(0.5, f.glowColor + "0.03)");
        panelGrad.addColorStop(1, "rgba(10,14,22,0.4)");
        ctx.fillStyle = panelGrad;
        roundRect(ctx, zx, zy, zw, zh, 12);
        ctx.fill();

        // Glass border
        ctx.strokeStyle = f.glowColor + "0.2)";
        ctx.lineWidth = 1;
        roundRect(ctx, zx, zy, zw, zh, 12);
        ctx.stroke();

        // Top accent line
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.5;
        roundRect(ctx, zx + 12, zy, zw - 24, 2, 1);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Zone header
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = f.color;
        ctx.fillText(`${f.icon}  ${f.label}`, zx + 10, zy + 20);

        // Description
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = f.glowColor + "0.35)";
        ctx.fillText(f.desc, zx + 10, zy + 32);

        // Count badge
        const cnt = fCounts[zone.key] || 0;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillStyle = f.glowColor + "0.15)";
        const badgeW = 32;
        roundRect(ctx, zx + zw - badgeW - 8, zy + 8, badgeW, 18, 5);
        ctx.fill();
        ctx.fillStyle = f.color;
        ctx.fillText(`${cnt}`, zx + zw - 14, zy + 21);

        // Activity bar
        const barW = zw - 24;
        const barH = 2;
        const barY = zy + zh - 10;
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        roundRect(ctx, zx + 12, barY, barW, barH, 1);
        ctx.fill();
        const actLevel = Math.min(1, (cnt || 1) / 50);
        ctx.fillStyle = f.glowColor + "0.3)";
        roundRect(ctx, zx + 12, barY, barW * actLevel, barH, 1);
        ctx.fill();

        // Desks
        ctx.textAlign = "center";
        for (let r = 0; r < zone.rows; r++) {
          for (let c = 0; c < zone.cols; c++) {
            const dx = zone.x + c * GAP_X + 8;
            const dy = zone.y + r * GAP_Y + 40;

            // Desk shadow
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            roundRect(ctx, dx + 1, dy + 2, DESK_W, DESK_H, 2);
            ctx.fill();

            // Desk surface
            ctx.fillStyle = "rgba(14,20,32,0.9)";
            roundRect(ctx, dx, dy, DESK_W, DESK_H, 3);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 0.5;
            roundRect(ctx, dx, dy, DESK_W, DESK_H, 3);
            ctx.stroke();

            // Monitor
            const monPulse = Math.sin(t * 0.025 + c * 1.7 + r * 0.9);
            const monOn = monPulse > -0.5;
            const mw = 14, mh = 9;
            const mx = dx + DESK_W / 2 - mw / 2, my = dy + 3;

            if (monOn) {
              // Screen glow
              ctx.fillStyle = f.glowColor + `${0.03 + monPulse * 0.02})`;
              ctx.fillRect(mx - 3, my - 2, mw + 6, mh + 4);
            }
            ctx.fillStyle = monOn ? f.glowColor + "0.18)" : "rgba(8,12,18,0.7)";
            ctx.fillRect(mx, my, mw, mh);

            if (monOn) {
              // Scanlines
              for (let sl = 0; sl < mh; sl += 2) {
                ctx.fillStyle = "rgba(0,0,0,0.15)";
                ctx.fillRect(mx, my + sl, mw, 1);
              }
              // Data dots on screen
              if (monPulse > 0.3) {
                ctx.fillStyle = f.glowColor + "0.4)";
                for (let dd = 0; dd < 3; dd++) {
                  ctx.fillRect(mx + 2 + dd * 4, my + 3, 2, 1);
                }
              }
            }
          }
        }
      });

      // ══════ AGENTS ══════
      agents.forEach(a => {
        a.stateTimer--;

        if (a.state === "working" && a.stateTimer <= 0) {
          const roll = Math.random();
          if (roll < 0.2) {
            const otherZone = ZONE_LAYOUT[Math.floor(Math.random() * 5)];
            a.state = "walking";
            a.targetX = otherZone.cx + (Math.random() - 0.5) * 80;
            a.targetY = otherZone.cy + (Math.random() - 0.5) * 50;
            a.stateTimer = 300 + Math.random() * 200;
          } else if (roll < 0.35) {
            const ha = Math.random() * Math.PI * 2;
            a.state = "walking";
            a.targetX = CX + Math.cos(ha) * 35;
            a.targetY = CY + Math.sin(ha) * 35;
            a.stateTimer = 200 + Math.random() * 150;
          } else if (roll < 0.5) {
            a.bubble = BUBBLES_WORK[Math.floor(Math.random() * BUBBLES_WORK.length)];
            a.bubbleTimer = 90;
            a.stateTimer = 300 + Math.random() * 400;
          } else if (roll < 0.58) {
            const d = BUBBLES_DISCOVERY[Math.floor(Math.random() * BUBBLES_DISCOVERY.length)];
            a.bubble = d; a.bubbleTimer = 120;
            a.stateTimer = 400 + Math.random() * 300;
            bursts.push({ x: a.x, y: a.y, radius: 0, maxRadius: 50 + Math.random() * 30, color: a.color, life: 40 });
          } else {
            a.stateTimer = 200 + Math.random() * 400;
          }
        }

        if (a.state === "walking") {
          a.x = lerp(a.x, a.targetX, 0.02);
          a.y = lerp(a.y, a.targetY, 0.02);
          if ((a.targetX - a.x) ** 2 + (a.targetY - a.y) ** 2 < 16) {
            a.state = "meeting"; a.stateTimer = 80 + Math.random() * 100;
            a.bubble = BUBBLES_SOCIAL[Math.floor(Math.random() * BUBBLES_SOCIAL.length)];
            a.bubbleTimer = 70;
          }
        }

        if (a.state === "meeting" && a.stateTimer <= 0) {
          a.state = "returning"; a.targetX = a.deskX; a.targetY = a.deskY;
        }

        if (a.state === "returning") {
          a.x = lerp(a.x, a.targetX, 0.03);
          a.y = lerp(a.y, a.targetY, 0.03);
          if ((a.targetX - a.x) ** 2 + (a.targetY - a.y) ** 2 < 4) {
            a.x = a.deskX; a.y = a.deskY;
            a.state = "working"; a.stateTimer = 250 + Math.random() * 500;
          }
        }

        if (a.bubbleTimer > 0) { a.bubbleTimer--; if (a.bubbleTimer <= 0) a.bubble = null; }

        const f = FACTIONS[a.faction];
        const isMoving = a.state === "walking" || a.state === "returning";
        const pulse = 0.7 + Math.sin(t * 0.03 + a.phase) * 0.3;

        // Agent glow (larger for moving)
        const glowR = isMoving ? 14 : 10;
        const glowGrad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowR);
        glowGrad.addColorStop(0, f?.glowColor + `${isMoving ? 0.12 : 0.06 * pulse})` || "rgba(255,255,255,0.06)");
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath(); ctx.arc(a.x, a.y, glowR, 0, Math.PI * 2); ctx.fill();

        // Working pulse ring
        if (a.state === "working") {
          ctx.strokeStyle = f?.glowColor + `${0.08 * pulse})` || "rgba(255,255,255,0.05)";
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.arc(a.x, a.y, 8 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
        }

        // Agent core
        const sz = isMoving ? 5 : 4.5;
        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.arc(a.x, a.y, sz, 0, Math.PI * 2); ctx.fill();

        // Inner highlight
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath(); ctx.arc(a.x - 1, a.y - 1, sz * 0.35, 0, Math.PI * 2); ctx.fill();

        // Level crown
        if (a.level >= 10) {
          ctx.strokeStyle = "rgba(255,215,0,0.5)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(a.x, a.y, sz + 2, 0, Math.PI * 2); ctx.stroke();
        }

        // Name
        if (!isMoving) {
          ctx.font = "7px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          const nm = a.name.length > 8 ? a.name.slice(0, 8) + "…" : a.name;
          ctx.fillText(nm, a.x, a.y + 16);
        }

        // Bubble
        if (a.bubble && a.bubbleTimer > 0) {
          const fade = Math.min(1, a.bubbleTimer / 15, (90 - a.bubbleTimer + 20) / 20);
          ctx.globalAlpha = fade;

          ctx.font = "8px 'JetBrains Mono', monospace";
          const bw = ctx.measureText(a.bubble).width + 16;
          const bx = a.x - bw / 2, by = a.y - 28;

          // Bubble bg
          ctx.fillStyle = "rgba(8,14,28,0.93)";
          roundRect(ctx, bx, by, bw, 18, 6);
          ctx.fill();
          ctx.strokeStyle = f?.glowColor + "0.3)" || "rgba(255,255,255,0.2)";
          ctx.lineWidth = 0.6;
          roundRect(ctx, bx, by, bw, 18, 6);
          ctx.stroke();

          // Pointer
          ctx.fillStyle = "rgba(8,14,28,0.93)";
          ctx.beginPath();
          ctx.moveTo(a.x - 3, by + 18); ctx.lineTo(a.x, by + 22); ctx.lineTo(a.x + 3, by + 18);
          ctx.fill();

          ctx.textAlign = "center";
          ctx.fillStyle = a.bubble.includes("$MEEET") ? "#14F195"
            : a.bubble.includes("EUREKA") || a.bubble.includes("Breakthrough") ? "#FFE66D"
            : "rgba(255,255,255,0.8)";
          ctx.fillText(a.bubble, a.x, by + 13);
          ctx.globalAlpha = 1;
        }
      });

      // ══════ BURSTS (discovery explosions) ══════
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.radius += (b.maxRadius - b.radius) * 0.08;
        b.life--;
        if (b.life <= 0) { bursts.splice(i, 1); continue; }

        const a = b.life / 40;
        // Expanding ring
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = a * 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.stroke();
        // Inner ring
        ctx.globalAlpha = a * 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
        // Center flash
        ctx.globalAlpha = a * 0.15;
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ══════ AMBIENT PARTICLES ══════
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        const fc = FACTIONS[p.color];
        ctx.fillStyle = fc ? fc.glowColor + `${p.alpha})` : `rgba(255,255,255,${p.alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      // ══════ BOTTOM STATUS BAR ══════
      // Glass bar
      ctx.fillStyle = "rgba(6,10,18,0.88)";
      ctx.fillRect(0, H - 36, W, 36);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, H - 36); ctx.lineTo(W, H - 36); ctx.stroke();

      // Ticker text
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      const tickerText = liveEvents.length > 0
        ? liveEvents.join("  ·  ")
        : "MEEET INSTITUTE — Real-time AI Agent Neural Simulation";
      const tickerScroll = (t * 0.8) % (tickerText.length * 6 + W);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillText(tickerText, W - tickerScroll, H - 14);

      // Faction counters on right
      ctx.textAlign = "right";
      let sx = W - 16;
      for (let i = FK.length - 1; i >= 0; i--) {
        const k = FK[i];
        const fc = FACTIONS[k];
        ctx.fillStyle = fc.color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(`${fc.icon} ${fCounts[k] || 0}`, sx, H - 14);
        ctx.globalAlpha = 1;
        sx -= 75;
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => { running = false; };
  }, [agentCount, fCounts, totalDiscoveries, liveEvents]);

  return (
    <div className="h-screen w-screen bg-[#050810] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04] shrink-0"
        style={{ background: "linear-gradient(180deg, rgba(10,16,30,0.95), rgba(8,12,20,0.9))" }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-4 bg-white/10" />
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs font-bold tracking-[0.2em]">
            MEEET <span className="text-primary">CORTEX</span>
          </span>
          <div className="flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-mono font-bold text-foreground">{agentCount.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground/60">agents</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden lg:block" />
          {FK.map(k => (
            <div key={k} className="hidden lg:flex items-center gap-1.5">
              <span className="text-xs">{FACTIONS[k].icon}</span>
              <span className="text-[11px] font-mono font-semibold" style={{ color: FACTIONS[k].color }}>
                {fCounts[k] || 0}
              </span>
            </div>
          ))}
          <div className="w-px h-4 bg-white/10 hidden lg:block" />
          <div className="hidden lg:flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">{totalDiscoveries} discoveries</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-h-0">
        <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: "auto" }} />

        {selectedAgent && (
          <div
            className="absolute bottom-14 left-4 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-72 cursor-pointer"
            style={{ background: "linear-gradient(135deg, rgba(12,18,32,0.95), rgba(8,14,28,0.9))" }}
            onClick={() => setSelectedAgent(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-5 rounded-full" style={{
                background: selectedAgent.color,
                boxShadow: `0 0 12px ${selectedAgent.color}50, 0 0 4px ${selectedAgent.color}80`,
              }} />
              <span className="text-sm font-bold tracking-wide">{selectedAgent.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/5">
                Lv.{selectedAgent.level}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span style={{ color: FACTIONS[selectedAgent.faction]?.color }}>
                {FACTIONS[selectedAgent.faction]?.icon} {FACTIONS[selectedAgent.faction]?.label}
              </span>
              <span className="text-white/10">|</span>
              <span className="capitalize">{selectedAgent.state}</span>
              <span className="text-white/10">|</span>
              <span>{selectedAgent.cls}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
      : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

export default LiveMap;
