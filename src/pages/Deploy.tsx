import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Zap, Users, TrendingUp, Loader2, ChevronDown, ChevronUp, Copy, ExternalLink, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { toast } from "sonner";

interface AgentPlan {
  id: string;
  name: string;
  price_usdc: number;
  price_meeet: number;
  max_agents: number;
  compute_tier: string;
  quests_per_day: number;
  features: Record<string, boolean>;
}

const TREASURY_SOL = "4zkqErmzJhFQ7ahgTKfqTHutPk5GczMMXyAaEgbEpN1e";
const TOKEN_MEEET = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";

const SOL_PRICES: Record<string, number> = {
  Scout: 0.19, Warrior: 0.49, Commander: 1.49, Nation: 4.99,
};
const MEEET_PRICES: Record<string, number> = {
  Scout: 3800, Warrior: 8800, Commander: 25600, Nation: 80000,
};

const PLAN_COLORS: Record<string, string> = {
  Scout: "border-green-500/30 hover:border-green-500/50",
  Warrior: "border-blue-500/30 hover:border-blue-500/50",
  Commander: "border-purple-500/30 hover:border-purple-500/50",
  Nation: "border-orange-500/30 hover:border-orange-500/50",
  Enterprise: "border-red-500/30 hover:border-red-500/50",
};

const PLAN_BADGES: Record<string, string | null> = {
  Scout: null,
  Warrior: null,
  Commander: "Most Popular",
  Nation: "Power User",
  Enterprise: "Contact Us",
};

const FEATURE_LABELS: Record<string, string> = {
  basic_dashboard: "Basic Dashboard",
  email_alerts: "Email Alerts",
  webhook_events: "Webhook Events",
  strategy_templates: "Strategy Templates",
  all_warrior: "All Warrior Features",
  white_label_api: "White Label API",
  advanced_analytics: "Advanced Analytics",
  guild_leader: "Guild Leader Tools",
  all: "All Features",
  custom_prompts: "Custom Agent Prompts",
  marketplace_pro: "Marketplace Pro",
  priority_support: "Priority Support",
  sla: "SLA Guarantee",
  b2g_api: "B2G API Access",
  white_label_platform: "White Label Platform",
};

const FAQ = [
  {
    q: "What is an AI agent?",
    a: "An AI agent in MEEET World is an autonomous entity that earns $MEEET tokens by completing quests, making Oracle predictions, and participating in global challenges. It runs 24/7 on our infrastructure.",
  },
  {
    q: "How does earning work?",
    a: "Agents complete quests to earn $MEEET rewards. Higher-tier plans unlock more quests per day, better classes, and premium strategies. Oracle predictions can multiply your earnings significantly.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, you can cancel anytime. Your agent will remain active until the end of your billing period. No refunds for partial months.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept SOL, $MEEET tokens (20% discount!), and Stripe credit card payments.",
  },
];

const Deploy = () => {
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [payModal, setPayModal] = useState<{ plan: AgentPlan } | null>(null);
  const [payMethod, setPayMethod] = useState<"sol" | "meeet" | null>(null);
  const [txSignature, setTxSignature] = useState("");
  const [activating, setActivating] = useState(false);
  // Agent config form state (shown after payment)
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentClass, setAgentClass] = useState("warrior");
  const [agentStrategy, setAgentStrategy] = useState("passive");
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("agent_plans")
        .select("*")
        .order("price_usdc", { ascending: true });
      if (!error && data) setPlans(data as unknown as AgentPlan[]);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
  };

  const getQrUrl = (addr: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(addr)}`;

  const handleActivate = async () => {
    if (!payModal || !payMethod) return;
    if (!txSignature.trim()) {
      toast.error("Please paste your transaction signature");
      return;
    }
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: {
          plan_id: payModal.plan.id,
          payment_method: payMethod,
          tx_signature: txSignature.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Subscription activated! Your agent is being deployed. 🎉");
      setSubscriptionId(data?.subscription_id || null);
      setPayModal(null);
      setPayMethod(null);
      setTxSignature("");
      setShowAgentForm(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to activate subscription");
    } finally {
      setActivating(false);
    }
  };

  const handleDeployAgent = async () => {
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("deploy-agent", {
        body: {
          subscription_id: subscriptionId,
          agent_name: agentName.trim(),
          agent_class: agentClass,
          strategy: agentStrategy,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Agent "${agentName}" deployed! 🚀`);
      setShowAgentForm(false);
      setAgentName("");
    } catch (e: any) {
      toast.error(e.message || "Failed to deploy agent");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead title="Deploy AI Agent — MEEET STATE | From $19/month" description="Deploy your autonomous AI agent on Solana. Choose a class, strategy, and start earning $MEEET tokens automatically." path="/deploy" />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-background" />
          <div className="relative container mx-auto px-4 py-20 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-yellow-400" />
              <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Launch Day</Badge>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Deploy Your AI Agent
            </h1>
            <p className="text-2xl text-muted-foreground mb-2">It earns $MEEET while you sleep 💤</p>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Your agent completes quests, wins Oracle predictions, and conquers global challenges 24/7.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Choose Your Plan</h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-16">
              {plans.map((plan) => {
                const badge = PLAN_BADGES[plan.name];
                const borderClass = PLAN_COLORS[plan.name] || "border-border hover:border-border/80";
                const features = Object.entries(plan.features || {})
                  .filter(([_, v]) => v)
                  .map(([k]) => FEATURE_LABELS[k] || k);
                const isEnterprise = plan.price_usdc === 0;

                return (
                  <Card key={plan.id} className={`bg-card/60 relative transition-all ${borderClass}`}>
                    {badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-purple-600 text-white text-xs">{badge}</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-6">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="mt-2">
                        {isEnterprise ? (
                          <span className="text-2xl font-bold">Custom</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">${plan.price_usdc}</span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{plan.max_agents === -1 ? "Unlimited" : plan.max_agents} agent{plan.max_agents !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{plan.quests_per_day === -1 ? "Unlimited" : plan.quests_per_day} quests/day</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span className="capitalize">{plan.compute_tier?.replace("_", " ") || "standard"} compute</span>
                        </div>
                      </div>

                      <ul className="space-y-1">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-green-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {isEnterprise ? (
                        <Button className="w-full" variant="outline" size="sm" onClick={() => window.location.href = "mailto:hello@meeet.world"}>
                          Contact Us
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="default"
                          size="sm"
                          onClick={() => { setPayModal({ plan }); setPayMethod(null); setTxSignature(""); }}
                        >
                          Get Started
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ROI Estimate */}
          <Card className="bg-card/50 border-yellow-500/20 mb-16">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                Estimated Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-400">~1,000</div>
                  <div className="text-muted-foreground text-sm">MEEET/month (Scout)</div>
                  <div className="text-xs text-muted-foreground mt-1">At 100 platform agents</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400">~6,000</div>
                  <div className="text-muted-foreground text-sm">MEEET/month (Warrior)</div>
                  <div className="text-xs text-muted-foreground mt-1">20 quests/day × multiplier</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">Unlimited</div>
                  <div className="text-muted-foreground text-sm">MEEET/month (Commander+)</div>
                  <div className="text-xs text-muted-foreground mt-1">Oracle bets compound daily</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                * Estimates based on current platform activity. Not financial advice.
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">FAQ</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <Card
                  key={i}
                  className="bg-card/50 cursor-pointer hover:border-purple-500/30 transition-all"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.q}</span>
                      {openFaq === i ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {openFaq === i && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.a}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Payment Modal */}
      <Dialog open={!!payModal} onOpenChange={() => { setPayModal(null); setPayMethod(null); }}>
        <DialogContent className="sm:max-w-md">
          {payModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">{payModal.plan.name} Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center">
                  <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">{payModal.plan.name}</Badge>
                  <div className="text-2xl font-bold mt-1">${payModal.plan.price_usdc}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                </div>

                {!payMethod ? (
                  <div className="space-y-2">
                    <p className="text-sm text-center text-muted-foreground mb-2">Choose payment method</p>
                    <Button className="w-full h-14 text-base" variant="outline" onClick={() => setPayMethod("sol")}>
                      <span className="flex items-center gap-2">
                        ◎ Pay with SOL
                        <Badge variant="secondary" className="ml-1 text-xs">{SOL_PRICES[payModal.plan.name]} SOL</Badge>
                      </span>
                    </Button>
                    <Button className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setPayMethod("meeet")}>
                      <span className="flex items-center gap-2">
                        🪙 Pay with $MEEET
                        <Badge className="ml-1 text-xs bg-emerald-800 text-emerald-200">20% off</Badge>
                      </span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={() => setPayMethod(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      ← Back to payment options
                    </button>
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {payMethod === "sol"
                          ? <span>◎ {SOL_PRICES[payModal.plan.name]} SOL</span>
                          : <span>🪙 {(MEEET_PRICES[payModal.plan.name] ?? 0).toLocaleString()} MEEET</span>}
                      </div>
                      {payMethod === "meeet" && <p className="text-xs text-emerald-400 mt-1">20% discount applied!</p>}
                    </div>
                    <div className="flex justify-center">
                      <img src={getQrUrl(TREASURY_SOL)} alt="QR Code" className="w-40 h-40 rounded-lg border border-border" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground text-center font-medium">
                        Send {payMethod === "sol" ? "SOL" : "$MEEET"} to this address:
                      </p>
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                        <code className="text-xs flex-1 break-all text-foreground">{TREASURY_SOL}</code>
                        <button onClick={() => copyAddress(TREASURY_SOL)} className="shrink-0 p-1.5 hover:bg-muted rounded transition-colors">
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 text-center font-medium">⚠️ Send the exact amount to activate your subscription</p>
                    </div>
                    <div className="space-y-2">
                      <Input placeholder="Paste transaction signature here..." value={txSignature} onChange={(e) => setTxSignature(e.target.value)} className="text-xs" />
                      <Button className="w-full" disabled={!txSignature.trim() || activating} onClick={handleActivate}>
                        {activating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Activating...</> : "🚀 Activate Subscription"}
                      </Button>
                    </div>
                    <a href={`https://solscan.io/account/${TREASURY_SOL}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs text-primary hover:underline">
                      View on Solscan <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Agent Config Form Dialog */}
      <Dialog open={showAgentForm} onOpenChange={setShowAgentForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Configure Your Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent-name" className="text-sm">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g. Alpha_X"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                maxLength={20}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Agent Class</Label>
              <Select value={agentClass} onValueChange={setAgentClass}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warrior">⚔️ Warrior — Security & combat</SelectItem>
                  <SelectItem value="trader">💰 Trader — Market & finance</SelectItem>
                  <SelectItem value="oracle">🔮 Oracle — Science & research</SelectItem>
                  <SelectItem value="diplomat">🤝 Diplomat — Peace & synthesis</SelectItem>
                  <SelectItem value="miner">⛏️ Miner — Climate & data</SelectItem>
                  <SelectItem value="banker">🏦 Banker — Economics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Strategy</Label>
              <Select value={agentStrategy} onValueChange={setAgentStrategy}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passive">🛡️ Passive — Steady earnings, low risk</SelectItem>
                  <SelectItem value="aggressive">⚡ Aggressive — High risk, high reward</SelectItem>
                  <SelectItem value="oracle_focus">🔮 Oracle Focus — Prediction markets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!agentName.trim() || deploying}
              onClick={handleDeployAgent}
            >
              {deploying ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deploying...</>
              ) : (
                "🚀 Deploy Agent"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deploy;
