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
  followAgentName?: string | null;
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

// ──── Aurora Generator ────
interface AuroraWave {
  y: number; amplitude: number; frequency: number; speed: number;
  color1: string; color2: string; width: number;
}

function generateAuroraWaves(): AuroraWave[] {
  return [
    { y: 0.15, amplitude: 20, frequency: 0.008, speed: 0.004, color1: "0,255,136", color2: "68,136,255", width: 40 },
    { y: 0.12, amplitude: 15, frequency: 0.012, speed: -0.003, color1: "153,69,255", color2: "0,255,136", width: 30 },
    { y: 0.18, amplitude: 25, frequency: 0.006, speed: 0.005, color1: "68,136,255", color2: "255,204,68", width: 35 },
  ];
}

// ──── Weather Particles ────
interface WeatherParticle {
  x: number; y: number; speed: number; size: number; opacity: number;
}

// ──── Main Component ────
const WorldMapCanvas = ({ agentGeoData, eventGeoData, mapRef, followAgentName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const agentsRef = useRef(agentGeoData);
  const eventsRef = useRef(eventGeoData);
  agentsRef.current = agentGeoData;
  eventsRef.current = eventGeoData;

  // Persistent particle systems
  const sparkles = useRef<Array<{ x: number; y: number; life: number; maxLife: number; color: string; vx: number; vy: number; size: number }>>([]);
  const trails = useRef<Array<{ x: number; y: number; alpha: number; color: string }>>([]);
  const meteors = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; len: number }>>([]);
  const auroraWaves = useRef<AuroraWave[]>(generateAuroraWaves());
  const weatherParticles = useRef<WeatherParticle[]>([]);
  const energyPulses = useRef<Array<{ x: number; y: number; radius: number; maxRadius: number; color: string; alpha: number }>>([]);

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
      }).filter(d => d.x >= -60 && d.x <= rw + 60 && d.y >= -60 && d.y <= rh + 60);

      // Project events
      const events = eventsRef.current.map(e => {
        const pt = map.project([e.lng, e.lat]);
        return { x: pt.x * renderScale, y: pt.y * renderScale, ...e };
      }).filter(d => d.x >= -60 && d.x <= rw + 60 && d.y >= -60 && d.y <= rh + 60);

      // ══════ LAYER 0: Aurora Borealis ══════
      const zoom = map.getZoom();
      const auroraIntensity = Math.max(0, 1 - (zoom - 2) * 0.3);
      if (auroraIntensity > 0) {
        for (const wave of auroraWaves.current) {
          const baseY = rh * wave.y;
          for (let x = 0; x < rw; x += pixelSize * 2) {
            const waveY = baseY + Math.sin(x * wave.frequency + frame * wave.speed) * wave.amplitude
              + Math.sin(x * wave.frequency * 1.7 + frame * wave.speed * 0.6) * wave.amplitude * 0.4;
            const colorT = (Math.sin(x * 0.005 + frame * 0.002) + 1) * 0.5;
            const c1 = wave.color1.split(",").map(Number);
            const c2 = wave.color2.split(",").map(Number);
            const cr = Math.round(c1[0] + (c2[0] - c1[0]) * colorT);
            const cg = Math.round(c1[1] + (c2[1] - c1[1]) * colorT);
            const cb = Math.round(c1[2] + (c2[2] - c1[2]) * colorT);

            for (let dy = 0; dy < wave.width; dy += pixelSize) {
              const falloff = 1 - dy / wave.width;
              const shimmer = 0.3 + 0.7 * Math.sin(x * 0.02 + dy * 0.1 + frame * 0.03) * Math.sin(frame * 0.007 + x * 0.003);
              const alpha = falloff * falloff * 0.04 * auroraIntensity * Math.max(0, shimmer);
              if (alpha > 0.002) {
                ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
                ctx.fillRect(Math.floor(x / pixelSize) * pixelSize, Math.floor((waveY + dy) / pixelSize) * pixelSize, pixelSize * 2, pixelSize);
              }
            }
          }
        }
      }

      // ══════ LAYER 0b: Atmospheric Fog Zones ══════
      if (zoom < 5) {
        const fogIntensity = Math.max(0, 1 - (zoom - 2) * 0.4);
        for (let fi = 0; fi < 6; fi++) {
          const fogX = ((frame * 0.3 + fi * 200) % (rw + 200)) - 100;
          const fogY = rh * (0.2 + fi * 0.12 + Math.sin(frame * 0.003 + fi) * 0.05);
          const fogW = 120 + fi * 40;
          const fogH = 30 + fi * 10;
          const fogGrad = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, fogW);
          fogGrad.addColorStop(0, `rgba(80,120,180,${0.02 * fogIntensity})`);
          fogGrad.addColorStop(0.5, `rgba(60,100,160,${0.01 * fogIntensity})`);
          fogGrad.addColorStop(1, "transparent");
          ctx.fillStyle = fogGrad;
          ctx.fillRect(fogX - fogW, fogY - fogH, fogW * 2, fogH * 2);
        }
      }

      // ══════ LAYER 1: Hex Grid (subtle) ══════
      if (zoom < 6) {
        const gridAlpha = Math.max(0.008, 0.03 - (zoom - 2) * 0.005);
        ctx.strokeStyle = `rgba(100,140,255,${gridAlpha})`;
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
      }

      // ══════ LAYER 2: Territory Glow Zones ══════
      for (const agent of agents) {
        const glowRadius = 20 + (agent.rep / 40) + (zoom > 4 ? 10 : 0);
        const rgb = hexToRgb(AGENT_COLORS[agent.cls] || "#9945FF");
        const gradient = ctx.createRadialGradient(agent.x, agent.y, 2, agent.x, agent.y, glowRadius);
        gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`);
        gradient.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`);
        gradient.addColorStop(0.7, `rgba(${rgb.r},${rgb.g},${rgb.b},0.02)`);
        gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(agent.x - glowRadius, agent.y - glowRadius, glowRadius * 2, glowRadius * 2);
      }

      // ══════ LAYER 3: Constellation Lines (Data Streams) ══════
      if (agents.length > 1 && agents.length < 120) {
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < Math.min(agents.length, i + 8); j++) {
            const a = agents[i], b = agents[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = zoom > 5 ? 120 : 90;
            if (dist < maxDist && dist > 5) {
              const sameClass = a.cls === b.cls;
              const alpha = (1 - dist / maxDist) * (sameClass ? 0.3 : 0.12);
              const lineColor = sameClass ? AGENT_COLORS[a.cls] || "#6488ff" : "#6488ff";
              const rgb = hexToRgb(lineColor);

              // Dotted constellation line
              const steps = Math.floor(dist / (pixelSize * 2));
              for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const lx = Math.floor((a.x + (b.x - a.x) * t) / pixelSize) * pixelSize;
                const ly = Math.floor((a.y + (b.y - a.y) * t) / pixelSize) * pixelSize;
                // Animated data packet
                const packetT = ((frame * 0.025 + i * 0.7) % 1);
                const packetDist = Math.abs(t - packetT);
                const packetGlow = packetDist < 0.12 ? (1 - packetDist / 0.12) * 0.7 : 0;
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha + packetGlow})`;
                ctx.fillRect(lx, ly, pixelSize, pixelSize);
              }

              // Constellation node dots at endpoints
              if (sameClass && dist < 50) {
                const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.5})`;
                ctx.fillRect(Math.floor(midX / pixelSize) * pixelSize, Math.floor(midY / pixelSize) * pixelSize, pixelSize, pixelSize);
              }
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // ══════ LAYER 4: Energy Pulses from Events ══════
      // Spawn new pulses
      if (events.length > 0 && frame % 90 === 0) {
        const ev = events[Math.floor((frame / 90) % events.length)];
        energyPulses.current.push({
          x: ev.x, y: ev.y,
          radius: 4, maxRadius: 60 + Math.random() * 40,
          color: EVENT_COLORS[ev.type] || "#ff44ff",
          alpha: 0.3,
        });
      }
      energyPulses.current = energyPulses.current.filter(p => {
        p.radius += 0.8;
        p.alpha = 0.3 * (1 - p.radius / p.maxRadius);
        if (p.radius >= p.maxRadius) return false;
        const rgb = hexToRgb(p.color);
        // Pixelated expanding ring
        for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
          const rx = Math.floor((p.x + Math.cos(angle) * p.radius) / pixelSize) * pixelSize;
          const ry = Math.floor((p.y + Math.sin(angle) * p.radius) / pixelSize) * pixelSize;
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${p.alpha})`;
          ctx.fillRect(rx, ry, pixelSize, pixelSize);
        }
        return true;
      });

      // ══════ LAYER 4b: Event Markers ══════
      for (const ev of events) {
        const color = EVENT_COLORS[ev.type] || "#ff44ff";
        const rgb = hexToRgb(color);

        // Core glow
        const pulse = 0.4 + 0.3 * Math.sin(frame * 0.1 + ev.x * 0.1);
        drawPixelCircle(ctx, ev.x, ev.y, 10, pixelSize, color, pulse * 0.3);

        // Blinking sprite
        const blink = Math.sin(frame * 0.1 + ev.y * 0.05) > -0.3;
        const sprite = EVENT_SPRITES[ev.type];
        if (blink && sprite) drawSprite(ctx, sprite, ev.x, ev.y, pixelSize + 1, color, 0.9);

        // Quest "!" marker
        if (frame % 60 < 45) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(Math.floor(ev.x - pixelSize / 2), Math.floor(ev.y - 22), pixelSize, pixelSize * 4);
          ctx.fillRect(Math.floor(ev.x - pixelSize / 2), Math.floor(ev.y - 15), pixelSize, pixelSize);
          ctx.globalAlpha = 1;
        }

        // Rotating orbit particles for conflict/disaster
        if (ev.type === "conflict" || ev.type === "disaster") {
          for (let o = 0; o < 3; o++) {
            const orbitAngle = frame * 0.04 + o * (Math.PI * 2 / 3);
            const orbitR = 14 + Math.sin(frame * 0.02 + o) * 3;
            const ox = Math.floor((ev.x + Math.cos(orbitAngle) * orbitR) / pixelSize) * pixelSize;
            const oy = Math.floor((ev.y + Math.sin(orbitAngle) * orbitR) / pixelSize) * pixelSize;
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`;
            ctx.fillRect(ox, oy, pixelSize, pixelSize);
          }
        }

        // Discovery sparkle ring
        if (ev.type === "discovery") {
          const sparklePhase = frame * 0.05;
          for (let s = 0; s < 6; s++) {
            const sa = sparklePhase + s * (Math.PI / 3);
            const sr = 12 + Math.sin(frame * 0.03 + s) * 4;
            const sx = Math.floor((ev.x + Math.cos(sa) * sr) / pixelSize) * pixelSize;
            const sy = Math.floor((ev.y + Math.sin(sa) * sr) / pixelSize) * pixelSize;
            const flicker = Math.sin(frame * 0.15 + s * 2) > 0 ? 0.7 : 0.2;
            ctx.fillStyle = `rgba(51,170,255,${flicker})`;
            ctx.fillRect(sx, sy, pixelSize, pixelSize);
          }
        }
      }

      // ══════ LAYER 5: Agent Sprites ══════
      const showLabels = agents.length < (zoom > 4 ? 120 : 60);
      const showLevelBadge = agents.length < 100;
      for (const agent of agents) {
        const sprite = SPRITE_DATA[agent.cls] || SPRITE_DATA.warrior;
        const color = AGENT_COLORS[agent.cls] || "#ff44ff";
        const spritePixel = Math.max(pixelSize, Math.min(4, 2 + Math.floor(agent.rep / 150)));
        const isFollowed = followAgentName && agent.name === followAgentName;

        // Drop shadow
        drawSprite(ctx, sprite, agent.x + 1, agent.y + 2, spritePixel, "#000000", 0.35);

        // Bounce animation
        const bounce = Math.abs(Math.sin(frame * 0.06 + agent.x * 0.03)) * 3;
        const drawY = agent.y - bounce;

        // Follow highlight ring
        if (isFollowed) {
          const followPulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
          const rgb2 = hexToRgb(color);
          // Double ring
          for (let ring = 0; ring < 2; ring++) {
            const ringR = 14 + ring * 6;
            ctx.strokeStyle = `rgba(${rgb2.r},${rgb2.g},${rgb2.b},${followPulse * (0.6 - ring * 0.25)})`;
            ctx.lineWidth = 2 - ring;
            ctx.beginPath();
            ctx.arc(agent.x, drawY, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Selection arrows (animated)
          const arrowY = drawY - 18 - Math.sin(frame * 0.1) * 3;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(Math.floor(agent.x - 1), Math.floor(arrowY), pixelSize, pixelSize);
          ctx.fillRect(Math.floor(agent.x - 3), Math.floor(arrowY - 2), pixelSize * 3, pixelSize);
          ctx.globalAlpha = 1;
        }

        // Aura ring for high-rep
        if (agent.rep > 100) {
          const auraPhase = (frame * 0.04 + agent.x * 0.05) % (Math.PI * 2);
          const auraR = 8 + Math.sin(auraPhase) * 2;
          const rgb = hexToRgb(color);
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(agent.x, drawY, auraR, 0, Math.PI * 2);
          ctx.stroke();
          // Second aura ring for very high rep
          if (agent.rep > 300) {
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.1)`;
            ctx.beginPath();
            ctx.arc(agent.x, drawY, auraR + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Main sprite
        drawSprite(ctx, sprite, agent.x, drawY, spritePixel, color, 0.95);

        // Breathing glow
        const breathe = 0.3 + 0.15 * Math.sin(frame * 0.04 + agent.y * 0.02);
        drawSprite(ctx, sprite, agent.x, drawY, spritePixel, "#ffffff", breathe * 0.12);

        // HP bar (improved with gradient)
        const barW = 14;
        const barH = 2;
        const hpFrac = Math.min(1, agent.rep / 500);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(Math.floor(agent.x - barW / 2) - 1, Math.floor(drawY - 13), barW + 2, barH + 2);
        const hpColor = hpFrac > 0.5 ? "#44ff88" : hpFrac > 0.2 ? "#ffbb33" : "#ff4444";
        ctx.fillStyle = hpColor;
        ctx.fillRect(Math.floor(agent.x - barW / 2), Math.floor(drawY - 12), Math.floor(barW * hpFrac), barH);

        // Level badge
        if (showLevelBadge) {
          const lvl = Math.min(99, Math.ceil(agent.rep / 50));
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(Math.floor(agent.x + 6), Math.floor(drawY - 11), 10, 8);
          ctx.fillStyle = color;
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${lvl}`, agent.x + 11, drawY - 4);
        }

        // Name label (zoom-dependent)
        if (showLabels) {
          ctx.fillStyle = isFollowed ? color : "#ffffff";
          ctx.globalAlpha = isFollowed ? 0.95 : 0.65;
          ctx.font = isFollowed ? "bold 7px monospace" : "6px monospace";
          ctx.textAlign = "center";
          ctx.fillText(agent.name.slice(0, 12), agent.x, agent.y + 15);
          ctx.globalAlpha = 1;
        }

        // Trail
        if (frame % 5 === 0 && trails.current.length < 600) {
          trails.current.push({ x: agent.x, y: agent.y, alpha: 0.35, color });
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

      // ══════ LAYER 7: Sparkle Particles ══════
      if (agents.length > 0 && frame % 4 === 0 && sparkles.current.length < 150) {
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
      if (events.length > 0 && frame % 8 === 0 && sparkles.current.length < 180) {
        const ev = events[Math.floor(Math.random() * events.length)];
        sparkles.current.push({
          x: ev.x + (Math.random() - 0.5) * 24,
          y: ev.y + (Math.random() - 0.5) * 24,
          life: 0, maxLife: 30 + Math.random() * 20,
          color: EVENT_COLORS[ev.type] || "#ffffff",
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.5 - Math.random() * 0.4,
          size: pixelSize,
        });
      }

      sparkles.current = sparkles.current.filter(s => {
        s.life++;
        if (s.life >= s.maxLife) return false;
        s.x += s.vx;
        s.y += s.vy;
        s.vy -= 0.005;
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
      if (frame % 140 === 0 && meteors.current.length < 4) {
        const startX = Math.random() * rw;
        meteors.current.push({
          x: startX, y: -5,
          vx: (Math.random() - 0.3) * 3, vy: 1.5 + Math.random() * 2,
          life: 0, color: Math.random() > 0.5 ? "#ffcc44" : "#44ddff", len: 10 + Math.random() * 14,
        });
      }
      meteors.current = meteors.current.filter(m => {
        m.life++;
        m.x += m.vx;
        m.y += m.vy;
        if (m.y > rh + 20) return false;
        for (let t = 0; t < m.len; t++) {
          const tx = m.x - m.vx * t * 0.5;
          const ty = m.y - m.vy * t * 0.5;
          ctx.fillStyle = m.color;
          ctx.globalAlpha = (1 - t / m.len) * 0.6;
          ctx.fillRect(Math.floor(tx), Math.floor(ty), pixelSize, pixelSize);
        }
        ctx.globalAlpha = 1;
        // Bright head
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.fillRect(Math.floor(m.x), Math.floor(m.y), pixelSize, pixelSize);
        ctx.globalAlpha = 1;
        return true;
      });

      // ══════ LAYER 9: Weather Particles ══════
      // Spawn rain/snow
      if (weatherParticles.current.length < 60 && frame % 3 === 0) {
        weatherParticles.current.push({
          x: Math.random() * rw,
          y: -2,
          speed: 1 + Math.random() * 2,
          size: pixelSize,
          opacity: 0.1 + Math.random() * 0.15,
        });
      }
      weatherParticles.current = weatherParticles.current.filter(p => {
        p.y += p.speed;
        p.x += 0.3; // wind drift
        if (p.y > rh) return false;
        ctx.fillStyle = "#aaccff";
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(Math.floor(p.x / pixelSize) * pixelSize, Math.floor(p.y / pixelSize) * pixelSize, 1, pixelSize * 2);
        ctx.globalAlpha = 1;
        return true;
      });

      // ══════ LAYER 10: Ambient dust ══════
      ctx.fillStyle = "rgba(255,200,100,0.03)";
      for (let d = 0; d < 25; d++) {
        const dx = ((frame * 0.3 + d * 137) % rw);
        const dy = ((frame * 0.1 + d * 89 + Math.sin(frame * 0.01 + d) * 15) % rh);
        ctx.fillRect(Math.floor(dx), Math.floor(dy), pixelSize, pixelSize);
      }

      // ══════ POST-PROCESSING ══════
      // Scanline CRT
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      for (let sy = 0; sy < rh; sy += 3) {
        ctx.fillRect(0, sy, rw, 1);
      }

      // Chromatic aberration
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,0,0,0.006)";
      ctx.fillRect(2, 0, rw, rh);
      ctx.fillStyle = "rgba(0,0,255,0.006)";
      ctx.fillRect(-2, 0, rw, rh);
      ctx.globalCompositeOperation = "source-over";

      // Vignette
      const vGrad = ctx.createRadialGradient(rw / 2, rh / 2, rh * 0.3, rw / 2, rh / 2, rh * 0.85);
      vGrad.addColorStop(0, "transparent");
      vGrad.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, rw, rh);

      // Film grain (sparse)
      if (frame % 2 === 0) {
        ctx.globalAlpha = 0.012;
        for (let g = 0; g < 25; g++) {
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
