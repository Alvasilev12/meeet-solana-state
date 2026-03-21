import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, Sparkles, Percent, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROMO_ICONS: Record<string, { icon: React.ReactNode; gradient: string; border: string }> = {
  bonus: { icon: <Gift className="w-5 h-5 text-amber-400" />, gradient: "from-amber-500/15 to-amber-500/5", border: "border-amber-500/20" },
  discount: { icon: <Percent className="w-5 h-5 text-emerald-400" />, gradient: "from-emerald-500/15 to-emerald-500/5", border: "border-emerald-500/20" },
  referral: { icon: <Users className="w-5 h-5 text-blue-400" />, gradient: "from-blue-500/15 to-blue-500/5", border: "border-blue-500/20" },
};

const DEFAULT_PROMO = { icon: <Sparkles className="w-5 h-5 text-primary" />, gradient: "from-primary/15 to-primary/5", border: "border-primary/20" };

export default function PromoWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: promos = [] } = useQuery({
    queryKey: ["active-promos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_campaigns" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["my-promo-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_claims" as any)
        .select("promo_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((c: any) => c.promo_id);
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (promoId: string) => {
      if (!user) throw new Error("Not authenticated");
      const promo = promos.find((p: any) => p.id === promoId);
      if (!promo) throw new Error("Promo not found");

      const { error } = await supabase.from("promo_claims" as any).insert({
        user_id: user.id,
        promo_id: promoId,
        bonus_received: promo.bonus_meeet || 0,
      } as any);
      if (error) {
        if (error.code === "23505") throw new Error("Уже получено");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-promo-claims"] });
      queryClient.invalidateQueries({ queryKey: ["active-promos"] });
      toast({ title: "🎉 Промо активировано!" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (!user || promos.length === 0) return null;

  const unclaimed = promos.filter((p: any) => !claims.includes(p.id));
  if (unclaimed.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {unclaimed.map((promo: any) => {
        const style = PROMO_ICONS[promo.promo_type] || DEFAULT_PROMO;
        const remaining = promo.max_claims ? promo.max_claims - (promo.current_claims || 0) : null;
        const progress = promo.max_claims ? ((promo.current_claims || 0) / promo.max_claims) * 100 : 0;

        return (
          <Card key={promo.id} className={`glass-card ${style.border} overflow-hidden relative group`}>
            <div className={`absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-50`} />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${style.gradient} border ${style.border} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-display text-sm font-bold truncate">{promo.name}</p>
                    {promo.bonus_meeet > 0 && (
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 shrink-0">
                        +{promo.bonus_meeet} $MEEET
                      </Badge>
                    )}
                    {promo.discount_pct > 0 && (
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                        -{promo.discount_pct}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body">{promo.description}</p>
                  {remaining !== null && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary/40 transition-all" style={{ width: `${100 - progress}%` }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground/60 font-body mt-0.5">
                        Осталось: {remaining} из {promo.max_claims}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs h-9 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  disabled={claimMutation.isPending}
                  onClick={() => claimMutation.mutate(promo.id)}
                >
                  {claimMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Gift className="w-3.5 h-3.5" />
                  )}
                  Забрать
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
