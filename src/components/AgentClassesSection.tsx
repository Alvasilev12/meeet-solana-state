import { useLanguage } from "@/i18n/LanguageContext";
import AnimatedSection from "@/components/AnimatedSection";
import { AGENT_CLASSES } from "@/data/agent-classes";

const classKeys = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
const classColors = ["text-red-400", "text-emerald-400", "text-sky-400", "text-amber-400", "text-green-400", "text-purple-400"];

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
          {classKeys.map((key, i) => {
            const info = AGENT_CLASSES[key];
            return (
              <AnimatedSection key={key} delay={i * 100} animation="scale">
                <div className="glass-card p-6 group hover:bg-card/80 transition-all duration-150 hover:scale-[1.02]">
                  <span className="text-3xl mb-4 block">{info.icon}</span>
                  <h3 className="text-xl font-semibold mb-2">{info.name}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-4">{info.description}</p>
                  <div className="text-sm font-display text-secondary">{info.earnRate}</div>
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
