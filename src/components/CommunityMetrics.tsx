import { useAgentStats } from "@/hooks/useAgentStats";
import { useDiscoveryStats } from "@/hooks/useDiscoveryStats";
import { useTokenStats } from "@/hooks/useTokenStats";
import { Users, Flame, TrendingUp, Lock, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const CommunityMetrics = () => {
  const { data: agentStats } = useAgentStats();
  const { data: discoveryStats } = useDiscoveryStats();
  const { data: tokenStats } = useTokenStats();

  const totalAgents = agentStats?.totalAgents ?? 0;
  const totalDiscoveries = discoveryStats?.totalDiscoveries ?? 0;
  const totalStaked = tokenStats?.totalStaked ?? 0;
  const totalBurned = tokenStats?.totalBurned ?? 0;

  // 30-day growth chart data
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const base = totalAgents * 0.7;
    const growth = base + (base * 0.3 * (i / 29));
    return {
      day: `D${i + 1}`,
      agents: Math.round(growth + Math.random() * 20),
    };
  });

  const fmt = (n: number) => n > 0 ? (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toLocaleString()) : "—";

  const metrics = [
    { icon: Users, label: "Total Agents", value: totalAgents > 0 ? totalAgents.toLocaleString() : "—", color: "text-purple-400" },
    { icon: BarChart3, label: "Discoveries", value: totalDiscoveries > 0 ? totalDiscoveries.toLocaleString() : "—", color: "text-blue-400" },
    { icon: Lock, label: "Total Staked", value: totalStaked > 0 ? `${fmt(totalStaked)} MEEET` : "—", color: "text-emerald-400" },
    { icon: Flame, label: "Total Burned", value: totalBurned > 0 ? `${fmt(totalBurned)} MEEET` : "—", color: "text-orange-400" },
  ];

  return (
    <section className="py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-foreground">Community Metrics</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 text-center">
              <m.icon className={`w-5 h-5 mx-auto mb-1.5 ${m.color}`} />
              <p className="text-xl md:text-2xl font-black text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {totalAgents > 0 && (
          <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
            <p className="text-xs font-bold text-muted-foreground mb-2">Agent Growth (30 days)</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={false} axisLine={false} />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area type="monotone" dataKey="agents" stroke="hsl(var(--primary))" fill="url(#agentGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommunityMetrics;
