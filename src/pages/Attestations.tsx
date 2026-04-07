import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Shield, Eye, EyeOff, Upload } from "lucide-react";

const PROVIDERS = [
  { name: "MolTrust", count: 45, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { name: "APS", count: 120, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { name: "VeroQ", count: 89, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { name: "Signet", count: 234, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
];

const TYPES = ["DID Verification", "Runtime Check", "Peer Review", "Content Verification"];

const ATTESTATIONS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  provider: PROVIDERS[i % 4].name,
  providerColor: PROVIDERS[i % 4].color,
  agentDid: `did:meeet:agent_${String(100 + i).padStart(3, "0")}`,
  type: TYPES[i % 4],
  trustScore: Math.round(Math.random() * 100) / 100,
  timestamp: new Date(Date.now() - i * 3600000 * 6).toISOString().slice(0, 16).replace("T", " "),
  jws: `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6bWVldDphZ2VudF8ke2l9In0.${Array.from({ length: 40 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("")}`,
}));

const scoreColor = (s: number) => s > 0.7 ? "text-green-400" : s > 0.4 ? "text-yellow-400" : "text-red-400";

const Attestations = () => {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [format, setFormat] = useState("jws");

  const toggleReveal = (id: number) => setRevealed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <SEOHead title="Attestations | MEEET STATE" description="Browse and import attestations from trusted providers." path="/attestations" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <h1 className="text-4xl font-bold text-foreground text-center">Attestations</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROVIDERS.map(p => (
              <div key={p.name} className={`border rounded-xl p-4 text-center ${p.color}`}>
                <Shield className="w-5 h-5 mx-auto mb-2" />
                <p className="text-2xl font-bold">{p.count}</p>
                <p className="text-xs opacity-80">{p.name}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Attestations</h2>
            <div className="space-y-3">
              {ATTESTATIONS.map(a => (
                <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${a.providerColor}`}>{a.provider}</span>
                    <span className="text-xs text-muted-foreground">{a.type}</span>
                    <span className={`text-xs font-mono font-semibold ml-auto ${scoreColor(a.trustScore)}`}>{a.trustScore.toFixed(2)}</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">{a.agentDid}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">{a.timestamp}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleReveal(a.id)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                      {revealed.has(a.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {revealed.has(a.id) ? "Hide JWS" : "Show JWS"}
                    </button>
                  </div>
                  {revealed.has(a.id) && (
                    <pre className="mt-2 p-3 bg-muted/30 rounded-lg text-[10px] font-mono text-muted-foreground break-all overflow-x-auto">{a.jws}</pre>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Upload className="w-5 h-5" /> Import Attestation</h2>
            <div className="space-y-3">
              <select value={format} onChange={e => setFormat(e.target.value)} className="w-full sm:w-auto px-3 py-2 rounded-lg bg-muted text-foreground border border-border text-sm">
                <option value="jws">JWS Compact</option>
                <option value="json">Raw JSON</option>
                <option value="object">Object</option>
              </select>
              <textarea className="w-full h-28 px-3 py-2 rounded-lg bg-muted text-foreground border border-border text-sm font-mono resize-none" placeholder="Paste attestation payload here..." />
              <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Import Attestation</button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Attestations;
