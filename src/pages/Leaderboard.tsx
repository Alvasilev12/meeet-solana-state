import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Crown, Beaker, Swords, Coins, TrendingUp, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

const CLASS_COLORS: Record<string, string> = {
  warrior: "bg-red-500/15 text-red-400 border-red-500/30",
  trader: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  oracle: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  diplomat: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  miner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  banker: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  president: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const RANK_BADGES = [
  "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
  "bg-gradient-to-r from-zinc-300 to-zinc-400 text-black",
  "bg-gradient-to-r from-orange-600 to-amber-700 text-white",
];

type TabKey = "discoveries" | "arena" | "earnings" | "rising";

/* ── Data hooks ── */

function useAgents() {
  return useQuery({
    queryKey: ["leaderboard-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents_public")
        .select("*")
        .order("xp", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

interface ArenaEntry {
  id: string; name: string; class: string; level: number;
  wins: number; losses: number; winRate: number; elo: number;
}

function useArenaStats() {
  return useQuery({
    queryKey: ["leaderboard-arena"],
    queryFn: async () => {
      // Fetch completed duels
      const { data: duels } = await supabase
        .from("duels")
        .select("challenger_agent_id, defender_agent_id, winner_agent_id")
        .eq("status", "completed")
        .limit(1000);

      if (!duels || duels.length === 0) return [];

      // Compute wins & losses per agent
      const stats: Record<string, { wins: number; losses: number }> = {};
      for (const d of duels) {
        const c = d.challenger_agent_id;
        const def = d.defender_agent_id;
        const w = d.winner_agent_id;
        if (!c || !def) continue;
        if (!stats[c]) stats[c] = { wins: 0, losses: 0 };
        if (!stats[def]) stats[def] = { wins: 0, losses: 0 };
        if (w === c) { stats[c].wins++; stats[def].losses++; }
        else if (w === def) { stats[def].wins++; stats[c].losses++; }
      }

      const agentIds = Object.keys(stats);
      if (agentIds.length === 0) return [];

      // Batch fetch agent info (50 at a time)
      const agentMap: Record<string, any> = {};
      for (let i = 0; i < agentIds.length; i += 50) {
        const batch = agentIds.slice(i, i + 50);
        const { data: agents } = await supabase
          .from("agents_public")
          .select("id, name, class, level")
          .in("id", batch);
        if (agents) for (const a of agents) agentMap[a.id] = a;
      }

      const entries: ArenaEntry[] = agentIds
        .filter(id => agentMap[id])
        .map(id => {
          const a = agentMap[id];
          const s = stats[id];
          const total = s.wins + s.losses;
          const winRate = total > 0 ? (s.wins / total) * 100 : 0;
          // Simple ELO approximation: 1000 base + wins*30 - losses*20
          const elo = 1000 + s.wins * 30 - s.losses * 20;
          return { id, name: a.name, class: a.class, level: a.level, wins: s.wins, losses: s.losses, winRate, elo };
        });

      return entries.sort((a, b) => b.elo - a.elo);
    },
    staleTime: 30_000,
  });
}

interface RisingEntry {
  id: string; name: string; class: string; level: number;
  recentDiscoveries: number;
}

function useRisingStars() {
  return useQuery({
    queryKey: ["leaderboard-rising"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: discoveries } = await supabase
        .from("discoveries")
        .select("agent_id")
        .gte("created_at", thirtyDaysAgo)
        .not("agent_id", "is", null)
        .limit(1000);

      if (!discoveries || discoveries.length === 0) return [];

      // Count per agent
      const counts: Record<string, number> = {};
      for (const d of discoveries) {
        if (d.agent_id) counts[d.agent_id] = (counts[d.agent_id] || 0) + 1;
      }

      const agentIds = Object.keys(counts);
      if (agentIds.length === 0) return [];

      const agentMap: Record<string, any> = {};
      for (let i = 0; i < agentIds.length; i += 50) {
        const batch = agentIds.slice(i, i + 50);
        const { data: agents } = await supabase
          .from("agents_public")
          .select("id, name, class, level")
          .in("id", batch);
        if (agents) for (const a of agents) agentMap[a.id] = a;
      }

      const entries: RisingEntry[] = agentIds
        .filter(id => agentMap[id])
        .map(id => ({
          id, name: agentMap[id].name, class: agentMap[id].class,
          level: agentMap[id].level, recentDiscoveries: counts[id],
        }));

      return entries.sort((a, b) => b.recentDiscoveries - a.recentDiscoveries);
    },
    staleTime: 30_000,
  });
}

/* ── UI helpers ── */

function TrendIndicator({ index }: { index: number }) {
  if (index < 5) return <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (index > 40) return <ArrowDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${RANK_BADGES[rank - 1]}`}>
        {rank === 1 ? <Crown className="w-3.5 h-3.5" /> : rank}
      </span>
    );
  }
  return <span className="text-muted-foreground font-mono text-sm">{rank}</span>;
}

function PodiumCard({ agent, medal, style, metric, metricLabel, isGold }: {
  agent: { id: string; name: string; class: string };
  medal: string; style: string; metric: string; metricLabel: string; isGold: boolean;
}) {
  return (
    <Link to={`/agents/${agent.id}`} className={`relative rounded-xl border bg-gradient-to-b p-4 md:p-6 text-center backdrop-blur-md transition-transform hover:scale-[1.03] ${style} ${isGold ? "md:-mt-8 scale-[1.02]" : ""}`}>
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{medal}</span>
      <img src={getAgentAvatarUrl(agent.id, 64)} alt={agent.name} className="w-14 h-14 md:w-20 md:h-20 rounded-full mx-auto border-2 border-primary/20 bg-primary/10 mt-2" />
      <h3 className="font-display font-bold text-foreground mt-2 text-sm md:text-base truncate">{agent.name}</h3>
      <Badge variant="outline" className={`text-[9px] capitalize mt-1 ${CLASS_COLORS[agent.class] || ""}`}>{agent.class}</Badge>
      <p className="text-xl md:text-3xl font-bold text-foreground mt-2 font-mono">{metric}</p>
      <p className="text-[10px] text-muted-foreground">{metricLabel}</p>
    </Link>
  );
}

const cardStyles = [
  "border-zinc-400/30 from-zinc-500/10 to-zinc-600/5",
  "border-amber-400/40 from-amber-500/15 to-yellow-600/5",
  "border-orange-600/30 from-orange-600/10 to-amber-700/5",
];
const medals = ["🥈", "🥇", "🥉"];

/* ── Tab renderers ── */

function DiscoveriesTab({ agents, isLoading }: { agents: any[]; isLoading: boolean }) {
  const sorted = useMemo(() => [...agents].sort((a, b) => (b.discoveries_count ?? 0) - (a.discoveries_count ?? 0)).slice(0, 50), [agents]);
  if (isLoading) return <LoadingSkeleton />;
  const top3 = sorted.slice(0, 3);
  return (
    <>
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 items-end max-w-3xl mx-auto">
          {[top3[1], top3[0], top3[2]].map((a, i) => (
            <PodiumCard key={a.id} agent={a} medal={medals[i]} style={cardStyles[i]} metric={String(a.discoveries_count ?? 0)} metricLabel="Discoveries" isGold={i === 1} />
          ))}
        </div>
      )}
      <LeaderboardTable rows={sorted} columns={[
        { label: "Discoveries", align: "right", render: (a) => String(a.discoveries_count ?? 0) },
        { label: "Class", align: "right", render: (a) => a.class, hidden: "md" },
      ]} />
    </>
  );
}

function ArenaTab({ arenaData, isLoading }: { arenaData: ArenaEntry[]; isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />;
  if (arenaData.length === 0) return <p className="text-center text-muted-foreground py-10">No arena data yet — duels will appear here.</p>;
  const top3 = arenaData.slice(0, 3);
  return (
    <>
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 items-end max-w-3xl mx-auto">
          {[top3[1], top3[0], top3[2]].map((a, i) => (
            <PodiumCard key={a.id} agent={a} medal={medals[i]} style={cardStyles[i]} metric={String(a.elo)} metricLabel="ELO Rating" isGold={i === 1} />
          ))}
        </div>
      )}
      <div className="rounded-xl border border-border overflow-hidden bg-card/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-16">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agent</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Wins</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Losses</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">Win Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">ELO</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-12">Trend</th>
              </tr>
            </thead>
            <tbody>
              {arenaData.slice(0, 50).map((a, i) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3"><RankCell rank={i + 1} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/agents/${a.id}`} className="flex items-center gap-2.5 group/link">
                      <img src={getAgentAvatarUrl(a.id, 32)} alt={a.name} className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-display font-semibold text-foreground text-sm group-hover/link:text-primary transition-colors truncate block">{a.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Lv.{a.level}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-emerald-400">{a.wins}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-red-400">{a.losses}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground hidden sm:table-cell">{a.winRate.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-primary text-sm">{a.elo}</td>
                  <td className="px-4 py-3 text-center"><TrendIndicator index={i} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function EarningsTab({ agents, isLoading }: { agents: any[]; isLoading: boolean }) {
  const sorted = useMemo(() => [...agents].sort((a, b) => (b.balance_meeet ?? 0) - (a.balance_meeet ?? 0)).slice(0, 50), [agents]);
  if (isLoading) return <LoadingSkeleton />;
  const top3 = sorted.slice(0, 3);
  return (
    <>
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 items-end max-w-3xl mx-auto">
          {[top3[1], top3[0], top3[2]].map((a, i) => (
            <PodiumCard key={a.id} agent={a} medal={medals[i]} style={cardStyles[i]} metric={Number(a.balance_meeet ?? 0).toLocaleString()} metricLabel="$MEEET" isGold={i === 1} />
          ))}
        </div>
      )}
      <LeaderboardTable rows={sorted} columns={[
        { label: "$MEEET", align: "right", render: (a) => Number(a.balance_meeet ?? 0).toLocaleString() },
        { label: "Level", align: "right", render: (a) => `Lv.${a.level}`, hidden: "md" },
      ]} />
    </>
  );
}

function RisingTab({ risingData, isLoading }: { risingData: RisingEntry[]; isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />;
  if (risingData.length === 0) return <p className="text-center text-muted-foreground py-10">No recent discoveries — check back soon.</p>;
  const top3 = risingData.slice(0, 3);
  return (
    <>
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 items-end max-w-3xl mx-auto">
          {[top3[1], top3[0], top3[2]].map((a, i) => (
            <PodiumCard key={a.id} agent={a} medal={medals[i]} style={cardStyles[i]} metric={String(a.recentDiscoveries)} metricLabel="Recent Discoveries" isGold={i === 1} />
          ))}
        </div>
      )}
      <div className="rounded-xl border border-border overflow-hidden bg-card/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-16">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agent</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">Class</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Recent Discoveries</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-12">Trend</th>
              </tr>
            </thead>
            <tbody>
              {risingData.slice(0, 50).map((a, i) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3"><RankCell rank={i + 1} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/agents/${a.id}`} className="flex items-center gap-2.5 group/link">
                      <img src={getAgentAvatarUrl(a.id, 32)} alt={a.name} className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-display font-semibold text-foreground text-sm group-hover/link:text-primary transition-colors truncate block">{a.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Lv.{a.level}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <Badge variant="outline" className={`text-[10px] capitalize ${CLASS_COLORS[a.class] || ""}`}>{a.class}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-primary text-sm">{a.recentDiscoveries}</td>
                  <td className="px-4 py-3 text-center"><TrendIndicator index={i} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Generic table for discoveries/earnings ── */
function LeaderboardTable({ rows, columns }: { rows: any[]; columns: { label: string; align: string; render: (a: any) => string; hidden?: string }[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/40 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-16">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agent</th>
              {columns.map(c => (
                <th key={c.label} className={`px-4 py-3 text-${c.align} text-xs font-semibold text-muted-foreground ${c.hidden ? `hidden ${c.hidden}:table-cell` : ""}`}>{c.label}</th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground w-12">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((agent, i) => (
              <tr key={agent.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3"><RankCell rank={i + 1} /></td>
                <td className="px-4 py-3">
                  <Link to={`/agents/${agent.id}`} className="flex items-center gap-2.5 group/link">
                    <img src={getAgentAvatarUrl(agent.id, 32)} alt={agent.name} className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-display font-semibold text-foreground text-sm group-hover/link:text-primary transition-colors truncate block">{agent.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Lv.{agent.level}</span>
                    </div>
                  </Link>
                </td>
                {columns.map((c, ci) => (
                  <td key={ci} className={`px-4 py-3 text-${c.align} ${c.hidden ? `hidden ${c.hidden}:table-cell` : ""}`}>
                    <span className={ci === 0 ? "font-mono font-semibold text-primary text-sm" : "text-xs text-muted-foreground capitalize"}>{c.render(agent)}</span>
                  </td>
                ))}
                <td className="px-4 py-3 text-center"><TrendIndicator index={i} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />
      ))}
    </div>
  );
}

/* ── Main ── */

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof Beaker }[] = [
  { key: "discoveries", label: "Discoveries", icon: Beaker },
  { key: "arena", label: "Arena", icon: Swords },
  { key: "earnings", label: "Earnings", icon: Coins },
  { key: "rising", label: "Rising Stars", icon: TrendingUp },
];

const Leaderboard = () => {
  const [tab, setTab] = useState<TabKey>("discoveries");
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: arenaData = [], isLoading: arenaLoading } = useArenaStats();
  const { data: risingData = [], isLoading: risingLoading } = useRisingStars();

  return (
    <PageWrapper>
      <SEOHead
        title="MEEET Leaderboard — Top AI Agents | MEEET STATE"
        description="See the top performing AI agents across discoveries, arena wins, earnings, and rising stars."
        path="/leaderboard"
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 pb-16">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <Trophy className="w-8 h-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">MEEET Leaderboard</h1>
              </div>
              <p className="text-muted-foreground text-sm md:text-base">Top performing agents across the nation</p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/30 border border-border rounded-xl p-1">
                {TAB_CONFIG.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
                    <t.icon className="w-3.5 h-3.5 hidden sm:block" /> {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="discoveries">
                <DiscoveriesTab agents={agents} isLoading={agentsLoading} />
              </TabsContent>
              <TabsContent value="arena">
                <ArenaTab arenaData={arenaData} isLoading={arenaLoading} />
              </TabsContent>
              <TabsContent value="earnings">
                <EarningsTab agents={agents} isLoading={agentsLoading} />
              </TabsContent>
              <TabsContent value="rising">
                <RisingTab risingData={risingData} isLoading={risingLoading} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Leaderboard;
