import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

interface AchievementGridProps {
  userId: string;
}

export default function AchievementGrid({ userId }: AchievementGridProps) {
  const { data: achievements, isLoading: loadingAll } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("achievements" as any)
        .select("*")
        .order("requirement_value", { ascending: true });
      return (data || []) as unknown as Achievement[];
    },
  });

  // Fetch agent stats to auto-calculate unlocks
  const { data: agentStats, isLoading: loadingStats } = useQuery({
    queryKey: ["agent-stats-for-achievements", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: agents } = await supabase
        .from("agents")
        .select("id, kills, quests_completed, balance_meeet, discoveries_count, reputation")
        .eq("user_id", userId);

      const agent = agents?.[0];
      if (!agent) return null;

      // Get oracle bets count
      const { count: oracleBets } = await supabase
        .from("oracle_bets")
        .select("id", { count: "exact" }).limit(0)
        .eq("user_id", userId);

      // Get guild membership
      const { count: guildMember } = await supabase
        .from("guild_members")
        .select("id", { count: "exact" }).limit(0)
        .eq("agent_id", agent.id);

      // Get referral count
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_count")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        kills: agent.kills || 0,
        quests_completed: agent.quests_completed || 0,
        balance_meeet: Number(agent.balance_meeet) || 0,
        discoveries: agent.discoveries_count || 0,
        reputation: agent.reputation || 0,
        oracle_bets: oracleBets || 0,
        guild_member: guildMember || 0,
        referrals: (profile as any)?.referral_count || 0,
        marketplace_sales: 0,
      };
    },
  });

  if (loadingAll || loadingStats) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  // Deduplicate by name
  const uniqueAchievements = (achievements || []).filter(
    (a, i, arr) => arr.findIndex((b) => b.name === a.name) === i
  );

  // Check unlock status based on real stats
  function isUnlocked(a: Achievement): boolean {
    if (!agentStats) return false;
    const val = a.requirement_value;
    switch (a.requirement_type) {
      case "kills": return agentStats.kills >= val;
      case "quests_completed": return agentStats.quests_completed >= val;
      case "balance_meeet": return agentStats.balance_meeet >= val;
      case "oracle_bets": return agentStats.oracle_bets >= val;
      case "guild_member": return agentStats.guild_member >= val;
      case "referrals": return agentStats.referrals >= val;
      case "marketplace_sales": return agentStats.marketplace_sales >= val;
      case "discoveries": return agentStats.discoveries >= val;
      default: return false;
    }
  }

  function getProgress(a: Achievement): number {
    if (!agentStats) return 0;
    const val = a.requirement_value;
    let current = 0;
    switch (a.requirement_type) {
      case "kills": current = agentStats.kills; break;
      case "quests_completed": current = agentStats.quests_completed; break;
      case "balance_meeet": current = agentStats.balance_meeet; break;
      case "oracle_bets": current = agentStats.oracle_bets; break;
      case "guild_member": current = agentStats.guild_member; break;
      case "referrals": current = agentStats.referrals; break;
      case "marketplace_sales": current = agentStats.marketplace_sales; break;
      case "discoveries": current = agentStats.discoveries; break;
    }
    return Math.min(100, (current / val) * 100);
  }

  const unlockedCount = uniqueAchievements.filter(isUnlocked).length;

  return (
    <Card className="glass-card border-border overflow-hidden relative group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-yellow-400 to-amber-500/60" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-sm">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Achievements
          <span className="ml-auto text-xs font-body text-muted-foreground">
            <span className={unlockedCount > 0 ? "text-yellow-400 font-bold" : ""}>{unlockedCount}</span>/{uniqueAchievements.length}
          </span>
        </CardTitle>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-1000"
            style={{ width: `${uniqueAchievements.length ? (unlockedCount / uniqueAchievements.length) * 100 : 0}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
            {uniqueAchievements.map((a) => {
              const unlocked = isUnlocked(a);
              const progress = getProgress(a);
              return (
                <Tooltip key={a.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-300 cursor-default group/item ${
                        unlocked
                          ? "bg-gradient-to-b from-yellow-500/15 to-amber-500/5 border-yellow-500/30 shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 hover:scale-105"
                          : "bg-muted/20 border-border/20 hover:opacity-80 hover:border-border/40"
                      }`}
                    >
                      {unlocked && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] text-background font-bold shadow-md">
                          ✓
                        </div>
                      )}
                      <span className={`text-2xl group-hover/item:scale-110 transition-transform ${!unlocked ? "grayscale opacity-50" : ""}`}>
                        {a.icon}
                      </span>
                      <span className={`text-[10px] font-display font-semibold leading-tight ${!unlocked ? "text-muted-foreground" : ""}`}>
                        {a.name}
                      </span>
                      {/* Mini progress bar for locked */}
                      {!unlocked && progress > 0 && (
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                          <div className="h-full rounded-full bg-yellow-500/50 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-semibold text-xs">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.description}</p>
                    {!unlocked && <p className="text-[10px] text-yellow-400 mt-1">{Math.round(progress)}% complete</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
