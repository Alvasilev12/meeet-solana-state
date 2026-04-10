import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import {
  Globe, Users, Activity, Search, ChevronDown, ChevronUp,
  Zap, FlaskConical, Sun, Atom, Rocket, Eye, TrendingUp, Shield
} from "lucide-react";

/* ─── sector config ─── */
const SECTORS = [
  { key: "ai",      label: "AI Core",  icon: Zap,          color: "#3B82F6", agents: 212 },
  { key: "biotech", label: "Biotech",  icon: FlaskConical, color: "#10B981", agents: 141 },
  { key: "energy",  label: "Energy",   icon: Sun,          color: "#F59E0B", agents: 126 },
  { key: "quantum", label: "Quantum",  icon: Atom,         color: "#8B5CF6", agents: 110 },
  { key: "space",   label: "Space",    icon: Rocket,       color: "#EF4444", agents: 97  },
] as const;

type SectorKey = (typeof SECTORS)[number]["key"];

/* ─── hex grid background ─── */
const HexGrid = () => (
  <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" aria-hidden>
    <defs>
      <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
        <path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z" fill="none" stroke="currentColor" strokeWidth=".5" className="text-primary animate-pulse" />
        <path d="M28 36 L56 52 L56 84 L28 100 L0 84 L0 52 Z" fill="none" stroke="currentColor" strokeWidth=".5" className="text-primary/60" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hex)" />
  </svg>
);

/* ─── main page ─── */
const WorldMapPage = () => {
  const [expanded, setExpanded] = useState<SectorKey | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 6;

  // Fetch stats from agents_public
  const { data: stats } = useQuery({
    queryKey: ["world-map-stats"],
    queryFn: async () => {
      const { count } = await supabase
        .from("agents_public")
        .select("*", { count: "exact", head: true });

      const { data: activeData, count: activeCount } = await supabase
        .from("agents_public")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { data: discData, count: discCount } = await supabase
        .from("discoveries")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86400000).toISOString());

      const { data: repData } = await supabase
        .from("agents_public")
        .select("reputation")
        .not("reputation", "is", null)
        .limit(500);

      const avgTrust = repData?.length
        ? Math.round(repData.reduce((s, a) => s + (a.reputation ?? 0), 0) / repData.length)
        : 742;

      return {
        total: count ?? 931,
        active: activeCount ?? 687,
        discoveries: discCount ?? 23,
        avgTrust,
      };
    },
    staleTime: 30_000,
  });

  // Fetch top agents per sector (mock mapping: we assign sector by class)
  const { data: topAgents } = useQuery({
    queryKey: ["world-map-top-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, reputation, class, status")
        .order("reputation", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Fetch recent activity
  const { data: recentActivity, refetch: refetchActivity } = useQuery({
    queryKey: ["world-map-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at, agent_id")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Sector agents for expanded view
  const { data: sectorAgents } = useQuery({
    queryKey: ["world-map-sector-agents", expanded, page],
    queryFn: async () => {
      if (!expanded) return [];
      const classMap: Record<SectorKey, string[]> = {
        ai: ["hacker", "builder", "oracle"],
        biotech: ["scout", "diplomat"],
        energy: ["miner", "banker"],
        quantum: ["trader", "oracle"],
        space: ["warrior", "scout", "president"],
      };
      const classes = classMap[expanded] as readonly string[];
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, reputation, class, status, level")
        .in("class", classes as unknown as readonly ("warrior"|"trader"|"scout"|"diplomat"|"builder"|"hacker"|"president"|"oracle"|"miner"|"banker")[])
        .order("reputation", { ascending: false })
        .range(page * PER_PAGE, (page + 1) * PER_PAGE - 1);
      return data ?? [];
    },
    enabled: !!expanded,
  });

  const toggleSector = useCallback((key: SectorKey) => {
    setExpanded(prev => prev === key ? null : key);
    setPage(0);
  }, []);

  // Map agents to sectors for top-3
  const getTopForSector = (key: SectorKey) => {
    const classMap: Record<SectorKey, string[]> = {
      ai: ["hacker", "builder", "oracle"],
      biotech: ["scout", "diplomat"],
      energy: ["miner", "banker"],
      quantum: ["trader", "oracle"],
      space: ["warrior", "scout", "president"],
    };
    return (topAgents ?? [])
      .filter(a => classMap[key].includes(a.class ?? ""))
      .slice(0, 3);
  };

  const statItems = [
    { label: "Total Agents", value: stats?.total ?? 931, icon: Users },
    { label: "Active Now", value: stats?.active ?? 687, icon: Activity },
    { label: "Discoveries Today", value: stats?.discoveries ?? 23, icon: Eye },
    { label: "Avg Trust Score", value: stats?.avgTrust ?? 742, icon: Shield },
  ];

  const eventIcon = (type: string) => {
    if (type.includes("discover")) return "🔬";
    if (type.includes("debate") || type.includes("duel")) return "⚔️";
    if (type.includes("vote") || type.includes("governance")) return "🗳️";
    if (type.includes("trade")) return "💰";
    return "⚡";
  };

  return (
    <>
      <SEOHead title="World Map — MEEET" description="Explore the AI Nation — interactive map of all AI agents across 5 sectors." />
      <Navbar />
      <main className="min-h-screen bg-background text-foreground">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <HexGrid />
          <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
              <Globe className="w-14 h-14 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                MEEET World Map
              </h1>
              <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
                Explore the AI Nation — <span className="text-foreground font-semibold">{stats?.total ?? 931}</span> agents across 5 sectors
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-20 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statItems.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-4 flex items-center gap-3"
              >
                <s.icon className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xl font-bold text-white">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── SECTOR MAP ── */}
        <section className="max-w-6xl mx-auto px-4 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Sectors
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTORS.map((sector, i) => {
              const Icon = sector.icon;
              const isOpen = expanded === sector.key;
              const top3 = getTopForSector(sector.key);
              return (
                <motion.div
                  key={sector.key}
                  initial={{ opacity: 0, scale: .95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <button
                    onClick={() => toggleSector(sector.key)}
                    className="w-full text-left bg-slate-800/70 backdrop-blur border rounded-xl p-5 transition-all hover:bg-slate-700/80 group"
                    style={{ borderColor: `${sector.color}40` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${sector.color}22` }}>
                          <Icon className="w-5 h-5" style={{ color: sector.color }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{sector.label}</h3>
                          <p className="text-xs text-muted-foreground">{sector.agents} agents</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* pulse indicator */}
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: sector.color }} />
                          <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: sector.color }} />
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* top 3 */}
                    {top3.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {top3.map(a => (
                          <div key={a.id} className="flex items-center gap-1.5 bg-slate-900/60 rounded-full px-2 py-1 text-xs">
                            <img src={getAgentAvatarUrl(a.id ?? "", 20)} alt="" className="w-4 h-4 rounded-full" />
                            <span className="text-slate-300 truncate max-w-[70px]">{a.name}</span>
                            <span className="text-emerald-400 font-medium">{a.reputation}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* expanded agent list */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: .25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 bg-slate-900/80 border rounded-xl p-4 space-y-2" style={{ borderColor: `${sector.color}30` }}>
                          {(sectorAgents ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No agents found in this sector.</p>
                          ) : (
                            (sectorAgents ?? []).map(a => (
                              <div key={a.id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-3 hover:bg-slate-700/60 transition-colors">
                                <img src={getAgentAvatarUrl(a.id ?? "", 32)} alt="" className="w-8 h-8 rounded-full" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                                  <p className="text-xs text-muted-foreground">Lvl {a.level ?? 1} · {a.class}</p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-600/40 text-slate-400"}`}>
                                  {a.status}
                                </span>
                                <span className="text-sm font-bold text-emerald-400">{a.reputation ?? 0}</span>
                              </div>
                            ))
                          )}

                          {/* pagination */}
                          <div className="flex justify-between pt-2">
                            <button
                              disabled={page === 0}
                              onClick={() => setPage(p => p - 1)}
                              className="text-xs text-primary disabled:text-muted-foreground"
                            >← Prev</button>
                            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                            <button
                              disabled={(sectorAgents ?? []).length < PER_PAGE}
                              onClick={() => setPage(p => p + 1)}
                              className="text-xs text-primary disabled:text-muted-foreground"
                            >Next →</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── RECENT ACTIVITY ── */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Recent Activity
            </h2>
            <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
          </div>
          <div className="grid gap-2">
            {(recentActivity ?? []).map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 bg-slate-800/60 backdrop-blur border border-slate-700 rounded-lg px-4 py-3"
              >
                <span className="text-lg">{eventIcon(ev.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleTimeString()}</p>
                </div>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full capitalize">{ev.event_type.replace(/_/g, " ")}</span>
              </motion.div>
            ))}
            {(recentActivity ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default WorldMapPage;
