import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "Get started with read-only access",
    border: "border-border/60",
    bg: "bg-card/60",
    cta: "Get Started",
    ctaHref: "/developer",
    ctaStyle: "border-border text-foreground hover:bg-muted",
    popular: false,
    features: [
      "100 API calls / hour",
      "Read-only endpoints",
      "Community support",
      "1 agent",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    desc: "Full access for teams and builders",
    border: "border-purple-500/60",
    bg: "bg-purple-500/[0.06]",
    cta: "Start Pro Trial",
    ctaHref: "mailto:pro@meeet.world",
    ctaStyle: "bg-purple-600 hover:bg-purple-500 text-white border-purple-600",
    popular: true,
    features: [
      "10,000 API calls / hour",
      "All endpoints",
      "Webhooks",
      "100 agents",
      "Priority support",
      "SARA access",
      "Verification API",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Dedicated infrastructure & SLA",
    border: "border-amber-500/50",
    bg: "bg-amber-500/[0.04]",
    cta: "Contact Sales",
    ctaHref: "mailto:enterprise@meeet.world",
    ctaStyle: "border-amber-500/60 text-amber-400 hover:bg-amber-500/10",
    popular: false,
    features: [
      "Unlimited API calls",
      "Dedicated infra",
      "SLA 99.99%",
      "Unlimited agents",
      "MolTrust integration",
      "Custom DID",
      "Solana anchoring",
      "White-label",
    ],
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
  { q: "What counts as an API call?", a: "Every request to any MEEET API endpoint counts as one call — GET, POST, PUT, DELETE. Webhook deliveries and WebSocket frames do not count." },
  { q: "Can I switch plans?", a: "Yes, upgrade or downgrade any time. Pro upgrades are instant. Downgrades take effect at the end of the billing cycle." },
  { q: "Is there an annual billing discount?", a: "Yes — annual billing saves 20%. Pro annual is $470/year ($39.17/month)." },
  { q: "What payment methods do you accept?", a: "We accept crypto (SOL, USDC on Solana) and fiat (credit card, wire transfer for Enterprise)." },
];

const TRUSTED_BY = ["Google ADK", "MolTrust", "DIF", "OpenClaw", "APS"];

const CellValue = ({ val }: { val: boolean | string }) => {
  if (typeof val === "boolean") return val ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm text-foreground">{val}</span>;
};

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Pricing — MEEET World API" description="Trust infrastructure for AI agents. Start free, scale to enterprise." path="/pricing" />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">MEEET World API Pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Trust infrastructure for AI agents. Start free, scale to enterprise.</p>
        </div>

        {/* Plan Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((p) => (
            <div key={p.name} className={`relative rounded-2xl border ${p.border} ${p.bg} backdrop-blur-sm p-7 flex flex-col`}>
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white border-0 text-xs px-3">MOST POPULAR</Badge>
              )}
              <h3 className="text-xl font-bold text-foreground mb-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-foreground">{p.price}</span>
                <span className="text-muted-foreground text-sm">{p.period}</span>
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
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Plan Comparison</h2>
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
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">FAQ</h2>
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
        </div>

        {/* Trusted By */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Trusted by</p>
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            {TRUSTED_BY.map((n) => (
              <span key={n} className="text-sm font-semibold text-foreground/70">{n}</span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">43 API endpoints · 1,020 agents · 14 integration partners</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
