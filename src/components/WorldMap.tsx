import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Filter, Layers, X, Users, Zap, MapPin } from "lucide-react";

const CLASS_COLORS: Record<string, string> = {
  warrior: "#ef4444",
  trader: "#f59e0b",
  scout: "#10b981",
  diplomat: "#3b82f6",
  builder: "#8b5cf6",
  hacker: "#ec4899",
  president: "#fbbf24",
  oracle: "#ffcc00",
  miner: "#00aaff",
  banker: "#aa44ff",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️",
  trader: "💰",
  scout: "🔭",
  diplomat: "🤝",
  builder: "🏗️",
  hacker: "💻",
  president: "👑",
  oracle: "🔮",
  miner: "⛏️",
  banker: "🏦",
};

const EVENT_TYPES = [
  { key: "conflict", label: "Conflicts", color: "#ef4444", icon: "⚔️" },
  { key: "disaster", label: "Disasters", color: "#f97316", icon: "🌋" },
  { key: "discovery", label: "Discoveries", color: "#3b82f6", icon: "🔬" },
  { key: "diplomacy", label: "Diplomacy", color: "#22c55e", icon: "🕊️" },
];

interface Agent {
  id: string;
  name: string;
  class: string;
  lat: number | null;
  lng: number | null;
  reputation: number;
  balance_meeet: number;
  level: number;
  status: string;
  nation_code: string | null;
}

interface WorldEvent {
  id: string;
  event_type: string;
  title: string;
  lat: number | null;
  lng: number | null;
  nation_codes: any;
  goldstein_scale: number | null;
  created_at: string;
}

interface WorldMapProps {
  height?: string;
  interactive?: boolean;
  showSidebar?: boolean;
  onEventClick?: (event: WorldEvent) => void;
}

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    },
  },
  layers: [
    { id: "carto-dark-layer", type: "raster", source: "carto-dark", minzoom: 0, maxzoom: 20 },
  ],
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
  const [stats, setStats] = useState({ agents: 0, warnings: 0, markets: 0 });

  const fetchAgents = useCallback(async () => {
    const { data } = await supabase
      .from("agents_public")
      .select("id, name, class, lat, lng, reputation, balance_meeet, level, status, nation_code")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(500);
    if (data) setAgents(data as Agent[]);
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("world_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setEvents(data);
  }, []);

  const fetchStats = useCallback(async () => {
    const [{ count: agentCount }, { count: warningCount }, { count: marketCount }] = await Promise.all([
      supabase.from("agents_public").select("*", { count: "exact", head: true }),
      supabase.from("warnings").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("oracle_questions").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);
    setStats({
      agents: agentCount || 0,
      warnings: warningCount || 0,
      markets: marketCount || 0,
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const container = mapContainer.current;

    const map = new maplibregl.Map({
      container,
      style: DARK_STYLE,
      center: [0, 20],
      zoom: 2,
      maxZoom: 16,
      interactive,
    });

    // Force initial resize passes to avoid blank map when container settles after mount
    requestAnimationFrame(() => map.resize());
    const delayedResize = window.setTimeout(() => {
      if (mapRef.current === map) map.resize();
    }, 200);

    // ResizeObserver to keep map in sync with container
    const resizeObserver = new ResizeObserver(() => {
      if (map && !(map as any)._removed) {
        map.resize();
      }
    });
    resizeObserver.observe(container);

    map.on("load", () => {
      map.resize();
      setMapLoaded(true);

      // --- Agent heatmap layer ---
      map.addSource("agent-heat", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "agent-heatmap",
        type: "heatmap",
        source: "agent-heat",
        maxzoom: 9,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "reputation"], 0, 0.1, 100, 0.5, 500, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.3, 9, 1.5],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "hsla(262, 100%, 64%, 0.15)",
            0.4, "hsla(262, 100%, 50%, 0.3)",
            0.6, "hsla(195, 100%, 50%, 0.4)",
            0.8, "hsla(157, 91%, 51%, 0.5)",
            1, "hsla(157, 91%, 51%, 0.7)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 9, 40],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 9, 0],
        },
      });

      // --- Clustered agents ---
      map.addSource("agents", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "agent-clusters",
        type: "circle",
        source: "agents",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "hsl(262, 100%, 64%)", 10,
            "hsl(195, 100%, 50%)", 30,
            "hsl(157, 91%, 51%)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 32],
          "circle-opacity": 0.7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.15)",
        },
      });

      map.addLayer({
        id: "agent-cluster-count",
        type: "symbol",
        source: "agents",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "agent-glow",
        type: "circle",
        source: "agents",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, ["interpolate", ["linear"], ["get", "reputation"], 0, 8, 100, 14, 500, 22],
            8, ["interpolate", ["linear"], ["get", "reputation"], 0, 14, 100, 22, 500, 34],
          ],
          "circle-opacity": 0.12,
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "agent-dots",
        type: "circle",
        source: "agents",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, ["interpolate", ["linear"], ["get", "reputation"], 0, 3, 100, 6, 500, 10],
            8, ["interpolate", ["linear"], ["get", "reputation"], 0, 6, 100, 10, 500, 16],
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.25)",
        },
      });

      map.addLayer({
        id: "agent-labels",
        type: "symbol",
        source: "agents",
        filter: ["!", ["has", "point_count"]],
        minzoom: 6,
        layout: {
          "text-field": ["concat", ["get", "icon"], " ", ["get", "name"]],
          "text-font": ["Open Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.8)",
          "text-halo-width": 1,
        },
      });

      map.addSource("world-events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "event-pulse",
        type: "circle",
        source: "world-events",
        paint: {
          "circle-color": "transparent",
          "circle-radius": 22,
          "circle-opacity": 0,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": [
            "match", ["get", "event_type"],
            "conflict", "#ef4444",
            "disaster", "#f97316",
            "discovery", "#3b82f6",
            "diplomacy", "#22c55e",
            "#9945FF",
          ],
          "circle-stroke-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "event-markers",
        type: "circle",
        source: "world-events",
        paint: {
          "circle-color": [
            "match", ["get", "event_type"],
            "conflict", "#ef4444",
            "disaster", "#f97316",
            "discovery", "#3b82f6",
            "diplomacy", "#22c55e",
            "#9945FF",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 12],
          "circle-opacity": 0.7,
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "match", ["get", "event_type"],
            "conflict", "#ef4444",
            "disaster", "#f97316",
            "discovery", "#3b82f6",
            "diplomacy", "#22c55e",
            "#9945FF",
          ],
          "circle-stroke-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "event-labels",
        type: "symbol",
        source: "world-events",
        minzoom: 4,
        layout: {
          "text-field": ["get", "icon"],
          "text-font": ["Open Sans Regular"],
          "text-size": 16,
          "text-allow-overlap": true,
        },
      });

      // Click handlers
      map.on("click", "agent-dots", (e) => {
        if (!e.features?.[0]) return;
        const p = e.features[0].properties!;
        const coords = (e.features[0].geometry as any).coordinates.slice();
        new maplibregl.Popup({ className: "meeet-popup", maxWidth: "280px" })
          .setLngLat(coords)
          .setHTML(`
            <div style="background:#0a0a0f;padding:14px;border-radius:10px;color:#fff;font-family:monospace;border:1px solid rgba(153,69,255,0.3);">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:18px;">${p.icon || "🤖"}</span>
                <div>
                  <div style="font-size:14px;font-weight:bold;">${p.name}</div>
                  <div style="font-size:10px;color:#888;text-transform:uppercase;">${p.agentClass} · Level ${p.level}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
                <div style="background:rgba(20,241,149,0.1);padding:6px 8px;border-radius:6px;">
                  <div style="font-size:9px;color:#888;">BALANCE</div>
                  <div style="font-size:13px;color:#14F195;font-weight:bold;">${Number(p.balance).toLocaleString()}</div>
                </div>
                <div style="background:rgba(153,69,255,0.1);padding:6px 8px;border-radius:6px;">
                  <div style="font-size:9px;color:#888;">REPUTATION</div>
                  <div style="font-size:13px;color:#9945FF;font-weight:bold;">${p.reputation}</div>
                </div>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on("click", "event-markers", (e) => {
        if (!e.features?.[0]) return;
        const p = e.features[0].properties!;
        const coords = (e.features[0].geometry as any).coordinates.slice();
        const typeColor = { conflict: "#ef4444", disaster: "#f97316", discovery: "#3b82f6", diplomacy: "#22c55e" }[p.event_type as string] || "#9945FF";
        new maplibregl.Popup({ className: "meeet-popup", maxWidth: "300px" })
          .setLngLat(coords)
          .setHTML(`
            <div style="background:#0a0a0f;padding:14px;border-radius:10px;color:#fff;font-family:monospace;border:1px solid ${typeColor}33;">
              <div style="font-size:10px;text-transform:uppercase;color:${typeColor};margin-bottom:6px;letter-spacing:1px;">${p.icon || "🌍"} ${p.event_type}</div>
              <div style="font-size:13px;font-weight:bold;margin-bottom:6px;line-height:1.4;">${p.title}</div>
              <div style="font-size:10px;color:#666;">${new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          `)
          .addTo(map);
        if (onEventClick) onEventClick(JSON.parse(JSON.stringify(p)));
      });

      map.on("mouseenter", "agent-dots", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "agent-dots", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "event-markers", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "event-markers", () => { map.getCanvas().style.cursor = ""; });

      map.on("click", "agent-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["agent-clusters"] });
        if (!features[0]) return;
        const clusterId = features[0].properties!.cluster_id;
        (map.getSource("agents") as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
        });
      });
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    }

    mapRef.current = map;
    return () => {
      window.clearTimeout(delayedResize);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [interactive, onEventClick]);

  // Fetch data
  useEffect(() => {
    fetchAgents();
    fetchEvents();
    fetchStats();
    const interval = setInterval(() => { fetchAgents(); fetchEvents(); fetchStats(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents, fetchEvents, fetchStats]);

  // Update agents on map (with class filter)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource("agents") as maplibregl.GeoJSONSource;
    const heatSource = mapRef.current.getSource("agent-heat") as maplibregl.GeoJSONSource;
    if (!source) return;

    const filteredAgents = agents.filter((a) => a.lat != null && a.lng != null && showAgents && classFilters.has(a.class));

    const features = filteredAgents.map((a) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
      properties: {
        id: a.id,
        name: a.name,
        agentClass: a.class,
        icon: CLASS_ICONS[a.class] || "🤖",
        color: CLASS_COLORS[a.class] || "#9945FF",
        reputation: a.reputation ?? 0,
        balance: a.balance_meeet ?? 0,
        level: a.level ?? 1,
        status: a.status ?? "idle",
      },
    }));

    source.setData({ type: "FeatureCollection", features });

    // Feed heatmap with all agents (unfiltered by class for density viz)
    if (heatSource) {
      const heatFeatures = agents
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
          properties: { reputation: a.reputation ?? 0 },
        }));
      heatSource.setData({ type: "FeatureCollection", features: heatFeatures });
    }
  }, [agents, mapLoaded, classFilters, showAgents]);

  // Update events on map (with event filter)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource("world-events") as maplibregl.GeoJSONSource;
    if (!source) return;

    const eventIcons: Record<string, string> = { conflict: "⚔️", disaster: "🌋", discovery: "🔬", diplomacy: "🕊️" };
    const features = events
      .filter((e) => e.lat != null && e.lng != null && showEvents && eventFilters.has(e.event_type))
      .map((e) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [e.lng!, e.lat!] },
        properties: {
          id: e.id,
          event_type: e.event_type,
          title: e.title,
          icon: eventIcons[e.event_type] || "🌍",
          goldstein_scale: e.goldstein_scale,
          created_at: e.created_at,
        },
      }));

    source.setData({ type: "FeatureCollection", features });
  }, [events, mapLoaded, eventFilters, showEvents]);

  // Realtime with debounce to avoid overloading
  useEffect(() => {
    let agentTimer: ReturnType<typeof setTimeout> | null = null;
    let eventTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedFetchAgents = () => {
      if (agentTimer) clearTimeout(agentTimer);
      agentTimer = setTimeout(() => fetchAgents(), 2000);
    };
    const debouncedFetchEvents = () => {
      if (eventTimer) clearTimeout(eventTimer);
      eventTimer = setTimeout(() => fetchEvents(), 2000);
    };

    const channel = supabase
      .channel("world-map-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, debouncedFetchAgents)
      .subscribe();
    const evChannel = supabase
      .channel("world-map-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "world_events" }, debouncedFetchEvents)
      .subscribe();
    return () => {
      if (agentTimer) clearTimeout(agentTimer);
      if (eventTimer) clearTimeout(eventTimer);
      supabase.removeChannel(channel);
      supabase.removeChannel(evChannel);
    };
  }, [fetchAgents, fetchEvents]);

  const toggleClass = (cls: string) => {
    setClassFilters(prev => {
      const next = new Set(prev);
      next.has(cls) ? next.delete(cls) : next.add(cls);
      return next;
    });
  };

  const toggleEventType = (type: string) => {
    setEventFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const filteredAgentCount = agents.filter(a => a.lat != null && classFilters.has(a.class)).length;
  const filteredEventCount = events.filter(e => e.lat != null && eventFilters.has(e.event_type)).length;

  return (
    <div className="relative w-full h-full" style={{ height, minHeight: "320px" }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Gradient edges */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />

      {/* Stats Bar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-md border border-border text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground font-bold">{stats.agents || filteredAgentCount}</span>
            <span className="text-muted-foreground">agents</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-foreground font-bold">{filteredEventCount}</span>
            <span className="text-muted-foreground">events</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-orange-400">⚠️</span>
            <span className="text-foreground font-bold">{stats.warnings}</span>
            <span className="text-muted-foreground">warnings</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400">🔮</span>
            <span className="text-foreground font-bold">{stats.markets}</span>
            <span className="text-muted-foreground">markets</span>
          </div>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`p-2 rounded-lg backdrop-blur-md border transition-colors ${
            filtersOpen
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-background/80 border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {filtersOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter Panel */}
      {filtersOpen && (
        <div className="absolute top-14 left-3 w-64 rounded-lg bg-background/90 backdrop-blur-md border border-border p-3 pointer-events-auto animate-fade-in space-y-3">
          {/* Layer toggles */}
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAgents(!showAgents)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-mono transition-colors border ${
                showAgents ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border"
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />Agents
            </button>
            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-mono transition-colors border ${
                showEvents ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-muted/30 text-muted-foreground border-border"
              }`}
            >
              <MapPin className="w-3 h-3 inline mr-1" />Events
            </button>
          </div>

          {/* Agent class filters */}
          {showAgents && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Agent Classes</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(CLASS_COLORS).map(([cls, color]) => (
                  <button
                    key={cls}
                    onClick={() => toggleClass(cls)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-all border ${
                      classFilters.has(cls)
                        ? "border-white/10 bg-white/5 text-foreground"
                        : "border-transparent bg-transparent text-muted-foreground/50 line-through"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: classFilters.has(cls) ? color : "#444" }}
                    />
                    <span className="capitalize">{cls}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event type filters */}
          {showEvents && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Event Types</div>
              <div className="space-y-0.5">
                {EVENT_TYPES.map(({ key, label, color, icon }) => (
                  <button
                    key={key}
                    onClick={() => toggleEventType(key)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] font-mono transition-all border ${
                      eventFilters.has(key)
                        ? "border-white/10 bg-white/5 text-foreground"
                        : "border-transparent bg-transparent text-muted-foreground/50 line-through"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: eventFilters.has(key) ? color : "#444" }}
                    />
                    <span>{icon} {label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorldMap;
