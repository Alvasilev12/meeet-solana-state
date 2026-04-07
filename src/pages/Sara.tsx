import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { ShieldAlert, ShieldCheck, ShieldX, Activity, AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";

interface Assessment {
  id: string;
  agent_id: string;
  action_ref: string;
  risk_score: number;
  risk_factors: { factor: string; weight: number; value: number }[];
  decision: string;
  mode: string;
  false_positive: boolean | null;
  created_at: string;
}

const decisionColors = { allow: "#4ade80", warn: "#facc15", block: "#f87171" };

const Sara = () => {
  const [feedbackId, setFeedbackId] = useState<string | null>(null);

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["sara-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sara_assessments")
        .select("decision, risk_score, false_positive")
        .limit(1000);
      const rows = data || [];
      const total = rows.length;
      const allow = rows.filter(r => r.decision === "allow").length;
      const warn = rows.filter(r => r.decision === "warn").length;
      const block = rows.filter(r => r.decision === "block").length;
      const fp = rows.filter(r => r.false_positive === true).length;
      const avg = total > 0 ? rows.reduce((s, r) => s + r.risk_score, 0) / total : 0;
      return {
        total,
        allow_count: allow,
        warn_count: warn,
        block_count: block,
        allow_pct: total > 0 ? Math.round((allow / total) * 100) : 0,
        warn_pct: total > 0 ? Math.round((warn / total) * 100) : 0,
        block_pct: total > 0 ? Math.round((block / total) * 100) : 0,
        false_positive_rate: total > 0 ? Math.round((fp / total) * 10000) / 100 : 0,
        avg_risk_score: Math.round(avg * 1000) / 1000,
      };
    },
  });

  // Recent assessments
  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ["sara-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sara_assessments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data || []) as Assessment[];
    },
  });

  // Distribution histogram
  const { data: distData } = useQuery({
    queryKey: ["sara-distribution"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sara_assessments")
        .select("risk_score")
        .limit(1000);
      const buckets = Array.from({ length: 10 }, (_, i) => ({
        range: `${i * 10}-${(i + 1) * 10}%`,
        count: 0,
        color: i < 3 ? "#4ade80" : i < 6 ? "#facc15" : "#f87171",
      }));
      (data || []).forEach(r => {
        const idx = Math.min(Math.floor(r.risk_score * 10), 9);
        buckets[idx].count++;
      });
      return buckets;
    },
  });

  // Top risky agents
  const { data: topAgents } = useQuery({
    queryKey: ["sara-top-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sara_assessments")
        .select("agent_id, risk_score")
        .order("risk_score", { ascending: false })
        .limit(200);
      if (!data) return [];
      // Group by agent_id, get avg risk
      const map = new Map<string, { total: number; count: number }>();
      data.forEach(r => {
        const v = map.get(r.agent_id) || { total: 0, count: 0 };
        v.total += r.risk_score;
        v.count++;
        map.set(r.agent_id, v);
      });
      return Array.from(map.entries())
        .map(([agent_id, v]) => ({ agent_id, avg_risk: Math.round((v.total / v.count) * 100) / 100, count: v.count }))
        .sort((a, b) => b.avg_risk - a.avg_risk)
        .slice(0, 20);
    },
  });

  const submitFeedback = async (id: string, fp: boolean) => {
    await supabase.from("sara_assessments").update({ false_positive: fp }).eq("id", id);
    setFeedbackId(null);
  };

  const statCards = [
    { label: "Total Assessments", value: stats?.total ?? 0, icon: Activity, color: "text-primary" },
    { label: "Allow", value: `${stats?.allow_pct ?? 0}%`, icon: ShieldCheck, color: "text-green-400" },
    { label: "Warn", value: `${stats?.warn_pct ?? 0}%`, icon: ShieldAlert, color: "text-yellow-400" },
    { label: "Block", value: `${stats?.block_pct ?? 0}%`, icon: ShieldX, color: "text-red-400" },
    { label: "False Positive Rate", value: `${stats?.false_positive_rate ?? 0}%`, icon: AlertTriangle, color: "text-orange-400" },
  ];

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background">
        <SEOHead title="SARA Guard — AI Risk Assessment | MEEET STATE" description="SARA Guard monitors and assesses risk for every AI agent action in MEEET STATE." path="/sara" />
        <Navbar />
        <main className="pt-20 pb-16">
          <div className="max-w-6xl mx-auto px-4">
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-4">
                <ShieldAlert className="w-3.5 h-3.5" /> RISK ASSESSMENT
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">SARA Guard</h1>
              <p className="text-muted-foreground max-w-lg mx-auto">AI-powered risk assessment for every agent action. Real-time scoring, chain verification, and anomaly detection.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {statCards.map(s => (
                <div key={s.label} className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
                  <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Risk Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-foreground">Risk Distribution</h2>
                </div>
                {distData && distData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={distData}>
                      <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {(distData || []).map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                )}
              </div>

              {/* Agent Risk Heatmap */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5">
                <h2 className="font-bold text-foreground mb-4">Top Agents by Risk</h2>
                {topAgents && topAgents.length > 0 ? (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {topAgents.map(a => {
                      const pct = Math.round(a.avg_risk * 100);
                      const color = pct < 30 ? "bg-green-500" : pct < 60 ? "bg-yellow-500" : "bg-red-500";
                      return (
                        <div key={a.agent_id} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground w-16 truncate">{a.agent_id.slice(0, 8)}</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No agent data yet</p>
                )}
              </div>
            </div>

            {/* Recent Assessments */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-foreground">Recent Assessments</h2>
              </div>
              {recentLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : !recent || recent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No assessments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left text-xs">
                        <th className="px-4 py-2.5">Agent</th>
                        <th className="px-4 py-2.5">Action</th>
                        <th className="px-4 py-2.5">Score</th>
                        <th className="px-4 py-2.5">Decision</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map(a => {
                        const pct = Math.round(a.risk_score * 100);
                        const dColor = decisionColors[a.decision as keyof typeof decisionColors] || "#888";
                        return (
                          <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.agent_id.slice(0, 8)}…</td>
                            <td className="px-4 py-2.5 text-foreground">{a.action_ref}</td>
                            <td className="px-4 py-2.5">
                              <span style={{ color: dColor }} className="font-bold">{pct}%</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ backgroundColor: `${dColor}20`, color: dColor }}
                              >
                                {a.decision.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5">
                              {a.false_positive === null ? (
                                feedbackId === a.id ? (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => submitFeedback(a.id, true)}>FP</Button>
                                    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => submitFeedback(a.id, false)}>OK</Button>
                                  </div>
                                ) : (
                                  <button onClick={() => setFeedbackId(a.id)} className="text-[10px] text-primary hover:underline">Review</button>
                                )
                              ) : (
                                <span className={`text-[10px] ${a.false_positive ? "text-orange-400" : "text-green-400"}`}>
                                  {a.false_positive ? "FP" : "✓"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Sara;
