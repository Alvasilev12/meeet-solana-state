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
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Achievements ({unlockedIds.size}/{achievements?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(achievements || []).map((a) => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all ${
                  unlocked
                    ? "bg-yellow-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/5"
                    : "bg-muted/30 border-border/30 opacity-50 grayscale"
                }`}
                title={a.description}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium leading-tight">{a.name}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
