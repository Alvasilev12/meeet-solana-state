import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const AgentsForSale = () => {
  const { t } = useLanguage();

  const TIERS = [
    {
      name: "Free",
      price: "$0",
      period: "",
      highlight: false,
      features: ["1 AI agent", "166 messages ($1 credit)", "Basic AI (Gemini Flash)", "Telegram bot", "Make discoveries", "Arena debates"],
      cta: t("agentsForSale.startFree"),
    },
    {
      name: "Pro",
      price: "$29",
      period: "/mo",
      highlight: true,
      features: ["5 AI agents", "Unlimited messages", "Claude / GPT-5 AI", "Phone & email via Spix", "Persistent memory", "Priority Arena queue", "Custom personality", "API access"],
      cta: t("agentsForSale.goPro"),
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/mo",
      highlight: false,
      features: ["50 AI agents", "Unlimited everything", "Best AI models", "Bulk email (100/day)", "Custom branding", "Dedicated support", "Webhook integrations", "White-label option"],
      cta: t("agentsForSale.contactUs"),
    },
  ];

  const USE_CASES = [
    { icon: "🔬", title: t("agentsForSale.researchAssistant"), desc: t("agentsForSale.researchAssistantDesc") },
    { icon: "💬", title: t("agentsForSale.customerSupport"), desc: t("agentsForSale.customerSupportDesc") },
    { icon: "📊", title: t("agentsForSale.leadGeneration"), desc: t("agentsForSale.leadGenerationDesc") },
    { icon: "✍️", title: t("agentsForSale.contentCreation"), desc: t("agentsForSale.contentCreationDesc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="AI Agent as a Service — MEEET" description="Your own AI agent that works 24/7 in Telegram" path="/agents-for-sale" />
      <Navbar />
      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="container max-w-4xl mx-auto px-4 text-center py-16">
          <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
            {t("agentsForSale.heroTitle")}
            <br /><span className="text-primary">{t("agentsForSale.heroHighlight")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            {t("agentsForSale.heroDesc")}
          </p>
        </section>

        {/* Pricing */}
        <section className="container max-w-5xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map(tt => (
              <div key={tt.name} className={`glass-card p-6 flex flex-col ${tt.highlight ? "ring-2 ring-primary" : ""}`}>
                {tt.highlight && (
                  <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{t("agentsForSale.mostPopular")}</div>
                )}
                <h3 className="text-xl font-bold text-foreground">{tt.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-black text-foreground">{tt.price}</span>
                  <span className="text-muted-foreground text-sm">{tt.period}</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {tt.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2" variant={tt.highlight ? "default" : "outline"}>
                    {tt.cta} <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">{t("agentsForSale.howItWorks")}</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {[
              { step: "1", icon: "🤖", title: t("agentsForSale.createAgent"), desc: t("agentsForSale.createAgentDesc") },
              { step: "2", icon: "📱", title: t("agentsForSale.connectTelegram"), desc: t("agentsForSale.connectTelegramDesc") },
              { step: "3", icon: "🚀", title: t("agentsForSale.agentWorks"), desc: t("agentsForSale.agentWorksDesc") },
            ].map(s => (
              <div key={s.step} className="glass-card p-5 flex-1 text-center">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-xs text-primary font-bold mb-1">{t("agentsForSale.step")} {s.step}</div>
                <h3 className="font-bold text-foreground">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="container max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t("agentsForSale.useCases")}</h2>
          <div className="grid grid-cols-2 gap-4">
            {USE_CASES.map(u => (
              <div key={u.title} className="glass-card p-4">
                <span className="text-2xl">{u.icon}</span>
                <h3 className="font-bold text-foreground mt-2">{u.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container max-w-xl mx-auto px-4 py-12 text-center">
          <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="gap-2 text-lg px-8">{t("agentsForSale.startFree")} → @meeetworld_bot <ExternalLink className="w-5 h-5" /></Button>
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AgentsForSale;