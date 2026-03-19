import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import WorldMapCanvas from "./WorldMapCanvas";
import WorldMapHUD from "./WorldMapHUD";
import WorldMapFilters from "./WorldMapFilters";

const CLASS_COLORS: Record<string, string> = {
  warrior: "#ef4444", trader: "#f59e0b", scout: "#10b981",
  diplomat: "#3b82f6", builder: "#8b5cf6", hacker: "#ec4899",
  president: "#ffdd00", oracle: "#ffcc44", miner: "#44ddff", banker: "#aa66ff",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "💰", scout: "🔭", diplomat: "🤝",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔮",
  miner: "⛏️", banker: "🏦",
};

export const EVENT_TYPES = [
  { key: "conflict", label: "Conflicts", color: "#ff3333", icon: "⚔️" },
  { key: "disaster", label: "Disasters", color: "#ff8800", icon: "🌋" },
  { key: "discovery", label: "Discoveries", color: "#33aaff", icon: "🔬" },
  { key: "diplomacy", label: "Diplomacy", color: "#33ff88", icon: "🕊️" },
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

interface Warning {
  id: string; title: string; description: string; type: string;
  severity: number | null; status: string | null;
  country_code: string | null; region: string;
  confirming_agents_count: number | null; created_at: string | null;
  capital_lat?: number; capital_lng?: number;
}

interface WorldMapProps {
  height?: string; interactive?: boolean; showSidebar?: boolean;
  onEventClick?: (event: WorldEvent) => void;
}

const PIXEL_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; CARTO',
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
    },
    "country-borders": {
      type: "geojson",
      data: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
    },
  },
  layers: [
    {
      id: "base", type: "raster", source: "carto-dark",
      minzoom: 0, maxzoom: 20,
      paint: {
        "raster-brightness-max": 0.35,
        "raster-brightness-min": 0.02,
        "raster-contrast": 0.3,
        "raster-saturation": -0.7,
      },
    },
    {
      id: "country-borders-line",
      type: "line",
      source: "country-borders",
      paint: {
        "line-color": "rgba(100, 140, 255, 0.12)",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          1, 0.3,
          3, 0.8,
          6, 1.5,
        ],
        "line-dasharray": [3, 2],
      },
    },
    {
      id: "country-fill",
      type: "fill",
      source: "country-borders",
      paint: {
        "fill-color": "rgba(100, 140, 255, 0.015)",
        "fill-outline-color": "transparent",
      },
    },
    {
      id: "labels", type: "raster", source: "carto-labels",
      minzoom: 3, maxzoom: 20,
      paint: {
        "raster-opacity": [
          "interpolate", ["linear"], ["zoom"],
          3, 0,
          4, 0.5,
          6, 0.75,
        ],
        "raster-brightness-max": 0.5,
        "raster-saturation": -0.5,
      },
    },
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

// CSS for pulsing warning markers
const PULSE_CSS = `
@keyframes wm-pulse {
  0% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.8); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.9; }
}
.wm-warning-pulse {
  width: 16px; height: 16px; border-radius: 50%;
  background: #ef4444; border: 2px solid #fca5a5;
  box-shadow: 0 0 12px 4px rgba(239,68,68,0.5);
  cursor: pointer; position: relative;
}
.wm-warning-pulse::after {
  content: ''; position: absolute; inset: -6px;
  border-radius: 50%; border: 2px solid #ef4444;
  animation: wm-pulse 2s ease-in-out infinite;
}
@keyframes wm-agent-breathe {
  0%, 100% { box-shadow: 0 0 6px 2px currentColor, 0 0 12px 4px currentColor; transform: scale(1); }
  50% { box-shadow: 0 0 10px 4px currentColor, 0 0 20px 8px currentColor; transform: scale(1.15); }
}
.wm-agent-dot {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.8);
  cursor: pointer; transition: transform 0.15s;
  box-shadow: 0 0 8px 2px currentColor, 0 0 16px 4px currentColor;
  animation: wm-agent-breathe 3s ease-in-out infinite;
  z-index: 10;
}
.wm-agent-dot:hover { transform: scale(1.6); z-index: 20; }
.wm-agent-dot.wm-followed {
  width: 18px; height: 18px;
  border: 2.5px solid #fff;
  box-shadow: 0 0 16px 6px currentColor, 0 0 30px 12px currentColor;
  animation: wm-pulse 1.5s ease-in-out infinite;
  z-index: 30;
}
.maplibregl-popup-content {
  background: #0d0d1a !important; border: 1px solid rgba(148,69,255,0.3) !important;
  border-radius: 12px !important; padding: 12px !important; color: #e2e8f0 !important;
  font-family: 'JetBrains Mono', monospace !important; font-size: 12px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
}
.maplibregl-popup-tip { border-top-color: #0d0d1a !important; }
.maplibregl-popup-close-button { color: #94a3b8 !important; font-size: 16px !important; }
`;

const WorldMap = ({ height = "100vh", interactive = true, showSidebar = false, onEventClick }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classFilters, setClassFilters] = useState<Set<string>>(new Set(Object.keys(CLASS_COLORS)));
  const [eventFilters, setEventFilters] = useState<Set<string>>(new Set(EVENT_TYPES.map(e => e.key)));
  const [showAgents, setShowAgents] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [followAgent, setFollowAgent] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; title: string; type: string; time: string }>>([]);
  const agentMarkersRef = useRef<maplibregl.Marker[]>([]);
  const warningMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Inject CSS once
  useEffect(() => {
    const id = "wm-marker-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = PULSE_CSS;
    document.head.appendChild(style);
  }, []);

  const agentGeoData = useMemo(() => {
    return agents.filter(a => a.lat != null && a.lng != null && showAgents && classFilters.has(a.class)).map(a => ({
      lng: a.lng!, lat: a.lat!,
      color: CLASS_COLORS[a.class] || "#9945FF",
      rep: a.reputation ?? 0, name: a.name, cls: a.class,
    }));
  }, [agents, classFilters, showAgents]);

  const eventGeoData = useMemo(() => {
    const colors: Record<string, string> = { conflict: "#ff3333", disaster: "#ff8800", discovery: "#33aaff", diplomacy: "#33ff88" };
    return events.filter(e => e.lat != null && e.lng != null && showEvents && eventFilters.has(e.event_type)).map(e => ({
      lng: e.lng!, lat: e.lat!,
      color: colors[e.event_type] || "#ff44ff", type: e.event_type,
    }));
  }, [events, eventFilters, showEvents]);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .not("lat", "is", null).not("lng", "is", null).limit(500);
    if (data) setAgents(data as Agent[]);
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("world_events").select("*")
      .order("created_at", { ascending: false }).limit(50);
    if (data) setEvents(data);
  }, []);

  const fetchWarnings = useCallback(async () => {
    const { data } = await supabase
      .from("warnings")
      .select("id, title, description, type, severity, status, country_code, region, confirming_agents_count, created_at")
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data || data.length === 0) { setWarnings([]); return; }
    const codes = [...new Set(data.filter(w => w.country_code).map(w => w.country_code!))];
    let countryMap: Record<string, { lat: number; lng: number }> = {};
    if (codes.length > 0) {
      const { data: countries } = await supabase
        .from("countries")
        .select("code, capital_lat, capital_lng")
        .in("code", codes);
      if (countries) {
        countryMap = Object.fromEntries(countries.map(c => [c.code, { lat: c.capital_lat, lng: c.capital_lng }]));
      }
    }
    setWarnings(data.map(w => ({
      ...w,
      capital_lat: w.country_code ? countryMap[w.country_code]?.lat : undefined,
      capital_lng: w.country_code ? countryMap[w.country_code]?.lng : undefined,
    })));
  }, []);

  const fetchActivity = useCallback(async () => {
    const { data } = await supabase
      .from("activity_feed").select("id, title, event_type, created_at")
      .order("created_at", { ascending: false }).limit(8);
    if (data) setRecentActivity(data.map(d => ({
      id: d.id, title: d.title, type: d.event_type,
      time: new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })));
  }, []);

  // Fly to agent by name
  const handleSearchAgent = useCallback((name: string) => {
    const agent = agents.find(a => a.name.toLowerCase().includes(name.toLowerCase()) && a.lat != null && a.lng != null);
    if (agent && mapRef.current) {
      setFollowAgent(agent.name);
      mapRef.current.flyTo({ center: [agent.lng!, agent.lat!], zoom: 6, duration: 2000 });
    }
  }, [agents]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const container = mapContainer.current;
    const map = new maplibregl.Map({
      container, style: PIXEL_STYLE,
      center: [30, 20], zoom: 2.2, maxZoom: 10, minZoom: 1.5,
      interactive, pitchWithRotate: false, dragRotate: false,
    });
    requestAnimationFrame(() => map.resize());
    const delayedResize = window.setTimeout(() => { if (mapRef.current === map) map.resize(); }, 300);
    const ro = new ResizeObserver(() => { if (map && !(map as any)._removed) map.resize(); });
    ro.observe(container);
    map.on("load", () => { map.resize(); setMapLoaded(true); });
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "bottom-right");
    mapRef.current = map;
    return () => { clearTimeout(delayedResize); ro.disconnect(); map.remove(); mapRef.current = null; setMapLoaded(false); };
  }, [interactive]);

  // Fetch data
  useEffect(() => {
    fetchAgents(); fetchEvents(); fetchWarnings(); fetchActivity();
    const iv = setInterval(() => { fetchAgents(); fetchEvents(); fetchWarnings(); fetchActivity(); }, 30000);
    return () => clearInterval(iv);
  }, [fetchAgents, fetchEvents, fetchWarnings, fetchActivity]);

  // Realtime
  useEffect(() => {
    let at: ReturnType<typeof setTimeout> | null = null;
    let et: ReturnType<typeof setTimeout> | null = null;
    const ch1 = supabase.channel("wm-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        if (at) clearTimeout(at); at = setTimeout(fetchAgents, 2000);
      }).subscribe();
    const ch2 = supabase.channel("wm-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "world_events" }, () => {
        if (et) clearTimeout(et); et = setTimeout(fetchEvents, 2000);
      }).subscribe();
    return () => {
      if (at) clearTimeout(at); if (et) clearTimeout(et);
      supabase.removeChannel(ch1); supabase.removeChannel(ch2);
    };
  }, [fetchAgents, fetchEvents]);

  // Agent markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    agentMarkersRef.current.forEach(m => m.remove());
    agentMarkersRef.current = [];

    const visibleAgents = agents.filter(a => a.lat != null && a.lng != null && showAgents && classFilters.has(a.class));

    visibleAgents.forEach(agent => {
      const color = CLASS_COLORS[agent.class] || "#9945FF";
      const isFollowed = followAgent === agent.name;

      // Container with dot + label
      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;z-index:10;position:relative;";

      const dot = document.createElement("div");
      dot.className = `wm-agent-dot${isFollowed ? " wm-followed" : ""}`;
      dot.style.backgroundColor = color;
      dot.style.color = color;
      el.appendChild(dot);

      // Name label
      const label = document.createElement("div");
      label.textContent = agent.name;
      label.style.cssText = `font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:${color};text-shadow:0 0 6px ${color},0 0 2px #000,0 1px 3px #000;white-space:nowrap;pointer-events:none;opacity:0.9;letter-spacing:0.5px;`;
      el.appendChild(label);

      const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: "260px" })
        .setHTML(`
          <div style="font-family: 'JetBrains Mono', monospace;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:24px">${CLASS_ICONS[agent.class] || "🤖"}</span>
              <div>
                <div style="font-weight:700;font-size:14px;color:#e2e8f0">${agent.name}</div>
                <div style="font-size:11px;color:${color};text-transform:capitalize">${agent.class} · Lv.${agent.level}</div>
              </div>
              <div style="margin-left:auto;width:8px;height:8px;border-radius:50%;background:${agent.status === 'active' ? '#10b981' : '#f59e0b'};box-shadow:0 0 6px ${agent.status === 'active' ? '#10b981' : '#f59e0b'}"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:#94a3b8">
              <div style="background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.05)">⭐ Rep: <span style="color:#e2e8f0;font-weight:700">${agent.reputation}</span></div>
              <div style="background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.05)">💰 <span style="color:#14F195;font-weight:700">${Number(agent.balance_meeet).toLocaleString()}</span></div>
              <div style="background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.05)">📍 ${agent.nation_code || "—"}</div>
              <div style="background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);color:${agent.status === 'active' ? '#10b981' : '#f59e0b'}">${agent.status}</div>
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([agent.lng!, agent.lat!])
        .setPopup(popup)
        .addTo(map);

      dot.addEventListener("click", () => {
        setFollowAgent(prev => prev === agent.name ? null : agent.name);
      });

      agentMarkersRef.current.push(marker);
    });
  }, [agents, mapLoaded, showAgents, classFilters, followAgent]);

  // Warning markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    warningMarkersRef.current.forEach(m => m.remove());
    warningMarkersRef.current = [];

    const geoWarnings = warnings.filter(w => w.capital_lat != null && w.capital_lng != null);

    geoWarnings.forEach(w => {
      const el = document.createElement("div");
      el.className = "wm-warning-pulse";

      const severityLabel = w.severity != null
        ? (w.severity >= 8 ? "🔴 Critical" : w.severity >= 5 ? "🟠 High" : "🟡 Medium")
        : "⚪ Unknown";

      const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: "260px" })
        .setHTML(`
          <div style="font-family: 'JetBrains Mono', monospace;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
              <span style="font-size:18px">⚠️</span>
              <div style="font-weight:700;font-size:12px;color:#fca5a5">${w.title}</div>
            </div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;line-height:1.5;background:rgba(239,68,68,0.05);padding:6px;border-radius:4px;border-left:2px solid rgba(239,68,68,0.3)">
              ${w.description.slice(0, 140)}${w.description.length > 140 ? "…" : ""}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;color:#94a3b8">
              <div style="background:rgba(255,255,255,0.03);padding:4px 6px;border-radius:4px">Type: <span style="color:#e2e8f0">${w.type}</span></div>
              <div style="background:rgba(255,255,255,0.03);padding:4px 6px;border-radius:4px">Sev: <span style="color:#fca5a5">${severityLabel}</span></div>
              <div style="background:rgba(255,255,255,0.03);padding:4px 6px;border-radius:4px">📍 ${w.region}</div>
              <div style="background:rgba(255,255,255,0.03);padding:4px 6px;border-radius:4px">✅ ${w.confirming_agents_count ?? 0} confirmed</div>
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([w.capital_lng!, w.capital_lat!])
        .setPopup(popup)
        .addTo(map);

      // Click to zoom
      el.addEventListener("click", () => {
        map.flyTo({ center: [w.capital_lng!, w.capital_lat!], zoom: 5, duration: 1500 });
      });

      warningMarkersRef.current.push(marker);
    });
  }, [warnings, mapLoaded]);

  // Follow agent camera tracking
  useEffect(() => {
    if (!followAgent || !mapRef.current) return;
    const agent = agents.find(a => a.name === followAgent && a.lat != null && a.lng != null);
    if (agent) {
      mapRef.current.flyTo({ center: [agent.lng!, agent.lat!], zoom: Math.max(mapRef.current.getZoom(), 4), duration: 1500 });
    }
  }, [followAgent, agents]);

  const toggleClass = (cls: string) => setClassFilters(p => { const n = new Set(p); n.has(cls) ? n.delete(cls) : n.add(cls); return n; });
  const toggleEventType = (t: string) => setEventFilters(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Canvas pixel art overlay */}
      <WorldMapCanvas
        agentGeoData={agentGeoData}
        eventGeoData={eventGeoData}
        mapRef={mapRef}
        followAgentName={followAgent}
      />

      {/* Atmospheric edges */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12cc] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0a0a12cc] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0a0a12cc] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a0a12cc] to-transparent pointer-events-none" />

      {/* HUD */}
      <WorldMapHUD
        agentCount={agents.length}
        eventCount={events.filter(e => showEvents && eventFilters.has(e.event_type)).length}
        warningCount={warnings.length}
        recentActivity={recentActivity}
        onSearchAgent={handleSearchAgent}
        onClearFollow={() => setFollowAgent(null)}
        followingAgent={followAgent}
      />

      {/* Filters */}
      <WorldMapFilters
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        showAgents={showAgents}
        setShowAgents={setShowAgents}
        showEvents={showEvents}
        setShowEvents={setShowEvents}
        classFilters={classFilters}
        toggleClass={toggleClass}
        eventFilters={eventFilters}
        toggleEventType={toggleEventType}
        classColors={CLASS_COLORS}
      />
    </div>
  );
};

export default WorldMap;
