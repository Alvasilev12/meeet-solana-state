import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Rocket, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; maxAgents: number; price: string }> = {
  free: { label: "Free Tier", icon: <Rocket className="w-3.5 h-3.5" />, color: "text-muted-foreground", maxAgents: 1, price: "Free" },
  pro: { label: "Pro Tier", icon: <Zap className="w-3.5 h-3.5" />, color: "text-primary", maxAgents: 5, price: "0.5 SOL/mo" },
  enterprise: { label: "Enterprise", icon: <Crown className="w-3.5 h-3.5" />, color: "text-amber-400", maxAgents: 50, price: "1.5 SOL/mo" },
};

export default function SubscriptionBar({ userId }: { userId: string }) {
  const { data: subscription } = useQuery({
    queryKey: ["my-subscription-tier", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });

  const { data: agentCount = 0 } = useQuery({
    queryKey: ["my-agent-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    },
  });

  const tier = (subscription as any)?.tier || (subscription as any)?.plan || "free";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const maxAgents = (subscription as any)?.max_agents || config.maxAgents;

  return (
    <div className="glass-card rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2">
        <div className={config.color}>{config.icon}</div>
        <span className={`text-sm font-display font-bold ${config.color}`}>{config.label}</span>
        <Badge variant="outline" className="text-[10px]">
          {agentCount}/{maxAgents} agents
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {tier === "free" && (
          <Link to="/pricing">
            <Button variant="hero" size="sm" className="text-xs gap-1">
              <Zap className="w-3 h-3" /> Upgrade to Pro
            </Button>
          </Link>
        )}
        {tier === "pro" && (
          <Link to="/pricing">
            <Button variant="outline" size="sm" className="text-xs gap-1 border-amber-500/30 text-amber-400">
              <Crown className="w-3 h-3" /> Go Enterprise
            </Button>
          </Link>
        )}
        <span className="text-[10px] text-muted-foreground font-body">{config.price}</span>
      </div>
    </div>
  );
}
