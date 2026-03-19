import { Button } from "@/components/ui/button";
import { Terminal, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ContractAddress, { PUMP_FUN_URL } from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import AnimatedSection from "@/components/AnimatedSection";

const CTASection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-32 relative text-center">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.05] to-transparent pointer-events-none" />
      <div className="container max-w-3xl px-4 relative">
        <AnimatedSection animation="scale">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            {t("cta.title")} <span className="text-gradient-primary">{t("cta.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-6 max-w-xl mx-auto">
            {t("cta.desc")}
          </p>
          <div className="flex justify-center mb-8">
            <ContractAddress variant="compact" />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" size="lg" className="text-base px-10 py-6 gap-2" asChild>
              <Link to="/auth">
                <Terminal className="w-5 h-5" />
                {t("cta.joinBtn")}
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
