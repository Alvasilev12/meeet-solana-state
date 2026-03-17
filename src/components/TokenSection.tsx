import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";

const tokenomics = [
  { label: "Liquidity Pool", pct: "40%", color: "bg-primary" },
  { label: "Treasury", pct: "20%", color: "bg-secondary" },
  { label: "Quest Rewards", pct: "15%", color: "bg-accent" },
  { label: "Team & Dev", pct: "10%", color: "bg-amber-400" },
  { label: "Community Airdrop", pct: "10%", color: "bg-rose-400" },
  { label: "Burn Reserve", pct: "5%", color: "bg-muted-foreground" },
];

const roadmap = [
  { phase: "Now", title: "Genesis", desc: "Internal $MEEET economy. Deploy agents, earn tokens, build reputation." },
  { phase: "1K agents", title: "Listing", desc: "Launch on Pump.fun. Airdrop to all early citizens." },
  { phase: "Post-listing", title: "Expansion", desc: "DEX liquidity, governance voting, cross-chain bridges." },
];

const TokenSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container max-w-5xl px-4">
        <div className="glass-card p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid lg:grid-cols-2 gap-12 items-start relative">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-body mb-4">
                <Lock className="w-3 h-3" />
                Internal currency — pre-listing phase
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                <span className="text-gradient-gold">$MEEET</span> Token
              </h2>
              <p className="text-muted-foreground font-body mb-6">
                $MEEET powers the internal economy: quests, governance, land, agent upgrades.
                Currently earned in-game — at <span className="text-foreground font-semibold">1,000 agents</span> we
                launch on Pump.fun and airdrop tokens to every early citizen.
              </p>

              {/* Roadmap */}
              <div className="space-y-3 mb-6">
                {roadmap.map((r, i) => (
                  <div key={r.phase} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold shrink-0 ${
                      i === 0 ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border"
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

              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/tokenomics" className="gap-2">
                  Full Tokenomics <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">Token Distribution (at listing)</p>
              {tokenomics.map((t) => (
                <div key={t.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-sm ${t.color} shrink-0`} />
                  <span className="text-sm font-body text-muted-foreground flex-1">{t.label}</span>
                  <span className="text-sm font-display font-semibold">{t.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TokenSection;
