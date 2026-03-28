import { useEffect, useRef, useCallback, useState, useMemo, forwardRef } from "react";
import { Link } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import WorldMapRightPanel from "./world/WorldMapRightPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";

// ── Faction definitions ──
const FACTIONS = [
  { key: "ai", label: "🤖 AI CORE", classes: ["trader", "diplomat"], color: "#3B82F6", lat: 37.5, lng: -122, region: "North America" },
  { key: "biotech", label: "🧬 BIOTECH", classes: ["oracle"], color: "#22C55E", lat: 47.4, lng: 8.5, region: "Europe" },
  { key: "energy", label: "⚡ ENERGY", classes: ["miner"], color: "#F59E0B", lat: 24.5, lng: 45, region: "Middle East" },
  { key: "space", label: "🚀 SPACE", classes: ["warrior", "scout"], color: "#06B6D4", lat: 35.7, lng: 139.7, region: "East Asia" },
  { key: "quantum", label: "⚛️ QUANTUM", classes: ["banker"], color: "#A855F7", lat: -15.8, lng: -47.9, region: "South America" },
];

export const CLASS_COLORS: Record<string, string> = {
  warrior: "#EF4444", trader: "#22C55E", oracle: "#EAB308",
  diplomat: "#F59E0B", miner: "#3B82F6", banker: "#A855F7",
  president: "#FBBF24", builder: "#06B6D4", hacker: "#EC4899", scout: "#10B981",
};

export const CLASS_ICONS: Record<string, string> = {
  warrior: "🔒", trader: "📊", scout: "🔭", diplomat: "🌐",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔬",
  miner: "🌍", banker: "💊",
};

export const EVENT_TYPES = [
  { key: "conflict", label: "Conflicts", color: "#ff3333", icon: "⚔️" },
  { key: "disaster", label: "Disasters", color: "#ff8800", icon: "🌋" },
  { key: "discovery", label: "Discoveries", color: "#33aaff", icon: "🔬" },
  { key: "diplomacy", label: "Diplomacy", color: "#33ff88", icon: "🕊️" },
  { key: "geopolitical", label: "Geopolitical", color: "#a78bfa", icon: "🌍" },
];

export interface Agent {
  id: string; name: string; class: string;
  lat: number | null; lng: number | null;
  reputation: number; balance_meeet: number;
  level: number; status: string; nation_code: string | null;
}

export interface WorldEvent {
  id: string; event_type: string; title: string;
  lat: number | null; lng: number | null;
  nation_codes: any; goldstein_scale: number | null; created_at: string;
}

interface MyAgent {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number;
  territories_held: number; status: string;
  lat: number | null; lng: number | null;
}

interface WorldMapProps {
  height?: string; interactive?: boolean; showSidebar?: boolean;
  onEventClick?: (event: WorldEvent) => void;
  myAgent?: MyAgent;
}

function classToFaction(cls: string): string {
  for (const f of FACTIONS) {
    if (f.classes.includes(cls)) return f.key;
  }
  return "ai";
}

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256, attribution: "&copy; CARTO",
    },
    "carto-labels": {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
    },
  },
  layers: [
    { id: "base", type: "raster", source: "carto-dark", paint: { "raster-brightness-max": 0.5, "raster-brightness-min": 0.06, "raster-contrast": 0.2, "raster-saturation": -0.6 } },
    { id: "labels", type: "raster", source: "carto-labels", minzoom: 4, paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0, 5, 0.4], "raster-brightness-max": 0.5, "raster-saturation": -0.5 } },
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

const POPUP_CSS = `
.maplibregl-popup-content {
  background: rgba(8,12,24,0.96) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 10px !important; padding: 14px !important;
  color: #e2e8f0 !important; font-size: 12px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important; max-width: 320px !important;
}
.maplibregl-popup-tip { border-top-color: rgba(8,12,24,0.96) !important; }
.maplibregl-popup-close-button { color: #64748b !important; font-size: 16px !important; }
.maplibregl-ctrl-attrib { display: none !important; }
.maplibregl-ctrl-group { background: rgba(8,12,24,0.85) !important; backdrop-filter: blur(12px) !important; border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 6px !important; }
.maplibregl-ctrl-group button { background: transparent !important; }
@keyframes faction-pulse { 0%,100%{opacity:0.8;transform:scale(1);}50%{opacity:1;transform:scale(1.04);} }
.faction-marker { animation: faction-pulse 3s ease-in-out infinite; cursor: pointer; transition: transform 0.15s; }
.faction-marker:hover { transform: scale(1.15) !important; z-index: 100 !important; }
@media (max-width: 767px) {
  .maplibregl-popup-content { max-width: 260px !important; padding: 10px !important; font-size: 11px !important; }
  .maplibregl-ctrl-group { display: none !important; }
  .faction-marker { animation: none; }
}
`;

const WorldMap = forwardRef<HTMLDivElement, WorldMapProps>(({ height = "100vh", interactive = true, onEventClick, myAgent }, _ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const [totalDebates, setTotalDebates] = useState(0);
  const [totalMeeet, setTotalMeeet] = useState(0);
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; text: string; icon: string; time: string }>>([]);
  const hubMarkersRef = useRef<maplibregl.Marker[]>([]);
  const lineLayerAdded = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const isMobile = useIsMobile();
  const [showMobileFactions, setShowMobileFactions] = useState(false);

  // Inject CSS
  useEffect(() => {
    const id = "wm-faction-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id; s.textContent = POPUP_CSS;
    document.head.appendChild(s);
  }, []);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .eq("status", "active").limit(800);
    if (data) setAgents(data as Agent[]);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const [disc, duels, meeet] = await Promise.all([
        supabase.from("discoveries").select("*", { count: "exact", head: true }),
        supabase.from("duels").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("agents").select("balance_meeet"),
      ]);
      setTotalDiscoveries(disc.count ?? 0);
      setTotalDebates(duels.count ?? 0);
      if (meeet.data) setTotalMeeet(meeet.data.reduce((s, a) => s + (a.balance_meeet || 0), 0));
    };
    fetchStats();
  }, []);

  // Fetch activity feed
  useEffect(() => {
    const fetchFeed = async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at")
        .order("created_at", { ascending: false }).limit(5);
      if (data?.length) {
        const icons: Record<string, string> = { duel: "⚔️", trade: "📊", quest: "📜", discovery: "🔬", alliance: "🤝", deploy: "🚀", reward: "🏆" };
        setActivityFeed(data.map(d => ({ id: d.id, text: d.title, icon: icons[d.event_type] || "📡", time: getTimeAgo(d.created_at) })));
      }
    };
    fetchFeed();
    const iv = setInterval(fetchFeed, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { fetchAgents(); const iv = setInterval(fetchAgents, 60000); return () => clearInterval(iv); }, [fetchAgents]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current, style: MAP_STYLE,
      center: isMobile ? [20, 15] : [30, 20],
      zoom: isMobile ? 1.0 : 2,
      maxZoom: 10, minZoom: isMobile ? 0.5 : 1.5,
      interactive, pitchWithRotate: false, dragRotate: false,
      touchZoomRotate: true,
    });
    requestAnimationFrame(() => map.resize());
    const ro = new ResizeObserver(() => { if (map && !(map as any)._removed) map.resize(); });
    ro.observe(mapContainer.current);
    map.on("load", () => { map.resize(); setMapLoaded(true); });
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; setMapLoaded(false); };
  }, [interactive]);

  // Faction counts
  const factionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FACTIONS.forEach(f => { counts[f.key] = 0; });
    agents.forEach(a => { const fk = classToFaction(a.class); counts[fk] = (counts[fk] || 0) + 1; });
    return counts;
  }, [agents]);

  // Top agents per faction
  const factionAgents = useMemo(() => {
    const groups: Record<string, Agent[]> = {};
    FACTIONS.forEach(f => { groups[f.key] = []; });
    agents.forEach(a => {
      const fk = classToFaction(a.class);
      if (groups[fk]) groups[fk].push(a);
    });
    // Sort by reputation, limit to 20
    for (const key of Object.keys(groups)) {
      groups[key] = groups[key].sort((a, b) => b.reputation - a.reputation).slice(0, 20);
    }
    return groups;
  }, [agents]);

  // ═══ FACTION CLUSTER MARKERS ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    hubMarkersRef.current.forEach(m => m.remove());
    hubMarkersRef.current = [];

    FACTIONS.forEach(faction => {
      const count = factionCounts[faction.key] || 0;
      const size = isMobile
        ? Math.max(66, Math.min(102, 66 + count * 0.12))
        : Math.max(60, Math.min(100, 60 + count * 0.12));

      const el = document.createElement("div");
      el.className = "faction-marker";
      el.style.cssText = `position:relative;width:${size}px;height:${size}px;`;

      // Outer glow ring
      const glow = document.createElement("div");
      glow.style.cssText = `position:absolute;inset:-${size * 0.4}px;border-radius:50%;background:radial-gradient(circle,${faction.color}20 0%,${faction.color}08 40%,transparent 70%);pointer-events:none;`;
      el.appendChild(glow);

      // Core circle
      const core = document.createElement("div");
      core.style.cssText = `
        width:100%;height:100%;border-radius:50%;
        background:radial-gradient(circle at 35% 35%,${faction.color}55 0%,${faction.color}30 60%,${faction.color}10 100%);
        border:2px solid ${faction.color}90;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        box-shadow:0 0 ${size * 0.6}px ${faction.color}40, inset 0 0 ${size * 0.3}px ${faction.color}15;
      `;
      // Count number
      const num = document.createElement("div");
      num.style.cssText = `font-size:${size * 0.34}px;font-weight:800;color:#fff;font-family:monospace;line-height:1;text-shadow:0 0 8px ${faction.color};`;
      num.textContent = String(count);
      core.appendChild(num);
      // Label
      const lbl = document.createElement("div");
      lbl.style.cssText = `font-size:${Math.max(10, size * 0.14)}px;color:rgba(255,255,255,0.8);font-weight:700;letter-spacing:0.05em;margin-top:2px;`;
      lbl.textContent = faction.label.split(" ").slice(1).join(" ");
      core.appendChild(lbl);
      el.appendChild(core);

      // Hover popup
      el.addEventListener("mouseenter", () => {
        if (popupRef.current) popupRef.current.remove();
        const topAgents = factionAgents[faction.key]?.slice(0, 5) || [];
        const agentList = topAgents.map(a => `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#e2e8f0">${a.name}</span><span style="color:${faction.color}">Lv${a.level}</span></div>`).join("");
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: size / 2 + 10, maxWidth: "280px" })
          .setLngLat([faction.lng, faction.lat])
          .setHTML(`
            <div>
              <div style="font-weight:800;font-size:14px;margin-bottom:4px;color:${faction.color}">${faction.label}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">${faction.region} · ${count} agents</div>
              <div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Top Agents</div>
              <div style="font-size:11px">${agentList || '<span style="color:#475569">No agents yet</span>'}</div>
            </div>
          `)
          .addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      });

      // Click → show faction detail panel with full agent list
      el.addEventListener("click", () => {
        if (popupRef.current) popupRef.current.remove();
        const allAgents = factionAgents[faction.key] || [];
        const agentRows = allAgents.map(a => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <div style="width:6px;height:6px;border-radius:50%;background:${faction.color};box-shadow:0 0 4px ${faction.color}80;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div>
              <div style="font-size:10px;color:#64748b">Lv${a.level} · Rep ${a.reputation.toLocaleString()} · ${a.balance_meeet.toLocaleString()} $MEEET</div>
            </div>
          </div>
        `).join("");
        popupRef.current = new maplibregl.Popup({ closeButton: true, offset: size / 2 + 10, maxWidth: "360px" })
          .setLngLat([faction.lng, faction.lat])
          .setHTML(`
            <div>
              <div style="font-weight:800;font-size:16px;margin-bottom:2px;color:${faction.color}">${faction.label}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">${faction.region} · ${count} active agents</div>
              <div style="max-height:250px;overflow-y:auto">${agentRows}</div>
            </div>
          `)
          .addTo(map);
        map.flyTo({ center: [faction.lng, faction.lat], zoom: 4, duration: 800 });
      });

      // Scatter small agent dots around the faction center
      const agentDots = factionAgents[faction.key] || [];
      agentDots.forEach((agent, i) => {
        const angle = (i / agentDots.length) * Math.PI * 2 + (i * 0.618);
        const radius = 2 + Math.random() * 4;
        const dotLat = faction.lat + Math.sin(angle) * radius * 0.7;
        const dotLng = faction.lng + Math.cos(angle) * radius;
        const dotSize = isMobile
          ? Math.max(10, Math.min(18, 10 + agent.level * 0.4))
          : Math.max(6, Math.min(12, 6 + agent.level * 0.3));

        const dotEl = document.createElement("div");
        dotEl.style.cssText = `
          width:${dotSize}px;height:${dotSize}px;border-radius:50%;cursor:pointer;
          background:${faction.color}80;border:1px solid ${faction.color}aa;
          box-shadow:0 0 ${agent.level > 15 ? 8 : 3}px ${faction.color}50;
          transition:transform 0.15s;
        `;
        dotEl.addEventListener("mouseenter", () => { dotEl.style.transform = "scale(2)"; });
        dotEl.addEventListener("mouseleave", () => { dotEl.style.transform = "scale(1)"; });
        dotEl.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedAgent(agent);
          setRightPanelOpen(true);
        });
        // Tooltip
        dotEl.title = `${agent.name} · Lv${agent.level}`;

        const m = new maplibregl.Marker({ element: dotEl, anchor: "center" })
          .setLngLat([dotLng, dotLat]).addTo(map);
        hubMarkersRef.current.push(m);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([faction.lng, faction.lat]).addTo(map);
      hubMarkersRef.current.push(marker);
    });

    // ═══ Connection lines between factions ═══
    if (!lineLayerAdded.current) {
      const lines: GeoJSON.Feature[] = [];
      for (let i = 0; i < FACTIONS.length; i++) {
        for (let j = i + 1; j < FACTIONS.length; j++) {
          const a = FACTIONS[i], b = FACTIONS[j];
          lines.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
            properties: { colorA: a.color, label: `${a.label.split(" ")[1]} ↔ ${b.label.split(" ")[1]}` },
          });
        }
      }

      if (!map.getSource("faction-lines")) {
        map.addSource("faction-lines", {
          type: "geojson",
          data: { type: "FeatureCollection", features: lines },
        });
        map.addLayer({
          id: "faction-line-layer", type: "line", source: "faction-lines",
          paint: {
            "line-color": "rgba(153,69,255,0.15)",
            "line-width": 1,
            "line-dasharray": [4, 6],
          },
        });
        lineLayerAdded.current = true;
      }
    }
  }, [factionCounts, factionAgents, mapLoaded]);

  // Faction leaderboard (sorted by count)
  const factionLeaderboard = useMemo(() => {
    return [...FACTIONS].sort((a, b) => (factionCounts[b.key] || 0) - (factionCounts[a.key] || 0));
  }, [factionCounts]);

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* ═══ TOP LEFT: Title + Live ═══ */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06] text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06]`}>
            <span className="font-bold text-xs md:text-sm text-white tracking-wide">MEEET <span style={{ color: "#9945FF" }}>WORLD</span></span>
            <span className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
            </div>
            {!isMobile && (
              <>
                <span className="w-px h-4 bg-white/[0.08]" />
                <span className="text-sm font-bold text-emerald-400">{agents.length}</span>
                <span className="text-[11px] text-slate-500">Active Agents</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TOP RIGHT: Activity feed ═══ */}
      {!isMobile && activityFeed.length > 0 && (
        <div className="absolute top-3 right-3 z-20 pointer-events-auto">
          <div className="w-56 rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06] overflow-hidden">
            <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Live Feed</span>
            </div>
            {activityFeed.slice(0, 5).map((ev, i) => (
              <div key={ev.id} className="px-3 py-2 border-b border-white/[0.02] last:border-b-0" style={{ opacity: 1 - i * 0.12 }}>
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] shrink-0">{ev.icon}</span>
                  <div>
                    <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{ev.text}</p>
                    <span className="text-[8px] text-slate-600">{ev.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BOTTOM LEFT: Faction leaderboard (desktop) / toggle button (mobile) ═══ */}
      {isMobile ? (
        <>
          <button
            onClick={() => setShowMobileFactions(!showMobileFactions)}
            className="absolute bottom-16 left-3 z-20 pointer-events-auto px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.92)] backdrop-blur-xl border border-white/[0.06] text-[10px] font-semibold text-slate-300 active:scale-95 transition-transform"
          >
            {showMobileFactions ? "✕ Close" : "🏆 Factions"}
          </button>
          {showMobileFactions && (
            <div className="absolute bottom-28 left-3 z-20 pointer-events-auto">
              <div className="rounded-lg bg-[rgba(8,12,24,0.95)] backdrop-blur-xl border border-white/[0.06] px-3 py-2.5 w-44">
                <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Faction Ranking</div>
                {factionLeaderboard.map((f, i) => (
                  <div key={f.key} className="flex items-center gap-2 py-1">
                    <span className="text-[10px] text-slate-600 w-3 text-right font-mono">{i + 1}</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color, boxShadow: `0 0 4px ${f.color}60` }} />
                    <span className="text-[10px] text-slate-300 flex-1">{f.label.split(" ").slice(1).join(" ")}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: f.color }}>{factionCounts[f.key] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute bottom-6 left-3 z-20 pointer-events-auto">
          <div className="rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06] px-3 py-2.5 w-48">
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Faction Ranking</div>
            {factionLeaderboard.map((f, i) => (
              <div key={f.key} className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-slate-600 w-3 text-right font-mono">{i + 1}</span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color, boxShadow: `0 0 4px ${f.color}60` }} />
                <span className="text-[10px] text-slate-300 flex-1">{f.label.split(" ").slice(1).join(" ")}</span>
                <span className="text-[10px] font-bold font-mono" style={{ color: f.color }}>{factionCounts[f.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ BOTTOM CENTER: Global stats ═══ */}
      <div className={`absolute ${isMobile ? 'bottom-3 left-3 right-3' : 'bottom-6 left-1/2 -translate-x-1/2'} z-20 pointer-events-auto`}>
        <div className={`flex items-center ${isMobile ? 'gap-2 px-3 py-2 justify-between' : 'gap-4 px-5 py-2.5'} rounded-lg bg-[rgba(8,12,24,0.9)] backdrop-blur-xl border border-white/[0.06] text-[10px] md:text-[11px]`}>
          <span>
            <span className="text-blue-400 font-bold">🔬 {totalDiscoveries.toLocaleString()}</span>
            {!isMobile && <span className="text-slate-500 ml-1">Discoveries</span>}
          </span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>
            <span className="text-red-400 font-bold">⚔️ {totalDebates.toLocaleString()}</span>
            {!isMobile && <span className="text-slate-500 ml-1">Debates</span>}
          </span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span>
            <span className="text-amber-400 font-bold">💰 {(totalMeeet / 1000000).toFixed(1)}M</span>
            {!isMobile && <span className="text-slate-500 ml-1">$MEEET</span>}
          </span>
          {isMobile && (
            <>
              <span className="w-px h-3 bg-white/[0.06]" />
              <span className="text-emerald-400 font-bold">{agents.length} 🤖</span>
            </>
          )}
        </div>
      </div>

      {/* Agent detail panel */}
      <WorldMapRightPanel
        agent={selectedAgent}
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      />
    </div>
  );
});

WorldMap.displayName = "WorldMap";

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default WorldMap;
