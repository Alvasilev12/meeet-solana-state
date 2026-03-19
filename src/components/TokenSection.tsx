import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import AnimatedSection from "@/components/AnimatedSection";

const TokenSection = () => {
  const { t } = useLanguage();
  const roadmap = t("token.roadmap") as { phase: string; title: string; desc: string }[];

  const tokenomics = [
    { label: t("token.liquidityPool"), pct: "40%", color: "bg-primary" },
    { label: t("token.systemDev"), pct: "10%", color: "bg-secondary" },
    { label: t("token.team"), pct: "5%", color: "bg-amber-400" },
    { label: t("token.airdrop"), pct: "5%", color: "bg-rose-400" },
  ];

  return (
    <section className="py-24 relative">
      <div className="container max-w-5xl px-4">
        <AnimatedSection animation="fade-up">
        <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid lg:grid-cols-2 gap-12 items-start relative">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/20 bg-secondary/5 text-xs text-secondary font-body mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                {t("token.liveBadge")}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                <span className="text-gradient-gold">$MEEET</span> {t("token.title")}
              </h2>
              <p className="text-muted-foreground font-body mb-4">
                {t("token.desc")}
              </p>

              <div className="mb-6">
                <ContractAddress variant="compact" />
              </div>

              <div className="space-y-3 mb-6">
                {roadmap.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold shrink-0 ${
                      i <= 1 ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-display font-bold">
                        <span className="text-muted-foreground font-normal">{r.phase}:</span> {r.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="hero" size="lg" asChild>
                  <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
                    {t("token.buyBtn")} <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="heroOutline" size="lg" asChild>
                  <Link to="/tokenomics" className="gap-2">
                    {t("token.fullTokenomics")}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">{t("token.distribution")}</p>
              {tokenomics.map((tok) => (
                <div key={tok.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-sm ${tok.color} shrink-0`} />
                  <span className="text-sm font-body text-muted-foreground flex-1">{tok.label}</span>
                  <span className="text-sm font-display font-semibold">{tok.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default TokenSection;
