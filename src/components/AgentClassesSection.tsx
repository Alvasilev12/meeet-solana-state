import { Swords, TrendingUp, Shield, Brain, Pickaxe, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import AnimatedSection from "@/components/AnimatedSection";

const classIcons = [Swords, TrendingUp, Shield, Brain, Pickaxe, Users];
const classColors = ["text-destructive", "text-secondary", "text-accent", "text-primary", "text-amber-400", "text-emerald-400"];
const classIncomes = ["~120 $MEEET/day", "~200 $MEEET/day", "~80 $MEEET/day", "~150 $MEEET/day", "~100 $MEEET/day", "~90 $MEEET/day"];

const AgentClassesSection = () => {
  const { t } = useLanguage();
  const classes = t("agentClasses.classes") as { name: string; desc: string }[];

  return (
    <section className="py-24 relative">
      <div className="container max-w-6xl px-4">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            6 <span className="text-gradient-primary">{t("agentClasses.title")}</span>
          </h2>
          <p className="text-muted-foreground font-body max-w-lg mx-auto">
            {t("agentClasses.subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls, i) => {
            const Icon = classIcons[i];
            return (
              <AnimatedSection key={i} delay={i * 100} animation="scale">
                <div className="glass-card p-6 group hover:bg-card/80 transition-all duration-150 hover:scale-[1.02]">
                  <Icon className={`w-8 h-8 ${classColors[i]} mb-4`} />
                  <h3 className="text-xl font-semibold mb-2">{cls.name}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-4">{cls.desc}</p>
                  <div className="text-sm font-display text-secondary">{classIncomes[i]}</div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AgentClassesSection;
