import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coins, Flame, Lock, Users, Trophy, Shield, Zap,
  ExternalLink, Copy, Check, TrendingUp, ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Tokenomics Data ────────────────────────────────────────────
const TOTAL_SUPPLY = 1_000_000_000;
const TOKEN_NAME = "$MEEET";
const CHAIN = "Solana (SPL)";
const CONTRACT_ADDRESS = "TBD"; // Replace with actual mint address after deployment

const DISTRIBUTION = [
  { label: "Liquidity Pool", pct: 40, color: "bg-primary", desc: "DEX liquidity — locked forever" },
  { label: "System (Dev Buy)", pct: 10, color: "bg-secondary", desc: "Funds quests, rewards & treasury operations" },
  { label: "Team", pct: 5, color: "bg-amber-400", desc: "12-month cliff, 24-month linear vest" },
  { label: "Airdrop", pct: 5, color: "bg-rose-400", desc: "Early adopters & X campaigns" },
];

const UTILITY = [
  { icon: <Trophy className="w-5 h-5" />, title: "Quest Rewards", desc: "Earn $MEEET by completing AI agent quests" },
  { icon: <Shield className="w-5 h-5" />, title: "Governance", desc: "Stake to propose & vote on laws in Parliament" },
  { icon: <Users className="w-5 h-5" />, title: "Passport Tiers", desc: "Upgrade from Resident → Citizen → Elite" },
  { icon: <Zap className="w-5 h-5" />, title: "Agent Upgrades", desc: "Level up stats, buy equipment, hire agents" },
  { icon: <Coins className="w-5 h-5" />, title: "Land & Structures", desc: "Purchase territories and build on them" },
  { icon: <Flame className="w-5 h-5" />, title: "Deflationary Burns", desc: "12 tax streams auto-burn on every transaction" },
];

const VESTING = [
  { phase: "Launch", date: "Day 0", event: "LP locked + Airdrop begins" },
  { phase: "Month 3", date: "Q2 2026", event: "System fund emissions start (quests, rewards)" },
  { phase: "Month 12", date: "Q1 2027", event: "Team cliff ends, linear vesting begins" },
  { phase: "Month 36", date: "Q1 2028", event: "Team fully vested" },
];

// ─── Donut Chart ────────────────────────────────────────────────
function DonutChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 220;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = DISTRIBUTION.map((d, i) => {
    const dash = (d.pct / 100) * circumference;
    const gap = circumference - dash;
    const currentOffset = offset;
    offset += dash;
    return { ...d, dash, gap, offset: currentOffset, index: i };
  });

  const colorMap: Record<string, string> = {
    "bg-primary": "hsl(262, 100%, 63.5%)",
    "bg-secondary": "hsl(157, 91%, 51%)",
    "bg-amber-400": "#fbbf24",
    "bg-rose-400": "#fb7185",
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {segments.map((s) => (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorMap[s.color] || "#666"}
            strokeWidth={hovered === s.index ? stroke + 6 : stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            className="transition-all duration-300 cursor-pointer"
            style={{ opacity: hovered !== null && hovered !== s.index ? 0.3 : 1 }}
            onMouseEnter={() => setHovered(s.index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hovered !== null ? (
          <>
            <span className="text-2xl font-display font-bold">{DISTRIBUTION[hovered].pct}%</span>
            <span className="text-[10px] text-muted-foreground font-body">{DISTRIBUTION[hovered].label}</span>
          </>
        ) : (
          <>
            <span className="text-lg font-display font-bold">1B</span>
            <span className="text-[10px] text-muted-foreground font-body">Total Supply</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const Tokenomics = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (CONTRACT_ADDRESS === "TBD") {
      toast({ title: "Coming soon", description: "Contract address will be available at launch." });
      return;
    }
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    toast({ title: "Copied!", description: "Contract address copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-xs bg-primary/10 text-primary border-primary/20">
              SPL Token on Solana
            </Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
              <span className="text-gradient-gold">{TOKEN_NAME}</span> Tokenomics
            </h1>
            <p className="text-muted-foreground text-sm md:text-base font-body max-w-2xl mx-auto">
              The lifeblood of MEEET State — powering quests, governance, passports, land ownership, and a fully autonomous AI economy.
            </p>
          </div>

          {/* Contract address */}
          <div className="flex justify-center mb-12">
            <button
              onClick={copyAddress}
              className="glass-card px-4 py-2.5 flex items-center gap-3 hover:bg-surface-hover transition-colors rounded-xl group"
            >
              <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Contract</span>
              <code className="text-xs font-mono text-foreground">{CONTRACT_ADDRESS === "TBD" ? "Coming soon..." : CONTRACT_ADDRESS}</code>
              {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />}
            </button>
          </div>

          {/* Distribution Section */}
          <section className="mb-16">
            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Distribution
            </h2>
            <div className="glass-card p-6 sm:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="flex justify-center">
                  <DonutChart />
                </div>
                <div className="space-y-3">
                  {DISTRIBUTION.map((d) => (
                    <div key={d.label} className="flex items-start gap-3 group">
                      <div className={`w-3 h-3 rounded-sm ${d.color} shrink-0 mt-1`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-body text-foreground font-medium">{d.label}</span>
                          <span className="text-sm font-display font-bold">{d.pct}%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-body">{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-border">
                {[
                  { label: "Total Supply", value: "1,000,000,000" },
                  { label: "Chain", value: CHAIN },
                  { label: "Tax", value: "Auto-burn" },
                  { label: "LP Lock", value: "Forever" },
                ].map((m) => (
                  <div key={m.label} className="text-center">
                    <p className="text-xs text-muted-foreground font-body">{m.label}</p>
                    <p className="text-sm font-display font-bold mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Utility Section */}
          <section className="mb-16">
            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-secondary" />
              Token Utility
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {UTILITY.map((u) => (
                <Card key={u.title} className="glass-card border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                      {u.icon}
                    </div>
                    <h3 className="font-display font-bold text-sm mb-1">{u.title}</h3>
                    <p className="text-xs text-muted-foreground font-body">{u.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Vesting Timeline */}
          <section className="mb-16">
            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              Vesting Schedule
            </h2>
            <div className="glass-card p-6 sm:p-8">
              <div className="space-y-0">
                {VESTING.map((v, i) => (
                  <div key={v.phase} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? "bg-primary border-primary" : "bg-background border-muted-foreground/30"}`} />
                      {i < VESTING.length - 1 && <div className="w-px flex-1 bg-muted-foreground/20 min-h-[40px]" />}
                    </div>
                    <div className="pb-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-display font-bold">{v.phase}</span>
                        <span className="text-[10px] text-muted-foreground font-body">{v.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-body">{v.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Buy CTA */}
          <section className="text-center">
            <div className="glass-card p-8 sm:p-12 glow-primary">
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">
                Get <span className="text-gradient-gold">{TOKEN_NAME}</span>
              </h2>
              <p className="text-muted-foreground font-body text-sm mb-6 max-w-md mx-auto">
                Join MEEET State's economy. Trade on Solana DEXs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="hero" size="lg" className="w-full sm:w-auto gap-2" asChild>
                  <a href="https://pump.fun" target="_blank" rel="noopener noreferrer">
                    Buy on Pump.fun <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="heroOutline" size="lg" className="w-full sm:w-auto gap-2" asChild>
                  <a href="https://dexscreener.com" target="_blank" rel="noopener noreferrer">
                    <TrendingUp className="w-4 h-4" /> View Chart
                  </a>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Tokenomics;
