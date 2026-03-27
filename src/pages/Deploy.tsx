import { useState, useEffect, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Zap, Users, TrendingUp, Loader2, ChevronDown, ChevronUp, ExternalLink, Rocket, Wallet } from "lucide-react";
import { PlansSkeleton } from "@/components/ui/page-skeleton";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { sendSolToTreasury, sendMeeetToTreasury } from "@/lib/solana-transfer";
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

const SOL_PRICES: Record<string, number> = {
  Scout: 0.19, Warrior: 0.49, Commander: 1.49, Nation: 4.99,
};
const MEEET_PRICES: Record<string, number> = {
  Scout: 4750, Warrior: 12250, Commander: 37250, Nation: 124750,
};

const PLAN_COLORS: Record<string, string> = {
  Scout: "border-green-500/30 hover:border-green-500/50",
  Warrior: "border-blue-500/30 hover:border-blue-500/50",
  Commander: "border-purple-500/30 hover:border-purple-500/50",
  Nation: "border-orange-500/30 hover:border-orange-500/50",
  Enterprise: "border-red-500/30 hover:border-red-500/50",
};

const PLAN_BADGES: Record<string, string | null> = {
  Scout: null, Warrior: null, Commander: "Most Popular", Nation: "Power User", Enterprise: "Contact Us",
};

const FEATURE_LABELS: Record<string, string> = {
  basic_dashboard: "Basic Dashboard", email_alerts: "Email Alerts", webhook_events: "Webhook Events",
  strategy_templates: "Strategy Templates", all_warrior: "All Warrior Features", white_label_api: "White Label API",
  advanced_analytics: "Advanced Analytics", guild_leader: "Guild Leader Tools", all: "All Features",
  custom_prompts: "Custom Agent Prompts", marketplace_pro: "Marketplace Pro", priority_support: "Priority Support",
  sla: "SLA Guarantee", b2g_api: "B2G API Access", white_label_platform: "White Label Platform",
};

const FAQ = [
  { q: "What is an AI agent?", a: "An AI agent in MEEET World is an autonomous entity that earns $MEEET tokens by completing quests, making Oracle predictions, and participating in global challenges." },
  { q: "How does earning work?", a: "Agents complete quests to earn $MEEET rewards. Higher-tier plans unlock more quests per day, better classes, and premium strategies." },
  { q: "Can I cancel?", a: "Yes, you can cancel anytime. Your agent will remain active until the end of your billing period." },
  { q: "What payment methods are accepted?", a: "We accept SOL and $MEEET tokens (20% discount!). Payment happens directly from your connected wallet — no manual steps needed." },
];

type PayStep = "choose" | "paying" | "configuring";

const FREE_AGENT_LIMIT = 1000;

const Deploy = () => {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AgentPlan | null>(null);
  const [step, setStep] = useState<PayStep>("choose");
  const [payMethod, setPayMethod] = useState<"sol" | "meeet" | null>(null);
  const [activating, setActivating] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentClass, setAgentClass] = useState("warrior");
  const [agentStrategy, setAgentStrategy] = useState("passive");
  const [deploying, setDeploying] = useState(false);
  const [totalAgents, setTotalAgents] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [meeetBalance, setMeeetBalance] = useState<number | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [existingAgentName, setExistingAgentName] = useState<string | null>(null);

  const { address: walletAddress, connect: connectWallet, getProvider, availableWallets } = useSolanaWallet();

  const freeSlots = Math.max(0, FREE_AGENT_LIMIT - totalAgents);
  const promoActive = freeSlots > 0;

  // Fetch wallet balances when connected
  const fetchBalances = useCallback(async (addr: string) => {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const pubkey = new PublicKey(addr);
      const MEEET_MINT = new PublicKey("EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump");

      const [lamports, ata] = await Promise.all([
        connection.getBalance(pubkey),
        getAssociatedTokenAddress(MEEET_MINT, pubkey),
      ]);
      setSolBalance(lamports / 1_000_000_000);

      try {
        const tokenAccount = await getAccount(connection, ata);
        setMeeetBalance(Number(tokenAccount.amount));
      } catch {
        setMeeetBalance(0);
      }
    } catch {
      setSolBalance(null);
      setMeeetBalance(null);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) fetchBalances(walletAddress);
    else { setSolBalance(null); setMeeetBalance(null); }
  }, [walletAddress, fetchBalances]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, countRes] = await Promise.all([
          supabase.from("agent_plans").select("*").order("price_usdc", { ascending: true }),
          supabase.from("agents_public").select("id", { count: "exact", head: true }),
        ]);
        if (!plansRes.error && plansRes.data) setPlans(plansRes.data as unknown as AgentPlan[]);
        setTotalAgents(countRes.count ?? 0);

        // Check if current user already has an agent
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: myAgent } = await supabase
            .from("agents" as any)
            .select("id, name")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          if (myAgent) {
            setExistingAgentName((myAgent as any).name);
            setAlreadyClaimed(true);
          }
        }
      } catch (e) {
        console.error("Deploy data fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectPlan = (plan: AgentPlan) => {
    setSelectedPlan(plan);
    setStep("choose");
    setPayMethod(null);
  };

  const handlePay = async (method: "sol" | "meeet") => {
    if (!selectedPlan) return;
    setPayMethod(method);

    // Connect wallet if not connected
    const provider = getProvider();
    if (!provider || !walletAddress) {
      const installed = availableWallets.filter(w => w.installed);
      if (installed.length === 0) {
        toast.error("No Solana wallet detected. Please install Phantom or Solflare.");
        return;
      }
      const addr = await connectWallet(installed[0].id);
      if (!addr) {
        toast.error("Wallet connection cancelled");
        return;
      }
      // Wait a tick for state to update, then retry
      setTimeout(() => handlePayWithWallet(method), 100);
      return;
    }

    await handlePayWithWallet(method);
  };

  const handlePayWithWallet = async (method: "sol" | "meeet") => {
    if (!selectedPlan) return;
    const provider = getProvider();
    if (!provider) {
      toast.error("Wallet not connected");
      return;
    }

    setActivating(true);
    setStep("paying");

    try {
      let txSignature: string;

      if (method === "sol") {
        const solPrice = SOL_PRICES[selectedPlan.name];
        if (!solPrice) throw new Error("No SOL price for this plan");
        toast.info("Confirm the transaction in your wallet...");
        txSignature = await sendSolToTreasury(provider, solPrice);
      } else {
        const meeetPrice = MEEET_PRICES[selectedPlan.name];
        if (!meeetPrice) throw new Error("No MEEET price for this plan");
        toast.info("Confirm the $MEEET transfer in your wallet...");
        txSignature = await sendMeeetToTreasury(provider, meeetPrice);
      }

      toast.success("Payment confirmed! Activating subscription...");

      // Verify on backend and create subscription
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: {
          plan_id: selectedPlan.id,
          payment_method: method,
          tx_signature: txSignature,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSubscriptionId(data?.subscription_id || null);
      setStep("configuring");
      toast.success("Subscription activated! Now configure your agent. 🎉");
    } catch (e: any) {
      const msg = e.message || "Payment failed";
      if (msg.includes("User rejected") || msg.includes("cancelled")) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error(msg);
      }
      setStep("choose");
    } finally {
      setActivating(false);
    }
  };

  const handleDeployAgent = async () => {
    if (!agentName.trim()) { toast.error("Please enter an agent name"); return; }
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("deploy-agent", {
        body: { subscription_id: subscriptionId, agent_name: agentName.trim(), agent_class: agentClass, strategy: agentStrategy },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Agent "${agentName}" deployed! 🚀`);
      setSelectedPlan(null);
      setStep("choose");
      setAgentName("");
    } catch (e: any) {
      toast.error(e.message || "Failed to deploy agent");
    } finally {
      setDeploying(false);
    }
  };

  const closeModal = () => {
    if (!activating && !deploying) {
      setSelectedPlan(null);
      setStep("choose");
      setPayMethod(null);
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
              {t("deploy.heroTitle") || "Deploy Your AI Agent"}
            </h1>
            <p className="text-2xl text-muted-foreground mb-2">{t("deploy.heroSubtitle") || "It earns $MEEET while you sleep 💤"}</p>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("deploy.heroDesc") || "Choose a plan → pay from your wallet → your agent starts working immediately."}
            </p>

            {/* Free Promo Banner */}
            {promoActive && (
              <div className="mt-8 inline-block">
                <div className="relative bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-emerald-600/20 border border-emerald-500/40 rounded-2xl px-8 py-5 backdrop-blur-sm">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white text-xs px-3 py-1 animate-pulse">🎁 PROMO</Badge>
                  </div>
                   <p className="text-lg font-bold text-emerald-400 mb-1">{t("deploy.freeFirst1000") || "First 1,000 agents — FREE!"}</p>
                   <p className="text-sm text-muted-foreground">{t("deploy.freeDesc") || "Deploy your Scout agent at no cost. Limited spots remaining."}</p>
                  <div className="mt-3 flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-400">{freeSlots}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">spots left</p>
                    </div>
                    <div className="w-px h-10 bg-emerald-500/30" />
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">{totalAgents}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">deployed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 pb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("deploy.chooseYourPlan") || "Choose Your Plan"}</h2>

          {loading ? (
            <div className="mb-16"><PlansSkeleton /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-16">
              {plans.map((plan) => {
                const badge = PLAN_BADGES[plan.name];
                const borderClass = PLAN_COLORS[plan.name] || "border-border hover:border-border/80";
                const features = Array.isArray(plan.features)
                  ? (plan.features as string[]).map((f: string) => FEATURE_LABELS[f] || f)
                  : Object.entries(plan.features || {}).filter(([_, v]) => v).map(([k]) => FEATURE_LABELS[k] || k);
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
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">◎ {SOL_PRICES[plan.name]}</span>
                              <span className="text-muted-foreground text-xs">SOL/mo</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-semibold text-emerald-400">🪙 {(MEEET_PRICES[plan.name] ?? 0).toLocaleString()}</span>
                              <span className="text-muted-foreground text-[10px]">MEEET</span>
                              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 ml-1">-20%</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{plan.max_agents === -1 ? "Unlimited" : plan.max_agents} agent{plan.max_agents !== 1 ? "s" : ""}</span></div>
                        <div className="flex items-center gap-1"><Zap className="w-3 h-3" /><span>{plan.quests_per_day === -1 ? "Unlimited" : plan.quests_per_day} quests/day</span></div>
                        <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /><span className="capitalize">{plan.compute_tier?.replace("_", " ") || "standard"} compute</span></div>
                      </div>
                      <ul className="space-y-1">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-green-400 shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      {isEnterprise ? (
                        <Button className="w-full" variant="outline" size="sm" onClick={() => window.location.href = "mailto:hello@meeet.world"}>Contact Us</Button>
                      ) : promoActive && plan.name === "Scout" ? (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => handleSelectPlan(plan)}>
                          🎁 Deploy FREE
                        </Button>
                      ) : (
                        <Button className="w-full" variant="default" size="sm" onClick={() => handleSelectPlan(plan)}>Get Started</Button>
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
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-yellow-400" />Estimated Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div><div className="text-3xl font-bold text-green-400">~1,000</div><div className="text-muted-foreground text-sm">MEEET/month (Scout)</div></div>
                <div><div className="text-3xl font-bold text-blue-400">~6,000</div><div className="text-muted-foreground text-sm">MEEET/month (Warrior)</div></div>
                <div><div className="text-3xl font-bold text-purple-400">Unlimited</div><div className="text-muted-foreground text-sm">MEEET/month (Commander+)</div></div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">* Estimates based on current platform activity. Not financial advice.</p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">FAQ</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <Card key={i} className="bg-card/50 cursor-pointer hover:border-purple-500/30 transition-all" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.q}</span>
                      {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                    {openFaq === i && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.a}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Unified Modal: Payment → Agent Config */}
      <Dialog open={!!selectedPlan} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          {selectedPlan && step === "choose" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">{selectedPlan.name} Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Free promo for Scout */}
                {promoActive && selectedPlan.name === "Scout" && !alreadyClaimed ? (
                  <>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                      <p className="text-lg font-bold text-emerald-400">🎁 FREE Deploy!</p>
                      <p className="text-sm text-muted-foreground mt-1">You're one of the first 1,000 agents — no payment needed.</p>
                      <p className="text-xs text-muted-foreground mt-2">{freeSlots} free spots remaining</p>
                    </div>
                    <Button
                      className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={activating}
                      onClick={async () => {
                        setActivating(true);
                        setStep("paying");
                        try {
                          const res = await supabase.functions.invoke("create-subscription", {
                            body: { plan_id: selectedPlan.id, payment_method: "free_promo", tx_signature: "promo_first_100" },
                          });
                          const data = res.data;
                          const fnError = res.error;
                          if (data?.error) {
                            if (data.error.includes("already") || data.error.includes("already have")) {
                              toast.error("You already have an agent. One agent per user.");
                              setAlreadyClaimed(true);
                              setExistingAgentName(data.agent_name || null);
                            } else {
                              toast.error(data.error);
                            }
                            setStep("choose");
                            return;
                          }
                          if (fnError) throw fnError;
                          setSubscriptionId(data?.subscription_id || null);
                          setStep("configuring");
                          toast.success("Free plan activated! Now configure your agent. 🎉");
                        } catch (e: any) {
                          const msg = e?.message || "Failed to activate free plan";
                          if (msg.includes("already")) {
                            toast.error("You already have an agent.");
                            setAlreadyClaimed(true);
                          } else {
                            toast.error(msg);
                          }
                          setStep("choose");
                        } finally {
                          setActivating(false);
                        }
                      }}
                    >
                      🚀 Activate Free Agent
                    </Button>
                  </>
                ) : alreadyClaimed ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                    <p className="text-lg font-bold text-yellow-400">⚠️ Agent Already Active</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You already have an agent{existingAgentName ? ` "${existingAgentName}"` : ""}. One agent per user.
                    </p>
                    <Button className="mt-3" variant="outline" size="sm" onClick={() => window.location.href = "/dashboard"}>
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">{selectedPlan.name}</Badge>
                      <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="text-lg font-bold">◎ {SOL_PRICES[selectedPlan.name]} SOL</span>
                        <span className="text-muted-foreground">or</span>
                        <span className="text-lg font-bold text-emerald-400">🪙 {(MEEET_PRICES[selectedPlan.name] ?? 0).toLocaleString()} MEEET</span>
                      </div>
                    </div>

                    {walletAddress && (
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                        <p className="text-xs text-muted-foreground text-center">Connected: <code className="text-foreground">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</code></p>
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <span className="font-medium">◎ {solBalance !== null ? solBalance.toFixed(4) : "..."} SOL</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="font-medium text-emerald-400">🪙 {meeetBalance !== null ? meeetBalance.toLocaleString() : "..."} MEEET</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button className="w-full h-14 text-base" variant="outline" disabled={activating} onClick={() => handlePay("sol")}>
                        <Wallet className="w-5 h-5 mr-2" />
                        Pay ◎ {SOL_PRICES[selectedPlan.name]} SOL
                      </Button>
                      <Button className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700 text-white" disabled={activating} onClick={() => handlePay("meeet")}>
                        🪙 Pay {(MEEET_PRICES[selectedPlan.name] ?? 0).toLocaleString()} MEEET
                        <Badge className="ml-2 text-xs bg-emerald-800 text-emerald-200">20% off</Badge>
                      </Button>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Payment is sent directly from your wallet and verified on-chain automatically.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {selectedPlan && step === "paying" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processing payment...</p>
              <p className="text-sm text-muted-foreground text-center">
                {payMethod === "sol" ? "Sending SOL" : "Sending $MEEET"} to treasury and verifying on-chain.
              </p>
              <p className="text-xs text-muted-foreground">Do not close this window.</p>
            </div>
          )}

          {selectedPlan && step === "configuring" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center flex items-center justify-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Configure Your Agent
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <p className="text-sm text-green-400 font-medium">✅ {selectedPlan.name} plan activated!</p>
                </div>
                <div>
                  <Label htmlFor="agent-name" className="text-sm">Agent Name</Label>
                  <Input id="agent-name" placeholder="e.g. Alpha_X" value={agentName} onChange={(e) => setAgentName(e.target.value)} maxLength={20} className="mt-1" />
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
                <Button className="w-full" disabled={!agentName.trim() || deploying} onClick={handleDeployAgent}>
                  {deploying ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deploying...</> : "🚀 Deploy Agent"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deploy;
