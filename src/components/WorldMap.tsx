import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/runtime-client";

const CLASS_COLORS: Record<string, string> = {
  warrior: "#ff3b3b",
  trader: "#14F195",
  oracle: "#ffcc00",
  diplomat: "#ffd700",
  miner: "#00aaff",
  banker: "#aa44ff",
  president: "#ffd700",
};

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

// Free dark tile styles
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
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};

const WorldMap = ({ height = "100vh", interactive = true, showSidebar = false, onEventClick }: WorldMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [0, 20],
      zoom: 2,
      maxZoom: 16,
      interactive,
    });

    map.on("load", () => {
      setMapLoaded(true);

      // Agent source with clustering
      map.addSource("agents", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 50,
      });

      // Cluster circles
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

      // Cluster count labels
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
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual agent dots
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
          "circle-opacity": 0.85,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.4,
          "circle-blur": 0.3,
        },
      });

      // Agent labels at high zoom
      map.addLayer({
        id: "agent-labels",
        type: "symbol",
        source: "agents",
        filter: ["!", ["has", "point_count"]],
        minzoom: 6,
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["get", "balance"], " $M"],
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

      // World events source
      map.addSource("world-events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Event markers
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
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 8,
            6, 14,
          ],
          "circle-opacity": 0.6,
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

      // Event pulse
      map.addLayer({
        id: "event-pulse",
        type: "circle",
        source: "world-events",
        paint: {
          "circle-color": "transparent",
          "circle-radius": 20,
          "circle-opacity": 0,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": [
            "match", ["get", "event_type"],
            "conflict", "#ef4444",
            "disaster", "#f97316",
            "discovery", "#3b82f6",
            "#9945FF",
          ],
          "circle-stroke-opacity": 0.3,
        },
      });

      // Click handlers
      map.on("click", "agent-dots", (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as any).coordinates.slice();
        new maplibregl.Popup({ className: "meeet-popup", maxWidth: "260px" })
          .setLngLat(coords)
          .setHTML(`
            <div style="background:#111;padding:12px;border-radius:8px;color:#fff;font-family:monospace;">
              <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">${props.name}</div>
              <div style="font-size:11px;color:#999;margin-bottom:6px;">${props.agentClass} · Lv.${props.level}</div>
              <div style="font-size:12px;color:#14F195;">${Number(props.balance).toLocaleString()} $MEEET</div>
              <div style="font-size:11px;color:#888;margin-top:2px;">Rep: ${props.reputation}</div>
            </div>
          `)
          .addTo(map);
      });

      map.on("click", "event-markers", (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as any).coordinates.slice();
        new maplibregl.Popup({ className: "meeet-popup", maxWidth: "300px" })
          .setLngLat(coords)
          .setHTML(`
            <div style="background:#111;padding:12px;border-radius:8px;color:#fff;font-family:monospace;">
              <div style="font-size:10px;text-transform:uppercase;color:${props.event_type === 'conflict' ? '#ef4444' : '#f97316'};margin-bottom:4px;">${props.event_type}</div>
              <div style="font-size:13px;font-weight:bold;margin-bottom:4px;">${props.title}</div>
              <div style="font-size:10px;color:#666;">${new Date(props.created_at).toLocaleDateString()}</div>
            </div>
          `)
          .addTo(map);
        if (onEventClick) {
          onEventClick(JSON.parse(JSON.stringify(props)));
        }
      });

      // Cursors
      map.on("mouseenter", "agent-dots", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "agent-dots", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "event-markers", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "event-markers", () => { map.getCanvas().style.cursor = ""; });

      // Cluster zoom
      map.on("click", "agent-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["agent-clusters"] });
        if (!features[0]) return;
        const clusterId = features[0].properties!.cluster_id;
        (map.getSource("agents") as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom,
          });
        });
      });
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive, onEventClick]);

  // Fetch data
  useEffect(() => {
    fetchAgents();
    fetchEvents();
    const interval = setInterval(() => {
      fetchAgents();
      fetchEvents();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents, fetchEvents]);

  // Update agents on map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || agents.length === 0) return;
    const source = mapRef.current.getSource("agents") as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = agents
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [a.lng!, a.lat!],
        },
        properties: {
          id: a.id,
          name: a.name,
          agentClass: a.class,
          color: CLASS_COLORS[a.class] || "#9945FF",
          reputation: a.reputation ?? 0,
          balance: a.balance_meeet ?? 0,
          level: a.level ?? 1,
          status: a.status ?? "idle",
        },
      }));

    source.setData({ type: "FeatureCollection", features });
  }, [agents, mapLoaded]);

  // Update events on map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || events.length === 0) return;
    const source = mapRef.current.getSource("world-events") as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = events
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [e.lng!, e.lat!],
        },
        properties: {
          id: e.id,
          event_type: e.event_type,
          title: e.title,
          goldstein_scale: e.goldstein_scale,
          created_at: e.created_at,
        },
      }));

    source.setData({ type: "FeatureCollection", features });
  }, [events, mapLoaded]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("world-map-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => {
        fetchAgents();
      })
      .subscribe();

    const evChannel = supabase
      .channel("world-map-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "world_events" }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(evChannel);
    };
  }, [fetchAgents, fetchEvents]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />
    </div>
  );
};

export default WorldMap;
