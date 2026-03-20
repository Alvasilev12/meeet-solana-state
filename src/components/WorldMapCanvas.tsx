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

interface AuroraBlob {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; phase: number;
}

const WorldMapCanvas = ({ agentGeoData, mapRef }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const agentsRef = useRef(agentGeoData);
  agentsRef.current = agentGeoData;

  const ripples = useRef<Array<{ x: number; y: number; radius: number; maxR: number; color: string }>>([]);
  const auroraBlobs = useRef<AuroraBlob[]>([]);
  const lastRippleFrame = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Init aurora blobs — very subtle
    if (auroraBlobs.current.length === 0) {
      const colors = [
        "rgba(139, 92, 246, 0.025)",
        "rgba(78, 205, 196, 0.025)",
        "rgba(99, 102, 241, 0.02)",
        "rgba(20, 184, 166, 0.02)",
      ];
      for (let i = 0; i < 4; i++) {
        auroraBlobs.current.push({
          x: Math.random(), y: Math.random(),
          vx: (Math.random() - 0.5) * 0.0002,
          vy: (Math.random() - 0.5) * 0.0002,
          r: 140 + Math.random() * 100,
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

      // Project agents for sonar ripples only
      const agents = agentsRef.current.map(a => {
        const pt = map.project([a.lng, a.lat]);
        return { x: pt.x * dpr, y: pt.y * dpr, ...a };
      }).filter(d => d.x >= -80 && d.x <= rw + 80 && d.y >= -80 && d.y <= rh + 80);

      // ═══ AURORA BLOBS (very subtle) ═══
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

      // ═══ SONAR RIPPLES (every ~15s, very gentle) ═══
      if (agents.length > 0 && frame - lastRippleFrame.current > 900) {
        const a = agents[Math.floor(Math.random() * agents.length)];
        ripples.current.push({ x: a.x, y: a.y, radius: 0, maxR: 60 * dpr, color: a.color });
        lastRippleFrame.current = frame;
      }
      ripples.current = ripples.current.filter(r => {
        r.radius += 1 * dpr;
        if (r.radius > r.maxR) return false;
        const progress = r.radius / r.maxR;
        const alpha = (1 - progress) * 0.2;
        const rgb = hexToRgb(r.color);

        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.lineWidth = (1.5 - progress) * dpr;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        return true;
      });

      // ═══ VIGNETTE ═══
      const vGrad = ctx.createRadialGradient(rw / 2, rh / 2, rh * 0.4, rw / 2, rh / 2, rh * 0.9);
      vGrad.addColorStop(0, "transparent");
      vGrad.addColorStop(1, "rgba(8,12,20,0.35)");
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
