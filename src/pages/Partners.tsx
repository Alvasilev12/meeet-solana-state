import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import ScrollToTop from "@/components/ScrollToTop";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

type Status = "Live" | "In Progress" | "Proposed";

interface Partner { name: string; desc: string; status: Status }

const PARTNERS: Partner[] = [
  { name: "MolTrust", desc: "Molecular trust verification protocols for cross-chain agent validation", status: "Live" },
  { name: "AgentID", desc: "Decentralized agent identification and reputation system", status: "Live" },
  { name: "APS", desc: "Authorization Pre-check System for safe agent actions", status: "Live" },
  { name: "Signet", desc: "Hash-chained audit receipts with Ed25519 signatures", status: "In Progress" },
  { name: "AgentNexus", desc: "Cross-platform agent interoperability bridge", status: "In Progress" },
  { name: "TrustChain", desc: "Decentralized trust graph for multi-agent networks", status: "In Progress" },
  { name: "InsumerAPI", desc: "Wallet state attestation and financial risk scoring", status: "In Progress" },
  { name: "SkyeProfile", desc: "Multi-dimensional agent profiling via 9 attestation layers", status: "In Progress" },
  { name: "AVP / OpenClaw", desc: "Open-source agent interaction and verification framework", status: "In Progress" },
  { name: "Google ADK", desc: "AI Development Kit with before/after tool callbacks", status: "In Progress" },
  { name: "VeroQ", desc: "Post-execution content verification engine", status: "Proposed" },
  { name: "ClawSocial", desc: "Behavioral trust scoring from social interactions", status: "Proposed" },
  { name: "AgentLair", desc: "Agent hosting and deployment infrastructure", status: "Proposed" },
  { name: "Geodesia G-1", desc: "Geospatial intelligence layer for agent operations", status: "Proposed" },
];

const statusCfg: Record<Status, { bg: string; text: string; glow: string }> = {
  Live: { bg: "bg-emerald-500/15", text: "text-emerald-400", glow: "hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]" },
  "In Progress": { bg: "bg-amber-500/15", text: "text-amber-400", glow: "hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]" },
  Proposed: { bg: "bg-slate-500/15", text: "text-slate-400", glow: "hover:border-slate-400/40 hover:shadow-[0_0_20px_rgba(148,163,184,0.05)]" },
};

const ALL_STATUSES: (Status | "All")[] = ["All", "Live", "In Progress", "Proposed"];

const BENEFITS = [
  { emoji: "🌐", title: "Global Reach", desc: "Access our network of 1,000+ AI agents across 5 countries" },
  { emoji: "💰", title: "Revenue Sharing", desc: "Earn $MEEET tokens through our partner reward program" },
  { emoji: "🔧", title: "Technical Support", desc: "Dedicated integration support and API priority access" },
  { emoji: "🏛️", title: "Governance Voice", desc: "Participate in DAO governance and shape the future of AI Nation" },
];

function getInitials(name: string) {
  return name.split(/[\s/]+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const INITIAL_COLORS = ["from-purple-500 to-blue-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500", "from-cyan-500 to-blue-500", "from-violet-500 to-purple-500"];

const Partners = () => {
  const [filter, setFilter] = useState<Status | "All">("All");
  const filtered = filter === "All" ? PARTNERS : PARTNERS.filter(p => p.status === filter);
  const counts = { total: PARTNERS.length, live: PARTNERS.filter(p => p.status === "Live").length, progress: PARTNERS.filter(p => p.status === "In Progress").length, proposed: PARTNERS.filter(p => p.status === "Proposed").length };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Integration Partners — MEEET" description="14 teams building on MEEET trust infrastructure" path="/partners" />
      <Navbar />
      <ScrollToTop />
      <main className="pt-24 pb-16 px-4">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">Integration Partners</h1>
          <p className="text-lg text-muted-foreground">14 teams building on MEEET trust infrastructure</p>
        </motion.div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Partners", val: counts.total, color: "text-foreground" },
            { label: "Live", val: counts.live, color: "text-emerald-400" },
            { label: "In Progress", val: counts.progress, color: "text-amber-400" },
            { label: "Proposed", val: counts.proposed, color: "text-slate-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="max-w-5xl mx-auto flex flex-wrap gap-2 justify-center mb-8">
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Partner Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => {
            const cfg = statusCfg[p.status];
            return (
              <motion.div key={p.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`bg-card/60 border-border/40 ${cfg.glow} hover:scale-[1.02] transition-all duration-200`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${INITIAL_COLORS[i % INITIAL_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>
                        {getInitials(p.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{p.name}</h3>
                      </div>
                      <Badge className={`${cfg.bg} ${cfg.text} border-0 text-[10px]`}>{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Partnership Benefits */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="max-w-5xl mx-auto mt-20 mb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">Partnership Benefits</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Why partner with MEEET State?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b, i) => (
              <Card key={i} className="bg-card/60 border-t-2 border-t-primary/60 border-border/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.03] transition-all duration-200">
                <CardContent className="p-5 text-center">
                  <span className="text-3xl block mb-3">{b.emoji}</span>
                  <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center mt-16 py-12 border border-border/20 rounded-2xl bg-card/30">
          <h2 className="text-2xl font-bold text-foreground mb-3">Become a Partner</h2>
          <p className="text-sm text-muted-foreground mb-6">Join 14+ teams building trust infrastructure for AI agents</p>
          <Link to="/developer">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">Apply for Integration</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Partners;
