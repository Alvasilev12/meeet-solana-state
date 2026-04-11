import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

const statusCfg: Record<Status, { bg: string; text: string }> = {
  Live: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  "In Progress": { bg: "bg-amber-500/15", text: "text-amber-400" },
  Proposed: { bg: "bg-slate-500/15", text: "text-slate-400" },
};

const ALL_STATUSES: (Status | "All")[] = ["All", "Live", "In Progress", "Proposed"];

const Partners = () => {
  const [filter, setFilter] = useState<Status | "All">("All");
  const filtered = filter === "All" ? PARTNERS : PARTNERS.filter(p => p.status === filter);
  const counts = { total: PARTNERS.length, live: PARTNERS.filter(p => p.status === "Live").length, progress: PARTNERS.filter(p => p.status === "In Progress").length, proposed: PARTNERS.filter(p => p.status === "Proposed").length };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Integration Partners — MEEET" description="14 teams building on MEEET trust infrastructure" path="/partners" />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">Integration Partners</h1>
          <p className="text-lg text-muted-foreground">14 teams building on MEEET trust infrastructure</p>
        </div>

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
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Partner Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const cfg = statusCfg[p.status];
            return (
              <Card key={p.name} className="bg-card/60 border-border/40 hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-foreground">{p.name}</h3>
                    <Badge className={`${cfg.bg} ${cfg.text} border-0 text-[10px]`}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
