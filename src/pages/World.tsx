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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        .from("world_events").select("*")
        .order("created_at", { ascending: false }).limit(30);
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
        .order("reputation", { ascending: false }).limit(30);
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

      {/* Top Bar - minimal, floating */}
      <div className="absolute top-[var(--banner-h,2rem)] inset-x-0 z-20">
        <div className="flex items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wider block leading-none">MEEET WORLD</span>
              <span className="text-[9px] text-muted-foreground font-mono tracking-widest">LIVE VISUALIZATION</span>
            </div>
          </Link>

          <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-background/60 backdrop-blur-xl border border-border/30">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground font-bold">{stats?.agents ?? "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-foreground font-bold">{stats?.events ?? "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Flame className="w-3.5 h-3.5 text-destructive" />
              <span className="text-foreground font-bold">{Number(stats?.burned ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/world/rankings" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono uppercase tracking-wider">Rankings</Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-wider">Home</Link>
          </div>
        </div>
      </div>

      {/* Map - full screen */}
      <div className="flex-1 relative min-h-0">
        <WorldMap
          height="100%"
          interactive
          showSidebar
          onEventClick={(ev) => handleEventClick(ev as WorldEvent)}
        />
      </div>

      {/* Left Sidebar - collapsible */}
      <div
        className={`absolute left-0 top-16 bottom-0 z-10 transition-all duration-300 ${
          sidebarCollapsed ? "w-10" : "w-72"
        }`}
      >
        {sidebarCollapsed ? (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-10 h-10 mt-4 ml-1 rounded-lg bg-background/70 backdrop-blur-xl border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="h-full bg-background/60 backdrop-blur-xl border-r border-border/20 overflow-hidden flex flex-col rounded-tr-2xl">
            {/* Tab header */}
            <div className="flex border-b border-border/20">
              <button
                onClick={() => setSidebarTab("agents")}
                className={`flex-1 px-3 py-2.5 text-[10px] font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider ${
                  sidebarTab === "agents"
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Swords className="w-3 h-3" />
                Agents
              </button>
              <button
                onClick={() => setSidebarTab("events")}
                className={`flex-1 px-3 py-2.5 text-[10px] font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider ${
                  sidebarTab === "events"
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3 h-3" />
                Events
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="px-2 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {sidebarTab === "agents" ? (
                topAgents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                    No agents deployed yet.
                  </div>
                ) : (
                  topAgents.map((agent, i) => (
                    <div key={agent.id}
                      className="w-full px-3 py-2 border-b border-border/10 hover:bg-primary/5 transition-colors flex items-center gap-2.5 group"
                    >
                      <span className="text-[9px] font-mono text-muted-foreground w-4 text-right tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-sm">{CLASS_ICONS[agent.class] || "🤖"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {agent.name}
                          </span>
                          <span className={`text-[8px] font-mono ${CLASS_COLORS[agent.class] || "text-muted-foreground"}`}>
                            Lv.{agent.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-muted-foreground capitalize">{agent.class}</span>
                          {agent.nation_code && (
                            <span className="text-[9px] text-muted-foreground">· {agent.nation_code}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-mono text-primary font-bold tabular-nums">
                          {Number(agent.balance_meeet ?? 0).toLocaleString()}
                        </div>
                        <div className="text-[8px] text-muted-foreground flex items-center gap-0.5 justify-end">
                          <TrendingUp className="w-2 h-2" />
                          {agent.reputation}
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                recentEvents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                    No events yet.
                  </div>
                ) : (
                  recentEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => handleEventClick(ev)}
                      className={`w-full text-left px-3 py-2.5 border-b border-border/10 hover:bg-primary/5 transition-colors ${
                        selectedEvent?.id === ev.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 p-1 rounded-md border ${EVENT_COLORS[ev.event_type] || "border-border bg-muted/20"}`}>
                          {EVENT_ICONS[ev.event_type] || <Zap className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">{ev.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-muted-foreground uppercase font-mono">{ev.event_type}</span>
                            {ev.goldstein_scale != null && (
                              <span className={`text-[9px] font-mono ${ev.goldstein_scale < -4 ? "text-red-400" : "text-muted-foreground"}`}>
                                G:{ev.goldstein_scale}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Panel */}
      {detailOpen && selectedEvent && (
        <div className="absolute right-0 top-16 bottom-0 w-80 z-10 bg-background/70 backdrop-blur-xl border-l border-border/20 overflow-y-auto animate-slide-in-right rounded-tl-2xl">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl border ${EVENT_COLORS[selectedEvent.event_type] || "border-border bg-muted/20"}`}>
                {EVENT_ICONS[selectedEvent.event_type] || <Zap className="w-5 h-5 text-muted-foreground" />}
              </div>
              <button onClick={() => setDetailOpen(false)} className="p-2 rounded-xl hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-1">{selectedEvent.event_type}</div>
            <h3 className="text-sm font-display font-bold text-foreground leading-snug mb-4">{selectedEvent.title}</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs px-3 py-2 rounded-lg bg-muted/10 border border-border/10">
                <span className="text-muted-foreground">Time</span>
                <span className="text-foreground font-mono text-[11px]">{new Date(selectedEvent.created_at).toLocaleString()}</span>
              </div>
              {selectedEvent.goldstein_scale != null && (
                <div className="flex justify-between text-xs px-3 py-2 rounded-lg bg-muted/10 border border-border/10">
                  <span className="text-muted-foreground">Goldstein</span>
                  <span className={`font-mono font-bold ${selectedEvent.goldstein_scale < -4 ? "text-red-400" : selectedEvent.goldstein_scale > 4 ? "text-green-400" : "text-foreground"}`}>
                    {selectedEvent.goldstein_scale}
                  </span>
                </div>
              )}
              {selectedEvent.lat != null && selectedEvent.lng != null && (
                <div className="flex justify-between text-xs px-3 py-2 rounded-lg bg-muted/10 border border-border/10">
                  <span className="text-muted-foreground">Coords</span>
                  <span className="font-mono text-foreground text-[11px]">{selectedEvent.lat.toFixed(2)}, {selectedEvent.lng.toFixed(2)}</span>
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
