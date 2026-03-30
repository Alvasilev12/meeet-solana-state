import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Bot, Coins, TrendingUp, Shield, Flame, BarChart3, Activity, MessageSquare, Zap, Play, Square, ArrowDownUp, Send } from "lucide-react";
import * as Recharts from "recharts";
import AdminDialogs from "@/components/admin/AdminDialogs";
import { toast } from "sonner";
import { useMeeetPrice } from "@/hooks/useMeeetPrice";

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
      const { data: treasury } = await supabase.from("state_treasury").select("*").limit(1).maybeSingle();
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
function TokenAnalyticsPanel() {
  const { price } = useMeeetPrice();
  const [airdropWallets, setAirdropWallets] = useState("");
  const [airdropAmount, setAirdropAmount] = useState("100");
  const [airdropLoading, setAirdropLoading] = useState(false);
  const [airdropResult, setAirdropResult] = useState<any>(null);

  const { data: burnData } = useQuery({
    queryKey: ["admin-burn-data"],
    queryFn: async () => {
      const { data: logs } = await supabase.from("burn_log").select("amount, reason, created_at").order("created_at", { ascending: false }).limit(200);
      if (!logs) return { total: 0, byReason: [] as {name:string;value:number}[], daily: [] as {date:string;amount:number}[], recent: [] as any[] };
      const total = logs.reduce((s, l) => s + Number(l.amount), 0);
      const reasonMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};
      logs.forEach(l => {
        reasonMap[l.reason] = (reasonMap[l.reason] || 0) + Number(l.amount);
        const d = new Date(l.created_at).toISOString().slice(5, 10);
        dailyMap[d] = (dailyMap[d] || 0) + Number(l.amount);
      });
      return {
        total,
        byReason: Object.entries(reasonMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        daily: Object.entries(dailyMap).sort().slice(-14).map(([date, amount]) => ({ date, amount })),
        recent: logs.slice(0, 10),
      };
    },
    refetchInterval: 30000,
  });

  const { data: walletInfo } = useQuery({
    queryKey: ["admin-wallet-pnl"],
    queryFn: async () => {
      const { data: tradeLogs } = await supabase.from("trade_log").select("action, sol_amount, meeet_amount, price").eq("status", "completed");
      if (!tradeLogs) return { totalBuySol: 0, totalBuyMeeet: 0, totalSellSol: 0, totalSellMeeet: 0, trades: 0 };
      let totalBuySol = 0, totalBuyMeeet = 0, totalSellSol = 0, totalSellMeeet = 0;
      tradeLogs.forEach(t => {
        if (t.action === "buy") { totalBuySol += Number(t.sol_amount); totalBuyMeeet += Number(t.meeet_amount); }
        if (t.action === "sell") { totalSellSol += Number(t.sol_amount); totalSellMeeet += Number(t.meeet_amount); }
      });
      return { totalBuySol, totalBuyMeeet, totalSellSol, totalSellMeeet, trades: tradeLogs.length };
    },
    refetchInterval: 30000,
  });

  const runAirdrop = async () => {
    const addrs = airdropWallets.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (addrs.length === 0) { toast.error("Enter wallet addresses"); return; }
    const amt = Number(airdropAmount);
    if (!amt || amt <= 0) { toast.error("Invalid amount"); return; }
    setAirdropLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${pid}.supabase.co/functions/v1/token-airdrop`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ wallets: addrs, amount_meeet: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Airdrop failed");
      setAirdropResult(data);
      toast.success(`Airdrop: ${data.successful}/${data.total} wallets received ${amt} MEEET each`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAirdropLoading(false);
    }
  };

  const pnlSol = (walletInfo?.totalSellSol ?? 0) - (walletInfo?.totalBuySol ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={<Coins className="w-5 h-5 text-primary" />} label="MEEET Price" value={`$${price.priceUsd.toFixed(6)}`} sub={`${price.change24h >= 0 ? "+" : ""}${price.change24h.toFixed(1)}% 24h`} />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-green-400" />} label="Market Cap" value={price.marketCap > 0 ? `$${(price.marketCap / 1e3).toFixed(0)}K` : "—"} color="#4ade80" />
        <StatCard icon={<Activity className="w-5 h-5 text-blue-400" />} label="24h Volume" value={price.volume24h > 0 ? `$${(price.volume24h / 1e3).toFixed(1)}K` : "—"} color="#60a5fa" />
        <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="Total Burned" value={(burnData?.total ?? 0).toLocaleString()} sub="$MEEET" color="#fb923c" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-purple-400" />} label="P&L" value={`${pnlSol >= 0 ? "+" : ""}${pnlSol.toFixed(4)} SOL`} sub={`${walletInfo?.trades ?? 0} trades`} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-display flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Burn by Source</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {burnData?.byReason.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground w-32 truncate">{r.name.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.value / (burnData.total || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-[10px] font-mono text-orange-400 w-16 text-right">{r.value.toLocaleString()}</span>
                </div>
              ))}
              {(!burnData?.byReason.length) && <p className="text-xs text-muted-foreground text-center py-4">No burns yet</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Daily Burn Rate</CardTitle></CardHeader>
          <CardContent>
            {burnData?.daily && burnData.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={burnData.daily}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#fb923c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground text-center py-12">No burn data</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Recent Burns</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {burnData?.recent.map((b: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1 text-xs border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span>
                <Badge variant="secondary" className="text-[10px]">{b.reason.replace(/_/g, " ")}</Badge>
                <span className="font-mono text-orange-400">🔥 {Number(b.amount).toLocaleString()}</span>
              </div>
            ))}
            {(!burnData?.recent.length) && <p className="text-xs text-muted-foreground text-center py-4">No burns yet</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-lg font-display flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Airdrop MEEET</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Wallet Addresses (one per line or comma-separated, max 50)</label>
              <textarea className="w-full h-32 bg-muted/30 border border-border rounded-lg p-3 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder={"4nfsUavL6...\n4zkqErmzJ..."} value={airdropWallets} onChange={e => setAirdropWallets(e.target.value)} />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">MEEET per Wallet</label>
                <input type="number" className="w-full bg-muted/30 border border-border rounded-lg p-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">{airdropWallets.split(/[\n,]+/).filter(s => s.trim()).length} wallets × {airdropAmount} = {(airdropWallets.split(/[\n,]+/).filter(s => s.trim()).length * Number(airdropAmount || 0)).toLocaleString()} MEEET</p>
              <Button onClick={runAirdrop} disabled={airdropLoading} className="w-full">{airdropLoading ? "Sending..." : "🚀 Send Airdrop"}</Button>
            </div>
          </div>
          {airdropResult && (
            <div className="glass-card p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <p className="text-sm text-green-400">✅ {airdropResult.successful}/{airdropResult.total} wallets ({airdropResult.total_sent} MEEET total)</p>
              {airdropResult.failed > 0 && <p className="text-xs text-red-400 mt-1">❌ {airdropResult.failed} failed</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TradingPanel() {
  const [tStatus, setTStatus] = useState<any>(null);
  const [tLoading, setTLoading] = useState(false);
  const [autoTrading, setAutoTrading] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [totalSol, setTotalSol] = useState(0);
  const [totalMeeet, setTotalMeeet] = useState(0);
  const [burnCycleLoading, setBurnCycleLoading] = useState(false);
  const [burnCycleResult, setBurnCycleResult] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: tradeLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["trade-log"],
    queryFn: async () => {
      const { data } = await supabase.from("trade_log").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const callTrader = useCallback(async (action: string) => {
    setTLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/token-trader`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trade failed");
      if (action === "status") setTStatus(data);
      else {
        toast.success(`${action.toUpperCase()}: ${JSON.stringify(data).slice(0, 120)}`);
        refetchLogs();
        if (data?.sol_spent) setTotalSol(p => p + data.sol_spent);
        if (data?.sol_received) setTotalSol(p => p + data.sol_received);
        if (data?.meeet_received) setTotalMeeet(p => p + data.meeet_received);
        if (data?.meeet_sold) setTotalMeeet(p => p + data.meeet_sold);
        setCycles(p => p + 1);
      }
      return data;
    } catch (e: any) {
      toast.error(e.message || "Trade failed");
      return null;
    } finally {
      setTLoading(false);
    }
  }, [refetchLogs]);

  const startAutoTrading = useCallback(() => {
    setAutoTrading(true);
    setCycles(0);
    setTotalSol(0);
    setTotalMeeet(0);
    const runCycle = () => callTrader("run_cycle").then(result => {
      if (result?.status === "finished") {
        stopAutoTrading();
        toast.info("Auto-trading stopped — SOL depleted");
      }
    });
    runCycle();
    intervalRef.current = setInterval(runCycle, Math.floor(Math.random() * 180000 + 120000));
  }, [callTrader]);

  const stopAutoTrading = useCallback(() => {
    setAutoTrading(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Token Trading Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => callTrader("status")} disabled={tLoading}>
              <Activity className="w-4 h-4 mr-1" /> Status
            </Button>
            <Button variant="outline" size="sm" onClick={() => callTrader("buy")} disabled={tLoading || autoTrading} className="text-green-400 border-green-500/30">
              <TrendingUp className="w-4 h-4 mr-1" /> Buy
            </Button>
            <Button variant="outline" size="sm" onClick={() => callTrader("sell")} disabled={tLoading || autoTrading} className="text-red-400 border-red-500/30">
              <TrendingUp className="w-4 h-4 mr-1 rotate-180" /> Sell
            </Button>
            <Button variant="outline" size="sm" onClick={() => callTrader("sweep")} disabled={tLoading || autoTrading} className="text-amber-400 border-amber-500/30">
              <Send className="w-4 h-4 mr-1" /> Sweep
            </Button>
            <div className="border-l border-border mx-1" />
            {!autoTrading ? (
              <Button size="sm" onClick={startAutoTrading} disabled={tLoading} className="bg-green-600 hover:bg-green-700 text-white">
                <Play className="w-4 h-4 mr-1" /> Auto-Trade
              </Button>
            ) : (
              <Button size="sm" onClick={stopAutoTrading} variant="destructive">
                <Square className="w-4 h-4 mr-1" /> Stop
              </Button>
            )}
          </div>
          {autoTrading && (
            <div className="glass-card p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <p className="text-sm text-green-400 font-mono">🤖 Trading... {cycles} cycles, {totalSol.toFixed(4)} SOL vol, {totalMeeet.toFixed(0)} MEEET vol</p>
            </div>
          )}
          {tStatus && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { l: "Wallet", v: `${tStatus.wallet?.slice(0, 6)}...${tStatus.wallet?.slice(-4)}` },
                { l: "SOL", v: `${Number(tStatus.sol_balance).toFixed(4)}` },
                { l: "MEEET", v: Number(tStatus.meeet_balance).toLocaleString() },
                { l: "Trades", v: tStatus.total_trades },
                { l: "Status", v: tStatus.status },
              ].map(s => (
                <div key={s.l} className="glass-card p-2 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  <p className="text-sm font-mono font-bold text-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          )}
      </CardContent>
      </Card>
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" /> Burn Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Manually trigger the auto-burn cycle. Burns 20% of all unprocessed agent action fees and logs to burn_log.</p>
          <Button
            variant="outline"
            size="sm"
            className="text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
            disabled={burnCycleLoading}
            onClick={async () => {
              setBurnCycleLoading(true);
              setBurnCycleResult(null);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Not authenticated");
                const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                const res = await fetch(`https://${pid}.supabase.co/functions/v1/auto-burn-scheduler`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Burn cycle failed");
                setBurnCycleResult(data);
                toast.success(`🔥 Burn cycle: ${data.processed} actions, ${data.total_burned_usd?.toFixed(4)} USD burned`);
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setBurnCycleLoading(false);
              }
            }}
          >
            <Flame className="w-4 h-4 mr-1" /> {burnCycleLoading ? "Burning..." : "Execute Burn Cycle"}
          </Button>
          {burnCycleResult && (
            <div className="glass-card p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 text-xs font-mono space-y-1">
              <p>✅ Processed: <span className="text-orange-400">{burnCycleResult.processed}</span> actions</p>
              <p>🔥 Burned: <span className="text-orange-400">${burnCycleResult.total_burned_usd?.toFixed(6)}</span></p>
              <p>🏛️ Treasury: <span className="text-primary">{burnCycleResult.treasury_balance?.toLocaleString()}</span> MEEET</p>
              <p>📊 Total burned: <span className="text-orange-400">{burnCycleResult.treasury_total_burned?.toLocaleString()}</span></p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="glass-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-lg font-display">Trade Log</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2">Time</th>
                <th className="text-left py-2 px-2">Action</th>
                <th className="text-right py-2 px-2">SOL</th>
                <th className="text-right py-2 px-2">MEEET</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-left py-2 px-2">Tx</th>
              </tr></thead>
              <tbody>
                {tradeLogs?.map((log: any) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-1.5 px-2 font-mono text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</td>
                    <td className="py-1.5 px-2">
                      <Badge variant={log.action === "buy" ? "default" : log.action === "sell" ? "destructive" : "secondary"} className="text-[10px]">{log.action.toUpperCase()}</Badge>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{Number(log.sol_amount).toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{Number(log.meeet_amount).toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">{log.price ? Number(log.price).toFixed(8) : "—"}</td>
                    <td className="py-1.5 px-2">{log.tx_signature ? <a href={`https://solscan.io/tx/${log.tx_signature}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{log.tx_signature.slice(0, 8)}...</a> : "—"}</td>
                  </tr>
                ))}
                {(!tradeLogs || tradeLogs.length === 0) && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No trades yet</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
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
            <TabsList className="glass-card bg-card/50 border border-border flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="economy">Economy</TabsTrigger>
              <TabsTrigger value="token" className="gap-1"><Coins className="w-3.5 h-3.5" /> Token</TabsTrigger>
              <TabsTrigger value="trading" className="gap-1"><ArrowDownUp className="w-3.5 h-3.5" /> Trading</TabsTrigger>
              <TabsTrigger value="dialogs" className="gap-1"><MessageSquare className="w-3.5 h-3.5" /> Dialogs</TabsTrigger>
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

            <TabsContent value="token">
              <TokenAnalyticsPanel />
            </TabsContent>

            <TabsContent value="trading">
              <TradingPanel />
            </TabsContent>

            <TabsContent value="dialogs">
              <AdminDialogs />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
