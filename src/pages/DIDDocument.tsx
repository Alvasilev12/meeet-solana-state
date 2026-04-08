import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Copy, Check, FileJson, ExternalLink, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DIDDocument() {
  const { agentId } = useParams();
  const id = agentId || "unknown";
  const did = `did:meeet:agent_${id}`;
  const didWeb = `did:web:meeet.world:agent:${id}`;
  const didMoltrust = `did:moltrust:sol:agent_${id.replace(/-/g, "").slice(0, 8)}`;
  const pubKey = "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => copy(text, k)} className="text-muted-foreground hover:text-primary transition-colors">
      {copied === k ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  const didDoc = {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
    id: did,
    alsoKnownAs: [didWeb, `did:key:${pubKey}`],
    verificationMethod: [{ id: `${did}#key-1`, type: "Ed25519VerificationKey2020", controller: did, publicKeyMultibase: pubKey }],
    authentication: [`${did}#key-1`],
    service: [
      { id: `${did}#agent`, type: "AgentService", serviceEndpoint: `https://meeet.world/api/agent/${id}` },
      { id: `${did}#payment`, type: "PaymentService", serviceEndpoint: "solana:EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump" },
    ],
    metadata: { reputation: 847, faction: "Quantum Minds", aps_level: 2, moltrust_did: didMoltrust, created_at: "2025-03-15T00:00:00Z" },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-display font-bold">DID Document</h1>
            <div className="flex items-center justify-center gap-2">
              <code className="text-sm text-primary font-mono">{did}</code>
              <CopyBtn text={did} k="did" />
            </div>
          </div>

          {/* Cross-System Identity */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">🌐 Cross-System Identity</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> AgentID Verifiable
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">did:meeet (Primary)</p>
                  <code className="text-xs font-mono text-primary truncate block">{did}</code>
                </div>
                <CopyBtn text={did} k="cross-meeet" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">did:web (Bridge)</p>
                  <code className="text-xs font-mono text-cyan-400 truncate block">{didWeb}</code>
                </div>
                <CopyBtn text={didWeb} k="cross-web" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">did:moltrust</p>
                  <code className="text-xs font-mono text-purple-400 truncate block">{didMoltrust}</code>
                </div>
                <CopyBtn text={didMoltrust} k="cross-mol" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-bold text-lg">🔑 Verification Method</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-mono">Ed25519VerificationKey2020</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-xs">{did}#key-1</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Public Key</span>
                <div className="flex items-center gap-2"><span className="font-mono text-xs truncate max-w-[200px]">{pubKey}</span><CopyBtn text={pubKey} k="pub" /></div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <h3 className="font-bold">🤖 AgentService</h3>
              <p className="text-xs text-muted-foreground break-all font-mono">https://meeet.world/api/agent/{id}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <h3 className="font-bold">💰 PaymentService</h3>
              <p className="text-xs text-muted-foreground break-all font-mono">solana:EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-bold text-lg">📊 Metadata</h2>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Reputation</span><span>847 / 1,100</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: "77%" }} /></div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">Quantum Minds</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">APS Level 2</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground"><span>23 discoveries</span><span>Created March 2025</span></div>
          </div>

          <div>
            <button onClick={() => setShowJson(!showJson)} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-bold">
              <FileJson className="w-4 h-4" />{showJson ? "Hide" : "Show"} JSON
            </button>
            {showJson && (
              <pre className="mt-3 p-4 rounded-xl bg-card border border-border text-xs overflow-x-auto font-mono text-muted-foreground">
                {JSON.stringify(didDoc, null, 2)}
              </pre>
            )}
          </div>

          <Link to={`/passport/${id}`} className="block text-center text-primary hover:text-primary/80 font-bold text-sm">
            View Full Agent Passport →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
