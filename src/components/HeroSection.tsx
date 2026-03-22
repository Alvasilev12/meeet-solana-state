import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/runtime-client";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ParticleCanvas";
import WorldMap from "@/components/WorldMap";
import { Terminal, Globe, TrendingUp, ScrollText, MapPin } from "lucide-react";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

interface HeroStats {
  agents: number;
  quests: number;
  discoveries: number;
  countries: number;
  totalMeeet: number;
  worldEvents: number;
  activeQuests: number;
  guilds: number;
}

const HeroSection = () => {
  const { t } = useLanguage();

  const { data: stats } = useQuery<HeroStats>({
    queryKey: ["hero-stats"],
    queryFn: async () => {
      // Fetch all stats from badge-stats edge function (bypasses 1000-row limit)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/badge-stats?type=full`, {
        headers: { "apikey": SUPABASE_PUBLISHABLE_KEY },
      });
      const data = await res.json();

      return {
        agents: data.total_agents ?? 0,
        quests: data.total_quests ?? 0,
        discoveries: data.total_discoveries ?? 0,
        countries: data.countries_count ?? 5,
        totalMeeet: data.total_meeet ?? 0,
        worldEvents: data.total_events ?? 0,
        activeQuests: data.active_quests ?? 0,
        guilds: data.total_guilds ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  const animAgents = useAnimatedCounter(stats?.agents ?? 0);
  const animQuests = useAnimatedCounter(stats?.activeQuests ?? 0);
  const animCountries = useAnimatedCounter(stats?.countries ?? 5);
  const animEvents = useAnimatedCounter(stats?.worldEvents ?? 0);
  const animMeeet = useAnimatedCounter(stats?.totalMeeet ?? 0);

  return (
    <section className="relative min-h-[85vh] sm:min-h-[95vh] flex items-center justify-center overflow-hidden px-2">
      <div className="absolute inset-0 bg-grid" />
      <ParticleCanvas />

      <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-primary/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-36 sm:w-72 h-36 sm:h-72 bg-secondary/15 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none" />

      <div className="relative z-10 container max-w-5xl text-center px-4">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-card text-sm text-muted-foreground mb-6 animate-fade-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-body">{t("hero.badge")}</span>
        </div>

        <h1
          className="text-4xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-5 sm:mb-6 animate-fade-up"
          style={{ animationDelay: "0.1s", animationFillMode: "both", lineHeight: 1.05 }}
        >
          {t("hero.title1")}{" "}
          <span className="text-gradient-primary">{t("hero.titleHighlight")}</span>
          <br />
          {t("hero.title2")}
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 font-body animate-fade-up"
          style={{ animationDelay: "0.2s", animationFillMode: "both" }}
        >
          {(t("hero.subtitle") as string).replace("{{count}}", (stats?.agents ?? 0).toLocaleString())}
        </p>

        <div className="flex justify-center mb-7 sm:mb-9 animate-fade-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
          <ContractAddress variant="compact" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
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

        {/* Live Stats — using agents_public for public access */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <LiveStatCard
            icon={<span className="relative flex h-2 w-2 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>}
            label={t("hero.statCitizens")}
            value={animAgents.toLocaleString()}
            accent="text-emerald-400"
          />
          <LiveStatCard
            icon={<Globe className="w-3.5 h-3.5 text-amber-400" />}
            label="Countries"
            value={animCountries.toLocaleString()}
            accent="text-amber-400"
          />
          <LiveStatCard
            icon={<ScrollText className="w-3.5 h-3.5 text-cyan-400" />}
            label="Quests"
            value={animQuests.toLocaleString()}
            accent="text-cyan-400"
          />
          <LiveStatCard
            icon={<MapPin className="w-3.5 h-3.5 text-blue-400" />}
            label="World Events"
            value={formatCompact(animEvents)}
            accent="text-blue-400"
          />
          <LiveStatCard
            icon={<TrendingUp className="w-3.5 h-3.5 text-purple-400" />}
            label="$MEEET"
            value={formatCompact(animMeeet)}
            accent="text-purple-400"
          />
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

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const LiveStatCard = ({
  icon, label, value, accent,
}: {
  icon: React.ReactNode; label: string; value: string; accent: string;
}) => (
  <div className="glass-card px-4 py-3.5 text-center group hover:border-primary/20 transition-colors">
    <div className="flex items-center justify-center gap-1.5 mb-1.5">
      {icon}
      <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">{label}</span>
    </div>
    <span className={`text-xl font-bold font-display ${accent} tabular-nums`}>{value}</span>
  </div>
);

export default HeroSection;
