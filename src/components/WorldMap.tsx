import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import WorldMapCanvas from "./WorldMapCanvas";
import WorldMapTopBar from "./world/WorldMapTopBar";
import WorldMapLeftSidebar from "./world/WorldMapLeftSidebar";
import WorldMapRightPanel from "./world/WorldMapRightPanel";
import WorldMapFilterBar from "./world/WorldMapFilterBar";
import WorldMapNotifications from "./world/WorldMapNotifications";
import WorldMapEventFeed from "./world/WorldMapEventFeed";

// ── Class colors ──
const CLASS_COLORS: Record<string, string> = {
  warrior: "#ef4444",
  trader: "#22c55e",
  oracle: "#eab308",
  diplomat: "#f59e0b",
  miner: "#3b82f6",
  banker: "#a855f7",
  president: "#fbbf24",
  builder: "#06b6d4",
  hacker: "#ec4899",
  scout: "#10b981",
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

// ── Dark geopolitical style ──
const MAP_STYLE: maplibregl.StyleSpecification = {
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
      attribution: "&copy; CARTO",
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
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
      paint: {
        "raster-brightness-max": 0.28,
        "raster-brightness-min": 0.02,
        "raster-contrast": 0.35,
        "raster-saturation": -0.8,
      },
    },
    {
      id: "country-fill", type: "fill", source: "country-borders",
      paint: { "fill-color": "#0E1525", "fill-opacity": 0.6 },
    },
    {
      id: "country-borders-line", type: "line", source: "country-borders",
      paint: {
        "line-color": "#1E2D4A",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 3, 1, 6, 1.8],
      },
    },
    {
      id: "country-borders-glow", type: "line", source: "country-borders",
      paint: {
        "line-color": "rgba(30, 45, 74, 0.4)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 2, 6, 5],
        "line-blur": 4,
      },
    },
    {
      id: "labels", type: "raster", source: "carto-labels",
      minzoom: 3,
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4.5, 0.5, 6, 0.7],
        "raster-brightness-max": 0.4,
        "raster-saturation": -0.6,
      },
    },
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

// ── Minimal CSS ──
const MARKER_CSS = `
.maplibregl-popup-content {
  background: rgba(10,14,26,0.95) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important; padding: 14px !important;
  color: #e2e8f0 !important; font-size: 13px !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6) !important;
}
.maplibregl-popup-tip { border-top-color: rgba(10,14,26,0.95) !important; }
.maplibregl-popup-close-button { color: #94a3b8 !important; font-size: 18px !important; }
.maplibregl-ctrl-attrib { display: none !important; }
.maplibregl-ctrl-group {
  background: rgba(10,14,26,0.8) !important; backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 8px !important;
}
.maplibregl-ctrl-group button { background: transparent !important; }
`;

export { CLASS_COLORS, CLASS_ICONS };

const WorldMap = ({ height = "100vh", interactive = true, showSidebar = false, onEventClick, myAgent }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Inject CSS
  useEffect(() => {
    const id = "wm-v3-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = MARKER_CSS;
    document.head.appendChild(style);
  }, []);

  // Valid agents with coordinates
  const validAgents = useMemo(() => {
    return agents.filter(a => a.lat != null && a.lng != null && a.lat !== 0 && a.lng !== 0);
  }, [agents]);

  // Filtered agents for display
  const visibleAgents = useMemo(() => {
    return validAgents.filter(a => {
      if (activeFilter === "all") return true;
      if (activeFilter === "allies") return false;
      return a.class === activeFilter;
    });
  }, [validAgents, activeFilter]);

  // Dominant class per country for territory coloring
  const countryClassColors = useMemo(() => {
    const countryAgents: Record<string, Record<string, number>> = {};
    validAgents.forEach(a => {
      if (!a.nation_code) return;
      if (!countryAgents[a.nation_code]) countryAgents[a.nation_code] = {};
      countryAgents[a.nation_code][a.class] = (countryAgents[a.nation_code][a.class] || 0) + 1;
    });
    const result: Record<string, string> = {};
    Object.entries(countryAgents).forEach(([code, classes]) => {
      const dominant = Object.entries(classes).sort((a, b) => b[1] - a[1])[0];
      if (dominant) result[code] = CLASS_COLORS[dominant[0]] || "#9945FF";
    });
    return result;
  }, [validAgents]);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .not("lat", "is", null).not("lng", "is", null).limit(800);
    if (data) setAgents(data as Agent[]);
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("world_events").select("*")
      .order("created_at", { ascending: false }).limit(50);
    if (data) setEvents(data);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const container = mapContainer.current;
    const map = new maplibregl.Map({
      container, style: MAP_STYLE,
      center: [30, 20], zoom: 2.2, maxZoom: 10, minZoom: 1.5,
      interactive, pitchWithRotate: false, dragRotate: false,
    });
    requestAnimationFrame(() => map.resize());
    const delayResize = setTimeout(() => { if (mapRef.current === map) map.resize(); }, 300);
    const ro = new ResizeObserver(() => { if (map && !(map as any)._removed) map.resize(); });
    ro.observe(container);
    map.on("load", () => { map.resize(); setMapLoaded(true); });
    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => { clearTimeout(delayResize); ro.disconnect(); map.remove(); mapRef.current = null; setMapLoaded(false); };
  }, [interactive]);

  // Apply territory coloring
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const entries = Object.entries(countryClassColors);
    if (entries.length > 0) {
      const matchExpr: any[] = ["match", ["get", "ADMIN"]];
      entries.forEach(([code, color]) => { matchExpr.push(code, color + "20"); });
      matchExpr.push("#0E1525");
      const borderMatch: any[] = ["match", ["get", "ADMIN"]];
      entries.forEach(([code, color]) => { borderMatch.push(code, color + "60"); });
      borderMatch.push("#1E2D4A");
      try {
        map.setPaintProperty("country-fill", "fill-color", matchExpr);
        map.setPaintProperty("country-borders-line", "line-color", borderMatch);
      } catch { /* layers not ready */ }
    }
  }, [countryClassColors, mapLoaded]);

  // GeoJSON source + clustering layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: visibleAgents.map(a => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
        properties: {
          id: a.id,
          name: a.name,
          class: a.class,
          level: a.level,
          color: CLASS_COLORS[a.class] || "#9945FF",
          reputation: a.reputation,
          balance_meeet: a.balance_meeet,
          status: a.status,
        },
      })),
    };

    if (map.getSource("agents-source")) {
      (map.getSource("agents-source") as maplibregl.GeoJSONSource).setData(geojson);
      return;
    }

    map.addSource("agents-source", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 8,
    });

    // Cluster circles — warm glow like city lights at night
    map.addLayer({
      id: "agent-clusters",
      type: "circle",
      source: "agents-source",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "#f59e0b", 10,    // amber for small clusters
          "#ef4444", 30,    // red for medium
          "#dc2626", 100,   // deeper red for large
          "#fbbf24",        // gold for huge
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          12, 10,
          18, 30,
          24, 100,
          32,
        ],
        "circle-opacity": 0.75,
        "circle-blur": 0.4,
      },
    });

    // Cluster glow (larger, more transparent)
    map.addLayer({
      id: "agent-clusters-glow",
      type: "circle",
      source: "agents-source",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "#f59e0b", 10,
          "#ef4444", 30,
          "#dc2626", 100,
          "#fbbf24",
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          20, 10,
          30, 30,
          40, 100,
          55,
        ],
        "circle-opacity": 0.15,
        "circle-blur": 1,
      },
    });

    // Cluster count labels
    map.addLayer({
      id: "agent-cluster-count",
      type: "symbol",
      source: "agents-source",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold"],
        "text-size": 12,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // Individual agent dots — small colored circles
    map.addLayer({
      id: "agent-dots",
      type: "circle",
      source: "agents-source",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          1, 3,
          4, 4,
          6, 6,
          8, 8,
        ],
        "circle-opacity": 0.85,
        "circle-stroke-width": 1,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.4,
      },
    });

    // Individual dot glow
    map.addLayer({
      id: "agent-dots-glow",
      type: "circle",
      source: "agents-source",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          1, 8,
          4, 10,
          6, 14,
          8, 18,
        ],
        "circle-opacity": 0.1,
        "circle-blur": 1,
      },
    });

    // Agent name labels — only at zoom 5+
    map.addLayer({
      id: "agent-names",
      type: "symbol",
      source: "agents-source",
      filter: ["!", ["has", "point_count"]],
      minzoom: 5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 10,
        "text-offset": [0, 1.4],
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": "#cbd5e1",
        "text-halo-color": "rgba(8,12,20,0.8)",
        "text-halo-width": 1.5,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 6, 0.8],
      },
    });

    // ── Interactivity ──

    // Hover tooltip
    map.on("mouseenter", "agent-dots", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "agent-dots", () => {
      map.getCanvas().style.cursor = "";
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    });

    map.on("mousemove", "agent-dots", (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties!;
      const coords = (f.geometry as any).coordinates.slice() as [number, number];
      const color = props.color || "#9945FF";
      const isOnline = props.status === "active" || props.status === "trading" || props.status === "exploring" || props.status === "in_combat";

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: "200px" })
        .setLngLat(coords)
        .setHTML(`
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></div>
            <div>
              <div style="font-weight:600;font-size:13px">${props.name}</div>
              <div style="font-size:11px;color:${color};text-transform:capitalize">${props.class} · Lv.${props.level}</div>
            </div>
            <div style="margin-left:auto;width:6px;height:6px;border-radius:50%;background:${isOnline ? '#10b981' : '#64748b'}"></div>
          </div>
        `)
        .addTo(map);
    });

    // Click → agent card
    map.on("click", "agent-dots", (e) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties!;
      const agent = visibleAgents.find(a => a.id === props.id);
      if (agent) {
        setSelectedAgent(agent);
        setRightPanelOpen(true);
      }
    });

    // Click cluster → zoom in
    map.on("click", "agent-clusters", (e) => {
      if (!e.features || e.features.length === 0) return;
      const coords = (e.features[0].geometry as any).coordinates;
      map.flyTo({ center: coords, zoom: map.getZoom() + 2, duration: 600 });
    });

    map.on("mouseenter", "agent-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "agent-clusters", () => { map.getCanvas().style.cursor = ""; });

  }, [visibleAgents, mapLoaded]);

  // Fetch data
  useEffect(() => {
    fetchAgents(); fetchEvents();
    const iv = setInterval(() => { fetchAgents(); fetchEvents(); }, 30000);
    return () => clearInterval(iv);
  }, [fetchAgents, fetchEvents]);

  // Realtime
  useEffect(() => {
    let at: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase.channel("wm-agents-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        if (at) clearTimeout(at); at = setTimeout(fetchAgents, 2000);
      }).subscribe();
    return () => { if (at) clearTimeout(at); supabase.removeChannel(ch); };
  }, [fetchAgents]);

  // Canvas geo data — only pass minimal data for subtle effects
  const agentGeoData = useMemo(() => {
    return visibleAgents.map(a => ({
      lng: a.lng!, lat: a.lat!,
      color: CLASS_COLORS[a.class] || "#9945FF",
      rep: a.reputation ?? 0, name: a.name, cls: a.class,
    }));
  }, [visibleAgents]);

  // Activity feed
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; text: string; icon: string; time: string }>>([]);
  useEffect(() => {
    const fetchFeed = async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at, meeet_amount")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setActivityFeed(data.map(d => {
          const icons: Record<string, string> = { duel: "⚔️", trade: "💰", quest: "📜", discovery: "💎", alliance: "🤝", deploy: "🚀", reward: "🏆" };
          const ago = getTimeAgo(d.created_at);
          return { id: d.id, text: d.title, icon: icons[d.event_type] || "🌍", time: ago };
        }));
      } else {
        setActivityFeed(agents.slice(0, 5).map((a, i) => {
          const msgs = [
            { icon: "⚔️", text: `${a.name} captured territory` },
            { icon: "🤝", text: `${a.name} formed alliance` },
            { icon: "💎", text: `+${Math.floor(Math.random() * 500)} $MEEET · ${a.name}` },
            { icon: "🌍", text: `New agent joined: ${a.name}` },
            { icon: "🏆", text: `${a.name} completed quest` },
          ];
          const m = msgs[i % msgs.length];
          return { id: a.id + i, text: m.text, icon: m.icon, time: `${(i + 1) * 3}m ago` };
        }));
      }
    };
    if (agents.length > 0) fetchFeed();
  }, [agents]);

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Subtle canvas overlay — only aurora, vignette, sonar */}
      <WorldMapCanvas
        agentGeoData={agentGeoData}
        eventGeoData={[]}
        mapRef={mapRef}
      />

      <WorldMapTopBar agentCount={validAgents.length} myAgent={myAgent} />

      {showSidebar && (
        <WorldMapLeftSidebar
          open={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          myAgent={myAgent}
        />
      )}

      <WorldMapRightPanel
        agent={selectedAgent}
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      />

      <WorldMapFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        classColors={CLASS_COLORS}
      />

      <WorldMapEventFeed events={activityFeed} />
      <WorldMapNotifications agents={validAgents} />
    </div>
  );
};

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
