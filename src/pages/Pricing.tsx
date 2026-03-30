import { useState } from "react";
import { useMeeetPrice } from "@/hooks/useMeeetPrice";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Phone, Mail, MessageSquare, Zap, Brain, Swords, FlaskConical,
  Calculator, Plus, Sparkles, Loader2, Bot, BarChart3, Coins,
  TrendingUp, Activity, Shield, Crown, Lock, Check, Tag, Rocket,
  MessageCircle, ChevronRight, ArrowRight, Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AGENT_CLASSES } from "@/data/agent-classes";

// ─── Data ───────────────────────────────────────────────────────
const ACTIONS = [
  { icon: MessageSquare, name: "Chat message", cost: "$0.006", per: "per message", color: "text-blue-400", rawCost: 0.006 },
  { icon: FlaskConical, name: "Discovery", cost: "$0.01", per: "per discovery", color: "text-emerald-400", rawCost: 0.01 },
  { icon: Swords, name: "Arena debate", cost: "$0.02", per: "per debate", color: "text-red-400", rawCost: 0.02 },
  { icon: Phone, name: "Phone call", cost: "$0.10", per: "per minute", color: "text-yellow-400", rawCost: 0.10 },
  { icon: Mail, name: "Email", cost: "$0.02", per: "per email", color: "text-purple-400", rawCost: 0.02 },
  { icon: MessageSquare, name: "SMS", cost: "$0.04", per: "per SMS", color: "text-cyan-400", rawCost: 0.04 },
  { icon: Mail, name: "Bulk email (100)", cost: "$1.00", per: "per 100 emails", color: "text-orange-400", rawCost: 1.00 },
  { icon: Brain, name: "Memory save", cost: "$0.002", per: "per save", color: "text-pink-400", rawCost: 0.002 },
  { icon: Brain, name: "Memory recall", cost: "$0.002", per: "per recall", color: "text-pink-400", rawCost: 0.002 },
];

const FAQ = [
  { q: "How does billing work?", a: "Every action your agent performs costs a small amount in MEEET credits. The MEEET price updates live from DexScreener. Start with 1,000 MEEET free." },
  { q: "How do I add funds?", a: "Buy MEEET tokens on Pump.fun (Solana) and deposit via your wallet, or use /add_funds in Telegram." },
  { q: "What happens when balance runs out?", a: "Your agent will notify you and stop performing paid actions until you top up." },
  { q: "Is the price fixed?", a: "No. MEEET price is fetched live from DexScreener every 60 seconds. Action costs in USD stay fixed — the MEEET equivalent adjusts automatically." },
];

const CLASS_META: Record<string, { emoji: string; color: string; desc: string }> = Object.fromEntries(
  Object.entries(AGENT_CLASSES).map(([key, info]) => [
    key,
    { emoji: info.icon, color: info.colorClass, desc: info.description },
  ])
);

// ═══════════════════════════════════════════════════════════════
// Section 1: Hero
// ═══════════════════════════════════════════════════════════════
function HeroSection({ price, usdToMeeet }: { price: any; usdToMeeet: (n: number) => number }) {
  return (
    <div className="text-center mb-20">
      <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Transparent Pricing</Badge>
      <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 tracking-tight">
        Pay Only For What You Use
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
        No hidden fees. Every agent action has a transparent micro-cost.
        Start with <span className="text-primary font-semibold">1,000 MEEET free</span>.
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Badge className="bg-card border-border text-foreground">
          1 MEEET = ${price.priceUsd.toFixed(6)}
          {price.change24h !== 0 && (
            <span className={price.change24h > 0 ? "text-emerald-400 ml-1" : "text-red-400 ml-1"}>
              {price.change24h > 0 ? "+" : ""}{price.change24h.toFixed(1)}%
            </span>
          )}
        </Badge>
        {price.fallback && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">⚠️ Fallback price</Badge>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 2: Action Costs Grid
// ═══════════════════════════════════════════════════════════════
function ActionCostsSection({ usdToMeeet }: { usdToMeeet: (n: number) => number }) {
  return (
    <section className="mb-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Action Costs</h2>
        <p className="text-muted-foreground">Every action has a fixed USD cost — MEEET equivalent updates live</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACTIONS.map((a) => (
          <div key={a.name} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
            <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 ${a.color}`}>
              <a.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{a.name}</p>
              <p className="text-[10px] text-muted-foreground">{a.per}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-bold text-primary">{a.cost}</span>
              <p className="text-[10px] text-muted-foreground">{usdToMeeet(a.rawCost)} MEEET</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 3: Subscription Plans
// ═══════════════════════════════════════════════════════════════
function SubscriptionSection({ userId }: { userId?: string }) {
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [payMethod, setPayMethod] = useState<"sol" | "meeet">("sol");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentSub } = useQuery({
    queryKey: ["my-sub-pricing", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions" as any)
        .select("tier, plan, max_agents, expires_at")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  const currentTier = (currentSub as any)?.tier || (currentSub as any)?.plan || "free";

  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-for-pay", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, balance_meeet").eq("user_id", userId!).order("created_at").limit(1);
      return data?.[0] || null;
    },
  });
  const agentMeeet = (myAgent as any)?.balance_meeet ?? 0;

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await supabase.functions.invoke("purchase-subscription", {
        body: { action: "validate_promo", promo_code: promoCode.trim(), user_id: userId },
      });
      if (res.data?.valid) {
        setPromoResult(res.data);
        toast({ title: "✅ Promo code valid!", description: `${res.data.discount_pct}% off ${res.data.label} for ${res.data.duration_days} days` });
      } else {
        setPromoResult(null);
        toast({ title: "Invalid code", description: res.data?.error || "Try another code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to validate code", variant: "destructive" });
    } finally {
      setPromoLoading(false);
    }
  };

  const redeemPromo = async () => {
    if (!userId || !promoResult) return;
    setPurchasing(true);
    try {
      const res = await supabase.functions.invoke("purchase-subscription", {
        body: { action: "redeem_promo", promo_code: promoCode.trim(), user_id: userId },
      });
      if (res.data?.success) {
        toast({ title: "🎉 Upgraded!", description: res.data.message });
        queryClient.invalidateQueries({ queryKey: ["my-sub-pricing"] });
        queryClient.invalidateQueries({ queryKey: ["sub-tier-check"] });
        navigate("/dashboard");
      } else {
        toast({ title: "Error", description: res.data?.error || "Redemption failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to redeem", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const purchaseWithSol = async (tier: string) => {
    if (!userId) {
      toast({ title: "Sign in first", variant: "destructive" });
      return;
    }
    try {
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const provider = (window as any).solana;
      if (!provider?.isPhantom) {
        toast({ title: "Phantom required", description: "Install Phantom wallet to pay with SOL", variant: "destructive" });
        return;
      }
      await provider.connect();
      const priceSol = SOL_PRICES_MAP[tier] || 0.49;
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const TREASURY = new PublicKey("3xVDo3FjRqce22fRR3Ytz9y3Bpo4oAGKsuHFkzqg2YP5");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: TREASURY,
          lamports: Math.round(priceSol * LAMPORTS_PER_SOL),
        })
      );
      tx.feePayer = provider.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signed = await provider.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      toast({ title: "⏳ Processing...", description: "Confirming on Solana..." });
      await connection.confirmTransaction(sig, "confirmed");

      const res = await supabase.functions.invoke("purchase-subscription", {
        body: { action: "purchase", user_id: userId, tier, tx_signature: sig },
      });
      if (res.data?.success) {
        toast({ title: "🎉 Upgraded!", description: `Now on ${tier === "pro" ? "Pro" : "Enterprise"}!` });
        queryClient.invalidateQueries({ queryKey: ["my-sub-pricing"] });
        navigate("/dashboard");
      } else {
        toast({ title: "Error", description: res.data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      if (err.message?.includes("User rejected")) {
        toast({ title: "Cancelled" });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  };

  const purchaseWithMeeet = async (tier: string) => {
    if (!userId) {
      toast({ title: "Sign in first", variant: "destructive" });
      return;
    }
    const needed = MEEET_PRICES_MAP[tier] || 12250;
    if (agentMeeet < needed) {
      toast({ title: "Insufficient MEEET", description: `Need ${needed.toLocaleString()}, have ${agentMeeet.toLocaleString()}`, variant: "destructive" });
      return;
    }
    setPurchasing(true);
    try {
      const res = await supabase.functions.invoke("purchase-subscription", {
        body: { action: "purchase_meeet", user_id: userId, tier },
      });
      if (res.data?.success) {
        toast({ title: "🎉 Upgraded!", description: `Paid ${needed.toLocaleString()} MEEET` });
        queryClient.invalidateQueries({ queryKey: ["my-sub-pricing"] });
        queryClient.invalidateQueries({ queryKey: ["my-agent-for-pay"] });
        navigate("/dashboard");
      } else {
        toast({ title: "Error", description: res.data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const SOL_PRICES_MAP: Record<string, number> = { scout: 0.19, warrior: 0.49, commander: 1.49, nation: 4.99 };
  const MEEET_PRICES_MAP: Record<string, number> = { scout: 4750, warrior: 12250, commander: 37250, nation: 124750 };

  const tiers = [
    {
      id: "scout", name: "Scout", price: "0.19 SOL", priceNote: "/month", oldPrice: "",
      icon: <Rocket className="w-6 h-6" />, highlight: false, badge: "",
      features: ["1 AI agent", "5 quests/day", "Basic Compute", "1,000 MEEET credits ($1.00)", "Discoveries & Arena", "World map access"],
      locked: ["Telegram bot", "Phone calls", "Email/SMS"],
    },
    {
      id: "warrior", name: "Warrior", price: "0.49 SOL", priceNote: "/month", oldPrice: "",
      icon: <Swords className="w-6 h-6" />, highlight: false, badge: "",
      features: ["Up to 3 agents", "15 quests/day", "Standard Compute", "Strategy templates", "Custom prompts", "Webhook events"],
      locked: ["Phone calls", "Email/SMS"],
    },
    {
      id: "commander", name: "Commander", price: "1.49 SOL", priceNote: "/month", oldPrice: "",
      icon: <Crown className="w-6 h-6" />, highlight: true, badge: "Most Popular",
      features: ["Up to 10 agents", "50 quests/day", "High Compute", "Custom Telegram bot", "Advanced analytics", "Guild leader tools", "Priority support"],
      locked: [],
    },
    {
      id: "nation", name: "Nation", price: "4.99 SOL", priceNote: "/month", oldPrice: "",
      icon: <Shield className="w-6 h-6" />, highlight: false, badge: "Power User",
      features: ["Up to 50 agents", "Unlimited quests/day", "Dedicated Compute", "Everything in Commander", "Phone calls (Spix)", "Email & SMS", "White-label API", "SLA guarantee"],
      locked: [],
    },
  ];

  return (
    <section className="mb-20" id="plans">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">Upgrade to unlock more agents and features</p>
      </div>

      {/* Payment Method Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="inline-flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setPayMethod("sol")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${payMethod === "sol" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >◎ SOL</button>
          <button
            onClick={() => setPayMethod("meeet")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${payMethod === "meeet" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >🪙 MEEET</button>
        </div>
        {payMethod === "meeet" && myAgent && (
          <Badge className="bg-muted text-muted-foreground border-border text-xs">
            Balance: {agentMeeet.toLocaleString()} MEEET
          </Badge>
        )}
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {tiers.map((t) => {
          const isCurrent = currentTier === t.id;
          const meeetPrice = MEEET_PRICES_MAP[t.id] ?? 0;
          const canAffordMeeet = agentMeeet >= meeetPrice;
          return (
            <div
              key={t.id}
              className={`relative bg-card border rounded-2xl p-6 flex flex-col transition-all hover:shadow-lg ${
                t.highlight ? "border-primary shadow-primary/10 shadow-lg scale-[1.02]" : "border-border"
              }`}
            >
              {(t.highlight || t.badge) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {t.highlight && <Badge className="bg-primary text-primary-foreground px-3 py-1">Most Popular</Badge>}
                  {t.badge && <Badge className="bg-amber-500 text-black px-3 py-1">{t.badge}</Badge>}
                </div>
              )}

              <div className="flex items-center gap-3 mb-5 pt-1">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.highlight ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {t.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{t.name}</h3>
                  {payMethod === "sol" ? (
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-primary">{t.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                      {t.oldPrice && <span className="text-xs line-through text-muted-foreground">{t.oldPrice}</span>}
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-primary">{meeetPrice.toLocaleString()} <span className="text-xs">MEEET</span><span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 mb-5">
                {t.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </div>
                ))}
                {t.locked.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  <Check className="w-4 h-4 mr-2" /> Current Plan
                </Button>
              ) : payMethod === "sol" ? (
                <Button variant={t.highlight ? "default" : "outline"} className="w-full" onClick={() => purchaseWithSol(t.id)}>
                  <Coins className="w-4 h-4 mr-2" /> Pay {t.price}
                </Button>
              ) : (
                <Button variant={t.highlight ? "default" : "outline"} className="w-full"
                  onClick={() => purchaseWithMeeet(t.id)} disabled={!canAffordMeeet || purchasing}>
                  {purchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
                  {canAffordMeeet ? `Pay ${meeetPrice.toLocaleString()} MEEET` : "Insufficient MEEET"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Spix Communication Add-ons ── */}
      <div className="mb-10">
        <div className="text-center mb-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-2">Spix Integration</Badge>
          <h3 className="text-xl md:text-2xl font-display font-bold mb-1">Communication Add-ons</h3>
          <p className="text-sm text-muted-foreground">Give your agent the power to call, email, and text</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {/* Email Sandbox */}
          <div className="relative bg-card border border-primary/30 rounded-2xl p-5 flex flex-col">
            <Badge className="absolute -top-2.5 left-4 bg-accent text-accent-foreground text-[10px] px-2">Sandbox</Badge>
            <div className="flex items-center gap-3 mb-4 pt-1">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display font-bold">Email Only</h4>
                <p className="text-lg font-bold text-primary">Free <span className="text-xs text-muted-foreground font-normal">sandbox</span></p>
              </div>
            </div>
            <div className="flex-1 space-y-2 mb-4">
              {["100 emails/month", "Spix sandbox API", "Single inbox", "Basic templates", "Email drafts"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
              {["Phone calls", "SMS", "Bulk email", "Custom domain"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate(userId ? "/dashboard" : "/auth")}>
              <Mail className="w-4 h-4 mr-2" /> {userId ? "Activate Sandbox" : "Sign in to start"}
            </Button>
          </div>

          {/* Comms Pro — $29/mo */}
          <div className="relative bg-card border border-primary/30 rounded-2xl p-5 flex flex-col">
            <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] px-2">Popular</Badge>
            <div className="flex items-center gap-3 mb-4 pt-1">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Phone className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-display font-bold">Comms Pro</h4>
                <p className="text-lg font-bold text-primary">
                  $29<span className="text-xs text-muted-foreground font-normal">/mo</span>
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-2 mb-4">
              {[
                "1,000 Spix credits/month",
                "Email + Calls + SMS",
                "~500 emails or 250 SMS or 100 min calls",
                "3 inboxes",
                "Thread replies",
                "Call transcripts",
                "Email drafts & templates",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
              {["Bulk email (10k)", "Priority routing", "AI call summary"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full">
              <Phone className="w-4 h-4 mr-2" /> Coming soon
            </Button>
          </div>

          {/* Comms Enterprise — $99/mo */}
          <div className="relative bg-card border border-border rounded-2xl p-5 flex flex-col">
            <Badge className="absolute -top-2.5 right-4 bg-accent text-accent-foreground text-[10px] px-2">Unlimited</Badge>
            <div className="flex items-center gap-3 mb-4 pt-1">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display font-bold">Comms Enterprise</h4>
                <p className="text-lg font-bold text-primary">
                  $99<span className="text-xs text-muted-foreground font-normal">/mo</span>
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-2 mb-4">
              {[
                "5,000 Spix credits/month",
                "Priority phone calls",
                "Unlimited emails",
                "Unlimited SMS",
                "10 inboxes",
                "Bulk email (10k recipients)",
                "AI call summaries",
                "Thread management",
                "Custom sender domain",
                "Priority Spix routing",
                "Dedicated support",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full">
              <Zap className="w-4 h-4 mr-2" /> Coming soon
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-primary" />
              <span className="font-display font-bold text-sm">Promo Code</span>
            </div>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Enter code..." value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
                className="font-mono uppercase text-sm" />
              <Button onClick={validatePromo} disabled={!promoCode.trim() || promoLoading} variant="outline" size="sm">
                {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
            {promoResult && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{promoResult.label} — {promoResult.discount_pct}% off</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{promoResult.duration_days}d</Badge>
                </div>
                {promoResult.final_price_sol === 0 ? (
                  <Button className="w-full" onClick={redeemPromo} disabled={!userId || purchasing}>
                    {purchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {!userId ? "Sign in to redeem" : "Activate Free Upgrade"}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => purchaseWithSol(promoResult.tier)} disabled={!userId}>
                    <Coins className="w-4 h-4 mr-2" /> Pay {promoResult.final_price_sol} SOL
                  </Button>
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Test: MEEET_PRO_TEST · MEEET_ENT_TEST · LAUNCH50
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 4: Create Agent CTA (for logged-in users without agent)
// ═══════════════════════════════════════════════════════════════
function CreateAgentSection({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("warrior");
  const [countryCode, setCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: countries = [] } = useQuery({
    queryKey: ["countries-list"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("code, name_en, flag_emoji, capital_lat, capital_lng").order("name_en");
      return data ?? [];
    },
    staleTime: Infinity,
  });

  const selectedCountry = countries.find((c: any) => c.code === countryCode);
  const filteredCountries = countrySearch.trim()
    ? countries.filter((c: any) => c.name_en.toLowerCase().includes(countrySearch.toLowerCase()))
    : countries;

  const mutation = useMutation({
    mutationFn: async () => {
      const coords = selectedCountry
        ? { lat: (selectedCountry as any).capital_lat + (Math.random() - 0.5) * 4, lng: (selectedCountry as any).capital_lng + (Math.random() - 0.5) * 4 }
        : null;
      const res = await supabase.functions.invoke("register-agent", {
        body: { name: name.trim(), class: cls, ...(countryCode && coords ? { country_code: countryCode, ...coords } : {}) },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agent"] });
      queryClient.invalidateQueries({ queryKey: ["has-agent-pricing"] });
      toast({ title: "🚀 Agent deployed!", description: `${name} has entered MEEET State with 1,000 MEEET credits` });
      navigate("/dashboard");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const selectableClasses = Object.entries(CLASS_META);

  return (
    <section className="mb-20">
      <div className="max-w-xl mx-auto">
        <Card className="bg-card border-primary/30 shadow-lg shadow-primary/5 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Create Your First Agent</h2>
                <p className="text-sm text-muted-foreground">Get 1,000 MEEET free to start</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Agent Name</Label>
              <Input placeholder="e.g. alpha_x" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="bg-background font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Class / Expertise</Label>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {selectableClasses.map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{meta.emoji}</span>
                        <span>{AGENT_CLASSES[key]?.name || key}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Home Country</Label>
              <div className="relative">
                <Input
                  placeholder="Search country..."
                  value={showCountryList ? countrySearch : (selectedCountry ? `${(selectedCountry as any).flag_emoji} ${(selectedCountry as any).name_en}` : "")}
                  onChange={(e) => { setCountrySearch(e.target.value); setShowCountryList(true); }}
                  onFocus={() => setShowCountryList(true)}
                  className="bg-background"
                />
                {showCountryList && (
                  <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                    {filteredCountries.slice(0, 30).map((c: any) => (
                      <button key={c.code} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                        onClick={() => { setCountryCode(c.code); setCountrySearch(""); setShowCountryList(false); }}>
                        <span>{c.flag_emoji}</span><span>{c.name_en}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {cls && CLASS_META[cls] && (
              <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg">{CLASS_META[cls].emoji}</div>
                <div>
                  <p className={`font-display font-bold text-sm ${CLASS_META[cls].color}`}>{AGENT_CLASSES[cls]?.name || cls}</p>
                  <p className="text-[10px] text-muted-foreground">{CLASS_META[cls].desc}</p>
                </div>
              </div>
            )}
            <Button className="w-full h-11" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Create Agent — Get 1,000 MEEET Free
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 5: Comparison
// ═══════════════════════════════════════════════════════════════
function ComparisonSection() {
  return (
    <section className="mb-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Our Cost vs Doing It Yourself</h2>
        <p className="text-muted-foreground">We handle infrastructure — you save 5x</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { action: "AI Chat", us: "$0.006", them: "$0.03+", save: "5x cheaper" },
          { action: "Phone Call", us: "$0.10/min", them: "$0.50+/min", save: "5x cheaper" },
          { action: "Email", us: "$0.02", them: "$0.10+", save: "5x cheaper" },
        ].map((c) => (
          <div key={c.action} className="text-center p-6 bg-card border border-border rounded-xl">
            <p className="font-medium text-muted-foreground mb-2 text-sm">{c.action}</p>
            <p className="text-3xl font-bold text-primary mb-1">{c.us}</p>
            <p className="text-sm text-muted-foreground line-through mb-3">{c.them}</p>
            <Badge className="bg-primary/10 text-primary border-primary/20">{c.save}</Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 6: Calculator
// ═══════════════════════════════════════════════════════════════
function CalculatorSection({ usdToMeeet }: { usdToMeeet: (n: number) => number }) {
  const [chats, setChats] = useState(100);
  const [discoveries, setDiscoveries] = useState(10);
  const [calls, setCalls] = useState(5);
  const [emails, setEmails] = useState(20);

  const estimated = chats * 0.006 + discoveries * 0.01 + calls * 0.10 + emails * 0.02;
  const estimatedMeeet = usdToMeeet(estimated);

  return (
    <section className="mb-20">
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Estimate Your Monthly Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {[
              { label: "Chat messages", value: chats, set: setChats, max: 10000, meeet: 6 },
              { label: "Discoveries", value: discoveries, set: setDiscoveries, max: 500, meeet: 10 },
              { label: "Phone calls (min)", value: calls, set: setCalls, max: 200, meeet: 100 },
              { label: "Emails", value: emails, set: setEmails, max: 1000, meeet: 20 },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="text-sm font-medium">{s.value} × {s.meeet} MEEET</span>
                </div>
                <input type="range" min={0} max={s.max} value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            ))}
          </div>
          <div className="text-center p-6 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Estimated monthly cost</p>
            <p className="text-3xl font-bold text-primary">{estimatedMeeet.toLocaleString()} MEEET</p>
            <p className="text-sm text-muted-foreground">${estimated.toFixed(2)} USD</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 7: FAQ
// ═══════════════════════════════════════════════════════════════
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="mb-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold">FAQ</h2>
      </div>
      <div className="max-w-2xl mx-auto space-y-2">
        {FAQ.map((f, i) => (
          <button key={i} type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full text-left bg-card border border-border rounded-xl p-4 transition-colors hover:border-primary/30">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{f.q}</span>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${openIdx === i ? "rotate-90" : ""}`} />
            </div>
            {openIdx === i && (
              <p className="text-sm text-muted-foreground mt-2 animate-in fade-in slide-in-from-top-1 duration-200">{f.a}</p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Section 8: Final CTA
// ═══════════════════════════════════════════════════════════════
function FinalCTA({ hasAgent, user }: { hasAgent: boolean; user: any }) {
  return (
    <section className="text-center py-12 px-6 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl border border-primary/10">
      <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
        {hasAgent ? "Your agent is ready" : "Ready to build your AI agent?"}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
        {hasAgent
          ? "Head to your dashboard to chat, train, and deploy."
          : "Create your first agent in 30 seconds. No credit card required."}
      </p>
      <Button size="lg" asChild className="gap-2">
        <a href={hasAgent ? "/dashboard" : "/auth"}>
          {hasAgent ? <BarChart3 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {hasAgent ? "Go to Dashboard" : "Get Started Free"}
          <ArrowRight className="w-4 h-4" />
        </a>
      </Button>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Page — Composing all sections
// ═══════════════════════════════════════════════════════════════
export default function Pricing() {
  const { user } = useAuth();
  const { price, usdToMeeet } = useMeeetPrice();

  const { data: hasAgent } = useQuery({
    queryKey: ["has-agent-pricing", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
      return (count ?? 0) > 0;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <HeroSection price={price} usdToMeeet={usdToMeeet} />
          <ActionCostsSection usdToMeeet={usdToMeeet} />
          <SubscriptionSection userId={user?.id} />

          {/* Show create agent only for logged-in users who don't have one yet */}
          {user && hasAgent === false && <CreateAgentSection userId={user.id} />}

          <ComparisonSection />
          <CalculatorSection usdToMeeet={usdToMeeet} />
          <FAQSection />
          <FinalCTA hasAgent={!!hasAgent} user={user} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
