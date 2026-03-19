import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Link } from "react-router-dom";
import WorldMap from "@/components/WorldMap";
import LiveStatsBanner from "@/components/LiveStatsBanner";
import {
  Globe, Users, Flame, Zap, ChevronRight, AlertTriangle,
  Sparkles, Shield, Swords, X, TrendingUp, Scroll, Crown, Heart
} from "lucide-react";

interface WorldEvent {
  id: string; event_type: string; title: string;
  lat: number | null; lng: number | null;
  nation_codes: any; goldstein_scale: number | null; created_at: string;
}

interface Agent {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number;
  nation_code: string | null; status: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  conflict: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  disaster: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  discovery: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
  diplomacy: <Shield className="w-3.5 h-3.5 text-green-400" />,
};

const CLASS_SPRITES: Record<string, string> = {
  warrior: "⚔️", trader: "💰", scout: "🔭", diplomat: "🤝",
  builder: "🏗️", hacker: "💻", president: "👑", oracle: "🔮",
  miner: "⛏️", banker: "🏦",
};

const CLASS_BAR_COLORS: Record<string, string> = {
  warrior: "#ff4444", trader: "#ffbb33", scout: "#44ff88",
  diplomat: "#4488ff", builder: "#bb66ff", hacker: "#ff66bb",
  president: "#ffdd00", oracle: "#ffcc44", miner: "#44ddff", banker: "#aa66ff",
};

type SidebarTab = "party" | "quests";

const World = () => {
  const [selectedEvent, setSelectedEvent] = useState<WorldEvent | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("party");
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
      return { agents: agentsRes.count ?? 0, events: eventsRes.count ?? 0, burned: treasuryRes.data?.total_burned ?? 0 };
    },
    refetchInterval: 30000,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ["world-events-sidebar"],
    queryFn: async () => {
      const { data } = await supabase.from("world_events").select("*")
        .order("created_at", { ascending: false }).limit(30);
      return (data ?? []) as WorldEvent[];
    },
    refetchInterval: 60000,
  });

  const { data: topAgents = [] } = useQuery({
    queryKey: ["world-top-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_public")
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

  const maxRep = topAgents.length > 0 ? Math.max(...topAgents.map(a => a.reputation)) : 1;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a12] relative flex flex-col">
      <LiveStatsBanner />

      {/* Top Bar */}
      <div className="absolute top-[var(--banner-h,2rem)] inset-x-0 z-20">
        <div className="flex items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rpg-box px-3 py-1.5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-mono font-bold text-xs tracking-widest text-amber-100 block leading-none">MEEET WORLD</span>
                <span className="text-[7px] text-amber-100/30 font-mono tracking-[0.3em]">PIXEL REALM v5</span>
              </div>
            </div>
          </Link>

          <div className="rpg-box flex items-center gap-4 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="rpg-stat-value text-emerald-400">{stats?.agents ?? "—"}</span>
            </div>
            <div className="rpg-divider" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="rpg-stat-value text-amber-400">{stats?.events ?? "—"}</span>
            </div>
            <div className="rpg-divider" />
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span className="rpg-stat-value text-red-400">{Number(stats?.burned ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/world/rankings" className="rpg-link">RANKINGS</Link>
            <Link to="/" className="rpg-link">HOME</Link>
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
      <div className={`absolute left-0 top-16 bottom-0 z-10 transition-all duration-300 ${sidebarCollapsed ? "w-10" : "w-72"}`}>
        {sidebarCollapsed ? (
          <button onClick={() => setSidebarCollapsed(false)} className="rpg-box-btn mt-4 ml-1">
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="h-full rpg-sidebar overflow-hidden flex flex-col">
            {/* Tab header */}
            <div className="flex border-b-2 border-amber-900/30">
              <button
                onClick={() => setSidebarTab("party")}
                className={`flex-1 px-3 py-2 text-[9px] font-mono font-bold tracking-widest flex items-center justify-center gap-1.5 ${
                  sidebarTab === "party"
                    ? "text-amber-400 bg-amber-400/5 border-b-2 border-amber-400"
                    : "text-amber-100/30 hover:text-amber-100/60"
                }`}
              >
                <Swords className="w-3 h-3" />PARTY
              </button>
              <button
                onClick={() => setSidebarTab("quests")}
                className={`flex-1 px-3 py-2 text-[9px] font-mono font-bold tracking-widest flex items-center justify-center gap-1.5 ${
                  sidebarTab === "quests"
                    ? "text-amber-400 bg-amber-400/5 border-b-2 border-amber-400"
                    : "text-amber-100/30 hover:text-amber-100/60"
                }`}
              >
                <Scroll className="w-3 h-3" />QUESTS
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="px-2 py-2 text-amber-100/20 hover:text-amber-100/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {sidebarTab === "party" ? (
                topAgents.length === 0 ? (
                  <div className="p-6 text-center text-amber-100/30 text-[10px] font-mono">
                    No heroes have joined yet...
                  </div>
                ) : (
                  topAgents.map((agent, i) => {
                    const repFrac = agent.reputation / (maxRep || 1);
                    const barColor = CLASS_BAR_COLORS[agent.class] || "#9945FF";
                    return (
                      <div key={agent.id}
                        className="w-full px-3 py-2 border-b border-amber-900/10 hover:bg-amber-400/5 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          {/* Rank */}
                          <span className="text-[8px] font-mono text-amber-100/20 w-4 text-right tabular-nums">
                            {i < 3 ? <Crown className="w-3 h-3 inline" style={{ color: i === 0 ? "#ffdd00" : i === 1 ? "#c0c0c0" : "#cd7f32" }} /> : `${i + 1}.`}
                          </span>
                          {/* Class icon */}
                          <span className="text-sm">{CLASS_SPRITES[agent.class] || "🤖"}</span>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-amber-100/90 truncate group-hover:text-amber-400 transition-colors">
                                {agent.name}
                              </span>
                              <span className="text-[7px] font-mono px-1 py-0 rounded-sm" style={{ backgroundColor: `${barColor}20`, color: barColor }}>
                                LV{agent.level}
                              </span>
                            </div>
                            {/* REP bar */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="flex-1 h-1 bg-amber-900/20 rounded-full overflow-hidden" style={{ imageRendering: "pixelated" }}>
                                <div
                                  className="h-full transition-all duration-700"
                                  style={{ width: `${repFrac * 100}%`, backgroundColor: barColor }}
                                />
                              </div>
                              <span className="text-[7px] font-mono text-amber-100/30 tabular-nums w-8 text-right">{agent.reputation}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[8px] text-amber-100/25 capitalize font-mono">{agent.class}</span>
                              {agent.nation_code && (
                                <span className="text-[8px] text-amber-100/15 font-mono">· {agent.nation_code}</span>
                              )}
                              {agent.status === "active" && (
                                <span className="rpg-dot bg-emerald-400 w-1 h-1 ml-auto" />
                              )}
                            </div>
                          </div>
                          {/* Balance */}
                          <div className="text-right shrink-0">
                            <div className="text-[9px] font-mono text-emerald-400/80 font-bold tabular-nums">
                              {Number(agent.balance_meeet ?? 0).toLocaleString()}
                              <span className="text-[7px] text-emerald-400/40 ml-0.5">G</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                recentEvents.length === 0 ? (
                  <div className="p-6 text-center text-amber-100/30 text-[10px] font-mono">
                    No world events discovered...
                  </div>
                ) : (
                  recentEvents.map((ev) => {
                    const impactColor = ev.goldstein_scale != null
                      ? ev.goldstein_scale < -4 ? "text-red-400" : ev.goldstein_scale > 4 ? "text-emerald-400" : "text-amber-100/40"
                      : "text-amber-100/20";
                    const impactBg = ev.goldstein_scale != null
                      ? ev.goldstein_scale < -4 ? "bg-red-400/10" : ev.goldstein_scale > 4 ? "bg-emerald-400/10" : ""
                      : "";
                    return (
                      <button
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className={`w-full text-left px-3 py-2.5 border-b border-amber-900/10 hover:bg-amber-400/5 transition-colors ${
                          selectedEvent?.id === ev.id ? "bg-amber-400/10 border-l-2 border-l-amber-400" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 rpg-box p-1">
                            {EVENT_ICONS[ev.event_type] || <Zap className="w-3 h-3 text-amber-100/40" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono text-amber-100/80 leading-snug line-clamp-2">{ev.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[8px] text-amber-100/25 uppercase font-mono px-1 py-0.5 bg-amber-400/5 rounded-sm">{ev.event_type}</span>
                              {ev.goldstein_scale != null && (
                                <span className={`text-[8px] font-mono font-bold ${impactColor} px-1 py-0.5 rounded-sm ${impactBg}`}>
                                  G:{ev.goldstein_scale}
                                </span>
                              )}
                              <span className="text-[7px] text-amber-100/15 font-mono ml-auto">
                                {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )
              )}
            </div>

            {/* Sidebar footer stats */}
            <div className="border-t-2 border-amber-900/30 px-3 py-2 flex items-center justify-between">
              <span className="text-[7px] font-mono text-amber-100/20 tracking-widest">
                {sidebarTab === "party" ? `${topAgents.length} HEROES` : `${recentEvents.length} EVENTS`}
              </span>
              <span className="rpg-dot bg-emerald-400 w-1.5 h-1.5" />
            </div>
          </div>
        )}
      </div>

      {/* Event Detail */}
      {detailOpen && selectedEvent && (
        <div className="absolute right-0 top-16 bottom-0 w-80 z-10 rpg-sidebar overflow-y-auto animate-slide-in-right">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="rpg-box p-2.5">
                {EVENT_ICONS[selectedEvent.event_type] || <Zap className="w-5 h-5 text-amber-100/40" />}
              </div>
              <button onClick={() => setDetailOpen(false)} className="rpg-box-btn">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[8px] text-amber-400/60 uppercase tracking-[0.3em] font-mono mb-1">{selectedEvent.event_type}</div>
            <h3 className="text-xs font-mono font-bold text-amber-100/90 leading-snug mb-5">{selectedEvent.title}</h3>

            {/* Impact gauge */}
            {selectedEvent.goldstein_scale != null && (
              <div className="mb-4">
                <div className="rpg-section-label mb-1">IMPACT SCALE</div>
                <div className="h-2 bg-amber-900/20 rounded-full overflow-hidden relative" style={{ imageRendering: "pixelated" }}>
                  <div
                    className="absolute inset-y-0 left-1/2 transition-all duration-500"
                    style={{
                      width: `${Math.abs(selectedEvent.goldstein_scale) * 5}%`,
                      backgroundColor: selectedEvent.goldstein_scale < 0 ? "#ff4444" : "#44ff88",
                      transform: selectedEvent.goldstein_scale < 0 ? "translateX(-100%)" : "translateX(0)",
                    }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-amber-400/30" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[7px] font-mono text-red-400/50">HOSTILE</span>
                  <span className={`text-[9px] font-mono font-bold ${selectedEvent.goldstein_scale < -4 ? "text-red-400" : selectedEvent.goldstein_scale > 4 ? "text-emerald-400" : "text-amber-100/60"}`}>
                    {selectedEvent.goldstein_scale}
                  </span>
                  <span className="text-[7px] font-mono text-emerald-400/50">PEACEFUL</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="rpg-info-row">
                <span>TIME</span>
                <span className="text-amber-100/70">{new Date(selectedEvent.created_at).toLocaleString()}</span>
              </div>
              {selectedEvent.lat != null && selectedEvent.lng != null && (
                <div className="rpg-info-row">
                  <span>COORDS</span>
                  <span className="text-amber-100/70">{selectedEvent.lat.toFixed(2)}, {selectedEvent.lng.toFixed(2)}</span>
                </div>
              )}
              {selectedEvent.nation_codes && (
                <div className="rpg-info-row">
                  <span>NATIONS</span>
                  <span className="text-amber-100/70">{JSON.stringify(selectedEvent.nation_codes)}</span>
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
