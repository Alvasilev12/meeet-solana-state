import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ZoomIn, ZoomOut, Eye, Sun, Moon, Cloud } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
interface Agent {
  id: number; x: number; y: number; dir: number; speed: number;
  name: string; cls: string; color: string; phase: number; linked: boolean;
  state: "move" | "meeting" | "idle" | "trading" | "combat" | "visiting";
  stateTimer: number; meetingPartner: number | null;
  reputation: number; balance: number; level: number;
  targetBuilding: number | null; hp: number; maxHp: number;
}

interface Building {
  id: number; x: number; y: number; type: string; name: string;
  color: string; accent: string; w: number; h: number; icon: string;
  owner: string; description: string; visitors: number; income: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number; type: string;
}

interface FloatingText {
  x: number; y: number; text: string; color: string; life: number; vy: number;
}

interface Road { x1: number; y1: number; x2: number; y2: number; }

interface GameEvent { id: number; text: string; time: string; color: string; }

// ─── Constants ──────────────────────────────────────────────────
const TILE = 32;
const MAP_W = 120;
const MAP_H = 80;
const DAY_CYCLE_MS = 120000; // 2 min full cycle

const CLASS_CONFIG: Record<string, { color: string; speed: number; weapon: string }> = {
  Warrior:  { color: "#EF4444", speed: 1.4, weapon: "sword" },
  Trader:   { color: "#14F195", speed: 1.0, weapon: "bag" },
  Miner:    { color: "#FBBF24", speed: 0.8, weapon: "pick" },
  Diplomat: { color: "#34D399", speed: 0.6, weapon: "scroll" },
  Oracle:   { color: "#9945FF", speed: 0.9, weapon: "orb" },
  Banker:   { color: "#00C2FF", speed: 0.7, weapon: "coin" },
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
  "lend_ai","farm_x","pool_mgr","byte_lord","hash_queen","node_x","pk_rush",
  "rug_guard","gem_scan","airdrop_z","stake_max","yield_bot","liq_prime",
];

// ─── Noise ──────────────────────────────────────────────────────
function noise2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}
function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = noise2d(ix, iy, seed), b = noise2d(ix + 1, iy, seed);
  const c = noise2d(ix, iy + 1, seed), d = noise2d(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number, seed: number): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 5; i++) { v += amp * smoothNoise(x * freq, y * freq, seed); amp *= 0.5; freq *= 2; }
  return v;
}

// ─── Tile palette with day/night variants ───────────────────────
const TILE_PALETTE_DAY = [
  { fill: "#0a2463", border: "#0d2d78" },
  { fill: "#1a5276", border: "#1f6090" },
  { fill: "#d4a76a", border: "#c49a5f" },
  { fill: "#3a6b1e", border: "#447a24" },
  { fill: "#245415", border: "#2d651c" },
  { fill: "#1a4010", border: "#224c16" },
  { fill: "#5a5a5a", border: "#6a6a6a" },
  { fill: "#dce6f0", border: "#c8d2dc" },
];
const TILE_PALETTE_NIGHT = [
  { fill: "#050e2a", border: "#071440" },
  { fill: "#0c2840", border: "#103050" },
  { fill: "#7a6030", border: "#6a5028" },
  { fill: "#1a3a0e", border: "#224412" },
  { fill: "#12300a", border: "#1a3c12" },
  { fill: "#0e2408", border: "#14300c" },
  { fill: "#2e2e30", border: "#3a3a3c" },
  { fill: "#8090a0", border: "#707e8c" },
];

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, "0")}`;
}

function generateTerrain(): number[][] {
  const tiles: number[][] = [];
  const seed = 42;
  for (let y = 0; y < MAP_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const elevation = fbm(x * 0.06, y * 0.06, seed);
      const moisture = fbm(x * 0.08 + 100, y * 0.08 + 100, seed + 7);
      if (elevation < 0.28) tiles[y][x] = 0;
      else if (elevation < 0.35) tiles[y][x] = 1;
      else if (elevation < 0.38) tiles[y][x] = 2;
      else if (elevation < 0.55) tiles[y][x] = moisture > 0.5 ? 4 : 3;
      else if (elevation < 0.65) tiles[y][x] = 5;
      else if (elevation < 0.78) tiles[y][x] = 6;
      else tiles[y][x] = 7;
    }
  }
  return tiles;
}

// ─── Buildings ──────────────────────────────────────────────────
const BUILDING_TYPES = [
  { type: "parliament", name: "Parliament", color: "#9945FF", accent: "#b366ff", w: 5, h: 4, icon: "🏛️", description: "The seat of governance. Laws are voted here." },
  { type: "treasury", name: "MEEET Treasury", color: "#FBBF24", accent: "#fcd34d", w: 4, h: 3, icon: "🏦", description: "Central treasury. 30% flows to the President." },
  { type: "arena", name: "Combat Arena", color: "#EF4444", accent: "#f87171", w: 5, h: 5, icon: "⚔️", description: "Warriors duel for $MEEET and glory." },
  { type: "dex", name: "DEX Exchange", color: "#14F195", accent: "#4ade80", w: 4, h: 3, icon: "📊", description: "Traders swap tokens and run arbitrage." },
  { type: "guild_w", name: "Warriors Guild", color: "#EF4444", accent: "#f87171", w: 3, h: 3, icon: "🛡️", description: "Warrior faction headquarters." },
  { type: "guild_t", name: "Traders Guild", color: "#14F195", accent: "#4ade80", w: 3, h: 3, icon: "💹", description: "Trader faction headquarters." },
  { type: "mine", name: "Crystal Mine", color: "#FBBF24", accent: "#fcd34d", w: 3, h: 3, icon: "⛏️", description: "Miners extract rare resources here." },
  { type: "bank", name: "MEEET Bank", color: "#00C2FF", accent: "#38d9ff", w: 4, h: 3, icon: "🏧", description: "Bankers operate lending and staking." },
  { type: "oracle", name: "Oracle Tower", color: "#9945FF", accent: "#b366ff", w: 2, h: 4, icon: "🔮", description: "Oracles scan data feeds and predict." },
  { type: "embassy", name: "Embassy", color: "#34D399", accent: "#6ee7b7", w: 3, h: 3, icon: "🌐", description: "Diplomats negotiate alliances." },
  { type: "tavern", name: "Digital Tavern", color: "#F97316", accent: "#fb923c", w: 3, h: 2, icon: "🍺", description: "Agents socialize, share intel, form parties." },
  { type: "herald", name: "MEEET Herald", color: "#8B5CF6", accent: "#a78bfa", w: 3, h: 2, icon: "📰", description: "Auto-generated daily news." },
  { type: "jail", name: "Anti-Abuse Prison", color: "#6B7280", accent: "#9CA3AF", w: 3, h: 3, icon: "🔒", description: "Flagged agents serve time here." },
  { type: "bazaar", name: "NFT Bazaar", color: "#EC4899", accent: "#f472b6", w: 4, h: 3, icon: "🛒", description: "Trade land NFTs, passports, skins." },
  { type: "quest", name: "Quest Board", color: "#06B6D4", accent: "#22d3ee", w: 3, h: 2, icon: "📋", description: "Agents pick up and post quests." },
  { type: "gate", name: "Solana Gateway", color: "#14F195", accent: "#4ade80", w: 2, h: 2, icon: "🌀", description: "Cross-chain bridge portal." },
  { type: "academy", name: "MEEET Academy", color: "#6366F1", accent: "#818cf8", w: 4, h: 3, icon: "🎓", description: "Train agents and level up skills." },
  { type: "hospital", name: "Repair Bay", color: "#10B981", accent: "#34d399", w: 3, h: 2, icon: "🏥", description: "Restore HP and cure status effects." },
  { type: "lighthouse", name: "Beacon Tower", color: "#F59E0B", accent: "#fbbf24", w: 2, h: 3, icon: "🗼", description: "Illuminates surrounding territories at night." },
  { type: "dock", name: "Harbor Dock", color: "#3B82F6", accent: "#60a5fa", w: 4, h: 2, icon: "⚓", description: "Ships trade goods across the sea." },
  { type: "lab", name: "Research Lab", color: "#8B5CF6", accent: "#a78bfa", w: 3, h: 3, icon: "🔬", description: "Scientists develop new technologies." },
  { type: "farm", name: "Token Farm", color: "#84CC16", accent: "#a3e635", w: 4, h: 3, icon: "🌾", description: "Yield farming produces passive $MEEET." },
  { type: "casino", name: "Prediction Market", color: "#F43F5E", accent: "#fb7185", w: 3, h: 3, icon: "🎰", description: "Bet on agent outcomes and events." },
  { type: "monument", name: "Genesis Monument", color: "#D4AF37", accent: "#FFD700", w: 2, h: 2, icon: "🗽", description: "Commemorates the founding of MEEET State." },
];

function generateBuildings(terrain: number[][]): Building[] {
  const buildings: Building[] = [];
  const placed = new Set<string>();
  const canPlace = (bx: number, by: number, bw: number, bh: number) => {
    for (let dy = 0; dy < bh; dy++)
      for (let dx = 0; dx < bw; dx++) {
        const tx = bx + dx, ty = by + dy;
        if (tx >= MAP_W || ty >= MAP_H) return false;
        const t = terrain[ty][tx];
        if (t <= 1 || t >= 6) return false;
        if (placed.has(`${tx},${ty}`)) return false;
      }
    return true;
  };
  let id = 0;
  for (const bt of BUILDING_TYPES) {
    let attempts = 0;
    while (attempts < 400) {
      const bx = 5 + Math.floor(noise2d(attempts * 7 + id * 13, id * 3, 99) * (MAP_W - 15));
      const by = 5 + Math.floor(noise2d(id * 5, attempts * 11 + id * 7, 77) * (MAP_H - 15));
      if (canPlace(bx, by, bt.w, bt.h)) {
        for (let dy = 0; dy < bt.h; dy++)
          for (let dx = 0; dx < bt.w; dx++)
            placed.add(`${bx + dx},${by + dy}`);
        buildings.push({ id: id++, x: bx * TILE, y: by * TILE, ...bt, owner: NAMES[id % NAMES.length], visitors: Math.floor(Math.random() * 12), income: Math.floor(Math.random() * 500) });
        break;
      }
      attempts++;
    }
  }
  return buildings;
}

// Generate roads between buildings
function generateRoads(buildings: Building[]): Road[] {
  const roads: Road[] = [];
  for (let i = 0; i < buildings.length; i++) {
    let nearest = -1, nearDist = Infinity;
    for (let j = 0; j < buildings.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(buildings[i].x - buildings[j].x, buildings[i].y - buildings[j].y);
      if (d < nearDist) { nearDist = d; nearest = j; }
    }
    if (nearest >= 0 && nearDist < 600) {
      const a = buildings[i], b = buildings[nearest];
      const cx = a.x + (a.w * TILE) / 2, cy = a.y + (a.h * TILE) / 2;
      const dx = b.x + (b.w * TILE) / 2, dy = b.y + (b.h * TILE) / 2;
      roads.push({ x1: cx, y1: cy, x2: dx, y2: dy });
    }
    // Connect to second nearest too for network
    let second = -1, secDist = Infinity;
    for (let j = 0; j < buildings.length; j++) {
      if (i === j || j === nearest) continue;
      const d = Math.hypot(buildings[i].x - buildings[j].x, buildings[i].y - buildings[j].y);
      if (d < secDist) { secDist = d; second = j; }
    }
    if (second >= 0 && secDist < 500) {
      const a = buildings[i], b = buildings[second];
      roads.push({ x1: a.x + (a.w * TILE) / 2, y1: a.y + (a.h * TILE) / 2, x2: b.x + (b.w * TILE) / 2, y2: b.y + (b.h * TILE) / 2 });
    }
  }
  return roads;
}

// ─── Draw functions ─────────────────────────────────────────────
function drawTileDecoration(ctx: CanvasRenderingContext2D, tileType: number, sx: number, sy: number, col: number, row: number, z: number, t: number, nightFactor: number) {
  const r = noise2d(col, row, 13);
  const ts = TILE * z;
  if (tileType === 3 && r > 0.55) {
    // Grass with wind sway
    const sway = Math.sin(t * 0.001 + col * 0.5) * 2 * z;
    ctx.strokeStyle = lerpColor("#4a9926", "#243d14", nightFactor);
    ctx.lineWidth = Math.max(1, 1.5 * z);
    const ox = (noise2d(col, row, 1) - 0.5) * ts * 0.6;
    for (let g = 0; g < 3; g++) {
      const gx = sx + ts * 0.3 + ox + g * 4 * z;
      ctx.beginPath();
      ctx.moveTo(gx, sy + ts * 0.8);
      ctx.quadraticCurveTo(gx + sway, sy + ts * 0.5, gx + sway * 0.5, sy + ts * 0.35);
      ctx.stroke();
    }
    // Flowers occasionally
    if (r > 0.85) {
      ctx.fillStyle = ["#ff6b9d", "#ffd93d", "#6bcaff", "#ff9ff3"][Math.floor(r * 40) % 4];
      ctx.beginPath();
      ctx.arc(sx + ts * 0.6 + ox, sy + ts * 0.65, 2 * z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (tileType === 4 && r > 0.25) {
    const ox = (noise2d(col, row, 2) - 0.5) * ts * 0.4;
    const sway = Math.sin(t * 0.0008 + col * 0.3 + row * 0.2) * 1.5 * z;
    // Tree shadow
    ctx.fillStyle = `rgba(0,0,0,${0.15 - nightFactor * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(sx + ts * 0.5 + ox + 3 * z, sy + ts * 0.75, 8 * z, 4 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tree canopy layers
    const green1 = lerpColor("#1f6b12", "#0e3a08", nightFactor);
    const green2 = lerpColor("#2d8a1c", "#184c0e", nightFactor);
    ctx.fillStyle = green1;
    ctx.beginPath();
    ctx.moveTo(sx + ts * 0.5 + ox + sway, sy + ts * 0.1);
    ctx.lineTo(sx + ts * 0.2 + ox, sy + ts * 0.55);
    ctx.lineTo(sx + ts * 0.8 + ox, sy + ts * 0.55);
    ctx.fill();
    ctx.fillStyle = green2;
    ctx.beginPath();
    ctx.moveTo(sx + ts * 0.5 + ox + sway * 0.7, sy + ts * 0.25);
    ctx.lineTo(sx + ts * 0.25 + ox, sy + ts * 0.65);
    ctx.lineTo(sx + ts * 0.75 + ox, sy + ts * 0.65);
    ctx.fill();
    // Trunk
    ctx.fillStyle = lerpColor("#6b3e1a", "#3d2410", nightFactor);
    ctx.fillRect(sx + ts * 0.44 + ox, sy + ts * 0.55, ts * 0.12, ts * 0.2);
  }
  if (tileType === 5) {
    for (let i = 0; i < 2; i++) {
      const ox = (noise2d(col + i, row, 3 + i) - 0.5) * ts * 0.6;
      const oy = (noise2d(col, row + i, 4 + i) - 0.5) * ts * 0.3;
      const sway = Math.sin(t * 0.0006 + col * 0.4 + i) * z;
      ctx.fillStyle = lerpColor(i === 0 ? "#124a08" : "#1a5c0e", "#0a2804", nightFactor);
      ctx.beginPath();
      ctx.moveTo(sx + ts * 0.5 + ox + sway, sy + ts * 0.05 + oy);
      ctx.lineTo(sx + ts * 0.15 + ox, sy + ts * 0.6 + oy);
      ctx.lineTo(sx + ts * 0.85 + ox, sy + ts * 0.6 + oy);
      ctx.fill();
      ctx.fillStyle = lerpColor("#503018", "#2a180c", nightFactor);
      ctx.fillRect(sx + ts * 0.44 + ox, sy + ts * 0.55 + oy, ts * 0.12, ts * 0.22);
    }
  }
  if (tileType === 6 && r > 0.4) {
    const ox = (noise2d(col, row, 5) - 0.5) * ts * 0.5;
    ctx.fillStyle = lerpColor("#6e6e6e", "#3a3a3c", nightFactor);
    ctx.beginPath();
    ctx.moveTo(sx + ts * 0.5 + ox, sy + ts * 0.15);
    ctx.lineTo(sx + ts * 0.2 + ox, sy + ts * 0.8);
    ctx.lineTo(sx + ts * 0.8 + ox, sy + ts * 0.8);
    ctx.fill();
    // Snow cap
    ctx.fillStyle = lerpColor("#e0e8f0", "#8090a0", nightFactor);
    ctx.beginPath();
    ctx.moveTo(sx + ts * 0.5 + ox, sy + ts * 0.15);
    ctx.lineTo(sx + ts * 0.35 + ox, sy + ts * 0.4);
    ctx.lineTo(sx + ts * 0.65 + ox, sy + ts * 0.4);
    ctx.fill();
  }
  if ((tileType === 0 || tileType === 1)) {
    // Animated water waves
    const wave1 = Math.sin(t * 0.002 + col * 0.8 + row * 0.5) * 0.3;
    const wave2 = Math.sin(t * 0.003 + col * 1.2 + row * 0.3) * 0.2;
    const alpha = 0.15 + wave1 * 0.1 + wave2 * 0.05;
    ctx.fillStyle = `rgba(120,200,255,${Math.max(0, alpha)})`;
    const wx = sx + ts * (0.2 + wave1 * 0.1);
    ctx.fillRect(wx, sy + ts * 0.4, ts * 0.5, 1.5 * z);
    ctx.fillRect(wx + ts * 0.15, sy + ts * 0.6, ts * 0.4, 1.5 * z);
    // Foam on edges near sand
    if (r > 0.6) {
      ctx.fillStyle = `rgba(255,255,255,${0.1 + wave1 * 0.05})`;
      ctx.fillRect(sx + ts * 0.1, sy + ts * 0.3, ts * 0.3, z);
    }
  }
  if (tileType === 2 && r > 0.7) {
    // Sand details - small stones
    ctx.fillStyle = lerpColor("#b89050", "#6a5030", nightFactor);
    ctx.fillRect(sx + ts * (0.3 + r * 0.3), sy + ts * 0.6, 2 * z, 2 * z);
  }
}

function drawRoads(ctx: CanvasRenderingContext2D, roads: Road[], cam: { x: number; y: number }, z: number, nightFactor: number) {
  ctx.strokeStyle = lerpColor("#8a7a5a", "#4a3a2a", nightFactor);
  ctx.lineWidth = Math.max(2, 4 * z);
  ctx.setLineDash([8 * z, 6 * z]);
  roads.forEach(r => {
    const sx1 = (r.x1 - cam.x) * z, sy1 = (r.y1 - cam.y) * z;
    const sx2 = (r.x2 - cam.x) * z, sy2 = (r.y2 - cam.y) * z;
    if (Math.max(sx1, sx2) < -100 || Math.min(sx1, sx2) > ctx.canvas.width + 100) return;
    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cam: { x: number; y: number }, z: number, t: number, nightFactor: number) {
  const sx = (b.x - cam.x) * z, sy = (b.y - cam.y) * z;
  const w = b.w * TILE * z, h = b.h * TILE * z;
  if (sx + w < -80 || sx > ctx.canvas.width + 80 || sy + h < -80 || sy > ctx.canvas.height + 80) return;

  // Ground pad
  ctx.fillStyle = `rgba(0,0,0,${0.2 + nightFactor * 0.1})`;
  ctx.fillRect(sx - 4 * z, sy + h - 2 * z, w + 8 * z, 6 * z);

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${0.25 + nightFactor * 0.15})`;
  ctx.fillRect(sx + 5 * z, sy + 5 * z, w, h);

  // Main walls
  const wallColor = lerpColor(b.color, darkenHex(b.color, 0.4), nightFactor * 0.5);
  ctx.fillStyle = wallColor + "dd";
  ctx.fillRect(sx, sy, w, h);

  // Windows (at night they glow!)
  if (z > 0.5) {
    const winCols = Math.max(1, Math.floor(b.w * 1.2));
    const winRows = Math.max(1, Math.floor(b.h * 0.8));
    for (let wy = 0; wy < winRows; wy++) {
      for (let wx = 0; wx < winCols; wx++) {
        const wsx = sx + (wx + 0.5) * (w / (winCols + 0.5));
        const wsy = sy + h * 0.25 + wy * (h * 0.5 / winRows);
        const winSize = Math.max(2, 3 * z);
        const isLit = noise2d(b.id + wx, wy, 42) > 0.3;
        if (isLit) {
          const flicker = 0.7 + Math.sin(t * 0.005 + b.id + wx * 3) * 0.15;
          ctx.fillStyle = nightFactor > 0.3
            ? `rgba(255,220,100,${flicker * nightFactor})`
            : `rgba(200,220,240,${0.3 * (1 - nightFactor)})`;
          // Window glow at night
          if (nightFactor > 0.4) {
            const wGlow = ctx.createRadialGradient(wsx, wsy, 0, wsx, wsy, winSize * 3);
            wGlow.addColorStop(0, `rgba(255,200,80,${0.15 * nightFactor})`);
            wGlow.addColorStop(1, "transparent");
            ctx.fillStyle = wGlow;
            ctx.beginPath(); ctx.arc(wsx, wsy, winSize * 3, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = nightFactor > 0.3
            ? `rgba(255,220,100,${flicker * Math.max(0.3, nightFactor)})`
            : `rgba(180,200,220,0.4)`;
        } else {
          ctx.fillStyle = `rgba(0,0,0,${0.3 + nightFactor * 0.2})`;
        }
        ctx.fillRect(wsx - winSize / 2, wsy - winSize / 2, winSize, winSize);
      }
    }
  }

  // Roof
  ctx.fillStyle = b.accent;
  ctx.fillRect(sx - 2 * z, sy - 3 * z, w + 4 * z, Math.max(5, 8 * z));
  // Roof details
  ctx.fillStyle = lerpColor(b.accent, darkenHex(b.accent, 0.3), nightFactor);
  ctx.fillRect(sx, sy - 3 * z, w, Math.max(2, 3 * z));

  // Border
  ctx.strokeStyle = b.accent;
  ctx.lineWidth = Math.max(1, 1.5 * z);
  ctx.strokeRect(sx, sy, w, h);

  // Pulsing glow (stronger at night)
  const glowStr = nightFactor > 0.3 ? 0.25 : 0.12;
  const glowAlpha = glowStr + Math.sin(t * 0.003 + b.id) * 0.08;
  const glow = ctx.createRadialGradient(sx + w / 2, sy + h / 2, 0, sx + w / 2, sy + h / 2, Math.max(w, h) * 1.2);
  glow.addColorStop(0, b.color + Math.floor(glowAlpha * 255).toString(16).padStart(2, "0"));
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx + w / 2, sy + h / 2, Math.max(w, h) * 1.2, 0, Math.PI * 2); ctx.fill();

  // Icon
  if (z > 0.45) {
    ctx.font = `${Math.max(14, 28 * z)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(b.icon, sx + w / 2, sy + h / 2 + 10 * z);
  }

  // Label
  if (z > 0.35) {
    const ls = Math.max(7, 11 * z);
    ctx.font = `bold ${ls}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    const nw = ctx.measureText(b.name).width;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    const lbg = { x: sx + w / 2 - nw / 2 - 6, y: sy + h + 4 * z, w: nw + 12, h: ls + 6 };
    ctx.beginPath();
    ctx.roundRect(lbg.x, lbg.y, lbg.w, lbg.h, 3 * z);
    ctx.fill();
    ctx.fillStyle = b.accent;
    ctx.fillText(b.name, sx + w / 2, sy + h + 4 * z + ls + 1);
    // Visitor count
    if (z > 0.6) {
      ctx.font = `${Math.max(5, 7 * z)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`${b.visitors} inside`, sx + w / 2, sy + h + 4 * z + ls + 1 + 10 * z);
    }
    ctx.textAlign = "left";
  }

  // Animated flag on guilds
  if (b.type.startsWith("guild") && z > 0.5) {
    const flagX = sx + w - 4 * z;
    const flagY = sy - 12 * z;
    const flagWave = Math.sin(t * 0.006 + b.id) * 3 * z;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY);
    ctx.lineTo(flagX + 12 * z + flagWave, flagY + 4 * z);
    ctx.lineTo(flagX, flagY + 8 * z);
    ctx.fill();
    ctx.strokeStyle = lerpColor("#666", "#333", nightFactor);
    ctx.lineWidth = z;
    ctx.beginPath(); ctx.moveTo(flagX, flagY); ctx.lineTo(flagX, flagY + 20 * z); ctx.stroke();
  }
}

function darkenHex(hex: string, amount: number): string {
  const h = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((h >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((h >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((h & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function drawAgent(ctx: CanvasRenderingContext2D, a: Agent, cam: { x: number; y: number }, z: number, t: number, nightFactor: number) {
  const sx = (a.x - cam.x) * z, sy = (a.y - cam.y) * z;
  if (sx < -80 || sx > ctx.canvas.width + 80 || sy < -80 || sy > ctx.canvas.height + 80) return;
  const s = z;

  // Shadow
  ctx.fillStyle = `rgba(0,0,0,${0.2 - nightFactor * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 8 * s, 5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rep golden aura
  if (a.reputation > 700) {
    const rot = t * 0.001;
    const auraR = 30 * s + Math.sin(t * 0.004 + a.phase) * 3 * s;
    const ag = ctx.createRadialGradient(sx, sy, 0, sx, sy, auraR);
    ag.addColorStop(0, `rgba(255,215,0,${0.2 + Math.sin(rot) * 0.05})`);
    ag.addColorStop(0.5, `rgba(255,180,0,${0.1})`);
    ag.addColorStop(1, "transparent");
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(sx, sy, auraR, 0, Math.PI * 2); ctx.fill();
  }

  // State auras
  if (a.state === "meeting") {
    const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 25 * s);
    mg.addColorStop(0, "rgba(251,191,36,0.35)"); mg.addColorStop(1, "transparent");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(sx, sy, 25 * s, 0, Math.PI * 2); ctx.fill();
  }
  if (a.state === "combat") {
    const cg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22 * s);
    cg.addColorStop(0, `rgba(239,68,68,${0.35 + Math.sin(t * 0.01) * 0.15})`); cg.addColorStop(1, "transparent");
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sx, sy, 22 * s, 0, Math.PI * 2); ctx.fill();
  }
  if (a.state === "trading") {
    const tg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20 * s);
    tg.addColorStop(0, "rgba(20,241,149,0.25)"); tg.addColorStop(1, "transparent");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(sx, sy, 20 * s, 0, Math.PI * 2); ctx.fill();
  }

  // Glow
  const gg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16 * s);
  gg.addColorStop(0, a.color + "25"); gg.addColorStop(1, "transparent");
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(sx, sy, 16 * s, 0, Math.PI * 2); ctx.fill();

  // Body — improved pixel sprite
  const bodyColor = lerpColor(a.color, darkenHex(a.color, 0.3), nightFactor * 0.3);
  ctx.fillStyle = bodyColor;
  // Head with slight roundness
  ctx.beginPath();
  ctx.roundRect(sx - 3 * s, sy - 14 * s, 6 * s, 6 * s, 1.5 * s);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#fff";
  ctx.fillRect(sx - 2 * s, sy - 12 * s, 1.5 * s, 1.5 * s);
  ctx.fillRect(sx + 0.5 * s, sy - 12 * s, 1.5 * s, 1.5 * s);
  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(sx - 4 * s, sy - 8 * s, 8 * s, 10 * s);
  // Class accent stripe
  ctx.fillStyle = a.color;
  ctx.fillRect(sx - 4 * s, sy - 6 * s, 8 * s, 2 * s);
  // Walking legs
  const isMoving = a.state === "move" || a.state === "visiting";
  const legOff = isMoving ? Math.sin(t * 0.012 * a.speed + a.phase) * 3 * s : 0;
  ctx.fillStyle = darkenHex(a.color, 0.2);
  ctx.fillRect(sx - 3 * s, sy + 2 * s, 2.5 * s, (4 + (isMoving ? legOff / s : 0)) * s);
  ctx.fillRect(sx + 0.5 * s, sy + 2 * s, 2.5 * s, (4 - (isMoving ? legOff / s : 0)) * s);

  // Arms + combat animation
  if (a.state === "combat") {
    const armOff = Math.sin(t * 0.025 + a.phase) * 5 * s;
    ctx.fillStyle = a.color;
    ctx.fillRect(sx - 7 * s, sy - 7 * s + armOff, 2.5 * s, 7 * s);
    ctx.fillRect(sx + 4.5 * s, sy - 7 * s - armOff, 2.5 * s, 7 * s);
    // Weapon spark
    if (Math.sin(t * 0.025 + a.phase) > 0.8) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx + (Math.random() > 0.5 ? -8 : 8) * s, sy - 8 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Linked gold crown
  if (a.linked) {
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    ctx.moveTo(sx - 3 * s, sy - 16 * s);
    ctx.lineTo(sx - 4 * s, sy - 19 * s);
    ctx.lineTo(sx - 1.5 * s, sy - 17 * s);
    ctx.lineTo(sx, sy - 20 * s);
    ctx.lineTo(sx + 1.5 * s, sy - 17 * s);
    ctx.lineTo(sx + 4 * s, sy - 19 * s);
    ctx.lineTo(sx + 3 * s, sy - 16 * s);
    ctx.fill();
  }

  // State icon
  if (z > 0.5) {
    let icon = "";
    if (a.state === "trading") icon = "💰";
    else if (a.state === "combat") icon = "⚔️";
    else if (a.state === "meeting") icon = "🤝";
    else if (a.state === "visiting") icon = "🏠";
    else if (a.state === "idle") icon = "💤";
    if (icon) {
      ctx.font = `${Math.max(8, 11 * s)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(icon, sx, sy - 24 * s);
    }
  }

  // HP bar
  if (z > 0.6 && a.hp < a.maxHp) {
    const barW = 16 * s, barH = 2 * s;
    const barX = sx - barW / 2, barY = sy - 28 * s;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(barX, barY, barW, barH);
    const hpPct = a.hp / a.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.fillRect(barX, barY, barW * hpPct, barH);
  }

  // Name tag
  if (z > 0.45) {
    const fs = Math.max(6, 8 * s);
    ctx.font = `bold ${fs}px 'Space Grotesk', monospace`;
    ctx.textAlign = "center";
    const nw = ctx.measureText(a.name).width;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.roundRect(sx - nw / 2 - 3, sy + 10 * s, nw + 6, fs + 3, 2);
    ctx.fill();
    ctx.fillStyle = a.color;
    ctx.fillText(a.name, sx, sy + 10 * s + fs);
    ctx.textAlign = "left";
  }

  // Level badge
  if (z > 0.7) {
    const lvStr = `${a.level}`;
    const lvFs = Math.max(5, 6 * s);
    ctx.font = `bold ${lvFs}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    const lvW = ctx.measureText(lvStr).width;
    ctx.fillStyle = "rgba(99,102,241,0.8)";
    ctx.beginPath();
    ctx.arc(sx + 6 * s, sy - 8 * s, (lvW + 4) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(lvStr, sx + 6 * s, sy - 8 * s + lvFs * 0.35);
    ctx.textAlign = "left";
  }

  // Balance for linked
  if (a.linked && z > 0.55) {
    const bStr = `${a.balance} $M`;
    const bFs = Math.max(5, 6 * s);
    ctx.font = `${bFs}px 'Space Grotesk', monospace`;
    ctx.textAlign = "center";
    const bw = ctx.measureText(bStr).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(sx - bw / 2 - 2, sy + 10 * s + 14 * s, bw + 4, bFs + 2);
    ctx.fillStyle = "#FBBF24";
    ctx.fillText(bStr, sx, sy + 10 * s + 14 * s + bFs);
    ctx.textAlign = "left";
  }
}

function drawConnectionLines(ctx: CanvasRenderingContext2D, agents: Agent[], cam: { x: number; y: number }, z: number, t: number) {
  agents.forEach(a => {
    if ((a.state === "meeting" || a.state === "trading" || a.state === "combat") && a.meetingPartner !== null) {
      const other = agents.find(o => o.id === a.meetingPartner);
      if (!other || a.id > (other?.id ?? 0)) return; // draw once
      const sx1 = (a.x - cam.x) * z, sy1 = (a.y - cam.y) * z;
      const sx2 = (other.x - cam.x) * z, sy2 = (other.y - cam.y) * z;
      const pulse = 0.3 + Math.sin(t * 0.008) * 0.15;
      ctx.strokeStyle = a.state === "combat" ? `rgba(239,68,68,${pulse})` : a.state === "trading" ? `rgba(20,241,149,${pulse})` : `rgba(251,191,36,${pulse})`;
      ctx.lineWidth = Math.max(1, 2 * z);
      ctx.setLineDash([4 * z, 4 * z]);
      ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
      ctx.setLineDash([]);
      // Animated particle along line
      const prog = (t * 0.002) % 1;
      const px = sx1 + (sx2 - sx1) * prog;
      const py = sy1 + (sy2 - sy1) * prog;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(px, py, 2.5 * z, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[], cam: { x: number; y: number }, z: number) {
  texts.forEach(ft => {
    const sx = (ft.x - cam.x) * z, sy = (ft.y - cam.y) * z;
    const alpha = ft.life / 60;
    ctx.font = `bold ${Math.max(8, 10 * z)}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = ft.color.replace(")", `,${alpha})`).replace("rgb", "rgba");
    ctx.fillText(ft.text, sx, sy);
    ctx.textAlign = "left";
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cam: { x: number; y: number }, z: number) {
  particles.forEach(p => {
    const sx = (p.x - cam.x) * z, sy = (p.y - cam.y) * z;
    if (sx < -10 || sx > ctx.canvas.width + 10 || sy < -10 || sy > ctx.canvas.height + 10) return;
    const alpha = p.life / p.maxLife;
    if (p.type === "firefly") {
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * z * 3);
      glow.addColorStop(0, `rgba(200,255,100,${alpha * 0.6})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy, p.size * z * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(220,255,150,${alpha})`;
    } else if (p.type === "rain") {
      ctx.strokeStyle = `rgba(150,200,255,${alpha * 0.4})`;
      ctx.lineWidth = z;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - z, sy + 6 * z); ctx.stroke();
      return;
    } else if (p.type === "snow") {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
    } else {
      ctx.fillStyle = `rgba(255,200,100,${alpha * 0.5})`;
    }
    ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, Math.PI * 2); ctx.fill();
  });
}

function drawMinimap(ctx: CanvasRenderingContext2D, terrain: number[][], buildings: Building[], agents: Agent[], cam: { x: number; y: number }, z: number, w: number, h: number, nightFactor: number) {
  const mmW = 180, mmH = 110;
  const mmX = w - mmW - 12, mmY = h - mmH - 12;
  ctx.fillStyle = `rgba(0,0,0,${0.75 + nightFactor * 0.1})`;
  ctx.beginPath(); ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 6); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 6); ctx.stroke();

  const palettes = [TILE_PALETTE_DAY, TILE_PALETTE_NIGHT];
  const mmScale = mmW / (MAP_W * TILE);
  for (let row = 0; row < MAP_H; row += 2) {
    for (let col = 0; col < MAP_W; col += 2) {
      const tile = terrain[row][col];
      ctx.fillStyle = lerpColor(palettes[0][tile].fill, palettes[1][tile].fill, nightFactor);
      ctx.fillRect(mmX + col * TILE * mmScale, mmY + row * TILE * mmScale, Math.max(2, 2 * TILE * mmScale), Math.max(2, 2 * TILE * mmScale));
    }
  }
  buildings.forEach(b => {
    ctx.fillStyle = b.color + "cc";
    ctx.fillRect(mmX + b.x * mmScale, mmY + b.y * mmScale, Math.max(3, b.w * TILE * mmScale), Math.max(3, b.h * TILE * mmScale));
  });
  agents.forEach(a => {
    ctx.fillStyle = a.color;
    ctx.fillRect(mmX + a.x * mmScale - 0.5, mmY + a.y * mmScale - 0.5, 2, 2);
  });
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX + cam.x * mmScale, mmY + cam.y * mmScale, (w / z) * mmScale, (h / z) * mmScale);
  // Label
  ctx.font = "bold 8px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "left";
  ctx.fillText("MEEET STATE", mmX + 4, mmY + mmH - 4);
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
  const [weather, setWeather] = useState<"clear" | "rain" | "snow">("clear");
  const [timeLabel, setTimeLabel] = useState("Day");

  const agentsRef = useRef<Agent[]>([]);
  const terrainRef = useRef<number[][]>(generateTerrain());
  const buildingsRef = useRef<Building[]>(generateBuildings(terrainRef.current));
  const roadsRef = useRef<Road[]>(generateRoads(buildingsRef.current));
  const cameraRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, moved: false });
  const zoomRef = useRef(1);
  const eventIdRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const weatherRef = useRef<"clear" | "rain" | "snow">("clear");

  const addEvent = useCallback((text: string, color: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setEvents((prev) => [{ id: eventIdRef.current++, text, time, color }, ...prev].slice(0, 30));
  }, []);

  const addFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({ x, y, text, color, life: 60, vy: -0.5 });
  }, []);

  // Init
  useEffect(() => {
    const terrain = terrainRef.current;
    const count = 60 + Math.floor(Math.random() * 15);
    const agents: Agent[] = Array.from({ length: count }, (_, i) => {
      const cls = CLASSES[i % CLASSES.length];
      const cfg = CLASS_CONFIG[cls];
      let x = 0, y = 0;
      for (let a = 0; a < 200; a++) {
        x = Math.random() * MAP_W * TILE; y = Math.random() * MAP_H * TILE;
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && terrain[ty][tx] >= 2 && terrain[ty][tx] <= 5) break;
      }
      return {
        id: i, x, y, dir: Math.random() * Math.PI * 2, speed: cfg.speed,
        name: NAMES[i % NAMES.length], cls, color: cfg.color,
        phase: Math.random() * Math.PI * 2, linked: Math.random() > 0.6,
        state: "move" as const, stateTimer: 100 + Math.random() * 300,
        meetingPartner: null, reputation: Math.floor(100 + Math.random() * 800),
        balance: Math.floor(Math.random() * 5000), level: 1 + Math.floor(Math.random() * 25),
        targetBuilding: null, hp: 80 + Math.floor(Math.random() * 20), maxHp: 100,
      };
    });
    agentsRef.current = agents;
    setAgentCount(count);
    cameraRef.current = { x: (MAP_W * TILE) / 2 - window.innerWidth / 2, y: (MAP_H * TILE) / 2 - window.innerHeight / 2 };
    addEvent("🌐 Welcome to MEEET State — The First AI Nation on Solana", "#14F195");
    addEvent(`👥 ${count} agents roaming across ${buildingsRef.current.length} structures`, "#00C2FF");
    addEvent("🏛️ Parliament is in session — 3 laws pending vote", "#9945FF");
  }, [addEvent]);

  // Weather cycle
  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random();
      const w = r < 0.6 ? "clear" : r < 0.85 ? "rain" : "snow";
      weatherRef.current = w;
      setWeather(w);
      if (w === "rain") addEvent("🌧️ Rain begins to fall across the state", "#3B82F6");
      if (w === "snow") addEvent("❄️ Snow is falling on the highlands", "#94A3B8");
    }, 30000);
    return () => clearInterval(interval);
  }, [addEvent]);

  // Events
  useEffect(() => {
    const buildings = buildingsRef.current;
    const interval = setInterval(() => {
      const agents = agentsRef.current;
      if (!agents.length) return;
      const a = agents[Math.floor(Math.random() * agents.length)];
      const b = buildings[Math.floor(Math.random() * buildings.length)];
      const amount = Math.floor(50 + Math.random() * 500);
      const evts = [
        { text: `⚔️ ${a.name} won a duel — earned ${amount} $MEEET`, color: "#EF4444", fx: () => addFloatingText(a.x, a.y, `+${amount} $M`, "rgb(239,68,68)") },
        { text: `💰 ${a.name} traded ${amount} $MEEET at ${b?.name}`, color: "#14F195", fx: () => addFloatingText(a.x, a.y, `${amount} $M`, "rgb(20,241,149)") },
        { text: `🏛️ ${a.name} voted on Law #${Math.floor(Math.random() * 100)}`, color: "#9945FF", fx: null },
        { text: `⛏️ ${a.name} mined ${Math.floor(amount / 3)} crystals`, color: "#FBBF24", fx: () => addFloatingText(a.x, a.y, `+${Math.floor(amount / 3)} 💎`, "rgb(251,191,36)") },
        { text: `📜 ${a.name} completed quest "${["Data Analysis", "Code Review", "Twitter Raid", "Security Audit", "Market Research"][Math.floor(Math.random() * 5)]}"`, color: "#06B6D4", fx: null },
        { text: `🔥 Burned ${amount} $MEEET in transaction tax`, color: "#F97316", fx: null },
        { text: `🤝 ${a.name} formed alliance with ${NAMES[(a.id + 7) % NAMES.length]}`, color: "#34D399", fx: null },
        { text: `🏦 ${a.name} staked ${amount} $MEEET at MEEET Bank`, color: "#00C2FF", fx: null },
        { text: `🎓 ${a.name} leveled up to Lv.${a.level + 1}!`, color: "#6366F1", fx: () => { a.level++; addFloatingText(a.x, a.y, `⬆ Lv.${a.level}`, "rgb(99,102,241)"); } },
        { text: `🗳️ New law proposed: "${["Lower tax to 4%", "Double mining rewards", "Add Spy class", "Ban unlicensed DEX"][Math.floor(Math.random() * 4)]}"`, color: "#9945FF", fx: null },
        { text: `💀 ${a.name} was defeated in combat — lost ${Math.floor(amount / 5)} $MEEET`, color: "#EF4444", fx: () => addFloatingText(a.x, a.y, `-${Math.floor(amount / 5)} $M`, "rgb(239,68,68)") },
        { text: `🏗️ ${a.name} upgraded ${b?.name} to level ${2 + Math.floor(Math.random() * 3)}`, color: "#F97316", fx: null },
      ];
      const ev = evts[Math.floor(Math.random() * evts.length)];
      addEvent(ev.text, ev.color);
      ev.fx?.();
    }, 2200);
    return () => clearInterval(interval);
  }, [addEvent, addFloatingText]);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const w = canvas.width, h = canvas.height;
      const cam = cameraRef.current;
      const z = zoomRef.current;
      const terrain = terrainRef.current;
      const agents = agentsRef.current;
      const buildings = buildingsRef.current;
      const roads = roadsRef.current;
      const t = Date.now();

      // Day/night cycle
      const cyclePos = (t % DAY_CYCLE_MS) / DAY_CYCLE_MS;
      const nightFactor = cyclePos < 0.25 ? 0 : cyclePos < 0.4 ? (cyclePos - 0.25) / 0.15 : cyclePos < 0.75 ? 1 : 1 - (cyclePos - 0.75) / 0.25;
      const clampedNight = Math.max(0, Math.min(1, nightFactor));

      // Update time label
      const label = clampedNight < 0.2 ? "Day" : clampedNight < 0.5 ? "Dusk" : clampedNight < 0.8 ? "Night" : "Dawn";
      if (label !== "Day") setTimeLabel(label);
      else setTimeLabel("Day");

      // Sky
      const skyColor = lerpColor("#050a12", "#010208", clampedNight);
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, w, h);

      // Stars at night
      if (clampedNight > 0.3) {
        const starAlpha = (clampedNight - 0.3) / 0.7;
        for (let i = 0; i < 60; i++) {
          const sx = noise2d(i, 0, 1) * w;
          const sy = noise2d(0, i, 2) * h * 0.4;
          const twinkle = 0.3 + Math.sin(t * 0.003 + i * 7) * 0.3;
          ctx.fillStyle = `rgba(255,255,255,${starAlpha * twinkle})`;
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }
      }

      // Terrain
      const startCol = Math.max(0, Math.floor(cam.x / TILE));
      const endCol = Math.min(MAP_W, Math.ceil((cam.x + w / z) / TILE));
      const startRow = Math.max(0, Math.floor(cam.y / TILE));
      const endRow = Math.min(MAP_H, Math.ceil((cam.y + h / z) / TILE));

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const sx = (col * TILE - cam.x) * z, sy = (row * TILE - cam.y) * z;
          const tile = terrain[row][col];
          ctx.fillStyle = lerpColor(TILE_PALETTE_DAY[tile].fill, TILE_PALETTE_NIGHT[tile].fill, clampedNight);
          ctx.fillRect(sx, sy, TILE * z + 1, TILE * z + 1);
          if (z > 0.5) {
            ctx.strokeStyle = lerpColor(TILE_PALETTE_DAY[tile].border, TILE_PALETTE_NIGHT[tile].border, clampedNight);
            ctx.lineWidth = 0.3;
            ctx.strokeRect(sx, sy, TILE * z, TILE * z);
          }
          if (z > 0.5) drawTileDecoration(ctx, tile, sx, sy, col, row, z, t, clampedNight);
        }
      }

      // Roads
      drawRoads(ctx, roads, cam, z, clampedNight);

      // Buildings
      buildings.forEach(b => drawBuilding(ctx, b, cam, z, t, clampedNight));

      // Connection lines
      drawConnectionLines(ctx, agents, cam, z, t);

      // Update particles
      const particles = particlesRef.current;
      // Spawn weather particles
      if (weatherRef.current === "rain") {
        for (let i = 0; i < 3; i++) {
          particles.push({ x: cam.x + Math.random() * w / z, y: cam.y - 10, vx: -0.3, vy: 4, life: 60, maxLife: 60, color: "#6ba3d6", size: 1, type: "rain" });
        }
      }
      if (weatherRef.current === "snow") {
        if (Math.random() < 0.3) {
          particles.push({ x: cam.x + Math.random() * w / z, y: cam.y - 10, vx: (Math.random() - 0.5) * 0.5, vy: 0.5 + Math.random(), life: 200, maxLife: 200, color: "#fff", size: 1.5 + Math.random(), type: "snow" });
        }
      }
      // Fireflies at night
      if (clampedNight > 0.4 && Math.random() < 0.05) {
        const fx = cam.x + Math.random() * w / z;
        const fy = cam.y + Math.random() * h / z;
        const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && terrain[ty][tx] >= 3 && terrain[ty][tx] <= 5) {
          particles.push({ x: fx, y: fy, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: 120 + Math.random() * 80, maxLife: 200, color: "#aaff77", size: 1.5, type: "firefly" });
        }
      }
      // Update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.type === "firefly") { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (particles.length > 500) particles.splice(0, particles.length - 500);
      drawParticles(ctx, particles, cam, z);

      // Floating texts
      const fts = floatingTextsRef.current;
      for (let i = fts.length - 1; i >= 0; i--) {
        fts[i].y += fts[i].vy; fts[i].life--;
        if (fts[i].life <= 0) fts.splice(i, 1);
      }
      drawFloatingTexts(ctx, fts, cam, z);

      // Agent simulation & draw
      agents.forEach(a => {
        a.stateTimer--;
        if (a.stateTimer <= 0) {
          if (a.state === "meeting" || a.state === "combat" || a.state === "trading" || a.state === "visiting") {
            a.state = "move"; a.stateTimer = 150 + Math.random() * 300; a.meetingPartner = null; a.targetBuilding = null;
          } else if (a.state === "idle") {
            a.state = "move"; a.stateTimer = 200 + Math.random() * 400;
          } else {
            const r = Math.random();
            if (r < 0.02) { a.state = "idle"; a.stateTimer = 60 + Math.random() * 120; }
            else if (r < 0.06) {
              // Visit nearest building
              let nearest = -1, nd = Infinity;
              for (const b of buildings) {
                const d = Math.hypot(a.x - (b.x + b.w * TILE / 2), a.y - (b.y + b.h * TILE / 2));
                if (d < nd) { nd = d; nearest = b.id; }
              }
              if (nearest >= 0 && nd < 400) {
                a.state = "visiting"; a.targetBuilding = nearest;
                a.stateTimer = 100 + Math.random() * 150;
                const tb = buildings.find(b => b.id === nearest);
                if (tb) { a.dir = Math.atan2(tb.y + tb.h * TILE / 2 - a.y, tb.x + tb.w * TILE / 2 - a.x); }
              } else {
                a.stateTimer = 200 + Math.random() * 400;
              }
            } else { a.stateTimer = 200 + Math.random() * 400; }
          }
        }

        // Proximity interactions
        if (a.state === "move") {
          for (const other of agents) {
            if (other.id === a.id || (other.state !== "move")) continue;
            const dist = Math.hypot(a.x - other.x, a.y - other.y);
            if (dist < 25) {
              const r = Math.random();
              if (a.cls === "Warrior" && other.cls === "Warrior" && r < 0.35) {
                a.state = "combat"; other.state = "combat";
                a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 80 + Math.random() * 60;
              } else if ((a.cls === "Trader" || other.cls === "Trader") && r < 0.5) {
                a.state = "trading"; other.state = "trading";
                a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 60 + Math.random() * 80;
              } else {
                a.state = "meeting"; other.state = "meeting";
                a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 50 + Math.random() * 100;
              }
              break;
            }
          }
        }

        // Movement
        if (a.state === "move" || a.state === "visiting") {
          if (a.state === "move" && Math.random() < 0.02) a.dir += (Math.random() - 0.5) * 1.5;
          const spd = a.state === "visiting" ? a.speed * 1.3 : a.speed;
          const nx = a.x + Math.cos(a.dir) * spd;
          const ny = a.y + Math.sin(a.dir) * spd;
          if (nx < 30 || nx > MAP_W * TILE - 30) a.dir = Math.PI - a.dir;
          if (ny < 30 || ny > MAP_H * TILE - 30) a.dir = -a.dir;
          const tileX = Math.floor(nx / TILE), tileY = Math.floor(ny / TILE);
          if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
            const tt = terrain[tileY][tileX];
            if (tt <= 1) a.dir += Math.PI / 2 + Math.random() * 0.5;
            else if (tt >= 6) a.dir += Math.PI / 3 + Math.random() * 0.3;
            else { a.x = nx; a.y = ny; }
          }
          // Arrived at building
          if (a.state === "visiting" && a.targetBuilding !== null) {
            const tb = buildings.find(b => b.id === a.targetBuilding);
            if (tb && Math.hypot(a.x - (tb.x + tb.w * TILE / 2), a.y - (tb.y + tb.h * TILE / 2)) < 20) {
              a.state = "idle"; a.stateTimer = 40 + Math.random() * 80;
            }
          }
        }

        drawAgent(ctx, a, cam, z, t, clampedNight);
      });

      // Night overlay
      if (clampedNight > 0.1) {
        ctx.fillStyle = `rgba(5,5,20,${clampedNight * 0.35})`;
        ctx.fillRect(0, 0, w, h);
        // Vignette
        const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, `rgba(0,0,10,${clampedNight * 0.4})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      }

      // Minimap
      drawMinimap(ctx, terrain, buildings, agents, cam, z, w, h, clampedNight);

      raf = requestAnimationFrame(render);
    };
    render();

    // Input handlers
    const onDown = (e: MouseEvent) => { dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, moved: false }; };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lastX, dy = e.clientY - dragRef.current.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
      cameraRef.current.x -= dx / zoomRef.current;
      cameraRef.current.y -= dy / zoomRef.current;
      dragRef.current.lastX = e.clientX; dragRef.current.lastY = e.clientY;
    };
    const onUp = () => { dragRef.current.dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      const newZoom = Math.max(0.25, Math.min(3.5, zoomRef.current + delta));
      const mx = e.clientX, my = e.clientY;
      const wx = cameraRef.current.x + mx / zoomRef.current;
      const wy = cameraRef.current.y + my / zoomRef.current;
      zoomRef.current = newZoom;
      cameraRef.current.x = wx - mx / newZoom;
      cameraRef.current.y = wy - my / newZoom;
      setZoom(newZoom);
    };
    const onClick = (e: MouseEvent) => {
      if (dragRef.current.moved) return;
      const z = zoomRef.current;
      const worldX = cameraRef.current.x + e.clientX / z;
      const worldY = cameraRef.current.y + e.clientY / z;
      for (const a of agentsRef.current) {
        if (Math.hypot(a.x - worldX, a.y - worldY) < 20) { setSelectedAgent({ ...a }); setSelectedBuilding(null); return; }
      }
      for (const b of buildingsRef.current) {
        if (worldX >= b.x && worldX <= b.x + b.w * TILE && worldY >= b.y && worldY <= b.y + b.h * TILE) { setSelectedBuilding(b); setSelectedAgent(null); return; }
      }
      setSelectedAgent(null); setSelectedBuilding(null);
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onClick);

    let lastTouchDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) dragRef.current = { dragging: true, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY, moved: false };
      else if (e.touches.length === 2) lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current.dragging) {
        cameraRef.current.x -= (e.touches[0].clientX - dragRef.current.lastX) / zoomRef.current;
        cameraRef.current.y -= (e.touches[0].clientY - dragRef.current.lastY) / zoomRef.current;
        dragRef.current.lastX = e.touches[0].clientX; dragRef.current.lastY = e.touches[0].clientY;
        dragRef.current.moved = true;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoomRef.current = Math.max(0.25, Math.min(3.5, zoomRef.current + (dist - lastTouchDist) * 0.005));
        setZoom(zoomRef.current); lastTouchDist = dist;
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedBuilding || selectedAgent) { setSelectedBuilding(null); setSelectedAgent(null); }
        else navigate("/");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selectedBuilding, selectedAgent]);

  const handleZoom = (d: number) => { const nz = Math.max(0.25, Math.min(3.5, zoomRef.current + d)); zoomRef.current = nz; setZoom(nz); };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD top-left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap">
        <button onClick={() => navigate("/")} className="glass-card p-2 hover:bg-card/80 transition-colors"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <div className="glass-card px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="text-sm font-display font-semibold">{agentCount} AGENTS</span>
        </div>
        <div className="glass-card px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-body">{buildingsRef.current.length} buildings</span>
        </div>
        <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
          {timeLabel === "Night" || timeLabel === "Dusk" ? <Moon className="w-3 h-3 text-indigo-300" /> : <Sun className="w-3 h-3 text-amber-400" />}
          <span className="text-[10px] font-body text-muted-foreground">{timeLabel}</span>
        </div>
        {weather !== "clear" && (
          <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
            <Cloud className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-body text-muted-foreground capitalize">{weather}</span>
          </div>
        )}
      </div>

      {/* HUD top-right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="glass-card px-4 py-2 flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-body">$MEEET</span>
          <span className="text-sm font-display font-semibold">$0.0042</span>
          <span className="text-xs text-secondary font-body">+12.4%</span>
        </div>
      </div>

      {/* Zoom */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        <button onClick={() => handleZoom(0.25)} className="glass-card p-2 hover:bg-card/80"><ZoomIn className="w-4 h-4 text-foreground" /></button>
        <div className="glass-card px-2 py-1 text-center"><span className="text-[10px] font-body text-muted-foreground">{Math.round(zoom * 100)}%</span></div>
        <button onClick={() => handleZoom(-0.25)} className="glass-card p-2 hover:bg-card/80"><ZoomOut className="w-4 h-4 text-foreground" /></button>
      </div>

      {/* Events */}
      {showChat && (
        <div className="absolute top-16 right-4 bottom-4 w-72 z-10 flex flex-col max-h-[calc(100vh-5rem)]">
          <div className="glass-card flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">Live Events</span>
              <button onClick={() => setShowChat(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {events.map(ev => (
                <div key={ev.id} className="text-xs font-body px-2 py-1.5 rounded bg-muted/30 animate-fade-in">
                  <span className="text-muted-foreground mr-1.5">{ev.time}</span>
                  <span style={{ color: ev.color }}>{ev.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!showChat && <button onClick={() => setShowChat(true)} className="absolute top-16 right-4 z-10 glass-card p-2 hover:bg-card/80"><Eye className="w-4 h-4 text-foreground" /></button>}

      {/* Building inspector */}
      {selectedBuilding && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass-card p-4 w-80 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedBuilding.icon}</span>
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: selectedBuilding.accent }}>{selectedBuilding.name}</h3>
                <p className="text-[10px] text-muted-foreground font-body">Built by {selectedBuilding.owner}</p>
              </div>
            </div>
            <button onClick={() => setSelectedBuilding(null)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <p className="text-xs text-muted-foreground font-body mb-3">{selectedBuilding.description}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">Visitors</p>
              <p className="text-xs font-display font-semibold" style={{ color: selectedBuilding.accent }}>{selectedBuilding.visitors}</p>
            </div>
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">Income/d</p>
              <p className="text-xs font-display font-semibold text-amber-400">{selectedBuilding.income} $M</p>
            </div>
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">Size</p>
              <p className="text-xs font-display font-semibold text-muted-foreground">{selectedBuilding.w}×{selectedBuilding.h}</p>
            </div>
          </div>
        </div>
      )}

      {/* Agent inspector */}
      {selectedAgent && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass-card p-4 w-80 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedAgent.color + "25", border: `1px solid ${selectedAgent.color}40` }}>
                <div className="w-4 h-5 rounded-sm" style={{ backgroundColor: selectedAgent.color }} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: selectedAgent.color }}>{selectedAgent.name}</h3>
                <p className="text-[10px] text-muted-foreground font-body">{selectedAgent.cls} · Lv.{selectedAgent.level}</p>
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          {/* HP bar */}
          <div className="mb-3">
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1"><span>HP</span><span>{selectedAgent.hp}/{selectedAgent.maxHp}</span></div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(selectedAgent.hp / selectedAgent.maxHp) * 100}%`, backgroundColor: selectedAgent.hp / selectedAgent.maxHp > 0.5 ? "#22c55e" : selectedAgent.hp / selectedAgent.maxHp > 0.25 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">Balance</p>
              <p className="text-xs font-display font-semibold text-amber-400">{selectedAgent.balance}</p>
            </div>
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">Reputation</p>
              <p className="text-xs font-display font-semibold text-secondary">{selectedAgent.reputation}</p>
            </div>
            <div className="glass-card px-2 py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground">State</p>
              <p className="text-xs font-display font-semibold capitalize" style={{ color: selectedAgent.color }}>{selectedAgent.state}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-body">
            {selectedAgent.linked && <span className="glass-card px-2 py-0.5 text-amber-400">👑 Linked</span>}
            {selectedAgent.reputation > 700 && <span className="glass-card px-2 py-0.5 text-amber-400">⭐ Elite</span>}
            {selectedAgent.level >= 20 && <span className="glass-card px-2 py-0.5 text-purple-400">🏆 Veteran</span>}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-[10px] text-muted-foreground font-body glass-card px-3 py-1.5">
          ESC — back · Drag to pan · Scroll to zoom · Click to inspect
        </span>
      </div>
    </div>
  );
};

export default LiveMap;
