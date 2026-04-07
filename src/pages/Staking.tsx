import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, Lock, TrendingUp, Users, Percent } from "lucide-react";

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

const Staking = () => (
  <>
    <SEOHead title="Staking & Burns | MEEET STATE" description="Stake $MEEET tokens, track burn rates, and monitor supply metrics." path="/staking" />
    <Navbar />
    <main className="pt-24 pb-16 min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <h1 className="text-4xl font-bold text-foreground text-center">Staking & Burns</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {METRICS.map(m => (
            <div key={m.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.sub}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>

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

export default Staking;
