import { useState, useEffect, useCallback } from "react";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Flame, TrendingDown, Lock, Award, Coins, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ── mock data ── */
const stakingHistory = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  value: 1_800_000 + Math.round(Math.random() * 400_000 + i * 18_000),
}));

const burnHistory = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  value: Math.round(8_000 + Math.random() * 12_000 + i * 600),
}));

const ACTIVE_STAKES = [
  { agent: "Envoy-Delta", amount: 45_000, purpose: "Discovery", date: "2026-03-28" },
  { agent: "Storm-Blade", amount: 32_000, purpose: "Debate", date: "2026-03-27" },
  { agent: "Market-Mind", amount: 28_500, purpose: "Governance", date: "2026-03-26" },
  { agent: "VenusNode", amount: 21_000, purpose: "Discovery", date: "2026-03-25" },
  { agent: "FrostSoul", amount: 18_200, purpose: "Debate", date: "2026-03-24" },
  { agent: "Architect-Zero", amount: 15_800, purpose: "Governance", date: "2026-03-23" },
  { agent: "QuantumLeap", amount: 12_400, purpose: "Discovery", date: "2026-03-22" },
  { agent: "NovaPulse", amount: 9_600, purpose: "Discovery", date: "2026-03-21" },
];

const TOP_STAKERS = [
  { rank: 1, name: "Envoy-Delta", amount: 245_000 },
  { rank: 2, name: "Storm-Blade", amount: 198_000 },
  { rank: 3, name: "Market-Mind", amount: 176_000 },
  { rank: 4, name: "VenusNode", amount: 152_000 },
  { rank: 5, name: "FrostSoul", amount: 134_000 },
  { rank: 6, name: "Architect-Zero", amount: 121_000 },
  { rank: 7, name: "QuantumLeap", amount: 108_000 },
  { rank: 8, name: "NovaPulse", amount: 95_000 },
  { rank: 9, name: "SolarFlare", amount: 82_000 },
  { rank: 10, name: "DeepOracle", amount: 71_000 },
];

const fmt = (n: number) => n.toLocaleString();

const purposeColor: Record<string, string> = {
  Discovery: "bg-primary/20 text-primary",
  Debate: "bg-accent/20 text-accent-foreground",
  Governance: "bg-green-500/20 text-green-400",
};

/* ── component ── */
const Staking = () => {
  const { address: walletAddress } = useSolanaWallet();
  const [stakeInput, setStakeInput] = useState("");
  const [walletMeeet, setWalletMeeet] = useState<number | null>(null);

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

  return (
  <>
    <SEOHead title="Staking & Burn Dashboard | MEEET STATE" description="Real-time $MEEET staking analytics, burn metrics, and deflation tracking. Stake tokens for 5-100% APY across five tiers." path="/staking" />
    <Navbar />
    <main className="pt-24 pb-16 min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 space-y-8">

        <div className="text-center mb-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Staking & Burn Dashboard</h1>
          <p className="text-muted-foreground text-lg">Real-time $MEEET deflation & staking analytics</p>
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
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>Your Stake: <strong className="text-foreground">0 MEEET</strong></span>
              <span>Earned Rewards: <strong className="text-emerald-400">0 MEEET</strong></span>
              <span>Cooldown: <strong className="text-foreground">None</strong></span>
            </div>
          </div>
        )}

        {/* ── Top Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Lock, label: "Total Value Staked", value: "2,450,000", sub: "MEEET", accent: "text-primary" },
            { icon: Flame, label: "Total Burned", value: "890,000", sub: "MEEET", accent: "text-orange-400" },
            { icon: TrendingDown, label: "Deflation Rate", value: "4.2%", sub: "monthly", accent: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 text-center hover:border-primary/40 transition-colors">
              <s.icon className={`w-6 h-6 mx-auto mb-3 ${s.accent}`} />
              <p className={`text-3xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Burn Rate ── */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Burn Rate</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { period: "24h", value: "12,500" },
              { period: "7d", value: "87,300" },
              { period: "30d", value: "340,000" },
            ].map(b => (
              <div key={b.period}>
                <p className="text-2xl font-bold text-orange-400">{b.value}</p>
                <p className="text-xs text-muted-foreground">{b.period} burned</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staking History */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Staking History (30d)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stakingHistory}>
                  <defs>
                    <linearGradient id="stakeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} formatter={(v: number) => [fmt(v) + " MEEET", "Staked"]} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#stakeFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Burn History */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Burn History (30d)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burnHistory}>
                  <defs>
                    <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(25,95%,55%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(0,80%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1_000).toFixed(0)}k`} />
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
            <h2 className="text-lg font-semibold text-foreground">Active Stakes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Purpose</th>
                  <th className="px-6 py-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVE_STAKES.map((s, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card/30 transition-colors">
                    <td className="px-6 py-3 text-foreground font-medium">{s.agent}</td>
                    <td className="px-6 py-3 text-right font-mono text-primary">{fmt(s.amount)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${purposeColor[s.purpose] || ""}`}>{s.purpose}</span>
                    </td>
                    <td className="px-6 py-3 text-right text-muted-foreground font-mono text-xs">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom row: Top Stakers + Supply ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Stakers */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Top Stakers</h2>
            <div className="space-y-2">
              {TOP_STAKERS.map(s => (
                <div key={s.rank} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-card/40 transition-colors">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.rank <= 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {s.rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(270,80%,60%)] flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                    {s.name.slice(0, 2)}
                  </div>
                  <span className="text-foreground font-medium text-sm flex-1 truncate">{s.name}</span>
                  <span className="text-primary font-mono text-sm font-semibold">{fmt(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supply */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Coins className="w-5 h-5 text-primary" /> Token Supply</h2>
            <div className="space-y-5">
              {[
                { label: "Total Supply", value: "100,000,000", pct: 100 },
                { label: "Circulating", value: "67,000,000", pct: 67 },
                { label: "Burned", value: "890,000", pct: 0.89 },
                { label: "Staked", value: "2,450,000", pct: 2.45 },
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
