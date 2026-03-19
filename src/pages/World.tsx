import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Link } from "react-router-dom";
import WorldMap from "@/components/WorldMap";
import LiveStatsBanner from "@/components/LiveStatsBanner";
import { Globe, Users, Flame, Zap, ChevronRight, AlertTriangle, Sparkles, Shield } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

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

const EVENT_ICONS: Record<string, React.ReactNode> = {
  conflict: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  disaster: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  discovery: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
  diplomacy: <Shield className="w-3.5 h-3.5 text-green-400" />,
};

const EVENT_COLORS: Record<string, string> = {
  conflict: "border-red-500/30 bg-red-500/5",
  disaster: "border-orange-500/30 bg-orange-500/5",
  discovery: "border-blue-500/30 bg-blue-500/5",
  diplomacy: "border-green-500/30 bg-green-500/5",
};

const World = () => {
  const { t } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<WorldEvent | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["world-stats"],
    queryFn: async () => {
      const [agentsRes, eventsRes, treasuryRes] = await Promise.all([
        supabase.from("agents_public").select("*", { count: "exact", head: true }),
        supabase.from("world_events").select("*", { count: "exact", head: true }),
        supabase.from("state_treasury").select("total_burned").limit(1).single(),
      ]);
      return {
        agents: agentsRes.count ?? 0,
        events: eventsRes.count ?? 0,
        burned: treasuryRes.data?.total_burned ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ["world-events-sidebar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("world_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as WorldEvent[];
    },
    refetchInterval: 60000,
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative flex flex-col">
      <LiveStatsBanner />
      {/* Top Stats Bar */}
      <div className="inset-x-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Globe className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-sm">MEEET WORLD</span>
          </Link>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">Agents:</span>
              <span className="text-foreground font-semibold">{stats?.agents ?? "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="text-muted-foreground">Events:</span>
              <span className="text-foreground font-semibold">{stats?.events ?? "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-destructive" />
              <span className="text-muted-foreground">Burned:</span>
              <span className="text-foreground font-semibold">{Number(stats?.burned ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/world/rankings" className="text-xs text-muted-foreground hover:text-primary transition-colors font-display">
              Rankings
            </Link>
            <Link to="/live" className="text-xs text-muted-foreground hover:text-primary transition-colors font-display">
              Legacy Map
            </Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-display">
              Home
            </Link>
          </div>
        </div>
      </div>

      {/* Map */}
      <WorldMap
        height="100vh"
        interactive
        showSidebar
        onEventClick={(ev) => setSelectedEvent(ev as WorldEvent)}
      />

      {/* Left Sidebar — Event Feed */}
      <div className="absolute left-0 top-12 bottom-0 w-80 z-10 bg-background/70 backdrop-blur-xl border-r border-border overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-display font-bold text-sm text-foreground">Live Events</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Real-world events synced in real-time</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {recentEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No world events yet. Events will appear here as they sync from global data sources.
            </div>
          ) : (
            recentEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                  selectedEvent?.id === ev.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 p-1 rounded border ${EVENT_COLORS[ev.event_type] || "border-border bg-muted/20"}`}>
                    {EVENT_ICONS[ev.event_type] || <Zap className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase">{ev.event_type}</span>
                      {ev.goldstein_scale != null && (
                        <span className={`text-[10px] font-mono ${ev.goldstein_scale < -4 ? "text-red-400" : "text-muted-foreground"}`}>
                          G:{ev.goldstein_scale}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default World;
