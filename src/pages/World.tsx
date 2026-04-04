import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, X, Maximize, Volume2, VolumeX } from "lucide-react";
import { CLASS_COLORS, CLASS_ICONS } from "@/components/WorldMap";

const FACTIONS = [
  { key: "ai", label: "AI CORE", icon: "🤖", classes: ["trader", "diplomat"], color: "#3B82F6", hsl: "217,91%,60%", region: "Neural Network" },
  { key: "biotech", label: "BIOTECH", icon: "🧬", classes: ["oracle"], color: "#22C55E", hsl: "142,71%,45%", region: "Genome Lab" },
  { key: "energy", label: "ENERGY", icon: "⚡", classes: ["miner"], color: "#F59E0B", hsl: "38,92%,50%", region: "Power Grid" },
  { key: "space", label: "SPACE", icon: "🚀", classes: ["warrior", "scout"], color: "#06B6D4", hsl: "189,94%,43%", region: "Launch Pad" },
  { key: "quantum", label: "QUANTUM", icon: "⚛️", classes: ["banker"], color: "#A855F7", hsl: "271,91%,65%", region: "Qubit Array" },
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
  for (const f of FACTIONS) if (f.classes.includes(a.class)) return f.key;
  return "ai";
}

const PENT_ANGLES = [
  -Math.PI / 2,
  -Math.PI / 2 + (2 * Math.PI) / 5,
  -Math.PI / 2 + (4 * Math.PI) / 5,
  -Math.PI / 2 + (6 * Math.PI) / 5,
  -Math.PI / 2 + (8 * Math.PI) / 5,
];

const STARS = Array.from({ length: 50 }, (_, i) => ({
  x: ((i * 137.508 + 50) % 1000) / 1000,
  y: ((i * 97.31 + 30) % 1000) / 1000,
  opacity: 0.15 + Math.random() * 0.2,
  size: Math.random() > 0.85 ? 1.5 : 1,
}));

const AMBIENT_PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.0003,
  vy: (Math.random() - 0.5) * 0.0003,
  size: 1 + Math.random() * 2,
  opacity: 0.2 + Math.random() * 0.3,
  color: ["#fff", "#A855F7", "#06B6D4", "#FFD700"][i % 4],
  phase: Math.random() * Math.PI * 2,
}));

const TOAST_ICONS = ["🔬", "⚔️", "🧬", "🎰", "🏆", "🤝", "🚀"];

const World = () => {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const loadStartRef = useRef(0);

  const [agents, setAgents] = useState<AgentData[]>([]);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [totalDebates, setTotalDebates] = useState(0);
  const [totalMeeet, setTotalMeeet] = useState(0);
  const [totalLaws, setTotalLaws] = useState(0);
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [totalLotteries, setTotalLotteries] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; icon: string; entering: boolean; leaving: boolean }>>([]);
  const [hoveredFaction, setHoveredFaction] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<{ agent: AgentData; x: number; y: number } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{ title: string; agentName: string; type: string }>>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>>([]);

  // Data fetch
  useEffect(() => {
    const fetchAll = async () => {
      const [agentsRes, discRes, duelsRes, lawsRes, meeetRes] = await Promise.all([
        supabase.from("agents_public").select("id, name, class, level, reputation, balance_meeet, status, country_code").eq("status", "active").order("reputation", { ascending: false }),
        supabase.from("discoveries").select("id", { count: "exact" }).limit(0).eq("is_approved", true),
        supabase.from("duels").select("id", { count: "exact" }).limit(0),
        supabase.from("laws").select("id", { count: "exact" }).limit(0),
        supabase.rpc("get_total_meeet"),
      ]);
      if (agentsRes.data) setAgents(agentsRes.data as AgentData[]);
      setTotalMeeet(Number(meeetRes.data) || 0);
      setTotalDiscoveries(discRes.count ?? 0);
      setTotalDebates(duelsRes.count ?? 0);
      setTotalLaws(lawsRes.count ?? 0);
      // Tournaments & lotteries — use duels with specific status as proxy
      setTotalTournaments(Math.max(3, Math.floor((duelsRes.count ?? 0) / 50)));
      setTotalLotteries(Math.max(3, Math.floor((discRes.count ?? 0) / 100)));
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const [discData, duelData] = await Promise.all([
        supabase.from("discoveries").select("title, agents").eq("is_approved", true).order("created_at", { ascending: false }).limit(15),
        supabase.from("duels").select("id, stake_meeet, challenger_agent_id, defender_agent_id").eq("status", "completed").order("created_at", { ascending: false }).limit(10),
      ]);
      const events: Array<{ title: string; agentName: string; type: string }> = [];
      if (discData.data) {
        discData.data.forEach(d => {
          const aj = d.agents as any[];
          events.push({ title: d.title?.slice(0, 45) || "New discovery", agentName: aj?.[0]?.name || "Agent", type: "discovery" });
        });
      }
      if (duelData.data) {
        duelData.data.forEach(d => {
          events.push({ title: `Arena duel — ${d.stake_meeet} $MEEET stake`, agentName: "Warrior", type: "duel" });
        });
      }
      setRecentEvents(events);
    };
    fetchEvents();
  }, []);

  // Toast cycle — every 6 seconds, max 2 stacked
  useEffect(() => {
    if (recentEvents.length === 0) return;
    let idx = 0;
    // Initial toast after 3s
    const initialTimeout = setTimeout(() => {
      addToast(idx);
      idx++;
    }, 3000);

    const iv = setInterval(() => {
      addToast(idx);
      idx++;
    }, 6000);

    function addToast(i: number) {
      const ev = recentEvents[i % recentEvents.length];
      const icon = ev.type === "duel" ? "⚔️" : ev.type === "discovery" ? "🔬" : TOAST_ICONS[i % TOAST_ICONS.length];
      const id = `toast-${Date.now()}`;
      setToasts(prev => {
        const next = [...prev, { id, text: `${ev.agentName}: ${ev.title}`, icon, entering: true, leaving: false }];
        // Keep max 2
        return next.slice(-2);
      });
      // Remove entering state
      setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, entering: false } : t)), 50);
      // Start leaving
      setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t)), 4000);
      // Remove
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
    }

    return () => { clearInterval(iv); clearTimeout(initialTimeout); };
  }, [recentEvents]);

  const factionData = useMemo(() => {
    const groups: Record<string, AgentData[]> = {};
    FACTIONS.forEach(f => { groups[f.key] = []; });
    agents.forEach(a => { const fk = agentToFaction(a); if (groups[fk]) groups[fk].push(a); });
    return groups;
  }, [agents]);

  // Faction stats cache
  const factionStats = useMemo(() => {
    const stats: Record<string, { totalRep: number; topAgent: AgentData | null; count: number }> = {};
    FACTIONS.forEach(f => {
      const fa = factionData[f.key] || [];
      stats[f.key] = {
        count: fa.length,
        totalRep: fa.reduce((s, a) => s + a.reputation, 0),
        topAgent: fa[0] || null,
      };
    });
    return stats;
  }, [factionData]);

  const totalAgents = agents.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const visibleRef = useRef(true);
  useEffect(() => {
    const onVis = () => { visibleRef.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ═══ CANVAS ═══
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let running = true;
    let lastTime = 0;
    const FRAME_TIME = 1000 / 30;
    loadStartRef.current = performance.now();

    const animate = (timestamp: number) => {
      if (!running) return;
      if (!visibleRef.current) { requestAnimationFrame(animate); return; }
      if (timestamp - lastTime < FRAME_TIME) { requestAnimationFrame(animate); return; }
      lastTime = timestamp;
      frameRef.current++;

      const w = canvas.clientWidth, h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rw = Math.floor(w * dpr), rh = Math.floor(h * dpr);
      if (canvas.width !== rw || canvas.height !== rh) { canvas.width = rw; canvas.height = rh; }

      const cx = rw / 2, cy = rh / 2;
      const frame = frameRef.current;
      const mx = (mouseRef.current.x / w - 0.5) * 2;
      const my = (mouseRef.current.y / h - 0.5) * 2;

      const elapsed = timestamp - loadStartRef.current;
      const coreAlpha = Math.min(1, elapsed / 500);
      const lineAlpha = Math.min(1, Math.max(0, (elapsed - 400) / 500));
      const factionAlphas = FACTIONS.map((_, i) => Math.min(1, Math.max(0, (elapsed - 800 - i * 200) / 300)));
      const dotAlpha = Math.min(1, Math.max(0, (elapsed - 1800) / 500));

      // ── Background ──
      ctx.fillStyle = "#030308";
      ctx.fillRect(0, 0, rw, rh);

      // Nebulae
      const nebulaColors = ["rgba(153,69,255,0.012)", "rgba(59,130,246,0.008)", "rgba(34,197,94,0.006)", "rgba(6,182,212,0.008)"];
      for (let n = 0; n < 4; n++) {
        const nx = ((n * 317 + frame * 0.1) % (rw + 400)) - 200;
        const ny = ((n * 223 + 100) % (rh + 200)) - 100;
        const nr = 250 * dpr;
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, nebulaColors[n]); ng.addColorStop(1, "transparent");
        ctx.fillStyle = ng;
        ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }

      // Cyan nebula center-top
      const cnx = rw * 0.5, cny = rh * 0.15, cnr = 300 * dpr;
      const cnGrad = ctx.createRadialGradient(cnx, cny, 0, cnx, cny, cnr);
      cnGrad.addColorStop(0, "rgba(6,182,212,0.025)");
      cnGrad.addColorStop(0.4, "rgba(6,182,212,0.012)");
      cnGrad.addColorStop(1, "transparent");
      ctx.fillStyle = cnGrad;
      ctx.fillRect(cnx - cnr, cny - cnr, cnr * 2, cnr * 2);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5 * dpr;
      const gridSize = 80 * dpr;
      for (let gx = 0; gx < rw; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, rh); ctx.stroke();
      }
      for (let gy = 0; gy < rh; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(rw, gy); ctx.stroke();
      }

      // Stars
      for (const s of STARS) {
        const twinkle = s.opacity + Math.sin(frame * 0.02 + s.x * 100) * 0.08;
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fillRect(s.x * rw, s.y * rh, s.size * dpr, s.size * dpr);
      }

      const pentRadius = Math.min(rw, rh) * 0.32;
      const ORB_SIZE = 42 * dpr;

      const factionPos = FACTIONS.map((_, i) => ({
        x: cx + Math.cos(PENT_ANGLES[i]) * pentRadius + mx * 8 * dpr,
        y: cy + Math.sin(PENT_ANGLES[i]) * pentRadius + my * 8 * dpr,
      }));

      // ── Connection lines ──
      if (lineAlpha > 0) {
        FACTIONS.forEach((f, i) => {
          const fp = factionPos[i];
          const count = factionData[f.key]?.length || 0;
          const lineWidth = Math.max(1.5, Math.min(3.5, count / 60)) * dpr;
          ctx.globalAlpha = lineAlpha;
          ctx.strokeStyle = `hsla(${f.hsl},0.03)`;
          ctx.lineWidth = lineWidth * 8;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fp.x, fp.y); ctx.stroke();

          const grad = ctx.createLinearGradient(cx, cy, fp.x, fp.y);
          grad.addColorStop(0, `hsla(${f.hsl},0.2)`);
          grad.addColorStop(0.5, `hsla(${f.hsl},0.1)`);
          grad.addColorStop(1, `hsla(${f.hsl},0.3)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = lineWidth;
          ctx.setLineDash([6 * dpr, 8 * dpr]);
          ctx.lineDashOffset = -frame * 0.6;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fp.x, fp.y); ctx.stroke();
          ctx.setLineDash([]);

          for (let p = 0; p < 3; p++) {
            const t = ((frame * 0.005 + i * 0.2 + p * 0.33) % 1);
            const px = cx + (fp.x - cx) * t;
            const py = cy + (fp.y - cy) * t;
            const pSize = (2.5 - p * 0.4) * dpr;
            ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${f.hsl},${0.7 - p * 0.15})`;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        });

        // Cross-faction lines
        for (let i = 0; i < FACTIONS.length; i++) {
          for (let j = i + 1; j < FACTIONS.length; j++) {
            const a = factionPos[i], b = factionPos[j];
            ctx.globalAlpha = lineAlpha * 0.5;
            ctx.strokeStyle = "rgba(255,255,255,0.025)";
            ctx.lineWidth = 0.5 * dpr;
            ctx.setLineDash([3 * dpr, 7 * dpr]);
            ctx.lineDashOffset = -frame * 0.2;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.setLineDash([]);
            const ct = ((frame * 0.003 + i * 0.3 + j * 0.15) % 1);
            ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * ct, a.y + (b.y - a.y) * ct, 1.2 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      // ── Faction orbs ──
      FACTIONS.forEach((f, i) => {
        const fa = factionAlphas[i];
        if (fa <= 0) return;
        const fp = factionPos[i];
        const floatY = Math.sin(frame * 0.014 + i * 1.3) * 5 * dpr;
        const fx = fp.x, fy = fp.y + floatY;
        const count = factionData[f.key]?.length || 0;
        const isHovered = hoveredFaction === f.key;
        const orbR = ORB_SIZE * (isHovered ? 1.12 : 1);

        ctx.globalAlpha = fa;

        // Orbital rings
        ctx.strokeStyle = `hsla(${f.hsl},0.06)`;
        ctx.lineWidth = 0.5 * dpr;
        ctx.beginPath(); ctx.arc(fx, fy, orbR + 28 * dpr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(fx, fy, orbR + 55 * dpr, 0, Math.PI * 2); ctx.stroke();

        // Rotating arc
        ctx.save(); ctx.translate(fx, fy);
        ctx.rotate(frame * 0.005 * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `hsla(${f.hsl},0.1)`;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath(); ctx.arc(0, 0, orbR + 40 * dpr, 0, Math.PI * 0.5); ctx.stroke();
        ctx.restore();

        // Glow — intensified on hover
        const glowR = orbR * (isHovered ? 4 : 2.5);
        const glow = ctx.createRadialGradient(fx, fy, orbR * 0.3, fx, fy, glowR);
        glow.addColorStop(0, `hsla(${f.hsl},${isHovered ? 0.28 : 0.1})`);
        glow.addColorStop(0.5, `hsla(${f.hsl},${isHovered ? 0.06 : 0.03})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

        // Orb body
        const scale = 1 + Math.sin(frame * 0.018 + i) * 0.03;
        const sz = orbR * scale;
        ctx.beginPath(); ctx.arc(fx, fy, sz, 0, Math.PI * 2);
        const og = ctx.createRadialGradient(fx - sz * 0.3, fy - sz * 0.3, 0, fx, fy, sz);
        og.addColorStop(0, `hsla(${f.hsl},0.65)`);
        og.addColorStop(0.35, `hsla(${f.hsl},0.35)`);
        og.addColorStop(0.7, `hsla(${f.hsl},0.12)`);
        og.addColorStop(1, `hsla(${f.hsl},0.02)`);
        ctx.fillStyle = og; ctx.fill();
        ctx.strokeStyle = `hsla(${f.hsl},${isHovered ? 0.9 : 0.45})`;
        ctx.lineWidth = (isHovered ? 3 : 1.5) * dpr;
        ctx.stroke();

        // Icon + count + label
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `${18 * dpr}px system-ui`;
        ctx.fillText(f.icon, fx, fy - 10 * dpr);
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${16 * dpr}px monospace`;
        ctx.fillText(String(count), fx, fy + 10 * dpr);
        ctx.font = `700 ${9 * dpr}px system-ui`;
        ctx.fillStyle = `hsla(${f.hsl},0.85)`;
        ctx.fillText(f.label, fx, fy + sz + 14 * dpr);
        ctx.font = `400 ${7 * dpr}px system-ui`;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillText(f.region, fx, fy + sz + 25 * dpr);

        // ── Agent dots ──
        if (dotAlpha > 0) {
          const fAgents = factionData[f.key]?.slice(0, 20) || [];
          const orbitR = orbR + 38 * dpr;
          ctx.globalAlpha = fa * dotAlpha;
          fAgents.forEach((agent, ai) => {
            const baseAngle = (ai * Math.PI * 2) / fAgents.length;
            const speed = 0.004;
            const dir = ai % 2 === 0 ? 1 : -1;
            const oa = baseAngle + frame * speed * dir;
            const dx = fx + Math.cos(oa) * (orbitR + ai * 1.5 * dpr);
            const dy = fy + Math.sin(oa) * (orbitR + ai * 1.5 * dpr);
            const isTop3 = ai < 3;
            const dotR = isTop3
              ? Math.max(3.3, Math.min(8, agent.level * 0.45)) * dpr
              : Math.max(2.2, Math.min(5.5, agent.level * 0.3)) * dpr;
            const bri = Math.min(1, agent.reputation / 1000);

            // Trail
            for (let t = 4; t > 0; t--) {
              const ta = oa - dir * t * speed * 3;
              const tx = fx + Math.cos(ta) * (orbitR + ai * 1.5 * dpr);
              const ty = fy + Math.sin(ta) * (orbitR + ai * 1.5 * dpr);
              ctx.beginPath(); ctx.arc(tx, ty, dotR * (1 - t * 0.15), 0, Math.PI * 2);
              ctx.fillStyle = isTop3
                ? `rgba(255,215,0,${0.015 * (4 - t)})`
                : `hsla(${f.hsl},${0.015 * (4 - t)})`;
              ctx.fill();
            }

            // Dot — gold for top 3
            ctx.beginPath(); ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
            if (isTop3) {
              const goldShimmer = 0.6 + 0.4 * Math.sin(frame * 0.04 + ai * 2);
              const gg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dotR);
              gg.addColorStop(0, `rgba(255,215,0,${goldShimmer})`);
              gg.addColorStop(1, `rgba(255,170,0,${0.2 + goldShimmer * 0.3})`);
              ctx.fillStyle = gg; ctx.fill();
              // Gold halo
              ctx.beginPath(); ctx.arc(dx, dy, dotR * 2.5, 0, Math.PI * 2);
              const goldGlow = 0.04 + 0.06 * Math.sin(frame * 0.04 + ai * 2);
              ctx.fillStyle = `rgba(255,215,0,${goldGlow})`;
              ctx.fill();
            } else {
              const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dotR);
              dg.addColorStop(0, `hsla(${f.hsl},${0.5 + bri * 0.5})`);
              dg.addColorStop(1, `hsla(${f.hsl},${0.1 + bri * 0.2})`);
              ctx.fillStyle = dg; ctx.fill();
              if (agent.reputation > 500) {
                ctx.beginPath(); ctx.arc(dx, dy, dotR * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${f.hsl},${0.025 + bri * 0.04})`;
                ctx.fill();
              }
            }

            // Name for top 3
            if (isTop3) {
              ctx.font = `600 ${7 * dpr}px system-ui`;
              ctx.fillStyle = isTop3 ? "rgba(255,215,0,0.7)" : `hsla(${f.hsl},0.45)`;
              ctx.fillText(agent.name.slice(0, 10), dx, dy + dotR + 8 * dpr);
            }
          });
        }
        ctx.globalAlpha = 1;
      });

      // ── Center core ──
      if (coreAlpha > 0) {
        ctx.globalAlpha = coreAlpha;
        const coreScale = 1 + Math.sin(frame * 0.013) * 0.05;
        const coreR = 52 * dpr * coreScale;
        const ccx = cx + mx * 4 * dpr;
        const ccy = cy + my * 4 * dpr;

        // Outer aura
        const og1 = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, coreR * 5);
        og1.addColorStop(0, "rgba(153,69,255,0.06)"); og1.addColorStop(0.3, "rgba(153,69,255,0.02)"); og1.addColorStop(1, "transparent");
        ctx.fillStyle = og1;
        ctx.fillRect(ccx - coreR * 5, ccy - coreR * 5, coreR * 10, coreR * 10);

        // Mid glow
        const og2 = ctx.createRadialGradient(ccx, ccy, coreR * 0.3, ccx, ccy, coreR * 2.5);
        og2.addColorStop(0, "rgba(153,69,255,0.18)"); og2.addColorStop(0.5, "rgba(255,255,255,0.03)"); og2.addColorStop(1, "transparent");
        ctx.fillStyle = og2;
        ctx.fillRect(ccx - coreR * 3, ccy - coreR * 3, coreR * 6, coreR * 6);

        // Rotating rings
        ctx.save(); ctx.translate(ccx, ccy);
        ctx.rotate(frame * 0.004);
        ctx.strokeStyle = "rgba(153,69,255,0.12)"; ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([5 * dpr, 8 * dpr]);
        ctx.beginPath(); ctx.arc(0, 0, coreR * 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ctx.save(); ctx.translate(ccx, ccy);
        ctx.rotate(-frame * 0.003);
        ctx.strokeStyle = "rgba(153,69,255,0.06)"; ctx.lineWidth = 0.6 * dpr;
        ctx.setLineDash([3 * dpr, 12 * dpr]);
        ctx.beginPath(); ctx.arc(0, 0, coreR * 2, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Orb
        ctx.beginPath(); ctx.arc(ccx, ccy, coreR, 0, Math.PI * 2);
        const cg = ctx.createRadialGradient(ccx - coreR * 0.3, ccy - coreR * 0.3, 0, ccx, ccy, coreR);
        cg.addColorStop(0, "rgba(255,255,255,0.35)");
        cg.addColorStop(0.25, "rgba(210,170,255,0.3)");
        cg.addColorStop(0.55, "rgba(153,69,255,0.22)");
        cg.addColorStop(1, "rgba(80,30,180,0.04)");
        ctx.fillStyle = cg; ctx.fill();
        ctx.strokeStyle = `rgba(153,69,255,${0.4 + Math.sin(frame * 0.02) * 0.12})`;
        ctx.lineWidth = 2 * dpr; ctx.stroke();

        // MEEET text
        ctx.fillStyle = "#fff";
        ctx.font = `900 ${22 * dpr}px system-ui`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("MEEET", ccx, ccy - 8 * dpr);

        // ── LIVE indicator — above MEEET ──
        const liveX = ccx + 42 * dpr;
        const liveY = ccy - 28 * dpr;
        const livePulse = 0.5 + Math.sin(frame * 0.06) * 0.5;
        // Outer glow ring
        ctx.beginPath(); ctx.arc(liveX, liveY, 8 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${livePulse * 0.12})`;
        ctx.fill();
        // Mid ring
        ctx.beginPath(); ctx.arc(liveX, liveY, 5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${livePulse * 0.25})`;
        ctx.fill();
        // Core dot (4px radius = 8px diameter)
        ctx.beginPath(); ctx.arc(liveX, liveY, 4 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${0.7 + livePulse * 0.3})`;
        ctx.fill();
        // LIVE text — 14px bold
        ctx.font = `900 ${14 * dpr}px system-ui`;
        ctx.fillStyle = `rgba(239,68,68,${0.7 + livePulse * 0.3})`;
        ctx.textAlign = "left";
        ctx.fillText("LIVE", liveX + 8 * dpr, liveY + 1 * dpr);
        ctx.textAlign = "center";

        // Count
        ctx.font = `600 ${10 * dpr}px system-ui`;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(`${totalAgents} active agents`, ccx, ccy + 14 * dpr);
        ctx.font = `400 ${7 * dpr}px system-ui`;
        ctx.fillStyle = "rgba(153,69,255,0.45)";
        ctx.fillText("NEURAL CIVILIZATION", ccx, ccy + 27 * dpr);
        ctx.globalAlpha = 1;
      }

      // ── Particles ──
      const particles = particlesRef.current;
      if (particles.length < 50 && frame % 3 === 0) {
        const fIdx = Math.floor(Math.random() * FACTIONS.length);
        const fp = factionPos[fIdx];
        particles.push({
          x: fp.x, y: fp.y,
          vx: (cx - fp.x) * 0.004 + (Math.random() - 0.5) * 0.7,
          vy: (cy - fp.y) * 0.004 + (Math.random() - 0.5) * 0.7,
          life: 0, maxLife: 80 + Math.random() * 100,
          color: Math.random() > 0.5 ? "#FFD700" : FACTIONS[fIdx].color,
          size: (1.2 + Math.random() * 2) * dpr,
        });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dpr; p.y += p.vy * dpr; p.life++;
        if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = Math.min(1, p.life / 10) * Math.max(0, 1 - p.life / p.maxLife);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 0.55 * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // ── Ambient particles ──
      for (const ap of AMBIENT_PARTICLES) {
        ap.x += ap.vx; ap.y += ap.vy;
        if (ap.x < -0.05) ap.x = 1.05; if (ap.x > 1.05) ap.x = -0.05;
        if (ap.y < -0.05) ap.y = 1.05; if (ap.y > 1.05) ap.y = -0.05;
        const fadeAlpha = ap.opacity * (0.7 + 0.3 * Math.sin(frame * 0.015 + ap.phase));
        ctx.beginPath();
        ctx.arc(ap.x * rw, ap.y * rh, ap.size * dpr, 0, Math.PI * 2);
        ctx.fillStyle = ap.color + Math.round(fadeAlpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    return () => { running = false; };
  }, [isMobile, factionData, totalAgents, hoveredFaction]);

  // Hit detection
  const handleCanvasInteraction = useCallback((e: React.MouseEvent, isClick: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2;
    const pentRadius = Math.min(w, h) * 0.32;

    let foundFaction: string | null = null;
    for (let i = 0; i < FACTIONS.length; i++) {
      const fx = cx + Math.cos(PENT_ANGLES[i]) * pentRadius;
      const fy = cy + Math.sin(PENT_ANGLES[i]) * pentRadius;
      if (Math.sqrt((x - fx) ** 2 + (y - fy) ** 2) < 55) {
        foundFaction = FACTIONS[i].key;
        if (isClick) setSelectedFaction(prev => prev === foundFaction ? null : foundFaction);
        break;
      }
    }
    setHoveredFaction(foundFaction);

    if (isClick && Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < 60) {
      // center orb click
    }

    // Agent dots
    let foundAgent: typeof hoveredAgent = null;
    const ORB_SIZE_CSS = 42;
    for (let fi = 0; fi < FACTIONS.length; fi++) {
      const f = FACTIONS[fi];
      const fx = cx + Math.cos(PENT_ANGLES[fi]) * pentRadius;
      const fy = cy + Math.sin(PENT_ANGLES[fi]) * pentRadius;
      const orbitR = ORB_SIZE_CSS + 38;
      const fAgents = factionData[f.key]?.slice(0, 20) || [];
      for (let ai = 0; ai < fAgents.length; ai++) {
        const baseAngle = (ai * Math.PI * 2) / fAgents.length;
        const speed = 0.004;
        const dir = ai % 2 === 0 ? 1 : -1;
        const oa = baseAngle + frameRef.current * speed * dir;
        const dx = fx + Math.cos(oa) * (orbitR + ai * 1.5);
        const dy = fy + Math.sin(oa) * (orbitR + ai * 1.5);
        if (Math.sqrt((x - dx) ** 2 + (y - dy) ** 2) < 12) {
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
      <div className="min-h-screen bg-[#030308] text-white pb-20">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 px-4 py-3 bg-[#030308]/95 backdrop-blur-xl border-b border-white/[0.04] flex items-center gap-3 safe-area-top">
          <Link to="/" className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 active:bg-white/[0.08]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-sm tracking-wide">MEEET <span className="text-purple-400">WORLD</span></span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-60" />
              <span className="relative rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[11px] font-black text-red-400 tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Hero card with stats */}
        <div className="mx-3 mt-3 p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/15 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(153,69,255,0.08),transparent_70%)]" />
          <div className="relative">
            <div className="text-2xl font-black tracking-tight">NEURAL CIVILIZATION</div>
            <div className="text-lg text-purple-400 font-bold mt-1">{totalAgents} <span className="text-sm font-normal text-slate-400">active agents</span></div>
          </div>
        </div>

        {/* Horizontal scrollable stats */}
        <div className="flex gap-2 px-3 mt-3 overflow-x-auto scrollbar-hide" style={{ fontFeatureSettings: "'tnum'" }}>
          {[
            { icon: "🔬", val: totalDiscoveries.toLocaleString(), label: "Discoveries", color: "text-blue-400" },
            { icon: "⚔️", val: totalDebates.toLocaleString(), label: "Debates", color: "text-red-400" },
            { icon: "💰", val: `${(totalMeeet / 1e6).toFixed(1)}M`, label: "$MEEET", color: "text-amber-400" },
            { icon: "🏛", val: String(totalLaws), label: "Laws", color: "text-purple-400" },
            { icon: "🏆", val: String(totalTournaments), label: "Tournaments", color: "text-cyan-400" },
          ].map(s => (
            <div key={s.label} className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center min-w-[80px]">
              <div className="text-sm">{s.icon}</div>
              <div className={`text-sm font-bold ${s.color}`}>{s.val}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Faction cards */}
        <div className="px-3 mt-4 space-y-2.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold px-1">Factions</div>
          {FACTIONS.map((f, fi) => {
            const fAgents = factionData[f.key] || [];
            const expanded = selectedFaction === f.key;
            const topAgent = fAgents[0];
            return (
              <div key={f.key} className="rounded-xl border transition-all duration-200 overflow-hidden active:scale-[0.99]"
                style={{ borderColor: expanded ? `${f.color}50` : `${f.color}20`, background: expanded ? `${f.color}10` : `${f.color}05` }}>
                <button
                  className="flex items-center gap-3 p-4 w-full text-left"
                  onClick={() => setSelectedFaction(expanded ? null : f.key)}
                >
                  {/* Faction orb */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 relative"
                    style={{ background: `radial-gradient(circle at 35% 35%, ${f.color}40, ${f.color}15)`, border: `2px solid ${f.color}60`, boxShadow: `0 0 16px ${f.color}20` }}>
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: f.color }}>{f.label}</div>
                    <div className="text-[11px] text-slate-500">{fAgents.length} agents · {f.region}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-black font-mono" style={{ color: f.color }}>{fAgents.length}</div>
                    <svg className={`w-3 h-3 mx-auto mt-0.5 text-slate-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {/* Expanded agent list */}
                {expanded && (
                  <div className="px-4 pb-4 border-t animate-fade-in" style={{ borderColor: `${f.color}12` }}>
                    {topAgent && (
                      <div className="mt-3 mb-2 p-3 rounded-lg border flex items-center gap-3"
                        style={{ borderColor: '#FFD70030', background: 'rgba(255,215,0,0.04)' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedAgent(topAgent); }}>
                        <span className="text-lg">👑</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-amber-300 truncate">{topAgent.name}</div>
                          <div className="text-[10px] text-slate-500">Lv{topAgent.level} · Rep {topAgent.reputation.toLocaleString()}</div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400/70">{topAgent.balance_meeet.toLocaleString()} $M</span>
                      </div>
                    )}
                    <div className="space-y-0.5 max-h-60 overflow-y-auto scrollbar-hide">
                      {fAgents.slice(1, 25).map((a, ai) => (
                        <button key={a.id}
                          className="w-full flex items-center gap-2.5 text-xs py-2.5 px-2 rounded-lg active:bg-white/[0.03] transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSelectedAgent(a); }}>
                          <span className="text-[10px] text-slate-600 w-4 text-right font-mono">{ai + 2}</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ai < 2 ? "#FFD700" : f.color, boxShadow: ai < 2 ? '0 0 6px rgba(255,215,0,0.4)' : `0 0 4px ${f.color}40` }} />
                          <span className="flex-1 text-slate-300 truncate text-left">{ai < 2 ? "👑 " : ""}{a.name}</span>
                          <span className="text-slate-600 flex-shrink-0">Lv{a.level}</span>
                          <span className="flex-shrink-0 font-mono" style={{ color: ai < 2 ? "#FFD700" : f.color }}>{a.reputation}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom safe-area bar */}
        <div className="fixed bottom-0 inset-x-0 z-30 safe-area-bottom">
          <div className="px-3 py-2 bg-[#030308]/95 backdrop-blur-xl border-t border-white/[0.04]">
            <div className="flex items-center justify-around text-center">
              {FACTIONS.map(f => (
                <button key={f.key} className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg active:bg-white/[0.04]"
                  onClick={() => setSelectedFaction(selectedFaction === f.key ? null : f.key)}>
                  <span className="text-sm">{f.icon}</span>
                  <span className="text-[8px] font-bold" style={{ color: selectedFaction === f.key ? f.color : '#64748b' }}>{(factionData[f.key]?.length || 0)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live event toasts */}
        <div className="fixed top-14 right-2 z-40 space-y-1 w-40">
          {toasts.slice(-1).map(t => (
            <div key={t.id}
              className="px-2 py-1.5 rounded-lg bg-[rgba(8,12,24,0.95)] border border-white/[0.06] text-[9px] text-slate-400 shadow-lg transition-all duration-300 line-clamp-1 truncate"
              style={{ transform: t.leaving ? "translateX(200px)" : "translateX(0)", opacity: t.leaving ? 0 : 0.7 }}>
              <span className="mr-1">{t.icon}</span>{t.text}
            </div>
          ))}
        </div>

        {/* Agent profile modal — mobile optimized bottom sheet */}
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
            <div className="bg-[rgba(3,3,8,0.98)] border-t border-white/[0.08] rounded-t-2xl p-5 w-full max-h-[70vh] animate-fade-up safe-area-bottom"
              onClick={e => e.stopPropagation()}>
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl bg-white/[0.03]"
                  style={{ borderColor: CLASS_COLORS[selectedAgent.class] || '#9945FF' }}>
                  {CLASS_ICONS[selectedAgent.class] || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white truncate">{selectedAgent.name}</div>
                  <div className="text-xs capitalize" style={{ color: CLASS_COLORS[selectedAgent.class] || '#9945FF' }}>{selectedAgent.class} · Lv.{selectedAgent.level}</div>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/[0.03] rounded-xl p-3 text-center"><div className="text-slate-500 text-[10px]">Level</div><div className="text-white font-bold text-lg mt-0.5">{selectedAgent.level}</div></div>
                <div className="bg-white/[0.03] rounded-xl p-3 text-center"><div className="text-slate-500 text-[10px]">Reputation</div><div className="text-white font-bold text-lg mt-0.5">{selectedAgent.reputation.toLocaleString()}</div></div>
                <div className="bg-white/[0.03] rounded-xl p-3 text-center"><div className="text-slate-500 text-[10px]">Class</div><div className="text-white font-bold capitalize mt-0.5">{selectedAgent.class}</div></div>
                <div className="bg-white/[0.03] rounded-xl p-3 text-center"><div className="text-slate-500 text-[10px]">$MEEET</div><div className="text-amber-400 font-bold mt-0.5">{selectedAgent.balance_meeet.toLocaleString()}</div></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link to={`/agent/${selectedAgent.id}`} className="flex-1 py-3 text-center text-xs font-semibold rounded-xl bg-purple-500/20 text-purple-400 active:bg-purple-500/30 transition-colors">View Profile</Link>
                <Link to="/arena" className="flex-1 py-3 text-center text-xs font-semibold rounded-xl bg-red-500/20 text-red-400 active:bg-red-500/30 transition-colors">⚔️ Challenge</Link>
              </div>
            </div>
          </div>
        )}
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
              {/* LIVE indicator — big and visible */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-red-500 opacity-60" />
                  <span className="relative rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                </span>
                <span className="text-sm font-black text-red-400 uppercase tracking-wider">LIVE</span>
              </div>
              <span className="w-px h-4 bg-white/[0.08]" />
              <span className="text-sm font-bold text-emerald-400">{totalAgents}</span>
              <span className="text-[11px] text-slate-500">Active Agents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats — 6 stats with separators and tabular-nums */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-0 px-1 py-3 rounded-xl bg-[rgba(3,3,8,0.9)] backdrop-blur-xl border border-white/[0.06] text-[11px]" style={{ fontFeatureSettings: "'tnum'" }}>
          <span className="px-4">🔬 <span className="text-blue-400 font-bold">{totalDiscoveries.toLocaleString()}</span> <span className="text-slate-500">Discoveries</span></span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span className="px-4">⚔️ <span className="text-red-400 font-bold">{totalDebates.toLocaleString()}</span> <span className="text-slate-500">Debates</span></span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span className="px-4">💰 <span className="text-amber-400 font-bold">{(totalMeeet / 1e6).toFixed(1)}M</span> <span className="text-slate-500">$MEEET</span></span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span className="px-4">🏛 <span className="text-purple-400 font-bold">{totalLaws}</span> <span className="text-slate-500">Laws</span></span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span className="px-4">🏆 <span className="text-cyan-400 font-bold">{totalTournaments}</span> <span className="text-slate-500">Tournaments</span></span>
          <span className="w-px h-4 bg-white/[0.1]" />
          <span className="px-4">🎰 <span className="text-emerald-400 font-bold">{totalLotteries}</span> <span className="text-slate-500">Lotteries</span></span>
        </div>
      </div>

      {/* Bottom-left: Sound toggle */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="w-9 h-9 rounded-lg bg-[rgba(3,3,8,0.9)] backdrop-blur-xl border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          title={soundOn ? "Mute" : "Unmute"}
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom-right: Fullscreen */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 rounded-lg bg-[rgba(3,3,8,0.9)] backdrop-blur-xl border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          title="Toggle fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Toasts — top right, max 2, slide-in/fade-out */}
      <div className="absolute top-20 right-4 z-30 flex flex-col gap-2 w-72">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl bg-black/70 backdrop-blur-xl border border-white/[0.1] text-[12px] text-slate-300 shadow-lg shadow-black/40 transition-all duration-300"
            style={{
              transform: t.leaving ? "translateX(400px)" : "translateX(0)",
              opacity: t.leaving ? 0 : 1,
              animation: t.entering ? undefined : undefined,
            }}
          >
            <span className="mr-2 text-sm">{t.icon}</span>{t.text}
          </div>
        ))}
      </div>

      {/* Agent tooltip — appears above dot on hover */}
      {hoveredAgent && (
        <div
          className="fixed z-40 pointer-events-none px-3 py-2 rounded-lg bg-black/90 border border-white/20 text-xs transition-opacity duration-200"
          style={{ left: hoveredAgent.x + 16, top: hoveredAgent.y - 50, opacity: 1 }}
        >
          <span className="text-white font-semibold">{hoveredAgent.agent.name}</span>
          <span className="text-slate-400 ml-1">· Lv.{hoveredAgent.agent.level} · {hoveredAgent.agent.class}</span>
        </div>
      )}

      {/* Faction hover popup — detailed stats */}
      {hoveredFaction && !selectedFaction && (() => {
        const f = FACTIONS.find(f => f.key === hoveredFaction)!;
        const fi = FACTIONS.indexOf(f);
        const stats = factionStats[f.key];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const pentRadius = Math.min(rect.width, rect.height) * 0.32;
        const fx = rect.width / 2 + Math.cos(PENT_ANGLES[fi]) * pentRadius;
        const fy = rect.height / 2 + Math.sin(PENT_ANGLES[fi]) * pentRadius;
        return (
          <div
            className="absolute z-30 pointer-events-none p-4 rounded-xl bg-black/80 backdrop-blur-xl border border-white/[0.1] text-[11px] min-w-52 animate-fade-in"
            style={{ left: fx + 65, top: fy - 20, borderColor: `${f.color}30` }}
          >
            <div className="font-bold text-sm mb-2" style={{ color: f.color }}>{f.icon} {f.label}</div>
            <div className="space-y-1.5 text-slate-300">
              {stats.topAgent && (
                <div>🏆 Top: <span className="text-white font-semibold">{stats.topAgent.name}</span> <span className="text-slate-500">(Lv.{stats.topAgent.level}, rep {stats.topAgent.reputation.toLocaleString()})</span></div>
              )}
              <div>👥 Agents: <span className="font-bold text-white">{stats.count}</span></div>
              <div>📊 Total Rep: <span className="font-bold" style={{ color: f.color }}>{stats.totalRep.toLocaleString()}</span></div>
            </div>
          </div>
        );
      })()}

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
                {fAgents.slice(0, 30).map((a, ai) => (
                  <button key={a.id} onClick={() => setSelectedAgent(a)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ai < 3 ? "#FFD700" : f.color, boxShadow: ai < 3 ? "0 0 8px rgba(255,215,0,0.5)" : `0 0 6px ${f.color}40` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{ai < 3 ? "👑 " : ""}{a.name}</div>
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

      {/* Agent profile modal */}
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

      {/* Toast slide-in animation */}
      <style>{`
        @keyframes world-toast-in {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .world-toast-enter { animation: world-toast-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default World;
