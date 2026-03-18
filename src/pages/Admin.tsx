import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Bot, Coins, TrendingUp, Shield, Flame, BarChart3, Activity } from "lucide-react";
import * as Recharts from "recharts";

const COLORS = ["#9945FF", "#14F195", "#EF4444", "#FBBF24", "#00C2FF", "#F97316", "#6366F1"];
const {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} = Recharts as any;

function useAdminCheck() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("profiles").select("is_president").eq("user_id", user.id).single();
      return data?.is_president === true;
    },
    enabled: !!user,
  });
}

function useUserStats() {
  return useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const { data: profiles, count: totalUsers } = await supabase.from("profiles").select("id, created_at, is_onboarded, passport_tier, wallet_address", { count: "exact" });
      const onboarded = profiles?.filter(p => p.is_onboarded).length ?? 0;
      const withWallet = profiles?.filter(p => p.wallet_address).length ?? 0;
      const tiers = { resident: 0, citizen: 0, elite: 0 };
      profiles?.forEach(p => { if (p.passport_tier) tiers[p.passport_tier as keyof typeof tiers]++; });
      
      // Registration by day (last 30 days)
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dailyReg: Record<string, number> = {};
      profiles?.forEach(p => {
        const d = new Date(p.created_at).toISOString().slice(0, 10);
        if (new Date(p.created_at) >= thirtyDaysAgo) dailyReg[d] = (dailyReg[d] || 0) + 1;
      });
      const regChart = Object.entries(dailyReg).sort().map(([date, count]) => ({ date: date.slice(5), count }));

      return { totalUsers: totalUsers ?? 0, onboarded, withWallet, tiers, regChart };
    },
    refetchInterval: 60000,
  });
}

function useAgentStats() {
  return useQuery({
    queryKey: ["admin-agent-stats"],
    queryFn: async () => {
      const { data: agents } = await supabase.from("agents").select("class, level, balance_meeet, status, xp, kills, quests_completed");
      if (!agents) return null;
      const total = agents.length;
      const classDist: Record<string, number> = {};
      let totalBalance = 0, totalXp = 0, totalKills = 0, totalQuests = 0;
      const statusDist: Record<string, number> = {};
      const levelDist: Record<string, number> = {};

      agents.forEach(a => {
        classDist[a.class] = (classDist[a.class] || 0) + 1;
        totalBalance += Number(a.balance_meeet);
        totalXp += a.xp;
        totalKills += a.kills;
        totalQuests += a.quests_completed;
        statusDist[a.status] = (statusDist[a.status] || 0) + 1;
        const lvlBucket = a.level <= 5 ? "1-5" : a.level <= 10 ? "6-10" : a.level <= 20 ? "11-20" : "21+";
        levelDist[lvlBucket] = (levelDist[lvlBucket] || 0) + 1;
      });

      const classChart = Object.entries(classDist).map(([name, value]) => ({ name, value }));
      const levelChart = Object.entries(levelDist).map(([name, value]) => ({ name, value }));
      const statusChart = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

      return { total, classChart, levelChart, statusChart, totalBalance, totalXp, totalKills, totalQuests, avgLevel: total ? (agents.reduce((s, a) => s + a.level, 0) / total).toFixed(1) : "0" };
    },
    refetchInterval: 60000,
  });
}

function useEconomyStats() {
  return useQuery({
    queryKey: ["admin-economy-stats"],
    queryFn: async () => {
      const { data: treasury } = await supabase.from("state_treasury").select("*").limit(1).single();
      const { data: txs } = await supabase.from("transactions").select("type, amount_meeet, tax_amount, burn_amount, created_at").order("created_at", { ascending: false }).limit(1000);
      
      const txByType: Record<string, { count: number; volume: number }> = {};
      const dailyVolume: Record<string, number> = {};
      
      txs?.forEach(tx => {
        const t = tx.type;
        if (!txByType[t]) txByType[t] = { count: 0, volume: 0 };
        txByType[t].count++;
        txByType[t].volume += Number(tx.amount_meeet ?? 0);
        const d = new Date(tx.created_at).toISOString().slice(5, 10);
        dailyVolume[d] = (dailyVolume[d] || 0) + Number(tx.amount_meeet ?? 0);
      });

      const txTypeChart = Object.entries(txByType).map(([name, { count, volume }]) => ({ name, count, volume }));
      const volumeChart = Object.entries(dailyVolume).sort().slice(-14).map(([date, volume]) => ({ date, volume }));

      return { treasury, txTypeChart, volumeChart, totalTxs: txs?.length ?? 0 };
    },
    refetchInterval: 30000,
  });
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="glass-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (color || "hsl(var(--primary))") + "15" }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-body truncate">{label}</p>
          <p className="text-lg font-display font-bold truncate">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground font-body">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { data: userStats } = useUserStats();
  const { data: agentStats } = useAgentStats();
  const { data: economyStats } = useEconomyStats();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!adminLoading && isAdmin === false) navigate("/dashboard");
  }, [loading, user, adminLoading, isAdmin, navigate]);

  if (loading || adminLoading || !isAdmin) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Admin Panel</h1>
            <span className="glass-card px-2 py-0.5 text-[10px] font-body text-primary">PRESIDENT</span>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="glass-card bg-card/50 border border-border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="economy">Economy</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<Users className="w-5 h-5 text-primary" />} label="Total Users" value={userStats?.totalUsers ?? 0} sub={`${userStats?.onboarded ?? 0} onboarded`} />
                <StatCard icon={<Bot className="w-5 h-5 text-secondary" />} label="Total Agents" value={agentStats?.total ?? 0} sub={`Avg Lv. ${agentStats?.avgLevel ?? 0}`} color="hsl(var(--secondary))" />
                <StatCard icon={<Coins className="w-5 h-5 text-amber-400" />} label="Treasury" value={fmt(Number(economyStats?.treasury?.balance_meeet ?? 0))} sub="$MEEET" color="#FBBF24" />
                <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="Total Burned" value={fmt(Number(economyStats?.treasury?.total_burned ?? 0))} sub="$MEEET" color="#F97316" />
              </div>

              {/* Registration chart */}
              {userStats?.regChart && userStats.regChart.length > 0 && (
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-display flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> User Registrations (30d)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={userStats.regChart}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Passport tiers */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={<span className="text-lg">🪪</span>} label="Residents" value={userStats?.tiers.resident ?? 0} />
                <StatCard icon={<span className="text-lg">🏅</span>} label="Citizens" value={userStats?.tiers.citizen ?? 0} color="#14F195" />
                <StatCard icon={<span className="text-lg">👑</span>} label="Elite" value={userStats?.tiers.elite ?? 0} color="#FFD700" />
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<Bot className="w-5 h-5 text-secondary" />} label="Total Agents" value={agentStats?.total ?? 0} />
                <StatCard icon={<Coins className="w-5 h-5 text-amber-400" />} label="Total Balance" value={fmt(agentStats?.totalBalance ?? 0)} sub="$MEEET" color="#FBBF24" />
                <StatCard icon={<span className="text-lg">⚔️</span>} label="Total Kills" value={agentStats?.totalKills ?? 0} color="#EF4444" />
                <StatCard icon={<span className="text-lg">📜</span>} label="Quests Done" value={agentStats?.totalQuests ?? 0} color="#06B6D4" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Class distribution */}
                {agentStats?.classChart && (
                  <Card className="glass-card border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Class Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={agentStats.classChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {agentStats.classChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Level distribution */}
                {agentStats?.levelChart && (
                  <Card className="glass-card border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Level Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={agentStats.levelChart}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="value" fill="#14F195" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="economy" className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<BarChart3 className="w-5 h-5 text-primary" />} label="Transactions" value={economyStats?.totalTxs ?? 0} />
                <StatCard icon={<Coins className="w-5 h-5 text-amber-400" />} label="Tax Collected" value={fmt(Number(economyStats?.treasury?.total_tax_collected ?? 0))} color="#FBBF24" />
                <StatCard icon={<span className="text-lg">🏠</span>} label="Land Revenue" value={fmt(Number(economyStats?.treasury?.total_land_revenue ?? 0))} />
                <StatCard icon={<Activity className="w-5 h-5 text-secondary" />} label="Quest Payouts" value={fmt(Number(economyStats?.treasury?.total_quest_payouts ?? 0))} color="hsl(var(--secondary))" />
              </div>

              {/* Volume chart */}
              {economyStats?.volumeChart && economyStats.volumeChart.length > 0 && (
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-display flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary" /> Daily Volume (14d)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={economyStats.volumeChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Line type="monotone" dataKey="volume" stroke="#14F195" strokeWidth={2} dot={{ fill: "#14F195", r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tx type breakdown */}
              {economyStats?.txTypeChart && (
                <Card className="glass-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Transaction Types</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {economyStats.txTypeChart.sort((a, b) => b.count - a.count).map((tx, i) => (
                        <div key={tx.name} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs font-body text-muted-foreground w-28 truncate">{tx.name}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(tx.count / (economyStats.totalTxs || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-12 text-right">{tx.count}</span>
                          <span className="text-[10px] font-mono text-amber-400 w-16 text-right">{fmt(tx.volume)} $M</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
