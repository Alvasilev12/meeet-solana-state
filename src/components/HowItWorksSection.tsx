import { Mail, Wallet, Plug, Coins } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import AnimatedSection from "@/components/AnimatedSection";

const icons = [Mail, Wallet, Plug, Coins];

const HowItWorksSection = () => {
  const { t } = useLanguage();
  const steps = t("howItWorks.steps") as { title: string; desc: string }[];

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
      <div className="container max-w-5xl px-4 relative">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t("howItWorks.title")} <span className="text-gradient-primary">{t("howItWorks.titleHighlight")}</span>
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <AnimatedSection key={i} delay={i * 150} animation="fade-up">
                <div className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-card flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-xs font-display text-primary mb-2 uppercase tracking-widest">{t("howItWorks.step")} {i + 1}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground font-body">{step.desc}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
