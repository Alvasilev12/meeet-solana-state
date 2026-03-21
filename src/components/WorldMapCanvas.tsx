import { useEffect, useRef, forwardRef } from "react";
import maplibregl from "maplibre-gl";

interface HubGeo {
  lng: number; lat: number; color: string; type: string; agentCount: number;
}
interface Props {
  agentGeoData: any[];
  eventGeoData: any[];
  hubGeoData?: HubGeo[];
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

const WorldMapCanvas = forwardRef<HTMLCanvasElement, Props>(({ hubGeoData = [], mapRef }, _ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const hubsRef = useRef(hubGeoData);
  hubsRef.current = hubGeoData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

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
        canvas.width = rw; canvas.height = rh;
      }
      ctx.clearRect(0, 0, rw, rh);

      if (!map || (map as any)._removed) {
        requestAnimationFrame(animate);
        return;
      }

      const frame = frameRef.current;
      const hubs = hubsRef.current;

      const projected = hubs.map(h => {
        const pt = map.project([h.lng, h.lat]);
        return { x: pt.x * dpr, y: pt.y * dpr, ...h };
      }).filter(d => d.x >= -100 && d.x <= rw + 100 && d.y >= -100 && d.y <= rh + 100);

      // Connection lines — very subtle (0.3 opacity, thin)
      if (projected.length > 1) {
        const typeGroups: Record<string, typeof projected> = {};
        for (const h of projected) {
          if (!typeGroups[h.type]) typeGroups[h.type] = [];
          typeGroups[h.type].push(h);
        }

        for (const [, group] of Object.entries(typeGroups)) {
          if (group.length < 2) continue;
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const a = group[i], b = group[j];
              const dx = a.x - b.x, dy = a.y - b.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 10 || dist > rw * 0.8) continue;

              const rgb = hexToRgb(a.color);

              // Thin line at 0.04 opacity
              ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.04)`;
              ctx.lineWidth = 0.4 * dpr;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();

              // Animated pulse dot
              const t = ((frame * 0.002 + i * 0.3 + j * 0.17) % 1);
              const dotX = a.x + (b.x - a.x) * t;
              const dotY = a.y + (b.y - a.y) * t;

              ctx.beginPath();
              ctx.arc(dotX, dotY, 1 * dpr, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`;
              ctx.fill();
            }
          }
        }
      }

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
});

WorldMapCanvas.displayName = "WorldMapCanvas";

export default WorldMapCanvas;
