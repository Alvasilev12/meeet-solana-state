import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STREAK_BONUSES = [10, 20, 30, 50, 75, 100, 200];
const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function DailyLoginStreak() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streakData } = useQuery({
    queryKey: ["daily-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const { data: todayLogin } = await supabase
        .from("daily_logins" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("login_date", today)
        .maybeSingle();

      const { data: yesterdayLogin } = await supabase
        .from("daily_logins" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("login_date", yesterday)
        .maybeSingle();

      return {
        todayCheckedIn: !!(todayLogin as any),
        currentStreak: (todayLogin as any)?.streak_count ?? (yesterdayLogin as any)?.streak_count ?? 0,
        yesterdayStreak: (yesterdayLogin as any)?.streak_count ?? 0,
      };
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const { data: yesterdayLogin } = await supabase
        .from("daily_logins" as any)
        .select("streak_count")
        .eq("user_id", user.id)
        .eq("login_date", yesterday)
        .maybeSingle();

      const prevStreak = (yesterdayLogin as any)?.streak_count ?? 0;
      const newStreak = prevStreak + 1;
      const bonus = STREAK_BONUSES[Math.min(newStreak - 1, STREAK_BONUSES.length - 1)];

      const { error } = await supabase.from("daily_logins" as any).insert({
        user_id: user.id,
        login_date: today,
        streak_count: newStreak,
        bonus_meeet: bonus,
      } as any);

      if (error) {
        if (error.code === "23505") return { alreadyCheckedIn: true, streak: newStreak, bonus: 0 };
        throw error;
      }
      return { alreadyCheckedIn: false, streak: newStreak, bonus };
    },
    onSuccess: (data) => {
      if (data && !data.alreadyCheckedIn) {
        toast({
          title: `🔥 ${data.streak}-дневный стрик!`,
          description: `+${data.bonus} $MEEET бонус за вход`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["daily-streak"] });
    },
  });

  useEffect(() => {
    if (user && streakData && !streakData.todayCheckedIn) {
      checkInMutation.mutate();
    }
  }, [user, streakData?.todayCheckedIn]);

  if (!user || !streakData) return null;

  const streak = streakData.currentStreak;
  const nextBonus = STREAK_BONUSES[Math.min(streak, STREAK_BONUSES.length - 1)];
  const weekProgress = streak > 0 && streak % 7 === 0 ? 7 : streak % 7;

  return (
    <Card className="glass-card border-border overflow-hidden relative group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              {streak > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center text-[10px] font-bold text-background px-1 shadow-lg shadow-orange-500/30">
                  {streak}
                </div>
              )}
            </div>
            <div>
              <p className="font-display text-sm font-bold">
                {streak > 0 ? `${streak}-дневный стрик 🔥` : "Начните стрик!"}
              </p>
              <p className="text-[10px] text-muted-foreground font-body">
                {streakData.todayCheckedIn ? "✅ Сегодня отмечено" : "Войдите завтра для продолжения"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-body">Следующий бонус</p>
            <p className="font-display text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              +{nextBonus} $MEEET
            </p>
          </div>
        </div>

        {/* Week dots */}
        <div className="flex gap-2">
          {DAY_LABELS.map((day, i) => {
            const isActive = i < weekProgress;
            const isCurrent = i === weekProgress && streakData.todayCheckedIn;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full h-2.5 rounded-full transition-all duration-500 ${
                    isActive || isCurrent
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 shadow-sm shadow-orange-500/30"
                      : "bg-muted/30"
                  }`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                />
                <span className={`text-[9px] font-body ${isActive || isCurrent ? "text-orange-400" : "text-muted-foreground/50"}`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
