import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Rocket, Zap, CheckCircle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SubscriptionBar({ userId }: { userId: string }) {
  const { t } = useLanguage();

  const TIER_CONFIG: Record<string, { labelKey: string; icon: React.ReactNode; color: string; maxAgents: number }> = {
    free: { labelKey: "sub.freeTier", icon: <Rocket className="w-3.5 h-3.5" />, color: "text-muted-foreground", maxAgents: 1 },
    pro: { labelKey: "sub.proTier", icon: <Zap className="w-3.5 h-3.5" />, color: "text-primary", maxAgents: 5 },
    enterprise: { labelKey: "sub.enterprise", icon: <Crown className="w-3.5 h-3.5" />, color: "text-amber-400", maxAgents: 50 },
  };

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
        .select("id", { count: "exact" }).limit(0)
        .eq("user_id", userId);
      return count ?? 0;
    },
  });

  const tier = (subscription as any)?.tier || (subscription as any)?.plan || "free";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const maxAgents = (subscription as any)?.max_agents || config.maxAgents;
  const expiresAt = (subscription as any)?.expires_at;

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const priceLabels: Record<string, string> = { free: "Free", pro: "0.19 SOL/mo", enterprise: "1.49 SOL/mo" };

  return (
    <div className="glass-card rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2">
        <div className={config.color}>{config.icon}</div>
        <span className={`text-sm font-display font-bold ${config.color}`}>{t(config.labelKey)}</span>
        <Badge variant="outline" className="text-[10px]">
          {agentCount}/{maxAgents} {t("sub.agents")}
        </Badge>
        {tier !== "free" && daysLeft !== null && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {daysLeft}d
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {tier === "free" && (
          <Link to="/pricing">
            <Button variant="hero" size="sm" className="text-xs gap-1">
              <Zap className="w-3 h-3" /> {t("sub.upgradePro")}
            </Button>
          </Link>
        )}
        {tier === "pro" && (
          <Link to="/pricing">
            <Button variant="outline" size="sm" className="text-xs gap-1 border-amber-500/30 text-amber-400">
              <Crown className="w-3 h-3" /> {t("sub.goEnterprise")}
            </Button>
          </Link>
        )}
        {tier === "enterprise" && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <CheckCircle className="w-3 h-3" /> Max
          </span>
        )}
        <span className="text-[10px] text-muted-foreground font-body">{priceLabels[tier] || ""}</span>
      </div>
    </div>
  );
}