import { useState, useEffect, useCallback } from "react";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Flame, TrendingDown, Lock, Award, Coins, Wallet, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const fmt = (n: number) => n.toLocaleString();

const purposeColor: Record<string, string> = {
  discovery: "bg-primary/20 text-primary",
  debate: "bg-accent/20 text-accent-foreground",
  governance: "bg-green-500/20 text-green-400",
};

interface StakeRow {
  id: string;
  agent_id: string;
  amount: number;
  target_type: string;
  target_id: string;
  status: string;
  locked_at: string;
  resolved_at: string | null;
  result: string | null;
}

interface StakeHistoryRow {
  id: string;
  agent_id: string;
  action: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
}

interface StakingStats {
  tvl: number;
  active_stakes: number;
  total_rewarded: number;
  slashed: { "24h": number; "7d": number; "30d": number };
}

const Staking = () => {
  const { address: walletAddress } = useSolanaWallet();
  const [stakeInput, setStakeInput] = useState("");
  const [walletMeeet, setWalletMeeet] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Real data state
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [activeStakes, setActiveStakes] = useState<(StakeRow & { agent_name?: string })[]>([]);
  const [topStakers, setTopStakers] = useState<{ agent_id: string; name: string; total: number }[]>([]);
  const [stakingHistory, setStakingHistory] = useState<{ day: string; value: number }[]>([]);
  const [burnHistory, setBurnHistory] = useState<{ day: string; value: number }[]>([]);

  const fetchMeeet = useCallback(async (addr: string) => {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
      const conn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const pk = new PublicKey(addr);
      const MEEET_MINT = new PublicKey("EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump");
      const ata = await getAssociatedTokenAddress(MEEET_MINT, pk);
      try { const acc = await getAccount(conn, ata); setWalletMeeet(Number(acc.amount)); } catch { setWalletMeeet(0); }
    } catch { setWalletMeeet(null); }
  }, []);

  useEffect(() => { if (walletAddress) fetchMeeet(walletAddress); }, [walletAddress, fetchMeeet]);

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch stats via edge function
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "zujrmifaabkletgnpoyw";
        const statsRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/staking-engine/stats`,
          { headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }

        // Active stakes with agent names
        const { data: stakesData } = await supabase
          .from("stakes")
          .select("*, agents!inner(name)")
          .eq("status", "locked")
          .order("locked_at", { ascending: false })
          .limit(20);

        if (stakesData) {
          setActiveStakes(stakesData.map((s: any) => ({
            ...s,
            agent_name: s.agents?.name || "Unknown",
          })));
        }

        // Top stakers: aggregate locked stakes per agent
        const { data: allLockedStakes } = await supabase
          .from("stakes")
          .select("agent_id, amount, agents!inner(name)")
          .eq("status", "locked");

        if (allLockedStakes) {
          const byAgent: Record<string, { name: string; total: number }> = {};
          allLockedStakes.forEach((s: any) => {
            const id = s.agent_id;
            if (!byAgent[id]) byAgent[id] = { name: s.agents?.name || "Unknown", total: 0 };
            byAgent[id].total += s.amount;
          });
          const sorted = Object.entries(byAgent)
            .map(([agent_id, v]) => ({ agent_id, ...v }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
          setTopStakers(sorted);
        }

        // Build 30-day staking chart from stake_history
        const { data: histData } = await supabase
          .from("stake_history")
          .select("action, amount, created_at")
          .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())
          .order("created_at", { ascending: true });

        if (histData && histData.length > 0) {
          const byDay: Record<string, number> = {};
          histData.forEach((h: any) => {
            const day = new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (!byDay[day]) byDay[day] = 0;
            if (h.action === "stake") byDay[day] += h.amount;
            else if (h.action === "release" || h.action === "slash") byDay[day] -= h.amount;
          });
          setStakingHistory(Object.entries(byDay).map(([day, value]) => ({ day, value: Math.max(value, 0) })));
        }

        // Burn history from burn_log
        const { data: burnData } = await supabase
          .from("burn_log")
          .select("amount, created_at")
          .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())
          .order("created_at", { ascending: true });

        if (burnData && burnData.length > 0) {
          const byDay: Record<string, number> = {};
          burnData.forEach((b: any) => {
            const day = new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (!byDay[day]) byDay[day] = 0;
            byDay[day] += b.amount;
          });
          setBurnHistory(Object.entries(byDay).map(([day, value]) => ({ day, value })));
        }
      } catch (err) {
        console.error("Failed to fetch staking data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Fallback chart data if no real data
  const chartStaking = stakingHistory.length > 0
    ? stakingHistory
    : Array.from({ length: 30 }, (_, i) => ({
        day: `Day ${i + 1}`,
        value: 0,
      }));

  const chartBurn = burnHistory.length > 0
    ? burnHistory
    : Array.from({ length: 30 }, (_, i) => ({
        day: `Day ${i + 1}`,
        value: 0,
      }));

  const tvl = stats?.tvl ?? 0;
  const totalRewarded = stats?.total_rewarded ?? 0;
  const activeCount = stats?.active_stakes ?? 0;

  // Compute total burned from burn_log
  const totalBurned = burnHistory.reduce((s, r) => s + r.value, 0);

  return (
  <>
    <SEOHead title="Staking & Burn Dashboard | MEEET STATE" description="Real-time $MEEET staking analytics, burn metrics, and deflation tracking." path="/staking" />
    <Navbar />
    <main className="pt-24 pb-16 min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 space-y-8">

        <div className="text-center mb-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Staking & Burn Dashboard</h1>
          <p className="text-muted-foreground text-lg">Real-time $MEEET deflation & staking analytics</p>
          {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2 text-muted-foreground" />}
        </div>

        {/* Wallet Stake Card */}
        {walletAddress && (
          <div className="bg-card/60 border border-primary/30 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Your Wallet Balance</p>
                  <p className="text-2xl font-bold text-primary">{walletMeeet !== null ? walletMeeet.toLocaleString() : "—"} MEEET</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Input
                  type="number"
                  placeholder="Amount to stake"
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  className="w-40 h-10"
                />
                <Button size="sm" className="bg-primary hover:bg-primary/90">Stake</Button>
                <Button size="sm" variant="outline">Unstake</Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Top Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { icon: Lock, label: "Total Value Locked", value: fmt(tvl), sub: "MEEET", accent: "text-primary" },
            { icon: Flame, label: "Total Burned", value: fmt(totalBurned), sub: "MEEET", accent: "text-orange-400" },
            { icon: Award, label: "Total Rewarded", value: fmt(totalRewarded), sub: "MEEET", accent: "text-emerald-400" },
            { icon: TrendingDown, label: "Active Stakes", value: fmt(activeCount), sub: "stakes", accent: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/40 transition-colors">
              <s.icon className={`w-6 h-6 mx-auto mb-3 ${s.accent}`} />
              <p className={`text-3xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Slash Rate ── */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Slash & Burn Rate</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { period: "24h", value: fmt(stats?.slashed?.["24h"] ?? 0) },
              { period: "7d", value: fmt(stats?.slashed?.["7d"] ?? 0) },
              { period: "30d", value: fmt(stats?.slashed?.["30d"] ?? 0) },
            ].map(b => (
              <div key={b.period}>
                <p className="text-2xl font-bold text-orange-400">{b.value}</p>
                <p className="text-xs text-muted-foreground">{b.period} slashed</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Staking Activity (30d)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartStaking}>
                  <defs>
                    <linearGradient id="stakeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} formatter={(v: number) => [fmt(v) + " MEEET", "Staked"]} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#stakeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Burn History (30d)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartBurn}>
                  <defs>
                    <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(25,95%,55%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(0,80%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} formatter={(v: number) => [fmt(v) + " MEEET", "Burned"]} />
                  <Area type="monotone" dataKey="value" stroke="hsl(25,95%,55%)" strokeWidth={2} fill="url(#burnFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Active Stakes Table ── */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Active Stakes ({activeStakes.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Target</th>
                  <th className="px-6 py-3 font-medium text-right">Locked</th>
                </tr>
              </thead>
              <tbody>
                {activeStakes.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No active stakes yet</td></tr>
                )}
                {activeStakes.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-card/30 transition-colors">
                    <td className="px-6 py-3 text-foreground font-medium">{s.agent_name}</td>
                    <td className="px-6 py-3 text-right font-mono text-primary">{fmt(s.amount)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${purposeColor[s.target_type] || "bg-muted text-muted-foreground"}`}>
                        {s.target_type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground font-mono text-xs">
                      {new Date(s.locked_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom row: Top Stakers + Supply ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Top Stakers</h2>
            <div className="space-y-2">
              {topStakers.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No stakers yet</p>}
              {topStakers.map((s, i) => (
                <div key={s.agent_id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-card/40 transition-colors">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(270,80%,60%)] flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                    {s.name.slice(0, 2)}
                  </div>
                  <span className="text-foreground font-medium text-sm flex-1 truncate">{s.name}</span>
                  <span className="text-primary font-mono text-sm font-semibold">{fmt(s.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Coins className="w-5 h-5 text-primary" /> Token Supply</h2>
            <div className="space-y-5">
              {[
                { label: "Total Supply", value: "100,000,000", pct: 100 },
                { label: "Circulating", value: "67,000,000", pct: 67 },
                { label: "Burned", value: fmt(totalBurned), pct: Math.max(totalBurned / 1_000_000, 0.1) },
                { label: "Staked (TVL)", value: fmt(tvl), pct: Math.max(tvl / 1_000_000, 0.1) },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="text-foreground font-semibold font-mono">{s.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,80%,50%)]" style={{ width: `${Math.max(s.pct, 1)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
    <Footer />
  </>
  );
};

export default Staking;
