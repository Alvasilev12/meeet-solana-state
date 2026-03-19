import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Link } from "react-router-dom";
import WorldMap from "@/components/WorldMap";
import LiveStatsBanner from "@/components/LiveStatsBanner";
import {
  Globe, Users, Flame, Zap, ChevronRight, AlertTriangle,
  Sparkles, Shield, Swords, Eye, X, TrendingUp
} from "lucide-react";

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

interface Agent {
  id: string;
  name: string;
  class: string;
  level: number;
  reputation: number;
  balance_meeet: number;
  nation_code: string | null;
  status: string;
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

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "💰", scout: "🔭", diplomat: "🤝",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔮",
  miner: "⛏️", banker: "🏦",
};

const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400", trader: "text-amber-400", scout: "text-emerald-400",
  diplomat: "text-blue-400", builder: "text-violet-400", hacker: "text-pink-400",
  president: "text-yellow-400", oracle: "text-yellow-300", miner: "text-cyan-400",
  banker: "text-purple-400",
};

type SidebarTab = "events" | "agents";

const World = () => {
  const [selectedEvent, setSelectedEvent] = useState<WorldEvent | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("agents");
  const [detailOpen, setDetailOpen] = useState(false);

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
        .limit(30);
      return (data ?? []) as WorldEvent[];
    },
    refetchInterval: 60000,
  });

  const { data: topAgents = [] } = useQuery({
    queryKey: ["world-top-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, class, level, reputation, balance_meeet, nation_code, status")
        .order("reputation", { ascending: false })
        .limit(30);
      return (data ?? []) as Agent[];
    },
    refetchInterval: 60000,
  });

  const handleEventClick = (ev: WorldEvent) => {
    setSelectedEvent(ev);
    setDetailOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative flex flex-col">
      <LiveStatsBanner />

      {/* Top Bar */}
      <div className="inset-x-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-11">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Globe className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-sm tracking-wider">MEEET WORLD</span>
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
            <Link to="/world/rankings" className="text-xs text-muted-foreground hover:text-primary transition-colors font-display">Rankings</Link>
            <Link to="/live" className="text-xs text-muted-foreground hover:text-primary transition-colors font-display">Legacy Map</Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-display">Home</Link>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <WorldMap
          height="100%"
          interactive
          showSidebar
          onEventClick={(ev) => handleEventClick(ev as WorldEvent)}
        />
      </div>

      {/* Left Sidebar */}
      <div className="absolute left-0 top-[5.75rem] bottom-0 w-80 z-10 bg-background/80 backdrop-blur-xl border-r border-border overflow-hidden flex flex-col">
        {/* Tab header */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setSidebarTab("agents")}
            className={`flex-1 px-4 py-2.5 text-xs font-display font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              sidebarTab === "agents"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Agents ({topAgents.length})
          </button>
          <button
            onClick={() => setSidebarTab("events")}
            className={`flex-1 px-4 py-2.5 text-xs font-display font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              sidebarTab === "events"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Events ({recentEvents.length})
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {sidebarTab === "agents" ? (
            topAgents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No agents deployed yet.
              </div>
            ) : (
              topAgents.map((agent, i) => (
                <div
                  key={agent.id}
                  className="w-full px-4 py-2.5 border-b border-border/30 hover:bg-muted/20 transition-colors flex items-center gap-3"
                >
                  <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">#{i + 1}</span>
                  <span className="text-base">{CLASS_ICONS[agent.class] || "🤖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">{agent.name}</span>
                      <span className={`text-[9px] font-mono ${CLASS_COLORS[agent.class] || "text-muted-foreground"}`}>
                        Lv.{agent.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{agent.class}</span>
                      {agent.nation_code && (
                        <span className="text-[10px] text-muted-foreground">· {agent.nation_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-primary font-semibold">
                      {Number(agent.balance_meeet ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-end">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {agent.reputation}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            recentEvents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No world events yet. Events will appear as they sync from global data sources.
              </div>
            ) : (
              recentEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => handleEventClick(ev)}
                  className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-muted/20 transition-colors ${
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
            )
          )}
        </div>
      </div>

      {/* Event Detail Panel */}
      {detailOpen && selectedEvent && (
        <div className="absolute right-0 top-[5.75rem] bottom-0 w-96 z-10 bg-background/90 backdrop-blur-xl border-l border-border overflow-y-auto animate-fade-in">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg border ${EVENT_COLORS[selectedEvent.event_type] || "border-border bg-muted/20"}`}>
                {EVENT_ICONS[selectedEvent.event_type] || <Zap className="w-5 h-5 text-muted-foreground" />}
              </div>
              <button onClick={() => setDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{selectedEvent.event_type}</div>
            <h3 className="text-sm font-display font-bold text-foreground leading-snug mb-3">{selectedEvent.title}</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Time</span>
                <span className="text-foreground">{new Date(selectedEvent.created_at).toLocaleString()}</span>
              </div>
              {selectedEvent.goldstein_scale != null && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Goldstein Scale</span>
                  <span className={`font-mono font-semibold ${selectedEvent.goldstein_scale < -4 ? "text-red-400" : selectedEvent.goldstein_scale > 4 ? "text-green-400" : "text-foreground"}`}>
                    {selectedEvent.goldstein_scale}
                  </span>
                </div>
              )}
              {selectedEvent.lat != null && selectedEvent.lng != null && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Coordinates</span>
                  <span className="font-mono text-foreground">{selectedEvent.lat.toFixed(2)}, {selectedEvent.lng.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default World;
