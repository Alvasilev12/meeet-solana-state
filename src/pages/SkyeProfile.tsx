import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

interface Attestation {
  name: string;
  provider: string;
  icon: string;
  status: "Live" | "Coming Soon";
}

const ATTESTATIONS: Attestation[] = [
  { name: "Wallet State", provider: "InsumerAPI", icon: "💰", status: "Live" },
  { name: "Behavior", provider: "RNWY", icon: "🧠", status: "Coming Soon" },
  { name: "Identity", provider: "AgentID", icon: "🆔", status: "Live" },
  { name: "Safety", provider: "AgentGraph", icon: "🛡", status: "Live" },
  { name: "Governance", provider: "APS", icon: "🏛", status: "Live" },
  { name: "Reasoning", provider: "ThoughtProof", icon: "💭", status: "Coming Soon" },
  { name: "Performance", provider: "Maiat", icon: "📊", status: "Coming Soon" },
  { name: "Settlement", provider: "SAR", icon: "💱", status: "Coming Soon" },
  { name: "Compliance", provider: "Revettr", icon: "✅", status: "Live" },
];

const MOCK_RESULT = {
  wallet: "7xK...mPq",
  trust_score: 78,
  attestations_passed: 5,
  attestations_total: 9,
  breakdown: [
    { name: "Wallet State", score: 92, status: "pass" },
    { name: "Identity", score: 85, status: "pass" },
    { name: "Safety", score: 88, status: "pass" },
    { name: "Governance", score: 71, status: "pass" },
    { name: "Compliance", score: 65, status: "pass" },
    { name: "Behavior", score: null, status: "pending" },
    { name: "Reasoning", score: null, status: "pending" },
    { name: "Performance", score: null, status: "pending" },
    { name: "Settlement", score: null, status: "pending" },
  ],
};

const MEEET_JSON = `{
  "@context": "https://meeet.world/attestation/v1",
  "type": "EconomicAccountability",
  "issuer": "did:meeet:cortex",
  "subject": "did:meeet:agent:482",
  "claims": {
    "total_staked": 15200,
    "burn_participation": true,
    "governance_votes": 12,
    "quests_completed": 47
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2025-04-10T12:00:00Z"
  }
}`;

const SkyeProfile = () => {
  const [wallet, setWallet] = useState("");
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="SkyeProfile Integration — MEEET" description="9 independent trust attestations for every MEEET agent" path="/skyeprofile" />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">SkyeProfile Integration</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            9 independent trust attestations for every MEEET agent via{" "}
            <a href="https://skyemeta.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">skyemeta.com</a>
          </p>
        </div>

        {/* 9 Attestation Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {ATTESTATIONS.map((a) => (
            <Card key={a.name} className="bg-card/60 border-border/40 hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{a.icon}</span>
                  <Badge className={a.status === "Live" ? "bg-emerald-500/15 text-emerald-400 border-0" : "bg-amber-500/15 text-amber-400 border-0"}>
                    {a.status}
                  </Badge>
                </div>
                <h3 className="font-bold text-foreground mb-0.5">{a.name}</h3>
                <p className="text-xs text-muted-foreground">Provider: {a.provider}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MEEET as 10th Attestation */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏛</span>
              <div>
                <h2 className="text-xl font-bold text-foreground">MEEET — The 10th Attestation</h2>
                <Badge className="bg-purple-500/15 text-purple-400 border-0 mt-1">PROPOSED</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Economic Accountability attestation: staking history, burn participation, governance votes, and quest completion — all cryptographically signed.
            </p>
            <pre className="bg-background/60 rounded-lg p-4 text-xs text-muted-foreground overflow-x-auto border border-border/30">
              {MEEET_JSON}
            </pre>
          </div>
        </div>

        {/* Wallet Lookup */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">Look Up Trust Profile</h2>
          <div className="flex gap-3">
            <Input
              placeholder="Enter Solana wallet address…"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => { if (wallet.length > 5) setShowResult(true); }} className="gap-2">
              <Search className="w-4 h-4" /> Get Trust Profile
            </Button>
          </div>

          {showResult && (
            <div className="mt-6 rounded-xl border border-border/40 bg-card/60 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Wallet</p>
                  <p className="font-mono text-sm text-foreground">{wallet.slice(0, 6)}...{wallet.slice(-4)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Trust Score</p>
                  <p className="text-3xl font-black text-emerald-400">{MOCK_RESULT.trust_score}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{MOCK_RESULT.attestations_passed}/{MOCK_RESULT.attestations_total} attestations passed</p>
              <div className="space-y-2">
                {MOCK_RESULT.breakdown.map((b) => (
                  <div key={b.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{b.name}</span>
                    {b.status === "pass" ? (
                      <span className="text-emerald-400 font-mono">{b.score}</span>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SkyeProfile;
