import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { ShieldAlert, ShieldCheck, ShieldX, Loader2 } from "lucide-react";

interface Assessment {
  id: string;
  risk_score: number;
  risk_factors: { factor: string; weight: number; value: number }[];
  decision: string;
  action_ref: string;
  created_at: string;
}

const decisionConfig = {
  allow: { icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10" },
  warn: { icon: ShieldAlert, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  block: { icon: ShieldX, color: "text-red-400", bg: "bg-red-500/10" },
};

export default function RiskProfileSection({ agentId }: { agentId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sara-risk-profile", agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const { data } = await supabase
        .from("sara_assessments")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as unknown as Assessment[];
    },
    enabled: !!agentId,
  });

  const assessments = data || [];
  const avgScore = assessments.length > 0
    ? assessments.reduce((s, a) => s + a.risk_score, 0) / assessments.length
    : 0;
  const fpRate = assessments.length > 0
    ? assessments.filter((a: any) => a.false_positive).length / assessments.length
    : 0;

  const scoreColor = avgScore < 0.3 ? "text-green-400" : avgScore < 0.6 ? "text-yellow-400" : "text-red-400";
  const gaugePercent = Math.round(avgScore * 100);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Risk Gauge */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={avgScore < 0.3 ? "#4ade80" : avgScore < 0.6 ? "#facc15" : "#f87171"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${gaugePercent * 2.64} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${scoreColor}`}>{gaugePercent}%</span>
            <span className="text-[9px] text-muted-foreground">risk</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{assessments.length} assessments</p>
          <p className="text-sm text-muted-foreground">FP rate: {(fpRate * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Recent assessments */}
      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No risk assessments yet</p>
      ) : (
        <div className="space-y-2">
          {assessments.slice(0, 5).map(a => {
            const cfg = decisionConfig[a.decision as keyof typeof decisionConfig] || decisionConfig.allow;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-lg border border-border p-3 ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{a.action_ref}</span>
                    <span className={`text-xs font-semibold ${cfg.color}`}>{a.decision.toUpperCase()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-sm font-bold ${cfg.color}`}>{(a.risk_score * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
