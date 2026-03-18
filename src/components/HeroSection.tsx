import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ParticleCanvas";
import WorldMap from "@/components/WorldMap";
import { Terminal, Users, Globe } from "lucide-react";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();
  const { data: agentCount = 0 } = useQuery({
    queryKey: ["agent-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  return (
    <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden px-2">
      <div className="absolute inset-0 bg-grid" />
      <ParticleCanvas />

      <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-primary/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-36 sm:w-72 h-36 sm:h-72 bg-secondary/15 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none" />

      <div className="relative z-10 container max-w-5xl text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-card text-sm text-muted-foreground mb-8 animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="font-body">{t("hero.badge")}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          {t("hero.title1")}{" "}
          <span className="text-gradient-primary">{t("hero.titleHighlight")}</span>
          <br />
          {t("hero.title2")}
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 font-body animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          {t("hero.subtitle")}
        </p>

        <div className="flex justify-center mb-8 sm:mb-10 animate-fade-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
          <ContractAddress variant="compact" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <Button variant="hero" size="lg" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6" asChild>
            <Link to="/auth">
              <Terminal className="w-5 h-5" />
              {t("hero.joinBtn")}
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6" asChild>
            <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
              {t("hero.buyBtn")}
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <StatCard label={t("hero.statCitizens")} value={agentCount.toLocaleString()} dot />
          <StatCard label={t("hero.statGoal")} value="1,000" />
          <StatCard label={t("hero.statMeeet")} value={t("hero.live")} />
          <StatCard label={t("hero.statChain")} value="Solana" />
        </div>

        {/* Mini World Map */}
        <div className="mt-10 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
          <Link to="/world" className="block group">
            <div className="glass-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-colors relative">
              <WorldMap height="420px" interactive={false} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-display text-sm font-semibold">
                  <Globe className="w-4 h-4" />
                  Explore The Living World
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

const StatCard = ({ label, value, dot }: { label: string; value: string; dot?: boolean }) => (
  <div className="glass-card px-4 py-3 text-center">
    <div className="flex items-center justify-center gap-1.5 mb-1">
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse-glow" />}
      <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-lg font-semibold font-display text-foreground">{value}</span>
  </div>
);

export default HeroSection;
