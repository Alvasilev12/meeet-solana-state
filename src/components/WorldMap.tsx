import { useEffect, useRef, useCallback, useState, useMemo, forwardRef } from "react";
import { Link } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import { RESEARCH_HUBS, HUB_STATS, type ResearchHub } from "@/data/research-hubs";
import WorldMapCanvas from "./WorldMapCanvas";
import WorldMapEventFeed from "./world/WorldMapEventFeed";
import WorldMapRightPanel from "./world/WorldMapRightPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronUp, ArrowLeft, Home } from "lucide-react";

// ── Strict color palette ──
const TYPE_COLORS: Record<string, string> = {
  medical: "#EF4444",
  climate: "#22C55E",
  space: "#A855F7",
  quantum: "#06B6D4",
  ai: "#F59E0B",
  education: "#F59E0B",
  economics: "#F97316",
  security: "#6B7280",
};

const CLASS_COLORS: Record<string, string> = {
  warrior: "#EF4444", trader: "#22C55E", oracle: "#EAB308",
  diplomat: "#F59E0B", miner: "#3B82F6", banker: "#A855F7",
  president: "#FBBF24", builder: "#06B6D4", hacker: "#EC4899", scout: "#10B981",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "🔒", trader: "📊", scout: "🔭", diplomat: "🌐",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔬",
  miner: "🌍", banker: "💊",
};

export { CLASS_COLORS, CLASS_ICONS };

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

const TYPE_LABELS: { key: string; label: string; color?: string }[] = [
  { key: "all", label: "All" },
  { key: "medical", label: "Medical", color: "#EF4444" },
  { key: "climate", label: "Climate", color: "#22C55E" },
  { key: "space", label: "Space", color: "#A855F7" },
  { key: "quantum", label: "Quantum", color: "#06B6D4" },
  { key: "ai", label: "AI", color: "#F59E0B" },
  { key: "economics", label: "Econ", color: "#F97316" },
];

// Dark map style with labels at zoom levels
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
      paint: { "raster-brightness-max": 0.25, "raster-brightness-min": 0.02, "raster-contrast": 0.3, "raster-saturation": -0.85 },
    },
    {
      id: "country-fill", type: "fill", source: "country-borders",
      paint: { "fill-color": "#0B1120", "fill-opacity": 0.5 },
    },
    {
      id: "country-borders-line", type: "line", source: "country-borders",
      paint: { "line-color": "#1A2744", "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 3, 0.8, 6, 1.2] },
    },
    {
      id: "labels", type: "raster", source: "carto-labels",
      minzoom: 3,
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4, 0.3, 6, 0.5],
        "raster-brightness-max": 0.3, "raster-saturation": -0.7,
      },
    },
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
  box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
  max-width: 300px !important;
}
.maplibregl-popup-tip { border-top-color: rgba(8,12,24,0.96) !important; }
.maplibregl-popup-close-button { color: #64748b !important; font-size: 16px !important; }
.maplibregl-ctrl-attrib { display: none !important; }
.maplibregl-ctrl-group {
  background: rgba(8,12,24,0.85) !important; backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 6px !important;
}
.maplibregl-ctrl-group button { background: transparent !important; }
@keyframes hub-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
.hub-marker { cursor: pointer; transition: transform 0.15s ease-out; }
.hub-marker:hover { transform: scale(1.15) !important; }
.hub-marker--active { animation: hub-pulse 2.5s ease-in-out infinite; }
`;

const EVENT_COLORS: Record<string, string> = {
  conflict: "#ff3333", disaster: "#ff8800", discovery: "#33aaff",
  diplomacy: "#33ff88", geopolitical: "#a78bfa",
};
const EVENT_ICONS: Record<string, string> = {
  conflict: "⚔️", disaster: "🌋", discovery: "🔬",
  diplomacy: "🕊️", geopolitical: "🌍",
};

const WorldMap = forwardRef<HTMLDivElement, WorldMapProps>(({ height = "100vh", interactive = true, showSidebar = false, onEventClick, myAgent }, _ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedExpanded, setFeedExpanded] = useState(false);
  const hubMarkersRef = useRef<maplibregl.Marker[]>([]);
  const eventMarkersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const isMobile = useIsMobile();

  // Inject CSS
  useEffect(() => {
    const id = "wm-v5-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id; style.textContent = POPUP_CSS;
    document.head.appendChild(style);
  }, []);

  const filteredHubs = useMemo(() => {
    let hubs = RESEARCH_HUBS;
    if (typeFilter !== "all") hubs = hubs.filter(h => h.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      hubs = hubs.filter(h => h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q));
    }
    return hubs;
  }, [typeFilter, searchQuery]);

  const validAgents = useMemo(() => agents.filter(a => a.lat != null && a.lng != null && a.lat !== 0 && a.lng !== 0), [agents]);

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .not("lat", "is", null).not("lng", "is", null).limit(800);
    if (data) setAgents(data as Agent[]);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const container = mapContainer.current;
    const map = new maplibregl.Map({
      container, style: MAP_STYLE,
      center: [15, 25], zoom: 2.3, maxZoom: 12, minZoom: 1.5,
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

  useEffect(() => { fetchAgents(); const iv = setInterval(fetchAgents, 30000); return () => clearInterval(iv); }, [fetchAgents]);

  useEffect(() => {
    let at: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase.channel("wm-agents-v5")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        if (at) clearTimeout(at); at = setTimeout(fetchAgents, 2000);
      }).subscribe();
    return () => { if (at) clearTimeout(at); supabase.removeChannel(ch); };
  }, [fetchAgents]);

  // ═══ FETCH WORLD EVENTS ═══
  const fetchWorldEvents = useCallback(async () => {
    const { data } = await supabase
      .from("world_events")
      .select("id, event_type, title, lat, lng, nation_codes, goldstein_scale, created_at")
      .not("lat", "is", null).not("lng", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setWorldEvents(data as WorldEvent[]);
  }, []);

  useEffect(() => { fetchWorldEvents(); const iv = setInterval(fetchWorldEvents, 60000); return () => clearInterval(iv); }, [fetchWorldEvents]);

  // Trigger sync on mount (fire-and-forget)
  useEffect(() => {
    supabase.functions.invoke("sync-world-events").catch(() => {});
  }, []);

  const filteredEvents = useMemo(() => {
    if (!eventFilter) return worldEvents;
    return worldEvents.filter(e => e.event_type === eventFilter);
  }, [worldEvents, eventFilter]);

  // ═══ WORLD EVENT MARKERS ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    eventMarkersRef.current.forEach(m => m.remove());
    eventMarkersRef.current = [];

    filteredEvents.forEach(ev => {
      if (!ev.lat || !ev.lng) return;
      const color = EVENT_COLORS[ev.event_type] || "#a78bfa";
      const icon = EVENT_ICONS[ev.event_type] || "📡";
      const severity = ev.goldstein_scale ? Math.abs(ev.goldstein_scale) : 3;
      const size = Math.max(14, Math.min(28, 14 + severity * 1.2));
      const isHot = severity > 6;

      const el = document.createElement("div");
      el.style.cssText = `position:relative;width:${size}px;height:${size}px;cursor:pointer;`;

      // Pulse ring for severe events
      if (isHot) {
        const ring = document.createElement("div");
        ring.style.cssText = `position:absolute;inset:-${size * 0.4}px;border-radius:50%;border:1.5px solid ${color}60;animation:hub-pulse 2s ease-in-out infinite;pointer-events:none;`;
        el.appendChild(ring);
      }

      // Core diamond/circle
      const core = document.createElement("div");
      core.style.cssText = `
        width:100%;height:100%;border-radius:${ev.event_type === 'conflict' ? '2px' : '50%'};
        background:radial-gradient(circle,${color}90 0%,${color}40 100%);
        border:1px solid ${color};transform:${ev.event_type === 'conflict' ? 'rotate(45deg)' : 'none'};
        box-shadow:0 0 ${size}px ${color}50;display:flex;align-items:center;justify-content:center;
        font-size:${Math.max(8, size * 0.45)}px;
      `;
      core.textContent = icon;
      core.style.transform = ev.event_type === 'conflict' ? 'rotate(45deg)' : 'none';
      el.appendChild(core);

      // Popup on click
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (popupRef.current) popupRef.current.remove();
        const ago = getTimeAgo(ev.created_at);
        const gs = ev.goldstein_scale != null ? ev.goldstein_scale.toFixed(1) : "N/A";
        const gsColor = (ev.goldstein_scale ?? 0) < 0 ? "#ef4444" : "#22c55e";
        popupRef.current = new maplibregl.Popup({ closeButton: true, offset: size / 2 + 8, maxWidth: "320px" })
          .setLngLat([ev.lng!, ev.lat!])
          .setHTML(`
            <div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span style="font-size:16px">${icon}</span>
                <span style="font-size:10px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${ev.event_type}</span>
                <span style="font-size:9px;color:#64748b;margin-left:auto">${ago}</span>
              </div>
              <div style="font-size:12px;font-weight:600;line-height:1.4;margin-bottom:8px">${ev.title}</div>
              <div style="display:flex;gap:8px;font-size:10px">
                <span style="color:${gsColor};font-weight:600">Goldstein: ${gs}</span>
                ${Array.isArray(ev.nation_codes) && ev.nation_codes.length ? `<span style="color:#94a3b8">${ev.nation_codes.join(", ")}</span>` : ""}
              </div>
            </div>
          `)
          .addTo(map);
        map.flyTo({ center: [ev.lng!, ev.lat!], zoom: Math.max(map.getZoom(), 4), duration: 800 });
        if (onEventClick) onEventClick(ev);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([ev.lng!, ev.lat!]).addTo(map);
      eventMarkersRef.current.push(marker);
    });
  }, [filteredEvents, mapLoaded, onEventClick]);

  // ═══ RESEARCH HUB MARKERS ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    hubMarkersRef.current.forEach(m => m.remove());
    hubMarkersRef.current = [];

    filteredHubs.forEach(hub => {
      const color = TYPE_COLORS[hub.type] || "#3B82F6";
      // Scale: markers with 45 agents are ~3x bigger than markers with 2
      const minSize = 18;
      const maxSize = 52;
      const scale = Math.min(1, (hub.agentCount - 2) / 43);
      const size = Math.round(minSize + scale * (maxSize - minSize));
      const isHighActivity = hub.agentCount >= 30;

      const el = document.createElement("div");
      el.className = `hub-marker ${isHighActivity ? "hub-marker--active" : ""}`;
      el.style.cssText = `position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;`;

      // Outer glow — subtle, proportional
      const glow = document.createElement("div");
      const glowSize = size * 0.5;
      glow.style.cssText = `position:absolute;inset:-${glowSize}px;border-radius:50%;background:radial-gradient(circle,${color}18 0%,transparent 70%);pointer-events:none;`;
      el.appendChild(glow);

      // Core circle — colored by type
      const core = document.createElement("div");
      core.style.cssText = `
        width:100%;height:100%;border-radius:50%;
        background:radial-gradient(circle at 40% 40%,${color}50 0%,${color}25 70%,${color}10 100%);
        border:1.5px solid ${color}90;
        display:flex;align-items:center;justify-content:center;
        font-size:${Math.max(10, size * 0.38)}px;
        box-shadow:0 0 ${size * 0.4}px ${color}30;
      `;
      core.textContent = String(hub.agentCount);
      core.style.color = "#fff";
      core.style.fontWeight = "700";
      core.style.fontFamily = "monospace";
      el.appendChild(core);

      // Hover tooltip
      el.addEventListener("mouseenter", () => {
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: size / 2 + 6, maxWidth: "280px" })
          .setLngLat([hub.lng, hub.lat])
          .setHTML(`
            <div>
              <div style="font-weight:700;font-size:13px;margin-bottom:2px">${hub.name}</div>
              <div style="font-size:11px;color:${color};margin-bottom:6px">${hub.city}, ${hub.country} · <span style="text-transform:capitalize">${hub.type}</span></div>
              <div style="font-size:11px;color:#94a3b8;line-height:1.4;margin-bottom:6px">${hub.description}</div>
              <div style="font-size:11px;display:flex;gap:10px">
                <span style="color:#22c55e;font-weight:600">${hub.agentCount} agents</span>
                <span style="color:#64748b">${hub.activeQuests} quests</span>
              </div>
            </div>
          `)
          .addTo(map);
      });

      el.addEventListener("mouseleave", () => {
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      });

      // Click → detailed card
      el.addEventListener("click", () => {
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, offset: size / 2 + 8, maxWidth: "320px" })
          .setLngLat([hub.lng, hub.lat])
          .setHTML(`
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <div style="width:36px;height:36px;border-radius:50%;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:16px;background:${color}15">${hub.icon}</div>
                <div>
                  <div style="font-weight:700;font-size:13px">${hub.name}</div>
                  <div style="font-size:11px;color:${color};text-transform:capitalize">${hub.type} · ${hub.city}</div>
                </div>
              </div>
              <div style="font-size:11px;color:#cbd5e1;margin-bottom:10px;line-height:1.5">${hub.description}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
                <div style="background:rgba(255,255,255,0.04);padding:6px 8px;border-radius:6px">
                  <span style="color:#22c55e;font-weight:600">${hub.agentCount}</span> <span style="color:#64748b">agents</span>
                </div>
                <div style="background:rgba(255,255,255,0.04);padding:6px 8px;border-radius:6px">
                  <span style="color:#eab308;font-weight:600">${hub.activeQuests}</span> <span style="color:#64748b">quests</span>
                </div>
              </div>
              <div style="margin-top:8px;font-size:10px;color:#475569">${hub.countryCode} · ${hub.lat.toFixed(2)}°, ${hub.lng.toFixed(2)}°</div>
            </div>
          `)
          .addTo(map);
        map.flyTo({ center: [hub.lng, hub.lat], zoom: Math.max(map.getZoom(), 5), duration: 800 });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([hub.lng, hub.lat]).addTo(map);
      hubMarkersRef.current.push(marker);
    });
  }, [filteredHubs, mapLoaded]);

  // ═══ AGENT CLUSTERING ═══
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded()) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: validAgents.map(a => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
        properties: {
          id: a.id, name: a.name, class: a.class,
          level: a.level, color: CLASS_COLORS[a.class] || "#9945FF",
          reputation: a.reputation, balance_meeet: a.balance_meeet, status: a.status,
        },
      })),
    };

    if (map.getSource("agents-src")) {
      (map.getSource("agents-src") as maplibregl.GeoJSONSource).setData(geojson);
      return;
    }

    map.addSource("agents-src", {
      type: "geojson", data: geojson,
      cluster: true, clusterRadius: 45, clusterMaxZoom: 9,
    });

    // Cluster circles — subtle, color by size
    map.addLayer({
      id: "agent-clusters", type: "circle", source: "agents-src",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "rgba(59,130,246,0.45)", 10, "rgba(245,158,11,0.5)", 30, "rgba(239,68,68,0.5)"],
        "circle-radius": ["step", ["get", "point_count"], 8, 10, 13, 30, 18, 60, 24],
        "circle-blur": 0.2,
        "circle-stroke-width": 1, "circle-stroke-color": "rgba(255,255,255,0.08)",
      },
    });

    map.addLayer({
      id: "agent-cluster-count", type: "symbol", source: "agents-src",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold"], "text-size": 10, "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    });

    // Individual dots — small, clean
    map.addLayer({
      id: "agent-dots", type: "circle", source: "agents-src",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 2, 5, 3, 8, 4.5],
        "circle-opacity": 0.75,
        "circle-stroke-width": 0.5, "circle-stroke-color": "rgba(255,255,255,0.1)",
      },
    });

    // Names at zoom 6+
    map.addLayer({
      id: "agent-names", type: "symbol", source: "agents-src",
      filter: ["!", ["has", "point_count"]],
      minzoom: 6,
      layout: {
        "text-field": ["get", "name"], "text-font": ["Open Sans Regular"],
        "text-size": 9, "text-offset": [0, 1.2], "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#64748b", "text-halo-color": "rgba(8,12,20,0.9)", "text-halo-width": 1,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 7, 0.6],
      },
    });

    map.on("mouseenter", "agent-dots", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "agent-dots", () => { map.getCanvas().style.cursor = ""; });

    map.on("click", "agent-dots", (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties!;
      const agent = validAgents.find(a => a.id === props.id);
      if (agent) { setSelectedAgent(agent); setRightPanelOpen(true); }
    });

    map.on("click", "agent-clusters", (e) => {
      if (!e.features?.length) return;
      const coords = (e.features[0].geometry as any).coordinates;
      map.flyTo({ center: coords, zoom: map.getZoom() + 2, duration: 600 });
    });
    map.on("mouseenter", "agent-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "agent-clusters", () => { map.getCanvas().style.cursor = ""; });
  }, [validAgents, mapLoaded]);

  // Hub geo data for canvas connection lines
  const hubGeoData = useMemo(() => filteredHubs.map(h => ({
    lng: h.lng, lat: h.lat, color: TYPE_COLORS[h.type] || "#3B82F6",
    type: h.type, agentCount: h.agentCount,
  })), [filteredHubs]);

  // Activity feed — merge platform activity + world events
  const combinedFeed = useMemo(() => {
    const eventFeed = worldEvents.slice(0, 8).map(ev => ({
      id: ev.id,
      text: ev.title,
      icon: EVENT_ICONS[ev.event_type] || "📡",
      time: getTimeAgo(ev.created_at),
    }));
    return eventFeed;
  }, [worldEvents]);

  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; text: string; icon: string; time: string }>>([]);
  useEffect(() => {
    const fetchFeed = async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at, meeet_amount")
        .order("created_at", { ascending: false }).limit(5);
      if (data?.length) {
        const platformFeed = data.map(d => {
          const icons: Record<string, string> = { duel: "⚔️", trade: "📊", quest: "📜", discovery: "🔬", alliance: "🤝", deploy: "🚀", reward: "🏆" };
          return { id: d.id, text: d.title, icon: icons[d.event_type] || "📡", time: getTimeAgo(d.created_at) };
        });
        setActivityFeed([...combinedFeed, ...platformFeed].slice(0, 10));
      } else {
        setActivityFeed(combinedFeed);
      }
    };
    fetchFeed();
  }, [combinedFeed]);

  // Legend items
  const legendItems = [
    { color: "#EF4444", label: "Medical" },
    { color: "#22C55E", label: "Climate" },
    { color: "#A855F7", label: "Space" },
    { color: "#06B6D4", label: "Quantum" },
    { color: "#F59E0B", label: "AI" },
    { color: "#F97316", label: "Economics" },
  ];

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Canvas — subtle connection lines */}
      <WorldMapCanvas agentGeoData={[]} eventGeoData={[]} hubGeoData={hubGeoData} mapRef={mapRef} />

      {/* ═══ TOP BAR: Stats + Filters + Search ═══ */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        {/* Back / Home button */}
        <Link
          to="/"
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06] text-[11px] font-medium text-slate-300 hover:text-white hover:border-white/[0.12] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        {/* Stats */}
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06] text-[11px] font-medium">
          <span><span className="text-amber-400 font-bold">{HUB_STATS.totalHubs}</span> <span className="text-slate-500">Hubs</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span><span className="text-blue-400 font-bold">{validAgents.length || HUB_STATS.totalAgents}</span> <span className="text-slate-500">Agents</span></span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span><span className="text-red-400 font-bold">{worldEvents.length}</span> <span className="text-slate-500">Events</span></span>
        </div>

        {/* Filter pills */}
        <div className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06]">
          {TYPE_LABELS.map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                typeFilter === t.key
                  ? "bg-white/[0.1] text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
              style={typeFilter === t.key && t.color ? { color: t.color } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Event type filters */}
        <div className="pointer-events-auto flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06]">
          <button
            onClick={() => setEventFilter(null)}
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${!eventFilter ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            All
          </button>
          {EVENT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setEventFilter(eventFilter === t.key ? null : t.key)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${eventFilter === t.key ? "bg-white/[0.1]" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"}`}
              style={eventFilter === t.key ? { color: t.color } : undefined}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Search — hidden on mobile */}
        {!isMobile && (
          <div className="pointer-events-auto">
            <input
              type="text"
              placeholder="Search hubs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-36 px-2.5 py-1.5 rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06] text-[11px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-white/[0.12]"
            />
          </div>
        )}
      </div>

      {/* ═══ LEGEND — bottom-left ═══ */}
      {!isMobile && (
        <div className="absolute bottom-6 left-3 z-20 pointer-events-auto">
          <div className="px-3 py-2.5 rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06]">
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">World Events</div>
            <div className="space-y-1">
              {EVENT_TYPES.map(t => {
                const count = worldEvents.filter(e => e.event_type === t.key).length;
                return (
                  <button
                    key={t.key}
                    onClick={() => setEventFilter(eventFilter === t.key ? null : t.key)}
                    className={`flex items-center gap-2 w-full text-left ${eventFilter === t.key ? 'opacity-100' : 'opacity-60 hover:opacity-90'} transition-opacity`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 6px ${t.color}40` }} />
                    <span className="text-[10px] text-slate-400 flex-1">{t.label}</span>
                    <span className="text-[9px] text-slate-600 font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/[0.04]">
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hub Types</div>
              <div className="space-y-1">
                {legendItems.map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}40` }} />
                    <span className="text-[10px] text-slate-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIVE FEED — collapsible, bottom-right ═══ */}
      {!isMobile && activityFeed.length > 0 && (
        <div className="absolute bottom-6 right-14 z-20 pointer-events-auto">
          <div className="rounded-lg bg-[rgba(8,12,24,0.88)] backdrop-blur-xl border border-white/[0.06] overflow-hidden" style={{ width: feedExpanded ? 220 : 160 }}>
            <button
              onClick={() => setFeedExpanded(!feedExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                Live
              </div>
              {feedExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
            {feedExpanded && (
              <div className="border-t border-white/[0.04] max-h-48 overflow-y-auto">
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
            )}
          </div>
        </div>
      )}

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
