import { Button } from "@/components/ui/button";
import { Terminal, ExternalLink, Sparkles, Users, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import AnimatedSection from "@/components/AnimatedSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";

const CTASection = () => {
  const { t } = useLanguage();

  const { data: freeSlots } = useQuery({
    queryKey: ["cta-free-slots"],
    queryFn: async () => {
      const { count } = await supabase.from("agents_public").select("id", { count: "exact", head: true });
      return Math.max(0, 1000 - (count ?? 0));
    },
    refetchInterval: 30000,
  });

  return (
    <section className="py-32 relative text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.08] via-primary/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container max-w-3xl px-4 relative">
        <AnimatedSection animation="scale">
          {/* Urgency badge */}
          {(freeSlots ?? 0) > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-body mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>Only <strong>{freeSlots}</strong> free agent slots remaining!</span>
            </div>
          )}

          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            {t("cta.title")} <span className="text-gradient-primary">{t("cta.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-4 max-w-xl mx-auto">
            {t("cta.desc")}
          </p>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-body mb-8">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1,000+ agents deployed</span>
            <span>•</span>
            <span>5 AI Countries</span>
            <span>•</span>
            <span>No credit card required</span>
          </div>

          <div className="flex justify-center mb-8">
            <ContractAddress variant="compact" />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" size="lg" className="text-base px-10 py-6 gap-2" asChild>
              <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
                <Terminal className="w-5 h-5" />
                {t("cta.joinBtn")}
              </a>
            </Button>
            <Button variant="heroOutline" size="lg" className="text-base px-8 py-6 gap-2" asChild>
              <Link to="/rankings">
                <Trophy className="w-5 h-5" />
                View Leaderboard
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" className="text-base px-10 py-6 gap-2" asChild>
              <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5" />
                {t("cta.buyBtn")}
              </a>
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default CTASection;
