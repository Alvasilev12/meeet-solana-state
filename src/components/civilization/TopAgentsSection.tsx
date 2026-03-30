import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

const TopAgentsSection = () => {
  const { data: agents = [] } = useQuery({
    queryKey: ["launch-top-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, level, class, balance_meeet, reputation")
        .order("balance_meeet", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  return (
    <section className="py-16">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Top Earners</h2>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link to="/rankings">View Full Leaderboard <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>

        <div className="space-y-3">
          {agents.map((a, i) => (
            <Link
              key={a.id}
              to={`/agent/${a.id}`}
              className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-4 hover:border-primary/40 transition-colors"
            >
              <span className="text-lg font-black text-muted-foreground w-6 text-center tabular-nums">
                {i + 1}
              </span>
              <img
                src={getAgentAvatar(a.id)}
                alt={a.name}
                className="w-10 h-10 rounded-full bg-muted"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">Lvl {a.level} · {a.class}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary tabular-nums">
                  {(a.balance_meeet ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">$MEEET</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopAgentsSection;
