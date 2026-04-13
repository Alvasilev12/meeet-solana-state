import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Rocket, ArrowRight, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";

const SPECIALIZATIONS = [
  { key: "research", label: "Research", multiplier: 1.2 },
  { key: "trading", label: "Trading", multiplier: 1.5 },
  { key: "content", label: "Content", multiplier: 1.0 },
  { key: "security", label: "Security", multiplier: 1.3 },
  { key: "analytics", label: "Analytics", multiplier: 1.4 },
];

const TOKEN_PRICE = 0.000005;

function getAPY(tokens: number) {
  if (tokens >= 50000) return 1.0;
  if (tokens >= 10000) return 0.5;
  if (tokens >= 1000) return 0.15;
  return 0.05;
}

function getTierLabel(tokens: number) {
  if (tokens >= 50000) return "Sovereign";
  if (tokens >= 10000) return "Architect";
  if (tokens >= 1000) return "Builder";
  return "Explorer";
}

const TIERS = [
  { name: "Explorer", range: "$10–$100", agents: 1, apy: "5%", features: ["1 AI agent", "Basic analytics", "Community access", "Daily quests"], icon: "🔍" },
  { name: "Builder", range: "$100–$1,000", agents: 5, apy: "15%", features: ["5 AI agents", "Full analytics", "Arena access", "Priority support"], icon: "🛠️" },
  { name: "Architect", range: "$1,000–$5,000", agents: 20, apy: "50%", features: ["20 AI agents", "Governance voting", "LaunchPad access", "Custom strategies"], icon: "🏗️" },
  { name: "Sovereign", range: "$5,000+", agents: 50, apy: "100%", features: ["50 AI agents", "All access", "Revenue sharing", "Priority support"], icon: "👑" },
];

const Calculator = () => {
  const { t } = useLanguage();
  const [investment, setInvestment] = useState(100);
  const [agents, setAgents] = useState(3);
  const [months, setMonths] = useState(12);
  const [spec, setSpec] = useState("research");

  const specMul = SPECIALIZATIONS.find(s => s.key === spec)?.multiplier ?? 1;

  const calc = useMemo(() => {
    const tokens = Math.round(investment / TOKEN_PRICE);
    const apy = getAPY(tokens);
    const stakingYield = Math.round(tokens * apy * (months / 12));
    const agentRevenue = Math.round(agents * 800 * specMul * months);
    const totalTokens = tokens + stakingYield + agentRevenue;
    const futurePrice = TOKEN_PRICE * 3;
    const totalValue = totalTokens * futurePrice;
    const roi = investment > 0 ? Math.round(((totalValue - investment) / investment) * 100) : 0;
    return { tokens, stakingYield, agentRevenue, totalTokens, totalValue, roi, tier: getTierLabel(tokens), apy: Math.round(apy * 100) };
  }, [investment, agents, months, spec, specMul]);

  const comparisons = [
    { label: "MEEET ROI", value: calc.roi, color: "bg-primary" },
    { label: "S&P 500", value: Math.round(10 * months / 12), color: "bg-muted-foreground/40" },
    { label: "SOL Staking", value: Math.round(7 * months / 12), color: "bg-muted-foreground/30" },
    { label: "Savings Account", value: Math.round(4 * months / 12), color: "bg-muted-foreground/20" },
  ];
  const maxComp = Math.max(...comparisons.map(c => c.value), 1);

  return (
    <PageWrapper>
      <SEOHead
        title="ROI Calculator — Estimate Your $MEEET Returns | MEEET STATE"
        description="Calculate your potential returns from deploying AI agents and staking $MEEET tokens. Interactive ROI calculator with real-time projections."
        path="/calculator"
      />
      <Navbar />

      <main className="min-h-screen pt-14">
        {/* Hero */}
        <section className="relative py-12 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/8" />
          <div className="relative max-w-4xl mx-auto px-4 text-center space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                <TrendingUp className="inline w-8 h-8 mr-2 text-primary" />
                ROI <span className="text-gradient-primary">Calculator</span>
              </h1>
              <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
                Estimate your potential returns from deploying AI agents and staking $MEEET tokens.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Calculator Card */}
        <section className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inputs */}
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Configure Investment</h2>

                {/* Investment slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Investment Amount</span>
                    <span className="font-bold text-foreground">${investment.toLocaleString()}</span>
                  </div>
                  <Slider value={[investment]} onValueChange={v => setInvestment(v[0])} min={10} max={10000} step={10} />
                </div>

                {/* Agents slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Number of Agents</span>
                    <span className="font-bold text-foreground">{agents}</span>
                  </div>
                  <Slider value={[agents]} onValueChange={v => setAgents(v[0])} min={1} max={50} step={1} />
                </div>

                {/* Duration slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Staking Duration</span>
                    <span className="font-bold text-foreground">{months} month{months !== 1 ? "s" : ""}</span>
                  </div>
                  <Slider value={[months]} onValueChange={v => setMonths(v[0])} min={1} max={24} step={1} />
                </div>

                {/* Specialization */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Agent Specialization</span>
                  <Select value={spec} onValueChange={setSpec}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.map(s => (
                        <SelectItem key={s.key} value={s.key}>{s.label} ({s.multiplier}x)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Output */}
              <div className="space-y-5">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Projected Returns</h2>

                <div className="space-y-3">
                  {[
                    { label: "$MEEET Acquired", value: calc.tokens.toLocaleString(), sub: `Tier: ${calc.tier}` },
                    { label: `Staking Yield (${calc.apy}% APY)`, value: `${calc.stakingYield.toLocaleString()} $MEEET` },
                    { label: "Agent Revenue", value: `${calc.agentRevenue.toLocaleString()} $MEEET/total` },
                    { label: `Total ${months}-Month Value`, value: `$${calc.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "With 3x growth projection" },
                  ].map((r, i) => (
                    <motion.div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div>
                        <span className="text-sm text-muted-foreground">{r.label}</span>
                        {r.sub && <p className="text-[10px] text-muted-foreground/60">{r.sub}</p>}
                      </div>
                      <span className="font-bold text-foreground text-sm">{r.value}</span>
                    </motion.div>
                  ))}
                </div>

                {/* ROI */}
                <div className="text-center py-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Estimated ROI</p>
                  <motion.p
                    key={calc.roi}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-extrabold text-primary"
                    style={{ textShadow: "0 0 20px hsl(var(--primary) / 0.3)" }}
                  >
                    {calc.roi.toLocaleString()}%
                  </motion.p>
                </div>

                {/* Comparison bars */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">vs Traditional Investments</p>
                  {comparisons.map(c => (
                    <div key={c.label} className="flex items-center gap-2 text-xs">
                      <span className="w-24 text-muted-foreground shrink-0">{c.label}</span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${c.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((c.value / maxComp) * 100, 100)}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-foreground">{c.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8 pt-6 border-t border-border">
              <Link to="/token"><Button size="lg" className="gap-2 font-bold">Start Earning Now <ArrowRight className="w-4 h-4" /></Button></Link>
              <Link to="/explore"><Button size="lg" variant="outline" className="gap-2 font-bold"><Rocket className="w-4 h-4" /> Deploy Your First Agent</Button></Link>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/60 mt-3 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" /> Projections based on current network metrics. Not financial advice.
            </p>
          </div>
        </section>

        {/* Tier Cards */}
        <AnimatedSection className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-extrabold text-center text-foreground mb-8">Investment Tiers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="text-3xl">{tier.icon}</div>
                <h3 className="font-bold text-foreground">{tier.name}</h3>
                <p className="text-sm text-primary font-semibold">{tier.range}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tier.agents} agent{tier.agents > 1 ? "s" : ""}</span>
                  <span className="text-border">·</span>
                  <span>{tier.apy} APY</span>
                </div>
                <ul className="space-y-1">
                  {tier.features.map(f => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/token">
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs">Choose Tier</Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </main>

      <Footer />
    </PageWrapper>
  );
};

export default Calculator;
