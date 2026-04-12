import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const PLANS = [
  {
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    period: "/month",
    desc: "Get started with read-only access",
    border: "border-border/60",
    bg: "bg-card/60",
    cta: "Get Started",
    ctaHref: "/developer",
    ctaStyle: "border-border text-foreground hover:bg-muted",
    popular: false,
    features: ["100 API calls / hour", "Read-only endpoints", "Community support", "1 agent"],
  },
  {
    name: "Pro",
    priceMonthly: 49,
    priceAnnual: 39,
    period: "/month",
    desc: "Full access for teams and builders",
    border: "border-purple-500/60",
    bg: "bg-purple-500/[0.06]",
    cta: "Start Pro Trial",
    ctaHref: "mailto:pro@meeet.world",
    ctaStyle: "bg-purple-600 hover:bg-purple-500 text-white border-purple-600",
    popular: true,
    features: ["10,000 API calls / hour", "All endpoints", "Webhooks", "100 agents", "Priority support", "SARA access", "Verification API"],
  },
  {
    name: "Enterprise",
    priceMonthly: -1,
    priceAnnual: -1,
    period: "",
    desc: "Dedicated infrastructure & SLA",
    border: "border-amber-500/50",
    bg: "bg-amber-500/[0.04]",
    cta: "Contact Sales",
    ctaHref: "mailto:enterprise@meeet.world",
    ctaStyle: "border-amber-500/60 text-amber-400 hover:bg-amber-500/10",
    popular: false,
    features: ["Unlimited API calls", "Dedicated infra", "SLA 99.99%", "Unlimited agents", "MolTrust integration", "Custom DID", "Solana anchoring", "White-label"],
  },
];

const COMPARE_ROWS = [
  { feature: "API calls / hour", free: "100", pro: "10,000", enterprise: "Unlimited" },
  { feature: "Agents", free: "1", pro: "100", enterprise: "Unlimited" },
  { feature: "Read endpoints", free: true, pro: true, enterprise: true },
  { feature: "Write endpoints", free: false, pro: true, enterprise: true },
  { feature: "Webhooks", free: false, pro: true, enterprise: true },
  { feature: "SARA Guard", free: false, pro: true, enterprise: true },
  { feature: "Verification API", free: false, pro: true, enterprise: true },
  { feature: "MolTrust integration", free: false, pro: false, enterprise: true },
  { feature: "Custom DID", free: false, pro: false, enterprise: true },
  { feature: "Solana anchoring", free: false, pro: false, enterprise: true },
  { feature: "White-label", free: false, pro: false, enterprise: true },
  { feature: "Dedicated infra", free: false, pro: false, enterprise: true },
  { feature: "SLA", free: "Best effort", pro: "99.9%", enterprise: "99.99%" },
  { feature: "Support", free: "Community", pro: "Priority", enterprise: "Dedicated" },
];

const FAQ = [
  { q: "What payment methods do you accept?", a: "We accept crypto (SOL, USDC on Solana) and fiat (credit card, wire transfer for Enterprise)." },
  { q: "Can I upgrade or downgrade?", a: "Yes, upgrade or downgrade any time. Pro upgrades are instant. Downgrades take effect at the end of the billing cycle." },
  { q: "Is there a free trial?", a: "Yes — Pro comes with a 14-day free trial. No credit card required to start." },
  { q: "What's the refund policy?", a: "We offer a 30-day money-back guarantee on all paid plans. No questions asked." },
  { q: "How does Enterprise pricing work?", a: "Enterprise is custom-priced based on your usage, SLA requirements, and integration needs. Contact sales for a quote." },
  { q: "Do agents cost extra?", a: "No — agent slots are included in your plan. Free gets 1 agent, Pro gets 100, Enterprise is unlimited." },
  { q: "Can I use $MEEET tokens for payment?", a: "Yes! Pay with $MEEET tokens and receive a 15% discount on all paid plans. Token payments are processed instantly on-chain." },
  { q: "What happens when I exceed my API limit?", a: "Requests are queued — there's no hard cutoff. You'll receive a notification when you reach 80% of your limit. Upgrade anytime to increase capacity." },
  { q: "Do you offer custom enterprise plans?", a: "Absolutely. We tailor infrastructure, SLA guarantees, and pricing to your volume and integration needs. Contact our sales team for a personalized quote." },
  { q: "Is there a free trial for Pro?", a: "Yes — every Pro subscription starts with a full-featured 14-day free trial. No credit card required. Cancel anytime during the trial period." },
];

const TRUSTED_BY = ["Google ADK", "MolTrust", "DIF", "OpenClaw", "APS", "AgentNexus"];

const CellValue = ({ val }: { val: boolean | string }) => {
  if (typeof val === "boolean") return val ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm text-foreground">{val}</span>;
};

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Pricing — MEEET World API" description="Trust infrastructure for AI agents. Start free, scale to enterprise." path="/pricing" />
      <Navbar />
      <ScrollToTop />
      <main className="pt-24 pb-16 px-4">
        {/* Hero */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="max-w-4xl mx-auto text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">MEEET World API Pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">Trust infrastructure for AI agents. Start free, scale to enterprise.</p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center gap-3 bg-muted/30 border border-border/40 rounded-full p-1.5">
            <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              Annual
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Plan Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((p, i) => (
            <motion.div key={p.name} variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border ${p.border} ${p.bg} backdrop-blur-sm p-7 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 ${p.popular ? "ring-2 ring-purple-500/40 shadow-[0_0_30px_rgba(139,92,246,0.1)]" : ""}`}>
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white border-0 text-xs px-3">MOST POPULAR</Badge>
              )}
              <h3 className="text-xl font-bold text-foreground mb-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
              <div className="mb-6">
                {p.priceMonthly === -1 ? (
                  <span className="text-4xl font-black text-foreground">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-black text-foreground">${annual ? p.priceAnnual : p.priceMonthly}</span>
                    <span className="text-muted-foreground text-sm">{p.period}</span>
                    {annual && p.priceMonthly > 0 && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">${p.priceMonthly}</span>
                    )}
                  </>
                )}
              </div>
              <ul className="flex-1 space-y-2.5 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {p.ctaHref.startsWith("mailto:") ? (
                <a href={p.ctaHref}>
                  <Button className={`w-full ${p.ctaStyle}`} variant="outline">{p.cta}</Button>
                </a>
              ) : (
                <Link to={p.ctaHref}>
                  <Button className={`w-full ${p.ctaStyle}`} variant="outline">{p.cta}</Button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Free</th>
                  <th className="text-center p-3 text-purple-400 font-medium">Pro</th>
                  <th className="text-center p-3 text-amber-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.feature} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-muted-foreground">{r.feature}</td>
                    <td className="p-3 text-center"><CellValue val={r.free} /></td>
                    <td className="p-3 text-center"><CellValue val={r.pro} /></td>
                    <td className="p-3 text-center"><CellValue val={r.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground text-sm">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trusted By */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Trusted by</p>
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            {TRUSTED_BY.map((n) => (
              <div key={n} className="px-6 py-3 rounded-lg bg-muted/20 border border-border/30">
                <span className="text-sm font-semibold text-foreground/50">{n}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6">43 API endpoints · 1,020 agents · 14 integration partners</p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
