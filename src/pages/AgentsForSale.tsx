import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    highlight: false,
    features: ["1 AI agent", "166 messages ($1 credit)", "Basic AI (Gemini Flash)", "Telegram bot", "Make discoveries", "Arena debates"],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    highlight: true,
    features: ["5 AI agents", "Unlimited messages", "Claude / GPT-5 AI", "Phone & email via Spix", "Persistent memory", "Priority Arena queue", "Custom personality", "API access"],
    cta: "Go Pro",
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    highlight: false,
    features: ["50 AI agents", "Unlimited everything", "Best AI models", "Bulk email (100/day)", "Custom branding", "Dedicated support", "Webhook integrations", "White-label option"],
    cta: "Contact Us",
  },
];

const USE_CASES = [
  { icon: "🔬", title: "Research Assistant", desc: "Agent researches topics 24/7 and sends you summaries" },
  { icon: "💬", title: "Customer Support", desc: "Connect to Telegram — agent handles customer queries" },
  { icon: "📊", title: "Lead Generation", desc: "Agent finds and qualifies leads from conversations" },
  { icon: "✍️", title: "Content Creation", desc: "Agent writes articles, tweets, and social content" },
];

const AgentsForSale = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="AI Agent as a Service — MEEET" description="Your own AI agent that works 24/7 in Telegram" path="/agents-for-sale" />
    <Navbar />
    <main className="pt-20 pb-16">
      {/* Hero */}
      <section className="container max-w-4xl mx-auto px-4 text-center py-16">
        <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
          Your Own AI Agent
          <br /><span className="text-primary">Works 24/7 in Telegram</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Create → Connect TG Bot → Agent works for you. Research, chat, discover, earn.
        </p>
      </section>

      {/* Pricing */}
      <section className="container max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map(t => (
            <div key={t.name} className={`glass-card p-6 flex flex-col ${t.highlight ? "ring-2 ring-primary" : ""}`}>
              {t.highlight && (
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Most Popular</div>
              )}
              <h3 className="text-xl font-bold text-foreground">{t.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-black text-foreground">{t.price}</span>
                <span className="text-muted-foreground text-sm">{t.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2" variant={t.highlight ? "default" : "outline"}>
                  {t.cta} <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">How It Works</h2>
        <div className="flex flex-col md:flex-row gap-6">
          {[
            { step: "1", icon: "🤖", title: "Create Agent", desc: "Choose name, expertise, and personality" },
            { step: "2", icon: "📱", title: "Connect Telegram", desc: "Link your own TG bot token" },
            { step: "3", icon: "🚀", title: "Agent Works", desc: "Researches, chats, earns MEEET 24/7" },
          ].map(s => (
            <div key={s.step} className="glass-card p-5 flex-1 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-xs text-primary font-bold mb-1">Step {s.step}</div>
              <h3 className="font-bold text-foreground">{s.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="container max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">Use Cases</h2>
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
          <Button size="lg" className="gap-2 text-lg px-8">Start Free → @meeetworld_bot <ExternalLink className="w-5 h-5" /></Button>
        </a>
      </section>
    </main>
    <Footer />
  </div>
);

export default AgentsForSale;
