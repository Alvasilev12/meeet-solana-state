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
  president: "#fbbf24", oracle: "#ffcc00", miner: "#00aaff", banker: "#aa44ff",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "💰", scout: "🔭", diplomat: "🤝",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔮",
  miner: "⛏️", banker: "🏦",
};

export const EVENT_TYPES = [
  { key: "conflict", label: "Conflicts", color: "#ef4444", icon: "⚔️" },
  { key: "disaster", label: "Disasters", color: "#f97316", icon: "🌋" },
  { key: "discovery", label: "Discoveries", color: "#3b82f6", icon: "🔬" },
  { key: "diplomacy", label: "Diplomacy", color: "#22c55e", icon: "🕊️" },
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

interface WorldMapProps {
  height?: string; interactive?: boolean; showSidebar?: boolean;
  onEventClick?: (event: WorldEvent) => void;
}

const DARK_STYLE: maplibregl.StyleSpecification = {
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
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{
    id: "carto-dark-layer", type: "raster", source: "carto-dark",
    minzoom: 0, maxzoom: 20,
    paint: { "raster-brightness-max": 0.55, "raster-contrast": 0.2, "raster-saturation": -0.3 },
  }],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

const WorldMap = ({ height = "100vh", interactive = true, showSidebar = false, onEventClick }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classFilters, setClassFilters] = useState<Set<string>>(new Set(Object.keys(CLASS_COLORS)));
  const [eventFilters, setEventFilters] = useState<Set<string>>(new Set(EVENT_TYPES.map(e => e.key)));
  const [showAgents, setShowAgents] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; title: string; type: string; time: string }>>([]);

  // Store geo-data for canvas (canvas will project on each frame via mapRef)
  const agentGeoData = useMemo(() => {
    return agents.filter(a => a.lat != null && a.lng != null && showAgents && classFilters.has(a.class)).map(a => ({
      lng: a.lng!, lat: a.lat!,
      color: CLASS_COLORS[a.class] || "#9945FF",
      rep: a.reputation ?? 0, name: a.name, cls: a.class,
    }));
  }, [agents, classFilters, showAgents]);

  const eventGeoData = useMemo(() => {
    const colors: Record<string, string> = { conflict: "#ef4444", disaster: "#f97316", discovery: "#3b82f6", diplomacy: "#22c55e" };
    return events.filter(e => e.lat != null && e.lng != null && showEvents && eventFilters.has(e.event_type)).map(e => ({
      lng: e.lng!, lat: e.lat!,
      color: colors[e.event_type] || "#9945FF", type: e.event_type,
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

  const fetchActivity = useCallback(async () => {
    const { data } = await supabase
      .from("activity_feed").select("id, title, event_type, created_at")
      .order("created_at", { ascending: false }).limit(8);
    if (data) setRecentActivity(data.map(d => ({
      id: d.id, title: d.title, type: d.event_type,
      time: new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const container = mapContainer.current;

    const map = new maplibregl.Map({
      container, style: DARK_STYLE,
      center: [30, 20], zoom: 2.2, maxZoom: 14, minZoom: 1.5,
      interactive, pitchWithRotate: false, dragRotate: false,
    });

    requestAnimationFrame(() => map.resize());
    const delayedResize = window.setTimeout(() => { if (mapRef.current === map) map.resize(); }, 300);
    const ro = new ResizeObserver(() => { if (map && !(map as any)._removed) map.resize(); });
    ro.observe(container);

    map.on("load", () => {
      map.resize();
      setMapLoaded(true);

      // Heatmap
      map.addSource("agent-heat", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "agent-heatmap", type: "heatmap", source: "agent-heat", maxzoom: 9,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "rep"], 0, 0.1, 500, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 9, 2],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)", 0.15, "hsla(270,100%,50%,0.08)",
            0.4, "hsla(270,100%,50%,0.2)", 0.6, "hsla(200,100%,50%,0.3)",
            0.8, "hsla(160,100%,50%,0.35)", 1, "hsla(140,100%,60%,0.5)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 9, 50],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.9, 9, 0],
        },
      });

      // Cluster source
      map.addSource("agents", {
        type: "geojson", data: { type: "FeatureCollection", features: [] },
        cluster: true, clusterMaxZoom: 7, clusterRadius: 60,
      });
      map.addLayer({
        id: "agent-clusters", type: "circle", source: "agents",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#7c3aed", 10, "#06b6d4", 30, "#10b981"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 30, 38],
          "circle-opacity": 0.6,
          "circle-stroke-width": 2, "circle-stroke-color": "rgba(255,255,255,0.1)",
        },
      });
      map.addLayer({
        id: "cluster-count", type: "symbol", source: "agents",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 13 },
        paint: { "text-color": "#fff" },
      });

      // Event layers
      map.addSource("world-events", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "event-glow", type: "circle", source: "world-events",
        paint: {
          "circle-color": ["match", ["get", "t"], "conflict", "#ef4444", "disaster", "#f97316", "discovery", "#3b82f6", "diplomacy", "#22c55e", "#9945FF"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 16, 8, 30],
          "circle-opacity": 0.08, "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "event-markers", type: "circle", source: "world-events",
        paint: {
          "circle-color": ["match", ["get", "t"], "conflict", "#ef4444", "disaster", "#f97316", "discovery", "#3b82f6", "diplomacy", "#22c55e", "#9945FF"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 8, 10],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": ["match", ["get", "t"], "conflict", "rgba(239,68,68,0.4)", "disaster", "rgba(249,115,22,0.4)", "discovery", "rgba(59,130,246,0.4)", "diplomacy", "rgba(34,197,94,0.4)", "rgba(153,69,255,0.4)"],
        },
      });

      // Click handlers
      map.on("click", "event-markers", (e) => {
        if (!e.features?.[0]) return;
        const p = e.features[0].properties!;
        const coords = (e.features[0].geometry as any).coordinates.slice();
        const color = { conflict: "#ef4444", disaster: "#f97316", discovery: "#3b82f6", diplomacy: "#22c55e" }[p.t as string] || "#9945FF";
        new maplibregl.Popup({ className: "meeet-popup", maxWidth: "300px" })
          .setLngLat(coords)
          .setHTML(`<div style="background:#080810;padding:14px;border-radius:12px;color:#fff;font-family:monospace;border:1px solid ${color}33;box-shadow:0 0 30px ${color}11;">
            <div style="font-size:10px;text-transform:uppercase;color:${color};margin-bottom:6px;letter-spacing:2px;">${p.t}</div>
            <div style="font-size:13px;font-weight:bold;margin-bottom:8px;line-height:1.5;">${p.title}</div>
            <div style="font-size:10px;color:#555;">${new Date(p.created_at).toLocaleString()}</div>
          </div>`)
          .addTo(map);
        if (onEventClick) onEventClick(JSON.parse(JSON.stringify(p)));
      });

      map.on("click", "agent-clusters", (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["agent-clusters"] });
        if (!f[0]) return;
        (map.getSource("agents") as maplibregl.GeoJSONSource).getClusterExpansionZoom(f[0].properties!.cluster_id).then((zoom) => {
          map.easeTo({ center: (f[0].geometry as any).coordinates, zoom });
        });
      });

      for (const layer of ["event-markers", "agent-clusters"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
    });

    if (interactive) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    return () => {
      clearTimeout(delayedResize); ro.disconnect(); map.remove();
      mapRef.current = null; setMapLoaded(false);
    };
  }, [interactive, onEventClick]);

  // Fetch data
  useEffect(() => {
    fetchAgents(); fetchEvents(); fetchActivity();
    const iv = setInterval(() => { fetchAgents(); fetchEvents(); fetchActivity(); }, 30000);
    return () => clearInterval(iv);
  }, [fetchAgents, fetchEvents, fetchActivity]);

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

  // Update map sources
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const src = mapRef.current.getSource("agents") as maplibregl.GeoJSONSource;
    const heatSrc = mapRef.current.getSource("agent-heat") as maplibregl.GeoJSONSource;
    if (!src) return;

    const filtered = agents.filter(a => a.lat != null && a.lng != null && showAgents && classFilters.has(a.class));
    const features = filtered.map(a => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
      properties: {
        id: a.id, name: a.name, cls: a.class,
        icon: CLASS_ICONS[a.class] || "🤖",
        color: CLASS_COLORS[a.class] || "#9945FF",
        rep: a.reputation ?? 0, bal: a.balance_meeet ?? 0,
        lvl: a.level ?? 1, status: a.status ?? "idle",
      },
    }));
    src.setData({ type: "FeatureCollection", features });

    if (heatSrc) {
      const hf = agents.filter(a => a.lat != null && a.lng != null).map(a => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
        properties: { rep: a.reputation ?? 0 },
      }));
      heatSrc.setData({ type: "FeatureCollection", features: hf });
    }
  }, [agents, mapLoaded, classFilters, showAgents]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const src = mapRef.current.getSource("world-events") as maplibregl.GeoJSONSource;
    if (!src) return;
    const features = events.filter(e => e.lat != null && e.lng != null && showEvents && eventFilters.has(e.event_type))
      .map(e => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [e.lng!, e.lat!] },
        properties: { id: e.id, t: e.event_type, title: e.title, created_at: e.created_at },
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [events, mapLoaded, eventFilters, showEvents]);

  const toggleClass = (cls: string) => setClassFilters(p => { const n = new Set(p); n.has(cls) ? n.delete(cls) : n.add(cls); return n; });
  const toggleEventType = (t: string) => setEventFilters(p => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Canvas animation overlay - projects geo coords each frame */}
      <WorldMapCanvas
        agentGeoData={agentGeoData}
        eventGeoData={eventGeoData}
        mapRef={mapRef}
      />

      {/* Atmospheric edges */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/40 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background/50 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/50 to-transparent pointer-events-none" />

      {/* HUD */}
      <WorldMapHUD
        agentCount={agents.length}
        eventCount={events.filter(e => showEvents && eventFilters.has(e.event_type)).length}
        recentActivity={recentActivity}
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
