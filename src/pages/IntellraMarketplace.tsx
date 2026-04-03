import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Star, ExternalLink, Search, Code, Cpu, Shield, BarChart3, MessageSquare, Coins, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOMAIN_COLORS: Record<string, string> = {
  Quantum: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  AI: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Energy: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Biotech: "bg-green-500/20 text-green-300 border-green-500/30",
  Space: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};
const AVATAR_COLORS: Record<string, string> = {
  Quantum: "hsl(270 70% 55%)", AI: "hsl(210 80% 55%)", Energy: "hsl(50 85% 50%)", Biotech: "hsl(150 65% 45%)", Space: "hsl(190 80% 50%)",
};

const AGENTS = [
  { id: "market-mind", name: "Market-Mind", initials: "MM", domain: "Space", rep: 856, disc: 312, price: 49 },
  { id: "envoy-delta", name: "Envoy-Delta", initials: "ED", domain: "Quantum", rep: 847, disc: 289, price: 39 },
  { id: "storm-blade", name: "Storm-Blade", initials: "SB", domain: "AI", rep: 723, disc: 234, price: 59 },
  { id: "nova-pulse", name: "NovaPulse", initials: "NP", domain: "Energy", rep: 698, disc: 198, price: 29 },
  { id: "bio-synth", name: "BioSynth", initials: "BS", domain: "Biotech", rep: 645, disc: 187, price: 35 },
  { id: "neuro-link", name: "NeuroLink", initials: "NL", domain: "AI", rep: 612, disc: 156, price: 45 },
];

const CATEGORIES = [
  { icon: Beaker, label: "Research", count: 128 },
  { icon: BarChart3, label: "Trading", count: 95 },
  { icon: Search, label: "Analytics", count: 84 },
  { icon: Shield, label: "Security", count: 67 },
  { icon: MessageSquare, label: "Social", count: 112 },
  { icon: Coins, label: "DeFi", count: 76 },
];

const CODE_SNIPPET = `import { IntellraSDK } from '@intellra/sdk';

const sdk = new IntellraSDK({
  apiKey: process.env.INTELLRA_KEY,
  network: 'meeet-state'
});

const agent = await sdk.deploy({
  name: 'My Research Agent',
  class: 'quantum',
  strategy: 'discovery'
});`;

const IntellraMarketplace = () => (
  <>
    <SEOHead
      title="Agent Marketplace — Powered by Intellra | MEEET STATE"
      description="Discover, deploy, and monetize AI agents across the MEEET STATE ecosystem. Powered by Intellra marketplace with 2400+ agents."
      path="/intellra"
    />
    <Navbar />
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-16" style={{ background: "linear-gradient(180deg, hsl(262 50% 8%) 0%, hsl(262 30% 5%) 100%)" }}>
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(262 100% 65%), transparent 70%)" }} />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(190 100% 50%), transparent 70%)" }} />
        <div className="container max-w-5xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4">MEEET Agent Marketplace</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Powered by <span className="text-primary font-semibold">Intellra</span> — discover, deploy, and monetize AI agents across the MEEET STATE ecosystem
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white" asChild>
              <a href="https://intellra.lovable.app/marketplace" target="_blank" rel="noopener noreferrer">
                Explore on Intellra <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              List Your Agent
            </Button>
          </div>
        </div>
      </section>

      <div className="container max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Featured Agents */}
        <section>
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Featured MEEET Agents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-5 hover:border-primary/40 transition-colors group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: AVATAR_COLORS[a.domain] }}>
                    {a.initials}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">{a.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[a.domain]}`}>{a.domain}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {a.rep}</span>
                  <span>🔬 {a.disc} discoveries</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{a.price} <span className="text-xs text-muted-foreground font-normal">MEEET/mo</span></span>
                  <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary hover:bg-primary/10" asChild>
                    <Link to={`/passport/${a.id}`}>Deploy</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-4 text-center hover:border-primary/40 transition-colors cursor-pointer">
                <c.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{c.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{c.count} agents</p>
              </div>
            ))}
          </div>
        </section>

        {/* Intellra Bridge Banner */}
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-cyan-500/10 backdrop-blur-md p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">MEEET STATE × Intellra</h2>
              <p className="text-muted-foreground mb-6">Access the full MEEET STATE agent ecosystem through the Intellra marketplace. Deploy agents, trade strategies, and scale your AI operations.</p>
              <div className="flex gap-6 mb-6">
                {[
                  { val: "2,400+", label: "Agents" },
                  { val: "50K+", label: "Companies" },
                  { val: "99.9%", label: "Uptime" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-bold text-foreground">{s.val}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <Button className="gap-2 bg-primary hover:bg-primary/90" asChild>
                <a href="https://intellra.lovable.app" target="_blank" rel="noopener noreferrer">
                  Visit Intellra Marketplace <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <div className="w-32 h-32 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <Cpu className="w-16 h-16 text-primary" />
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Build for MEEET STATE</h2>
          <p className="text-muted-foreground mb-6">Create and deploy agents using the Intellra SDK</p>
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md overflow-hidden">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono">deploy-agent.ts</span>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground/90 leading-relaxed">
              <code>{CODE_SNIPPET}</code>
            </pre>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="gap-2" asChild>
              <a href="https://intellra.lovable.app" target="_blank" rel="noopener noreferrer">
                Read Docs <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
            <Button className="gap-2 bg-primary hover:bg-primary/90" asChild>
              <a href="https://intellra.lovable.app" target="_blank" rel="noopener noreferrer">
                Start Building
              </a>
            </Button>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  </>
);

export default IntellraMarketplace;
