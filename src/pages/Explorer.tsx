import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Search, CheckCircle, XCircle, Shield, FileText, Coins, AlertTriangle, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ExchangeRecord {
  id: string;
  action_ref: string;
  identity_proof: any;
  audit_proof: any;
  verification_proof: any;
  economic_proof: any;
  sara_assessment: any;
  compound_digest: string;
  created_at: string;
  epoch: number;
}

interface ValidationResult {
  identity_valid: boolean;
  audit_chain_valid: boolean;
  verification_valid: boolean;
  economic_valid: boolean;
  sara_valid: boolean;
  compound_digest_valid: boolean;
  overall: boolean;
}

const PROOF_CARDS = [
  { key: "identity", label: "Identity", icon: Shield, validKey: "identity_valid" as const, color: "from-violet-500 to-purple-600" },
  { key: "audit", label: "Audit Chain", icon: Link2, validKey: "audit_chain_valid" as const, color: "from-cyan-500 to-blue-600" },
  { key: "verification", label: "Verification", icon: CheckCircle, validKey: "verification_valid" as const, color: "from-emerald-500 to-green-600" },
  { key: "economic", label: "Economic", icon: Coins, validKey: "economic_valid" as const, color: "from-amber-500 to-orange-600" },
  { key: "sara", label: "SARA", icon: AlertTriangle, validKey: "sara_valid" as const, color: "from-red-500 to-pink-600" },
];

const Explorer = () => {
  const [query, setQuery] = useState("");
  const [record, setRecord] = useState<ExchangeRecord | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setValidation(null);
    try {
      const { data } = await supabase.from("exchange_records").select("*").eq("action_ref", query.trim()).single();
      if (data) {
        setRecord(data as unknown as ExchangeRecord);
      } else {
        setRecord(null);
        setError("No record found for this action reference.");
      }
    } catch {
      setError("Search failed.");
    }
    setLoading(false);
  };

  const verifyAll = async () => {
    if (!record) return;
    setVerifying(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/exchange-format/validate/${encodeURIComponent(record.action_ref)}`);
      const data = await res.json();
      setValidation(data);
    } catch {
      setError("Verification failed.");
    }
    setVerifying(false);
  };

  const getProofData = (key: string) => {
    if (!record) return {};
    const map: Record<string, any> = {
      identity: record.identity_proof,
      audit: record.audit_proof,
      verification: record.verification_proof,
      economic: record.economic_proof,
      sara: record.sara_assessment,
    };
    return map[key] || {};
  };

  return (
    <>
      <SEOHead title="Exchange Explorer — MEEET STATE" description="Explore and verify cross-system exchange records" />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3">
              Exchange <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Explorer</span>
            </h1>
            <p className="text-muted-foreground text-lg">Verify cross-system interoperability proofs for any action</p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && search()}
                  placeholder="Search by action_ref (e.g. discovery_2053)"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button onClick={search} disabled={loading} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
              </button>
            </div>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>

          {/* Record Display */}
          {record && (
            <div className="space-y-8">
              {/* Meta bar */}
              <div className="flex flex-wrap gap-4 items-center justify-between bg-card/50 border border-border rounded-xl p-4">
                <div>
                  <span className="text-xs text-muted-foreground">Action Ref</span>
                  <p className="font-mono text-sm text-foreground">{record.action_ref}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Epoch</span>
                  <p className="font-mono text-sm text-foreground">{record.epoch}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Created</span>
                  <p className="text-sm text-foreground">{new Date(record.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={verifyAll}
                  disabled={verifying}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Verify All
                </button>
              </div>

              {/* 5 Proof Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {PROOF_CARDS.map(card => {
                  const Icon = card.icon;
                  const proofData = getProofData(card.key);
                  const isValid = validation ? validation[card.validKey] : null;

                  return (
                    <div
                      key={card.key}
                      className={`relative rounded-xl border p-4 transition-all duration-500 ${
                        isValid === true ? "border-emerald-500/50 bg-emerald-500/5" :
                        isValid === false ? "border-red-500/50 bg-red-500/5" :
                        "border-border bg-card/50"
                      }`}
                    >
                      <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${card.color} mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-foreground text-sm mb-2">{card.label}</h3>
                      <div className="space-y-1">
                        {Object.entries(proofData).slice(0, 3).map(([k, v]) => (
                          <div key={k} className="text-xs">
                            <span className="text-muted-foreground">{k}: </span>
                            <span className="text-foreground font-mono break-all">
                              {typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 40)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {isValid !== null && (
                        <div className="absolute top-3 right-3">
                          {isValid ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Compound Digest */}
              <div className="bg-card/30 border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Compound Digest
                  {validation && (
                    validation.compound_digest_valid
                      ? <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Valid</Badge>
                      : <Badge className="bg-red-500/20 text-red-400 text-[10px]">Invalid</Badge>
                  )}
                </h3>
                <p className="font-mono text-xs text-muted-foreground break-all">{record.compound_digest}</p>
              </div>

              {/* Hash Chain Visualization */}
              {record.audit_proof && (record.audit_proof as any).signet_receipt_chain?.length > 0 && (
                <div className="bg-card/30 border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Receipt Chain
                  </h3>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {((record.audit_proof as any).signet_receipt_chain as string[]).map((receiptId, i) => (
                      <div key={i} className="flex items-center gap-2 shrink-0">
                        <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 font-mono text-xs text-foreground">
                          {receiptId}
                        </div>
                        {i < (record.audit_proof as any).signet_receipt_chain.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Validation */}
              {validation && (
                <div className={`text-center py-6 rounded-xl border ${validation.overall ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="text-3xl mb-2">{validation.overall ? "✅" : "❌"}</div>
                  <p className="text-lg font-bold text-foreground">
                    {validation.overall ? "All Proofs Verified" : "Verification Failed"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {Object.values(validation).filter(v => v === true).length}/6 checks passed
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!record && !loading && !error && (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Enter an action reference to explore its exchange record</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Explorer;
