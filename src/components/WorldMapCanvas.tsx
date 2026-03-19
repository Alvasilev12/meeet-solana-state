import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";

interface AgentGeo {
  lng: number; lat: number; color: string; rep: number; name: string; cls: string;
}

interface EventGeo {
  lng: number; lat: number; color: string; type: string;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

interface Ripple {
  x: number; y: number; radius: number; maxRadius: number;
  opacity: number; color: string;
}

interface Props {
  agentGeoData: AgentGeo[];
  eventGeoData: EventGeo[];
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

const MAX_PARTICLES = 100;

const WorldMapCanvas = ({ agentGeoData, eventGeoData, mapRef }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const ripples = useRef<Ripple[]>([]);
  const frameRef = useRef(0);
  const lastSpawn = useRef(0);

  // Keep refs to latest data so animation loop always has fresh data
  const agentsRef = useRef(agentGeoData);
  const eventsRef = useRef(eventGeoData);
  agentsRef.current = agentGeoData;
  eventsRef.current = eventGeoData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const animate = () => {
      if (!running) return;
      frameRef.current++;
      const map = mapRef.current;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = devicePixelRatio || 1;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);

      if (!map || (map as any)._removed) {
        requestAnimationFrame(animate);
        return;
      }

      // Project geo -> screen each frame
      const agentDots = agentsRef.current.map(a => {
        const pt = map.project([a.lng, a.lat]);
        return { x: pt.x, y: pt.y, color: a.color, rep: a.rep, name: a.name, cls: a.cls };
      }).filter(d => d.x >= -50 && d.x <= w + 50 && d.y >= -50 && d.y <= h + 50);

      const eventDots = eventsRef.current.map(e => {
        const pt = map.project([e.lng, e.lat]);
        return { x: pt.x, y: pt.y, color: e.color, type: e.type };
      }).filter(d => d.x >= -50 && d.x <= w + 50 && d.y >= -50 && d.y <= h + 50);

      const time = frameRef.current * 0.03;

      // --- Connection lines between nearby agents ---
      if (agentDots.length > 1 && agentDots.length < 150) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < agentDots.length; i++) {
          for (let j = i + 1; j < Math.min(agentDots.length, i + 12); j++) {
            const a = agentDots[i], b = agentDots[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 70 && dist > 5) {
              const alpha = (1 - dist / 70) * 0.1;
              ctx.strokeStyle = `rgba(153,69,255,${alpha})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // --- Agent glow orbs ---
      for (const agent of agentDots) {
        const pulse = 0.7 + 0.3 * Math.sin(time + agent.x * 0.01);
        const baseSize = 3 + Math.min(agent.rep / 80, 9);
        const glowSize = baseSize * 3 * pulse;

        // Outer glow
        const grad = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, glowSize);
        grad.addColorStop(0, agent.color + "28");
        grad.addColorStop(0.5, agent.color + "0a");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = agent.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, baseSize * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Orbit ring
        ctx.strokeStyle = agent.color + "30";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, baseSize * 2 + Math.sin(time * 1.5 + agent.y * 0.02) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Spawn particles ---
      if (agentDots.length > 0) {
        const now = Date.now();
        if (now - lastSpawn.current > 250) {
          lastSpawn.current = now;
          const budget = MAX_PARTICLES - particles.current.length;
          const count = Math.min(budget, Math.ceil(agentDots.length / 10));
          for (let i = 0; i < count; i++) {
            const dot = agentDots[Math.floor(Math.random() * agentDots.length)];
            const angle = Math.random() * Math.PI * 2;
            particles.current.push({
              x: dot.x + (Math.random() - 0.5) * 8,
              y: dot.y + (Math.random() - 0.5) * 8,
              vx: Math.cos(angle) * 0.2, vy: Math.sin(angle) * 0.2 - 0.15,
              life: 0, maxLife: 50 + Math.random() * 70,
              color: dot.color, size: 0.8 + Math.random() * 1.5,
            });
          }
        }
      }

      // --- Draw particles ---
      particles.current = particles.current.filter(p => {
        p.life++;
        if (p.life >= p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // --- Event ripples ---
      if (eventDots.length > 0 && frameRef.current % 50 === 0 && ripples.current.length < 15) {
        const dot = eventDots[Math.floor(Math.random() * eventDots.length)];
        ripples.current.push({
          x: dot.x, y: dot.y,
          radius: 4, maxRadius: 25 + Math.random() * 20,
          opacity: 0.45, color: dot.color,
        });
      }

      ripples.current = ripples.current.filter(r => {
        r.radius += 0.4;
        r.opacity -= 0.004;
        if (r.opacity <= 0 || r.radius >= r.maxRadius) return false;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.opacity;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return true;
      });

      requestAnimationFrame(animate);
    };

    animate();
    return () => { running = false; };
  }, [mapRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
};

export default WorldMapCanvas;
