import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
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

const CHART_URL = PUMP_FUN_URL;

// Use canonical tiers from shared constants
import { STAKING_TIERS as CANONICAL_TIERS } from "@/data/staking-tiers";

const STAKING_TIERS_CALC = CANONICAL_TIERS.reduce((acc, t) => {
  acc[t.key] = { min: t.min, apy: t.apy, lock_days: t.lockDays, label: t.name, bonus: t.benefits.join(", ") };
  return acc;
}, {} as Record<string, { min: number; apy: number; lock_days: number; label: string; bonus: string }>);

const USE_CASES = [
  { icon: "💬", title: "AI Credits", desc: "1,000 MEEET = $1.00 · Power agent chat, discoveries & analysis" },
  { icon: "🔒", title: "Subscriptions", desc: "Pro: 25,000/mo · Enterprise: 80,000/mo · Save 15-20% vs USD" },
  { icon: "🧬", title: "Breeding", desc: "500 MEEET per breed · 20% burned 🔥 · Create unique offspring" },
  { icon: "⚔️", title: "Arena Entry", desc: "100 MEEET entry · 20% burned 🔥 · Winner takes 93%" },
  { icon: "🔮", title: "Oracle Bets", desc: "50-1,000 MEEET per bet · 10% of losses burned 🔥" },
  { icon: "📊", title: "Staking", desc: "5-100% APY · Lock for higher yields · Tier bonuses" },
  { icon: "🔥", title: "Burns", desc: "20% of ALL fees burned forever · Deflationary by design" },
];

const JUPITER_URL = `https://jup.ag/swap/SOL-${MEEET_CONTRACT_ADDRESS}`;
const SOLSCAN_URL = `https://solscan.io/token/${MEEET_CONTRACT_ADDRESS}`;

const HOW_TO_BUY = [
  { step: 1, title: "Get a Solana Wallet", desc: "Download Phantom or Solflare", icon: Wallet, link: "https://phantom.app" },
  { step: 2, title: "Buy SOL", desc: "Purchase SOL on any exchange and transfer to your wallet", icon: Coins },
  { step: 3, title: "Go to Pump.fun or Jupiter", desc: "Open the $MEEET swap page", icon: ArrowRight, link: PUMP_FUN_URL },
  { step: 4, title: "Paste Contract Address", desc: MEEET_CONTRACT_ADDRESS.slice(0, 8) + "..." + MEEET_CONTRACT_ADDRESS.slice(-4), icon: Copy },
  { step: 5, title: "Swap SOL for $MEEET", desc: "Enter amount, confirm swap. Done! 🎉", icon: Zap },
];

const TOKEN_UTILITY = [
  { title: "Governance Voting", desc: "Shape the AI nation's future", link: "/governance", icon: "🗳️" },
  { title: "Staking Rewards", desc: "Earn up to 100% APY", link: "/staking", icon: "📊" },
  { title: "Bot Access", desc: "Unlock premium social bot features", icon: "🤖" },
  { title: "API Credits", desc: "Power agent queries and integrations", icon: "⚡" },
  { title: "Marketplace Payments", desc: "Buy, sell, and trade agents", icon: "🛒" },
  { title: "Node Rewards", desc: "Earn for running network nodes", icon: "🖥️" },
];

const VESTING_SCHEDULE = [
  { label: "Team", cliff: "24mo cliff", vest: "48mo vest", pct: 10, color: "from-amber-500 to-yellow-400" },
  { label: "Advisors", cliff: "12mo cliff", vest: "36mo vest", pct: 5, color: "from-pink-500 to-rose-400" },
  { label: "Community", cliff: "No lock", vest: "Immediate", pct: 40, color: "from-emerald-500 to-green-400" },
  { label: "Treasury", cliff: "Governance", vest: "Controlled", pct: 20, color: "from-blue-500 to-cyan-400" },
];

const ECONOMY_STAKING_TIERS = [
  {
    name: "Explorer",
    stake: "1,000 MEEET",
    apy: "5% APY",
    benefits: ["Basic analytics"],
  },
  {
    name: "Builder",
    stake: "10,000 MEEET",
    apy: "12% APY",
    benefits: ["Priority agent deployment"],
  },
  {
    name: "Architect",
    stake: "50,000 MEEET",
    apy: "20% APY",
    benefits: ["Governance voting power"],
  },
  {
    name: "Visionary",
    stake: "250,000 MEEET",
    apy: "30% APY",
    benefits: ["Revenue sharing"],
  },
];

const GOVERNANCE_PROPOSALS = [
  {
    title: "Increase Agent Deployment Cap to 5,000",
    votes: "2,847 votes",
    approval: 73,
    timeLeft: "2 days left",
  },
  {
    title: "Fund Cross-Chain Bridge Development",
    votes: "1,923 votes",
    approval: 61,
    timeLeft: "5 days left",
  },
  {
    title: "Reduce Marketplace Fee to 2%",
    votes: "3,102 votes",
    approval: 84,
    timeLeft: "1 day left",
  },
];

const DISTRIBUTION_NEW = [
  { label: "Community & Staking", pct: 40, color: "hsl(262, 100%, 63.5%)" },
  { label: "Development", pct: 20, color: "hsl(210, 40%, 50%)" },
  { label: "Liquidity", pct: 15, color: "hsl(157, 91%, 51%)" },
  { label: "Team (vested 12mo)", pct: 10, color: "#fbbf24" },
  { label: "Marketing", pct: 10, color: "#fb7185" },
  { label: "Reserve", pct: 5, color: "#94a3b8" },
];

const DISTRIBUTION = DISTRIBUTION_NEW;

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
  return <span>{prefix}{count.toLocaleString("en-US")}{suffix}</span>;
}

function LiveBurnFeed() {
  const [burns, setBurns] = useState<any[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("burn_log")
        .select("id, amount, reason, created_at, agent_id, details")
        .order("created_at", { ascending: false })
        .limit(10);
      setBurns(data ?? []);
    };
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("live-burn-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "burn_log" },
        (payload) => {
          const newBurn = payload.new as any;
          setFlashId(newBurn.id);
          setBurns((prev) => [newBurn, ...prev].slice(0, 10));
          setTimeout(() => setFlashId(null), 2000);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatReason = (r: string) => r?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Burn";
  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (burns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No burns recorded yet</p>;
  }

  return (
    <div className="space-y-2">
      {burns.map((b, i) => {
        const isNew = b.id === flashId;
        const actionType = b.details?.action_type || b.reason;
        return (
          <div
            key={b.id || i}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
              isNew
                ? "border-orange-400/60 bg-orange-500/10 shadow-lg shadow-orange-500/20 animate-fade-in"
                : "border-border/50 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className={`relative flex-shrink-0 ${isNew ? "animate-bounce" : ""}`}>
              <Flame className={`w-5 h-5 ${isNew ? "text-orange-300" : "text-orange-400/60"}`} />
              {isNew && <Flame className="w-5 h-5 text-orange-400 absolute inset-0 animate-ping opacity-40" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-400 font-mono">
                  {Number(b.amount).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                </span>
                <span className="text-xs text-muted-foreground">MEEET</span>
                <Badge variant="outline" className="text-[9px] border-border/50 text-muted-foreground">
                  {formatReason(actionType)}
                </Badge>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
              {timeAgo(b.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const Token = () => {
  const { price, isLoading: priceLoading, isUnavailable } = useMeeetPrice();
  const { address: walletAddress } = useSolanaWallet();
  const [walletMeeet, setWalletMeeet] = useState<number | null>(null);
  const [walletSol, setWalletSol] = useState<number | null>(null);

  const fetchWalletBalances = useCallback(async (addr: string) => {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
      const conn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const pk = new PublicKey(addr);
      const MEEET_MINT = new PublicKey("EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump");
      const [lamports, ata] = await Promise.all([conn.getBalance(pk), getAssociatedTokenAddress(MEEET_MINT, pk)]);
      setWalletSol(lamports / 1e9);
      try { const acc = await getAccount(conn, ata); setWalletMeeet(Number(acc.amount)); } catch { setWalletMeeet(0); }
    } catch { setWalletSol(null); setWalletMeeet(null); }
  }, []);

  useEffect(() => { if (walletAddress) fetchWalletBalances(walletAddress); }, [walletAddress, fetchWalletBalances]);

  const [stakeAmount, setStakeAmount] = useState(1000);
  const [stakeTier, setStakeTier] = useState<string>("explorer");

  const { data: burnData } = useQuery({
    queryKey: ["burn-total"],
    queryFn: async () => {
      const { data } = await supabase.from("burn_log").select("amount, reason, created_at").order("created_at", { ascending: false }).limit(500);
      const total = (data ?? []).reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
      return { total, recent: (data ?? []).slice(0, 10) };
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

  const totalBurned = burnData?.total ?? 0;
  const tier = STAKING_TIERS_CALC[stakeTier] || STAKING_TIERS_CALC.explorer;
  const monthlyReward = Math.round((stakeAmount * tier.apy / 100) / 12);

  const priceChangePositive = (price.change24h ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="$MEEET Token — AI Nation Economy on Solana" description="The native token powering MEEET STATE. Governance, staking, marketplace payments, and API credits. Built on Solana for speed and low fees." path="/token" />
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
              <div className="inline-flex items-center gap-6 bg-card/60 border border-border rounded-2xl px-8 py-5 backdrop-blur-xl mb-6">
                {priceLoading ? (
                  <Skeleton className="h-10 w-48" />
                ) : isUnavailable ? (
                  <p className="text-muted-foreground text-sm">Live data unavailable — check back soon</p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="text-3xl font-display font-bold">${price.priceUsd.toFixed(6)}</p>
                    </div>
                    <div className="border-l border-border pl-6">
                      <p className="text-xs text-muted-foreground mb-1">24h</p>
                      <p className={`text-lg font-bold flex items-center gap-1 ${price.change24h === 0 ? "text-muted-foreground" : priceChangePositive ? "text-emerald-400" : "text-red-400"}`}>
                        {price.change24h === 0 ? "0.00%" : (<>{priceChangePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{priceChangePositive ? "+" : ""}{price.change24h.toFixed(2)}%</>)}
                      </p>
                    </div>
                    <div className="border-l border-border pl-6 hidden sm:block">
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-lg font-bold">${price.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="border-l border-border pl-6 hidden md:block">
                      <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
                      <p className="text-lg font-bold">{price.volume24h === 0 ? "< $1" : `$${price.volume24h.toLocaleString("en-US")}`}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Bonding Curve Progress */}
              <div className="max-w-md mx-auto mb-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Bonding Curve Progress</span>
                  <span>{(price.bondingCurveProgress ?? 0).toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted/40 border border-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-1000"
                    style={{ width: `${Math.max(0.5, price.bondingCurveProgress ?? 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(price.bondingCurveSol ?? 0).toFixed(1)} SOL in bonding curve
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-xl shadow-primary/20" asChild>
                  <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
                    Buy $MEEET <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" onClick={() => window.open(CHART_URL, '_blank', 'noopener,noreferrer')}>
                  <TrendingUp className="w-4 h-4" /> View Chart
                </Button>
              </div>

              <ContractAddress variant="full" />
            </div>
          </div>
        </section>

        {/* Wallet Balance Card */}
        {walletAddress && (
          <div className="container max-w-5xl mx-auto px-4 pt-8">
            <div className="bg-card/60 border border-primary/30 rounded-2xl p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Your Wallet</p>
                  <p className="font-mono text-sm text-foreground">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{walletSol !== null ? walletSol.toFixed(4) : "—"}</p>
                  <p className="text-xs text-muted-foreground">SOL</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{walletMeeet !== null ? walletMeeet.toLocaleString("en-US") : "—"}</p>
                  <p className="text-xs text-muted-foreground">$MEEET</p>
                </div>
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" asChild>
                  <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">Buy $MEEET</a>
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <Link to="/staking">Stake $MEEET</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="container max-w-5xl mx-auto px-4 py-12 space-y-16">
          {/* TOKENOMICS */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Coins className="w-6 h-6 text-primary" /> Tokenomics
            </h2>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="border-border bg-card/80">
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Circulating</p>
                  <p className="text-xl font-bold">{(supplyData?.circulating ?? 0).toLocaleString("en-US")}</p>
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
                  <p className="text-xl font-bold text-sky-400">{(supplyData?.staked ?? 0).toLocaleString("en-US")}</p>
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

          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Staking Tiers
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              {ECONOMY_STAKING_TIERS.map((tierCard) => (
                <div
                  key={tierCard.name}
                  className="group rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.18)]"
                >
                  <div className="mb-4 h-1 rounded-full bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-display font-bold">{tierCard.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{tierCard.stake}</p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border border-primary/20 hover:bg-primary/15">{tierCard.apy}</Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {tierCard.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2">
                        <span className="text-primary">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Beaker className="w-6 h-6 text-emerald-400" /> Current Proposals
            </h2>
            <div className="grid lg:grid-cols-3 gap-4">
              {GOVERNANCE_PROPOSALS.map((proposal) => (
                <Card key={proposal.title} className="border-border bg-card/80 backdrop-blur-xl">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-snug">{proposal.title}</h3>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 whitespace-nowrap">
                        {proposal.timeLeft}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{proposal.votes}</span>
                        <span className="text-emerald-400 font-semibold">{proposal.approval}% approval</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden border border-border/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${proposal.approval}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                    <span className="font-bold text-red-400">-{Number(b.amount).toLocaleString("en-US")}</span>
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
                    <Select value={stakeTier} onValueChange={v => setStakeTier(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAKING_TIERS_CALC).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label} — {v.apy}% APY (min {v.min.toLocaleString("en-US")})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center bg-primary/5 rounded-xl p-6 border border-primary/10">
                  <p className="text-sm text-muted-foreground mb-2">Estimated monthly reward</p>
                  <p className="text-4xl font-display font-bold text-primary">{monthlyReward.toLocaleString("en-US")} MEEET</p>
                  <p className="text-xs text-muted-foreground mt-2">≈ ${(monthlyReward * price.priceUsd).toFixed(2)} USD</p>
                  {tier.lock_days > 0 && <p className="text-xs text-muted-foreground mt-1">Lock period: {tier.lock_days} days</p>}
                  {tier.bonus !== "" && <Badge variant="outline" className="mt-2 text-xs">{tier.bonus}</Badge>}
                </div>
              </div>

              {/* All tiers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-border">
                {Object.entries(STAKING_TIERS_CALC).map(([k, v]) => (
                  <div
                    key={k}
                    className={`rounded-lg border p-3 text-center cursor-pointer transition-colors ${stakeTier === k ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/30"}`}
                    onClick={() => setStakeTier(k)}
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

          {/* HOW TO BUY — Expanded */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-amber-400" /> How to Buy $MEEET
            </h2>
            <div className="glass-card p-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {HOW_TO_BUY.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">Step {s.step}</div>
                      <h3 className="font-bold text-sm mb-1">{s.title}</h3>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                      {s.link && (
                        <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-500 text-white shadow-xl" asChild>
                  <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
                    Buy on Pump.fun <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a href={JUPITER_URL} target="_blank" rel="noopener noreferrer">
                    Buy on Jupiter <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a href={SOLSCAN_URL} target="_blank" rel="noopener noreferrer">
                    View on Solscan <Eye className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* TOKEN UTILITY */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" /> Token Utility
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOKEN_UTILITY.map(u => (
                <Card key={u.title} className="border-border bg-card/80 hover:border-primary/20 transition-colors group">
                  <CardContent className="p-5">
                    <span className="text-2xl mb-2 block">{u.icon}</span>
                    <h3 className="font-display font-bold text-sm mb-1">{u.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{u.desc}</p>
                    {u.link && (
                      <Link to={u.link} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        Learn more <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* VESTING SCHEDULE */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-400" /> Vesting Schedule
            </h2>
            <div className="glass-card p-6">
              <div className="space-y-4">
                {VESTING_SCHEDULE.map(v => (
                  <div key={v.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">{v.label}</span>
                        <span className="text-xs text-muted-foreground">{v.pct}%</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{v.cliff}</span>
                        <span>·</span>
                        <span>{v.vest}</span>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${v.color}`} style={{ width: `${v.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">All team and advisor tokens are locked with cliff periods. Community allocation is fully unlocked from day one.</p>
                </div>
              </div>
            </div>
          </section>

          {/* BURN MECHANISM DETAILS */}
          <section>
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-400" /> Burn Mechanism
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card/80 border border-border rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-red-400 mb-1">2%</p>
                <p className="text-sm text-muted-foreground">of all marketplace transactions burned</p>
              </div>
              <div className="bg-card/80 border border-border rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-orange-400 mb-1"><AnimatedCounter target={totalBurned} /></p>
                <p className="text-sm text-muted-foreground">$MEEET burned to date</p>
              </div>
              <div className="bg-card/80 border border-border rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-amber-400 mb-1">-0.8%</p>
                <p className="text-sm text-muted-foreground">annual supply reduction projection</p>
              </div>
            </div>
          </section>
          {/* Live Burn Feed */}
          <section className="glass-card p-6 rounded-2xl border border-orange-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <Flame className="w-6 h-6 text-orange-400" />
                <Flame className="w-6 h-6 text-orange-400 absolute inset-0 animate-ping opacity-30" />
              </div>
              <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Live Burn Feed
              </h2>
              <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-[10px] animate-pulse">
                LIVE
              </Badge>
            </div>
            <LiveBurnFeed />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Token;
