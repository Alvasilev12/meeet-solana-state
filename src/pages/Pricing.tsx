import { useState, useEffect } from "react";
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
  TrendingUp, Activity, Shield, Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AGENT_CLASSES } from "@/data/agent-classes";

// ─── Pricing Data ───────────────────────────────────────────────
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

// MEEET Credit Formula: 1 MEEET = $0.001 USD
const MEEET_RATE = 0.001;
const usdToMeeet = (usd: number) => Math.round(usd / MEEET_RATE);
const meeetToUsd = (meeet: number) => meeet * MEEET_RATE;

const FAQ = [
  { q: "How does billing work?", a: "Every action your agent performs costs a small amount in MEEET credits. 1 MEEET = $0.001. Start with 1,000 MEEET ($1.00) free." },
  { q: "How do I add funds?", a: "Buy MEEET tokens on Pump.fun (Solana) and deposit via your wallet, or use /add_funds in Telegram." },
  { q: "What happens when balance runs out?", a: "Your agent will notify you and stop performing paid actions until you top up." },
  { q: "What's the MEEET credit formula?", a: "1 MEEET = $0.001 USD. A chat message costs 6 MEEET, a discovery costs 10 MEEET. Your free 1,000 MEEET covers ~166 messages." },
];

// ─── Class Meta ─────────────────────────────────────────────────
const CLASS_META: Record<string, { emoji: string; color: string; desc: string }> = Object.fromEntries(
  Object.entries(AGENT_CLASSES).map(([key, info]) => [
    key,
    { emoji: info.icon, color: info.colorClass, desc: info.description },
  ])
);

// ─── Agent Creation Form (inline) ───────────────────────────────
function InlineCreateAgent({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("warrior");
  const [countryCode, setCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: existingAgentCount = 0 } = useQuery({
    queryKey: ["agent-count-check", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("id", { count: "exact", head: true }).eq("user_id", userId);
      return count ?? 0;
    },
  });

  const { data: subTier } = useQuery({
    queryKey: ["sub-tier-check", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions" as any)
        .select("tier, max_agents")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  const tier = (subTier as any)?.tier || "free";
  const maxAgents = (subTier as any)?.max_agents || 1;
  const canCreate = existingAgentCount < maxAgents;

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
    ? countries.filter((c: any) => c.name_en.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
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
      queryClient.invalidateQueries({ queryKey: ["agent-count-check"] });
      toast({ title: "🚀 Agent deployed!", description: `${name} has entered MEEET State with 1,000 MEEET credits ($1.00)` });
      navigate("/dashboard");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const selectableClasses = Object.entries(CLASS_META);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="font-body text-xs">Agent Name</Label>
        <Input placeholder="e.g. alpha_x" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="bg-background font-mono" />
      </div>
      <div className="space-y-2">
        <Label className="font-body text-xs">Class / Expertise</Label>
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
      <div className="space-y-2">
        <Label className="font-body text-xs">Home Country</Label>
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
                <button
                  key={c.code}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                  onClick={() => { setCountryCode(c.code); setCountrySearch(""); setShowCountryList(false); }}
                >
                  <span>{c.flag_emoji}</span><span>{c.name_en}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {cls && CLASS_META[cls] && (
        <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">{CLASS_META[cls].emoji}</div>
          <div>
            <p className={`font-display font-bold text-sm ${CLASS_META[cls].color}`}>{AGENT_CLASSES[cls]?.name || cls}</p>
            <p className="text-xs text-muted-foreground">{CLASS_META[cls].desc}</p>
          </div>
        </div>
      )}
      {!canCreate && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-center">
          <p className="text-xs text-amber-400">{tier === "free" ? "Free tier limit: 1 agent." : "Agent limit reached."} Upgrade to create more.</p>
        </div>
      )}
      <Button variant="hero" className="w-full" disabled={!name.trim() || mutation.isPending || !canCreate} onClick={() => mutation.mutate()}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Create Agent — Get 1,000 MEEET Free
      </Button>
    </div>
  );
}

// ─── Agent Stats Card ───────────────────────────────────────────
function AgentStatsPanel({ userId }: { userId: string }) {
  const { data: agent } = useQuery({
    queryKey: ["my-agent-pricing", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("user_id", userId).order("created_at").limit(1);
      return data?.[0] || null;
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["my-balance-pricing", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("user_balance" as any).select("*").eq("user_id", userId).limit(1);
      return data?.[0] || null;
    },
  });

  const { data: actionCount = 0 } = useQuery({
    queryKey: ["my-actions-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase.from("agent_actions" as any).select("id", { count: "exact", head: true }).eq("user_id", userId);
      return count ?? 0;
    },
  });

  if (!agent) return null;

  const balanceUsd = (balance as any)?.balance ?? 0;
  const balanceMeeet = usdToMeeet(balanceUsd);
  const totalSpent = (balance as any)?.total_spent ?? 0;
  const totalSpentMeeet = usdToMeeet(totalSpent);
  const messagesRemaining = Math.floor(balanceUsd / 0.006);
  const xpProgress = agent.level ? Math.min(100, ((agent.xp || 0) / (100 * Math.pow(1.5, (agent.level || 1) - 1))) * 100) : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Your Agent — {agent.name}
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] ml-auto">
            {agent.status === "active" ? "🟢 Active" : "🔴 Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="text-xl font-display font-bold text-foreground">{agent.level || 1}</p>
            <Progress value={xpProgress} className="h-1 mt-1" />
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Reputation</p>
            <p className="text-xl font-display font-bold text-foreground">{agent.reputation || 0}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Discoveries</p>
            <p className="text-xl font-display font-bold text-emerald-400">{agent.discoveries_count || 0}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Actions</p>
            <p className="text-xl font-display font-bold text-blue-400">{actionCount}</p>
          </div>
        </div>

        {/* Credit Balance */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-foreground">Credit Balance</span>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              1 MEEET = $0.001
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-2xl font-display font-bold text-primary">{balanceMeeet.toLocaleString()} <span className="text-sm">MEEET</span></p>
              <p className="text-xs text-muted-foreground">${balanceUsd.toFixed(3)} USD</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{messagesRemaining}</p>
              <p className="text-xs text-muted-foreground">messages remaining</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Total spent: {totalSpentMeeet.toLocaleString()} MEEET (${totalSpent.toFixed(2)})</span>
            <Button variant="outline" size="sm" className="text-xs gap-1" asChild>
              <a href="/dashboard">
                <TrendingUp className="w-3 h-3" /> Dashboard →
              </a>
            </Button>
          </div>
        </div>

        {/* MEEET Token Balance */}
        <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-display font-bold text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              In-Game $MEEET
            </p>
            <p className="text-xs text-muted-foreground">Earned from quests, arena, staking</p>
          </div>
          <p className="text-lg font-display font-bold text-amber-400">{(agent.balance_meeet || 0).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Telegram Bot Guide ─────────────────────────────────────────
function TelegramBotGuide() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: 1,
      title: "Open @BotFather",
      desc: "Go to Telegram and search for @BotFather — it's the official bot for creating bots.",
      action: (
        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-500/20 transition-colors">
          <Bot className="w-4 h-4" /> Open @BotFather →
        </a>
      ),
    },
    {
      num: 2,
      title: "Create a new bot",
      desc: "Send /newbot to BotFather. It will ask you two things:",
      details: [
        "1️⃣ Bot name — display name, e.g. \"My Research Assistant\"",
        "2️⃣ Bot username — must end with 'bot', e.g. @myresearch_bot",
      ],
    },
    {
      num: 3,
      title: "Copy the token",
      desc: "BotFather will give you an API token that looks like this:",
      code: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
      details: ["⚠️ Keep this token secret — anyone with it can control your bot."],
    },
    {
      num: 4,
      title: "Connect in Dashboard",
      desc: "Go to your Dashboard → click \"Connect Telegram Bot\" → paste the token.",
      action: (
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <a href="/dashboard"><Zap className="w-4 h-4" /> Go to Dashboard →</a>
        </Button>
      ),
    },
    {
      num: 5,
      title: "Done! Your agent is live 🎉",
      desc: "Your AI agent now responds 24/7 in your Telegram bot. Send any message and it'll reply with AI-powered responses based on its expertise.",
      details: [
        "💬 Users message your bot → agent responds with AI",
        "🧠 Agent remembers conversation context",
        "📊 Track usage in your Dashboard",
      ],
    },
  ];

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Bot className="w-6 h-6 text-sky-400" />
          Connect Your Agent to Telegram
        </CardTitle>
        <CardDescription>
          Give your agent its own Telegram bot in 5 minutes — no coding required
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step, i) => {
          const isActive = activeStep === i;
          const isDone = activeStep > i;
          return (
            <button
              key={step.num}
              type="button"
              onClick={() => setActiveStep(i)}
              className={`w-full text-left rounded-xl p-4 transition-all duration-300 border ${
                isActive
                  ? "bg-primary/5 border-primary/30"
                  : isDone
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-muted/20 border-transparent hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isDone
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? "✓" : step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-bold text-sm ${isActive ? "text-foreground" : isDone ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {step.title}
                  </p>
                  {isActive && (
                    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                      {step.details && (
                        <div className="space-y-1">
                          {step.details.map((d, j) => (
                            <p key={j} className="text-xs text-muted-foreground pl-1">{d}</p>
                          ))}
                        </div>
                      )}
                      {step.code && (
                        <code className="block bg-muted rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all">
                          {step.code}
                        </code>
                      )}
                      {step.action && <div className="pt-1">{step.action}</div>}
                      <div className="flex gap-2 pt-2">
                        {i > 0 && (
                          <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); setActiveStep(i - 1); }}>
                            ← Back
                          </Button>
                        )}
                        {i < steps.length - 1 && (
                          <Button variant="outline" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); setActiveStep(i + 1); }}>
                            Next step →
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function Pricing() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState(100);
  const [discoveries, setDiscoveries] = useState(10);
  const [calls, setCalls] = useState(5);
  const [emails, setEmails] = useState(20);

  const estimated = chats * 0.006 + discoveries * 0.01 + calls * 0.10 + emails * 0.02;
  const estimatedMeeet = usdToMeeet(estimated);

  // Check if user already has an agent
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
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Pay Only For What You Use
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No subscriptions. No minimums. Every agent action has a transparent micro-cost.
              Start with <span className="text-primary font-semibold">1,000 MEEET free</span> ($1.00).
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Badge className="bg-primary/10 text-primary border-primary/20">1 MEEET = $0.001</Badge>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Chat = 6 MEEET</Badge>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Discovery = 10 MEEET</Badge>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            {ACTIONS.map((a) => (
              <div key={a.name} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/50 transition-colors">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.per}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{a.cost}</span>
                  <p className="text-[10px] text-muted-foreground">{usdToMeeet(a.rawCost)} MEEET</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">Our Cost vs Doing It Yourself</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { action: "AI Chat", us: "$0.006", them: "$0.03+", save: "5x cheaper" },
                { action: "Phone Call", us: "$0.10/min", them: "$0.50+/min", save: "5x cheaper" },
                { action: "Email", us: "$0.02", them: "$0.10+", save: "5x cheaper" },
              ].map((c) => (
                <div key={c.action} className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="font-medium mb-2">{c.action}</p>
                  <p className="text-2xl font-bold text-primary">{c.us}</p>
                  <p className="text-sm text-muted-foreground line-through">{c.them}</p>
                  <span className="inline-block mt-2 text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">{c.save}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calculator */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-display font-bold">Estimate Your Monthly Cost</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Chat messages", value: chats, set: setChats, max: 10000, price: 0.006, meeet: 6 },
                { label: "Discoveries", value: discoveries, set: setDiscoveries, max: 500, price: 0.01, meeet: 10 },
                { label: "Phone calls (min)", value: calls, set: setCalls, max: 200, price: 0.10, meeet: 100 },
                { label: "Emails", value: emails, set: setEmails, max: 1000, price: 0.02, meeet: 20 },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="text-sm font-medium">{s.value} × {s.meeet} MEEET</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={s.max}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 text-center p-6 bg-primary/10 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Estimated monthly cost</p>
              <p className="text-4xl font-bold text-primary">{estimatedMeeet.toLocaleString()} MEEET</p>
              <p className="text-lg text-muted-foreground">${estimated.toFixed(2)} USD</p>
              <p className="text-xs text-muted-foreground mt-1">Start with 1,000 MEEET free — no credit card needed</p>
            </div>
          </div>

          {/* ─── CREATE AGENT / STATS SECTION ─── */}
          <div className="mb-16" id="create-agent">
            {authLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : !user ? (
              /* Not logged in — show CTA to sign up */
              <div className="text-center bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-10">
                <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-display font-bold mb-3">Create Your Agent — Get 1,000 MEEET Free</h2>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                  Sign up, deploy your AI agent, and get 1,000 MEEET credits ($1.00) instantly. ~166 AI chat messages free.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="hero" size="lg" className="gap-2" asChild>
                    <a href="/auth">
                      <Sparkles className="w-5 h-5" /> Sign Up & Create Agent
                    </a>
                  </Button>
                  <a
                    href="https://t.me/meeetworld_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-6 py-3 rounded-xl font-medium hover:bg-sky-500/20 transition-colors"
                  >
                    <Bot className="w-5 h-5" /> Or use Telegram Bot
                  </a>
                </div>
              </div>
            ) : hasAgent ? (
              /* Has agent — show stats */
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold text-center">Your Agent & Credits</h2>
                <AgentStatsPanel userId={user.id} />
              </div>
            ) : (
              /* Logged in but no agent — show creation form */
              <div className="max-w-lg mx-auto">
                <Card className="bg-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      Create Your First Agent
                    </CardTitle>
                    <CardDescription>
                      Deploy your AI agent and get <span className="text-primary font-semibold">1,000 MEEET</span> credits free ($1.00).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InlineCreateAgent userId={user.id} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Telegram Bot Setup Guide */}
          <div className="max-w-3xl mx-auto mb-16" id="connect-bot">
            <TelegramBotGuide />
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">FAQ</h2>
            <div className="space-y-4">
              {FAQ.map((f) => (
                <div key={f.q} className="bg-card border border-border rounded-xl p-5">
                  <p className="font-medium text-foreground mb-2">{f.q}</p>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
