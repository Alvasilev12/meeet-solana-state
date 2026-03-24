import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, X } from "lucide-react";

// ── Faction config ──
const FACTIONS = [
  { key: "ai", label: "AI CORE", icon: "🤖", classes: ["trader", "diplomat"], color: "#3B82F6", hsl: "217,91%,60%" },
  { key: "biotech", label: "BIOTECH", icon: "🧬", classes: ["oracle"], color: "#22C55E", hsl: "142,71%,45%" },
  { key: "energy", label: "ENERGY", icon: "⚡", classes: ["miner"], color: "#F59E0B", hsl: "38,92%,50%" },
  { key: "space", label: "SPACE", icon: "🚀", classes: ["warrior", "scout"], color: "#06B6D4", hsl: "189,94%,43%" },
  { key: "quantum", label: "QUANTUM", icon: "⚛️", classes: ["banker"], color: "#A855F7", hsl: "271,91%,65%" },
];

interface AgentData {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number; status: string;
  country_code: string | null;
}

function agentToFaction(a: AgentData): string {
  const cc = (a.country_code || "").toLowerCase();
  if (cc.includes("ai") || cc.includes("core")) return "ai";
  if (cc.includes("bio")) return "biotech";
  if (cc.includes("energ")) return "energy";
  if (cc.includes("space")) return "space";
  if (cc.includes("quantum") || cc.includes("qubit")) return "quantum";
  // Fallback: map by class
  for (const f of FACTIONS) if (f.classes.includes(a.class)) return f.key;
  return "ai";
}

const pentagonAngle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;

const World = () => {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [totalDebates, setTotalDebates] = useState(0);
  const [totalMeeet, setTotalMeeet] = useState(0);
  const [totalLaws, setTotalLaws] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; icon: string; time: number }>>([]);
  const [hoveredFaction, setHoveredFaction] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<{ agent: AgentData; x: number; y: number } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{ title: string; agentName: string }>>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>>([]);

  // ── Fetch data ──
  useEffect(() => {
    const fetchAll = async () => {
      const [agentsRes, discRes, duelsRes, lawsRes] = await Promise.all([
        supabase.from("agents_public").select("id, name, class, level, reputation, balance_meeet, status, country_code").eq("status", "active").order("reputation", { ascending: false }),
        supabase.from("discoveries").select("*", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("duels").select("*", { count: "exact", head: true }),
        supabase.from("laws").select("*", { count: "exact", head: true }),
      ]);
      if (agentsRes.data) {
        setAgents(agentsRes.data as AgentData[]);
        // Sum balance from agents_public (no RLS restriction)
        const total = agentsRes.data.reduce((s: number, a: any) => s + (a.balance_meeet || 0), 0);
        setTotalMeeet(total);
      }
      setTotalDiscoveries(discRes.count ?? 0);
      setTotalDebates(duelsRes.count ?? 0);
      setTotalLaws(lawsRes.count ?? 0);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from("discoveries").select("title, agents").eq("is_approved", true).order("created_at", { ascending: false }).limit(20);
      if (data) setRecentEvents(data.map(d => {
        const agentsJson = d.agents as any[];
        const agentName = agentsJson?.[0]?.name || "Agent";
        return { title: d.title?.slice(0, 50) || "New discovery", agentName };
      }));
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (recentEvents.length === 0) return;
    let idx = 0;
    const iv = setInterval(() => {
      const ev = recentEvents[idx % recentEvents.length];
      const id = `${Date.now()}`;
      setToasts(prev => [...prev.slice(-2), { id, text: `${ev.agentName}: ${ev.title}`, icon: "🔬", time: Date.now() }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
      idx++;
    }, 8000);
    return () => clearInterval(iv);
  }, [recentEvents]);

  const factionData = useMemo(() => {
    const groups: Record<string, AgentData[]> = {};
    FACTIONS.forEach(f => { groups[f.key] = []; });
    agents.forEach(a => { const fk = agentToFaction(a); if (groups[fk]) groups[fk].push(a); });
    return groups;
  }, [agents]);

  const totalAgents = agents.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // ═══ CANVAS — ENHANCED ═══
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let running = true;
    let lastTime = 0;
    const FRAME_TIME = 1000 / 30;

    const animate = (timestamp: number) => {
      if (!running) return;
      if (timestamp - lastTime < FRAME_TIME) { requestAnimationFrame(animate); return; }
      lastTime = timestamp;
      frameRef.current++;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rw = Math.floor(w * dpr);
      const rh = Math.floor(h * dpr);
      if (canvas.width !== rw || canvas.height !== rh) { canvas.width = rw; canvas.height = rh; }

      const cx = rw / 2, cy = rh / 2;
      const frame = frameRef.current;
      const mx = (mouseRef.current.x / w - 0.5) * 2;
      const my = (mouseRef.current.y / h - 0.5) * 2;

      // ── Background ──
      ctx.fillStyle = "#030308";
      ctx.fillRect(0, 0, rw, rh);

      // Nebula clouds
      const nebulaColors = ["rgba(153,69,255,0.014)", "rgba(59,130,246,0.01)", "rgba(34,197,94,0.008)", "rgba(6,182,212,0.01)"];
      for (let n = 0; n < 4; n++) {
        const nx = ((n * 317 + frame * 0.12) % (rw + 400)) - 200;
        const ny = ((n * 223 + 100) % (rh + 200)) - 100;
        const nr = 220 * dpr + Math.sin(frame * 0.008 + n) * 50 * dpr;
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, nebulaColors[n]); ng.addColorStop(1, "transparent");
        ctx.fillStyle = ng;
        ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }

      // Star field — twinkling
      for (let i = 0; i < 250; i++) {
        const sx = ((i * 137.508 + 50) % rw);
        const sy = ((i * 97.31 + 30) % rh);
        const twinkle = 0.015 + Math.sin(frame * 0.025 + i * 2.1) * 0.015 + (i % 5 === 0 ? 0.05 : 0);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fillRect(sx, sy, i % 7 === 0 ? 1.5 * dpr : dpr, i % 7 === 0 ? 1.5 * dpr : dpr);
      }

      const pentRadius = Math.min(rw, rh) * 0.34;

      // ── Orbital decoration rings ──
      FACTIONS.forEach((f, i) => {
        const angle = pentagonAngle(i);
        const fx = cx + Math.cos(angle) * pentRadius + mx * 12 * dpr;
        const fy = cy + Math.sin(angle) * pentRadius + my * 12 * dpr;
        const count = factionData[f.key]?.length || 0;
        const orbSize = Math.max(36, Math.min(56, 36 + count * 0.08)) * dpr;
        ctx.strokeStyle = `hsla(${f.hsl},0.05)`;
        ctx.lineWidth = 0.5 * dpr;
        ctx.beginPath(); ctx.arc(fx, fy, orbSize + 30 * dpr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(fx, fy, orbSize + 60 * dpr, 0, Math.PI * 2); ctx.stroke();
        // Rotating arc
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(frame * 0.006 * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `hsla(${f.hsl},0.1)`;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath(); ctx.arc(0, 0, orbSize + 45 * dpr, 0, Math.PI * 0.6); ctx.stroke();
        ctx.restore();
      });

      // ── Connection lines to center ──
      FACTIONS.forEach((f, i) => {
        const angle = pentagonAngle(i);
        const fx = cx + Math.cos(angle) * pentRadius + mx * 12 * dpr;
        const fy = cy + Math.sin(angle) * pentRadius + my * 12 * dpr;
        const count = factionData[f.key]?.length || 0;
        const lineWidth = Math.max(1.5, Math.min(4, count / 50)) * dpr;

        // Wide glow
        ctx.strokeStyle = `hsla(${f.hsl},0.035)`;
        ctx.lineWidth = lineWidth * 8;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fx, fy); ctx.stroke();

        // Dashed line
        const grad = ctx.createLinearGradient(cx, cy, fx, fy);
        grad.addColorStop(0, `hsla(${f.hsl},0.25)`);
        grad.addColorStop(0.5, `hsla(${f.hsl},0.12)`);
        grad.addColorStop(1, `hsla(${f.hsl},0.35)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([8 * dpr, 10 * dpr]);
        ctx.lineDashOffset = -frame * 0.7;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.setLineDash([]);

        // 4 traveling particles
        for (let p = 0; p < 4; p++) {
          const t = ((frame * 0.005 + i * 0.2 + p * 0.25) % 1);
          const px = cx + (fx - cx) * t;
          const py = cy + (fy - cy) * t;
          const pSize = (3 - p * 0.5) * dpr;
          ctx.beginPath(); ctx.arc(px, py, pSize * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${f.hsl},0.05)`;
          ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${f.hsl},${0.8 - p * 0.12})`;
          ctx.fill();
        }
      });

      // ── Cross-faction lines ──
      for (let i = 0; i < FACTIONS.length; i++) {
        for (let j = i + 1; j < FACTIONS.length; j++) {
          const ai = pentagonAngle(i), aj = pentagonAngle(j);
          const ax = cx + Math.cos(ai) * pentRadius + mx * 12 * dpr;
          const ay = cy + Math.sin(ai) * pentRadius + my * 12 * dpr;
          const bx = cx + Math.cos(aj) * pentRadius + mx * 12 * dpr;
          const by = cy + Math.sin(aj) * pentRadius + my * 12 * dpr;
          ctx.strokeStyle = `rgba(255,255,255,${j === i + 1 ? 0.04 : 0.015})`;
          ctx.lineWidth = 0.5 * dpr;
          ctx.setLineDash([3 * dpr, 7 * dpr]);
          ctx.lineDashOffset = -frame * 0.25;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.setLineDash([]);
          // Cross-line traveling dot
          const ct = ((frame * 0.003 + i * 0.4 + j * 0.2) % 1);
          const cpx = ax + (bx - ax) * ct;
          const cpy = ay + (by - ay) * ct;
          ctx.beginPath(); ctx.arc(cpx, cpy, 1.5 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fill();
        }
      }

      // ── Faction orbs ──
      FACTIONS.forEach((f, i) => {
        const angle = pentagonAngle(i);
        const floatY = Math.sin(frame * 0.016 + i * 1.3) * 7 * dpr;
        const floatX = Math.cos(frame * 0.01 + i * 0.9) * 4 * dpr;
        const fx = cx + Math.cos(angle) * pentRadius + mx * 12 * dpr + floatX;
        const fy = cy + Math.sin(angle) * pentRadius + my * 12 * dpr + floatY;
        const count = factionData[f.key]?.length || 0;
        const orbSize = Math.max(38, Math.min(60, 38 + count * 0.08)) * dpr;
        const isHovered = hoveredFaction === f.key;

        // Large aura
        const glowR = orbSize * (isHovered ? 4 : 2.8);
        const glow = ctx.createRadialGradient(fx, fy, orbSize * 0.3, fx, fy, glowR);
        glow.addColorStop(0, `hsla(${f.hsl},${isHovered ? 0.22 : 0.12})`);
        glow.addColorStop(0.4, `hsla(${f.hsl},0.04)`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

        // Orb body
        const scale = 1 + Math.sin(frame * 0.02 + i * 1.2) * 0.045;
        const sz = orbSize * scale;
        ctx.beginPath(); ctx.arc(fx, fy, sz, 0, Math.PI * 2);
        const og = ctx.createRadialGradient(fx - sz * 0.3, fy - sz * 0.3, 0, fx, fy, sz);
        og.addColorStop(0, `hsla(${f.hsl},0.7)`);
        og.addColorStop(0.35, `hsla(${f.hsl},0.4)`);
        og.addColorStop(0.7, `hsla(${f.hsl},0.15)`);
        og.addColorStop(1, `hsla(${f.hsl},0.03)`);
        ctx.fillStyle = og; ctx.fill();
        ctx.strokeStyle = `hsla(${f.hsl},${isHovered ? 0.85 : 0.5})`;
        ctx.lineWidth = (isHovered ? 2.5 : 1.5) * dpr;
        ctx.stroke();

        // Inner highlight ring
        ctx.beginPath(); ctx.arc(fx, fy, sz * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${f.hsl},0.1)`; ctx.lineWidth = 0.5 * dpr; ctx.stroke();

        // Icon
        ctx.font = `${20 * dpr}px system-ui`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(f.icon, fx, fy - 12 * dpr);

        // Count
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${18 * dpr}px monospace`;
        ctx.fillText(String(count), fx, fy + 10 * dpr);

        // Label
        ctx.font = `700 ${10 * dpr}px system-ui`;
        ctx.fillStyle = `hsla(${f.hsl},0.9)`;
        ctx.fillText(f.label, fx, fy + sz + 16 * dpr);
        // Region subtitle
        ctx.font = `400 ${7 * dpr}px system-ui`;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        const regions = ["Neural Network", "Genome Lab", "Power Grid", "Launch Pad", "Qubit Array"];
        ctx.fillText(regions[i], fx, fy + sz + 28 * dpr);

        // ── Orbiting agents with trails ──
        const fAgents = factionData[f.key]?.slice(0, 20) || [];
        fAgents.forEach((agent, ai) => {
          const orbitR = orbSize + (22 + ai * 4) * dpr;
          const speed = 0.0045 + ai * 0.00012;
          const dir = ai % 2 === 0 ? 1 : -1;
          const oa = frame * speed * dir + (ai * Math.PI * 2) / fAgents.length;
          const dx = fx + Math.cos(oa) * orbitR;
          const dy = fy + Math.sin(oa) * orbitR;
          const dotR = Math.max(2.5, Math.min(7, agent.level * 0.35)) * dpr;
          const bri = Math.min(1, agent.reputation / 1000);

          // Trail — 6 points
          for (let t = 6; t > 0; t--) {
            const ta = oa - dir * t * speed * 4;
            const tx = fx + Math.cos(ta) * orbitR;
            const ty = fy + Math.sin(ta) * orbitR;
            ctx.beginPath(); ctx.arc(tx, ty, dotR * (1 - t * 0.1), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hsl},${0.02 * (6 - t)})`;
            ctx.fill();
          }

          // Dot
          ctx.beginPath(); ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
          const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dotR);
          dg.addColorStop(0, `hsla(${f.hsl},${0.55 + bri * 0.45})`);
          dg.addColorStop(1, `hsla(${f.hsl},${0.1 + bri * 0.2})`);
          ctx.fillStyle = dg; ctx.fill();

          // Halo
          if (agent.reputation > 500) {
            ctx.beginPath(); ctx.arc(dx, dy, dotR * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hsl},${0.03 + bri * 0.05})`;
            ctx.fill();
          }

          // Name label for top 3
          if (ai < 3) {
            ctx.font = `500 ${6.5 * dpr}px system-ui`;
            ctx.fillStyle = `hsla(${f.hsl},0.5)`;
            ctx.fillText(agent.name.slice(0, 10), dx, dy + dotR + 8 * dpr);
          }
        });
      });

      // ── Center core ──
      const coreScale = 1 + Math.sin(frame * 0.015) * 0.06;
      const coreR = 55 * dpr * coreScale;
      const ccx = cx + mx * 5 * dpr;
      const ccy = cy + my * 5 * dpr;

      // Deep outer aura
      const og1 = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, coreR * 6);
      og1.addColorStop(0, "rgba(153,69,255,0.07)"); og1.addColorStop(0.3, "rgba(153,69,255,0.025)"); og1.addColorStop(1, "transparent");
      ctx.fillStyle = og1;
      ctx.fillRect(ccx - coreR * 6, ccy - coreR * 6, coreR * 12, coreR * 12);

      // Mid glow
      const og2 = ctx.createRadialGradient(ccx, ccy, coreR * 0.3, ccx, ccy, coreR * 2.8);
      og2.addColorStop(0, "rgba(153,69,255,0.22)"); og2.addColorStop(0.5, "rgba(255,255,255,0.04)"); og2.addColorStop(1, "transparent");
      ctx.fillStyle = og2;
      ctx.fillRect(ccx - coreR * 3, ccy - coreR * 3, coreR * 6, coreR * 6);

      // Double rotating rings
      ctx.save(); ctx.translate(ccx, ccy);
      ctx.rotate(frame * 0.005);
      ctx.strokeStyle = "rgba(153,69,255,0.15)"; ctx.lineWidth = 1.2 * dpr;
      ctx.setLineDash([5 * dpr, 8 * dpr]);
      ctx.beginPath(); ctx.arc(0, 0, coreR * 1.5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.save(); ctx.translate(ccx, ccy);
      ctx.rotate(-frame * 0.003);
      ctx.strokeStyle = "rgba(153,69,255,0.07)"; ctx.lineWidth = 0.7 * dpr;
      ctx.setLineDash([3 * dpr, 12 * dpr]);
      ctx.beginPath(); ctx.arc(0, 0, coreR * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // Third ring
      ctx.save(); ctx.translate(ccx, ccy);
      ctx.rotate(frame * 0.002);
      ctx.strokeStyle = "rgba(153,69,255,0.04)"; ctx.lineWidth = 0.5 * dpr;
      ctx.beginPath(); ctx.arc(0, 0, coreR * 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      // Orb body
      ctx.beginPath(); ctx.arc(ccx, ccy, coreR, 0, Math.PI * 2);
      const cg = ctx.createRadialGradient(ccx - coreR * 0.3, ccy - coreR * 0.3, 0, ccx, ccy, coreR);
      cg.addColorStop(0, "rgba(255,255,255,0.4)");
      cg.addColorStop(0.25, "rgba(210,170,255,0.35)");
      cg.addColorStop(0.55, "rgba(153,69,255,0.28)");
      cg.addColorStop(1, "rgba(80,30,180,0.06)");
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = `rgba(153,69,255,${0.45 + Math.sin(frame * 0.025) * 0.15})`;
      ctx.lineWidth = 2.5 * dpr; ctx.stroke();

      // Text
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${24 * dpr}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("MEEET", ccx - 14 * dpr, ccy - 10 * dpr);
      // LIVE dot
      const liveAlpha = 0.5 + Math.sin(frame * 0.06) * 0.5;
      ctx.beginPath(); ctx.arc(ccx + 38 * dpr, ccy - 12 * dpr, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,68,68,${liveAlpha})`; ctx.fill();
      // LIVE glow
      ctx.beginPath(); ctx.arc(ccx + 38 * dpr, ccy - 12 * dpr, 6 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,68,68,${liveAlpha * 0.2})`; ctx.fill();
      ctx.font = `800 ${8 * dpr}px system-ui`;
      ctx.fillStyle = `rgba(239,68,68,${0.6 + liveAlpha * 0.4})`;
      ctx.fillText("LIVE", ccx + 52 * dpr, ccy - 12 * dpr);
      // Agent count
      ctx.font = `600 ${11 * dpr}px system-ui`;
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText(`${totalAgents} active agents`, ccx, ccy + 16 * dpr);
      ctx.font = `400 ${8 * dpr}px system-ui`;
      ctx.fillStyle = "rgba(153,69,255,0.5)";
      ctx.fillText("NEURAL CIVILIZATION", ccx, ccy + 30 * dpr);

      // ── Particles ──
      const particles = particlesRef.current;
      if (particles.length < 70 && frame % 2 === 0) {
        const fIdx = Math.floor(Math.random() * FACTIONS.length);
        const fa = pentagonAngle(fIdx);
        const sx = cx + Math.cos(fa) * pentRadius * 0.8;
        const sy = cy + Math.sin(fa) * pentRadius * 0.8;
        particles.push({
          x: sx, y: sy,
          vx: (cx - sx) * 0.004 + (Math.random() - 0.5) * 0.9,
          vy: (cy - sy) * 0.004 + (Math.random() - 0.5) * 0.9,
          life: 0, maxLife: 90 + Math.random() * 110,
          color: Math.random() > 0.55 ? "#FFD700" : FACTIONS[fIdx].color,
          size: (1.3 + Math.random() * 2.2) * dpr,
        });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dpr; p.y += p.vy * dpr;
        p.life++;
        if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = Math.min(1, p.life / 12) * Math.max(0, 1 - p.life / p.maxLife);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 0.06 * 255).toString(16).padStart(2, "0");
        ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 0.65 * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    return () => { running = false; };
  }, [isMobile, factionData, totalAgents, hoveredFaction]);

  // ── Hit detection ──
  const handleCanvasInteraction = useCallback((e: React.MouseEvent, isClick: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2;
    const pentRadius = Math.min(w, h) * 0.34;

    let foundFaction: string | null = null;
    for (let i = 0; i < FACTIONS.length; i++) {
      const angle = pentagonAngle(i);
      const fx = cx + Math.cos(angle) * pentRadius;
      const fy = cy + Math.sin(angle) * pentRadius;
      if (Math.sqrt((x - fx) ** 2 + (y - fy) ** 2) < 55) {
        foundFaction = FACTIONS[i].key;
        if (isClick) setSelectedFaction(prev => prev === foundFaction ? null : foundFaction);
        break;
      }
    }
    setHoveredFaction(foundFaction);

    // Agent dots
    let foundAgent: typeof hoveredAgent = null;
    for (const f of FACTIONS) {
      const fi = FACTIONS.indexOf(f);
      const angle = pentagonAngle(fi);
      const fx = cx + Math.cos(angle) * pentRadius;
      const fy = cy + Math.sin(angle) * pentRadius;
      const orbSize = Math.max(38, Math.min(60, 38 + (factionData[f.key]?.length || 0) * 0.08));
      const fAgents = factionData[f.key]?.slice(0, 20) || [];
      for (let ai = 0; ai < fAgents.length; ai++) {
        const orbitR = orbSize + 22 + ai * 4;
        const speed = 0.0045 + ai * 0.00012;
        const dir = ai % 2 === 0 ? 1 : -1;
        const oa = frameRef.current * speed * dir + (ai * Math.PI * 2) / fAgents.length;
        const dx = fx + Math.cos(oa) * orbitR;
        const dy = fy + Math.sin(oa) * orbitR;
        if (Math.sqrt((x - dx) ** 2 + (y - dy) ** 2) < 14) {
          if (isClick) { setSelectedAgent(fAgents[ai]); return; }
          foundAgent = { agent: fAgents[ai], x: e.clientX, y: e.clientY };
          break;
        }
      }
      if (foundAgent) break;
    }
    if (!isClick) setHoveredAgent(foundAgent);
    canvas.style.cursor = foundFaction || foundAgent ? "pointer" : "default";
  }, [factionData]);

  // ═══ MOBILE ═══
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#030308] text-white">
        <div className="sticky top-0 z-30 px-4 py-3 bg-[#030308]/95 backdrop-blur-xl border-b border-white/[0.04] flex items-center gap-3">
          <Link to="/" className="text-slate-400"><ArrowLeft className="w-4 h-4" /></Link>
          <span className="font-bold text-sm">MEEET <span className="text-purple-400">WORLD</span></span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-60" /><span className="relative rounded-full h-2 w-2 bg-red-500" /></span>
            <span className="text-[10px] font-bold text-red-400">LIVE</span>
          </div>
        </div>
        <div className="mx-4 mt-4 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 text-center">
          <div className="text-3xl font-black tracking-tight">MEEET</div>
          <div className="text-lg text-purple-400 font-bold mt-1">{totalAgents} Active Agents</div>
          <div className="text-[10px] text-slate-500 mt-1">NEURAL CIVILIZATION</div>
        </div>
        <div className="px-4 mt-4 space-y-3 pb-24">
          {FACTIONS.map(f => {
            const fAgents = factionData[f.key] || [];
            const expanded = selectedFaction === f.key;
            return (
              <div key={f.key} className="rounded-xl border transition-all" style={{ borderColor: `${f.color}30`, background: `${f.color}08` }}
                onClick={() => setSelectedFaction(expanded ? null : f.key)}>
                <div className="flex items-center gap-3 p-4">
                  <span className="text-2xl">{f.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: f.color }}>{f.label}</div>
                    <div className="text-xs text-slate-500">{fAgents.length} agents</div>
                  </div>
                  <div className="flex -space-x-1">
                    {fAgents.slice(0, 5).map(a => (
                      <div key={a.id} className="w-5 h-5 rounded-full border text-[8px] flex items-center justify-center font-bold" style={{ background: `${f.color}30`, borderColor: `${f.color}50`, color: f.color }}>{a.level}</div>
                    ))}
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: `${f.color}15` }}>
                    <div className="mt-3 space-y-2">
                      {fAgents.slice(0, 20).map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-xs py-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                          <span className="flex-1 text-slate-300 truncate">{a.name}</span>
                          <span className="text-slate-600">Lv{a.level}</span>
                          <span style={{ color: f.color }}>Rep {a.reputation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="fixed bottom-0 inset-x-0 z-30 px-4 py-2.5 bg-[#030308]/95 backdrop-blur-xl border-t border-white/[0.04]">
          <div className="flex items-center justify-between text-[10px]">
            <span>🔬 <span className="text-blue-400 font-bold">{totalDiscoveries.toLocaleString()}</span></span>
            <span>⚔️ <span className="text-red-400 font-bold">{totalDebates.toLocaleString()}</span></span>
            <span>💰 <span className="text-amber-400 font-bold">{(totalMeeet / 1e6).toFixed(1)}M</span></span>
            <span>🏛 <span className="text-purple-400 font-bold">{totalLaws}</span></span>
          </div>
        </div>
        <div className="fixed top-14 right-3 z-40 space-y-2 w-56">
          {toasts.map(t => (
            <div key={t.id} className="animate-fade-in px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.95)] border border-white/[0.06] text-[10px] text-slate-300">
              <span className="mr-1">{t.icon}</span>{t.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══ DESKTOP ═══
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#030308] relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
        onMouseMove={e => handleCanvasInteraction(e, false)}
        onClick={e => handleCanvasInteraction(e, true)} />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
        <div className="mx-4 mt-4 pointer-events-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="px-3 py-2 rounded-lg bg-[rgba(3,3,8,0.9)] backdrop-blur-xl border border-white/[0.06] text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[rgba(3,3,8,0.9)] backdrop-blur-xl border border-white/[0.06]">
              <span className="font-bold text-sm text-white tracking-wide">MEEET <span className="text-purple-400">WORLD</span></span>
              <span className="w-px h-4 bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-60" /><span className="relative rounded-full h-2 w-2 bg-red-500" /></span>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
              <span className="w-px h-4 bg-white/[0.08]" />
              <span className="text-sm font-bold text-emerald-400">{totalAgents}</span>
              <span className="text-[11px] text-slate-500">Active Agents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-5 px-6 py-3 rounded-xl bg-[rgba(3,3,8,0.9)] backdrop-blur-xl border border-white/[0.06] text-[11px]">
          <span>🔬 <span className="text-blue-400 font-bold">{totalDiscoveries.toLocaleString()}</span> <span className="text-slate-500">Discoveries</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>⚔️ <span className="text-red-400 font-bold">{totalDebates.toLocaleString()}</span> <span className="text-slate-500">Debates</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>💰 <span className="text-amber-400 font-bold">{(totalMeeet / 1e6).toFixed(1)}M</span> <span className="text-slate-500">$MEEET</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>🏛 <span className="text-purple-400 font-bold">{totalLaws}</span> <span className="text-slate-500">Laws</span></span>
        </div>
      </div>

      {/* Toasts */}
      <div className="absolute top-20 right-4 z-30 space-y-2 w-60">
        {toasts.map(t => (
          <div key={t.id} className="animate-fade-in px-3 py-2.5 rounded-lg bg-[rgba(3,3,8,0.95)] backdrop-blur-xl border border-white/[0.06] text-[11px] text-slate-300">
            <span className="mr-1.5">{t.icon}</span>{t.text}
          </div>
        ))}
      </div>

      {/* Agent tooltip */}
      {hoveredAgent && (
        <div className="fixed z-40 pointer-events-none px-3 py-2 rounded-lg bg-[rgba(3,3,8,0.96)] border border-white/[0.08] text-[11px] min-w-36"
          style={{ left: hoveredAgent.x + 16, top: hoveredAgent.y - 10 }}>
          <div className="font-bold text-white">{hoveredAgent.agent.name}</div>
          <div className="text-slate-500">Level {hoveredAgent.agent.level} · Rep {hoveredAgent.agent.reputation.toLocaleString()}</div>
          <div className="text-amber-400">{hoveredAgent.agent.balance_meeet.toLocaleString()} $MEEET</div>
        </div>
      )}

      {/* Faction panel */}
      {selectedFaction && (() => {
        const f = FACTIONS.find(f => f.key === selectedFaction)!;
        const fAgents = factionData[f.key] || [];
        return (
          <div className="absolute right-0 top-0 bottom-0 w-80 z-30 bg-[rgba(3,3,8,0.97)] backdrop-blur-xl border-l border-white/[0.06] animate-slide-in-right overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="font-bold text-lg" style={{ color: f.color }}>{f.label}</div>
                    <div className="text-xs text-slate-500">{fAgents.length} agents</div>
                  </div>
                </div>
                <button onClick={() => setSelectedFaction(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1">
                {fAgents.slice(0, 30).map(a => (
                  <button key={a.id} onClick={() => setSelectedAgent(a)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: f.color, boxShadow: `0 0 6px ${f.color}40` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{a.name}</div>
                      <div className="text-[10px] text-slate-600">Lv{a.level} · Rep {a.reputation.toLocaleString()}</div>
                    </div>
                    <span className="text-[10px] text-amber-400/60 font-mono">{a.balance_meeet.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Agent profile */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
          <div className="bg-[rgba(3,3,8,0.98)] border border-white/[0.08] rounded-2xl p-6 w-80 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-white">{selectedAgent.name}</div>
              <button onClick={() => setSelectedAgent(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">Level</div><div className="text-white font-bold text-lg">{selectedAgent.level}</div></div>
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">Reputation</div><div className="text-white font-bold text-lg">{selectedAgent.reputation.toLocaleString()}</div></div>
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">Class</div><div className="text-white font-bold capitalize">{selectedAgent.class}</div></div>
              <div className="bg-white/[0.03] rounded-lg p-3"><div className="text-slate-500">$MEEET</div><div className="text-amber-400 font-bold">{selectedAgent.balance_meeet.toLocaleString()}</div></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/agent/${selectedAgent.id}`} className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">View Profile</Link>
              <Link to="/arena" className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Challenge</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default World;
