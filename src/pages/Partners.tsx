import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

const counts = { total: PARTNERS.length, live: PARTNERS.filter(p => p.status === "Live").length, progress: PARTNERS.filter(p => p.status === "In Progress").length, proposed: PARTNERS.filter(p => p.status === "Proposed").length };

const Partners = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Integration Partners — MEEET" description="14 teams building on MEEET trust infrastructure" path="/partners" />
    <Navbar />
    <main className="pt-24 pb-16 px-4">
      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">Integration Partners</h1>
        <p className="text-lg text-muted-foreground">14 teams building on MEEET trust infrastructure</p>
      </div>

      {/* Stats */}
      <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
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

      {/* Partner Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARTNERS.map(p => {
          const cfg = statusCfg[p.status];
          return (
            <Card key={p.name} className="bg-card/60 border-border/40 hover:border-primary/20 transition-colors">
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
    </main>
    <Footer />
  </div>
);

export default Partners;
