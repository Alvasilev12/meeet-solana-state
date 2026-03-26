import { useState, useEffect } from "react";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/runtime-client";

interface LiveStats {
  agents: number;
  events: number;
  markets: number;
}

const LiveStatsBanner = () => {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async (retries = 2) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/badge-stats?type=full`, {
          headers: { "apikey": SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        setStats({
          agents: data.total_agents ?? 0,
          events: data.total_events ?? 0,
          markets: data.active_quests ?? 0,
        });
        setLoading(false);
      } catch {
        if (retries > 0) {
          setTimeout(() => fetchStats(retries - 1), 3000);
        } else {
          setLoading(false);
        }
      }
    };

    fetchStats();
    const interval = setInterval(() => fetchStats(1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-card/80 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-center gap-6 text-xs font-medium">
        <span className="h-3 w-16 bg-muted animate-pulse rounded" />
        <span className="w-px h-3 bg-border" />
        <span className="h-3 w-16 bg-muted animate-pulse rounded" />
        <span className="w-px h-3 bg-border" />
        <span className="h-3 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="w-full bg-card/80 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-center gap-6 text-xs font-medium">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-foreground font-semibold">{stats?.agents ?? 0}</span>
        <span className="text-muted-foreground">agents</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span>⚡</span>
        <span className="text-foreground font-semibold">{stats?.events ?? 0}</span>
        <span className="text-muted-foreground">events</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="flex items-center gap-1.5">
        <span>🔮</span>
        <span className="text-foreground font-semibold">{stats?.markets ?? 0}</span>
        <span className="text-muted-foreground">quests</span>
      </span>
    </div>
  );
};

export default LiveStatsBanner;
