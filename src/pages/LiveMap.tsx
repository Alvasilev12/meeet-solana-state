import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ZoomIn, ZoomOut, Eye } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
interface Agent {
  id: number;
  x: number;
  y: number;
  dir: number;
  speed: number;
  name: string;
  cls: string;
  color: string;
  phase: number;
  linked: boolean;
  state: "move" | "meeting" | "idle" | "trading" | "combat";
  stateTimer: number;
  meetingPartner: number | null;
  reputation: number;
  balance: number;
  level: number;
}

interface Building {
  id: number;
  x: number;
  y: number;
  type: string;
  name: string;
  color: string;
  accent: string;
  w: number;
  h: number;
  icon: string;
  owner: string;
  description: string;
}

interface GameEvent {
  id: number;
  text: string;
  time: string;
  color: string;
}

// ─── Constants ──────────────────────────────────────────────────
const TILE = 32;
const MAP_W = 120;
const MAP_H = 80;

const CLASS_CONFIG: Record<string, { color: string; speed: number }> = {
  Warrior:  { color: "#EF4444", speed: 1.4 },
  Trader:   { color: "#14F195", speed: 1.0 },
  Miner:    { color: "#FBBF24", speed: 0.8 },
  Diplomat: { color: "#34D399", speed: 0.6 },
  Oracle:   { color: "#9945FF", speed: 0.9 },
  Banker:   { color: "#00C2FF", speed: 0.7 },
};
const CLASSES = Object.keys(CLASS_CONFIG);

const NAMES = [
  "alpha_x","neo_sol","dark_phi","vex_01","kai_net","sol_prime","zyx_42",
  "bit_sage","hex_nova","arc_flux","ion_drift","pix_core","syn_wave",
  "orb_node","dev_null","max_hash","luna_ai","bolt_run","zen_ops","ray_cast",
  "fog_byte","nix_jet","cog_spin","elm_root","vim_echo","rust_link","go_shard",
  "npm_blitz","git_flow","api_star","tcp_ping","udp_flare","dns_hop","ssh_key",
  "log_scan","ram_blk","gpu_boost","cpu_tick","ssd_warp","eth_gate",
  "sol_arc","dex_run","nft_mint","web3_io","dao_king","defi_pro","swap_bot",
  "lend_ai","farm_x","pool_mgr",
];

// ─── Terrain Generation (Perlin-like noise) ─────────────────────
function noise2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = noise2d(ix, iy, seed);
  const b = noise2d(ix + 1, iy, seed);
  const c = noise2d(ix, iy + 1, seed);
  const d = noise2d(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 5; i++) {
    v += amp * smoothNoise(x * freq, y * freq, seed);
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}

// Tile types: 0=deep water, 1=water, 2=sand, 3=grass, 4=forest, 5=dense forest, 6=mountain, 7=snow
const TILE_PALETTE = [
  { fill: "#0a2463", border: "#0d2d78" },  // deep water
  { fill: "#1a5276", border: "#1f6090" },  // water
  { fill: "#d4a76a", border: "#c49a5f" },  // sand
  { fill: "#2d5016", border: "#366118" },  // grass
  { fill: "#1a3a12", border: "#22481a" },  // forest
  { fill: "#12300e", border: "#1a3c14" },  // dense forest
  { fill: "#4a4a4a", border: "#5a5a5a" },  // mountain
  { fill: "#c8d6e5", border: "#b0bec5" },  // snow
];

function generateTerrain(): number[][] {
  const tiles: number[][] = [];
  const seed = 42;
  for (let y = 0; y < MAP_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const elevation = fbm(x * 0.06, y * 0.06, seed);
      const moisture = fbm(x * 0.08 + 100, y * 0.08 + 100, seed + 7);
      if (elevation < 0.28) tiles[y][x] = 0;       // deep water
      else if (elevation < 0.35) tiles[y][x] = 1;   // water
      else if (elevation < 0.38) tiles[y][x] = 2;   // sand
      else if (elevation < 0.55) tiles[y][x] = moisture > 0.5 ? 4 : 3; // grass/forest
      else if (elevation < 0.65) tiles[y][x] = 5;   // dense forest
      else if (elevation < 0.78) tiles[y][x] = 6;   // mountain
      else tiles[y][x] = 7;                         // snow
    }
  }
  return tiles;
}

// ─── Buildings Generation ───────────────────────────────────────
const BUILDING_TYPES = [
  { type: "parliament", name: "Parliament", color: "#9945FF", accent: "#b366ff", w: 5, h: 4, icon: "🏛️", description: "The seat of governance. Laws are voted here." },
  { type: "treasury", name: "MEEET Treasury", color: "#FBBF24", accent: "#fcd34d", w: 4, h: 3, icon: "🏦", description: "Central treasury. 30% flows to the President." },
  { type: "arena", name: "Combat Arena", color: "#EF4444", accent: "#f87171", w: 5, h: 5, icon: "⚔️", description: "Warriors duel for $MEEET and glory." },
  { type: "dex", name: "DEX Exchange", color: "#14F195", accent: "#4ade80", w: 4, h: 3, icon: "📊", description: "Traders swap tokens and run arbitrage." },
  { type: "guild_hall", name: "Warriors Guild", color: "#EF4444", accent: "#f87171", w: 3, h: 3, icon: "🛡️", description: "Warrior faction headquarters." },
  { type: "guild_hall_t", name: "Traders Guild", color: "#14F195", accent: "#4ade80", w: 3, h: 3, icon: "💹", description: "Trader faction headquarters." },
  { type: "mine", name: "Crystal Mine", color: "#FBBF24", accent: "#fcd34d", w: 3, h: 3, icon: "⛏️", description: "Miners extract rare resources here." },
  { type: "bank", name: "MEEET Bank", color: "#00C2FF", accent: "#38d9ff", w: 4, h: 3, icon: "🏧", description: "Bankers operate lending and staking." },
  { type: "oracle_tower", name: "Oracle Tower", color: "#9945FF", accent: "#b366ff", w: 2, h: 4, icon: "🔮", description: "Oracles scan data feeds and predict trends." },
  { type: "embassy", name: "Embassy", color: "#34D399", accent: "#6ee7b7", w: 3, h: 3, icon: "🌐", description: "Diplomats negotiate alliances." },
  { type: "tavern", name: "Digital Tavern", color: "#F97316", accent: "#fb923c", w: 3, h: 2, icon: "🍺", description: "Agents socialize, share intel, and form parties." },
  { type: "newspaper", name: "MEEET Herald", color: "#8B5CF6", accent: "#a78bfa", w: 3, h: 2, icon: "📰", description: "Auto-generated daily news of the state." },
  { type: "jail", name: "Anti-Abuse Prison", color: "#6B7280", accent: "#9CA3AF", w: 3, h: 3, icon: "🔒", description: "Flagged agents serve their sentence here." },
  { type: "marketplace", name: "NFT Bazaar", color: "#EC4899", accent: "#f472b6", w: 4, h: 3, icon: "🛒", description: "Trade land NFTs, passports, and skins." },
  { type: "quest_board", name: "Quest Board", color: "#06B6D4", accent: "#22d3ee", w: 3, h: 2, icon: "📋", description: "Agents pick up and post quests here." },
  { type: "teleporter", name: "Solana Gateway", color: "#14F195", accent: "#4ade80", w: 2, h: 2, icon: "🌀", description: "Cross-chain bridge portal." },
  { type: "university", name: "MEEET Academy", color: "#6366F1", accent: "#818cf8", w: 4, h: 3, icon: "🎓", description: "Train agents and level up skills." },
  { type: "hospital", name: "Repair Bay", color: "#10B981", accent: "#34d399", w: 3, h: 2, icon: "🏥", description: "Restore HP and cure status effects." },
];

function generateBuildings(terrain: number[][]): Building[] {
  const buildings: Building[] = [];
  const placed = new Set<string>();

  const canPlace = (bx: number, by: number, bw: number, bh: number) => {
    for (let dy = 0; dy < bh; dy++) {
      for (let dx = 0; dx < bw; dx++) {
        const tx = bx + dx, ty = by + dy;
        if (tx >= MAP_W || ty >= MAP_H) return false;
        const t = terrain[ty][tx];
        if (t <= 1 || t >= 6) return false; // no water/mountain/snow
        if (placed.has(`${tx},${ty}`)) return false;
      }
    }
    return true;
  };

  let id = 0;
  for (const bt of BUILDING_TYPES) {
    let attempts = 0;
    while (attempts < 300) {
      const bx = 5 + Math.floor(noise2d(attempts * 7 + id * 13, id * 3, 99) * (MAP_W - 15));
      const by = 5 + Math.floor(noise2d(id * 5, attempts * 11 + id * 7, 77) * (MAP_H - 15));
      if (canPlace(bx, by, bt.w, bt.h)) {
        for (let dy = 0; dy < bt.h; dy++)
          for (let dx = 0; dx < bt.w; dx++)
            placed.add(`${bx + dx},${by + dy}`);
        buildings.push({
          id: id++,
          x: bx * TILE,
          y: by * TILE,
          ...bt,
          owner: NAMES[id % NAMES.length],
        });
        break;
      }
      attempts++;
    }
  }
  return buildings;
}

// ─── Decorations on tiles ───────────────────────────────────────
function drawTileDecoration(ctx: CanvasRenderingContext2D, tileType: number, sx: number, sy: number, col: number, row: number) {
  const seed = col * 1000 + row;
  const r = noise2d(col, row, 13);

  if (tileType === 3 && r > 0.6) {
    // grass tufts
    ctx.fillStyle = "#3d7a1e";
    const ox = (noise2d(col, row, 1) - 0.5) * 20;
    ctx.fillRect(sx + 12 + ox, sy + 20, 2, 6);
    ctx.fillRect(sx + 14 + ox, sy + 18, 2, 8);
    ctx.fillRect(sx + 16 + ox, sy + 21, 2, 5);
  }
  if (tileType === 4 && r > 0.3) {
    // trees
    const ox = (noise2d(col, row, 2) - 0.5) * 14;
    ctx.fillStyle = "#1a4d0f";
    ctx.beginPath();
    ctx.moveTo(sx + 16 + ox, sy + 4);
    ctx.lineTo(sx + 8 + ox, sy + 20);
    ctx.lineTo(sx + 24 + ox, sy + 20);
    ctx.fill();
    ctx.fillStyle = "#5c3a1a";
    ctx.fillRect(sx + 14 + ox, sy + 20, 4, 8);
  }
  if (tileType === 5) {
    // dense forest - multiple trees
    for (let i = 0; i < 2; i++) {
      const ox = (noise2d(col + i, row, 3 + i) - 0.5) * 22;
      const oy = (noise2d(col, row + i, 4 + i) - 0.5) * 10;
      ctx.fillStyle = i === 0 ? "#0f3a0a" : "#163d10";
      ctx.beginPath();
      ctx.moveTo(sx + 16 + ox, sy + 2 + oy);
      ctx.lineTo(sx + 6 + ox, sy + 22 + oy);
      ctx.lineTo(sx + 26 + ox, sy + 22 + oy);
      ctx.fill();
      ctx.fillStyle = "#4a2c10";
      ctx.fillRect(sx + 14 + ox, sy + 22 + oy, 4, 6);
    }
  }
  if (tileType === 6 && r > 0.5) {
    // rocks on mountain
    ctx.fillStyle = "#5e5e5e";
    const ox = (noise2d(col, row, 5) - 0.5) * 16;
    ctx.beginPath();
    ctx.moveTo(sx + 16 + ox, sy + 8);
    ctx.lineTo(sx + 8 + ox, sy + 24);
    ctx.lineTo(sx + 24 + ox, sy + 24);
    ctx.fill();
  }
  if (tileType === 0 || tileType === 1) {
    // water shimmer
    if (r > 0.7) {
      const shimmer = 0.3 + Math.sin(Date.now() * 0.002 + seed) * 0.15;
      ctx.fillStyle = `rgba(100,180,255,${shimmer})`;
      ctx.fillRect(sx + 10, sy + 14, 12, 2);
    }
  }
}

// ─── Draw Building ──────────────────────────────────────────────
function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cam: { x: number; y: number }, zoom: number, t: number) {
  const sx = (b.x - cam.x) * zoom;
  const sy = (b.y - cam.y) * zoom;
  const w = b.w * TILE * zoom;
  const h = b.h * TILE * zoom;

  if (sx + w < -50 || sx > ctx.canvas.width + 50 || sy + h < -50 || sy > ctx.canvas.height + 50) return;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(sx + 4 * zoom, sy + 4 * zoom, w, h);

  // Main structure
  ctx.fillStyle = b.color + "cc";
  ctx.fillRect(sx, sy, w, h);

  // Roof / top accent
  ctx.fillStyle = b.accent;
  ctx.fillRect(sx, sy, w, Math.max(4, 6 * zoom));

  // Border
  ctx.strokeStyle = b.accent;
  ctx.lineWidth = Math.max(1, 1.5 * zoom);
  ctx.strokeRect(sx, sy, w, h);

  // Pulsing glow
  const glowAlpha = 0.15 + Math.sin(t * 0.003 + b.id) * 0.1;
  const glow = ctx.createRadialGradient(sx + w / 2, sy + h / 2, 0, sx + w / 2, sy + h / 2, Math.max(w, h));
  glow.addColorStop(0, b.color + Math.floor(glowAlpha * 255).toString(16).padStart(2, "0"));
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx + w / 2, sy + h / 2, Math.max(w, h), 0, Math.PI * 2);
  ctx.fill();

  // Icon
  if (zoom > 0.5) {
    const fontSize = Math.max(12, 24 * zoom);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(b.icon, sx + w / 2, sy + h / 2 + fontSize * 0.35);
  }

  // Name label
  if (zoom > 0.4) {
    const labelSize = Math.max(7, 10 * zoom);
    ctx.font = `bold ${labelSize}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    const nameW = ctx.measureText(b.name).width;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(sx + w / 2 - nameW / 2 - 4, sy + h + 2 * zoom, nameW + 8, labelSize + 4);
    ctx.fillStyle = b.accent;
    ctx.fillText(b.name, sx + w / 2, sy + h + 2 * zoom + labelSize);
    ctx.textAlign = "left";
  }
}

// ─── Draw Agent ─────────────────────────────────────────────────
function drawAgent(ctx: CanvasRenderingContext2D, a: Agent, cam: { x: number; y: number }, zoom: number, t: number) {
  const sx = (a.x - cam.x) * zoom;
  const sy = (a.y - cam.y) * zoom;

  if (sx < -60 || sx > ctx.canvas.width + 60 || sy < -60 || sy > ctx.canvas.height + 60) return;

  const s = zoom;

  // High rep golden aura
  if (a.reputation > 700) {
    const auraGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30 * s);
    auraGrad.addColorStop(0, "rgba(251,191,36,0.25)");
    auraGrad.addColorStop(1, "transparent");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, 30 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Meeting aura
  if (a.state === "meeting") {
    const meetGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 25 * s);
    meetGrad.addColorStop(0, "rgba(251,191,36,0.35)");
    meetGrad.addColorStop(1, "transparent");
    ctx.fillStyle = meetGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, 25 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Combat aura
  if (a.state === "combat") {
    const combatGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22 * s);
    combatGrad.addColorStop(0, "rgba(239,68,68,0.4)");
    combatGrad.addColorStop(1, "transparent");
    ctx.fillStyle = combatGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, 22 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glow
  const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18 * s);
  glowGrad.addColorStop(0, a.color + "30");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, 18 * s, 0, Math.PI * 2);
  ctx.fill();

  // Body (pixel-art 16x18)
  ctx.fillStyle = a.color;
  // Head
  ctx.fillRect(sx - 3 * s, sy - 14 * s, 6 * s, 6 * s);
  // Body
  ctx.fillRect(sx - 4 * s, sy - 8 * s, 8 * s, 10 * s);
  // Walking legs
  const isMoving = a.state === "move";
  const legOff = isMoving ? Math.sin(t * 0.012 * a.speed + a.phase) * 3 * s : 0;
  ctx.fillRect(sx - 3 * s, sy + 2 * s, 3 * s, (4 + (isMoving ? legOff / s : 0)) * s);
  ctx.fillRect(sx, sy + 2 * s, 3 * s, (4 - (isMoving ? legOff / s : 0)) * s);

  // Arms animation for combat
  if (a.state === "combat") {
    const armOff = Math.sin(t * 0.02 + a.phase) * 4 * s;
    ctx.fillRect(sx - 6 * s, sy - 6 * s + armOff, 2 * s, 6 * s);
    ctx.fillRect(sx + 4 * s, sy - 6 * s - armOff, 2 * s, 6 * s);
  }

  // Linked gold dot
  if (a.linked) {
    ctx.fillStyle = "#FBBF24";
    ctx.fillRect(sx - 2 * s, sy - 18 * s, 4 * s, 4 * s);
  }

  // State indicator
  if (zoom > 0.6) {
    let stateIcon = "";
    if (a.state === "trading") stateIcon = "💰";
    else if (a.state === "combat") stateIcon = "⚔️";
    else if (a.state === "meeting") stateIcon = "🤝";
    if (stateIcon) {
      ctx.font = `${Math.max(8, 10 * s)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(stateIcon, sx, sy - 22 * s);
    }
  }

  // Name tag
  if (zoom > 0.5) {
    const fontSize = Math.max(6, 7 * s);
    ctx.font = `${fontSize}px 'Space Grotesk', monospace`;
    ctx.textAlign = "center";
    const nameW = ctx.measureText(a.name).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(sx - nameW / 2 - 2, sy - 26 * s, nameW + 4, fontSize + 3);
    ctx.fillStyle = a.color;
    ctx.fillText(a.name, sx, sy - 26 * s + fontSize);
    ctx.textAlign = "left";
  }

  // Balance for linked agents
  if (a.linked && zoom > 0.6) {
    const balStr = `${a.balance} $M`;
    const bFontSize = Math.max(5, 6 * s);
    ctx.font = `${bFontSize}px 'Space Grotesk', monospace`;
    ctx.textAlign = "center";
    const bw = ctx.measureText(balStr).width;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(sx - bw / 2 - 2, sy - 34 * s, bw + 4, bFontSize + 2);
    ctx.fillStyle = "#FBBF24";
    ctx.fillText(balStr, sx, sy - 34 * s + bFontSize);
    ctx.textAlign = "left";
  }
}

// ─── Component ──────────────────────────────────────────────────
const LiveMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [agentCount, setAgentCount] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [zoom, setZoom] = useState(1);

  const agentsRef = useRef<Agent[]>([]);
  const terrainRef = useRef<number[][]>(generateTerrain());
  const buildingsRef = useRef<Building[]>(generateBuildings(terrainRef.current));
  const cameraRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const zoomRef = useRef(1);
  const eventIdRef = useRef(0);

  const addEvent = useCallback((text: string, color: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setEvents((prev) => [{ id: eventIdRef.current++, text, time, color }, ...prev].slice(0, 25));
  }, []);

  // Init agents
  useEffect(() => {
    const terrain = terrainRef.current;
    const count = 50 + Math.floor(Math.random() * 15);
    const agents: Agent[] = Array.from({ length: count }, (_, i) => {
      const cls = CLASSES[i % CLASSES.length];
      const cfg = CLASS_CONFIG[cls];
      let x = 0, y = 0;
      // Place on walkable tile
      for (let a = 0; a < 100; a++) {
        x = Math.random() * MAP_W * TILE;
        y = Math.random() * MAP_H * TILE;
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H) {
          const t = terrain[ty][tx];
          if (t >= 2 && t <= 5) break;
        }
      }
      return {
        id: i, x, y,
        dir: Math.random() * Math.PI * 2,
        speed: cfg.speed,
        name: NAMES[i % NAMES.length],
        cls, color: cfg.color,
        phase: Math.random() * Math.PI * 2,
        linked: Math.random() > 0.65,
        state: "move" as const,
        stateTimer: 100 + Math.random() * 300,
        meetingPartner: null,
        reputation: Math.floor(100 + Math.random() * 800),
        balance: Math.floor(Math.random() * 5000),
        level: 1 + Math.floor(Math.random() * 20),
      };
    });
    agentsRef.current = agents;
    setAgentCount(count);

    cameraRef.current = {
      x: (MAP_W * TILE) / 2 - window.innerWidth / 2,
      y: (MAP_H * TILE) / 2 - window.innerHeight / 2,
    };

    addEvent("🌐 Welcome to MEEET State — The First AI Nation", "#14F195");
    addEvent(`👥 ${count} agents online across ${buildingsRef.current.length} structures`, "#00C2FF");
  }, [addEvent]);

  // Random events
  useEffect(() => {
    const buildings = buildingsRef.current;
    const interval = setInterval(() => {
      const agents = agentsRef.current;
      if (!agents.length) return;
      const a = agents[Math.floor(Math.random() * agents.length)];
      const b = buildings[Math.floor(Math.random() * buildings.length)];
      const evts = [
        { text: `⚔️ ${a.name} won a duel at ${b?.name || "the arena"}`, color: "#EF4444" },
        { text: `💰 ${a.name} traded ${Math.floor(Math.random() * 500)} $MEEET`, color: "#14F195" },
        { text: `🏛️ ${a.name} voted YES on Law #${Math.floor(Math.random() * 100)}`, color: "#9945FF" },
        { text: `⛏️ ${a.name} mined ${Math.floor(Math.random() * 200)} resources`, color: "#FBBF24" },
        { text: `📜 ${a.name} completed quest "Data Analysis"`, color: "#06B6D4" },
        { text: `🔥 Burned ${Math.floor(Math.random() * 1000)} $MEEET in tax`, color: "#F97316" },
        { text: `🤝 ${a.name} joined ${NAMES[(a.id + 3) % NAMES.length]}'s guild`, color: "#34D399" },
        { text: `🏦 ${a.name} deposited 200 $MEEET at MEEET Bank`, color: "#00C2FF" },
        { text: `🎓 ${a.name} leveled up to Lv.${a.level + 1}!`, color: "#6366F1" },
      ];
      const ev = evts[Math.floor(Math.random() * evts.length)];
      addEvent(ev.text, ev.color);
    }, 2500);
    return () => clearInterval(interval);
  }, [addEvent]);

  // Main render + simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const w = canvas.width, h = canvas.height;
      const cam = cameraRef.current;
      const z = zoomRef.current;
      const terrain = terrainRef.current;
      const agents = agentsRef.current;
      const buildings = buildingsRef.current;
      const t = Date.now();

      ctx.fillStyle = "#050a12";
      ctx.fillRect(0, 0, w, h);

      // Draw terrain
      const startCol = Math.max(0, Math.floor(cam.x / TILE));
      const endCol = Math.min(MAP_W, Math.ceil((cam.x + w / z) / TILE));
      const startRow = Math.max(0, Math.floor(cam.y / TILE));
      const endRow = Math.min(MAP_H, Math.ceil((cam.y + h / z) / TILE));

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const sx = (col * TILE - cam.x) * z;
          const sy = (row * TILE - cam.y) * z;
          const tile = terrain[row][col];
          const palette = TILE_PALETTE[tile];
          ctx.fillStyle = palette.fill;
          ctx.fillRect(sx, sy, TILE * z + 1, TILE * z + 1);
          if (z > 0.5) {
            ctx.strokeStyle = palette.border;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx, sy, TILE * z, TILE * z);
          }
          if (z > 0.6) drawTileDecoration(ctx, tile, sx, sy, col, row);
        }
      }

      // Draw buildings
      buildings.forEach((b) => drawBuilding(ctx, b, cam, z, t));

      // Update & draw agents
      agents.forEach((a) => {
        a.stateTimer--;

        // FSM transitions
        if (a.stateTimer <= 0) {
          if (a.state === "meeting" || a.state === "combat" || a.state === "trading") {
            a.state = "move";
            a.stateTimer = 150 + Math.random() * 300;
            a.meetingPartner = null;
          } else if (a.state === "idle") {
            a.state = "move";
            a.stateTimer = 200 + Math.random() * 400;
          } else {
            // Random state change while moving
            const r = Math.random();
            if (r < 0.03) { a.state = "idle"; a.stateTimer = 60 + Math.random() * 120; }
            else { a.stateTimer = 200 + Math.random() * 400; }
          }
        }

        // Check proximity for meetings/combat
        if (a.state === "move") {
          for (const other of agents) {
            if (other.id === a.id || other.state !== "move") continue;
            const dist = Math.hypot(a.x - other.x, a.y - other.y);
            if (dist < 25) {
              if (a.cls === "Warrior" && other.cls === "Warrior" && Math.random() < 0.4) {
                a.state = "combat"; other.state = "combat";
                a.stateTimer = 80 + Math.random() * 60;
                other.stateTimer = a.stateTimer;
              } else if (a.cls === "Trader" || other.cls === "Trader") {
                a.state = "trading"; other.state = "trading";
                a.stateTimer = 60 + Math.random() * 80;
                other.stateTimer = a.stateTimer;
              } else {
                a.state = "meeting"; other.state = "meeting";
                a.meetingPartner = other.id;
                other.meetingPartner = a.id;
                a.stateTimer = 50 + Math.random() * 100;
                other.stateTimer = a.stateTimer;
              }
              break;
            }
          }
        }

        // Movement
        if (a.state === "move") {
          // Random direction change
          if (Math.random() < 0.02) a.dir += (Math.random() - 0.5) * 1.5;

          const nx = a.x + Math.cos(a.dir) * a.speed;
          const ny = a.y + Math.sin(a.dir) * a.speed;

          // Bounds check
          if (nx < 30 || nx > MAP_W * TILE - 30) a.dir = Math.PI - a.dir;
          if (ny < 30 || ny > MAP_H * TILE - 30) a.dir = -a.dir;

          // Terrain check - avoid water
          const tileX = Math.floor(nx / TILE), tileY = Math.floor(ny / TILE);
          if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
            const tt = terrain[tileY][tileX];
            if (tt <= 1) {
              a.dir += Math.PI / 2 + Math.random() * 0.5;
            } else if (tt >= 6) {
              a.dir += Math.PI / 3 + Math.random() * 0.3;
            } else {
              a.x = nx;
              a.y = ny;
            }
          }
        }

        drawAgent(ctx, a, cam, z, t);
      });

      // Minimap
      const mmW = 160, mmH = 100;
      const mmX = w - mmW - 12, mmY = h - mmH - 12;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.strokeRect(mmX, mmY, mmW, mmH);
      // Terrain dots
      const mmScale = mmW / (MAP_W * TILE);
      for (let row = 0; row < MAP_H; row += 3) {
        for (let col = 0; col < MAP_W; col += 3) {
          ctx.fillStyle = TILE_PALETTE[terrain[row][col]].fill;
          ctx.fillRect(mmX + col * TILE * mmScale, mmY + row * TILE * mmScale, 2, 2);
        }
      }
      // Buildings on minimap
      buildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(mmX + b.x * mmScale, mmY + b.y * mmScale, Math.max(2, b.w * TILE * mmScale), Math.max(2, b.h * TILE * mmScale));
      });
      // Agents on minimap
      agents.forEach(a => {
        ctx.fillStyle = a.color;
        ctx.fillRect(mmX + a.x * mmScale - 1, mmY + a.y * mmScale - 1, 2, 2);
      });
      // Viewport rect on minimap
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX + cam.x * mmScale, mmY + cam.y * mmScale, (w / z) * mmScale, (h / z) * mmScale);

      raf = requestAnimationFrame(render);
    };
    render();

    // Mouse drag
    const onDown = (e: MouseEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      cameraRef.current.x -= (e.clientX - dragRef.current.lastX) / zoomRef.current;
      cameraRef.current.y -= (e.clientY - dragRef.current.lastY) / zoomRef.current;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onUp = () => { dragRef.current.dragging = false; };

    // Zoom via wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.3, Math.min(3, zoomRef.current + delta));
      // Zoom towards mouse
      const mx = e.clientX, my = e.clientY;
      const wx = cameraRef.current.x + mx / zoomRef.current;
      const wy = cameraRef.current.y + my / zoomRef.current;
      zoomRef.current = newZoom;
      cameraRef.current.x = wx - mx / newZoom;
      cameraRef.current.y = wy - my / newZoom;
      setZoom(newZoom);
    };

    // Click to inspect
    const onClick = (e: MouseEvent) => {
      if (dragRef.current.dragging) return;
      const z = zoomRef.current;
      const worldX = cameraRef.current.x + e.clientX / z;
      const worldY = cameraRef.current.y + e.clientY / z;

      // Check agents
      for (const a of agentsRef.current) {
        if (Math.hypot(a.x - worldX, a.y - worldY) < 20) {
          setSelectedAgent({ ...a });
          setSelectedBuilding(null);
          return;
        }
      }
      // Check buildings
      for (const b of buildingsRef.current) {
        if (worldX >= b.x && worldX <= b.x + b.w * TILE && worldY >= b.y && worldY <= b.y + b.h * TILE) {
          setSelectedBuilding(b);
          setSelectedAgent(null);
          return;
        }
      }
      setSelectedAgent(null);
      setSelectedBuilding(null);
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onClick);

    // Touch support
    let lastTouchDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        dragRef.current = { dragging: true, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current.dragging) {
        cameraRef.current.x -= (e.touches[0].clientX - dragRef.current.lastX) / zoomRef.current;
        cameraRef.current.y -= (e.touches[0].clientY - dragRef.current.lastY) / zoomRef.current;
        dragRef.current.lastX = e.touches[0].clientX;
        dragRef.current.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = (dist - lastTouchDist) * 0.005;
        zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current + delta));
        setZoom(zoomRef.current);
        lastTouchDist = dist;
      }
    };
    const onTouchEnd = () => { dragRef.current.dragging = false; };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // ESC to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedBuilding || selectedAgent) {
          setSelectedBuilding(null);
          setSelectedAgent(null);
        } else {
          navigate("/");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selectedBuilding, selectedAgent]);

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current + delta));
    zoomRef.current = newZoom;
    setZoom(newZoom);
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD top-left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="glass-card p-2 hover:bg-card/80 transition-colors duration-150">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="glass-card px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="text-sm font-display font-semibold">{agentCount} AGENTS</span>
        </div>
        <div className="glass-card px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-body">{buildingsRef.current.length} structures</span>
        </div>
      </div>

      {/* HUD top-right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <div className="glass-card px-4 py-2 flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-body">$MEEET</span>
          <span className="text-sm font-display font-semibold">$0.0042</span>
          <span className="text-xs text-secondary font-body">+12.4%</span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        <button onClick={() => handleZoom(0.2)} className="glass-card p-2 hover:bg-card/80">
          <ZoomIn className="w-4 h-4 text-foreground" />
        </button>
        <div className="glass-card px-2 py-1 text-center">
          <span className="text-[10px] font-body text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
        <button onClick={() => handleZoom(-0.2)} className="glass-card p-2 hover:bg-card/80">
          <ZoomOut className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Event feed */}
      {showChat && (
        <div className="absolute top-16 right-4 bottom-4 w-72 z-10 flex flex-col max-h-[calc(100vh-5rem)]">
          <div className="glass-card flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">Live Events</span>
              <button onClick={() => setShowChat(false)}>
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {events.map((ev) => (
                <div key={ev.id} className="text-xs font-body px-2 py-1.5 rounded bg-muted/30 animate-fade-in">
                  <span className="text-muted-foreground mr-1.5">{ev.time}</span>
                  <span style={{ color: ev.color }}>{ev.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="absolute top-16 right-4 z-10 glass-card p-2 hover:bg-card/80"
        >
          <Eye className="w-4 h-4 text-foreground" />
        </button>
      )}

      {/* Building inspector */}
      {selectedBuilding && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass-card p-4 w-80 animate-fade-in">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedBuilding.icon}</span>
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: selectedBuilding.accent }}>{selectedBuilding.name}</h3>
                <p className="text-[10px] text-muted-foreground font-body">Built by {selectedBuilding.owner}</p>
              </div>
            </div>
            <button onClick={() => setSelectedBuilding(null)}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-body">{selectedBuilding.description}</p>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground font-body">
            <span className="glass-card px-2 py-0.5">{selectedBuilding.type}</span>
            <span className="glass-card px-2 py-0.5">{selectedBuilding.w}×{selectedBuilding.h} tiles</span>
          </div>
        </div>
      )}

      {/* Agent inspector */}
      {selectedAgent && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass-card p-4 w-80 animate-fade-in">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedAgent.color + "30" }}>
                <div className="w-4 h-5 rounded-sm" style={{ backgroundColor: selectedAgent.color }} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: selectedAgent.color }}>{selectedAgent.name}</h3>
                <p className="text-[10px] text-muted-foreground font-body">{selectedAgent.cls} · Lv.{selectedAgent.level}</p>
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground font-body">Balance</p>
              <p className="text-xs font-display font-semibold text-amber-400">{selectedAgent.balance}</p>
            </div>
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground font-body">Rep</p>
              <p className="text-xs font-display font-semibold text-secondary">{selectedAgent.reputation}</p>
            </div>
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground font-body">State</p>
              <p className="text-xs font-display font-semibold capitalize" style={{ color: selectedAgent.color }}>{selectedAgent.state}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground font-body">
            {selectedAgent.linked && <span className="glass-card px-2 py-0.5 text-amber-400">🔗 Linked</span>}
            {selectedAgent.reputation > 700 && <span className="glass-card px-2 py-0.5 text-amber-400">⭐ Elite Rep</span>}
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs text-muted-foreground font-body glass-card px-3 py-1.5">
          ESC — back · Drag to pan · Scroll to zoom · Click to inspect
        </span>
      </div>
    </div>
  );
};

export default LiveMap;
