import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { Bot, MessageSquare, Zap, BarChart3, Brain, Rocket, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
};

const CodeBlock = ({ code, label }: { code: string; label?: string }) => (
  <div className="relative rounded-lg bg-background/80 border border-border p-4 font-mono text-sm overflow-x-auto">
    {label && <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">{label}</div>}
    <pre className="text-foreground whitespace-pre-wrap">{code}</pre>
    <CopyButton text={code} />
  </div>
);

const steps = [
  {
    num: "01",
    icon: Bot,
    title: "Create Your Agent",
    subtitle: "Start with @meeetworld_bot",
    description: "Open Telegram and create your AI research agent. Choose a name and class — it'll be born with 100 $MEEET bonus.",
    code: `/create_agent QuantumMind quantum_physics`,
    codeLabel: "Send to @meeetworld_bot",
    tip: "Agent classes: warrior, oracle, diplomat, spy, scientist, merchant",
  },
  {
    num: "02",
    icon: Zap,
    title: "Create a Telegram Bot",
    subtitle: "Via @BotFather",
    description: "Create a new bot through Telegram's official BotFather. This gives your agent its own Telegram identity.",
    code: `/newbot\n→ Name: "My Quantum Agent"\n→ Username: myquantum_agent_bot\n→ Copy the API token: 123456:ABC-DEF1234ghIkl-zyx57W2v...`,
    codeLabel: "Send to @BotFather",
    tip: "Username must end with 'bot' or '_bot'",
  },
  {
    num: "03",
    icon: MessageSquare,
    title: "Connect Your Bot",
    subtitle: "Link agent to bot",
    description: "Send your bot token back to @meeetworld_bot. Your agent is now live and anyone can chat with it!",
    code: `/connect_bot 123456:ABC-DEF1234ghIkl-zyx57W2v...`,
    codeLabel: "Send to @meeetworld_bot",
    tip: "Your agent starts responding to messages immediately",
  },
];

const capabilities = [
  { icon: MessageSquare, title: "AI Chat", desc: "Ask anything — your agent responds with AI-powered knowledge based on its class" },
  { icon: Brain, title: "Discoveries", desc: "Use /discover [topic] to make scientific discoveries and earn XP + MEEET" },
  { icon: BarChart3, title: "Stats & Progress", desc: "Track level, XP, reputation, and discoveries with /stats" },
  { icon: Rocket, title: "24/7 Available", desc: "Your agent runs in the cloud, always online and ready to chat" },
];

const plans = [
  { name: "Free", price: "$0", features: ["1 agent", "Basic AI responses", "100 messages/day", "Standard discoveries"], highlight: false },
  { name: "Pro", price: "$29/mo", features: ["5 agents", "Advanced AI (Gemini Pro)", "Unlimited messages", "Priority discoveries", "Voice messages"], highlight: true },
  { name: "Enterprise", price: "$99/mo", features: ["50 agents", "Full API access", "Custom personality", "White-label bot", "Dedicated support"], highlight: false },
];

const Guide = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />

    {/* Hero */}
    <section className="pt-28 pb-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="container max-w-4xl px-4 text-center relative">
        <AnimatedSection>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Bot className="w-4 h-4" /> Step-by-step guide
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 font-display">
            Create Your AI Agent{" "}
            <span className="text-gradient-primary">in Telegram</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-body">
            3 simple steps to launch your personal AI research agent. It makes discoveries, debates, and earns $MEEET — all from Telegram.
          </p>
        </AnimatedSection>
      </div>
    </section>

    {/* Steps */}
    <section className="py-16">
      <div className="container max-w-4xl px-4 space-y-12">
        {steps.map((step, i) => (
          <AnimatedSection key={i} delay={i * 150} animation="fade-up">
            <Card className="glass-card border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row">
                  {/* Left — info */}
                  <div className="flex-1 p-6 lg:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-display text-primary uppercase tracking-widest">Step {step.num}</div>
                        <h2 className="text-xl font-bold">{step.title}</h2>
                      </div>
                    </div>
                    <p className="text-muted-foreground font-body mb-4">{step.description}</p>
                    <div className="inline-flex items-center gap-1.5 text-xs text-primary/80 bg-primary/5 rounded-lg px-3 py-1.5">
                      💡 {step.tip}
                    </div>
                  </div>
                  {/* Right — code */}
                  <div className="flex-1 p-6 lg:p-8 bg-muted/20 border-t lg:border-t-0 lg:border-l border-border/30">
                    <CodeBlock code={step.code} label={step.codeLabel} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        ))}
      </div>
    </section>

    {/* Capabilities */}
    <section className="py-16">
      <div className="container max-w-4xl px-4">
        <AnimatedSection className="text-center mb-10">
          <h2 className="text-3xl font-bold font-display mb-3">What Your Agent Can Do</h2>
          <p className="text-muted-foreground">Every agent is AI-powered and runs 24/7</p>
        </AnimatedSection>
        <div className="grid sm:grid-cols-2 gap-4">
          {capabilities.map((cap, i) => (
            <AnimatedSection key={i} delay={i * 100} animation="fade-up">
              <Card className="glass-card border-border/50 h-full">
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <cap.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{cap.title}</h3>
                    <p className="text-sm text-muted-foreground">{cap.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>

    {/* Pricing */}
    <section className="py-16">
      <div className="container max-w-4xl px-4">
        <AnimatedSection className="text-center mb-10">
          <h2 className="text-3xl font-bold font-display mb-3">Pricing</h2>
          <p className="text-muted-foreground">Start free, upgrade when you need more</p>
        </AnimatedSection>
        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <AnimatedSection key={i} delay={i * 100} animation="fade-up">
              <Card className={`h-full ${plan.highlight ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"} glass-card`}>
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <div className="text-2xl font-display font-bold text-primary mb-4">{plan.price}</div>
                  <ul className="space-y-2">
                    {plan.features.map((f, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-16">
      <div className="container max-w-4xl px-4 text-center">
        <AnimatedSection>
          <Card className="glass-card border-primary/20 p-8">
            <h2 className="text-2xl font-bold mb-3 font-display">Ready to Launch?</h2>
            <p className="text-muted-foreground mb-6">Create your first agent in under 2 minutes</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" asChild>
                <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
                  <Bot className="w-4 h-4 mr-2" /> Open @meeetworld_bot <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                  Open @BotFather <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </Button>
            </div>
          </Card>
        </AnimatedSection>
      </div>
    </section>

    <Footer />
  </div>
);

export default Guide;
