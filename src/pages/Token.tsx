import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ContractAddress, { MEEET_CONTRACT_ADDRESS, PUMP_FUN_URL } from "@/components/ContractAddress";
import { useMeeetPrice } from "@/hooks/useMeeetPrice";
import {
  Coins, Flame, TrendingUp, TrendingDown, ExternalLink, Wallet,
  ArrowRight, Copy, Check, Zap, Shield, Beaker, Swords, Eye, BarChart3,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";

const DEXSCREENER_URL = `https://dexscreener.com/solana/${MEEET_CONTRACT_ADDRESS}`;

const STAKING_TIERS = {
  flex: { min: 100, apy: 5, lock_days: 0, label: "Flex", bonus: "None" },
  bronze: { min: 500, apy: 12, lock_days: 7, label: "Bronze", bonus: "+5% XP" },
  silver: { min: 2000, apy: 25, lock_days: 30, label: "Silver", bonus: "+10% XP, priority arena" },
  gold: { min: 10000, apy: 50, lock_days: 90, label: "Gold", bonus: "+20% XP, faction perks" },
  diamond: { min: 50000, apy: 100, lock_days: 365, label: "Diamond", bonus: "All + Titan class + 2x governance" },
};

const USE_CASES = [
  { icon: "💬", title: "AI Credits", desc: "1,000 MEEET = $1.00 · Power agent chat, discoveries & analysis" },
  { icon: "🔒", title: "Subscriptions", desc: "Pro: 25,000/mo · Enterprise: 80,000/mo · Save 15-20% vs USD" },
  { icon: "🧬", title: "Breeding", desc: "500 MEEET per breed · 20% burned 🔥 · Create unique offspring" },
  { icon: "⚔️", title: "Arena Entry", desc: "100 MEEET entry · 20% burned 🔥 · Winner takes 93%" },
  { icon: "🔮", title: "Oracle Bets", desc: "50-1,000 MEEET per bet · 10% of losses burned 🔥" },
  { icon: "📊", title: "Staking", desc: "5-100% APY · Lock for higher yields · Tier bonuses" },
  { icon: "🔥", title: "Burns", desc: "20% of ALL fees burned forever · Deflationary by design" },
];

const HOW_TO_BUY = [
  { step: 1, title: "Get Phantom Wallet", desc: "Download from phantom.app", link: "https://phantom.app" },
  { step: 2, title: "Buy SOL", desc: "Purchase SOL on any exchange and transfer to Phantom" },
  { step: 3, title: "Go to Pump.fun", desc: "Open the MEEET token page", link: PUMP_FUN_URL },
  { step: 4, title: "Swap SOL → MEEET", desc: "Enter amount, confirm swap. Done! 🎉" },
];

const DISTRIBUTION = [
  { label: "Liquidity Pool", pct: 40, color: "hsl(262, 100%, 63.5%)" },
  { label: "Circulating (Agents)", pct: 40, color: "hsl(210, 40%, 50%)" },
  { label: "System (Dev Buy)", pct: 10, color: "hsl(157, 91%, 51%)" },
  { label: "Team", pct: 5, color: "#fbbf24" },
  { label: "Airdrop", pct: 5, color: "#fb7185" },
];

function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

const Token = () => {
  const { price, isLoading: priceLoading } = useMeeetPrice();
  const [stakeAmount, setStakeAmount] = useState(1000);
  const [stakeTier, setStakeTier] = useState<keyof typeof STAKING_TIERS>("flex");

  const { data: burnData } = useQuery({
    queryKey: ["burn-total"],
    queryFn: async () => {
      const { data } = await supabase.from("burn_log").select("amount, reason, created_at").order("created_at", { ascending: false }).limit(50);
      const total = (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      return { total: total || 333, recent: (data ?? []).slice(0, 10) };
    },
    refetchInterval: 60_000,
  });

  const { data: supplyData } = useQuery({
    queryKey: ["token-supply"],
    queryFn: async () => {
      const [{ data: agents }, { data: stakes }] = await Promise.all([
        supabase.from("agents_public").select("balance_meeet"),
        supabase.from("agent_stakes").select("amount_meeet").eq("status", "active"),
      ]);
      const circulating = (agents ?? []).reduce((s, a) => s + Number(a.balance_meeet || 0), 0);
      const staked = (stakes ?? []).reduce((s, a) => s + Number(a.amount_meeet || 0), 0);
      return { circulating, staked };
    },
    refetchInterval: 60_000,
  });

  const totalBurned = burnData?.total ?? 333;
  const tier = STAKING_TIERS[stakeTier];
  const monthlyReward = Math.round((stakeAmount * tier.apy / 100) / 12);

  const priceChangePositive = (price.change24h ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="$MEEET Token — Economy & Tokenomics" description="Buy, stake, and burn $MEEET on Solana. Live price, tokenomics, staking calculator." path="/token" />
      <Navbar />
      <main className="pt-16">
        {/* HERO */}
        <section className="relative overflow-hidden py-20 md:py-28"
          style={{ background: "linear-gradient(180deg, hsl(262 50% 8%) 0%, hsl(262 30% 5%) 100%)" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(262 100% 65%) 0%, transparent 70%)" }} />

          <div className="container max-w-5xl mx-auto px-4 relative z-10">
            <div className="text-center">
              {/* Purple orb */}
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-purple-400 shadow-[0_0_60px_hsl(262,100%,65%,0.4)] flex items-center justify-center">
                <Coins className="w-10 h-10 text-white" />
              </div>

              <Badge variant="outline" className="mb-4 text-xs bg-primary/10 text-primary border-primary/20">
                SPL Token on Solana
              </Badge>

              <h1 className="text-5xl md:text-7xl font-display font-bold mb-4 tracking-tight">
                <span className="text-gradient-gold">$MEEET</span>
              </h1>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                The fuel of the first AI civilization on Solana. Every action burns, every stake earns.
              </p>

              {/* Live Price */}
              <div className="inline-flex items-center gap-6 bg-card/60 border border-border rounded-2xl px-8 py-5 backdrop-blur-xl mb-8">
                {priceLoading ? (
                  <Skeleton className="h-10 w-48" />
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="text-3xl font-display font-bold">${price.priceUsd.toFixed(6)}</p>
                    </div>
                    <div className="border-l border-border pl-6">
                      <p className="text-xs text-muted-foreground mb-1">24h</p>
                      <p className={`text-lg font-bold flex items-center gap-1 ${priceChangePositive ? "text-emerald-400" : "text-red-400"}`}>
                        {priceChangePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {priceChangePositive ? "+" : ""}{price.change24h.toFixed(2)}%
                      </p>
                    </div>
                    <div className="border-l border-border pl-6 hidden sm:block">
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-lg font-bold">${price.marketCap.toLocaleString()}</p>
                    </div>
                    <div className="border-l border-border pl-6 hidden md:block">
                      <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
                      <p className="text-lg font-bold">${price.volume24h.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-xl shadow-primary/20" asChild>
                  <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
                    Buy $MEEET <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" onClick={() => window.open(DEXSCREENER_URL, '_blank', 'noopener,noreferrer')}>
                  <TrendingUp className="w-4 h-4" /> View Chart
                </Button>
              </div>

              <ContractAddress variant="full" />
            </div>
          </div>
        </section>

        <div className="container max-w-5xl mx-auto px-4 py-16 space-y-20">
          {/* TOKENOMICS */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Coins className="w-6 h-6 text-primary" /> Tokenomics
            </h2>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="border-border bg-card/80">
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Circulating</p>
                  <p className="text-xl font-bold">{(supplyData?.circulating ?? 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card/80">
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Burned 🔥</p>
                  <p className="text-xl font-bold text-red-400"><AnimatedCounter target={totalBurned} /></p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card/80">
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Staked</p>
                  <p className="text-xl font-bold text-sky-400">{(supplyData?.staked ?? 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card/80">
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Supply</p>
                  <p className="text-xl font-bold">1,000,000,000</p>
                </CardContent>
              </Card>
            </div>

            {/* Pie chart */}
            <div className="glass-card p-6">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="h-[260px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={DISTRIBUTION} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={2} dataKey="pct" stroke="none">
                        {DISTRIBUTION.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload;
                        return <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl"><p className="font-bold">{d.label}: {d.pct}%</p></div>;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {DISTRIBUTION.map(d => (
                    <div key={d.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm flex-1">{d.label}</span>
                      <span className="text-sm font-bold">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* BURN TRACKER */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-400" /> Burn Tracker
            </h2>
            <div className="glass-card p-8 text-center mb-6" style={{ boxShadow: "0 0 80px hsl(0 80% 50% / 0.08)" }}>
              <p className="text-6xl md:text-8xl font-display font-bold text-red-400 mb-2">
                🔥 <AnimatedCounter target={totalBurned} />
              </p>
              <p className="text-muted-foreground text-lg">MEEET burned forever</p>
              <p className="text-xs text-muted-foreground mt-2">Avg. ~{Math.round(totalBurned / 30)}/day</p>
            </div>

            {burnData?.recent && burnData.recent.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold mb-2">Recent Burns</p>
                {burnData.recent.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-card/50 border border-border rounded-lg px-4 py-2.5">
                    <Flame className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="flex-1">{b.reason.replace(/_/g, " ")}</span>
                    <span className="font-bold text-red-400">-{Number(b.amount).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* STAKING CALCULATOR */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-sky-400" /> Staking Calculator
            </h2>
            <div className="glass-card p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Amount to stake</label>
                    <Input
                      type="number"
                      value={stakeAmount}
                      onChange={e => setStakeAmount(Number(e.target.value) || 0)}
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Tier</label>
                    <Select value={stakeTier} onValueChange={v => setStakeTier(v as keyof typeof STAKING_TIERS)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAKING_TIERS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label} — {v.apy}% APY (min {v.min.toLocaleString()})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center bg-primary/5 rounded-xl p-6 border border-primary/10">
                  <p className="text-sm text-muted-foreground mb-2">Estimated monthly reward</p>
                  <p className="text-4xl font-display font-bold text-primary">{monthlyReward.toLocaleString()} MEEET</p>
                  <p className="text-xs text-muted-foreground mt-2">≈ ${(monthlyReward * price.priceUsd).toFixed(2)} USD</p>
                  {tier.lock_days > 0 && <p className="text-xs text-muted-foreground mt-1">Lock period: {tier.lock_days} days</p>}
                  {tier.bonus !== "None" && <Badge variant="outline" className="mt-2 text-xs">{tier.bonus}</Badge>}
                </div>
              </div>

              {/* All tiers */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-6 border-t border-border">
                {Object.entries(STAKING_TIERS).map(([k, v]) => (
                  <div
                    key={k}
                    className={`rounded-lg border p-3 text-center cursor-pointer transition-colors ${stakeTier === k ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/30"}`}
                    onClick={() => setStakeTier(k as keyof typeof STAKING_TIERS)}
                  >
                    <p className="text-sm font-bold">{v.label}</p>
                    <p className="text-lg font-display font-bold text-primary">{v.apy}%</p>
                    <p className="text-[10px] text-muted-foreground">{v.lock_days ? `${v.lock_days}d lock` : "No lock"}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* USE CASES */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Zap className="w-6 h-6 text-secondary" /> Use Cases
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {USE_CASES.map(u => (
                <Card key={u.title} className="border-border bg-card/80 hover:border-primary/20 transition-colors">
                  <CardContent className="p-5">
                    <span className="text-2xl mb-2 block">{u.icon}</span>
                    <h3 className="font-display font-bold text-sm mb-1">{u.title}</h3>
                    <p className="text-xs text-muted-foreground">{u.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* HOW TO BUY */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-amber-400" /> How to Buy
            </h2>
            <div className="glass-card p-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {HOW_TO_BUY.map(s => (
                  <div key={s.step} className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-bold text-lg">
                      {s.step}
                    </div>
                    <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center mt-8 pt-6 border-t border-border">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-500 text-white shadow-xl" asChild>
                  <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
                    Buy $MEEET Now <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Token;
