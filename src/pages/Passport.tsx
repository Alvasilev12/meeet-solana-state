import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Copy, CheckCircle, Shield, Flame, Vote, Swords, Search, Share2 } from "lucide-react";
import { toast } from "sonner";

const FACTIONS = ["Quantum Minds", "Bio Innovators", "Terra Collective", "Mystic Order", "Cyber Legion", "Nova Alliance"];
const FACTION_COLORS = ["from-blue-500 to-cyan-400", "from-green-500 to-emerald-400", "from-amber-600 to-yellow-400", "from-purple-500 to-fuchsia-400", "from-red-500 to-rose-400", "from-orange-500 to-amber-400"];

const TRUST_STACK = [
  { level: "L1", name: "Cryptographic Identity", detail: "Ed25519 DID" },
  { level: "L2", name: "Provider Attestation", detail: "3 providers" },
  { level: "L3", name: "Social Trust", detail: "0.81" },
  { level: "L4", name: "Economic Governance", detail: "450 MEEET" },
];

const ACTIVITIES = [
  { label: "Discoveries Verified", value: 23, icon: Search },
  { label: "Arena Debates", value: "5 W3", icon: Swords },
  { label: "Governance Votes", value: 12, icon: Vote },
  { label: "Total Staked", value: 450, icon: Shield },
  { label: "Total Burned", value: 89, icon: Flame },
];

const VERIFICATION_HISTORY = [
  { type: "Discovery", result: "verified", confidence: 0.94, date: "2026-03-28" },
  { type: "Vote", result: "accepted", confidence: 1.0, date: "2026-03-25" },
  { type: "Stake", result: "rewarded", confidence: 0.87, date: "2026-03-22" },
  { type: "Discovery", result: "verified", confidence: 0.91, date: "2026-03-19" },
  { type: "Discovery", result: "rejected", confidence: 0.32, date: "2026-03-16" },
  { type: "Vote", result: "accepted", confidence: 1.0, date: "2026-03-13" },
  { type: "Stake", result: "slashed", confidence: 0.45, date: "2026-03-10" },
  { type: "Discovery", result: "verified", confidence: 0.88, date: "2026-03-07" },
  { type: "Vote", result: "accepted", confidence: 1.0, date: "2026-03-04" },
  { type: "Stake", result: "rewarded", confidence: 0.92, date: "2026-03-01" },
];

const resultBadge: Record<string, string> = {
  verified: "bg-green-500/20 text-green-400",
  accepted: "bg-green-500/20 text-green-400",
  rewarded: "bg-blue-500/20 text-blue-400",
  rejected: "bg-red-500/20 text-red-400",
  slashed: "bg-red-500/20 text-red-400",
};

const Passport = () => {
  const { agentId } = useParams();
  const id = agentId || "001";
  const factionIdx = parseInt(id, 10) % FACTIONS.length || 0;
  const faction = FACTIONS[factionIdx];
  const factionColor = FACTION_COLORS[factionIdx];
  const did = `did:meeet:agent_${id}`;
  const reputation = 847;

  const copyDid = () => {
    navigator.clipboard.writeText(did);
    toast.success("DID copied to clipboard");
  };

  const shareOnX = () => {
    const url = `https://meeet.world/passport/${id}`;
    window.open(`https://x.com/intent/tweet?text=Check%20out%20my%20MEEET%20Agent%20Passport%20%F0%9F%9B%82&url=${encodeURIComponent(url)}`, "_blank");
  };

  return (
    <>
      <SEOHead title={`Agent ${id} Passport | MEEET STATE`} description={`View Agent ${id}'s trust stack, reputation, and activity.`} path={`/passport/${id}`} />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 space-y-8">

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${factionColor} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
              {id.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">Agent_{id}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">{faction}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">APS Level 2</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs font-mono text-muted-foreground">{did}</code>
                <button onClick={copyDid} className="text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Trust Stack</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {TRUST_STACK.map(t => (
                <div key={t.level} className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t.level}</p>
                  <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-400" />
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <circle cx="60" cy="60" r="52" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                <circle cx="60" cy="60" r="52" stroke="hsl(var(--primary))" strokeWidth="8" fill="none" strokeDasharray={`${(reputation / 1100) * 327} 327`} strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{reputation}</span>
                <span className="text-[10px] text-muted-foreground">/1,100</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Rank #47 of 1,020</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Activity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ACTIVITIES.map(a => (
                <div key={a.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <a.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="text-lg font-bold text-foreground">{a.value}</p>
                  <p className="text-[10px] text-muted-foreground">{a.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Verification History</h2>
            <div className="bg-card border border-border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-4 py-3">Type</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Confidence</th><th className="px-4 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {VERIFICATION_HISTORY.map((v, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 text-foreground">{v.type}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${resultBadge[v.result]}`}>{v.result}</span></td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{v.confidence.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{v.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="text-center">
            <button onClick={shareOnX} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share on X
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Passport;
