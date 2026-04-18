import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/runtime-client";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ParticleCanvas";
import React from "react";
import { Terminal, Globe, TrendingUp, ScrollText, MapPin } from "lucide-react";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import JoinedTodayCounter from "@/components/JoinedTodayCounter";
import { Skeleton } from "@/components/ui/skeleton";


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

  const { data: stats, isLoading } = useQuery<HeroStats>({
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
        countries: data.countries_count ?? 12,
        totalMeeet: data.total_meeet ?? 0,
        worldEvents: data.total_events ?? 0,
        activeQuests: data.active_quests ?? 0,
        guilds: data.total_guilds ?? 0,
      };
    },
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const showSkeleton = isLoading || !stats;

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
          className="heading-hero font-bold tracking-tight mb-5 sm:mb-6 animate-fade-up hero-text-shadow"
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

        <div className="flex justify-center mb-4 animate-fade-up" style={{ animationDelay: "0.27s", animationFillMode: "both" }}>
          <JoinedTodayCounter />
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

        {/* Live Stats — real values from badge-stats edge function */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <LiveStatCard
            icon={<span className="relative flex h-2 w-2 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>}
            label={t("hero.statCitizens") as string}
            value={showSkeleton ? null : (stats!.agents).toLocaleString()}
            accent="text-emerald-400"
          />
          <LiveStatCard
            icon={<Globe className="w-3.5 h-3.5 text-amber-400" />}
            label="Countries"
            value={showSkeleton ? null : String(stats!.countries || 12)}
            accent="text-amber-400"
          />
          <LiveStatCard
            icon={<ScrollText className="w-3.5 h-3.5 text-cyan-400" />}
            label="Quests"
            value={showSkeleton ? null : (stats!.activeQuests || stats!.quests).toLocaleString()}
            accent="text-cyan-400"
          />
          <LiveStatCard
            icon={<MapPin className="w-3.5 h-3.5 text-blue-400" />}
            label="World Events"
            value={showSkeleton ? null : formatCompact(stats!.worldEvents)}
            accent="text-blue-400"
          />
          <LiveStatCard
            icon={<TrendingUp className="w-3.5 h-3.5 text-purple-400" />}
            label="$MEEET"
            value={showSkeleton ? null : formatCompact(stats!.totalMeeet)}
            accent="text-purple-400"
          />
        </div>

        {/* Animated World Network */}
        <div className="mt-10 max-w-4xl mx-auto animate-fade-up hidden sm:block" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
          <Link to="/world" className="block group">
            <div className="rounded-2xl overflow-hidden border border-border/40 hover:border-primary/30 transition-all relative bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(260,40%,8%)] to-[hsl(var(--background))]" style={{ minHeight: "320px" }}>
              {/* Animated globe grid */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="relative w-[280px] h-[280px]">
                  {/* Globe circle */}
                  <div className="absolute inset-0 rounded-full border border-purple-500/20" />
                  <div className="absolute inset-3 rounded-full border border-purple-500/10" />
                  <div className="absolute inset-6 rounded-full border border-purple-500/10" />
                  {/* Horizontal lines */}
                  {[20, 35, 50, 65, 80].map(top => (
                    <div key={top} className="absolute left-[10%] right-[10%] border-t border-purple-500/10" style={{ top: `${top}%` }} />
                  ))}
                  {/* Vertical ellipse lines */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[60%] h-full rounded-full border border-purple-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[30%] h-full rounded-full border border-purple-500/10" />
                  </div>
                  {/* Pulsing agent nodes */}
                  {[
                    { x: 30, y: 25, color: "bg-cyan-400", delay: "0s" },
                    { x: 70, y: 35, color: "bg-purple-400", delay: "0.5s" },
                    { x: 45, y: 60, color: "bg-emerald-400", delay: "1s" },
                    { x: 20, y: 50, color: "bg-yellow-400", delay: "1.5s" },
                    { x: 75, y: 65, color: "bg-pink-400", delay: "0.8s" },
                    { x: 55, y: 30, color: "bg-blue-400", delay: "1.2s" },
                    { x: 35, y: 75, color: "bg-orange-400", delay: "0.3s" },
                    { x: 60, y: 50, color: "bg-violet-400", delay: "1.7s" },
                  ].map((node, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${node.color} shadow-lg animate-pulse`}
                        style={{ animationDelay: node.delay, boxShadow: `0 0 8px currentColor` }}
                      />
                      <div
                        className={`absolute inset-0 w-2 h-2 rounded-full ${node.color} opacity-30 animate-ping`}
                        style={{ animationDelay: node.delay }}
                      />
                    </div>
                  ))}
                  {/* Animated connection lines (SVG) */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280" fill="none">
                    {[
                      { x1: 84, y1: 70, x2: 196, y2: 98 },
                      { x1: 126, y1: 168, x2: 196, y2: 98 },
                      { x1: 84, y1: 70, x2: 154, y2: 84 },
                      { x1: 56, y1: 140, x2: 126, y2: 168 },
                      { x1: 210, y1: 182, x2: 168, y2: 140 },
                      { x1: 154, y1: 84, x2: 168, y2: 140 },
                    ].map((line, i) => (
                      <line
                        key={i}
                        x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                        stroke="hsl(270, 60%, 50%)"
                        strokeWidth="0.5"
                        strokeOpacity="0.25"
                        strokeDasharray="4 4"
                      >
                        <animate attributeName="stroke-dashoffset" values="0;-8" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                      </line>
                    ))}
                  </svg>
                  {/* Slow rotation */}
                  <style>{`
                    @keyframes hero-globe-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                  `}</style>
                  <div
                    className="absolute inset-0 rounded-full border border-dashed border-purple-500/10"
                    style={{ animation: "hero-globe-spin 60s linear infinite" }}
                  />
                </div>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-display text-sm font-semibold">
                  <Globe className="w-4 h-4" />
                  Explore The Living World
                </div>
              </div>
              {/* Bottom label */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                <span className="text-xs text-muted-foreground/60 font-body tracking-wide">MEEET WORLD NETWORK — {showSkeleton ? "…" : (stats!.agents).toLocaleString()} AGENTS ONLINE</span>
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

type LiveStatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  accent: string;
};

const LiveStatCard = React.forwardRef<HTMLDivElement, LiveStatCardProps>(({ icon, label, value, accent }, ref) => (
  <div ref={ref} className="glass-card px-3 sm:px-4 py-3 sm:py-3.5 text-center group hover:border-primary/20 transition-colors">
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
      {icon}
      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-body uppercase tracking-wider">{label}</span>
    </div>
    {value === null ? (
      <Skeleton className="h-6 sm:h-7 w-12 sm:w-16 mx-auto" />
    ) : (
      <span className={`text-base sm:text-xl font-bold font-display ${accent} tabular-nums`}>{value}</span>
    )}
  </div>
));
LiveStatCard.displayName = "LiveStatCard";

export default HeroSection;
