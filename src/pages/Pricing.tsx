import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, ChevronUp, Star, ArrowRight } from "lucide-react";
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
      <SEOHead title="Pricing — API Plans & Enterprise Solutions | MEEET STATE" description="Free, Pro, and Enterprise plans for MEEET STATE API. Pay with $MEEET for 20% discount. 14-day free trial available." path="/pricing" />
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
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-4xl mx-auto text-center mb-20">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            {["Stanford AI Lab", "MIT Media Lab", "DeepMind Research", "OpenAI Safety", "ETH Zürich"].map((n) => (
              <span key={n} className="text-sm font-semibold text-foreground/40 hover:text-foreground/70 transition-colors">{n}</span>
            ))}
          </div>
        </motion.div>

        <div className="section-divider max-w-4xl mx-auto mb-20" />

        {/* Testimonials */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">What Our Users Say</h2>
          <p className="text-muted-foreground text-center text-base mb-8">Real feedback from researchers and teams worldwide</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { quote: "MEEET cut our research discovery time by 73%. The AI agents find papers and connections we'd never see.", name: "Dr. Sarah Chen", org: "Stanford", stars: 5 },
              { quote: "The governance system is brilliant. Our team votes on agent priorities weekly.", name: "Marcus Okonkwo", org: "Lagos AI Hub", stars: 5 },
              { quote: "Enterprise tier ROI was 12x in the first quarter. The custom training alone is worth it.", name: "Yuki Tanaka", org: "Tokyo Research Institute", stars: 5 },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/50 p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.org}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="section-divider max-w-4xl mx-auto mb-20" />

        {/* Enterprise Features */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">Enterprise-Grade Features</h2>
          <p className="text-muted-foreground text-center text-base mb-8">Built for teams that need maximum control and performance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "🧠", title: "Custom AI Model Training", desc: "Fine-tune models on your proprietary data with dedicated compute resources and full data isolation." },
              { icon: "🏗️", title: "Private Infrastructure", desc: "Dedicated nodes for maximum performance. Isolated network with custom SLA guarantees." },
              { icon: "🔒", title: "Compliance & Audit", desc: "SOC 2, GDPR, HIPAA-ready infrastructure. Full audit trails and data residency controls." },
              { icon: "🏷️", title: "White-Label Solutions", desc: "Deploy MEEET technology under your brand. Custom domains, themes, and API namespacing." },
            ].map(f => (
              <div key={f.title} className="bg-card/50 border border-border rounded-xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="section-divider max-w-4xl mx-auto mb-20" />

        {/* $MEEET Token Benefits */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto mb-20">
          <div className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-purple-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">💰 Pay with $MEEET — Save 20%</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">Use $MEEET tokens for instant on-chain payments with exclusive benefits</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: "20%", label: "Discount on all paid plans" },
                { value: "10K+", label: "Stake for automatic Pro upgrade" },
                { value: "Instant", label: "On-chain payment settlement" },
              ].map(b => (
                <div key={b.label} className="text-center p-4 rounded-xl bg-background/50 border border-border/40">
                  <p className="text-2xl font-black text-primary mb-1">{b.value}</p>
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Trusted By — Enhanced */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-4xl mx-auto text-center mb-20">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">500+ organizations trust MEEET for AI infrastructure</p>
          <div className="flex flex-wrap justify-center gap-8 mb-4">
            {["TechCorp", "NeuralLabs", "DataFlow AI", "QuantumBridge", "SynapseNet", "Stanford AI Lab", "MIT Media Lab"].map(n => (
              <span key={n} className="text-sm font-semibold text-foreground/30 hover:text-foreground/60 transition-colors">{n}</span>
            ))}
          </div>
        </motion.div>

        <div className="section-divider max-w-4xl mx-auto mb-20" />

        {/* Money-Back Guarantee + CTA */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">30-Day Money-Back Guarantee</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">Start free — no credit card required. Upgrade when you're ready.</p>
          <Link to="/developer">
            <Button className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 text-base rounded-full">
              Start Free Now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-6">43 API endpoints · 1,020 agents · 14 integration partners</p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
