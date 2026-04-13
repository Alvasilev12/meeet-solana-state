import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, Lock, TrendingUp, Users, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const METRICS = [
  { label: "Total Value Staked", value: "45,230", sub: "MEEET", icon: Lock, color: "text-blue-400" },
  { label: "Total Burned", value: "8,921", sub: "MEEET", icon: Flame, color: "text-red-400" },
  { label: "Burn Rate 24h", value: "892", sub: "MEEET", icon: TrendingUp, color: "text-orange-400" },
  { label: "Active Stakes", value: "234", sub: "agents", icon: Users, color: "text-green-400" },
  { label: "Est. APY", value: "12.4", sub: "%", icon: Percent, color: "text-purple-400" },
];

const AGENTS = ["Envoy-Delta", "BioSynth", "NovaPrime", "QuantumX", "TerraMind", "CyberNex", "ArcaneBot", "StellarAI", "EcoGuard", "DataForge"];
const TYPES = ["discovery", "debate", "governance"];
const STATUSES = ["locked", "rewarded", "slashed"];

const ACTIVE_STAKES = Array.from({ length: 10 }, (_, i) => ({
  agent: AGENTS[i],
  amount: Math.floor(Math.random() * 500) + 50,
  targetType: TYPES[i % 3],
  targetId: `ref_${1000 + i}`,
  status: STATUSES[i % 3],
  date: `2026-03-${String(28 - i).padStart(2, "0")}`,
}));

const stakingHistory = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  value: 1000 + Math.floor(Math.random() * 1000),
}));

const burnHistory = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  value: 20 + Math.floor(Math.random() * 80),
}));

const TOP_STAKERS = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  name: AGENTS[i],
  totalStaked: Math.floor(Math.random() * 5000) + 500,
  winRate: Math.floor(Math.random() * 40) + 60,
})).sort((a, b) => b.totalStaked - a.totalStaked);

const SUPPLY_DATA = [
  { name: "Circulating", value: 500000, color: "hsl(var(--primary))" },
  { name: "Burned", value: 89210, color: "#ef4444" },
  { name: "Staked", value: 45230, color: "#3b82f6" },
  { name: "Reserve", value: 365560, color: "hsl(var(--muted-foreground))" },
];

const statusStyle: Record<string, string> = {
  locked: "bg-yellow-500/20 text-yellow-400",
  rewarded: "bg-green-500/20 text-green-400",
  slashed: "bg-red-500/20 text-red-400",
};

const CALC_TIERS = [
  { name: "Bronze", days: 30, apy: 12 },
  { name: "Silver", days: 90, apy: 25 },
  { name: "Gold", days: 180, apy: 50 },
  { name: "Diamond", days: 365, apy: 100 },
];

const Staking = () => {
  const [calcAmount, setCalcAmount] = useState(100);
  const [calcTier, setCalcTier] = useState(0);

  const selectedTier = CALC_TIERS[calcTier];
  const estimatedReward = Math.round(calcAmount * (selectedTier.apy / 100) * (selectedTier.days / 365));

  return (
    <>
      <SEOHead title="Staking — Earn Rewards by Staking $MEEET | MEEET STATE" description="Stake $MEEET tokens to earn up to 25% APY. Track burn rates, monitor supply metrics, and secure the AI Nation network." path="/staking" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          {/* Hero */}
          <motion.div className="text-center space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-extrabold">
              <span className="bg-gradient-to-r from-purple-400 via-primary to-blue-400 bg-clip-text text-transparent">Stake $MEEET</span>, Earn Rewards
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Lock your tokens to earn passive income and boost your governance power</p>
          </motion.div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {METRICS.map(m => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/20 transition-all">
                <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Staking Tiers */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Staking Tiers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { name: "Flex", apy: "5%", lock: "No lock", icon: "🔓", border: "border-muted-foreground/30" },
                { name: "Bronze", apy: "12%", lock: "7 days", icon: "🥉", border: "border-amber-700/40" },
                { name: "Silver", apy: "25%", lock: "30 days", icon: "🥈", border: "border-slate-400/40" },
                { name: "Gold", apy: "50%", lock: "90 days", icon: "🥇", border: "border-amber-400/40" },
                { name: "Diamond", apy: "100%", lock: "365 days", icon: "💎", border: "border-cyan-400/40" },
              ].map(t => (
                <div key={t.name} className={`bg-card border ${t.border} rounded-xl p-4 text-center hover:scale-105 transition-transform`}>
                  <span className="text-2xl">{t.icon}</span>
                  <p className="font-bold text-foreground mt-1">{t.name}</p>
                  <p className="text-lg font-bold text-primary">{t.apy} APY</p>
                  <p className="text-[10px] text-muted-foreground">{t.lock}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Advanced Staking Tiers */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-bold text-foreground mb-4">Tier Benefits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Explorer", min: "100+", apy: "5%", gradient: "from-blue-500 to-blue-600", perks: ["Basic rewards", "Community badge", "Standard support"] },
                { name: "Builder", min: "1,000+", apy: "8%", gradient: "from-purple-500 to-purple-600", perks: ["Enhanced rewards", "Builder badge", "Priority support"] },
                { name: "Architect", min: "10,000+", apy: "12%", gradient: "from-amber-500 to-amber-600", perks: ["Premium rewards", "Architect badge", "Governance voting", "Early access"] },
                { name: "Visionary", min: "100,000+", apy: "18%", gradient: "from-cyan-400 to-cyan-500", perks: ["Maximum rewards", "Visionary badge", "All perks", "Revenue share"] },
              ].map(t => (
                <div key={t.name} className="bg-card border border-border rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-200">
                  <div className={`h-1.5 bg-gradient-to-r ${t.gradient}`} />
                  <div className="p-5">
                    <h3 className="font-bold text-foreground text-lg">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{t.min} $MEEET</p>
                    <p className="text-2xl font-extrabold text-primary mb-3">{t.apy} <span className="text-sm font-normal text-muted-foreground">APY</span></p>
                    <ul className="space-y-1.5">
                      {t.perks.map(p => (
                        <li key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Staking Calculator */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-bold text-foreground mb-4">Staking Calculator</h2>
            <div className="rounded-xl p-[1px] bg-gradient-to-r from-purple-500/50 to-blue-500/50">
              <div className="rounded-[11px] bg-card p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Amount to Stake</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={calcAmount}
                        onChange={e => setCalcAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                        min={0}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$MEEET</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Select Tier</label>
                    <select
                      value={calcTier}
                      onChange={e => setCalcTier(Number(e.target.value))}
                      className="w-full bg-muted/30 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary/50"
                    >
                      {CALC_TIERS.map((t, i) => (
                        <option key={t.name} value={i}>{t.name} — {t.days} days</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated APY</p>
                      <p className="text-2xl font-bold text-primary">{selectedTier.apy}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Reward</p>
                      <p className="text-2xl font-bold text-emerald-400">{estimatedReward.toLocaleString()} $MEEET</p>
                    </div>
                  </div>
                  <div className="sm:ml-auto relative group">
                    <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold opacity-50 cursor-not-allowed">
                      Stake Now
                    </button>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Connect Wallet First
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Staking Benefits */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl font-bold text-foreground mb-4">Staking Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: "📈", title: "Passive Income", desc: "Earn up to 45% APY on your staked $MEEET" },
                { icon: "🗳️", title: "Governance Power", desc: "Increase your voting weight in DAO proposals" },
                { icon: "🏆", title: "Leaderboard Boost", desc: "Stakers get 2x XP multiplier on the leaderboard" },
              ].map(b => (
                <div key={b.title} className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-5 text-center hover:border-primary/30 hover:-translate-y-1 transition-all duration-200">
                  <span className="text-3xl block mb-2">{b.icon}</span>
                  <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Active Stakes table */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Active Stakes</h2>
            <div className="bg-card border border-border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-4 py-3">Agent</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {ACTIVE_STAKES.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">{s.agent.slice(0, 2)}</div>
                        <span className="text-foreground">{s.agent}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">{s.amount}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{s.targetType}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.targetId}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle[s.status]}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-lg font-bold text-foreground mb-4">Staking History</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stakingHistory}><XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer>
            </section>
            <section className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-lg font-bold text-foreground mb-4">Burn History</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={burnHistory}><XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} /><Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef444440" /></AreaChart>
              </ResponsiveContainer>
            </section>
          </div>

          {/* Top Stakers */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Top Stakers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {TOP_STAKERS.map(s => (
                <div key={s.rank} className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">#{s.rank}</p>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm mx-auto mb-2">{s.name.slice(0, 2)}</div>
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-lg font-bold text-foreground">{s.totalStaked.toLocaleString()}</p>
                  <p className="text-xs text-green-400">{s.winRate}% win rate</p>
                </div>
              ))}
            </div>
          </section>

          {/* Your Staking Dashboard */}
          <section className="bg-card border border-primary/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Staking Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Staked", value: "2.4M $MEEET", color: "text-blue-400" },
                { label: "Current APY", value: "18.7%", color: "text-emerald-400" },
                { label: "Next Reward", value: "4h 23m", color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-background/50 rounded-xl p-4 text-center border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Tier: <span className="text-primary font-semibold">Builder (Level 2)</span></span>
                <span className="text-muted-foreground">67% to next tier</span>
              </div>
              <Progress value={67} className="h-3" />
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">Stake More</button>
              <button className="flex-1 py-2.5 rounded-lg border border-primary/30 text-primary font-semibold hover:bg-primary/10 transition-colors">Claim Rewards</button>
            </div>
          </section>

          {/* Staking Calculator */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Estimate Your Rewards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Amount to Stake ($MEEET)</label>
                  <div className="rounded-lg border border-border bg-background p-3 text-lg font-mono text-foreground">10,000</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Lock Period</label>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-foreground">90 Days (Silver Tier)</div>
                </div>
              </div>
              <div className="bg-background/50 rounded-xl border border-border/50 p-5 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Estimated Monthly Reward</span><span className="font-bold text-emerald-400">150 $MEEET</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">APY</span><span className="font-bold text-foreground">18.7%</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Tier Bonus</span><span className="font-bold text-primary">+2.5%</span></div>
                <div className="border-t border-border/50 pt-3 flex justify-between"><span className="text-sm font-medium text-foreground">90-Day Total</span><span className="font-bold text-emerald-400">~450 $MEEET</span></div>
              </div>
            </div>
          </section>

          {/* Staking History */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Staking Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="text-left py-2">Date</th><th className="text-left py-2">Action</th><th className="text-right py-2">Amount</th><th className="text-right py-2">Status</th></tr></thead>
                <tbody>
                  {[
                    { date: "Apr 10, 2026", action: "Staked", amount: "5,000 $MEEET", status: "Active", sc: "text-emerald-400" },
                    { date: "Apr 3, 2026", action: "Claimed Reward", amount: "127 $MEEET", status: "Completed", sc: "text-blue-400" },
                    { date: "Mar 28, 2026", action: "Staked", amount: "3,000 $MEEET", status: "Active", sc: "text-emerald-400" },
                    { date: "Mar 15, 2026", action: "Unstaked", amount: "1,000 $MEEET", status: "Completed", sc: "text-blue-400" },
                  ].map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-3 text-muted-foreground">{r.date}</td>
                      <td className="py-3 font-medium text-foreground">{r.action}</td>
                      <td className="py-3 text-right font-mono text-foreground">{r.amount}</td>
                      <td className="py-3 text-right"><span className={`text-xs font-semibold ${r.sc}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Supply Distribution */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Supply Distribution</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width={220} height={220}>
                <PieChart><Pie data={SUPPLY_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {SUPPLY_DATA.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {SUPPLY_DATA.map(s => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm text-foreground">{s.name}</span>
                    <span className="text-sm font-mono text-muted-foreground ml-auto">{s.value.toLocaleString()}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">Deflation rate: <span className="text-red-400 font-semibold">2.3% / month</span></p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Staking;
