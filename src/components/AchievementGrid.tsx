import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
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

  const { data: userAchievements, isLoading: loadingUser } = useQuery({
    queryKey: ["user-achievements", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_achievements" as any)
        .select("achievement_id, unlocked_at")
        .eq("user_id", userId);
      return (data || []) as unknown as UserAchievement[];
    },
  });

  if (loadingAll || loadingUser) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  const unlockedIds = new Set((userAchievements || []).map((ua) => ua.achievement_id));

  // Deduplicate achievements by name (some may have been seeded multiple times)
  const uniqueAchievements = (achievements || []).filter(
    (a, i, arr) => arr.findIndex((b) => b.name === a.name) === i
  );
  const unlockedCount = uniqueAchievements.filter((a) => unlockedIds.has(a.id)).length;

  return (
    <Card className="glass-card border-border overflow-hidden relative group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-yellow-400 to-amber-500/60" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-sm">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Achievements
          <span className="ml-auto text-xs font-body text-muted-foreground">
            {unlockedCount}/{uniqueAchievements.length}
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
          {uniqueAchievements.map((a) => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div
                key={a.id}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-300 cursor-default group/item ${
                  unlocked
                    ? "bg-gradient-to-b from-yellow-500/15 to-amber-500/5 border-yellow-500/30 shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20 hover:scale-105"
                    : "bg-muted/20 border-border/20 opacity-40 grayscale hover:opacity-60"
                }`}
                title={a.description}
              >
                {unlocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] text-background font-bold shadow-md">
                    ✓
                  </div>
                )}
                <span className="text-2xl group-hover/item:scale-110 transition-transform">{a.icon}</span>
                <span className="text-[10px] font-display font-semibold leading-tight">{a.name}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
