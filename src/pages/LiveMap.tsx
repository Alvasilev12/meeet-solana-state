import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, ZoomIn, ZoomOut, Eye, Moon, Sun, Search, Crosshair, FastForward, Play, Pause, Activity, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";

// ─── Types ──────────────────────────────────────────────────────
interface Agent {
  id: number; x: number; y: number; dir: number; speed: number;
  name: string; cls: string; color: string; phase: number;
  state: "move" | "meeting" | "idle" | "trading" | "combat" | "visiting";
  stateTimer: number; meetingPartner: number | null;
  balance: number; level: number; hp: number; maxHp: number;
  targetBuilding: number | null;
}
interface Building {
  id: number; x: number; y: number; type: string; name: string;
  color: string; w: number; h: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; type: string; }
interface FloatingText { x: number; y: number; text: string; color: string; life: number; vy: number; }
interface Ripple { x: number; y: number; radius: number; maxRadius: number; color: string; life: number; }
interface DataStream { x1: number; y1: number; x2: number; y2: number; color: string; progress: number; speed: number; }
interface Road { x1: number; y1: number; x2: number; y2: number; }
interface GameEvent { id: number; text: string; time: string; color: string; }

// ─── Constants ──────────────────────────────────────────────────
const TILE = 32;
const MAP_W = 200;
const MAP_H = 140;
const DAY_CYCLE_MS = 180000; // 3 min full cycle

const CLASS_CONFIG: Record<string, { color: string; speed: number; glow: string }> = {
  warrior:   { color: "#ff3b3b", speed: 1.4, glow: "255,59,59" },
  trader:    { color: "#00ff88", speed: 1.0, glow: "0,255,136" },
  scout:     { color: "#ffcc00", speed: 0.8, glow: "255,204,0" },
  diplomat:  { color: "#ffd700", speed: 0.6, glow: "255,215,0" },
  builder:   { color: "#00aaff", speed: 0.7, glow: "0,170,255" },
  hacker:    { color: "#aa44ff", speed: 0.9, glow: "170,68,255" },
  president: { color: "#ffd700", speed: 0.5, glow: "255,215,0" },
};

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

// ─── Dark Atmospheric Terrain Colors ────────────────────────────
// 0=deep ocean, 1=shallow water, 2=shore, 3=lowland, 4=grassland, 5=forest, 6=mountain, 7=peak
const TERRAIN_DAY = [
  "#060e1f", "#0a1a35", "#1a2a1a", "#0f2010", "#0d1c0d", "#081508", "#1a1a1a", "#2a2a30",
];
const TERRAIN_NIGHT = [
  "#020810", "#050f1f", "#0a150a", "#060e06", "#050c05", "#030a03", "#101010", "#181820",
];

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab2 = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab2 + (bb - ab2) * t);
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
      const dx = (x - cx) / (MAP_W * 0.42);
      const dy = (y - cy) / (MAP_H * 0.38);
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      const coastNoise = fbm(x * 0.03, y * 0.03, seed + 13) * 0.2;
      const islandFactor = 1 - distFromCenter - coastNoise;
      const dx2 = (x - cx * 0.5) / (MAP_W * 0.2), dy2 = (y - cy * 0.7) / (MAP_H * 0.2);
      const island2 = 1 - Math.sqrt(dx2 * dx2 + dy2 * dy2) - coastNoise * 0.8;
      const dx3 = (x - cx * 1.4) / (MAP_W * 0.15), dy3 = (y - cy * 0.5) / (MAP_H * 0.18);
      const island3 = 1 - Math.sqrt(dx3 * dx3 + dy3 * dy3) - coastNoise * 0.7;
      const landValue = Math.max(islandFactor, island2, island3);
      const adj = elevation * 0.6 + landValue * 0.5;
      if (adj < 0.15) tiles[y][x] = 0;
      else if (adj < 0.28) tiles[y][x] = 1;
      else if (adj < 0.32) tiles[y][x] = 2;
      else if (adj < 0.44) tiles[y][x] = moisture > 0.55 ? 4 : 3;
      else if (adj < 0.55) tiles[y][x] = 5;
      else if (adj < 0.68) tiles[y][x] = 6;
      else tiles[y][x] = 7;
    }
  }
  return tiles;
}

// ─── Buildings — simplified for cinematic look ──────────────────
const BUILDING_DEFS = [
  { type: "parliament", name: "Parliament", color: "#9945FF", w: 5, h: 4 },
  { type: "treasury", name: "Treasury", color: "#FBBF24", w: 4, h: 3 },
  { type: "arena", name: "Grand Arena", color: "#EF4444", w: 6, h: 6 },
  { type: "dex", name: "Central DEX", color: "#14F195", w: 5, h: 4 },
  { type: "bank", name: "Central Bank", color: "#00C2FF", w: 5, h: 4 },
  { type: "guild", name: "Warriors Guild", color: "#EF4444", w: 4, h: 4 },
  { type: "guild", name: "Traders Guild", color: "#14F195", w: 4, h: 4 },
  { type: "mine", name: "Crystal Mine", color: "#FBBF24", w: 3, h: 3 },
  { type: "mine", name: "Deep Mine", color: "#B45309", w: 4, h: 3 },
  { type: "oracle", name: "Oracle Tower", color: "#9945FF", w: 2, h: 5 },
  { type: "academy", name: "Academy", color: "#6366F1", w: 5, h: 4 },
  { type: "embassy", name: "Grand Embassy", color: "#34D399", w: 4, h: 3 },
  { type: "quest", name: "Quest Board", color: "#06B6D4", w: 4, h: 3 },
  { type: "gate", name: "Solana Gateway", color: "#14F195", w: 3, h: 3 },
  { type: "hospital", name: "Hospital", color: "#10B981", w: 4, h: 3 },
];

function generateBuildings(terrain: number[][]): Building[] {
  const buildings: Building[] = [];
  const placed = new Set<string>();
  let id = 0;
  for (const bt of BUILDING_DEFS) {
    let attempts = 0;
    while (attempts < 600) {
      const bx = 5 + Math.floor(noise2d(attempts * 7 + id * 13, id * 3, 99) * (MAP_W - 15));
      const by = 5 + Math.floor(noise2d(id * 5, attempts * 11 + id * 7, 77) * (MAP_H - 15));
      let ok = true;
      for (let dy = 0; dy < bt.h && ok; dy++)
        for (let dx = 0; dx < bt.w && ok; dx++) {
          const tx = bx + dx, ty = by + dy;
          if (tx >= MAP_W || ty >= MAP_H || terrain[ty][tx] <= 1 || terrain[ty][tx] >= 7 || placed.has(`${tx},${ty}`)) ok = false;
        }
      if (ok) {
        for (let dy = 0; dy < bt.h; dy++) for (let dx = 0; dx < bt.w; dx++) placed.add(`${bx + dx},${by + dy}`);
        buildings.push({ id: id++, x: bx * TILE, y: by * TILE, ...bt });
        break;
      }
      attempts++;
    }
  }
  return buildings;
}

function generateRoads(buildings: Building[]): Road[] {
  const roads: Road[] = [];
  const set = new Set<string>();
  for (let i = 0; i < buildings.length; i++) {
    const dists = buildings.map((b, j) => ({ j, d: i === j ? Infinity : Math.hypot(buildings[i].x - b.x, buildings[i].y - b.y) })).sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(3, dists.length); k++) {
      if (dists[k].d < 1200) {
        const key = [Math.min(i, dists[k].j), Math.max(i, dists[k].j)].join("-");
        if (!set.has(key)) { set.add(key); const a = buildings[i], b = buildings[dists[k].j]; roads.push({ x1: a.x + a.w * TILE / 2, y1: a.y + a.h * TILE / 2, x2: b.x + b.w * TILE / 2, y2: b.y + b.h * TILE / 2 }); }
      }
    }
  }
  return roads;
}

// ─── Event Config ───────────────────────────────────────────────
const EVENT_CFG: Record<string, { icon: string; color: string }> = {
  duel: { icon: "⚔️", color: "#EF4444" }, trade: { icon: "💰", color: "#14F195" },
  quest_complete: { icon: "📜", color: "#06B6D4" }, level_up: { icon: "🎓", color: "#6366F1" },
  alliance: { icon: "🤝", color: "#34D399" }, burn: { icon: "🔥", color: "#F97316" },
  spawn: { icon: "🆕", color: "#14F195" }, combat: { icon: "⚔️", color: "#EF4444" },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
const LiveMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [agentCount, setAgentCount] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showEvents, setShowEvents] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [zoom, setZoom] = useState(1);
  const [timeLabel, setTimeLabel] = useState("Day");
  const [simSpeed, setSimSpeed] = useState<0 | 1 | 2>(1);
  const [fps, setFps] = useState(0);
  const [showFps, setShowFps] = useState(false);
  const [followAgent, setFollowAgent] = useState<number | null>(null);
  const [tickerEvents, setTickerEvents] = useState<string[]>([]);

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
  const ripplesRef = useRef<Ripple[]>([]);
  const dataStreamsRef = useRef<DataStream[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const followRef = useRef<number | null>(null);
  const simSpeedRef = useRef<number>(1);
  const terrainCacheRef = useRef<{ canvas: HTMLCanvasElement; camX: number; camY: number; zoom: number; nf: number; w: number; h: number } | null>(null);
  const fogPatchesRef = useRef<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number }[]>([]);

  // Init fog patches
  useEffect(() => {
    const patches: typeof fogPatchesRef.current = [];
    for (let i = 0; i < 12; i++) {
      patches.push({
        x: Math.random() * MAP_W * TILE, y: Math.random() * MAP_H * TILE,
        r: 200 + Math.random() * 400, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.15,
        alpha: 0.03 + Math.random() * 0.04,
      });
    }
    fogPatchesRef.current = patches;
  }, []);

  const addEvent = useCallback((text: string, color: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setEvents(prev => [{ id: eventIdRef.current++, text, time, color }, ...prev].slice(0, 50));
    setTickerEvents(prev => [text, ...prev].slice(0, 20));
  }, []);

  const addFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({ x, y, text, color, life: 90, vy: -0.6 });
  }, []);

  const addRipple = useCallback((x: number, y: number, color: string, maxR = 60) => {
    ripplesRef.current.push({ x, y, radius: 0, maxRadius: maxR, color, life: 40 });
  }, []);

  // ─── Init agents from DB ─────────────────────────────────────
  useEffect(() => {
    const terrain = terrainRef.current;
    const init = async () => {
      const { data: dbAgents } = await supabase
        .from("agents")
        .select("id, name, class, level, balance_meeet, hp, max_hp, status, pos_x, pos_y")
        .order("created_at", { ascending: true });
      const real = dbAgents ?? [];
      const agents: Agent[] = real.map((db, i) => {
        const cls = db.class || "warrior";
        const cfg = CLASS_CONFIG[cls] || CLASS_CONFIG.warrior;
        let x = (db.pos_x || 50) * TILE, y = (db.pos_y || 50) * TILE;
        x = Math.max(TILE, Math.min(x, (MAP_W - 1) * TILE));
        y = Math.max(TILE, Math.min(y, (MAP_H - 1) * TILE));
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && terrain[ty][tx] <= 1) {
          for (let r = 1; r < 20; r++) {
            let found = false;
            for (let dy2 = -r; dy2 <= r && !found; dy2++)
              for (let dx2 = -r; dx2 <= r && !found; dx2++) {
                const nx = tx + dx2, ny = ty + dy2;
                if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && terrain[ny][nx] > 1 && terrain[ny][nx] < 7) { x = nx * TILE; y = ny * TILE; found = true; }
              }
            if (found) break;
          }
        }
        return {
          id: i, x, y, dir: Math.random() * Math.PI * 2, speed: cfg.speed,
          name: db.name, cls, color: cfg.color, phase: Math.random() * Math.PI * 2,
          state: "move" as const, stateTimer: 100 + Math.random() * 300,
          meetingPartner: null, balance: Number(db.balance_meeet) || 0,
          level: db.level || 1, hp: db.hp || 100, maxHp: db.max_hp || 100, targetBuilding: null,
        };
      });
      agentsRef.current = agents;
      setAgentCount(agents.length);
      cameraRef.current = { x: (MAP_W * TILE) / 2 - window.innerWidth / 2, y: (MAP_H * TILE) / 2 - window.innerHeight / 2 };
      addEvent("MEEET STATE — Live Intelligence Feed Online", "#14F195");
      addEvent(`${agents.length} agents across ${buildingsRef.current.length} structures`, "#00C2FF");
    };
    init();

    // Realtime
    const channel = supabase.channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
        const agents = agentsRef.current;
        if (payload.eventType === 'INSERT') {
          const db = payload.new as any;
          const cls = db.class || 'warrior';
          const cfg = CLASS_CONFIG[cls] || CLASS_CONFIG.warrior;
          let x2 = (db.pos_x || 50) * TILE, y2 = (db.pos_y || 50) * TILE;
          agents.push({
            id: agents.length, x: x2, y: y2, dir: Math.random() * Math.PI * 2, speed: cfg.speed,
            name: db.name, cls, color: cfg.color, phase: Math.random() * Math.PI * 2,
            state: 'move', stateTimer: 200, meetingPartner: null,
            balance: Number(db.balance_meeet) || 0, level: db.level || 1,
            hp: db.hp || 100, maxHp: db.max_hp || 100, targetBuilding: null,
          });
          setAgentCount(agents.length);
          addEvent(`${db.name} materialized`, cfg.color);
          addFloatingText(x2, y2, `NEW: ${db.name}`, cfg.color);
          addRipple(x2, y2, cfg.color, 80);
        } else if (payload.eventType === 'UPDATE') {
          const db = payload.new as any;
          const agent = agents.find(a => a.name === db.name);
          if (agent) {
            agent.balance = Number(db.balance_meeet) || agent.balance;
            agent.level = db.level || agent.level;
            agent.hp = db.hp ?? agent.hp;
            agent.maxHp = db.max_hp ?? agent.maxHp;
          }
        } else if (payload.eventType === 'DELETE') {
          const db = payload.old as any;
          const idx = agents.findIndex(a => a.name === db.name);
          if (idx !== -1) { addEvent(`${agents[idx].name} destroyed`, '#EF4444'); agents.splice(idx, 1); setAgentCount(agents.length); }
        }
      }).subscribe();

    // Activity feed realtime
    const feedChannel = supabase.channel("activity-feed-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        const ev = payload.new as any;
        const cfg = EVENT_CFG[ev.event_type] || { icon: "●", color: "#14F195" };
        addEvent(`${cfg.icon} ${ev.title}`, cfg.color);
        if (ev.agent_id) {
          const agent = agentsRef.current.find(a => a.name === ev.title.split(" ")[0]);
          if (agent && ev.meeet_amount) {
            addFloatingText(agent.x, agent.y - 20, `${ev.meeet_amount > 0 ? "+" : ""}${ev.meeet_amount} $MEEET`, cfg.color);
            addRipple(agent.x, agent.y, cfg.color);
          }
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(feedChannel); };
  }, [addEvent, addFloatingText, addRipple]);

  // Ambient events
  useEffect(() => {
    const interval = setInterval(() => {
      const agents = agentsRef.current;
      if (!agents.length) return;
      const a = agents[Math.floor(Math.random() * agents.length)];
      const b = agents[Math.floor(Math.random() * agents.length)];
      const templates = [
        `${a.name} scanning perimeter`, `Trade route ${a.name} → ${b.name} active`,
        `${a.name} mining resources`, `Signal intercepted: ${a.name}`,
        `${a.name} completed patrol`, `Data stream: ${a.name} ↔ ${b.name}`,
      ];
      addEvent(templates[Math.floor(Math.random() * templates.length)], "#3a5a5a");
    }, 6000);
    return () => clearInterval(interval);
  }, [addEvent]);

  // ─── Main Render Loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let raf = 0;
    let lastTime = 0;
    let frameCount = 0;
    let fpsTimer = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; terrainCacheRef.current = null; };
    resize();
    window.addEventListener("resize", resize);

    const terrain = terrainRef.current;
    const buildings = buildingsRef.current;
    const roads = roadsRef.current;

    const render = () => {
      const t = performance.now();
      const dt = t - lastTime; lastTime = t;
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer > 1000) { setFps(frameCount); frameCount = 0; fpsTimer = 0; }

      const w = canvas.width, h = canvas.height;
      const agents = agentsRef.current;
      const cam = cameraRef.current;
      const z = zoomRef.current;
      const speed = simSpeedRef.current;

      // Day/night
      const cyclePos = (t % DAY_CYCLE_MS) / DAY_CYCLE_MS;
      const nightFactor = Math.max(0, Math.min(1, Math.sin(cyclePos * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
      const nf = Math.max(0, Math.min(1, nightFactor));
      if (cyclePos < 0.15) setTimeLabel("Dawn");
      else if (cyclePos < 0.4) setTimeLabel("Day");
      else if (cyclePos < 0.55) setTimeLabel("Dusk");
      else setTimeLabel("Night");

      // Camera follow
      if (followRef.current !== null) {
        const fa = agents.find(a2 => a2.id === followRef.current);
        if (fa) cameraTargetRef.current = { x: fa.x - w / z / 2, y: fa.y - h / z / 2 };
      }
      if (cameraTargetRef.current) {
        cam.x += (cameraTargetRef.current.x - cam.x) * 0.06;
        cam.y += (cameraTargetRef.current.y - cam.y) * 0.06;
        if (Math.abs(cameraTargetRef.current.x - cam.x) < 1 && followRef.current === null) cameraTargetRef.current = null;
      } else {
        cam.x += cameraVelRef.current.x; cam.y += cameraVelRef.current.y;
        cameraVelRef.current.x *= 0.92; cameraVelRef.current.y *= 0.92;
      }

      // ─── TERRAIN (cached) ─────────────────────────────────
      const cache = terrainCacheRef.current;
      const cacheValid = cache && Math.abs(cache.camX - cam.x) < 2 && Math.abs(cache.camY - cam.y) < 2 && Math.abs(cache.zoom - z) < 0.01 && Math.abs(cache.nf - nf) < 0.02 && cache.w === w && cache.h === h;

      if (!cacheValid) {
        const offCanvas = cache?.canvas || document.createElement("canvas");
        offCanvas.width = w; offCanvas.height = h;
        const oc = offCanvas.getContext("2d")!;
        oc.fillStyle = lerpColor("#060e1f", "#020810", nf);
        oc.fillRect(0, 0, w, h);

        const ts = TILE * z;
        const startCol = Math.max(0, Math.floor(cam.x / TILE));
        const startRow = Math.max(0, Math.floor(cam.y / TILE));
        const endCol = Math.min(MAP_W, Math.ceil((cam.x + w / z) / TILE) + 1);
        const endRow = Math.min(MAP_H, Math.ceil((cam.y + h / z) / TILE) + 1);

        for (let row = startRow; row < endRow; row++) {
          for (let col = startCol; col < endCol; col++) {
            const tile = terrain[row][col];
            const sx = (col * TILE - cam.x) * z;
            const sy = (row * TILE - cam.y) * z;
            const dayC = TERRAIN_DAY[tile];
            const nightC = TERRAIN_NIGHT[tile];
            oc.fillStyle = lerpColor(dayC, nightC, nf);
            oc.fillRect(sx, sy, ts + 1, ts + 1);

            // Subtle water shimmer
            if (tile <= 1 && z > 0.3) {
              const shimmer = Math.sin(t * 0.001 + col * 0.3 + row * 0.2) * 0.03 + 0.02;
              oc.fillStyle = `rgba(20,60,120,${shimmer})`;
              oc.fillRect(sx, sy, ts + 1, ts + 1);
            }
          }
        }

        terrainCacheRef.current = { canvas: offCanvas, camX: cam.x, camY: cam.y, zoom: z, nf, w, h };
      }

      ctx.drawImage(terrainCacheRef.current!.canvas, 0, 0);

      // ─── FOG PATCHES ──────────────────────────────────────
      const fogs = fogPatchesRef.current;
      fogs.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        if (f.x < -f.r) f.x = MAP_W * TILE + f.r;
        if (f.x > MAP_W * TILE + f.r) f.x = -f.r;
        const sx = (f.x - cam.x) * z, sy = (f.y - cam.y) * z;
        const fr = f.r * z;
        if (sx > -fr && sx < w + fr && sy > -fr && sy < h + fr) {
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, fr);
          grad.addColorStop(0, `rgba(100,140,160,${f.alpha * (0.5 + nf * 0.5)})`);
          grad.addColorStop(0.6, `rgba(60,80,100,${f.alpha * 0.3})`);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(sx, sy, fr, 0, Math.PI * 2); ctx.fill();
        }
      });

      // ─── ROADS — data stream style ────────────────────────
      roads.forEach(r => {
        const sx1 = (r.x1 - cam.x) * z, sy1 = (r.y1 - cam.y) * z;
        const sx2 = (r.x2 - cam.x) * z, sy2 = (r.y2 - cam.y) * z;
        if (Math.max(sx1, sx2) < -100 || Math.min(sx1, sx2) > w + 100) return;
        if (Math.max(sy1, sy2) < -100 || Math.min(sy1, sy2) > h + 100) return;
        // Dim path line
        ctx.strokeStyle = `rgba(30,60,50,${0.2 + nf * 0.1})`;
        ctx.lineWidth = Math.max(1, 2 * z);
        ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
        // Flowing particles along road
        for (let i = 0; i < 3; i++) {
          const prog = ((t * 0.0003 + i * 0.33 + r.x1 * 0.0001) % 1);
          const px = sx1 + (sx2 - sx1) * prog;
          const py = sy1 + (sy2 - sy1) * prog;
          const alpha = 0.3 + Math.sin(t * 0.003 + i) * 0.15;
          ctx.fillStyle = `rgba(20,241,149,${alpha * 0.5})`;
          ctx.beginPath(); ctx.arc(px, py, 1.5 * z, 0, Math.PI * 2); ctx.fill();
        }
      });

      // ─── BUILDINGS — glowing nodes ────────────────────────
      buildings.forEach(b => {
        const cx2 = (b.x + b.w * TILE / 2 - cam.x) * z;
        const cy2 = (b.y + b.h * TILE / 2 - cam.y) * z;
        if (cx2 < -100 || cx2 > w + 100 || cy2 < -100 || cy2 > h + 100) return;
        const size = Math.max(4, Math.max(b.w, b.h) * TILE * z * 0.2);
        const pulse = 0.6 + Math.sin(t * 0.002 + b.id) * 0.2;

        // Large ambient glow
        const glowR = size * 5;
        const glow = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, glowR);
        glow.addColorStop(0, b.color + Math.floor(pulse * 25).toString(16).padStart(2, "0"));
        glow.addColorStop(0.3, b.color + "08");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx2, cy2, glowR, 0, Math.PI * 2); ctx.fill();

        // Core diamond
        const ds = size * 0.6;
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = b.color + Math.floor(pulse * 180).toString(16).padStart(2, "0");
        ctx.fillRect(-ds / 2, -ds / 2, ds, ds);
        ctx.restore();

        // Label
        if (z > 0.35) {
          const fs = Math.max(7, 9 * z);
          ctx.font = `500 ${fs}px 'Space Grotesk', monospace`;
          ctx.textAlign = "center";
          ctx.fillStyle = b.color + "90";
          ctx.fillText(b.name.toUpperCase(), cx2, cy2 + size + fs + 2);
        }
      });

      // ─── DATA STREAMS between interacting agents ──────────
      const streams = dataStreamsRef.current;
      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i];
        s.progress += s.speed;
        if (s.progress > 1) { streams.splice(i, 1); continue; }
        const sx1 = (s.x1 - cam.x) * z, sy1 = (s.y1 - cam.y) * z;
        const sx2 = (s.x2 - cam.x) * z, sy2 = (s.y2 - cam.y) * z;
        // Stream line
        ctx.strokeStyle = s.color + "30";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
        // Flowing dot
        const px = sx1 + (sx2 - sx1) * s.progress;
        const py = sy1 + (sy2 - sy1) * s.progress;
        const dotGlow = ctx.createRadialGradient(px, py, 0, px, py, 6 * z);
        dotGlow.addColorStop(0, s.color);
        dotGlow.addColorStop(1, "transparent");
        ctx.fillStyle = dotGlow;
        ctx.beginPath(); ctx.arc(px, py, 6 * z, 0, Math.PI * 2); ctx.fill();
      }

      // ─── CONNECTION LINES — animated data streams ─────────
      agents.forEach(a => {
        if ((a.state === "meeting" || a.state === "trading" || a.state === "combat") && a.meetingPartner !== null) {
          const other = agents.find(o => o.id === a.meetingPartner);
          if (!other || a.id > (other?.id ?? 0)) return;
          const sx1 = (a.x - cam.x) * z, sy1 = (a.y - cam.y) * z;
          const sx2 = (other.x - cam.x) * z, sy2 = (other.y - cam.y) * z;

          if (a.state === "combat") {
            // RED LIGHTNING EFFECT
            ctx.strokeStyle = `rgba(255,50,50,${0.4 + Math.sin(t * 0.02) * 0.3})`;
            ctx.lineWidth = 2 * z;
            ctx.shadowColor = "rgba(255,0,0,0.5)";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            const steps = 8;
            let lx = sx1, ly = sy1;
            ctx.moveTo(lx, ly);
            for (let s2 = 1; s2 <= steps; s2++) {
              const prog = s2 / steps;
              const tx2 = sx1 + (sx2 - sx1) * prog + (Math.random() - 0.5) * 15 * z;
              const ty2 = sy1 + (sy2 - sy1) * prog + (Math.random() - 0.5) * 15 * z;
              ctx.lineTo(tx2, ty2);
              lx = tx2; ly = ty2;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else if (a.state === "trading") {
            // GREEN DATA STREAM
            for (let p2 = 0; p2 < 5; p2++) {
              const prog = ((t * 0.002 + p2 * 0.2) % 1);
              const px = sx1 + (sx2 - sx1) * prog;
              const py = sy1 + (sy2 - sy1) * prog;
              ctx.fillStyle = `rgba(0,255,136,${0.5 - Math.abs(prog - 0.5) * 0.8})`;
              ctx.beginPath(); ctx.arc(px, py, 2 * z, 0, Math.PI * 2); ctx.fill();
            }
            ctx.strokeStyle = "rgba(0,255,136,0.08)";
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
          } else {
            // GOLDEN PULSE RINGS for diplomacy/meetings
            const midX = (sx1 + sx2) / 2, midY = (sy1 + sy2) / 2;
            const pulseR = 10 + Math.sin(t * 0.005) * 8;
            for (let ring = 0; ring < 3; ring++) {
              const rr = (pulseR + ring * 12) * z;
              ctx.strokeStyle = `rgba(255,215,0,${0.15 - ring * 0.04})`;
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.arc(midX, midY, rr, 0, Math.PI * 2); ctx.stroke();
            }
          }
        }
      });

      // ─── RIPPLE EFFECTS ───────────────────────────────────
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.radius += (rp.maxRadius - rp.radius) * 0.08;
        rp.life--;
        if (rp.life <= 0) { ripples.splice(i, 1); continue; }
        const sx = (rp.x - cam.x) * z, sy = (rp.y - cam.y) * z;
        const alpha = rp.life / 40;
        ctx.strokeStyle = rp.color + Math.floor(alpha * 100).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, rp.radius * z, 0, Math.PI * 2); ctx.stroke();
      }

      // ─── PARTICLES ────────────────────────────────────────
      const particles = particlesRef.current;

      // Rain particles
      if (Math.random() < 0.15) {
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: cam.x + Math.random() * w / z, y: cam.y - 10,
            vx: -0.2, vy: 3 + Math.random() * 2, life: 60, maxLife: 60,
            color: "#4488aa", size: 1, type: "rain",
          });
        }
      }

      // Mining particles from builder agents
      agents.forEach(a => {
        if (a.cls === "builder" && a.state === "idle" && Math.random() < 0.1) {
          particles.push({
            x: a.x + (Math.random() - 0.5) * 10, y: a.y,
            vx: (Math.random() - 0.5) * 0.5, vy: -0.3 - Math.random() * 0.5,
            life: 40 + Math.random() * 30, maxLife: 70,
            color: "#00aaff", size: 1 + Math.random(), type: "mine",
          });
        }
      });

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const sx = (p.x - cam.x) * z, sy = (p.y - cam.y) * z;
        if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
        const alpha = p.life / p.maxLife;
        if (p.type === "rain") {
          ctx.strokeStyle = `rgba(100,160,200,${alpha * 0.2})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - z, sy + 5 * z); ctx.stroke();
        } else if (p.type === "mine") {
          ctx.fillStyle = p.color + Math.floor(alpha * 150).toString(16).padStart(2, "0");
          ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, "0");
          ctx.beginPath(); ctx.arc(sx, sy, p.size * z, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (particles.length > 600) particles.splice(0, particles.length - 600);

      // ─── AGENTS — glowing orbs ────────────────────────────
      agents.forEach(a => {
        if (speed === 0) { drawOrb(ctx, a, cam, z, t, nf); return; }
        const spdMult = speed;
        a.stateTimer -= spdMult;

        // State transitions
        if (a.stateTimer <= 0) {
          if (["meeting", "combat", "trading", "visiting"].includes(a.state)) {
            // Generate interaction floating text on end
            if (a.state === "trading" && a.meetingPartner !== null) {
              const other = agents.find(o => o.id === a.meetingPartner);
              const amt = Math.floor(10 + Math.random() * 90);
              addFloatingText(a.x, a.y - 15, `Trade: +${amt} $MEEET`, "#00ff88");
              if (other) addFloatingText(other.x, other.y - 15, `Trade: +${amt} $MEEET`, "#00ff88");
              addRipple(a.x, a.y, "#00ff88", 40);
            } else if (a.state === "combat" && a.meetingPartner !== null) {
              const other = agents.find(o => o.id === a.meetingPartner);
              const winner = Math.random() > 0.5 ? a : (other || a);
              addFloatingText(winner.x, winner.y - 15, "VICTORY", "#ff3b3b");
              addRipple(a.x, a.y, "#ff3b3b", 50);
            } else if (a.state === "meeting" && a.meetingPartner !== null) {
              addFloatingText(a.x, a.y - 15, "Alliance formed", "#ffd700");
              addRipple(a.x, a.y, "#ffd700", 45);
            }
            a.state = "move"; a.stateTimer = 150 + Math.random() * 300; a.meetingPartner = null; a.targetBuilding = null;
          } else if (a.state === "idle") {
            a.state = "move"; a.stateTimer = 200 + Math.random() * 400;
          } else {
            const r2 = Math.random();
            if (r2 < 0.02) { a.state = "idle"; a.stateTimer = 60 + Math.random() * 120; }
            else if (r2 < 0.06) {
              let nearest = -1, nd = Infinity;
              for (const b of buildings) { const d = Math.hypot(a.x - (b.x + b.w * TILE / 2), a.y - (b.y + b.h * TILE / 2)); if (d < nd) { nd = d; nearest = b.id; } }
              if (nearest >= 0 && nd < 500) {
                a.state = "visiting"; a.targetBuilding = nearest; a.stateTimer = 100 + Math.random() * 150;
                const tb = buildings.find(b2 => b2.id === nearest);
                if (tb) a.dir = Math.atan2(tb.y + tb.h * TILE / 2 - a.y, tb.x + tb.w * TILE / 2 - a.x);
              } else a.stateTimer = 200 + Math.random() * 400;
            } else a.stateTimer = 200 + Math.random() * 400;
          }
        }

        // Proximity interactions
        if (a.state === "move") {
          for (const other of agents) {
            if (other.id === a.id || other.state !== "move") continue;
            if (Math.hypot(a.x - other.x, a.y - other.y) < 25) {
              const r3 = Math.random();
              if (a.cls === "warrior" && other.cls === "warrior" && r3 < 0.35) {
                a.state = "combat"; other.state = "combat"; a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 80 + Math.random() * 60;
                addRipple((a.x + other.x) / 2, (a.y + other.y) / 2, "#ff3b3b", 50);
                // Add data stream
                dataStreamsRef.current.push({ x1: a.x, y1: a.y, x2: other.x, y2: other.y, color: "#ff3b3b", progress: 0, speed: 0.02 });
              } else if ((a.cls === "trader" || other.cls === "trader") && r3 < 0.5) {
                a.state = "trading"; other.state = "trading"; a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 60 + Math.random() * 80;
                dataStreamsRef.current.push({ x1: a.x, y1: a.y, x2: other.x, y2: other.y, color: "#00ff88", progress: 0, speed: 0.015 });
              } else {
                a.state = "meeting"; other.state = "meeting"; a.meetingPartner = other.id; other.meetingPartner = a.id;
                a.stateTimer = other.stateTimer = 50 + Math.random() * 100;
                dataStreamsRef.current.push({ x1: a.x, y1: a.y, x2: other.x, y2: other.y, color: "#ffd700", progress: 0, speed: 0.01 });
              }
              break;
            }
          }
        }

        // Movement
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
            if (tt <= 1) a.dir += Math.PI / 2 + Math.random() * 0.5;
            else if (tt >= 7) a.dir += Math.PI / 3 + Math.random() * 0.3;
            else { a.x = nx; a.y = ny; }
          }
          if (a.state === "visiting" && a.targetBuilding !== null) {
            const tb = buildings.find(b2 => b2.id === a.targetBuilding);
            if (tb && Math.hypot(a.x - (tb.x + tb.w * TILE / 2), a.y - (tb.y + tb.h * TILE / 2)) < 20) {
              a.state = "idle"; a.stateTimer = 40 + Math.random() * 80;
            }
          }
        }
        drawOrb(ctx, a, cam, z, t, nf);
      });

      // ─── FLOATING TEXTS ───────────────────────────────────
      const fts = floatingTextsRef.current;
      for (let i = fts.length - 1; i >= 0; i--) {
        const ft = fts[i];
        ft.y += ft.vy; ft.life--;
        if (ft.life <= 0) { fts.splice(i, 1); continue; }
        const sx = (ft.x - cam.x) * z, sy = (ft.y - cam.y) * z;
        const alpha = Math.min(1, ft.life / 30);
        const fs = Math.max(9, 12 * z);
        ctx.font = `bold ${fs}px 'Space Grotesk', monospace`;
        ctx.textAlign = "center";
        // Glow behind text
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = ft.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fillText(ft.text, sx, sy);
        ctx.shadowBlur = 0;
      }

      // ─── ATMOSPHERIC OVERLAYS ─────────────────────────────

      // Night overlay
      if (nf > 0.3) {
        ctx.fillStyle = `rgba(3,5,15,${(nf - 0.3) * 0.15})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Fog-of-war on edges — cinematic vignette
      const vigR = Math.max(w, h) * 0.6;
      const vig = ctx.createRadialGradient(w / 2, h / 2, vigR * 0.5, w / 2, h / 2, vigR);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(0.7, `rgba(0,0,0,${0.15 + nf * 0.2})`);
      vig.addColorStop(1, `rgba(0,0,0,${0.5 + nf * 0.3})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Scanline effect — subtle CRT
      if (z > 0.5) {
        ctx.fillStyle = "rgba(0,0,0,0.03)";
        for (let sy2 = 0; sy2 < h; sy2 += 4) {
          ctx.fillRect(0, sy2, w, 1);
        }
      }

      // ─── MINIMAP ──────────────────────────────────────────
      const mmW = 140, mmH = 100;
      const mmX = w - mmW - 12, mmY = h - mmH - 50;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(mmX - 1, mmY - 1, mmW + 2, mmH + 2);
      ctx.strokeStyle = "rgba(20,241,149,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mmX - 1, mmY - 1, mmW + 2, mmH + 2);
      const mmScaleX = mmW / (MAP_W * TILE), mmScaleY = mmH / (MAP_H * TILE);
      // Simplified terrain
      for (let y2 = 0; y2 < MAP_H; y2 += 3) {
        for (let x2 = 0; x2 < MAP_W; x2 += 3) {
          const tile = terrain[y2][x2];
          ctx.fillStyle = tile <= 1 ? "rgba(6,14,31,0.8)" : tile <= 2 ? "rgba(20,40,20,0.6)" : tile <= 5 ? "rgba(15,35,15,0.6)" : "rgba(30,30,30,0.6)";
          ctx.fillRect(mmX + x2 * TILE * mmScaleX, mmY + y2 * TILE * mmScaleY, 3 * TILE * mmScaleX + 1, 3 * TILE * mmScaleY + 1);
        }
      }
      // Agent dots on minimap
      agents.forEach(a => {
        ctx.fillStyle = a.color;
        ctx.fillRect(mmX + a.x * mmScaleX - 0.5, mmY + a.y * mmScaleY - 0.5, 2, 2);
      });
      // Camera rect
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(mmX + cam.x * mmScaleX, mmY + cam.y * mmScaleY, (w / z) * mmScaleX, (h / z) * mmScaleY);

      raf = requestAnimationFrame(render);
    };
    render();

    // ─── Input handlers ─────────────────────────────────────
    const onDown = (e: MouseEvent) => { dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY, moved: false }; followRef.current = null; setFollowAgent(null); cameraTargetRef.current = null; };
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX, dy = e.clientY - dragRef.current.lastY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
        cameraRef.current.x -= dx / zoomRef.current; cameraRef.current.y -= dy / zoomRef.current;
        cameraVelRef.current = { x: -dx / zoomRef.current, y: -dy / zoomRef.current };
        dragRef.current.lastX = e.clientX; dragRef.current.lastY = e.clientY;
        terrainCacheRef.current = null;
      }
    };
    const onUp = () => { dragRef.current.dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const newZ = Math.max(0.2, Math.min(4, zoomRef.current + delta));
      const mx = e.clientX, my = e.clientY;
      const wx = cameraRef.current.x + mx / zoomRef.current;
      const wy = cameraRef.current.y + my / zoomRef.current;
      zoomRef.current = newZ;
      cameraRef.current.x = wx - mx / newZ; cameraRef.current.y = wy - my / newZ;
      setZoom(newZ);
      terrainCacheRef.current = null;
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
          addEvent(`Tracking ${a.name}`, a.color); return;
        }
      }
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);

    // Touch
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
        terrainCacheRef.current = null;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        zoomRef.current = Math.max(0.2, Math.min(4, zoomRef.current + (dist - lastTouchDist) * 0.005));
        setZoom(zoomRef.current); lastTouchDist = dist; terrainCacheRef.current = null;
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
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [addEvent, addFloatingText, addRipple]);

  // Keyboard
  useEffect(() => {
    const keysDown = new Set<string>();
    const interval = setInterval(() => {
      const speed = 8 / zoomRef.current;
      if (keysDown.has("w") || keysDown.has("arrowup")) { cameraRef.current.y -= speed; terrainCacheRef.current = null; }
      if (keysDown.has("s") || keysDown.has("arrowdown")) { cameraRef.current.y += speed; terrainCacheRef.current = null; }
      if (keysDown.has("a") || keysDown.has("arrowleft")) { cameraRef.current.x -= speed; terrainCacheRef.current = null; }
      if (keysDown.has("d") || keysDown.has("arrowright")) { cameraRef.current.x += speed; terrainCacheRef.current = null; }
    }, 16);
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) { keysDown.add(k); e.preventDefault(); }
      if (k === "escape") { if (followRef.current !== null) { followRef.current = null; setFollowAgent(null); } else navigate("/"); }
      if (k === " ") { e.preventDefault(); simSpeedRef.current = simSpeedRef.current === 0 ? 1 : 0; setSimSpeed(simSpeedRef.current as 0|1|2); }
      if (k === "f" && !e.ctrlKey) { simSpeedRef.current = simSpeedRef.current === 2 ? 1 : 2; setSimSpeed(simSpeedRef.current as 0|1|2); }
    };
    const onUp = (e: KeyboardEvent) => keysDown.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown); window.addEventListener("keyup", onUp);
    return () => { clearInterval(interval); window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [navigate]);

  const handleZoom = (d: number) => { const nz = Math.max(0.2, Math.min(4, zoomRef.current + d)); zoomRef.current = nz; setZoom(nz); terrainCacheRef.current = null; };

  return (
    <div className="fixed inset-0 bg-[#020510] overflow-hidden cursor-crosshair">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ═══ BLOOMBERG TICKER — Top ═══ */}
      <div className="absolute top-0 left-0 right-0 z-20 h-7 bg-black/70 border-b border-white/[0.06] flex items-center overflow-hidden">
        <div className="flex-shrink-0 px-3 flex items-center gap-1.5 border-r border-white/[0.06] h-full">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">LIVE</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-[scroll_60s_linear_infinite] whitespace-nowrap px-4">
            {(tickerEvents.length > 0 ? tickerEvents : ["Initializing feed...", "Waiting for agent activity..."]).map((ev, i) => (
              <span key={i} className="text-[10px] font-mono text-muted-foreground/70">
                <span className="text-primary/60 mr-1">●</span>{ev}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 px-3 flex items-center gap-3 border-l border-white/[0.06] h-full">
          <span className="text-[10px] font-mono text-muted-foreground/50">$MEEET</span>
          <span className="text-[10px] font-mono text-primary font-bold">$0.0042</span>
          <span className="text-[9px] font-mono text-emerald-400">+12.4%</span>
        </div>
      </div>

      {/* ═══ HUD — Top Left ═══ */}
      <div className="absolute top-10 left-3 z-10 flex items-center gap-2 flex-wrap max-w-[calc(100%-5rem)]">
        <button onClick={() => navigate("/")} className="bg-black/50 backdrop-blur border border-white/[0.06] rounded p-2 hover:bg-white/5 transition-all">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div className="bg-black/50 backdrop-blur border border-white/[0.06] rounded px-3 py-1.5 flex items-center gap-2">
          <Globe className="w-3 h-3 text-primary/80" />
          <span className="text-[10px] font-mono text-primary/90 tracking-wider">MEEET STATE</span>
        </div>
        <div className="bg-black/50 backdrop-blur border border-white/[0.06] rounded px-3 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-white/70">{agentCount} AGENTS</span>
        </div>
        <div className="bg-black/50 backdrop-blur border border-white/[0.06] rounded px-2.5 py-1.5 flex items-center gap-1.5">
          {timeLabel === "Night" || timeLabel === "Dusk" ? <Moon className="w-3 h-3 text-indigo-300/70" /> : <Sun className="w-3 h-3 text-amber-400/70" />}
          <span className="text-[9px] font-mono text-white/40">{timeLabel}</span>
        </div>
      </div>

      {/* ═══ Zoom + Speed — Left ═══ */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
        <button onClick={() => handleZoom(0.25)} className="bg-black/50 backdrop-blur border border-white/[0.06] rounded p-1.5 hover:bg-white/5"><ZoomIn className="w-3.5 h-3.5 text-white/50" /></button>
        <div className="bg-black/50 backdrop-blur border border-white/[0.06] rounded px-1.5 py-0.5 text-center"><span className="text-[8px] font-mono text-white/30">{Math.round(zoom * 100)}%</span></div>
        <button onClick={() => handleZoom(-0.25)} className="bg-black/50 backdrop-blur border border-white/[0.06] rounded p-1.5 hover:bg-white/5"><ZoomOut className="w-3.5 h-3.5 text-white/50" /></button>
        <div className="w-full h-px bg-white/[0.05] my-0.5" />
        <button onClick={() => { simSpeedRef.current = simSpeedRef.current === 0 ? 1 : 0; setSimSpeed(simSpeedRef.current as 0|1|2); }} className="bg-black/50 backdrop-blur border border-white/[0.06] rounded p-1.5 hover:bg-white/5">
          {simSpeed === 0 ? <Play className="w-3.5 h-3.5 text-white/50" /> : <Pause className="w-3.5 h-3.5 text-white/50" />}
        </button>
        <button onClick={() => { simSpeedRef.current = simSpeedRef.current === 2 ? 1 : 2; setSimSpeed(simSpeedRef.current as 0|1|2); }} className={`bg-black/50 backdrop-blur border rounded p-1.5 hover:bg-white/5 ${simSpeed === 2 ? 'border-primary/40' : 'border-white/[0.06]'}`}>
          <FastForward className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      {/* ═══ Follow indicator ═══ */}
      {followAgent !== null && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur border border-primary/20 rounded px-4 py-2 flex items-center gap-2 animate-fade-in">
          <Crosshair className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-[10px] font-mono text-primary">TRACKING: {agentsRef.current.find(a => a.id === followAgent)?.name ?? '...'}</span>
          <button onClick={() => { followRef.current = null; setFollowAgent(null); }}><X className="w-3 h-3 text-white/40 hover:text-white" /></button>
        </div>
      )}

      {/* ═══ EVENTS PANEL — Right ═══ */}
      {showEvents && (
        <div className="absolute top-10 right-3 bottom-14 w-64 z-10 flex flex-col max-h-[calc(100vh-5rem)]">
          <div className="bg-black/60 backdrop-blur border border-white/[0.06] rounded flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/40">INTELLIGENCE FEED</span>
              </div>
              <button onClick={() => setShowEvents(false)}><X className="w-3 h-3 text-white/30 hover:text-white/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-hide">
              {events.map(ev => (
                <div key={ev.id} className="text-[10px] font-mono px-2 py-1.5 rounded bg-white/[0.02] animate-fade-in border border-white/[0.02]">
                  <span className="text-white/20 mr-1.5 text-[8px]">{ev.time}</span>
                  <span style={{ color: ev.color + "cc" }}>{ev.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!showEvents && <button onClick={() => setShowEvents(true)} className="absolute top-10 right-3 z-10 bg-black/50 backdrop-blur border border-white/[0.06] rounded p-2 hover:bg-white/5"><Eye className="w-3.5 h-3.5 text-white/50" /></button>}

      {/* ═══ Selected Agent Inspector ═══ */}
      {selectedAgent && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur border border-white/[0.06] rounded-lg p-4 w-72 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedAgent.color + "20", boxShadow: `0 0 15px ${selectedAgent.color}30` }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedAgent.color }} />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold" style={{ color: selectedAgent.color }}>{selectedAgent.name}</h3>
                <p className="text-[9px] font-mono text-white/30">{selectedAgent.cls} · Lv.{selectedAgent.level}</p>
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)}><X className="w-3.5 h-3.5 text-white/30 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/[0.03] rounded p-2"><p className="text-[8px] font-mono text-white/30">HP</p><p className="text-[10px] font-mono text-emerald-400">{selectedAgent.hp}/{selectedAgent.maxHp}</p></div>
            <div className="bg-white/[0.03] rounded p-2"><p className="text-[8px] font-mono text-white/30">$MEEET</p><p className="text-[10px] font-mono text-amber-400">{selectedAgent.balance}</p></div>
            <div className="bg-white/[0.03] rounded p-2"><p className="text-[8px] font-mono text-white/30">STATE</p><p className="text-[10px] font-mono capitalize" style={{ color: selectedAgent.color }}>{selectedAgent.state}</p></div>
          </div>
        </div>
      )}

      {/* ═══ Selected Building ═══ */}
      {selectedBuilding && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur border border-white/[0.06] rounded-lg p-4 w-64 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono font-bold" style={{ color: selectedBuilding.color }}>{selectedBuilding.name}</h3>
            <button onClick={() => setSelectedBuilding(null)}><X className="w-3.5 h-3.5 text-white/30 hover:text-white" /></button>
          </div>
          <p className="text-[9px] font-mono text-white/30">{selectedBuilding.type} · {selectedBuilding.w}×{selectedBuilding.h}</p>
        </div>
      )}

      {/* ═══ BOTTOM BAR ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-10 bg-black/70 border-t border-white/[0.06] flex items-center px-4 gap-4">
        <div className="flex items-center gap-4 text-[9px] font-mono text-white/40">
          <span>⚔ {agentsRef.current.filter(a => a.state === "combat").length} active wars</span>
          <span className="text-white/10">|</span>
          <span>📋 {buildingsRef.current.filter(b => b.type === "quest").length} quest boards</span>
          <span className="text-white/10">|</span>
          <span>💰 {agentsRef.current.filter(a => a.state === "trading").length} trades</span>
          <span className="text-white/10">|</span>
          <span>🤝 {agentsRef.current.filter(a => a.state === "meeting").length} meetings</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowFps(!showFps)} className="text-[9px] font-mono text-white/25 hover:text-white/50 flex items-center gap-1">
          <Activity className="w-3 h-3" />{showFps && <span>{fps} FPS · {agentsRef.current.length} agents · {particlesRef.current.length} particles</span>}
        </button>
        <span className="text-[8px] font-mono text-white/15 hidden lg:inline">WASD move · Scroll zoom · Dbl-click track</span>
      </div>

      {/* Ticker animation */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

// ─── Glowing Orb Renderer ───────────────────────────────────────
function drawOrb(ctx: CanvasRenderingContext2D, a: Agent, cam: { x: number; y: number }, z: number, t: number, nf: number) {
  const sx = (a.x - cam.x) * z, sy = (a.y - cam.y) * z;
  if (sx < -50 || sx > ctx.canvas.width + 50 || sy < -50 || sy > ctx.canvas.height + 50) return;

  const cfg = CLASS_CONFIG[a.cls] || CLASS_CONFIG.warrior;
  const pulse = 0.7 + Math.sin(t * 0.004 + a.phase) * 0.3;
  const orbR = Math.max(2, 4 * z);

  // Outer glow — ambient aura
  const glowR = orbR * 6;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
  glow.addColorStop(0, `rgba(${cfg.glow},${0.15 * pulse})`);
  glow.addColorStop(0.3, `rgba(${cfg.glow},${0.05 * pulse})`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI * 2); ctx.fill();

  // Core orb
  const coreGrad = ctx.createRadialGradient(sx, sy - orbR * 0.3, orbR * 0.2, sx, sy, orbR);
  coreGrad.addColorStop(0, `rgba(255,255,255,${0.8 * pulse})`);
  coreGrad.addColorStop(0.4, a.color);
  coreGrad.addColorStop(1, a.color + "60");
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(sx, sy, orbR, 0, Math.PI * 2); ctx.fill();

  // Pulse ring on combat/trading/meeting
  if (a.state === "combat" || a.state === "trading" || a.state === "meeting") {
    const ringR = orbR * (2 + Math.sin(t * 0.008) * 0.5);
    const ringColor = a.state === "combat" ? "255,50,50" : a.state === "trading" ? "0,255,136" : "255,215,0";
    ctx.strokeStyle = `rgba(${ringColor},${0.3 + Math.sin(t * 0.01) * 0.15})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, ringR, 0, Math.PI * 2); ctx.stroke();
  }

  // Name label — only when zoomed in
  if (z > 0.5) {
    const fs = Math.max(7, 8 * z);
    ctx.font = `500 ${fs}px 'Space Grotesk', monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${cfg.glow},${0.5 + nf * 0.2})`;
    ctx.fillText(a.name, sx, sy + orbR + fs + 4);
    ctx.textAlign = "left";
  }
}

export default LiveMap;
