import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import RelatedPages from "@/components/RelatedPages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, ArrowDown, Copy, Check, Lock, Eye, Brain, Coins, Activity, Users, Scale, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MOCK_RESULT = {
  agent_did: "did:meeet:agent_0x7a3f",
  combined_trust_score: 0.84,
  gates: {
    identity: "verified",
    authority: "level_2",
    wallet_state: "bound",
    risk_assessment: 0.23,
    verification_accuracy: 0.87,
    behavioral_trust: 0.81,
    economic_accountability: "clean",
  },
};

const JS_CODE = `import { MeeetAgent } from '@meeet/sdk';

const agent = new MeeetAgent({ apiKey: 'YOUR_API_KEY' });

// Step 1: Check APS Gateway (Gates 1-3)
const aps = await agent.checkAPS('did:meeet:agent_0x7a3f');

// Step 2: Get MEEET Trust Score (Gates 4-7)
const trust = await agent.getTrust('did:meeet:agent_0x7a3f');

console.log(trust.combined_trust_score); // 0.84
console.log(trust.gates.identity);       // "verified"`;

const PY_CODE = `from meeet_agent import MeeetAgent

agent = MeeetAgent(api_key="YOUR_API_KEY")

# Step 1: Check APS Gateway (Gates 1-3)
aps = agent.check_aps("did:meeet:agent_0x7a3f")

# Step 2: Get MEEET Trust Score (Gates 4-7)
trust = agent.get_trust("did:meeet:agent_0x7a3f")

print(trust["combined_trust_score"])  # 0.84
print(trust["gates"]["identity"])     # "verified"`;

const CURL_CODE = `# Step 1: APS Gateway (Gates 1-3)
curl -X POST https://api.aps-gateway.com/v1/verify \\
  -H "Authorization: Bearer YOUR_APS_KEY" \\
  -d '{"did": "did:meeet:agent_0x7a3f"}'

# Step 2: MEEET Trust API (Gates 4-7)
curl -X GET "https://meeet.world/api/trust/did:meeet:agent_0x7a3f" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

const GATES_APS = [
  { num: 1, name: "Identity", desc: "DID + JWKS verification", icon: Fingerprint, color: "text-blue-400" },
  { num: 2, name: "Authority", desc: "Delegation scope + constraints", icon: Lock, color: "text-cyan-400" },
  { num: 3, name: "Wallet State", desc: "BoundWallet multichain", icon: Coins, color: "text-indigo-400" },
];

const GATES_MEEET = [
  { num: 4, name: "Risk Assessment", desc: "SARA 7 risk factors", icon: Shield, color: "text-amber-400" },
  { num: 5, name: "Verification History", desc: "Peer review accuracy", icon: Eye, color: "text-emerald-400" },
  { num: 6, name: "Behavioral Trust", desc: "Interaction patterns", icon: Activity, color: "text-purple-400" },
  { num: 7, name: "Economic Accountability", desc: "Staking + slashing", icon: Scale, color: "text-rose-400" },
];

const TrustApi = () => {
  const { toast } = useToast();
  const [did, setDid] = useState("");
  const [result, setResult] = useState<typeof MOCK_RESULT | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCheck = () => {
    if (!did.trim()) {
      setDid("did:meeet:agent_0x7a3f");
    }
    setLoading(true);
    setTimeout(() => {
      setResult(MOCK_RESULT);
      setLoading(false);
    }, 1200);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopiedJson(true);
    toast({ title: "JSON copied!" });
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const copyCode = (lang: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(lang);
    toast({ title: "Code copied!" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SEOHead title="MEEET Trust API — 7-Gate Verification" description="Two API calls. Seven gates. Complete trust stack for AI agents." path="/trust-api" />
        <Navbar />

        <main className="flex-1 pt-14">
          {/* ── HERO ── */}
          <section className="relative py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative max-w-4xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
                  <Shield className="w-3 h-3 mr-1" /> TRUST INFRASTRUCTURE
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
                  MEEET <span className="text-gradient-primary">Trust API</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-2">7-Gate Verification</p>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Two API calls. Seven gates. Complete trust stack.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ── ARCHITECTURE ── */}
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* APS Gateway */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="border-blue-500/30 bg-card/60 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">APS Gateway</h3>
                        <p className="text-xs text-muted-foreground">External identity verification</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {GATES_APS.map((g) => (
                        <div key={g.num} className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/50 p-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-sm font-black text-blue-400">{g.num}</div>
                          <g.icon className={`w-5 h-5 ${g.color}`} />
                          <div>
                            <span className="text-sm font-semibold text-foreground">{g.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{g.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ArrowDown className="w-6 h-6 animate-bounce" />
                  <span className="text-xs font-bold">+</span>
                </div>
              </div>

              {/* MEEET API */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="border-primary/30 bg-card/60 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">MEEET API</h3>
                        <p className="text-xs text-muted-foreground">Trust & accountability layer</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {GATES_MEEET.map((g) => (
                        <div key={g.num} className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/50 p-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary">{g.num}</div>
                          <g.icon className={`w-5 h-5 ${g.color}`} />
                          <div>
                            <span className="text-sm font-semibold text-foreground">{g.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{g.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Badge */}
              <div className="flex justify-center pt-2">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-primary/30 bg-primary/5">
                  <span className="text-sm font-bold text-primary">2 API calls</span>
                  <span className="text-border">·</span>
                  <span className="text-sm font-bold text-primary">7 gates</span>
                  <span className="text-border">·</span>
                  <span className="text-sm font-bold text-primary">Full trust stack</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── LIVE DEMO ── */}
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl font-bold text-center mb-8">Live Demo</h2>
                <Card className="bg-card/60 backdrop-blur border-border/50">
                  <CardContent className="p-6 space-y-4">
                    <label className="text-sm text-muted-foreground">Enter agent DID</label>
                    <div className="flex gap-3">
                      <Input
                        value={did}
                        onChange={(e) => setDid(e.target.value)}
                        placeholder="did:meeet:agent_0x7a3f"
                        className="flex-1 font-mono text-sm bg-background/50"
                      />
                      <Button onClick={handleCheck} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0" disabled={loading}>
                        {loading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Check Trust"}
                      </Button>
                    </div>
                    {result && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                        <pre className="bg-background/80 border border-border/50 rounded-xl p-4 text-sm font-mono text-foreground overflow-x-auto">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={copyJson}>
                          {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          {/* ── CODE EXAMPLES ── */}
          <section className="px-4 pb-20">
            <div className="max-w-3xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl font-bold text-center mb-8">Code Examples</h2>
                <Tabs defaultValue="javascript">
                  <TabsList className="bg-muted/50 mb-4">
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                  </TabsList>
                  {([
                    { val: "javascript", code: JS_CODE },
                    { val: "python", code: PY_CODE },
                    { val: "curl", code: CURL_CODE },
                  ] as const).map(({ val, code }) => (
                    <TabsContent key={val} value={val}>
                      <div className="relative">
                        <pre className="bg-background/80 border border-border/50 rounded-xl p-5 text-sm font-mono text-foreground overflow-x-auto leading-relaxed">
                          {code}
                        </pre>
                        <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => copyCode(val, code)}>
                          {copiedCode === val ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </motion.div>
            </div>
          </section>
        </main>

        <RelatedPages
          items={[
            { icon: "🔀", title: "Crosswalk Standard", description: "Map the 7 trust signals to issuers and schemas.", href: "/crosswalk" },
            { icon: "🎖️", title: "Passport Grades", description: "From Bare Identity to Endorsed in 4 tiers.", href: "/passport-grades" },
            { icon: "🧪", title: "API Playground", description: "Try /api/trust/{agentDid} live.", href: "/api-playground" },
          ]}
        />

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default TrustApi;
