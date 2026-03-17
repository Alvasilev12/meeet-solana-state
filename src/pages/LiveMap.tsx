import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";

interface Agent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  cls: string;
  color: string;
  size: number;
  phase: number;
  linked: boolean;
  inMeeting: boolean;
  meetingPartner: number | null;
  targetX: number | null;
  targetY: number | null;
  idle: number;
}

interface GameEvent {
  id: number;
  text: string;
  time: string;
  color: string;
}

const CLASS_COLORS: Record<string, string> = {
  Warrior: "#EF4444",
  Trader: "#14F195",
  Guardian: "#00C2FF",
  Scientist: "#9945FF",
  Miner: "#FBBF24",
  Diplomat: "#34D399",
};

const CLASSES = Object.keys(CLASS_COLORS);
const NAMES = [
  "alpha_x", "neo_sol", "dark_phi", "vex_01", "kai_net", "sol_prime", "zyx_42",
  "bit_sage", "hex_nova", "arc_flux", "ion_drift", "pix_core", "syn_wave",
  "orb_node", "dev_null", "max_hash", "luna_ai", "bolt_run", "zen_ops", "ray_cast",
  "fog_byte", "nix_jet", "cog_spin", "elm_root", "vim_echo", "rust_link", "go_shard",
  "npm_blitz", "git_flow", "api_star", "tcp_ping", "udp_flare", "dns_hop", "ssh_key",
  "log_scan", "ram_blk", "gpu_boost", "cpu_tick", "ssd_warp", "eth_gate",
];

const TILE_SIZE = 32;
const MAP_W = 80;
const MAP_H = 50;

const generateTerrain = () => {
  const tiles: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const n = Math.sin(x * 0.1) * Math.cos(y * 0.12) + Math.sin(x * 0.05 + y * 0.07);
      if (n > 0.8) tiles[y][x] = 3; // mountain
      else if (n > 0.3) tiles[y][x] = 2; // forest
      else if (n < -0.7) tiles[y][x] = 1; // water
      else tiles[y][x] = 0; // grass
    }
  }
  return tiles;
};

const TILE_COLORS = ["#1a2e1a", "#0f2f1a", "#1a3a2a", "#2a2a2a"];
const TILE_BORDERS = ["#243824", "#1a3f24", "#244a34", "#3a3a3a"];

const LiveMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [agentCount, setAgentCount] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showChat, setShowChat] = useState(true);
  const agentsRef = useRef<Agent[]>([]);
  const terrainRef = useRef<number[][]>(generateTerrain());
  const cameraRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const eventIdRef = useRef(0);

  const addEvent = useCallback((text: string, color: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setEvents((prev) => [{ id: eventIdRef.current++, text, time, color }, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    const count = 40 + Math.floor(Math.random() * 20);
    const agents: Agent[] = Array.from({ length: count }, (_, i) => {
      const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
      return {
        id: i,
        x: Math.random() * MAP_W * TILE_SIZE,
        y: Math.random() * MAP_H * TILE_SIZE,
        vx: 0, vy: 0,
        name: NAMES[i % NAMES.length],
        cls,
        color: CLASS_COLORS[cls],
        size: 8,
        phase: Math.random() * Math.PI * 2,
        linked: Math.random() > 0.7,
        inMeeting: false,
        meetingPartner: null,
        targetX: null, targetY: null,
        idle: 0,
      };
    });
    agentsRef.current = agents;
    setAgentCount(count);

    // Center camera
    cameraRef.current = {
      x: (MAP_W * TILE_SIZE) / 2 - window.innerWidth / 2,
      y: (MAP_H * TILE_SIZE) / 2 - window.innerHeight / 2,
    };

    // Initial events
    addEvent("🌐 Map loaded — welcome to MEEET State", "#14F195");
    addEvent(`👥 ${count} agents online`, "#00C2FF");
  }, [addEvent]);

  // Random events
  useEffect(() => {
    const interval = setInterval(() => {
      const agents = agentsRef.current;
      if (!agents.length) return;
      const a = agents[Math.floor(Math.random() * agents.length)];
      const eventTypes = [
        { text: `⚔️ ${a.name} conquered territory [${Math.floor(a.x / TILE_SIZE)},${Math.floor(a.y / TILE_SIZE)}]`, color: "#EF4444" },
        { text: `💰 ${a.name} traded 42 $MEEET`, color: "#14F195" },
        { text: `🏗️ ${a.name} built a structure`, color: "#FBBF24" },
        { text: `🤝 ${a.name} formed an alliance`, color: "#00C2FF" },
        { text: `📜 ${a.name} completed a quest`, color: "#9945FF" },
        { text: `🔥 ${a.name} burned 100 $MEEET`, color: "#F97316" },
      ];
      const ev = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      addEvent(ev.text, ev.color);
    }, 3000);
    return () => clearInterval(interval);
  }, [addEvent]);

  // Main render loop
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
      const w = canvas.width;
      const h = canvas.height;
      const cam = cameraRef.current;
      const terrain = terrainRef.current;
      const agents = agentsRef.current;
      const t = Date.now();

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // Draw terrain
      const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE));
      const endCol = Math.min(MAP_W, Math.ceil((cam.x + w) / TILE_SIZE));
      const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE));
      const endRow = Math.min(MAP_H, Math.ceil((cam.y + h) / TILE_SIZE));

      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const sx = col * TILE_SIZE - cam.x;
          const sy = row * TILE_SIZE - cam.y;
          const tile = terrain[row][col];
          ctx.fillStyle = TILE_COLORS[tile];
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = TILE_BORDERS[tile];
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }

      // Update & draw agents
      agents.forEach((a) => {
        // AI movement
        a.idle--;
        if (a.idle <= 0) {
          a.targetX = Math.random() * MAP_W * TILE_SIZE;
          a.targetY = Math.random() * MAP_H * TILE_SIZE;
          a.idle = 200 + Math.random() * 400;
        }
        if (a.targetX !== null && a.targetY !== null) {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            a.vx = (dx / dist) * 0.6;
            a.vy = (dy / dist) * 0.6;
          } else {
            a.vx = 0; a.vy = 0;
            a.targetX = null; a.targetY = null;
          }
        }
        a.x += a.vx;
        a.y += a.vy;
        a.x = Math.max(0, Math.min(MAP_W * TILE_SIZE, a.x));
        a.y = Math.max(0, Math.min(MAP_H * TILE_SIZE, a.y));

        const sx = a.x - cam.x;
        const sy = a.y - cam.y;
        if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) return;

        // Meeting aura
        if (a.inMeeting) {
          const auraGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 25);
          auraGrad.addColorStop(0, "rgba(251,191,36,0.35)");
          auraGrad.addColorStop(1, "transparent");
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(sx, sy, 25, 0, Math.PI * 2);
          ctx.fill();
        }

        // Agent glow
        const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
        glowGrad.addColorStop(0, a.color + "30");
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 20, 0, Math.PI * 2);
        ctx.fill();

        // Body (pixel style)
        ctx.fillStyle = a.color;
        ctx.fillRect(sx - 4, sy - 9, 8, 10);
        // Head
        ctx.fillRect(sx - 3, sy - 14, 6, 6);
        // Walking legs
        const legOffset = Math.sin(t * 0.012 + a.phase) * 3;
        ctx.fillRect(sx - 3, sy + 1, 3, 4 + (a.vx !== 0 || a.vy !== 0 ? legOffset : 0));
        ctx.fillRect(sx, sy + 1, 3, 4 - (a.vx !== 0 || a.vy !== 0 ? legOffset : 0));

        // Linked gold dot
        if (a.linked) {
          ctx.fillStyle = "#FBBF24";
          ctx.fillRect(sx - 2, sy - 18, 4, 4);
        }

        // Name tag
        ctx.font = "7px 'Space Grotesk', monospace";
        const nameW = ctx.measureText(a.name).width;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(sx - nameW / 2 - 2, sy - 24, nameW + 4, 10);
        ctx.fillStyle = a.color;
        ctx.fillText(a.name, sx - nameW / 2, sy - 16);
      });

      raf = requestAnimationFrame(render);
    };

    render();

    // Mouse drag
    const onDown = (e: MouseEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      cameraRef.current.x -= e.clientX - dragRef.current.lastX;
      cameraRef.current.y -= e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onUp = () => { dragRef.current.dragging = false; };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ESC to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD top-left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="glass-card p-2 hover:bg-card/80 transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="glass-card px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="text-sm font-display font-semibold">{agentCount} AGENTS ONLINE</span>
        </div>
      </div>

      {/* HUD top-right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="glass-card px-4 py-2 flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-body">$MEEET</span>
          <span className="text-sm font-display font-semibold">$0.0042</span>
          <span className="text-xs text-secondary font-body">+12.4%</span>
        </div>
      </div>

      {/* Event feed right */}
      {showChat && (
        <div className="absolute top-20 right-4 bottom-4 w-72 z-10 flex flex-col">
          <div className="glass-card flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">Live Events</span>
              <button onClick={() => setShowChat(false)}>
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
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

      {/* ESC hint */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs text-muted-foreground font-body glass-card px-3 py-1.5">
          ESC — back to home · Drag to pan
        </span>
      </div>
    </div>
  );
};

export default LiveMap;
