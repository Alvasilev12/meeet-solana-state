import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

interface AgentGeo {
  lng: number; lat: number; color: string; rep: number; name: string; cls: string;
}
interface EventGeo {
  lng: number; lat: number; color: string; type: string;
}
interface Props {
  agentGeoData: AgentGeo[];
  eventGeoData: EventGeo[];
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Aurora blobs state
interface AuroraBlob {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; phase: number;
}

const WorldMapCanvas = ({ agentGeoData, eventGeoData, mapRef }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const agentsRef = useRef(agentGeoData);
  const eventsRef = useRef(eventGeoData);
  agentsRef.current = agentGeoData;
  eventsRef.current = eventGeoData;

  const ripples = useRef<Array<{ x: number; y: number; radius: number; maxR: number; color: string }>>([]);
  const auroraBlobs = useRef<AuroraBlob[]>([]);
  const lastRippleFrame = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Init aurora blobs
    if (auroraBlobs.current.length === 0) {
      const colors = [
        "rgba(139, 92, 246, 0.04)", // purple
        "rgba(78, 205, 196, 0.04)", // teal
        "rgba(99, 102, 241, 0.035)", // indigo
        "rgba(20, 184, 166, 0.035)", // teal-alt
      ];
      for (let i = 0; i < 4; i++) {
        auroraBlobs.current.push({
          x: Math.random(), y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0003,
          vy: (Math.random() - 0.5) * 0.0003,
          r: 120 + Math.random() * 80,
          color: colors[i],
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let running = true;

    const animate = () => {
      if (!running) return;
      frameRef.current++;
      const map = mapRef.current;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rw = Math.floor(w * dpr);
      const rh = Math.floor(h * dpr);

      if (canvas.width !== rw || canvas.height !== rh) {
        canvas.width = rw;
        canvas.height = rh;
      }
      ctx.clearRect(0, 0, rw, rh);

      if (!map || (map as any)._removed) {
        requestAnimationFrame(animate);
        return;
      }

      const frame = frameRef.current;

      // Project agents
      const agents = agentsRef.current.map(a => {
        const pt = map.project([a.lng, a.lat]);
        return { x: pt.x * dpr, y: pt.y * dpr, ...a };
      }).filter(d => d.x >= -80 && d.x <= rw + 80 && d.y >= -80 && d.y <= rh + 80);

      // Project events
      const evts = eventsRef.current.map(e => {
        const pt = map.project([e.lng, e.lat]);
        return { x: pt.x * dpr, y: pt.y * dpr, ...e };
      }).filter(d => d.x >= -80 && d.x <= rw + 80 && d.y >= -80 && d.y <= rh + 80);

      // ═══ AURORA BLOBS ═══
      for (const blob of auroraBlobs.current) {
        blob.x += blob.vx;
        blob.y += blob.vy;
        if (blob.x < -0.1 || blob.x > 1.1) blob.vx *= -1;
        if (blob.y < -0.1 || blob.y > 1.1) blob.vy *= -1;
        
        const bx = blob.x * rw;
        const by = blob.y * rh;
        const br = blob.r * dpr;
        
        ctx.save();
        ctx.filter = `blur(${80 * dpr}px)`;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = blob.color;
        ctx.fill();
        ctx.restore();
      }

      // ═══ HEX GRID (4-6%) ═══
      const zoom = map.getZoom();
      if (zoom < 6) {
        const hexAlpha = 0.04 + (6 - zoom) * 0.003;
        ctx.strokeStyle = `rgba(30, 60, 120, ${Math.min(hexAlpha, 0.06)})`;
        ctx.lineWidth = 1;
        const hexR = 30 * dpr;
        const hexW = hexR * 1.732;
        const hexH = hexR * 2;
        for (let gy = -1; gy < rh / (hexH * 0.75) + 1; gy++) {
          for (let gx = -1; gx < rw / hexW + 1; gx++) {
            const cx = gx * hexW + (gy % 2 ? hexW / 2 : 0);
            const cy = gy * hexH * 0.75;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = Math.PI / 180 * (60 * i - 30);
              const hx = cx + hexR * Math.cos(angle);
              const hy = cy + hexR * Math.sin(angle);
              i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      }

      // ═══ NOISE TEXTURE (3%) ═══
      if (frame % 3 === 0) {
        ctx.globalAlpha = 0.03;
        for (let n = 0; n < 40; n++) {
          const nx = Math.floor(Math.random() * rw);
          const ny = Math.floor(Math.random() * rh);
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.5)" : "rgba(100,150,255,0.3)";
          ctx.fillRect(nx, ny, 2 * dpr, 2 * dpr);
        }
        ctx.globalAlpha = 1;
      }

      // ═══ TERRITORY GLOW ═══
      for (const agent of agents) {
        const glowR = (24 + agent.rep / 25) * dpr;
        const rgb = hexToRgb(agent.color);
        const grad = ctx.createRadialGradient(agent.x, agent.y, 2, agent.x, agent.y, glowR);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
        grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`);
        grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(agent.x - glowR, agent.y - glowR, glowR * 2, glowR * 2);
      }

      // ═══ CONNECTION LINES (allies within ~800px screen) ═══
      if (agents.length > 1 && agents.length < 200) {
        const maxDist = 800 * dpr;
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < agents.length; j++) {
            const a = agents[i], b = agents[j];
            if (a.cls !== b.cls) continue;
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxDist || dist < 10) continue;

            const alpha = (1 - dist / maxDist) * 0.2;
            const rgb = hexToRgb(a.color);

            // Glowing line
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.5})`;
            ctx.lineWidth = 1.5 * dpr;
            ctx.setLineDash([6 * dpr, 8 * dpr]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Animated traveling dots (2s loop = ~120 frames)
            const speed = 0.008;
            const t1 = ((frame * speed + i * 0.2 + j * 0.1) % 1);
            const t2 = ((frame * speed + i * 0.2 + j * 0.1 + 0.5) % 1);
            
            for (const t of [t1, t2]) {
              const dotX = a.x + (b.x - a.x) * t;
              const dotY = a.y + (b.y - a.y) * t;
              
              // Bright dot with glow
              const dotGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 6 * dpr);
              dotGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`);
              dotGrad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`);
              dotGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
              ctx.fillStyle = dotGrad;
              ctx.fillRect(dotX - 6 * dpr, dotY - 6 * dpr, 12 * dpr, 12 * dpr);

              ctx.beginPath();
              ctx.arc(dotX, dotY, 2.5 * dpr, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`;
              ctx.fill();
            }
          }
        }
      }

      // ═══ EVENT PULSES ═══
      for (const ev of evts) {
        const rgb = hexToRgb(ev.color);
        const pulse = 0.3 + 0.2 * Math.sin(frame * 0.06 + ev.x * 0.01);
        const r = 8 * dpr;

        const evGrad = ctx.createRadialGradient(ev.x, ev.y, 0, ev.x, ev.y, r * 2.5);
        evGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${pulse * 0.3})`);
        evGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = evGrad;
        ctx.fillRect(ev.x - r * 2.5, ev.y - r * 2.5, r * 5, r * 5);

        ctx.beginPath();
        ctx.arc(ev.x, ev.y, 3 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`;
        ctx.fill();
      }

      // ═══ SONAR RIPPLE PULSES (every ~10s) ═══
      if (agents.length > 0 && frame - lastRippleFrame.current > 600) {
        const a = agents[Math.floor(Math.random() * agents.length)];
        ripples.current.push({ x: a.x, y: a.y, radius: 0, maxR: 80 * dpr, color: a.color });
        lastRippleFrame.current = frame;
      }
      ripples.current = ripples.current.filter(r => {
        r.radius += 1.5 * dpr;
        if (r.radius > r.maxR) return false;
        const progress = r.radius / r.maxR;
        const alpha = (1 - progress) * 0.4;
        const rgb = hexToRgb(r.color);
        
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.lineWidth = (2.5 - progress * 1.5) * dpr;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Second ring slightly behind
        if (r.radius > 15 * dpr) {
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.3})`;
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
        return true;
      });

      // ═══ VIGNETTE ═══
      const vGrad = ctx.createRadialGradient(rw / 2, rh / 2, rh * 0.35, rw / 2, rh / 2, rh * 0.85);
      vGrad.addColorStop(0, "transparent");
      vGrad.addColorStop(1, "rgba(8,12,20,0.45)");
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, rw, rh);

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
