import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

// ──── Pixel Sprites (7×7) ────
const SPRITE_DATA: Record<string, number[][]> = {
  warrior: [
    [0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0],
    [0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,1,0,1,0,0],[0,1,1,0,1,1,0],
  ],
  trader: [
    [0,0,1,1,1,0,0],[0,1,0,0,0,1,0],[1,0,1,0,0,0,1],
    [1,0,0,1,0,0,1],[1,0,0,0,1,0,1],[0,1,0,0,0,1,0],[0,0,1,1,1,0,0],
  ],
  scout: [
    [0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,1,0,1,0,1,0],
    [0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,0,1,0,1,0,0],[0,1,0,0,0,1,0],
  ],
  diplomat: [
    [0,1,1,1,1,1,0],[0,1,0,0,0,1,0],[0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1],[0,0,0,1,0,0,0],[0,0,1,0,1,0,0],[0,1,0,0,0,1,0],
  ],
  builder: [
    [0,1,1,1,1,0,0],[0,1,0,0,0,0,0],[0,1,1,0,0,0,0],
    [0,0,0,0,0,0,0],[0,0,1,1,1,0,0],[0,1,0,0,0,1,0],[0,1,1,1,1,1,0],
  ],
  hacker: [
    [1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1],[1,1,1,1,1,1,1],[0,0,1,0,1,0,0],[0,1,1,1,1,1,0],
  ],
  president: [
    [0,0,1,1,1,0,0],[0,1,0,1,0,1,0],[1,1,1,1,1,1,1],
    [0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[0,0,1,0,1,0,0],[0,1,1,0,1,1,0],
  ],
  oracle: [
    [0,0,1,1,1,0,0],[0,1,0,0,0,1,0],[1,0,0,1,0,0,1],
    [1,0,1,1,1,0,1],[1,0,0,1,0,0,1],[0,1,0,0,0,1,0],[0,0,1,1,1,0,0],
  ],
  miner: [
    [0,0,0,0,1,1,0],[0,0,0,1,0,0,0],[0,0,1,0,0,0,0],
    [0,1,0,0,0,0,0],[1,1,1,0,0,0,0],[0,1,0,0,0,0,0],[0,1,0,0,0,0,0],
  ],
  banker: [
    [0,1,1,1,1,1,0],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],
    [1,0,1,0,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[0,1,1,1,1,1,0],
  ],
};

const EVENT_SPRITES: Record<string, number[][]> = {
  conflict: [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
  disaster: [[0,0,1,0,0],[0,1,1,1,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0]],
  discovery: [[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  diplomacy: [[0,1,0,1,0],[1,1,0,1,1],[0,0,1,0,0],[1,1,0,1,1],[0,1,0,1,0]],
};

const AGENT_COLORS: Record<string, string> = {
  warrior: "#ff4444", trader: "#ffbb33", scout: "#44ff88",
  diplomat: "#4488ff", builder: "#bb66ff", hacker: "#ff66bb",
  president: "#ffdd00", oracle: "#ffcc44", miner: "#44ddff", banker: "#aa66ff",
};

const EVENT_COLORS: Record<string, string> = {
  conflict: "#ff3333", disaster: "#ff8800", discovery: "#33aaff", diplomacy: "#33ff88",
};

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

// ──── Pixel rendering helpers ────
function drawSprite(
  ctx: CanvasRenderingContext2D, sprite: number[][],
  x: number, y: number, pixelSize: number, color: string, alpha = 1,
) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const h = sprite.length, w = sprite[0].length;
  const ox = x - (w * pixelSize) / 2, oy = y - (h * pixelSize) / 2;
  for (let row = 0; row < h; row++)
    for (let col = 0; col < w; col++)
      if (sprite[row][col])
        ctx.fillRect(Math.floor(ox + col * pixelSize), Math.floor(oy + row * pixelSize), pixelSize, pixelSize);
  ctx.globalAlpha = 1;
}

function drawPixelCircle(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  radius: number, pixelSize: number, color: string, alpha = 1,
) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const steps = Math.ceil(radius * 2 / pixelSize);
  for (let i = -steps; i <= steps; i++)
    for (let j = -steps; j <= steps; j++) {
      const px = i * pixelSize, py = j * pixelSize;
      if (Math.sqrt(px * px + py * py) <= radius)
        ctx.fillRect(Math.floor(cx + px - pixelSize / 2), Math.floor(cy + py - pixelSize / 2), pixelSize, pixelSize);
    }
  ctx.globalAlpha = 1;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ──── Main Component ────
const WorldMapCanvas = ({ agentGeoData, eventGeoData, mapRef }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const agentsRef = useRef(agentGeoData);
  const eventsRef = useRef(eventGeoData);
  agentsRef.current = agentGeoData;
  eventsRef.current = eventGeoData;

  // Persistent particle systems
  const sparkles = useRef<Array<{ x: number; y: number; life: number; maxLife: number; color: string; vx: number; vy: number; size: number }>>([]);
  const trails = useRef<Array<{ x: number; y: number; alpha: number; color: string }>>([]);
  const shockwaves = useRef<Array<{ x: number; y: number; radius: number; maxRadius: number; color: string }>>([]);
  const meteors = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; len: number }>>([]);

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
      const renderScale = 0.5;
      const rw = Math.floor(w * renderScale);
      const rh = Math.floor(h * renderScale);

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
      const pixelSize = 2;

      // Project agents
      const agents = agentsRef.current.map(a => {
        const pt = map.project([a.lng, a.lat]);
        return { x: pt.x * renderScale, y: pt.y * renderScale, ...a };
      }).filter(d => d.x >= -40 && d.x <= rw + 40 && d.y >= -40 && d.y <= rh + 40);

      // Project events
      const events = eventsRef.current.map(e => {
        const pt = map.project([e.lng, e.lat]);
        return { x: pt.x * renderScale, y: pt.y * renderScale, ...e };
      }).filter(d => d.x >= -40 && d.x <= rw + 40 && d.y >= -40 && d.y <= rh + 40);

      // ══════ LAYER 1: Terrain Hex Grid ══════
      ctx.strokeStyle = "rgba(100,140,255,0.03)";
      ctx.lineWidth = 1;
      const hexR = 24;
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

      // ══════ LAYER 2: Territory Glow Zones ══════
      for (const agent of agents) {
        const glowRadius = 18 + (agent.rep / 50);
        const rgb = hexToRgb(AGENT_COLORS[agent.cls] || "#9945FF");
        const gradient = ctx.createRadialGradient(agent.x, agent.y, 2, agent.x, agent.y, glowRadius);
        gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`);
        gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.04)`);
        gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(agent.x - glowRadius, agent.y - glowRadius, glowRadius * 2, glowRadius * 2);
      }

      // ══════ LAYER 3: Connection Lines (Data Streams) ══════
      if (agents.length > 1 && agents.length < 100) {
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < Math.min(agents.length, i + 6); j++) {
            const a = agents[i], b = agents[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 70 && dist > 5) {
              const alpha = (1 - dist / 70) * 0.2;
              // Animated data packet traveling along line
              const steps = Math.floor(dist / pixelSize);
              for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const lx = Math.floor((a.x + (b.x - a.x) * t) / pixelSize) * pixelSize;
                const ly = Math.floor((a.y + (b.y - a.y) * t) / pixelSize) * pixelSize;
                // Animated brightness pulse traveling along line
                const packetT = ((frame * 0.03 + i * 0.7) % 1);
                const packetDist = Math.abs(t - packetT);
                const packetGlow = packetDist < 0.15 ? (1 - packetDist / 0.15) * 0.6 : 0;
                ctx.fillStyle = a.cls === b.cls
                  ? AGENT_COLORS[a.cls] || "#6488ff"
                  : "#6488ff";
                ctx.globalAlpha = alpha + packetGlow;
                ctx.fillRect(lx, ly, pixelSize, pixelSize);
              }
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      // ══════ LAYER 4: Event Shockwaves ══════
      for (const ev of events) {
        const color = EVENT_COLORS[ev.type] || "#ff44ff";
        const rgb = hexToRgb(color);

        // Expanding ring
        const ringPhase = (frame * 0.02 + ev.x * 0.01 + ev.y * 0.01) % 1;
        const ringR = 8 + ringPhase * 30;
        const ringAlpha = (1 - ringPhase) * 0.2;
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${ringAlpha})`;
        ctx.lineWidth = pixelSize;
        ctx.beginPath();
        // Pixelated ring
        for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
          const rx = Math.floor((ev.x + Math.cos(angle) * ringR) / pixelSize) * pixelSize;
          const ry = Math.floor((ev.y + Math.sin(angle) * ringR) / pixelSize) * pixelSize;
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${ringAlpha})`;
          ctx.fillRect(rx, ry, pixelSize, pixelSize);
        }

        // Second ring offset
        const ring2Phase = (frame * 0.02 + ev.x * 0.01 + ev.y * 0.01 + 0.5) % 1;
        const ring2R = 8 + ring2Phase * 30;
        const ring2Alpha = (1 - ring2Phase) * 0.12;
        for (let angle = 0; angle < Math.PI * 2; angle += 0.4) {
          const rx = Math.floor((ev.x + Math.cos(angle) * ring2R) / pixelSize) * pixelSize;
          const ry = Math.floor((ev.y + Math.sin(angle) * ring2R) / pixelSize) * pixelSize;
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${ring2Alpha})`;
          ctx.fillRect(rx, ry, pixelSize, pixelSize);
        }

        // Core glow
        const pulse = 0.4 + 0.3 * Math.sin(frame * 0.1 + ev.x * 0.1);
        drawPixelCircle(ctx, ev.x, ev.y, 10, pixelSize, color, pulse * 0.3);

        // Blinking sprite
        const blink = Math.sin(frame * 0.1 + ev.y * 0.05) > -0.3;
        const sprite = EVENT_SPRITES[ev.type];
        if (blink && sprite) drawSprite(ctx, sprite, ev.x, ev.y, pixelSize + 1, color, 0.9);

        // Quest exclamation "!"
        if (frame % 60 < 45) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(Math.floor(ev.x - pixelSize / 2), Math.floor(ev.y - 20), pixelSize, pixelSize * 4);
          ctx.fillRect(Math.floor(ev.x - pixelSize / 2), Math.floor(ev.y - 13), pixelSize, pixelSize);
          ctx.globalAlpha = 1;
        }

        // Danger zone hatch pattern for conflicts
        if (ev.type === "conflict") {
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = color;
          for (let hx = -20; hx < 20; hx += 6) {
            for (let hy = -20; hy < 20; hy += 6) {
              if ((hx + hy) % 12 === 0) {
                ctx.fillRect(Math.floor(ev.x + hx), Math.floor(ev.y + hy), pixelSize, pixelSize);
              }
            }
          }
          ctx.globalAlpha = 1;
        }
      }

      // ══════ LAYER 5: Agent Sprites (enhanced) ══════
      for (const agent of agents) {
        const sprite = SPRITE_DATA[agent.cls] || SPRITE_DATA.warrior;
        const color = AGENT_COLORS[agent.cls] || "#ff44ff";
        const spritePixel = Math.max(pixelSize, Math.min(3, 2 + Math.floor(agent.rep / 200)));

        // Drop shadow
        drawSprite(ctx, sprite, agent.x + 1, agent.y + 2, spritePixel, "#000000", 0.35);

        // Bounce animation
        const bounce = Math.abs(Math.sin(frame * 0.06 + agent.x * 0.03)) * 3;
        const drawY = agent.y - bounce;

        // Aura ring for high-rep agents
        if (agent.rep > 100) {
          const auraPhase = (frame * 0.04 + agent.x * 0.05) % (Math.PI * 2);
          const auraR = 8 + Math.sin(auraPhase) * 2;
          const rgb = hexToRgb(color);
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(agent.x, drawY, auraR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Main sprite
        drawSprite(ctx, sprite, agent.x, drawY, spritePixel, color, 0.95);

        // Idle animation — breathing glow
        const breathe = 0.3 + 0.15 * Math.sin(frame * 0.04 + agent.y * 0.02);
        drawSprite(ctx, sprite, agent.x, drawY, spritePixel, "#ffffff", breathe * 0.1);

        // HP bar (rep-based)
        const barW = 12;
        const barH = 2;
        const hpFrac = Math.min(1, agent.rep / 500);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(Math.floor(agent.x - barW / 2), Math.floor(drawY - 12), barW, barH);
        ctx.fillStyle = hpFrac > 0.5 ? "#44ff88" : hpFrac > 0.2 ? "#ffbb33" : "#ff4444";
        ctx.fillRect(Math.floor(agent.x - barW / 2), Math.floor(drawY - 12), Math.floor(barW * hpFrac), barH);

        // Name label
        if (agents.length < 80) {
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.65;
          ctx.font = "6px monospace";
          ctx.textAlign = "center";
          ctx.fillText(agent.name.slice(0, 8), agent.x, agent.y + 14);
          ctx.globalAlpha = 1;
        }

        // Store trail point
        if (frame % 6 === 0 && trails.current.length < 400) {
          trails.current.push({ x: agent.x, y: agent.y, alpha: 0.3, color });
        }
      }

      // ══════ LAYER 6: Agent Trails ══════
      trails.current = trails.current.filter(t => {
        t.alpha -= 0.004;
        if (t.alpha <= 0) return false;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.alpha * 0.4;
        ctx.fillRect(
          Math.floor(t.x / pixelSize) * pixelSize,
          Math.floor(t.y / pixelSize) * pixelSize,
          pixelSize, pixelSize
        );
        ctx.globalAlpha = 1;
        return true;
      });

      // ══════ LAYER 7: Sparkle Particles (enhanced) ══════
      if (agents.length > 0 && frame % 4 === 0 && sparkles.current.length < 120) {
        const a = agents[Math.floor(Math.random() * agents.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.5;
        sparkles.current.push({
          x: a.x + (Math.random() - 0.5) * 16,
          y: a.y + (Math.random() - 0.5) * 16,
          life: 0, maxLife: 25 + Math.random() * 35,
          color: AGENT_COLORS[a.cls] || "#ffffff",
          vx: Math.cos(angle) * speed,
          vy: -Math.abs(Math.sin(angle) * speed) - 0.2,
          size: Math.random() > 0.7 ? pixelSize * 2 : pixelSize,
        });
      }

      // Event sparkles
      if (events.length > 0 && frame % 10 === 0 && sparkles.current.length < 150) {
        const ev = events[Math.floor(Math.random() * events.length)];
        sparkles.current.push({
          x: ev.x + (Math.random() - 0.5) * 20,
          y: ev.y + (Math.random() - 0.5) * 20,
          life: 0, maxLife: 30 + Math.random() * 20,
          color: EVENT_COLORS[ev.type] || "#ffffff",
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.4 - Math.random() * 0.3,
          size: pixelSize,
        });
      }

      sparkles.current = sparkles.current.filter(s => {
        s.life++;
        if (s.life >= s.maxLife) return false;
        s.x += s.vx;
        s.y += s.vy;
        s.vy -= 0.005; // slight upward acceleration
        const alpha = 1 - s.life / s.maxLife;
        const flicker = Math.sin(s.life * 0.5) > -0.3 ? 1 : 0.3;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha * 0.6 * flicker;
        ctx.fillRect(
          Math.floor(s.x / pixelSize) * pixelSize,
          Math.floor(s.y / pixelSize) * pixelSize,
          s.size, s.size,
        );
        ctx.globalAlpha = 1;
        return true;
      });

      // ══════ LAYER 8: Meteor Streaks ══════
      if (frame % 180 === 0 && meteors.current.length < 3) {
        meteors.current.push({
          x: Math.random() * rw, y: 0,
          vx: (Math.random() - 0.3) * 3, vy: 1.5 + Math.random() * 2,
          life: 0, color: "#ffcc44", len: 8 + Math.random() * 12,
        });
      }
      meteors.current = meteors.current.filter(m => {
        m.life++;
        m.x += m.vx;
        m.y += m.vy;
        if (m.y > rh + 20) return false;
        // Draw trail
        for (let t = 0; t < m.len; t++) {
          const tx = m.x - m.vx * t * 0.5;
          const ty = m.y - m.vy * t * 0.5;
          ctx.fillStyle = m.color;
          ctx.globalAlpha = (1 - t / m.len) * 0.5;
          ctx.fillRect(Math.floor(tx), Math.floor(ty), pixelSize, pixelSize);
        }
        ctx.globalAlpha = 1;
        return true;
      });

      // ══════ LAYER 9: Ambient floating dust ══════
      ctx.fillStyle = "rgba(255,200,100,0.03)";
      for (let d = 0; d < 20; d++) {
        const dx = ((frame * 0.3 + d * 137) % rw);
        const dy = ((frame * 0.1 + d * 89 + Math.sin(frame * 0.01 + d) * 15) % rh);
        ctx.fillRect(Math.floor(dx), Math.floor(dy), pixelSize, pixelSize);
      }

      // ══════ POST-PROCESSING ══════
      // Scanline CRT
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      for (let sy = 0; sy < rh; sy += 3) {
        ctx.fillRect(0, sy, rw, 1);
      }

      // Chromatic aberration hint on edges
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,0,0,0.008)";
      ctx.fillRect(2, 0, rw, rh);
      ctx.fillStyle = "rgba(0,0,255,0.008)";
      ctx.fillRect(-2, 0, rw, rh);
      ctx.globalCompositeOperation = "source-over";

      // Vignette
      const vGrad = ctx.createRadialGradient(rw / 2, rh / 2, rh * 0.25, rw / 2, rh / 2, rh * 0.85);
      vGrad.addColorStop(0, "transparent");
      vGrad.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, rw, rh);

      // Film grain
      if (frame % 2 === 0) {
        ctx.globalAlpha = 0.015;
        for (let g = 0; g < 30; g++) {
          const gx = Math.floor(Math.random() * rw / pixelSize) * pixelSize;
          const gy = Math.floor(Math.random() * rh / pixelSize) * pixelSize;
          ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
          ctx.fillRect(gx, gy, pixelSize, pixelSize);
        }
        ctx.globalAlpha = 1;
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
      style={{ zIndex: 5, imageRendering: "pixelated" }}
    />
  );
};

export default WorldMapCanvas;
