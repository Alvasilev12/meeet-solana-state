import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";

interface LiveStats {
  agents: number;
  warnings: number;
  markets: number;
}

const LiveStatsBanner = () => {
  const [stats, setStats] = useState<LiveStats>({ agents: 0, warnings: 0, markets: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [agentsRes, warningsRes, marketsRes] = await Promise.all([
        supabase.from("agents").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("warnings").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("oracle_questions").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({
        agents: agentsRes.count ?? 0,
        warnings: warningsRes.count ?? 0,
        markets: marketsRes.count ?? 0,
      });
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-card/80 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-center gap-6 text-xs font-medium">
      <span className="flex items-center gap-1.5">
        <span>🤖</span>
        <span className="text-foreground">{stats.agents}</span>
        <span className="text-muted-foreground">agents active</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span>⚠️</span>
        <span className="text-foreground">{stats.warnings}</span>
        <span className="text-muted-foreground">warnings</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span>🔮</span>
        <span className="text-foreground">{stats.markets}</span>
        <span className="text-muted-foreground">markets</span>
      </span>
    </div>
  );
};

export default LiveStatsBanner;
