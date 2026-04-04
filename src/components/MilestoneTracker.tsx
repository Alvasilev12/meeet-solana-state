import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Users, Target, Rocket, Flame, Crown } from "lucide-react";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";

const GOAL = 1000000;
const MILESTONE_COUNTS = [1000, 10000, 100000, 500000, 1000000];
const MILESTONE_ICONS = ["🏕️", "🏘️", "🏙️", "🏛️", "🌍"];

const MilestoneTracker = () => {
  const { t } = useLanguage();
  const milestoneLabels = t("milestone.milestones") as string[];

  const { data: agentCount = 0 } = useQuery({
    queryKey: ["milestone-agent-count"],
    queryFn: async () => {
      const { count } = await supabase.from("agents_public").select("id", { count: "exact" }).limit(0);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const progress = Math.min((agentCount / GOAL) * 100, 100);
  const remaining = Math.max(GOAL - agentCount, 0);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="container max-w-4xl px-4 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-card text-sm text-primary mb-6">
            <Target className="w-4 h-4" />
            <span className="font-body font-semibold">{t("milestone.badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold mb-4 font-display">
            {t("milestone.title")} <span className="text-gradient-primary">{t("milestone.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto text-base sm:text-lg">
            {t("milestone.desc1")} <span className="text-foreground font-semibold">{(t("milestone.desc2") as string).replace("{{count}}", agentCount.toLocaleString())}</span> {t("milestone.desc3")}{" "}
            <span className="text-primary font-semibold">{t("milestone.descLive")}</span>{" "}
            {t("milestone.descEarn")}
          </p>
        </div>

        <div className="glass-card p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-[60px] pointer-events-none" />

          <div className="text-center mb-8 relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Users className="w-6 h-6 text-primary" />
              <span className="text-5xl sm:text-7xl font-display font-bold text-foreground tabular-nums">
                {agentCount.toLocaleString()}
              </span>
              <span className="text-2xl sm:text-3xl text-muted-foreground font-display">
                / {GOAL.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-body">
              {t("milestone.deployed")} · <span className="text-primary font-semibold">{remaining.toLocaleString()} {t("milestone.remaining")}</span>
            </p>
          </div>

          <div className="relative mb-8">
            <div className="h-4 bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{
                  width: `${Math.max(progress, 1)}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 3s ease-in-out infinite",
                }}
              />
              <div
                className="absolute top-0 h-full w-8 blur-md rounded-full"
                style={{
                  left: `calc(${Math.max(progress, 1)}% - 16px)`,
                  background: "hsl(var(--primary))",
                  opacity: 0.6,
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground font-mono">{progress.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                <Rocket className="w-3 h-3" /> {t("milestone.superpowerStatus")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {MILESTONE_COUNTS.map((at, i) => {
              const reached = agentCount >= at;
              return (
                <div
                  key={at}
                  className={`text-center p-2 sm:p-3 rounded-lg border transition-all duration-300 ${
                    reached
                      ? "glass-card border-primary/30 bg-primary/5"
                      : "border-border/50 opacity-50"
                  }`}
                >
                  <span className="text-lg sm:text-2xl block mb-1">{MILESTONE_ICONS[i]}</span>
                  <span className="text-xs sm:text-sm font-display font-bold block">{at}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-body block leading-tight">{milestoneLabels[i]}</span>
                  {reached && (
                    <span className="text-[8px] text-primary font-body mt-1 block">{t("milestone.reached")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <div className="glass-card p-5 text-center">
            <Crown className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-display font-bold mb-1">{t("milestone.earlyBonus")}</p>
            <p className="text-xs text-muted-foreground font-body">{t("milestone.earlyBonusDesc")}</p>
          </div>
          <div className="glass-card p-5 text-center">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <p className="text-sm font-display font-bold mb-1">{t("milestone.internalEconomy")}</p>
            <p className="text-xs text-muted-foreground font-body">{t("milestone.internalEconomyDesc")}</p>
          </div>
          <div className="glass-card p-5 text-center">
            <Rocket className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-display font-bold mb-1">{t("milestone.meeetLive")}</p>
            <p className="text-xs text-muted-foreground font-body">{t("milestone.meeetLiveDesc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MilestoneTracker;
