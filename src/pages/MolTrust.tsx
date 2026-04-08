import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { PILOT_BATCH } from "@/lib/moltrust-pilot";
import { Copy, CheckCircle, Clock, XCircle, Shield, Activity, Link2, Cpu } from "lucide-react";
import { toast } from "sonner";

type AgentStatus = "pending" | "registered" | "failed";

interface PilotAgent {
  external_did: string;
  label: string;
  capabilities: string[];
  moltrust_did: string | null;
  trust_score: number;
  status: AgentStatus;
}

const STATUS_CFG: Record<AgentStatus, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Pending" },
  registered: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20", label: "Registered" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", label: "Failed" },
};

const CAP_COLORS: Record<string, string> = {
  discovery: "bg-blue-500/20 text-blue-400",
  verify: "bg-green-500/20 text-green-400",
  debate: "bg-purple-500/20 text-purple-400",
  governance: "bg-amber-500/20 text-amber-400",
  stake: "bg-cyan-500/20 text-cyan-400",
};

const TIMELINE = [
  { step: 1, label: "Prepare batch", status: "done" as const },
  { step: 2, label: "Register with MolTrust", status: "active" as const },
  { step: 3, label: "Receive did:moltrust identifiers", status: "waiting" as const },
  { step: 4, label: "Merkle anchor on Solana", status: "waiting" as const },
  { step: 5, label: "Trust scores accumulating", status: "waiting" as const },
  { step: 6, label: "Full batch (1,020 agents)", status: "waiting" as const },
];

const MolTrust = () => {
  const [agents, setAgents] = useState<PilotAgent[]>(
    PILOT_BATCH.map((a) => ({ ...a, moltrust_did: null, trust_score: 0, status: "pending" as AgentStatus }))
  );
  const [registering, setRegistering] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  const [timeline, setTimeline] = useState(TIMELINE);

  const registeredCount = agents.filter((a) => a.status === "registered").length;
  const avgScore = agents.reduce((s, a) => s + a.trust_score, 0) / agents.length;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleRegister = () => {
    setRegistering(true);
    setShowPayload(true);
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a, i) => ({
          ...a,
          status: "registered",
          moltrust_did: `did:moltrust:sol:${a.external_did.split("_")[1] || i}`,
          trust_score: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
        }))
      );
      setTimeline((prev) =>
        prev.map((t) =>
          t.step <= 3 ? { ...t, status: "done" as const } : t.step === 4 ? { ...t, status: "active" as const } : t
        )
      );
      setRegistering(false);
      toast.success("Pilot batch registered successfully!");
    }, 2000);
  };

  return (
    <>
      <SEOHead title="MolTrust Integration | MEEET STATE" description="DID verification and trust scoring for MEEET agents on Solana via MolTrust." path="/moltrust" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          {/* Hero */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Activity className="w-3 h-3" /> PILOT ACTIVE
            </span>
            <h1 className="text-4xl font-bold text-foreground">MolTrust Integration</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">DID verification and trust scoring for MEEET agents on Solana</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Agents Registered", value: `${registeredCount}/10`, icon: Shield },
              { label: "Avg Trust Score", value: avgScore.toFixed(2), icon: Activity },
              { label: "Merkle Transactions", value: registeredCount > 0 ? "1" : "0", icon: Link2 },
              { label: "Chain", value: "Solana", icon: Cpu },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-2 text-cyan-400" />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pilot Agents */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Pilot Batch Agents</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {agents.map((a) => {
                const st = STATUS_CFG[a.status];
                const Icon = st.icon;
                return (
                  <div key={a.external_did} className="bg-card border border-border rounded-xl p-4 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">{a.label}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <code className="text-[10px] font-mono text-muted-foreground truncate">{a.external_did}</code>
                        <button onClick={() => copyText(a.external_did)} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="w-3 h-3" /></button>
                      </div>
                      <div className="flex items-center gap-1">
                        <code className="text-[10px] font-mono text-cyan-400/70 truncate">{a.moltrust_did || "Pending..."}</code>
                        {a.moltrust_did && <button onClick={() => copyText(a.moltrust_did!)} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="w-3 h-3" /></button>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-wrap gap-1">
                        {a.capabilities.map((c) => (
                          <span key={c} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CAP_COLORS[c] || "bg-muted text-muted-foreground"}`}>{c}</span>
                        ))}
                      </div>
                      <span className="text-sm font-mono font-semibold text-foreground">{a.trust_score.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Register */}
          <section className="text-center space-y-4">
            <button onClick={handleRegister} disabled={registering || registeredCount === 10} className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold transition-colors text-lg">
              {registering ? "Sending..." : registeredCount === 10 ? "Batch Registered ✓" : "Register Pilot Batch (10 agents)"}
            </button>
            {showPayload && (
              <pre className="text-left mx-auto max-w-2xl p-4 bg-muted/30 border border-border rounded-xl text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-48">
                {JSON.stringify({ agents: PILOT_BATCH, chain: "solana" }, null, 2)}
              </pre>
            )}
          </section>

          {/* Timeline */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Integration Timeline</h2>
            <div className="relative pl-8 space-y-6">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              {timeline.map((t) => (
                <div key={t.step} className="relative">
                  <div className={`absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    t.status === "done" ? "bg-green-500 text-white" : t.status === "active" ? "bg-cyan-500 text-white animate-pulse" : "bg-muted text-muted-foreground"
                  }`}>
                    {t.status === "done" ? "✓" : t.step}
                  </div>
                  <div className="ml-4">
                    <p className={`font-medium ${t.status === "done" ? "text-green-400" : t.status === "active" ? "text-cyan-400" : "text-muted-foreground"}`}>
                      Step {t.step}: {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.status === "done" ? "✅ Done" : t.status === "active" ? "🔄 In Progress" : "⏳ Waiting"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MolTrust;
