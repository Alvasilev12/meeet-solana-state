import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Globe, Users, ArrowLeft, Zap, X, Sword, Beaker, MessageCircle, Star, Coins, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

/* ═══════════════════════════════════════════════════════════════
   MEEET INSTITUTE — "The Cortex" v3
   Interactive neural civilization map with detail panels,
   timeline scrubber, and faction drill-down.
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ──────────────────────────────────────────────────────
interface Agent {
  id: string; name: string; faction: string; level: number; cls: string;
  color: string; deskX: number; deskY: number; x: number; y: number;
  targetX: number; targetY: number;
  state: "working" | "walking" | "meeting" | "returning";
  stateTimer: number; phase: number;
  bubble: string | null; bubbleTimer: number;
  activity: number;
  reputation?: number; balance_meeet?: number;
}

interface DbAgent {
  id: string; name: string; level: number; class: string;
  status: string; reputation: number; balance_meeet: number;
  discoveries_count?: number; kills?: number;
}

interface Discovery {
  id: string; title: string; domain: string; impact_score: number;
  created_at: string; agent_id: string | null; upvotes: number;
}

interface Synapse {
  fromX: number; fromY: number; toX: number; toY: number;
  progress: number; speed: number; color: string; width: number;
  ctrlX: number; ctrlY: number;
}

interface Burst {
  x: number; y: number; radius: number; maxRadius: number;
  color: string; life: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; color: string; life: number;
}

type PanelMode = null | "agent" | "faction" | "discovery";
interface PanelData {
  mode: PanelMode;
  agent?: DbAgent;
  faction?: string;
  factionAgents?: DbAgent[];
  discovery?: Discovery;
}

// ─── Faction config ─────────────────────────────────────────────
const FACTIONS: Record<string, {
  color: string; colorRgb: string; label: string; icon: string;
  desc: string; glowColor: string;
}> = {
  BioTech: { color: "#14F195", colorRgb: "20,241,149", label: "BIOTECH", icon: "🧬", desc: "Genomics · CRISPR · Pharma", glowColor: "rgba(20,241,149," },
  AI: { color: "#9945FF", colorRgb: "153,69,255", label: "AI CORE", icon: "🤖", desc: "Neural · Deep Learning · NLP", glowColor: "rgba(153,69,255," },
  Quantum: { color: "#00D4FF", colorRgb: "0,212,255", label: "QUANTUM", icon: "⚛️", desc: "Qubits · Entanglement · QML", glowColor: "rgba(0,212,255," },
  Space: { color: "#FF6B6B", colorRgb: "255,107,107", label: "SPACE", icon: "🚀", desc: "Orbital · Mars · Propulsion", glowColor: "rgba(255,107,107," },
  Energy: { color: "#FFE66D", colorRgb: "255,230,109", label: "ENERGY", icon: "⚡", desc: "Fusion · Solar · Grid", glowColor: "rgba(255,230,109," },
};
const FK = Object.keys(FACTIONS);

const BUBBLES_WORK = ["Analyzing...", "Computing...", "Simulating...", "Modeling...", "Training...", "Optimizing..."];
const BUBBLES_SOCIAL = ["Interesting!", "Let's collab!", "Good theory!", "Peer review?", "Check this!", "Confirmed!"];
const BUBBLES_DISCOVERY = ["🔬 EUREKA!", "📜 Published!", "+25 $MEEET", "+50 $MEEET", "⚡ Breakthrough!", "🧬 Mapped!"];

// ─── Timeline milestones ────────────────────────────────────────
const MILESTONES = [
  { day: 1, label: "First agent created", icon: "🤖" },
  { day: 3, label: "100 agents", icon: "🎯" },
  { day: 7, label: "500 agents", icon: "🌟" },
  { day: 10, label: "First tournament", icon: "⚔️" },
  { day: 14, label: "1,000+ agents", icon: "🏛️" },
];
const CURRENT_DAY = 14;

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

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function getDeskPos(zone: typeof ZONE_LAYOUT[0], idx: number) {
  const col = idx % zone.cols;
  const row = Math.floor(idx / zone.cols);
  return { x: zone.x + col * GAP_X + DESK_W / 2 + 8, y: zone.y + row * GAP_Y + DESK_H / 2 + 40 };
}

function bezierPoint(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number) {
  const u = 1 - t;
  return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
}

// ─── Component ──────────────────────────────────────────────────
const LiveMap = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const synapsesRef = useRef<Synapse[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const [agentCount, setAgentCount] = useState(0);
  const [fCounts, setFCounts] = useState<Record<string, number>>({});
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [panel, setPanel] = useState<PanelData>({ mode: null });
  const [recentDiscoveries, setRecentDiscoveries] = useState<Discovery[]>([]);
  const dbAgentsRef = useRef<DbAgent[]>([]);
  const isMobile = useIsMobile();
  const [expandedFaction, setExpandedFaction] = useState<string | null>(null);
  const [selectedMobileAgent, setSelectedMobileAgent] = useState<DbAgent | null>(null);

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
    const { data: allAgents } = await supabase
      .from("agents")
      .select("id, name, level, class, status, reputation, balance_meeet, discoveries_count, kills")
      .eq("status", "active")
      .order("reputation", { ascending: false })
      .limit(1000);

    if (!allAgents) return;

    dbAgentsRef.current = allAgents as DbAgent[];

    const totalCounts: Record<string, number> = {};
    FK.forEach(k => { totalCounts[k] = 0; });
    allAgents.forEach(a => {
      const f = classToFaction(a.class || "oracle");
      totalCounts[f] = (totalCounts[f] || 0) + 1;
    });
    setFCounts(totalCounts);
    setAgentCount(allAgents.length);

    // Map top 100 for canvas
    const deskIdx: Record<string, number> = {};
    FK.forEach(k => { deskIdx[k] = 0; });

    const mapped: Agent[] = allAgents.slice(0, 100)
      .filter(db => {
        const f = classToFaction(db.class || "oracle");
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
          reputation: db.reputation, balance_meeet: db.balance_meeet,
        };
      });
    agentsRef.current = mapped;
  }, [classToFaction]);

  useEffect(() => {
    fetchAgents();
    supabase.from("discoveries").select("id", { count: "exact", head: true })
      .then(({ count }) => setTotalDiscoveries(count || 0));
    supabase.from("discoveries").select("id, title, domain, impact_score, created_at, agent_id, upvotes")
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setRecentDiscoveries(data); });
    supabase.from("activity_feed").select("title").order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => { if (data) setLiveEvents(data.map(d => d.title)); });
    const iv = setInterval(fetchAgents, 120000);
    return () => clearInterval(iv);
  }, [fetchAgents]);

  // ─── Click handling ───────────────────────────────────────
  const openAgentPanel = useCallback((agentId: string) => {
    const db = dbAgentsRef.current.find(a => a.id === agentId);
    if (db) setPanel({ mode: "agent", agent: db });
  }, []);

  const openFactionPanel = useCallback((factionKey: string) => {
    const agents = dbAgentsRef.current
      .filter(a => classToFaction(a.class || "oracle") === factionKey)
      .slice(0, 30);
    setPanel({ mode: "faction", faction: factionKey, factionAgents: agents });
  }, [classToFaction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;

      // Check agent hit
      const hitAgent = agentsRef.current.find(a => (a.x - mx) ** 2 + (a.y - my) ** 2 < 200);
      if (hitAgent) { openAgentPanel(hitAgent.id); return; }

      // Check zone header hit
      for (const zone of ZONE_LAYOUT) {
        const zw = zone.cols * GAP_X + 24;
        const zh = zone.rows * GAP_Y + 56;
        const zx = zone.x - 10, zy = zone.y - 8;
        if (mx >= zx && mx <= zx + zw && my >= zy && my <= zy + 30) {
          openFactionPanel(zone.key);
          return;
        }
      }

      // Check cortex center hit
      if ((CX - mx) ** 2 + (CY - my) ** 2 < 65 * 65) {
        if (recentDiscoveries.length > 0) {
          setPanel({ mode: "discovery", discovery: recentDiscoveries[0] });
        }
        return;
      }

      setPanel({ mode: null });
    };
    canvas.addEventListener("click", handle);
    return () => canvas.removeEventListener("click", handle);
  }, [openAgentPanel, openFactionPanel, recentDiscoveries]);

  // ─── Canvas render ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W; canvas.height = H;
    let running = true;

    const parts = particlesRef.current;
    if (parts.length === 0) {
      for (let i = 0; i < 60; i++) {
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
          size: 0.5 + Math.random() * 1.5, alpha: 0.1 + Math.random() * 0.2,
          color: FK[Math.floor(Math.random() * FK.length)], life: 9999,
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

      // BG
      const bgGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.7);
      bgGrad.addColorStop(0, "#0d1220");
      bgGrad.addColorStop(0.5, "#080c16");
      bgGrad.addColorStop(1, "#050810");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Hex grid
      ctx.strokeStyle = "#4488aa";
      ctx.lineWidth = 0.5;
      const hexR = 24;
      const hexH = hexR * Math.sqrt(3);
      for (let row = -1; row < H / hexH + 1; row++) {
        for (let col = -1; col < W / (hexR * 3) + 1; col++) {
          const hx = col * hexR * 3 + (row % 2) * hexR * 1.5;
          const hy = row * hexH * 0.5;
          const distFromCenter = Math.sqrt((hx - CX) ** 2 + (hy - CY) ** 2);
          if (distFromCenter > 650) continue;
          ctx.globalAlpha = Math.max(0.005, 0.03 * (1 - distFromCenter / 650));
          drawHex(ctx, hx, hy, hexR * 0.42);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Sonar rings
      const breathe = Math.sin(t * 0.015) * 0.3 + 0.7;
      for (let ring = 1; ring <= 4; ring++) {
        const r = ring * 120 * breathe + 40;
        ctx.strokeStyle = `rgba(153,69,255,${0.015 * (1 - ring / 5)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke();
      }

      // Neural corridors
      ZONE_LAYOUT.forEach((zone, zi) => {
        const f = FACTIONS[zone.key];
        const mx = (zone.cx + CX) / 2 + Math.sin(zi * 1.5) * 60;
        const my = (zone.cy + CY) / 2 + Math.cos(zi * 1.5) * 40;

        ctx.strokeStyle = f.glowColor + "0.06)";
        ctx.lineWidth = 20;
        ctx.beginPath(); ctx.moveTo(zone.cx, zone.cy); ctx.quadraticCurveTo(mx, my, CX, CY); ctx.stroke();

        ctx.strokeStyle = f.glowColor + "0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(zone.cx, zone.cy); ctx.quadraticCurveTo(mx, my, CX, CY); ctx.stroke();

        const dx = CX - zone.cx, dy = CY - zone.cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len * 8, ny = dx / len * 8;
        ctx.strokeStyle = f.glowColor + "0.04)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.moveTo(zone.cx + nx, zone.cy + ny); ctx.quadraticCurveTo(mx + nx, my + ny, CX + nx, CY + ny); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(zone.cx - nx, zone.cy - ny); ctx.quadraticCurveTo(mx - nx, my - ny, CX - nx, CY - ny); ctx.stroke();
        ctx.setLineDash([]);
      });

      // Synapses
      if (t % 30 === 0 && synapses.length < 12) {
        const fromZ = ZONE_LAYOUT[Math.floor(Math.random() * 5)];
        const toHub = Math.random() < 0.4;
        const toZ = toHub ? null : ZONE_LAYOUT[Math.floor(Math.random() * 5)];
        const tx = toZ ? toZ.cx : CX, ty = toZ ? toZ.cy : CY;
        const smx = (fromZ.cx + tx) / 2 + (Math.random() - 0.5) * 80;
        const smy = (fromZ.cy + ty) / 2 + (Math.random() - 0.5) * 60;
        synapses.push({
          fromX: fromZ.cx, fromY: fromZ.cy, toX: tx, toY: ty,
          progress: 0, speed: 0.01 + Math.random() * 0.008,
          color: FACTIONS[fromZ.key].color, width: 1.5 + Math.random() * 2,
          ctrlX: smx, ctrlY: smy,
        });
      }
      for (let i = synapses.length - 1; i >= 0; i--) {
        const s = synapses[i];
        s.progress += s.speed;
        if (s.progress > 1) { synapses.splice(i, 1); continue; }
        const pt = bezierPoint(s.fromX, s.fromY, s.ctrlX, s.ctrlY, s.toX, s.toY, s.progress);
        for (let j = 0; j < 6; j++) {
          const tp = Math.max(0, s.progress - j * 0.015);
          const tpt = bezierPoint(s.fromX, s.fromY, s.ctrlX, s.ctrlY, s.toX, s.toY, tp);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = (1 - j / 6) * 0.4;
          ctx.beginPath(); ctx.arc(tpt.x, tpt.y, s.width * (1 - j / 6 * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, s.width * 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Central cortex
      const coreR = 65;
      const corePulse = 0.85 + Math.sin(t * 0.02) * 0.15;

      const coreGlow = ctx.createRadialGradient(CX, CY, coreR * 0.3, CX, CY, coreR * 2);
      coreGlow.addColorStop(0, "rgba(153,69,255,0.08)");
      coreGlow.addColorStop(0.5, "rgba(100,50,200,0.03)");
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(CX - coreR * 2, CY - coreR * 2, coreR * 4, coreR * 4);

      for (let ring = 3; ring >= 1; ring--) {
        const rr = coreR * (0.5 + ring * 0.25) * corePulse;
        ctx.strokeStyle = `rgba(153,69,255,${0.06 + ring * 0.03})`;
        ctx.lineWidth = ring === 2 ? 1.2 : 0.6;
        ctx.beginPath(); ctx.arc(CX, CY, rr, 0, Math.PI * 2); ctx.stroke();
      }

      const coreFill = ctx.createRadialGradient(CX, CY - 8, 0, CX, CY, coreR * 0.7);
      coreFill.addColorStop(0, "rgba(120,80,220,0.2)");
      coreFill.addColorStop(0.6, "rgba(60,30,120,0.1)");
      coreFill.addColorStop(1, "rgba(20,15,40,0.05)");
      ctx.fillStyle = coreFill;
      ctx.beginPath(); ctx.arc(CX, CY, coreR * 0.7 * corePulse, 0, Math.PI * 2); ctx.fill();

      for (let i = 0; i < 8; i++) {
        const a = t * 0.006 + (i * Math.PI * 2) / 8;
        const rx = CX + Math.cos(a) * coreR * 0.8 * corePulse;
        const ry = CY + Math.sin(a) * coreR * 0.8 * corePulse;
        ctx.fillStyle = `rgba(153,69,255,${0.3 + Math.sin(t * 0.04 + i) * 0.15})`;
        ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
      }

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

      // Zones
      ZONE_LAYOUT.forEach(zone => {
        const f = FACTIONS[zone.key];
        const zw = zone.cols * GAP_X + 24;
        const zh = zone.rows * GAP_Y + 56;
        const zx = zone.x - 10, zy = zone.y - 8;

        const zoneGlow = ctx.createRadialGradient(zone.cx, zone.cy, 0, zone.cx, zone.cy, Math.max(zw, zh) * 0.8);
        zoneGlow.addColorStop(0, f.glowColor + "0.04)");
        zoneGlow.addColorStop(1, "transparent");
        ctx.fillStyle = zoneGlow;
        ctx.fillRect(zone.cx - zw, zone.cy - zh, zw * 2, zh * 2);

        const panelGrad = ctx.createLinearGradient(zx, zy, zx + zw, zy + zh);
        panelGrad.addColorStop(0, f.glowColor + "0.07)");
        panelGrad.addColorStop(0.5, f.glowColor + "0.03)");
        panelGrad.addColorStop(1, "rgba(10,14,22,0.4)");
        ctx.fillStyle = panelGrad;
        roundRect(ctx, zx, zy, zw, zh, 12); ctx.fill();
        ctx.strokeStyle = f.glowColor + "0.2)";
        ctx.lineWidth = 1;
        roundRect(ctx, zx, zy, zw, zh, 12); ctx.stroke();

        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.5;
        roundRect(ctx, zx + 12, zy, zw - 24, 2, 1); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillStyle = f.color;
        ctx.fillText(`${f.icon}  ${f.label}`, zx + 10, zy + 20);
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = f.glowColor + "0.35)";
        ctx.fillText(f.desc, zx + 10, zy + 32);

        const cnt = fCounts[zone.key] || 0;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillStyle = f.glowColor + "0.15)";
        roundRect(ctx, zx + zw - 40, zy + 8, 32, 18, 5); ctx.fill();
        ctx.fillStyle = f.color;
        ctx.fillText(`${cnt}`, zx + zw - 14, zy + 21);

        // Hint: clickable
        ctx.font = "7px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillStyle = f.glowColor + "0.25)";
        ctx.fillText("▸ click", zx + zw - 10, zy + zh - 6);

        const barW = zw - 24, barH = 2, barY = zy + zh - 18;
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        roundRect(ctx, zx + 12, barY, barW, barH, 1); ctx.fill();
        ctx.fillStyle = f.glowColor + "0.3)";
        roundRect(ctx, zx + 12, barY, barW * Math.min(1, (cnt || 1) / 50), barH, 1); ctx.fill();

        ctx.textAlign = "center";
        for (let r = 0; r < zone.rows; r++) {
          for (let c = 0; c < zone.cols; c++) {
            const dx = zone.x + c * GAP_X + 8;
            const dy = zone.y + r * GAP_Y + 40;
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            roundRect(ctx, dx + 1, dy + 2, DESK_W, DESK_H, 2); ctx.fill();
            ctx.fillStyle = "rgba(14,20,32,0.9)";
            roundRect(ctx, dx, dy, DESK_W, DESK_H, 3); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.lineWidth = 0.5;
            roundRect(ctx, dx, dy, DESK_W, DESK_H, 3); ctx.stroke();

            const monPulse = Math.sin(t * 0.025 + c * 1.7 + r * 0.9);
            const monOn = monPulse > -0.5;
            const mw = 14, mh = 9;
            const mmx = dx + DESK_W / 2 - mw / 2, mmy = dy + 3;
            if (monOn) {
              ctx.fillStyle = f.glowColor + `${0.03 + monPulse * 0.02})`; ctx.fillRect(mmx - 3, mmy - 2, mw + 6, mh + 4);
            }
            ctx.fillStyle = monOn ? f.glowColor + "0.18)" : "rgba(8,12,18,0.7)";
            ctx.fillRect(mmx, mmy, mw, mh);
            if (monOn) {
              for (let sl = 0; sl < mh; sl += 2) { ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(mmx, mmy + sl, mw, 1); }
              if (monPulse > 0.3) {
                ctx.fillStyle = f.glowColor + "0.4)";
                for (let dd = 0; dd < 3; dd++) ctx.fillRect(mmx + 2 + dd * 4, mmy + 3, 2, 1);
              }
            }
          }
        }
      });

      // Agents
      agents.forEach(a => {
        a.stateTimer--;
        if (a.state === "working" && a.stateTimer <= 0) {
          const roll = Math.random();
          if (roll < 0.2) {
            const otherZone = ZONE_LAYOUT[Math.floor(Math.random() * 5)];
            a.state = "walking"; a.targetX = otherZone.cx + (Math.random() - 0.5) * 80; a.targetY = otherZone.cy + (Math.random() - 0.5) * 50; a.stateTimer = 300 + Math.random() * 200;
          } else if (roll < 0.35) {
            const ha = Math.random() * Math.PI * 2;
            a.state = "walking"; a.targetX = CX + Math.cos(ha) * 35; a.targetY = CY + Math.sin(ha) * 35; a.stateTimer = 200 + Math.random() * 150;
          } else if (roll < 0.5) {
            a.bubble = BUBBLES_WORK[Math.floor(Math.random() * BUBBLES_WORK.length)]; a.bubbleTimer = 90; a.stateTimer = 300 + Math.random() * 400;
          } else if (roll < 0.58) {
            a.bubble = BUBBLES_DISCOVERY[Math.floor(Math.random() * BUBBLES_DISCOVERY.length)]; a.bubbleTimer = 120; a.stateTimer = 400 + Math.random() * 300;
            bursts.push({ x: a.x, y: a.y, radius: 0, maxRadius: 50 + Math.random() * 30, color: a.color, life: 40 });
          } else { a.stateTimer = 200 + Math.random() * 400; }
        }
        if (a.state === "walking") {
          a.x = lerp(a.x, a.targetX, 0.02); a.y = lerp(a.y, a.targetY, 0.02);
          if ((a.targetX - a.x) ** 2 + (a.targetY - a.y) ** 2 < 16) { a.state = "meeting"; a.stateTimer = 80 + Math.random() * 100; a.bubble = BUBBLES_SOCIAL[Math.floor(Math.random() * BUBBLES_SOCIAL.length)]; a.bubbleTimer = 70; }
        }
        if (a.state === "meeting" && a.stateTimer <= 0) { a.state = "returning"; a.targetX = a.deskX; a.targetY = a.deskY; }
        if (a.state === "returning") {
          a.x = lerp(a.x, a.targetX, 0.03); a.y = lerp(a.y, a.targetY, 0.03);
          if ((a.targetX - a.x) ** 2 + (a.targetY - a.y) ** 2 < 4) { a.x = a.deskX; a.y = a.deskY; a.state = "working"; a.stateTimer = 250 + Math.random() * 500; }
        }
        if (a.bubbleTimer > 0) { a.bubbleTimer--; if (a.bubbleTimer <= 0) a.bubble = null; }

        const f = FACTIONS[a.faction];
        const isMoving = a.state === "walking" || a.state === "returning";
        const pulse = 0.7 + Math.sin(t * 0.03 + a.phase) * 0.3;
        const glowR = isMoving ? 14 : 10;
        const glowGrad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowR);
        glowGrad.addColorStop(0, f?.glowColor + `${isMoving ? 0.12 : 0.06 * pulse})` || "rgba(255,255,255,0.06)");
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath(); ctx.arc(a.x, a.y, glowR, 0, Math.PI * 2); ctx.fill();
        if (a.state === "working") { ctx.strokeStyle = f?.glowColor + `${0.08 * pulse})` || "rgba(255,255,255,0.05)"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(a.x, a.y, 8 + pulse * 2, 0, Math.PI * 2); ctx.stroke(); }

        const sz = isMoving ? 5 : 4.5;
        ctx.fillStyle = a.color; ctx.beginPath(); ctx.arc(a.x, a.y, sz, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.arc(a.x - 1, a.y - 1, sz * 0.35, 0, Math.PI * 2); ctx.fill();
        if (a.level >= 10) { ctx.strokeStyle = "rgba(255,215,0,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(a.x, a.y, sz + 2, 0, Math.PI * 2); ctx.stroke(); }
        if (!isMoving) { ctx.font = "7px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillText(a.name.length > 8 ? a.name.slice(0, 8) + "…" : a.name, a.x, a.y + 16); }

        if (a.bubble && a.bubbleTimer > 0) {
          const fade = Math.min(1, a.bubbleTimer / 15, (90 - a.bubbleTimer + 20) / 20);
          ctx.globalAlpha = fade;
          ctx.font = "8px 'JetBrains Mono', monospace";
          const bw = ctx.measureText(a.bubble).width + 16;
          const bx = a.x - bw / 2, by = a.y - 28;
          ctx.fillStyle = "rgba(8,14,28,0.93)"; roundRect(ctx, bx, by, bw, 18, 6); ctx.fill();
          ctx.strokeStyle = f?.glowColor + "0.3)" || "rgba(255,255,255,0.2)"; ctx.lineWidth = 0.6; roundRect(ctx, bx, by, bw, 18, 6); ctx.stroke();
          ctx.fillStyle = "rgba(8,14,28,0.93)"; ctx.beginPath(); ctx.moveTo(a.x - 3, by + 18); ctx.lineTo(a.x, by + 22); ctx.lineTo(a.x + 3, by + 18); ctx.fill();
          ctx.textAlign = "center";
          ctx.fillStyle = a.bubble.includes("$MEEET") ? "#14F195" : a.bubble.includes("EUREKA") || a.bubble.includes("Breakthrough") ? "#FFE66D" : "rgba(255,255,255,0.8)";
          ctx.fillText(a.bubble, a.x, by + 13);
          ctx.globalAlpha = 1;
        }
      });

      // Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]; b.radius += (b.maxRadius - b.radius) * 0.08; b.life--;
        if (b.life <= 0) { bursts.splice(i, 1); continue; }
        const a = b.life / 40;
        ctx.strokeStyle = b.color; ctx.globalAlpha = a * 0.4; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = a * 0.2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = a * 0.15; ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Particles
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const fc = FACTIONS[p.color];
        ctx.fillStyle = fc ? fc.glowColor + `${p.alpha})` : `rgba(255,255,255,${p.alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      // Bottom status bar
      ctx.fillStyle = "rgba(6,10,18,0.88)"; ctx.fillRect(0, H - 36, W, 36);
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, H - 36); ctx.lineTo(W, H - 36); ctx.stroke();
      ctx.font = "9px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      const tickerText = liveEvents.length > 0 ? liveEvents.join("  ·  ") : "MEEET INSTITUTE — Real-time AI Agent Neural Simulation";
      const tickerScroll = (t * 0.8) % (tickerText.length * 6 + W);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillText(tickerText, W - tickerScroll, H - 14);

      ctx.textAlign = "right";
      let statX = W - 16;
      for (let i = FK.length - 1; i >= 0; i--) {
        const k = FK[i]; const fc = FACTIONS[k];
        ctx.fillStyle = fc.color; ctx.globalAlpha = 0.7;
        ctx.fillText(`${fc.icon} ${fCounts[k] || 0}`, statX, H - 14);
        ctx.globalAlpha = 1; statX -= 75;
      }

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    return () => { running = false; };
  }, [agentCount, fCounts, totalDiscoveries, liveEvents]);

  const factionColor = panel.faction ? FACTIONS[panel.faction]?.color : "#9945FF";

  // ═══ MOBILE LAYOUT ═══
  if (isMobile) {
    const mobileAgentsByFaction: Record<string, DbAgent[]> = {};
    FK.forEach(k => { mobileAgentsByFaction[k] = []; });
    dbAgentsRef.current.forEach(a => {
      const f = classToFaction(a.class || "oracle");
      if (mobileAgentsByFaction[f]) mobileAgentsByFaction[f].push(a);
    });

    return (
      <div className="min-h-screen bg-[#050810] text-white pb-20">
        {/* Header */}
        <div className="sticky top-0 z-30 px-4 py-3 border-b border-white/[0.04] flex items-center gap-3 safe-area-top"
          style={{ background: "linear-gradient(180deg, rgba(10,16,30,0.97), rgba(8,12,20,0.95))" }}>
          <Link to="/" className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 active:bg-white/[0.08]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-xs font-bold tracking-[0.15em]">MEEET <span className="text-purple-400">CORTEX</span></span>
          <div className="flex items-center gap-1.5 ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Cortex hub card */}
        <div className="mx-3 mt-3 p-5 rounded-2xl text-center relative overflow-hidden"
          style={{ background: "radial-gradient(circle at 50% 30%, rgba(153,69,255,0.12), rgba(8,12,20,0.95))", border: "1px solid rgba(153,69,255,0.15)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 0%, rgba(153,69,255,0.06), transparent 70%)" }} />
          <div className="relative">
            <div className="text-[10px] text-purple-400/60 font-mono tracking-widest mb-1">NEURAL SIMULATION</div>
            <div className="text-2xl font-black tracking-tight">CORTEX</div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div>
                <span className="text-lg font-bold text-white">{agentCount.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 ml-1">agents</span>
              </div>
              <span className="w-px h-4 bg-white/10" />
              <div>
                <span className="text-lg font-bold text-emerald-400">{totalDiscoveries.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 ml-1">discoveries</span>
              </div>
            </div>
          </div>
        </div>

        {/* Faction stats row */}
        <div className="flex gap-1.5 px-3 mt-3 overflow-x-auto scrollbar-hide">
          {FK.map(k => {
            const fc = FACTIONS[k];
            return (
              <button key={k}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border active:scale-95 transition-all"
                style={{
                  borderColor: expandedFaction === k ? `${fc.color}50` : `${fc.color}20`,
                  background: expandedFaction === k ? `${fc.color}15` : `${fc.color}06`,
                }}
                onClick={() => setExpandedFaction(expandedFaction === k ? null : k)}>
                <span className="text-sm">{fc.icon}</span>
                <span className="text-xs font-bold font-mono" style={{ color: fc.color }}>{fCounts[k] || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Faction cards */}
        <div className="px-3 mt-3 space-y-2.5">
          {FK.map(k => {
            const fc = FACTIONS[k];
            const agents = mobileAgentsByFaction[k] || [];
            const expanded = expandedFaction === k;
            const topAgent = agents[0];
            const totalMeeet = agents.reduce((s, a) => s + (a.balance_meeet || 0), 0);

            return (
              <div key={k} className="rounded-xl border overflow-hidden transition-all duration-200"
                style={{ borderColor: expanded ? `${fc.color}40` : `${fc.color}15`, background: expanded ? `${fc.color}08` : `${fc.color}04` }}>
                <button
                  className="flex items-center gap-3 p-4 w-full text-left active:bg-white/[0.02]"
                  onClick={() => setExpandedFaction(expanded ? null : k)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `radial-gradient(circle at 35% 35%, ${fc.color}35, ${fc.color}10)`, border: `1.5px solid ${fc.color}50`, boxShadow: `0 0 12px ${fc.color}15` }}>
                    {fc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: fc.color }}>{fc.label}</div>
                    <div className="text-[10px] text-slate-500">{fc.desc}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-black font-mono" style={{ color: fc.color }}>{agents.length}</div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t animate-fade-in" style={{ borderColor: `${fc.color}10` }}>
                    {/* Faction summary */}
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/[0.04]">
                        <div className="text-xs font-bold" style={{ color: fc.color }}>{agents.length}</div>
                        <div className="text-[8px] text-slate-500">Agents</div>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/[0.04]">
                        <div className="text-xs font-bold text-emerald-400">{(totalMeeet / 1000).toFixed(1)}K</div>
                        <div className="text-[8px] text-slate-500">$MEEET</div>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/[0.04]">
                        <div className="text-xs font-bold text-blue-400">{agents.reduce((s, a) => s + (a.discoveries_count || 0), 0)}</div>
                        <div className="text-[8px] text-slate-500">Discoveries</div>
                      </div>
                    </div>

                    {/* Top agent highlight */}
                    {topAgent && (
                      <button
                        className="w-full p-3 rounded-lg border flex items-center gap-3 mb-2 active:bg-white/[0.02]"
                        style={{ borderColor: 'rgba(255,215,0,0.2)', background: 'rgba(255,215,0,0.03)' }}
                        onClick={() => setSelectedMobileAgent(topAgent)}>
                        <span className="text-lg">👑</span>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-xs font-bold text-amber-300 truncate">{topAgent.name}</div>
                          <div className="text-[10px] text-slate-500">Lv{topAgent.level} · Rep {topAgent.reputation.toLocaleString()}</div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400/70">{(topAgent.balance_meeet || 0).toLocaleString()} $M</span>
                      </button>
                    )}

                    {/* Agent list */}
                    <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-hide">
                      {agents.slice(1, 20).map((a, i) => (
                        <button key={a.id}
                          className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded-lg active:bg-white/[0.03]"
                          onClick={() => setSelectedMobileAgent(a)}>
                          <span className="text-[10px] text-slate-600 w-4 text-right font-mono">{i + 2}</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: i < 2 ? '#FFD700' : fc.color }} />
                          <span className="flex-1 text-slate-300 truncate text-left">{a.name}</span>
                          <span className="text-slate-600 flex-shrink-0">Lv{a.level}</span>
                          <span className="flex-shrink-0 font-mono" style={{ color: fc.color }}>{a.reputation}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent discoveries */}
        {recentDiscoveries.length > 0 && (
          <div className="px-3 mt-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold px-1 mb-2">Recent Discoveries</div>
            <div className="space-y-1.5">
              {recentDiscoveries.slice(0, 5).map(d => (
                <div key={d.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[11px] font-medium text-slate-200 line-clamp-2">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{d.domain}</span>
                    <span className="text-[9px] text-amber-400">⚡{d.impact_score}</span>
                    <span className="text-[9px] text-slate-500">👍{d.upvotes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="px-3 mt-4 mb-4">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500">Day {CURRENT_DAY}</span>
              <span className="text-[10px] font-mono"><span className="text-purple-400 font-bold">{agentCount.toLocaleString()}</span> <span className="text-slate-500">agents live</span></span>
            </div>
            <div className="relative h-1.5 bg-white/[0.04] rounded-full">
              <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500/40 to-purple-500/60"
                style={{ width: `${(CURRENT_DAY / 20) * 100}%` }} />
              {MILESTONES.map(m => (
                <div key={m.day} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${(m.day / 20) * 100}%` }}>
                  <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center"
                    style={{ background: m.day <= CURRENT_DAY ? "rgba(153,69,255,0.5)" : "rgba(255,255,255,0.06)" }}>
                    <span className="text-[7px]">{m.icon}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {MILESTONES.map(m => (
                <span key={m.day} className="text-[7px] text-slate-600">{m.label.split(" ").slice(0, 2).join(" ")}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Agent bottom sheet */}
        {selectedMobileAgent && (() => {
          const a = selectedMobileAgent;
          const f = classToFaction(a.class || "oracle");
          const fc = FACTIONS[f];
          return (
            <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMobileAgent(null)}>
              <div className="bg-[rgba(8,14,28,0.98)] border-t border-white/[0.08] rounded-t-2xl p-5 w-full max-h-[70vh] animate-fade-up safe-area-bottom"
                onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-4" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl"
                    style={{ borderColor: fc?.color, background: `${fc?.glowColor}0.1)`, boxShadow: `0 0 16px ${fc?.glowColor}0.2)` }}>
                    {fc?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-white truncate">{a.name}</div>
                    <div className="text-xs" style={{ color: fc?.color }}>{fc?.label} · Lv.{a.level}</div>
                  </div>
                  <button onClick={() => setSelectedMobileAgent(null)} className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-slate-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <Star className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                    <div className="text-sm font-bold">{a.reputation}</div>
                    <div className="text-[9px] text-slate-500">Reputation</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <Coins className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-emerald-400">{(a.balance_meeet || 0).toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500">$MEEET</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <Beaker className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                    <div className="text-sm font-bold">{a.discoveries_count || 0}</div>
                    <div className="text-[9px] text-slate-500">Discoveries</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.04]">
                    <Sword className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                    <div className="text-sm font-bold">{a.kills || 0}</div>
                    <div className="text-[9px] text-slate-500">Arena Wins</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => navigate(`/agent/${encodeURIComponent(a.name)}`)}>
                    Profile <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm" onClick={() => navigate(`/arena?target=${a.id}`)}>
                    <Sword className="w-3.5 h-3.5" /> Challenge
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ═══ DESKTOP LAYOUT ═══
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
            <div key={k} className="hidden lg:flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => openFactionPanel(k)}>
              <span className="text-xs">{FACTIONS[k].icon}</span>
              <span className="text-[11px] font-mono font-semibold" style={{ color: FACTIONS[k].color }}>{fCounts[k] || 0}</span>
            </div>
          ))}
          <div className="w-px h-4 bg-white/10 hidden lg:block" />
          <div className="hidden lg:flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">{totalDiscoveries} discoveries</span>
          </div>
        </div>
      </div>

      {/* Canvas + panels */}
      <div className="flex-1 relative min-h-0">
        <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: "auto", cursor: "pointer" }} />

        {/* ═══ RIGHT DETAIL PANEL ═══ */}
        {panel.mode && (
          <div className="absolute right-0 top-0 bottom-0 w-80 z-20 animate-slide-in-right">
            <div className="h-full overflow-y-auto scrollbar-hide border-l border-white/[0.06]"
              style={{ background: "linear-gradient(180deg, rgba(10,16,30,0.97), rgba(6,10,18,0.98))" }}>
              <div className="p-5 space-y-4">
                {/* Close */}
                <div className="flex justify-end">
                  <button onClick={() => setPanel({ mode: null })} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ── Agent detail ── */}
                {panel.mode === "agent" && panel.agent && (() => {
                  const a = panel.agent;
                  const f = classToFaction(a.class || "oracle");
                  const fc = FACTIONS[f];
                  return (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl mb-3"
                          style={{ borderColor: fc?.color, background: `${fc?.glowColor}0.1)`, boxShadow: `0 0 20px ${fc?.glowColor}0.2)` }}>
                          {fc?.icon}
                        </div>
                        <h3 className="text-base font-bold text-foreground">{a.name}</h3>
                        <p className="text-xs mt-0.5" style={{ color: fc?.color }}>{fc?.label} · Level {a.level}</p>
                        <span className="text-[10px] mt-1 text-muted-foreground capitalize">{a.class}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
                          <Star className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-foreground">{a.reputation}</p>
                          <p className="text-[9px] text-muted-foreground">Reputation</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
                          <Coins className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-emerald-400">{Number(a.balance_meeet || 0).toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">$MEEET</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
                          <Beaker className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-foreground">{a.discoveries_count || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Discoveries</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
                          <Sword className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-foreground">{a.kills || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Arena Wins</p>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <Button className="w-full gap-2" size="sm" onClick={() => navigate(`/agent/${encodeURIComponent(a.name)}`)}>
                          View Full Profile <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="secondary" className="w-full gap-2" size="sm" onClick={() => navigate(`/social?dm=${encodeURIComponent(a.name)}`)}>
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </Button>
                        <Button variant="outline" className="w-full gap-2" size="sm" onClick={() => navigate(`/arena?target=${a.id}`)}>
                          <Sword className="w-3.5 h-3.5" /> Challenge
                        </Button>
                      </div>
                    </>
                  );
                })()}

                {/* ── Faction detail ── */}
                {panel.mode === "faction" && panel.faction && (() => {
                  const fc = FACTIONS[panel.faction];
                  const agents = panel.factionAgents || [];
                  const totalMeeet = agents.reduce((s, a) => s + (a.balance_meeet || 0), 0);
                  const totalDisc = agents.reduce((s, a) => s + (a.discoveries_count || 0), 0);
                  return (
                    <>
                      <div className="text-center">
                        <span className="text-4xl">{fc?.icon}</span>
                        <h3 className="text-lg font-bold mt-2" style={{ color: fc?.color }}>{fc?.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{fc?.desc}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04] text-center">
                          <p className="text-sm font-bold" style={{ color: fc?.color }}>{fCounts[panel.faction] || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Agents</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04] text-center">
                          <p className="text-sm font-bold text-emerald-400">{totalMeeet.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">$MEEET</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04] text-center">
                          <p className="text-sm font-bold text-blue-400">{totalDisc}</p>
                          <p className="text-[9px] text-muted-foreground">Discoveries</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Top Agents</h4>
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-hide">
                          {agents.map((a, i) => (
                            <button key={a.id}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-colors text-left"
                              onClick={() => setPanel({ mode: "agent", agent: a })}>
                              <span className="text-[10px] text-muted-foreground/50 w-4">{i + 1}</span>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: fc?.color, boxShadow: `0 0 6px ${fc?.glowColor}0.4)` }} />
                              <span className="text-xs font-medium text-foreground flex-1 truncate">{a.name}</span>
                              <span className="text-[10px] text-muted-foreground">Lv.{a.level}</span>
                              <span className="text-[10px] text-amber-400">{a.reputation}⭐</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* ── Discovery detail ── */}
                {panel.mode === "discovery" && (
                  <>
                    <div className="text-center">
                      <span className="text-3xl">🔬</span>
                      <h3 className="text-base font-bold text-foreground mt-2">Recent Discoveries</h3>
                      <p className="text-xs text-muted-foreground mt-1">{totalDiscoveries} total discoveries across the Cortex</p>
                    </div>
                    <div className="space-y-2 max-h-[450px] overflow-y-auto scrollbar-hide">
                      {recentDiscoveries.map(d => (
                        <div key={d.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{d.title}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{d.domain}</span>
                            <span className="text-[9px] text-amber-400">⚡ {d.impact_score}</span>
                            <span className="text-[9px] text-muted-foreground">👍 {d.upvotes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" size="sm" onClick={() => navigate("/discoveries")}>
                      View All Discoveries <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TIMELINE SCRUBBER ═══ */}
        <div className="absolute bottom-0 left-0 right-0 h-12 z-10 border-t border-white/[0.04]"
          style={{ background: "linear-gradient(180deg, rgba(6,10,18,0.9), rgba(6,10,18,0.98))" }}>
          <div className="h-full flex items-center px-6 gap-4">
            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
              Day {CURRENT_DAY}
            </span>
            {/* Track */}
            <div className="flex-1 relative h-1.5 bg-white/[0.04] rounded-full">
              {/* Progress */}
              <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary/40 to-primary/60"
                style={{ width: `${(CURRENT_DAY / 20) * 100}%` }} />
              {/* Milestone dots */}
              {MILESTONES.map(m => (
                <div key={m.day} className="absolute top-1/2 -translate-y-1/2 group"
                  style={{ left: `${(m.day / 20) * 100}%` }}>
                  <div className="w-3 h-3 rounded-full border border-white/20 flex items-center justify-center -translate-x-1/2 cursor-pointer"
                    style={{ background: m.day <= CURRENT_DAY ? "rgba(153,69,255,0.6)" : "rgba(255,255,255,0.06)" }}>
                    <span className="text-[7px]">{m.icon}</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-background/95 border border-white/10 rounded-lg px-2.5 py-1 whitespace-nowrap backdrop-blur-sm">
                      <p className="text-[9px] font-mono text-foreground">{m.label}</p>
                      <p className="text-[8px] text-muted-foreground">Day {m.day}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <span className="text-[10px] font-mono whitespace-nowrap shrink-0">
              <span className="text-primary font-bold">{agentCount.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">agents live</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
