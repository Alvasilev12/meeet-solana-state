import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Trophy, Zap, Globe, Users, Coins, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── Hooks ──────────────────────────────────────────────────────

function useEarningsChart(agentId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["earnings-chart", agentId, days],
    enabled: !!agentId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("agent_earnings")
        .select("amount_meeet, created_at")
        .eq("agent_id", agentId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        grouped[d.toISOString().slice(0, 10)] = 0;
      }
      for (const row of data ?? []) {
        const key = row.created_at.slice(0, 10);
        if (key in grouped) grouped[key] += Number(row.amount_meeet || 0);
      }

      return Object.entries(grouped).map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        amount,
      }));
    },
  });
}

function useQuestsChart(userId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["quests-chart", userId, days],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("quests")
        .select("completed_at")
        .eq("requester_id", userId!)
        .eq("status", "completed")
        .gte("completed_at", since.toISOString())
        .order("completed_at", { ascending: true });

      if (error) throw error;

      const grouped: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        grouped[d.toISOString().slice(0, 10)] = 0;
      }
      for (const row of data ?? []) {
        if (!row.completed_at) continue;
        const key = row.completed_at.slice(0, 10);
        if (key in grouped) grouped[key]++;
      }

      return Object.entries(grouped).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        count,
      }));
    },
  });
}

function useImpactChart(agentId: string | undefined) {
  return useQuery({
    queryKey: ["impact-chart", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_impact")
        .select("metric_type, metric_value, recorded_at")
        .eq("agent_id", agentId!)
        .order("recorded_at", { ascending: true })
        .limit(30);

      if (error) throw error;

      let cumulative = 0;
      return (data ?? []).map((row) => {
        cumulative += Number(row.metric_value || 0);
        return {
          date: new Date(row.recorded_at!).toLocaleDateString("en", { month: "short", day: "numeric" }),
          score: Math.round(cumulative),
          type: row.metric_type,
        };
      });
    },
  });
}

function useGlobalStatsChart() {
  return useQuery({
    queryKey: ["global-stats-chart"],
    staleTime: 60_000,
    queryFn: async () => {
      const [agentsRes, questsRes, earningsRes, eventsRes] = await Promise.all([
        supabase.from("agents").select("id", { count: "exact" }).limit(0),
        supabase.from("quests").select("id", { count: "exact" }).limit(0),
        supabase.from("agent_earnings").select("amount_meeet"),
        supabase.from("world_events").select("id", { count: "exact" }).limit(0),
      ]);

      const totalEarnings = (earningsRes.data ?? []).reduce(
        (s, r: any) => s + Number(r.amount_meeet || 0), 0
      );

      return {
        agents: agentsRes.count ?? 0,
        quests: questsRes.count ?? 0,
        earnings: totalEarnings,
        events: eventsRes.count ?? 0,
      };
    },
  });
}

// ─── Custom Tooltip ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-[10px] text-muted-foreground font-body mb-0.5">{label}</p>
      <p className="text-sm font-display font-bold text-foreground">
        {Number(payload[0].value).toLocaleString()}{suffix}
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function DashboardAnalytics({ agentId }: { agentId?: string }) {
  const { user } = useAuth();
  const [earningsPeriod, setEarningsPeriod] = useState<7 | 30>(7);
  const [questsPeriod, setQuestsPeriod] = useState<7 | 30>(7);

  const { data: earningsData, isLoading: earningsLoading } = useEarningsChart(agentId, earningsPeriod);
  const { data: questsData, isLoading: questsLoading } = useQuestsChart(user?.id, questsPeriod);
  const { data: impactData, isLoading: impactLoading } = useImpactChart(agentId);
  const { data: globalStats, isLoading: globalLoading } = useGlobalStatsChart();

  const totalEarnings = earningsData?.reduce((s, d) => s + d.amount, 0) ?? 0;
  const totalQuests = questsData?.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-display font-bold">Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Earnings Chart ── */}
        <Card className="glass-card border-border overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-primary to-emerald-500/60" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                Earnings
              </CardTitle>
              <div className="flex items-center gap-1">
                <PeriodToggle value={earningsPeriod} onChange={setEarningsPeriod} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-display font-bold text-emerald-400">
                {totalEarnings.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-body">$MEEET</span>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            {earningsLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={earningsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip suffix=" $MEEET" />} />
                  <Area
                    type="monotone" dataKey="amount"
                    stroke="hsl(142, 71%, 45%)" strokeWidth={2}
                    fill="url(#earningsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Quests Completed Chart ── */}
        <Card className="glass-card border-border overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-secondary to-blue-500/60" />
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                Quests Completed
              </CardTitle>
              <PeriodToggle value={questsPeriod} onChange={setQuestsPeriod} />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-display font-bold text-blue-400">
                {totalQuests}
              </span>
              <span className="text-xs text-muted-foreground font-body">quests</span>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            {questsLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={questsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip suffix=" quests" />} />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Impact Score Trend ── */}
        <Card className="glass-card border-border overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-secondary to-amber-500/60" />
          <CardHeader className="pb-1">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Impact Score Trend
            </CardTitle>
            {impactData && impactData.length > 0 && (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-display font-bold text-amber-400">
                  {impactData[impactData.length - 1].score.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground font-body">cumulative</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="pb-3">
            {impactLoading ? (
              <ChartSkeleton />
            ) : !impactData || impactData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground">
                <Zap className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs font-body">No impact data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={impactData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip suffix=" pts" />} />
                  <Line
                    type="monotone" dataKey="score"
                    stroke="hsl(38, 92%, 50%)" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 4, fill: "hsl(38, 92%, 50%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Global Statistics ── */}
        <Card className="glass-card border-border overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-secondary to-primary/60" />
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Global Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {globalLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <GlobalStatTile
                  icon={<Users className="w-5 h-5" />}
                  label="Total Agents"
                  value={globalStats?.agents ?? 0}
                  color="text-primary"
                  bg="bg-primary/10"
                />
                <GlobalStatTile
                  icon={<Trophy className="w-5 h-5" />}
                  label="Total Quests"
                  value={globalStats?.quests ?? 0}
                  color="text-blue-400"
                  bg="bg-blue-500/10"
                />
                <GlobalStatTile
                  icon={<Coins className="w-5 h-5" />}
                  label="MEEET Earned"
                  value={globalStats?.earnings ?? 0}
                  color="text-emerald-400"
                  bg="bg-emerald-500/10"
                />
                <GlobalStatTile
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="World Events"
                  value={globalStats?.events ?? 0}
                  color="text-amber-400"
                  bg="bg-amber-500/10"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function PeriodToggle({ value, onChange }: { value: 7 | 30; onChange: (v: 7 | 30) => void }) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      <button
        onClick={() => onChange(7)}
        className={`px-2.5 py-1 text-[10px] font-display font-semibold transition-colors ${
          value === 7 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        7d
      </button>
      <button
        onClick={() => onChange(30)}
        className={`px-2.5 py-1 text-[10px] font-display font-semibold transition-colors border-l border-border ${
          value === 30 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        30d
      </button>
    </div>
  );
}

function GlobalStatTile({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-3 group hover:border-primary/20 transition-colors">
      <div className={`w-10 h-10 rounded-lg ${bg} border border-border flex items-center justify-center ${color} group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-display font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground font-body">{label}</p>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-[160px]">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}
