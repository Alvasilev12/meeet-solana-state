import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ZoomIn, ZoomOut, Eye, Sun, Moon, Cloud, Search, Crosshair, FastForward, Play, Pause, MapPin, Activity, Compass, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";

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

interface Trail {
  x: number; y: number; color: string; life: number; maxLife: number;
}

interface Road { x1: number; y1: number; x2: number; y2: number; }
interface GameEvent { id: number; text: string; time: string; color: string; }

// ─── Constants ──────────────────────────────────────────────────
const TILE = 32;
const MAP_W = 200;
const MAP_H = 140;
const DAY_CYCLE_MS = 120000;

const CLASS_CONFIG: Record<string, { color: string; speed: number; icon: string }> = {
  warrior:   { color: "#EF4444", speed: 1.4, icon: "⚔️" },
  trader:    { color: "#14F195", speed: 1.0, icon: "💹" },
  scout:     { color: "#FBBF24", speed: 0.8, icon: "🔍" },
  diplomat:  { color: "#34D399", speed: 0.6, icon: "🌐" },
  builder:   { color: "#00C2FF", speed: 0.7, icon: "🏗️" },
  hacker:    { color: "#9945FF", speed: 0.9, icon: "💻" },
  president: { color: "#FFD700", speed: 0.5, icon: "👑" },
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
  for (let i = 0; i < 6; i++) { v += amp * smoothNoise(x * freq, y * freq, seed); amp *= 0.5; freq *= 2; }
  return v;
}

// ─── Terrain — Realistic Island ─────────────────────────────────
// Tile types: 0=deep ocean, 1=shallow water, 2=beach, 3=lowland, 4=grassland, 5=forest, 6=mountain, 7=snow peak
const TERRAIN_COLORS_DAY = [
  { fill: "#0a2463", border: "#081d52" },  // deep ocean
  { fill: "#1a5276", border: "#154565" },  // shallow water
  { fill: "#e8d5a3", border: "#d4c193" },  // beach/sand
  { fill: "#7ab648", border: "#6aa438" },  // lowland
  { fill: "#4a8c32", border: "#3a7c22" },  // grassland
  { fill: "#2d6a1e", border: "#1d5a0e" },  // forest
  { fill: "#8a7d6b", border: "#7a6d5b" },  // mountain
  { fill: "#e8e8f0", border: "#d0d0e0" },  // snow peak
];
const TERRAIN_COLORS_NIGHT = [
  { fill: "#040e28", border: "#030b20" },  // deep ocean night
  { fill: "#0c2840", border: "#0a2030" },  // shallow water night
  { fill: "#6a5d3a", border: "#5a4d2a" },  // beach night
  { fill: "#2a4a18", border: "#1a3a08" },  // lowland night
  { fill: "#1a3a0e", border: "#0a2a04" },  // grassland night
  { fill: "#0e2a08", border: "#041a02" },  // forest night
  { fill: "#4a4338", border: "#3a3328" },  // mountain night
  { fill: "#8888a0", border: "#787890" },  // snow night
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
  const cx = MAP_W / 2, cy = MAP_H / 2;
  for (let y = 0; y < MAP_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const elevation = fbm(x * 0.04, y * 0.04, seed);
      const moisture = fbm(x * 0.06 + 100, y * 0.06 + 100, seed + 7);
      
      // Island shape — distance from center creates ocean
      const dx = (x - cx) / (MAP_W * 0.42);
      const dy = (y - cy) / (MAP_H * 0.38);
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      // Irregular coastline using secondary noise
      const coastNoise = fbm(x * 0.03, y * 0.03, seed + 13) * 0.2;
      const islandFactor = 1 - distFromCenter - coastNoise;
      
      // Additional continent shapes — create archipelago feel
      const dx2 = (x - cx * 0.5) / (MAP_W * 0.2);
      const dy2 = (y - cy * 0.7) / (MAP_H * 0.2);
      const island2 = 1 - Math.sqrt(dx2 * dx2 + dy2 * dy2) - coastNoise * 0.8;
      
      const dx3 = (x - cx * 1.4) / (MAP_W * 0.15);
      const dy3 = (y - cy * 0.5) / (MAP_H * 0.18);
      const island3 = 1 - Math.sqrt(dx3 * dx3 + dy3 * dy3) - coastNoise * 0.7;
      
      const landValue = Math.max(islandFactor, island2, island3);
      const adj = elevation * 0.6 + landValue * 0.5;

      if (adj < 0.15) tiles[y][x] = 0;       // deep ocean
      else if (adj < 0.28) tiles[y][x] = 1;   // shallow water
      else if (adj < 0.32) tiles[y][x] = 2;   // beach
      else if (adj < 0.44) tiles[y][x] = moisture > 0.55 ? 4 : 3;
      else if (adj < 0.55) tiles[y][x] = 5;   // forest
      else if (adj < 0.68) tiles[y][x] = 6;   // mountain
      else tiles[y][x] = 7;                    // snow peak
    }
  }
  return tiles;
}

// ─── Buildings ──────────────────────────────────────────────────
const BUILDING_TYPES = [
  { type: "parliament", name: "Parliament", color: "#9945FF", accent: "#b366ff", w: 5, h: 4, icon: "🏛️", description: "The seat of governance. Laws are voted here." },
  { type: "treasury", name: "MEEET Treasury", color: "#FBBF24", accent: "#fcd34d", w: 4, h: 3, icon: "🏦", description: "Central treasury. 30% flows to the President." },
  { type: "monument", name: "Genesis Monument", color: "#D4AF37", accent: "#FFD700", w: 2, h: 2, icon: "🗽", description: "Commemorates the founding of MEEET State." },
  { type: "arena", name: "Grand Arena", color: "#EF4444", accent: "#f87171", w: 6, h: 6, icon: "⚔️", description: "The main colosseum — warriors duel for $MEEET." },
  { type: "arena", name: "Pit Arena East", color: "#DC2626", accent: "#ef4444", w: 4, h: 4, icon: "⚔️", description: "Eastern combat pit." },
  { type: "dex", name: "Central DEX", color: "#14F195", accent: "#4ade80", w: 5, h: 4, icon: "📊", description: "Main exchange — traders swap tokens." },
  { type: "bank", name: "MEEET Central Bank", color: "#00C2FF", accent: "#38d9ff", w: 5, h: 4, icon: "🏧", description: "Main bank — lending, staking." },
  { type: "guild_w", name: "Warriors Guild", color: "#EF4444", accent: "#f87171", w: 4, h: 4, icon: "🛡️", description: "Warrior faction HQ." },
  { type: "guild_t", name: "Traders Guild", color: "#14F195", accent: "#4ade80", w: 4, h: 4, icon: "💹", description: "Trader faction HQ." },
  { type: "guild_t", name: "Hackers Guild", color: "#8B5CF6", accent: "#a78bfa", w: 3, h: 3, icon: "💻", description: "Cyber ops guild." },
  { type: "mine", name: "Crystal Mine Alpha", color: "#FBBF24", accent: "#fcd34d", w: 3, h: 3, icon: "⛏️", description: "Primary crystal extraction." },
  { type: "mine", name: "Deep Mine Gamma", color: "#B45309", accent: "#d97706", w: 4, h: 3, icon: "⛏️", description: "Deep underground mine." },
  { type: "farm", name: "Token Farm", color: "#84CC16", accent: "#a3e635", w: 5, h: 4, icon: "🌾", description: "Yield farming." },
  { type: "oracle", name: "Oracle Tower", color: "#9945FF", accent: "#b366ff", w: 2, h: 5, icon: "🔮", description: "Oracles scan data feeds." },
  { type: "academy", name: "MEEET Academy", color: "#6366F1", accent: "#818cf8", w: 5, h: 4, icon: "🎓", description: "Training facility." },
  { type: "lab", name: "Research Lab", color: "#8B5CF6", accent: "#a78bfa", w: 4, h: 3, icon: "🔬", description: "R&D technologies." },
  { type: "embassy", name: "Grand Embassy", color: "#34D399", accent: "#6ee7b7", w: 4, h: 3, icon: "🌐", description: "Diplomats negotiate." },
  { type: "tavern", name: "Digital Tavern", color: "#F97316", accent: "#fb923c", w: 3, h: 2, icon: "🍺", description: "Socialize and trade intel." },
  { type: "tavern", name: "Sky Lounge", color: "#C2410C", accent: "#ea580c", w: 3, h: 3, icon: "🍺", description: "High-end social club." },
  { type: "herald", name: "MEEET Herald", color: "#8B5CF6", accent: "#a78bfa", w: 3, h: 2, icon: "📰", description: "Daily AI news." },
  { type: "jail", name: "Anti-Abuse Prison", color: "#6B7280", accent: "#9CA3AF", w: 3, h: 3, icon: "🔒", description: "Flagged agents." },
  { type: "bazaar", name: "Grand Bazaar", color: "#EC4899", accent: "#f472b6", w: 5, h: 4, icon: "🛒", description: "NFT marketplace." },
  { type: "quest", name: "Quest Board", color: "#06B6D4", accent: "#22d3ee", w: 4, h: 3, icon: "📋", description: "Quest posting." },
  { type: "quest", name: "Quest Board East", color: "#0891B2", accent: "#06b6d4", w: 3, h: 2, icon: "📋", description: "Eastern quests." },
  { type: "gate", name: "Solana Gateway", color: "#14F195", accent: "#4ade80", w: 3, h: 3, icon: "🌀", description: "Cross-chain bridge." },
  { type: "hospital", name: "Central Hospital", color: "#10B981", accent: "#34d399", w: 4, h: 3, icon: "🏥", description: "Heal & repair." },
  { type: "lighthouse", name: "Beacon Tower", color: "#F59E0B", accent: "#fbbf24", w: 2, h: 3, icon: "🗼", description: "Lighthouse." },
  { type: "dock", name: "Harbor Dock", color: "#3B82F6", accent: "#60a5fa", w: 5, h: 3, icon: "⚓", description: "Main port." },
  { type: "casino", name: "Prediction Market", color: "#F43F5E", accent: "#fb7185", w: 4, h: 4, icon: "🎰", description: "Bet on outcomes." },
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
        if (t <= 1 || t >= 7) return false; // not on water or snow
        if (placed.has(`${tx},${ty}`)) return false;
      }
    return true;
  };
  // Docks can go on shallow water
  const canPlaceDock = (bx: number, by: number, bw: number, bh: number) => {
    let hasWater = false, hasLand = false;
    for (let dy = 0; dy < bh; dy++)
      for (let dx = 0; dx < bw; dx++) {
        const tx = bx + dx, ty = by + dy;
        if (tx >= MAP_W || ty >= MAP_H) return false;
        const t = terrain[ty][tx];
        if (t <= 1) hasWater = true;
        if (t >= 2 && t <= 5) hasLand = true;
        if (placed.has(`${tx},${ty}`)) return false;
      }
    return hasWater && hasLand;
  };
  let id = 0;
  for (const bt of BUILDING_TYPES) {
    let attempts = 0;
    while (attempts < 600) {
      const bx = 5 + Math.floor(noise2d(attempts * 7 + id * 13, id * 3, 99) * (MAP_W - 15));
      const by = 5 + Math.floor(noise2d(id * 5, attempts * 11 + id * 7, 77) * (MAP_H - 15));
      const canP = bt.type === "dock" ? canPlaceDock(bx, by, bt.w, bt.h) : canPlace(bx, by, bt.w, bt.h);
      if (canP) {
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

function generateRoads(buildings: Building[]): Road[] {
  const roads: Road[] = [];
  const roadSet = new Set<string>();
  const addRoad = (a: Building, b: Building) => {
    const key = [Math.min(a.id, b.id), Math.max(a.id, b.id)].join("-");
    if (roadSet.has(key)) return;
    roadSet.add(key);
    roads.push({
      x1: a.x + (a.w * TILE) / 2, y1: a.y + (a.h * TILE) / 2,
      x2: b.x + (b.w * TILE) / 2, y2: b.y + (b.h * TILE) / 2,
    });
  };
  for (let i = 0; i < buildings.length; i++) {
    const dists = buildings.map((b, j) => ({ j, d: i === j ? Infinity : Math.hypot(buildings[i].x - b.x, buildings[i].y - b.y) })).sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(3, dists.length); k++) {
      if (dists[k].d < 1200) addRoad(buildings[i], buildings[dists[k].j]);
    }
  }
  return roads;
}

// ─── Rendering Helpers ──────────────────────────────────────────

function drawOceanWaves(ctx: CanvasRenderingContext2D, sx: number, sy: number, ts: number, t: number, nightFactor: number, col: number, row: number, tileType: number) {
  if (tileType > 1) return;
  // Animated wave pattern
  const wavePhase = t * 0.001 + col * 0.15 + row * 0.12;
  const waveAlpha = tileType === 0 ? 0.06 : 0.1;
  const waveColor = lerpColor("#3388cc", "#1a3366", nightFactor);
  
  // Wave lines
  for (let i = 0; i < 2; i++) {
    const wy = sy + ts * (0.3 + i * 0.35);
    ctx.strokeStyle = waveColor + Math.floor((waveAlpha + Math.sin(wavePhase + i * 2) * 0.04) * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = Math.max(0.5, ts * 0.03);
    ctx.beginPath();
    for (let wx = 0; wx < ts; wx += ts * 0.1) {
      const wvy = wy + Math.sin(wavePhase + wx * 0.08 + i) * ts * 0.06;
      wx === 0 ? ctx.moveTo(sx + wx, wvy) : ctx.lineTo(sx + wx, wvy);
    }
    ctx.stroke();
  }
  
  // Foam/sparkle on shallow water
  if (tileType === 1) {
    const sparkle = Math.sin(t * 0.003 + col * 3 + row * 7) > 0.85;
    if (sparkle) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(t * 0.01 + col) * 0.1})`;
      const sx2 = sx + ts * noise2d(col, row, 5);
      const sy2 = sy + ts * noise2d(row, col, 6);
      ctx.beginPath(); ctx.arc(sx2, sy2, ts * 0.04, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawTerrainDetail(ctx: CanvasRenderingContext2D, tileType: number, sx: number, sy: number, col: number, row: number, z: number, t: number, nightFactor: number) {
  const ts = TILE * z;
  const r = noise2d(col, row, 13);
  
  // Ocean waves
  if (tileType <= 1) {
    drawOceanWaves(ctx, sx, sy, ts, t, nightFactor, col, row, tileType);
    return;
  }

  // Beach — wave foam at edges
  if (tileType === 2 && r > 0.5) {
    ctx.fillStyle = lerpColor("#f0e4c0", "#8a7d58", nightFactor) + "60";
    ctx.beginPath();
    ctx.arc(sx + ts * r, sy + ts * 0.7, ts * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grassland — subtle vegetation
  if (tileType === 3 || tileType === 4) {
    if (r > 0.4 && z > 0.4) {
      const treeCount = tileType === 4 ? 2 : 1;
      for (let i = 0; i < treeCount; i++) {
        const tx = sx + ts * (0.2 + noise2d(col + i, row, 20) * 0.6);
        const ty = sy + ts * (0.3 + noise2d(col, row + i, 21) * 0.4);
        const treeR = ts * (0.08 + noise2d(col + i, row + i, 22) * 0.06);
        // Shadow
        ctx.fillStyle = `rgba(0,0,0,0.08)`;
        ctx.beginPath(); ctx.ellipse(tx + treeR * 0.3, ty + treeR * 1.2, treeR * 0.8, treeR * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        // Canopy
        const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, treeR);
        grad.addColorStop(0, lerpColor("#5a9a40", "#2a5020", nightFactor));
        grad.addColorStop(0.7, lerpColor("#3a7a28", "#1a4010", nightFactor));
        grad.addColorStop(1, lerpColor("#2a6a18", "#0a3008", nightFactor) + "00");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(tx, ty, treeR, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Forest — dense tree clusters
  if (tileType === 5 && z > 0.35) {
    for (let i = 0; i < 3; i++) {
      const fx = sx + ts * (0.15 + noise2d(col + i * 3, row, 30) * 0.7);
      const fy = sy + ts * (0.15 + noise2d(col, row + i * 3, 31) * 0.6);
      const fr = ts * (0.1 + noise2d(col + i, row + i, 32) * 0.08);
      const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      grad.addColorStop(0, lerpColor("#2d6a1e", "#0e3a08", nightFactor));
      grad.addColorStop(0.6, lerpColor("#1e5a10", "#082a04", nightFactor));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Mountain — rocky texture
  if (tileType === 6 && z > 0.4 && r > 0.3) {
    ctx.fillStyle = lerpColor("#a09888", "#585048", nightFactor) + "60";
    ctx.beginPath();
    ctx.moveTo(sx + ts * 0.3, sy + ts * 0.7);
    ctx.lineTo(sx + ts * 0.5, sy + ts * (0.2 + r * 0.15));
    ctx.lineTo(sx + ts * 0.7, sy + ts * 0.7);
    ctx.fill();
    // Snow cap on peaks
    if (r > 0.65) {
      ctx.fillStyle = lerpColor("#e0e0e8", "#808090", nightFactor) + "50";
      ctx.beginPath();
      ctx.moveTo(sx + ts * 0.4, sy + ts * 0.35);
      ctx.lineTo(sx + ts * 0.5, sy + ts * 0.2);
      ctx.lineTo(sx + ts * 0.6, sy + ts * 0.35);
      ctx.fill();
    }
  }

  // Snow — sparkle
  if (tileType === 7 && z > 0.5) {
    const sparkle = Math.sin(t * 0.003 + col * 5 + row * 3) > 0.9;
    if (sparkle) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(t * 0.01) * 0.2})`;
      ctx.beginPath(); ctx.arc(sx + ts * r, sy + ts * (1 - r), ts * 0.02, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ─── Building Renderer — Premium City Markers ───────────────────
function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cam: { x: number; y: number }, z: number, t: number, nightFactor: number) {
  const cx = (b.x + b.w * TILE / 2 - cam.x) * z;
  const cy = (b.y + b.h * TILE / 2 - cam.y) * z;
  if (cx < -120 || cx > ctx.canvas.width + 120 || cy < -120 || cy > ctx.canvas.height + 120) return;

  const size = Math.max(8, (Math.max(b.w, b.h) * TILE * z) * 0.35);
  const pulse = 0.7 + Math.sin(t * 0.003 + b.id) * 0.15;
  
  // Territory glow — large soft radial
  const glowR = size * 4;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  const glowAlpha = (nightFactor > 0.3 ? 0.15 : 0.06) * pulse;
  glow.addColorStop(0, b.color + Math.floor(glowAlpha * 255).toString(16).padStart(2, "0"));
  glow.addColorStop(0.4, b.color + "08");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

  // Base platform — subtle shadow ring
  ctx.fillStyle = `rgba(0,0,0,${0.15 + nightFactor * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.3, size * 1.2, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Building body — 3D isometric block
  const bh = size * 0.8; // building height
  const bw = size * 1.4;
  const bd = size * 0.5; // depth

  // Right face (darker)
  ctx.fillStyle = lerpColor(b.color, "#000000", 0.35 + nightFactor * 0.2);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + bw / 2, cy - bd / 2);
  ctx.lineTo(cx + bw / 2, cy - bd / 2 - bh);
  ctx.lineTo(cx, cy - bh);
  ctx.fill();

  // Left face (medium)
  ctx.fillStyle = lerpColor(b.color, "#000000", 0.15 + nightFactor * 0.15);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - bw / 2, cy - bd / 2);
  ctx.lineTo(cx - bw / 2, cy - bd / 2 - bh);
  ctx.lineTo(cx, cy - bh);
  ctx.fill();

  // Top face (lightest)
  ctx.fillStyle = lerpColor(b.accent, "#ffffff", 0.1 - nightFactor * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx, cy - bh);
  ctx.lineTo(cx + bw / 2, cy - bd / 2 - bh);
  ctx.lineTo(cx, cy - bd - bh);
  ctx.lineTo(cx - bw / 2, cy - bd / 2 - bh);
  ctx.fill();

  // Windows — lit at night
  if (z > 0.5) {
    const winRows = Math.max(1, Math.floor(bh / (5 * z)));
    const winCols = Math.max(1, Math.floor(bw / (8 * z)));
    for (let wr = 0; wr < winRows; wr++) {
      for (let wc = 0; wc < winCols; wc++) {
        const isLit = noise2d(b.id + wc, wr, 42) > 0.35;
        const flicker = 0.6 + Math.sin(t * 0.005 + b.id + wc * 3 + wr * 7) * 0.2;
        if (nightFactor > 0.3 && isLit) {
          const wx = cx - bw * 0.35 + wc * (bw * 0.7 / winCols);
          const wy = cy - bh * 0.9 + wr * (bh * 0.7 / winRows);
          const winGlow = ctx.createRadialGradient(wx, wy, 0, wx, wy, 4 * z);
          winGlow.addColorStop(0, `rgba(255,200,80,${nightFactor * flicker * 0.7})`);
          winGlow.addColorStop(1, "transparent");
          ctx.fillStyle = winGlow;
          ctx.beginPath(); ctx.arc(wx, wy, 4 * z, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255,220,100,${nightFactor * flicker})`;
          ctx.fillRect(wx - 1.5 * z, wy - 1 * z, 3 * z, 2 * z);
        }
      }
    }
  }

  // Roof accent — type-specific
  if (b.type === "parliament" || b.type === "monument") {
    // Dome/spire
    ctx.fillStyle = lerpColor("#FFD700", "#aa8800", nightFactor);
    ctx.beginPath();
    ctx.arc(cx, cy - bh - bd / 2, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Glow on dome
    const domeGlow = ctx.createRadialGradient(cx, cy - bh - bd / 2, 0, cx, cy - bh - bd / 2, size * 0.4);
    domeGlow.addColorStop(0, `rgba(255,215,0,${0.15 * pulse})`);
    domeGlow.addColorStop(1, "transparent");
    ctx.fillStyle = domeGlow;
    ctx.beginPath(); ctx.arc(cx, cy - bh - bd / 2, size * 0.4, 0, Math.PI * 2); ctx.fill();
  }

  if (b.type === "oracle" || b.type === "lighthouse") {
    // Beacon light
    const beamAlpha = nightFactor > 0.3 ? nightFactor * pulse * 0.5 : 0.1;
    const beamGlow = ctx.createRadialGradient(cx, cy - bh - bd, 0, cx, cy - bh - bd, size * 0.8);
    beamGlow.addColorStop(0, `rgba(153,69,255,${beamAlpha})`);
    beamGlow.addColorStop(0.5, `rgba(153,69,255,${beamAlpha * 0.3})`);
    beamGlow.addColorStop(1, "transparent");
    ctx.fillStyle = beamGlow;
    ctx.beginPath(); ctx.arc(cx, cy - bh - bd, size * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,150,255,${0.6 + pulse * 0.4})`;
    ctx.beginPath(); ctx.arc(cx, cy - bh - bd, size * 0.06, 0, Math.PI * 2); ctx.fill();
  }

  if (b.type === "gate") {
    // Portal ring
    for (let i = 0; i < 6; i++) {
      const angle = t * 0.003 + i * Math.PI / 3;
      const pr = size * 0.5;
      const px = cx + Math.cos(angle) * pr;
      const py = cy - bh / 2 + Math.sin(angle) * pr * 0.4;
      ctx.fillStyle = `rgba(20,241,149,${0.3 + Math.sin(t * 0.005 + i) * 0.2})`;
      ctx.beginPath(); ctx.arc(px, py, 2 * z, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Icon
  if (z > 0.3) {
    ctx.font = `${Math.max(12, 18 * z)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(b.icon, cx, cy - bh - bd / 2 + (b.type === "parliament" ? -size * 0.3 : 6 * z));
  }

  // Label
  if (z > 0.4) {
    const fs = Math.max(8, 10 * z);
    ctx.font = `600 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(b.name).width;
    
    // Label background
    ctx.fillStyle = `rgba(0,0,0,${0.7 + nightFactor * 0.15})`;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2 - 6, cy + size * 0.5, tw + 12, fs + 6, 4);
    ctx.fill();
    // Border
    ctx.strokeStyle = b.color + "40";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2 - 6, cy + size * 0.5, tw + 12, fs + 6, 4);
    ctx.stroke();
    // Text
    ctx.fillStyle = b.accent;
    ctx.fillText(b.name, cx, cy + size * 0.5 + fs + 1);
    ctx.textAlign = "left";
  }
}

// ─── Agent Renderer — Premium Map Markers ───────────────────────
function drawAgent(ctx: CanvasRenderingContext2D, a: Agent, cam: { x: number; y: number }, z: number, t: number, nightFactor: number) {
  const sx = (a.x - cam.x) * z, sy = (a.y - cam.y) * z;
  if (sx < -60 || sx > ctx.canvas.width + 60 || sy < -60 || sy > ctx.canvas.height + 60) return;
  const s = Math.max(z * 1.2, 1.2);

  // State glow
  if (a.state === "combat" || a.state === "trading" || a.state === "meeting") {
    const stateColor = a.state === "combat" ? "239,68,68" : a.state === "trading" ? "20,241,149" : "251,191,36";
    const pulse = 0.3 + Math.sin(t * 0.01) * 0.15;
    const stGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20 * s);
    stGlow.addColorStop(0, `rgba(${stateColor},${pulse})`);
    stGlow.addColorStop(1, "transparent");
    ctx.fillStyle = stGlow;
    ctx.beginPath(); ctx.arc(sx, sy, 20 * s, 0, Math.PI * 2); ctx.fill();
  }

  const isMoving = a.state === "move" || a.state === "visiting";
  const bounce = isMoving ? Math.abs(Math.sin(t * 0.012 * a.speed + a.phase)) * 2 * s : 0;

  // Drop shadow
  ctx.fillStyle = `rgba(0,0,0,0.2)`;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2 * s, 6 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pin body — teardrop shape
  const pinH = 16 * s;
  const pinR = 5 * s;
  const pinTip = sy + 2 * s - bounce;
  const pinTop = pinTip - pinH;

  // Pin shadow/outline
  ctx.fillStyle = `rgba(0,0,0,0.3)`;
  ctx.beginPath();
  ctx.moveTo(sx, pinTip + 1);
  ctx.bezierCurveTo(sx - pinR * 1.3, pinTop + pinH * 0.4, sx - pinR * 1.3, pinTop, sx, pinTop);
  ctx.bezierCurveTo(sx + pinR * 1.3, pinTop, sx + pinR * 1.3, pinTop + pinH * 0.4, sx, pinTip + 1);
  ctx.fill();

  // Pin gradient
  const pinGrad = ctx.createLinearGradient(sx - pinR, pinTop, sx + pinR, pinTip);
  pinGrad.addColorStop(0, lerpColor(a.color, "#ffffff", 0.25));
  pinGrad.addColorStop(0.4, a.color);
  pinGrad.addColorStop(1, lerpColor(a.color, "#000000", 0.3));
  ctx.fillStyle = pinGrad;
  ctx.beginPath();
  ctx.moveTo(sx, pinTip);
  ctx.bezierCurveTo(sx - pinR * 1.2, pinTop + pinH * 0.4, sx - pinR * 1.2, pinTop, sx, pinTop);
  ctx.bezierCurveTo(sx + pinR * 1.2, pinTop, sx + pinR * 1.2, pinTop + pinH * 0.4, sx, pinTip);
  ctx.fill();

  // Inner circle (white)
  ctx.fillStyle = `rgba(255,255,255,${0.85 + Math.sin(t * 0.005 + a.phase) * 0.1})`;
  ctx.beginPath();
  ctx.arc(sx, pinTop + pinR * 0.9, pinR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Class icon in circle
  if (z > 0.5) {
    const cfg = CLASS_CONFIG[a.cls] || CLASS_CONFIG.warrior;
    ctx.font = `${Math.max(6, 7 * s)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(cfg.icon, sx, pinTop + pinR * 0.9 + 2.5 * s);
  }

  // Crown for president / linked
  if (a.linked || a.cls === "president") {
    ctx.fillStyle = "#FFD700";
    ctx.font = `${Math.max(8, 10 * s)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("👑", sx, pinTop - 2 * s);
  }

  // Name tag
  if (z > 0.45) {
    const fs = Math.max(7, 8.5 * s);
    ctx.font = `600 ${fs}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(a.name).width;
    ctx.fillStyle = `rgba(0,0,0,${0.75 + nightFactor * 0.15})`;
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2 - 4, sy + 5 * s, tw + 8, fs + 4, 3);
    ctx.fill();
    ctx.fillStyle = a.color;
    ctx.fillRect(sx - tw / 2 - 4, sy + 5 * s + fs + 2, tw + 8, 1.5);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillText(a.name, sx, sy + 5 * s + fs + 1);
    ctx.textAlign = "left";
  }

  // Level badge
  if (z > 0.6) {
    const lvStr = `${a.level}`;
    const lvFs = Math.max(6, 6.5 * s);
    ctx.font = `bold ${lvFs}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    const lvW = ctx.measureText(lvStr).width;
    ctx.fillStyle = a.color;
    ctx.beginPath(); ctx.arc(sx + pinR * 1.1, pinTop, (lvW + 6) / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(lvStr, sx + pinR * 1.1, pinTop + lvFs * 0.35);
    ctx.textAlign = "left";
  }

  // HP bar when damaged
  if (z > 0.5 && a.hp < a.maxHp) {
    const barW = 20 * s, barH = 2.5 * s;
    const barX = sx - barW / 2, barY = pinTop - 5 * s;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, barH / 2); ctx.fill();
    const hpPct = a.hp / a.maxHp;
    const hpColor = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.fillStyle = hpColor;
    ctx.beginPath(); ctx.roundRect(barX + 0.5, barY + 0.5, (barW - 1) * hpPct, barH - 1, (barH - 1) / 2); ctx.fill();
  }

  // State emoji
  if (z > 0.55) {
    let icon = "";
    if (a.state === "trading") icon = "💰";
    else if (a.state === "combat") icon = "⚔️";
    else if (a.state === "meeting") icon = "🤝";
    else if (a.state === "idle") icon = "💤";
    if (icon) {
      ctx.font = `${Math.max(8, 10 * s)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(icon, sx + pinR * 1.5, pinTop + pinR * 0.5);
    }
  }

  // Reputation sparkle
  if (a.reputation > 700) {
    for (let i = 0; i < 4; i++) {
      const angle = (t * 0.002 + i * Math.PI / 2 + a.phase) % (Math.PI * 2);
      const dist = 12 * s;
      const spX = sx + Math.cos(angle) * dist;
      const spY = pinTop + pinR + Math.sin(angle) * dist * 0.5;
      const spAlpha = 0.3 + Math.sin(t * 0.005 + i) * 0.2;
      ctx.fillStyle = `rgba(255,215,0,${spAlpha})`;
      ctx.beginPath(); ctx.arc(spX, spY, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ─── Roads ──────────────────────────────────────────────────────
function drawRoads(ctx: CanvasRenderingContext2D, roads: Road[], cam: { x: number; y: number }, z: number, t: number, nightFactor: number) {
  const roadW = Math.max(2, 4 * z);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  roads.forEach(r => {
    const sx1 = (r.x1 - cam.x) * z, sy1 = (r.y1 - cam.y) * z;
    const sx2 = (r.x2 - cam.x) * z, sy2 = (r.y2 - cam.y) * z;
    if (Math.max(sx1, sx2) < -200 || Math.min(sx1, sx2) > ctx.canvas.width + 200) return;
    if (Math.max(sy1, sy2) < -200 || Math.min(sy1, sy2) > ctx.canvas.height + 200) return;
    
    // Glowing route
    ctx.strokeStyle = lerpColor("#d8c888", "#4a4030", nightFactor) + "50";
    ctx.lineWidth = roadW + 2 * z;
    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
    ctx.strokeStyle = lerpColor("#f5e8c0", "#6a5a40", nightFactor) + "70";
    ctx.lineWidth = roadW;
    ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();

    // Animated trade dot
    const prog = ((t * 0.0005 + r.x1 * 0.0001) % 1);
    const px = sx1 + (sx2 - sx1) * prog;
    const py = sy1 + (sy2 - sy1) * prog;
    ctx.fillStyle = `rgba(255,200,50,${0.5 + Math.sin(t * 0.005) * 0.2})`;
    ctx.beginPath(); ctx.arc(px, py, 2 * z, 0, Math.PI * 2); ctx.fill();
  });
}

// ─── Connection Lines ───────────────────────────────────────────
function drawConnectionLines(ctx: CanvasRenderingContext2D, agents: Agent[], cam: { x: number; y: number }, z: number, t: number) {
  agents.forEach(a => {
    if ((a.state === "meeting" || a.state === "trading" || a.state === "combat") && a.meetingPartner !== null) {
      const other = agents.find(o => o.id === a.meetingPartner);
      if (!other || a.id > (other?.id ?? 0)) return;
      const sx1 = (a.x - cam.x) * z, sy1 = (a.y - cam.y) * z;
      const sx2 = (other.x - cam.x) * z, sy2 = (other.y - cam.y) * z;
      const pulse = 0.3 + Math.sin(t * 0.008) * 0.15;
      ctx.strokeStyle = a.state === "combat" ? `rgba(239,68,68,${pulse})` : a.state === "trading" ? `rgba(20,241,149,${pulse})` : `rgba(251,191,36,${pulse})`;
      ctx.lineWidth = Math.max(1, 2 * z);
      ctx.setLineDash([4 * z, 4 * z]);
      ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
      ctx.setLineDash([]);
      const prog = (t * 0.002) % 1;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(sx1 + (sx2 - sx1) * prog, sy1 + (sy2 - sy1) * prog, 2.5 * z, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// ─── Floating Texts ─────────────────────────────────────────────
function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[], cam: { x: number; y: number }, z: number) {
  texts.forEach(ft => {
    const sx = (ft.x - cam.x) * z, sy = (ft.y - cam.y) * z;
    const alpha = ft.life / 60;
    ctx.font = `bold ${Math.max(9, 11 * z)}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.5})`;
    ctx.fillText(ft.text, sx + 1, sy + 1);
    ctx.fillStyle = ft.color.replace(")", `,${alpha})`).replace("rgb", "rgba");
    ctx.fillText(ft.text, sx, sy);
    ctx.textAlign = "left";
  });
}

// ─── Particles ──────────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cam: { x: number; y: number }, z: number) {
  particles.forEach(p => {
    const sx = (p.x - cam.x) * z, sy = (p.y - cam.y) * z;
    if (sx < -10 || sx > ctx.canvas.width + 10 || sy < -10 || sy > ctx.canvas.height + 10) return;
    const alpha = p.life / p.maxLife;
    if (p.type === "firefly") {
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * z * 4);
      glow.addColorStop(0, `rgba(200,255,100,${alpha * 0.5})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy, p.size * z * 4, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "rain") {
      ctx.strokeStyle = `rgba(150,200,255,${alpha * 0.35})`;
      ctx.lineWidth = z;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - z, sy + 6 * z); ctx.stroke();
      return;
    } else if (p.type === "snow") {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
    } else {
      ctx.fillStyle = `rgba(255,200,100,${alpha * 0.4})`;
    }
    ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, Math.PI * 2); ctx.fill();
  });
}

// ─── Minimap ────────────────────────────────────────────────────
function drawMinimap(ctx: CanvasRenderingContext2D, terrain: number[][], buildings: Building[], agents: Agent[], cam: { x: number; y: number }, z: number, w: number, h: number, nightFactor: number) {
  const mmW = 200, mmH = 130;
  const mmX = w - mmW - 16, mmY = h - mmH - 16;
  
  // Premium glass background
  ctx.fillStyle = `rgba(0,0,0,${0.6 + nightFactor * 0.2})`;
  ctx.beginPath(); ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 8); ctx.fill();
  // Border glow
  ctx.strokeStyle = `rgba(153,69,255,0.2)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 8); ctx.stroke();
  // Inner border
  ctx.strokeStyle = `rgba(255,255,255,0.08)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 6); ctx.stroke();

  const mmScale = mmW / (MAP_W * TILE);
  // Terrain
  for (let row = 0; row < MAP_H; row += 2) {
    for (let col = 0; col < MAP_W; col += 2) {
      const tile = terrain[row][col];
      ctx.fillStyle = lerpColor(TERRAIN_COLORS_DAY[tile].fill, TERRAIN_COLORS_NIGHT[tile].fill, nightFactor);
      ctx.fillRect(mmX + col * TILE * mmScale, mmY + row * TILE * mmScale, Math.max(2, 2 * TILE * mmScale), Math.max(2, 2 * TILE * mmScale));
    }
  }
  // Buildings
  buildings.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(mmX + (b.x + b.w * TILE / 2) * mmScale, mmY + (b.y + b.h * TILE / 2) * mmScale, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  // Agents
  agents.forEach(a => {
    ctx.fillStyle = a.color;
    ctx.fillRect(mmX + a.x * mmScale - 0.5, mmY + a.y * mmScale - 0.5, 2, 2);
  });
  // Camera view
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX + cam.x * mmScale, mmY + cam.y * mmScale, (w / z) * mmScale, (h / z) * mmScale);
  // Label
  ctx.font = "bold 9px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "rgba(153,69,255,0.6)";
  ctx.textAlign = "left";
  ctx.fillText("MEEET STATE", mmX + 6, mmY + mmH - 5);
}

// ─── Celestial Bodies ───────────────────────────────────────────
function drawCelestialBodies(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, nightFactor: number) {
  const cyclePos = (t % DAY_CYCLE_MS) / DAY_CYCLE_MS;
  // Sun
  if (nightFactor < 0.7) {
    const sunAngle = cyclePos * Math.PI;
    const sunX = w * 0.1 + Math.cos(sunAngle) * w * 0.4;
    const sunY = h * 0.3 - Math.sin(sunAngle) * h * 0.25;
    const sunAlpha = 1 - nightFactor;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
    sunGlow.addColorStop(0, `rgba(255,240,180,${sunAlpha * 0.4})`);
    sunGlow.addColorStop(0.15, `rgba(255,210,120,${sunAlpha * 0.2})`);
    sunGlow.addColorStop(0.4, `rgba(255,170,70,${sunAlpha * 0.06})`);
    sunGlow.addColorStop(1, "transparent");
    ctx.fillStyle = sunGlow;
    ctx.beginPath(); ctx.arc(sunX, sunY, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,245,210,${sunAlpha * 0.9})`;
    ctx.beginPath(); ctx.arc(sunX, sunY, 16, 0, Math.PI * 2); ctx.fill();
  }
  // Moon
  if (nightFactor > 0.3) {
    const moonAngle = ((cyclePos + 0.5) % 1) * Math.PI;
    const moonX = w * 0.65 + Math.cos(moonAngle) * w * 0.25;
    const moonY = h * 0.1 - Math.sin(moonAngle) * h * 0.06 + 40;
    const moonAlpha = Math.min(1, (nightFactor - 0.3) / 0.35);
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 80);
    moonGlow.addColorStop(0, `rgba(200,215,255,${moonAlpha * 0.2})`);
    moonGlow.addColorStop(0.4, `rgba(150,175,230,${moonAlpha * 0.06})`);
    moonGlow.addColorStop(1, "transparent");
    ctx.fillStyle = moonGlow;
    ctx.beginPath(); ctx.arc(moonX, moonY, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(225,230,245,${moonAlpha * 0.9})`;
    ctx.beginPath(); ctx.arc(moonX, moonY, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(30,35,65,${moonAlpha * 0.5})`;
    ctx.beginPath(); ctx.arc(moonX + 4, moonY - 2, 9, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── Aurora ─────────────────────────────────────────────────────
function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, nightFactor: number) {
  if (nightFactor < 0.4) return;
  const alpha = (nightFactor - 0.4) / 0.6;
  for (let i = 0; i < 4; i++) {
    const baseY = h * 0.04 + i * h * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 10) {
      const wave = Math.sin(x * 0.003 + t * 0.0008 + i * 1.5) * 25 + Math.sin(x * 0.007 + t * 0.0012) * 12;
      ctx.lineTo(x, baseY + wave);
    }
    ctx.lineTo(w, baseY + 50);
    ctx.lineTo(0, baseY + 50);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, baseY - 20, 0, baseY + 50);
    const hue = (120 + i * 35 + Math.sin(t * 0.0003) * 20) % 360;
    grad.addColorStop(0, `hsla(${hue}, 80%, 60%, ${alpha * 0.03})`);
    grad.addColorStop(0.4, `hsla(${hue + 20}, 70%, 50%, ${alpha * 0.06})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ─── Enhanced Tooltip ───────────────────────────────────────────
function drawEnhancedTooltip(ctx: CanvasRenderingContext2D, agents: Agent[], buildings: Building[], mx: number, my: number, cam: { x: number; y: number }, z: number) {
  if (mx <= 0 || my <= 0) return;
  const worldX = cam.x + mx / z, worldY = cam.y + my / z;
  for (const a of agents) {
    if (Math.hypot(a.x - worldX, a.y - worldY) < 20) {
      const tipX = mx + 20, tipY = my - 10;
      const lineH = 16;
      const lines = [
        { label: a.name, color: a.color, bold: true },
        { label: `${a.cls} · Lv.${a.level}`, color: "#94a3b8", bold: false },
        { label: `HP: ${a.hp}/${a.maxHp}`, color: a.hp / a.maxHp > 0.5 ? "#22c55e" : "#ef4444", bold: false },
        { label: `${a.balance} $MEEET`, color: "#fbbf24", bold: false },
        { label: `State: ${a.state}`, color: "#64748b", bold: false },
      ];
      const boxW = 160, boxH = lines.length * lineH + 16;
      ctx.fillStyle = "rgba(5,5,15,0.92)";
      ctx.beginPath(); ctx.roundRect(tipX, tipY, boxW, boxH, 8); ctx.fill();
      ctx.strokeStyle = a.color + "50";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tipX, tipY, boxW, boxH, 8); ctx.stroke();
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.roundRect(tipX, tipY, 3, boxH, [8, 0, 0, 8]); ctx.fill();
      lines.forEach((line, i) => {
        ctx.font = `${line.bold ? "bold" : ""} 11px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = line.color;
        ctx.textAlign = "left";
        ctx.fillText(line.label, tipX + 12, tipY + 14 + i * lineH);
      });
      return;
    }
  }
  for (const b of buildings) {
    if (worldX >= b.x && worldX <= b.x + b.w * TILE && worldY >= b.y && worldY <= b.y + b.h * TILE) {
      const tipX = mx + 20, tipY = my - 10;
      const lineH = 16;
      const lines = [
        { label: `${b.icon} ${b.name}`, color: b.accent, bold: true },
        { label: b.description.slice(0, 50), color: "#94a3b8", bold: false },
        { label: `${b.visitors} visitors · ${b.income} $M/d`, color: "#fbbf24", bold: false },
      ];
      const boxW = 200, boxH = lines.length * lineH + 16;
      ctx.fillStyle = "rgba(5,5,15,0.92)";
      ctx.beginPath(); ctx.roundRect(tipX, tipY, boxW, boxH, 8); ctx.fill();
      ctx.strokeStyle = b.color + "50";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tipX, tipY, boxW, boxH, 8); ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.roundRect(tipX, tipY, 3, boxH, [8, 0, 0, 8]); ctx.fill();
      lines.forEach((line, i) => {
        ctx.font = `${line.bold ? "bold" : ""} 11px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = line.color;
        ctx.textAlign = "left";
        ctx.fillText(line.label, tipX + 12, tipY + 14 + i * lineH);
      });
      return;
    }
  }
}

// ─── Event Config ───────────────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  duel: { icon: "⚔️", color: "#EF4444" }, trade: { icon: "💰", color: "#14F195" },
  quest_complete: { icon: "📜", color: "#06B6D4" }, quest_created: { icon: "📋", color: "#3B82F6" },
  level_up: { icon: "🎓", color: "#6366F1" }, alliance: { icon: "🤝", color: "#34D399" },
  vote: { icon: "🗳️", color: "#9945FF" }, law: { icon: "🏛️", color: "#9945FF" },
  burn: { icon: "🔥", color: "#F97316" }, mining: { icon: "⛏️", color: "#FBBF24" },
  transfer: { icon: "💸", color: "#00C2FF" }, stake: { icon: "🏦", color: "#00C2FF" },
  combat: { icon: "⚔️", color: "#EF4444" }, death: { icon: "💀", color: "#EF4444" },
  spawn: { icon: "🆕", color: "#14F195" }, petition: { icon: "📨", color: "#A78BFA" },
  guild: { icon: "🏰", color: "#F59E0B" },
};

// ─── Component ──────────────────────────────────────────────────
const LiveMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [agentCount, setAgentCount] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [showDirectory, setShowDirectory] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [zoom, setZoom] = useState(1);
  const [weather, setWeather] = useState<"clear" | "rain" | "snow" | "storm">("clear");
  const [timeLabel, setTimeLabel] = useState("Day");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [followAgent, setFollowAgent] = useState<number | null>(null);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 0>(1);
  const [showFps, setShowFps] = useState(false);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const hoveredEntityRef = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; agent?: Agent; building?: Building } | null>(null);
  const terrainCacheRef = useRef<{ canvas: HTMLCanvasElement; camX: number; camY: number; zoom: number; nightFactor: number; w: number; h: number } | null>(null);

  const agentsRef = useRef<Agent[]>([]);
  const terrainRef = useRef<number[][]>(generateTerrain());
  const buildingsRef = useRef<Building[]>(generateBuildings(terrainRef.current));
  const roadsRef = useRef<Road[]>(generateRoads(buildingsRef.current));
  const cameraRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef<{ x: number; y: number } | null>(null);
  const cameraVelRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, moved: false });
  const zoomRef = useRef(1);
  const eventIdRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const trailsRef = useRef<Trail[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const weatherRef = useRef<"clear" | "rain" | "snow" | "storm">("clear");
  const keysRef = useRef<Set<string>>(new Set());
  const followRef = useRef<number | null>(null);
  const simSpeedRef = useRef<number>(1);

  const addEvent = useCallback((text: string, color: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setEvents((prev) => [{ id: eventIdRef.current++, text, time, color }, ...prev].slice(0, 30));
  }, []);

  const addFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({ x, y, text, color, life: 60, vy: -0.5 });
  }, []);

  // Init — fetch real agents
  useEffect(() => {
    const terrain = terrainRef.current;
    const initAgents = async () => {
      const { data: dbAgents } = await supabase
        .from("agents")
        .select("id, name, class, level, balance_meeet, hp, max_hp, status, pos_x, pos_y")
        .order("created_at", { ascending: true });
      const realAgents = dbAgents ?? [];
      const agents: Agent[] = realAgents.map((db, i) => {
        const cls = db.class || "warrior";
        const cfg = CLASS_CONFIG[cls] || CLASS_CONFIG.warrior;
        let x = (db.pos_x || 50) * TILE;
        let y = (db.pos_y || 50) * TILE;
        x = Math.max(TILE, Math.min(x, (MAP_W - 1) * TILE));
        y = Math.max(TILE, Math.min(y, (MAP_H - 1) * TILE));
        // Ensure agent is on land
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && terrain[ty][tx] <= 1) {
          // Move to nearest land
          for (let r = 1; r < 20; r++) {
            let found = false;
            for (let dy = -r; dy <= r && !found; dy++) {
              for (let dx = -r; dx <= r && !found; dx++) {
                const nx = tx + dx, ny = ty + dy;
                if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && terrain[ny][nx] > 1 && terrain[ny][nx] < 7) {
                  x = nx * TILE; y = ny * TILE; found = true;
                }
              }
            }
            if (found) break;
          }
        }
        return {
          id: i, x, y, dir: Math.random() * Math.PI * 2, speed: cfg.speed,
          name: db.name, cls, color: cfg.color,
          phase: Math.random() * Math.PI * 2, linked: Math.random() > 0.6,
          state: "move" as const, stateTimer: 100 + Math.random() * 300,
          meetingPartner: null, reputation: Math.floor(100 + Math.random() * 800),
          balance: Number(db.balance_meeet) || 0, level: db.level || 1,
          targetBuilding: null, hp: db.hp || 100, maxHp: db.max_hp || 100,
        };
      });
      agentsRef.current = agents;
      setAgentCount(agents.length);
      cameraRef.current = { x: (MAP_W * TILE) / 2 - window.innerWidth / 2, y: (MAP_H * TILE) / 2 - window.innerHeight / 2 };
      addEvent("🌐 Welcome to MEEET State — The First AI Nation on Solana", "#14F195");
      addEvent(`👥 ${agents.length} agents across ${buildingsRef.current.length} structures`, "#00C2FF");
    };
    initAgents();
    // Realtime
    const channel = supabase.channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
        const agents = agentsRef.current;
        if (payload.eventType === 'INSERT') {
          const db = payload.new as any;
          const cls = db.class || 'warrior';
          const cfg = CLASS_CONFIG[cls] || CLASS_CONFIG.warrior;
          let x = (db.pos_x || 50) * TILE, y = (db.pos_y || 50) * TILE;
          x = Math.max(TILE, Math.min(x, (MAP_W - 1) * TILE));
          y = Math.max(TILE, Math.min(y, (MAP_H - 1) * TILE));
          agents.push({
            id: agents.length, x, y, dir: Math.random() * Math.PI * 2, speed: cfg.speed,
            name: db.name, cls, color: cfg.color, phase: Math.random() * Math.PI * 2, linked: false,
            state: 'move', stateTimer: 200, meetingPartner: null,
            reputation: 100, balance: Number(db.balance_meeet) || 0, level: db.level || 1,
            targetBuilding: null, hp: db.hp || 100, maxHp: db.max_hp || 100,
          });
          setAgentCount(agents.length);
          addEvent(`🆕 ${db.name} joined!`, cfg.color);
          addFloatingText(x, y, `NEW: ${db.name}`, cfg.color);
        } else if (payload.eventType === 'UPDATE') {
          const db = payload.new as any;
          const agent = agents.find(a => a.name === db.name);
          if (agent) {
            agent.balance = Number(db.balance_meeet) || agent.balance;
            agent.level = db.level || agent.level;
            agent.hp = db.hp ?? agent.hp;
            agent.maxHp = db.max_hp ?? agent.maxHp;
            if (db.status === 'in_combat' && agent.state !== 'combat') { agent.state = 'combat'; agent.stateTimer = 200; addEvent(`⚔️ ${agent.name} in combat!`, '#EF4444'); }
            if (db.status === 'trading' && agent.state !== 'trading') { agent.state = 'trading'; agent.stateTimer = 150; addEvent(`💰 ${agent.name} trading`, '#14F195'); }
          }
        } else if (payload.eventType === 'DELETE') {
          const db = payload.old as any;
          const idx = agents.findIndex(a => a.name === db.name);
          if (idx !== -1) { addEvent(`💀 ${agents[idx].name} has fallen`, '#EF4444'); agents.splice(idx, 1); setAgentCount(agents.length); }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [addEvent, addFloatingText]);

  // Weather cycle
  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random();
      const w: typeof weather = r < 0.5 ? "clear" : r < 0.72 ? "rain" : r < 0.88 ? "snow" : "storm";
      weatherRef.current = w; setWeather(w);
      if (w === "rain") addEvent("🌧️ Rain across the archipelago", "#3B82F6");
      if (w === "snow") addEvent("❄️ Snow on the peaks", "#94A3B8");
      if (w === "storm") addEvent("🌪️ Storm sweeps the coast!", "#D97706");
    }, 30000);
    return () => clearInterval(interval);
  }, [addEvent]);

  // Realtime activity feed
  useEffect(() => {
    const loadRecent = async () => {
      const { data } = await supabase.from("activity_feed")
        .select("*, agents!activity_feed_agent_id_fkey(name)")
        .order("created_at", { ascending: false }).limit(10);
      if (data) data.reverse().forEach(ev => {
        const icon = EVENT_TYPE_CONFIG[ev.event_type]?.icon ?? "🔔";
        const color = EVENT_TYPE_CONFIG[ev.event_type]?.color ?? "#14F195";
        addEvent(`${icon} ${ev.title}`, color);
      });
    };
    loadRecent();
    const channel = supabase.channel("activity-feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        const ev = payload.new as any;
        const icon = EVENT_TYPE_CONFIG[ev.event_type]?.icon ?? "🔔";
        const color = EVENT_TYPE_CONFIG[ev.event_type]?.color ?? "#14F195";
        addEvent(`${icon} ${ev.title}`, color);
        if (ev.agent_id) {
          const agent = agentsRef.current.find(a => a.name === ev.title.split(" ")[0]);
          if (agent && ev.meeet_amount) addFloatingText(agent.x, agent.y, `${ev.meeet_amount > 0 ? "+" : ""}${ev.meeet_amount} $M`, color);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [addEvent, addFloatingText]);

  // Ambient events
  useEffect(() => {
    const interval = setInterval(() => {
      const agents = agentsRef.current;
      if (!agents.length) return;
      const a = agents[Math.floor(Math.random() * agents.length)];
      addEvent(`🔭 ${a.name} exploring the frontier`, "#64748B");
    }, 10000);
    return () => clearInterval(interval);
  }, [addEvent]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) { setFps(frameCount); frameCount = 0; lastFpsTime = now; }

      const w = window.innerWidth, h = window.innerHeight;
      const cam = cameraRef.current;
      const z = zoomRef.current;
      const terrain = terrainRef.current;
      const agents = agentsRef.current;
      const buildings = buildingsRef.current;
      const roads = roadsRef.current;
      const t = Date.now();
      const speed = simSpeedRef.current;

      // Camera movement
      const keys = keysRef.current;
      const camSpeed = 5 / z;
      if (keys.has("w") || keys.has("arrowup")) cam.y -= camSpeed;
      if (keys.has("s") || keys.has("arrowdown")) cam.y += camSpeed;
      if (keys.has("a") || keys.has("arrowleft")) cam.x -= camSpeed;
      if (keys.has("d") || keys.has("arrowright")) cam.x += camSpeed;

      // Follow agent
      const followId = followRef.current;
      if (followId !== null) {
        const fa = agents.find(a => a.id === followId);
        if (fa) { cam.x += (fa.x - w / z / 2 - cam.x) * 0.08; cam.y += (fa.y - h / z / 2 - cam.y) * 0.08; }
      }
      if (cameraTargetRef.current) {
        const ct = cameraTargetRef.current;
        cam.x += (ct.x - cam.x) * 0.1; cam.y += (ct.y - cam.y) * 0.1;
        if (Math.abs(ct.x - cam.x) < 1 && Math.abs(ct.y - cam.y) < 1) cameraTargetRef.current = null;
      }
      if (!dragRef.current.dragging && (Math.abs(cameraVelRef.current.x) > 0.1 || Math.abs(cameraVelRef.current.y) > 0.1)) {
        cam.x += cameraVelRef.current.x; cam.y += cameraVelRef.current.y;
        cameraVelRef.current.x *= 0.92; cameraVelRef.current.y *= 0.92;
      }

      // Day/night
      const cyclePos = (t % DAY_CYCLE_MS) / DAY_CYCLE_MS;
      const nightFactor = cyclePos < 0.25 ? 0 : cyclePos < 0.4 ? (cyclePos - 0.25) / 0.15 : cyclePos < 0.75 ? 1 : 1 - (cyclePos - 0.75) / 0.25;
      const clampedNight = Math.max(0, Math.min(1, nightFactor));
      const label = clampedNight < 0.2 ? "Day" : clampedNight < 0.5 ? "Dusk" : clampedNight < 0.8 ? "Night" : "Dawn";
      setTimeLabel(label);

      // Sky gradient — deep ocean blue
      const skyDay = "#b8d4e8";
      const skyDusk = "#e8a060";
      const skyNight = "#060e1e";
      let skyColor: string;
      if (clampedNight < 0.3) skyColor = lerpColor(skyDay, skyDusk, clampedNight / 0.3 * 0.5);
      else if (clampedNight < 0.5) skyColor = lerpColor(skyDusk, skyNight, (clampedNight - 0.3) / 0.2);
      else skyColor = lerpColor(skyNight, skyDusk, Math.max(0, (clampedNight - 0.8) / 0.2));
      if (clampedNight >= 0.5 && clampedNight < 0.8) skyColor = skyNight;
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, w, h);

      // Stars
      if (clampedNight > 0.3) {
        const starAlpha = (clampedNight - 0.3) / 0.7;
        for (let i = 0; i < 100; i++) {
          const sx2 = noise2d(i, 0, 1) * w;
          const sy2 = noise2d(0, i, 2) * h * 0.5;
          const twinkle = 0.3 + Math.sin(t * 0.003 + i * 7) * 0.3;
          ctx.fillStyle = `rgba(255,255,255,${starAlpha * twinkle})`;
          ctx.beginPath();
          ctx.arc(sx2, sy2, noise2d(i, i, 3) > 0.8 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      drawCelestialBodies(ctx, w, h, t, clampedNight);
      drawAurora(ctx, w, h, t, clampedNight);

      // Terrain
      const startCol = Math.max(0, Math.floor(cam.x / TILE));
      const endCol = Math.min(MAP_W, Math.ceil((cam.x + w / z) / TILE));
      const startRow = Math.max(0, Math.floor(cam.y / TILE));
      const endRow = Math.min(MAP_H, Math.ceil((cam.y + h / z) / TILE));

      // Terrain caching
      const tc = terrainCacheRef.current;
      const needsRedraw = !tc ||
        Math.abs(tc.camX - cam.x) > TILE * 2 || Math.abs(tc.camY - cam.y) > TILE * 2 ||
        Math.abs(tc.zoom - z) > 0.02 || Math.abs(tc.nightFactor - clampedNight) > 0.04 ||
        tc.w !== w || tc.h !== h;

      if (needsRedraw) {
        let offCanvas: HTMLCanvasElement;
        if (tc) { offCanvas = tc.canvas; } else { offCanvas = document.createElement("canvas"); }
        offCanvas.width = w; offCanvas.height = h;
        const offCtx = offCanvas.getContext("2d")!;
        offCtx.clearRect(0, 0, w, h);

        for (let row = startRow; row < endRow; row++) {
          for (let col = startCol; col < endCol; col++) {
            const sx2 = (col * TILE - cam.x) * z, sy2 = (row * TILE - cam.y) * z;
            const tile = terrain[row][col];
            const ts = TILE * z;
            
            // Base fill
            offCtx.fillStyle = lerpColor(TERRAIN_COLORS_DAY[tile].fill, TERRAIN_COLORS_NIGHT[tile].fill, clampedNight);
            offCtx.fillRect(sx2, sy2, ts + 1, ts + 1);
            
            // Subtle elevation gradient overlay
            if (tile >= 2 && tile <= 7) {
              const elev = tile / 7;
              offCtx.fillStyle = `rgba(255,255,255,${elev * 0.03})`;
              offCtx.fillRect(sx2, sy2, ts + 1, ts + 1);
            }
            
            // No harsh grid lines — soft border only at high zoom for land
            if (z > 0.8 && tile >= 2) {
              offCtx.strokeStyle = lerpColor(TERRAIN_COLORS_DAY[tile].border, TERRAIN_COLORS_NIGHT[tile].border, clampedNight) + "20";
              offCtx.lineWidth = 0.3;
              offCtx.strokeRect(sx2, sy2, ts, ts);
            }

            if (z > 0.35) drawTerrainDetail(offCtx, tile, sx2, sy2, col, row, z, t, clampedNight);
          }
        }
        terrainCacheRef.current = { canvas: offCanvas, camX: cam.x, camY: cam.y, zoom: z, nightFactor: clampedNight, w, h };
      }
      ctx.drawImage(terrainCacheRef.current!.canvas, 0, 0);

      // Coastal foam line
      if (z > 0.3) {
        for (let row = startRow; row < endRow; row++) {
          for (let col = startCol; col < endCol; col++) {
            const tile = terrain[row][col];
            if (tile !== 2) continue; // beach tiles
            // Check if adjacent to water
            let nearWater = false;
            for (let dy = -1; dy <= 1 && !nearWater; dy++) {
              for (let dx = -1; dx <= 1 && !nearWater; dx++) {
                const nx = col + dx, ny = row + dy;
                if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && terrain[ny][nx] <= 1) nearWater = true;
              }
            }
            if (nearWater) {
              const sx2 = (col * TILE - cam.x) * z, sy2 = (row * TILE - cam.y) * z;
              const ts = TILE * z;
              const foamAlpha = 0.15 + Math.sin(t * 0.002 + col * 0.5 + row * 0.3) * 0.08;
              ctx.fillStyle = `rgba(255,255,255,${foamAlpha})`;
              ctx.fillRect(sx2, sy2, ts, ts);
            }
          }
        }
      }

      // Roads
      drawRoads(ctx, roads, cam, z, t, clampedNight);
      // Buildings
      buildings.forEach(b => drawBuilding(ctx, b, cam, z, t, clampedNight));
      // Connection lines
      drawConnectionLines(ctx, agents, cam, z, t);

      // Particles
      const particles = particlesRef.current;
      if (weatherRef.current === "rain") {
        for (let i = 0; i < 4; i++) particles.push({ x: cam.x + Math.random() * w / z, y: cam.y - 10, vx: -0.3, vy: 4, life: 60, maxLife: 60, color: "#6ba3d6", size: 1, type: "rain" });
      }
      if (weatherRef.current === "snow" && Math.random() < 0.3) {
        particles.push({ x: cam.x + Math.random() * w / z, y: cam.y - 10, vx: (Math.random() - 0.5) * 0.5, vy: 0.5 + Math.random(), life: 200, maxLife: 200, color: "#fff", size: 1.5 + Math.random(), type: "snow" });
      }
      if (clampedNight > 0.4 && Math.random() < 0.08) {
        const fx = cam.x + Math.random() * w / z, fy = cam.y + Math.random() * h / z;
        const tx2 = Math.floor(fx / TILE), ty2 = Math.floor(fy / TILE);
        if (tx2 >= 0 && tx2 < MAP_W && ty2 >= 0 && ty2 < MAP_H && terrain[ty2][tx2] >= 3 && terrain[ty2][tx2] <= 5) {
          particles.push({ x: fx, y: fy, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: 120 + Math.random() * 80, maxLife: 200, color: "#aaff77", size: 1.5, type: "firefly" });
        }
      }
      if (weatherRef.current === "storm") {
        for (let i = 0; i < 4; i++) particles.push({ x: cam.x + Math.random() * (w / z), y: cam.y + Math.random() * h / z, vx: 3 + Math.random() * 2, vy: (Math.random() - 0.5) * 0.8, life: 80, maxLife: 120, color: "#d4a76a", size: 1 + Math.random() * 2, type: "dust" });
        ctx.fillStyle = `rgba(180,140,70,0.04)`;
        ctx.fillRect(0, 0, w, h);
      }
      // Lightning
      if (weatherRef.current === "rain" && Math.random() < 0.003) {
        ctx.fillStyle = `rgba(255,255,255,0.12)`; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = `rgba(200,220,255,0.8)`; ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(180,200,255,0.6)"; ctx.shadowBlur = 12;
        ctx.beginPath();
        let lx = Math.random() * w, ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < h * 0.6) { lx += (Math.random() - 0.5) * 40; ly += 15 + Math.random() * 25; ctx.lineTo(lx, ly); }
        ctx.stroke(); ctx.shadowBlur = 0;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.type === "firefly") { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (particles.length > 800) particles.splice(0, particles.length - 800);
      drawParticles(ctx, particles, cam, z);

      // Floating texts
      const fts = floatingTextsRef.current;
      for (let i = fts.length - 1; i >= 0; i--) { fts[i].y += fts[i].vy; fts[i].life--; if (fts[i].life <= 0) fts.splice(i, 1); }
      drawFloatingTexts(ctx, fts, cam, z);

      // Trails
      const trails = trailsRef.current;
      for (let i = trails.length - 1; i >= 0; i--) { trails[i].life--; if (trails[i].life <= 0) trails.splice(i, 1); }
      if (trails.length > 1500) trails.splice(0, trails.length - 1500);

      // Agent simulation & draw
      agents.forEach(a => {
        if (speed === 0) { drawAgent(ctx, a, cam, z, t, clampedNight); return; }
        const spdMult = speed;
        a.stateTimer -= spdMult;
        if (a.stateTimer <= 0) {
          if (["meeting", "combat", "trading", "visiting"].includes(a.state)) {
            a.state = "move"; a.stateTimer = 150 + Math.random() * 300; a.meetingPartner = null; a.targetBuilding = null;
          } else if (a.state === "idle") {
            a.state = "move"; a.stateTimer = 200 + Math.random() * 400;
          } else {
            const r = Math.random();
            if (r < 0.02) { a.state = "idle"; a.stateTimer = 60 + Math.random() * 120; }
            else if (r < 0.06) {
              let nearest = -1, nd = Infinity;
              for (const b of buildings) {
                const d = Math.hypot(a.x - (b.x + b.w * TILE / 2), a.y - (b.y + b.h * TILE / 2));
                if (d < nd) { nd = d; nearest = b.id; }
              }
              if (nearest >= 0 && nd < 500) {
                a.state = "visiting"; a.targetBuilding = nearest; a.stateTimer = 100 + Math.random() * 150;
                const tb = buildings.find(b => b.id === nearest);
                if (tb) a.dir = Math.atan2(tb.y + tb.h * TILE / 2 - a.y, tb.x + tb.w * TILE / 2 - a.x);
              } else { a.stateTimer = 200 + Math.random() * 400; }
            } else { a.stateTimer = 200 + Math.random() * 400; }
          }
        }

        // Proximity interactions
        if (a.state === "move") {
          for (const other of agents) {
            if (other.id === a.id || other.state !== "move") continue;
            if (Math.hypot(a.x - other.x, a.y - other.y) < 25) {
              const r = Math.random();
              if (a.cls === "warrior" && other.cls === "warrior" && r < 0.35) {
                a.state = "combat"; other.state = "combat"; a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 80 + Math.random() * 60;
              } else if ((a.cls === "trader" || other.cls === "trader") && r < 0.5) {
                a.state = "trading"; other.state = "trading"; a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 60 + Math.random() * 80;
              } else {
                a.state = "meeting"; other.state = "meeting"; a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 50 + Math.random() * 100;
              }
              break;
            }
          }
        }

        // Movement — avoid water
        if (a.state === "move" || a.state === "visiting") {
          if (a.state === "move" && Math.random() < 0.02) a.dir += (Math.random() - 0.5) * 1.5;
          const spd = (a.state === "visiting" ? a.speed * 1.3 : a.speed) * spdMult;
          const nx = a.x + Math.cos(a.dir) * spd;
          const ny = a.y + Math.sin(a.dir) * spd;
          if (nx < 30 || nx > MAP_W * TILE - 30) a.dir = Math.PI - a.dir;
          if (ny < 30 || ny > MAP_H * TILE - 30) a.dir = -a.dir;
          const tileX = Math.floor(nx / TILE), tileY = Math.floor(ny / TILE);
          if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
            const tt = terrain[tileY][tileX];
            if (tt <= 1) a.dir += Math.PI / 2 + Math.random() * 0.5; // avoid water
            else if (tt >= 7) a.dir += Math.PI / 3 + Math.random() * 0.3; // avoid snow peaks
            else {
              if (Math.random() < 0.1) {
                const hex = a.color;
                const rr = parseInt(hex.slice(1,3),16), gg = parseInt(hex.slice(3,5),16), bb = parseInt(hex.slice(5,7),16);
                trails.push({ x: a.x, y: a.y, color: `rgb(${rr},${gg},${bb})`, life: 30, maxLife: 30 });
              }
              a.x = nx; a.y = ny;
            }
          }
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
      if (clampedNight > 0.5) {
        ctx.fillStyle = `rgba(8,14,30,${(clampedNight - 0.5) * 0.1})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Vignette — premium cinematic effect
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
      vigGrad.addColorStop(0, "transparent");
      vigGrad.addColorStop(1, `rgba(0,0,0,${0.2 + clampedNight * 0.15})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      // Minimap
      drawMinimap(ctx, terrain, buildings, agents, cam, z, w, h, clampedNight);
      // Tooltip
      drawEnhancedTooltip(ctx, agents, buildings, mouseRef.current.x, mouseRef.current.y, cam, z);

      // Coordinate display
      if (z > 0.5) {
        const worldX = cam.x + w / z / 2;
        const worldY = cam.y + h / z / 2;
        const tileCoordX = Math.floor(worldX / TILE);
        const tileCoordY = Math.floor(worldY / TILE);
        ctx.font = "10px 'Space Grotesk', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.textAlign = "left";
        ctx.fillText(`${tileCoordX}, ${tileCoordY}`, 12, h - 8);
      }

      raf = requestAnimationFrame(render);
    };
    render();

    // Input handlers
    const onDown = (e: MouseEvent) => { dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, moved: false }; followRef.current = null; setFollowAgent(null); cameraTargetRef.current = null; setContextMenu(null); };
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX, dy = e.clientY - dragRef.current.lastY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
        cameraRef.current.x -= dx / zoomRef.current; cameraRef.current.y -= dy / zoomRef.current;
        cameraVelRef.current = { x: -dx / zoomRef.current, y: -dy / zoomRef.current };
        dragRef.current.lastX = e.clientX; dragRef.current.lastY = e.clientY;
      } else {
        const z2 = zoomRef.current;
        const worldX = cameraRef.current.x + e.clientX / z2;
        const worldY = cameraRef.current.y + e.clientY / z2;
        let found = false;
        for (const a of agentsRef.current) {
          if (Math.hypot(a.x - worldX, a.y - worldY) < 20) { hoveredEntityRef.current = a.name; canvasRef.current!.style.cursor = "pointer"; found = true; break; }
        }
        if (!found) {
          for (const b of buildingsRef.current) {
            if (worldX >= b.x && worldX <= b.x + b.w * TILE && worldY >= b.y && worldY <= b.y + b.h * TILE) { hoveredEntityRef.current = b.name; canvasRef.current!.style.cursor = "pointer"; found = true; break; }
          }
        }
        if (!found) { hoveredEntityRef.current = null; canvasRef.current!.style.cursor = "grab"; }
      }
    };
    const onUp = () => { dragRef.current.dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const newZoom = Math.max(0.2, Math.min(4, zoomRef.current + delta));
      const mx = e.clientX, my = e.clientY;
      const wx = cameraRef.current.x + mx / zoomRef.current;
      const wy = cameraRef.current.y + my / zoomRef.current;
      zoomRef.current = newZoom;
      cameraRef.current.x = wx - mx / newZoom; cameraRef.current.y = wy - my / newZoom;
      setZoom(newZoom);
    };
    const onClick = (e: MouseEvent) => {
      if (dragRef.current.moved) return;
      const z2 = zoomRef.current;
      const worldX = cameraRef.current.x + e.clientX / z2;
      const worldY = cameraRef.current.y + e.clientY / z2;
      for (const a of agentsRef.current) { if (Math.hypot(a.x - worldX, a.y - worldY) < 20) { setSelectedAgent({ ...a }); setSelectedBuilding(null); return; } }
      for (const b of buildingsRef.current) { if (worldX >= b.x && worldX <= b.x + b.w * TILE && worldY >= b.y && worldY <= b.y + b.h * TILE) { setSelectedBuilding(b); setSelectedAgent(null); return; } }
      setSelectedAgent(null); setSelectedBuilding(null);
    };
    const onDblClick = (e: MouseEvent) => {
      const z2 = zoomRef.current;
      const worldX = cameraRef.current.x + e.clientX / z2;
      const worldY = cameraRef.current.y + e.clientY / z2;
      for (const a of agentsRef.current) {
        if (Math.hypot(a.x - worldX, a.y - worldY) < 25) {
          followRef.current = a.id; setFollowAgent(a.id); setSelectedAgent({ ...a });
          addEvent(`👁️ Following ${a.name}`, a.color); return;
        }
      }
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const z2 = zoomRef.current;
      const worldX = cameraRef.current.x + e.clientX / z2;
      const worldY = cameraRef.current.y + e.clientY / z2;
      for (const a of agentsRef.current) { if (Math.hypot(a.x - worldX, a.y - worldY) < 20) { setContextMenu({ x: e.clientX, y: e.clientY, agent: { ...a } }); return; } }
      for (const b of buildingsRef.current) { if (worldX >= b.x && worldX <= b.x + b.w * TILE && worldY >= b.y && worldY <= b.y + b.h * TILE) { setContextMenu({ x: e.clientX, y: e.clientY, building: b }); return; } }
      setContextMenu(null);
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);
    canvas.addEventListener("contextmenu", onContextMenu);

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
        dragRef.current.lastX = e.touches[0].clientX; dragRef.current.lastY = e.touches[0].clientY; dragRef.current.moved = true;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoomRef.current = Math.max(0.2, Math.min(4, zoomRef.current + (dist - lastTouchDist) * 0.005));
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
      canvas.removeEventListener("dblclick", onDblClick);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) { keysRef.current.add(key); e.preventDefault(); }
      if (key === "escape") {
        if (followRef.current !== null) { followRef.current = null; setFollowAgent(null); }
        else if (selectedBuilding || selectedAgent) { setSelectedBuilding(null); setSelectedAgent(null); }
        else navigate("/");
      }
      if (key === " ") { e.preventDefault(); simSpeedRef.current = simSpeedRef.current === 0 ? 1 : 0; setSimSpeed(simSpeedRef.current as 0|1|2); }
      if (key === "f" && !e.ctrlKey) { simSpeedRef.current = simSpeedRef.current === 2 ? 1 : 2; setSimSpeed(simSpeedRef.current as 0|1|2); }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [navigate, selectedBuilding, selectedAgent]);

  const handleZoom = (d: number) => { const nz = Math.max(0.2, Math.min(4, zoomRef.current + d)); zoomRef.current = nz; setZoom(nz); };
  const navigateToAgent = (agentId: number) => {
    const a = agentsRef.current.find(ag => ag.id === agentId);
    if (!a || !canvasRef.current) return;
    cameraTargetRef.current = { x: a.x - canvasRef.current.width / zoomRef.current / 2, y: a.y - canvasRef.current.height / zoomRef.current / 2 };
    setSelectedAgent({ ...a });
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD — Top Left */}
      <div className="absolute top-3 sm:top-5 left-3 sm:left-5 z-10 flex items-center gap-2 flex-wrap max-w-[calc(100%-5rem)]">
        <button onClick={() => navigate("/")} className="glass-card p-2 hover:bg-card/80 transition-all duration-200 hover:scale-105">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="glass-card px-3 py-2 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-display font-bold tracking-wider text-primary">MEEET STATE</span>
        </div>
        <div className="glass-card px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="text-xs font-display font-semibold">{agentCount} AGENTS</span>
        </div>
        <div className="glass-card px-2.5 py-1.5 flex items-center gap-1.5">
          {timeLabel === "Night" || timeLabel === "Dusk" ? <Moon className="w-3 h-3 text-indigo-300" /> : <Sun className="w-3 h-3 text-amber-400" />}
          <span className="text-[10px] font-body text-muted-foreground">{timeLabel}</span>
        </div>
        {weather !== "clear" && (
          <div className="glass-card px-2.5 py-1.5 flex items-center gap-1.5">
            <Cloud className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-body text-muted-foreground capitalize">{weather}</span>
          </div>
        )}
      </div>

      {/* HUD — Top Right — Token Price */}
      <div className="absolute top-3 sm:top-5 right-3 sm:right-5 z-10">
        <div className="glass-card px-4 py-2.5 flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-body">$MEEET</span>
          <span className="text-sm font-display font-bold">$0.0042</span>
          <span className="text-[10px] text-secondary font-body hidden sm:inline">+12.4%</span>
        </div>
      </div>

      {/* Zoom + Speed — Left center */}
      <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        <button onClick={() => handleZoom(0.25)} className="glass-card p-2 hover:bg-card/80 hover:scale-105 transition-all"><ZoomIn className="w-4 h-4 text-foreground" /></button>
        <div className="glass-card px-2 py-1 text-center"><span className="text-[10px] font-body text-muted-foreground">{Math.round(zoom * 100)}%</span></div>
        <button onClick={() => handleZoom(-0.25)} className="glass-card p-2 hover:bg-card/80 hover:scale-105 transition-all"><ZoomOut className="w-4 h-4 text-foreground" /></button>
        <div className="w-full h-px bg-border/30 my-1" />
        <button onClick={() => { simSpeedRef.current = simSpeedRef.current === 0 ? 1 : 0; setSimSpeed(simSpeedRef.current as 0|1|2); }} className="glass-card p-2 hover:bg-card/80 transition-all">
          {simSpeed === 0 ? <Play className="w-4 h-4 text-foreground" /> : <Pause className="w-4 h-4 text-foreground" />}
        </button>
        <button onClick={() => { simSpeedRef.current = simSpeedRef.current === 2 ? 1 : 2; setSimSpeed(simSpeedRef.current as 0|1|2); }} className={`glass-card p-2 hover:bg-card/80 transition-all ${simSpeed === 2 ? 'ring-1 ring-secondary/50' : ''}`}>
          <FastForward className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Follow indicator */}
      {followAgent !== null && (
        <div className="absolute top-14 sm:top-[72px] left-1/2 -translate-x-1/2 z-20 glass-card px-5 py-2.5 flex items-center gap-2.5 animate-fade-in">
          <Crosshair className="w-4 h-4 text-secondary animate-pulse" />
          <span className="text-xs font-display font-semibold text-secondary">Following {agentsRef.current.find(a => a.id === followAgent)?.name ?? 'agent'}</span>
          <button onClick={() => { followRef.current = null; setFollowAgent(null); }} className="ml-2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Events panel */}
      {showChat && (
        <div className="absolute top-14 sm:top-[72px] right-3 sm:right-5 bottom-14 sm:bottom-5 w-60 sm:w-72 z-10 flex flex-col max-h-[calc(100vh-6rem)]">
          <div className="glass-card flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <span className="text-[10px] font-display uppercase tracking-[0.15em] text-muted-foreground">Live Events</span>
              <button onClick={() => setShowChat(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              {events.map(ev => (
                <div key={ev.id} className="text-[11px] font-body px-2.5 py-2 rounded-lg bg-muted/20 animate-fade-in border border-white/[0.03]">
                  <span className="text-muted-foreground/60 mr-1.5 text-[9px]">{ev.time}</span>
                  <span style={{ color: ev.color }}>{ev.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!showChat && <button onClick={() => setShowChat(true)} className="absolute top-[72px] right-5 z-10 glass-card p-2 hover:bg-card/80"><Eye className="w-4 h-4 text-foreground" /></button>}

      {/* Building inspector */}
      {selectedBuilding && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 glass-card p-4 w-[calc(100%-2rem)] sm:w-80 max-w-80 animate-fade-in border border-white/[0.06]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{selectedBuilding.icon}</div>
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: selectedBuilding.accent }}>{selectedBuilding.name}</h3>
                <p className="text-[10px] text-muted-foreground font-body">Built by {selectedBuilding.owner}</p>
              </div>
            </div>
            <button onClick={() => setSelectedBuilding(null)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <p className="text-xs text-muted-foreground font-body mb-3">{selectedBuilding.description}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card px-2 py-2 text-center"><p className="text-[9px] text-muted-foreground">Visitors</p><p className="text-xs font-display font-semibold" style={{ color: selectedBuilding.accent }}>{selectedBuilding.visitors}</p></div>
            <div className="glass-card px-2 py-2 text-center"><p className="text-[9px] text-muted-foreground">Income/d</p><p className="text-xs font-display font-semibold text-amber-400">{selectedBuilding.income} $M</p></div>
            <div className="glass-card px-2 py-2 text-center"><p className="text-[9px] text-muted-foreground">Size</p><p className="text-xs font-display font-semibold text-muted-foreground">{selectedBuilding.w}×{selectedBuilding.h}</p></div>
          </div>
        </div>
      )}

      {/* Agent inspector */}
      {selectedAgent && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 glass-card p-4 w-[calc(100%-2rem)] sm:w-80 max-w-80 animate-fade-in border border-white/[0.06]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedAgent.color + "18", border: `2px solid ${selectedAgent.color}30` }}>
                <span className="text-lg">{CLASS_CONFIG[selectedAgent.cls]?.icon || "⚔️"}</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: selectedAgent.color }}>{selectedAgent.name}</h3>
                <p className="text-[10px] text-muted-foreground font-body">{selectedAgent.cls} · Lv.{selectedAgent.level}</p>
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1"><span>HP</span><span>{selectedAgent.hp}/{selectedAgent.maxHp}</span></div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(selectedAgent.hp / selectedAgent.maxHp) * 100}%`, backgroundColor: selectedAgent.hp / selectedAgent.maxHp > 0.5 ? "#22c55e" : selectedAgent.hp / selectedAgent.maxHp > 0.25 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card px-2 py-2 text-center"><p className="text-[9px] text-muted-foreground">Balance</p><p className="text-xs font-display font-semibold text-amber-400">{selectedAgent.balance}</p></div>
            <div className="glass-card px-2 py-2 text-center"><p className="text-[9px] text-muted-foreground">Reputation</p><p className="text-xs font-display font-semibold text-secondary">{selectedAgent.reputation}</p></div>
            <div className="glass-card px-2 py-2 text-center"><p className="text-[9px] text-muted-foreground">State</p><p className="text-xs font-display font-semibold capitalize" style={{ color: selectedAgent.color }}>{selectedAgent.state}</p></div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-body">
            {selectedAgent.linked && <span className="glass-card px-2 py-0.5 text-amber-400">👑 Linked</span>}
            {selectedAgent.reputation > 700 && <span className="glass-card px-2 py-0.5 text-amber-400">⭐ Elite</span>}
            {selectedAgent.level >= 20 && <span className="glass-card px-2 py-0.5 text-primary">🏆 Veteran</span>}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="absolute z-30 glass-card py-1.5 w-48 animate-scale-in border border-white/[0.06]" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={() => setContextMenu(null)}>
          {contextMenu.agent && (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-display font-bold" style={{ color: contextMenu.agent.color }}>{contextMenu.agent.name}</p>
                <p className="text-[9px] text-muted-foreground">{contextMenu.agent.cls} · Lv.{contextMenu.agent.level}</p>
              </div>
              <button className="w-full text-left px-3 py-2 text-[10px] font-body text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2" onClick={() => { setSelectedAgent({ ...contextMenu.agent! }); setContextMenu(null); }}><Eye className="w-3 h-3" /> Inspect</button>
              <button className="w-full text-left px-3 py-2 text-[10px] font-body text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2" onClick={() => { followRef.current = contextMenu.agent!.id; setFollowAgent(contextMenu.agent!.id); setSelectedAgent({ ...contextMenu.agent! }); addEvent(`👁️ Following ${contextMenu.agent!.name}`, contextMenu.agent!.color); setContextMenu(null); }}><Crosshair className="w-3 h-3" /> Follow</button>
              <button className="w-full text-left px-3 py-2 text-[10px] font-body text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2" onClick={() => { navigateToAgent(contextMenu.agent!.id); setContextMenu(null); }}><MapPin className="w-3 h-3" /> Navigate</button>
            </>
          )}
          {contextMenu.building && (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-display font-bold" style={{ color: contextMenu.building.accent }}>{contextMenu.building.icon} {contextMenu.building.name}</p>
              </div>
              <button className="w-full text-left px-3 py-2 text-[10px] font-body text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2" onClick={() => { setSelectedBuilding(contextMenu.building!); setContextMenu(null); }}><Eye className="w-3 h-3" /> Inspect</button>
              <button className="w-full text-left px-3 py-2 text-[10px] font-body text-foreground hover:bg-muted/40 transition-colors flex items-center gap-2" onClick={() => { const b = contextMenu.building!; cameraTargetRef.current = { x: b.x + b.w * TILE / 2 - window.innerWidth / zoomRef.current / 2, y: b.y + b.h * TILE / 2 - window.innerHeight / zoomRef.current / 2 }; setContextMenu(null); }}><MapPin className="w-3 h-3" /> Center</button>
            </>
          )}
        </div>
      )}

      {/* Directory */}
      {showDirectory && (
        <div className="absolute top-14 sm:top-[72px] left-3 sm:left-5 bottom-14 sm:bottom-16 w-60 sm:w-64 z-10 glass-card flex flex-col overflow-hidden border border-white/[0.06]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-[10px] font-display uppercase tracking-[0.15em] text-muted-foreground">Directory</span>
            <button onClick={() => setShowDirectory(false)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-hide">
            {buildingsRef.current.map(b => (
              <button key={b.id} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2.5" onClick={() => { cameraTargetRef.current = { x: b.x + (b.w * TILE) / 2 - window.innerWidth / zoomRef.current / 2, y: b.y + (b.h * TILE) / 2 - window.innerHeight / zoomRef.current / 2 }; setSelectedBuilding(b); setShowDirectory(false); }}>
                <span className="text-base">{b.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-display font-semibold truncate" style={{ color: b.accent }}>{b.name}</p>
                  <p className="text-[9px] text-muted-foreground font-body truncate">{b.description.slice(0, 40)}…</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 z-10 flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowDirectory(!showDirectory)} className="glass-card px-3 py-1.5 text-[10px] text-muted-foreground font-body hover:text-foreground transition-colors flex items-center gap-1.5">
          <Compass className="w-3 h-3" /> {buildingsRef.current.length} Structures
        </button>
        <button onClick={() => setShowSearch(!showSearch)} className="glass-card px-3 py-1.5 text-[10px] text-muted-foreground font-body hover:text-foreground transition-colors flex items-center gap-1.5">
          <Search className="w-3 h-3" /> Find Agent
        </button>
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-[280px] scrollbar-hide">
          {CLASSES.filter(c => c !== "president").map(cls => (
            <button key={cls} onClick={() => setClassFilter(classFilter === cls ? null : cls)} className={`glass-card px-2 py-0.5 text-[9px] font-body transition-colors ${classFilter === cls ? 'ring-1 ring-secondary/60 text-foreground' : 'text-muted-foreground hover:text-foreground'}`} style={classFilter === cls ? { color: CLASS_CONFIG[cls]?.color } : undefined}>
              {cls.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={() => setShowFps(!showFps)} className="glass-card px-2 py-1 text-[9px] text-muted-foreground font-body hover:text-foreground transition-colors flex items-center gap-1">
          <Activity className="w-3 h-3" />{showFps && <span>{fps} FPS</span>}
        </button>
        <span className="text-[9px] text-muted-foreground/50 font-body glass-card px-3 py-1.5 hidden lg:inline-block">WASD — move · Scroll — zoom · Dbl-click — follow</span>
      </div>

      {/* FPS overlay */}
      {showFps && (
        <div className="absolute bottom-14 right-5 z-10 glass-card px-3 py-1.5 text-[10px] font-body text-muted-foreground">
          <span className={fps < 30 ? 'text-destructive' : fps < 50 ? 'text-amber-400' : 'text-secondary'}>{fps} FPS</span>
          <span className="mx-1.5">·</span><span>{agentsRef.current.length} agents</span>
          <span className="mx-1.5">·</span><span>{particlesRef.current.length} particles</span>
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="absolute bottom-14 left-3 sm:left-5 z-20 glass-card p-3 w-60 sm:w-64 animate-fade-in border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-xs font-body text-foreground outline-none placeholder:text-muted-foreground/50" autoFocus />
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {CLASSES.filter(c => c !== "president").map(cls => (
              <button key={cls} onClick={() => setClassFilter(classFilter === cls ? null : cls)} className={`px-1.5 py-0.5 rounded text-[9px] font-body transition-colors ${classFilter === cls ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} style={classFilter === cls ? { color: CLASS_CONFIG[cls]?.color } : undefined}>{cls}</button>
            ))}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5 scrollbar-hide">
            {agentsRef.current
              .filter(a => {
                const matchesSearch = searchQuery.length === 0 || a.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesClass = !classFilter || a.cls === classFilter;
                return matchesSearch && matchesClass && (searchQuery.length > 0 || classFilter);
              }).slice(0, 15).map(a => (
                <button key={a.id} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2" onClick={() => { navigateToAgent(a.id); setShowSearch(false); setSearchQuery(""); setClassFilter(null); }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-[11px] font-display font-semibold" style={{ color: a.color }}>{a.name}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{a.cls} Lv.{a.level}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;
