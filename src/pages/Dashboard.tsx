import { useState, useEffect } from "react";
import AgentChat from "@/components/AgentChat";
import ConnectWallet from "@/components/ConnectWallet";
import ClaimTokens from "@/components/ClaimTokens";
import DepositTokens from "@/components/DepositTokens";
import TreasuryDeposit from "@/components/TreasuryDeposit";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import PresidentInbox from "@/components/PresidentInbox";
import Footer from "@/components/Footer";
import ApiKeyManager from "@/components/ApiKeyManager";
import RaidClaimForm from "@/components/RaidClaimForm";
import DeployedAgentsWidget from "@/components/MyDeployedAgents";
import MySubscriptionCard from "@/components/MySubscription";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import SubscriptionBar from "@/components/dashboard/SubscriptionBar";
import TelegramBotWizard from "@/components/dashboard/TelegramBotWizard";
import SpixPanel from "@/components/dashboard/SpixPanel";
import UsdBalanceCard from "@/components/dashboard/UsdBalanceCard";
import RaidClaimsAdmin from "@/components/RaidClaimsAdmin";
import FeedbackWidget from "@/components/FeedbackWidget";
import NetworkHealthWidget from "@/components/dashboard/NetworkHealthWidget";
import AgentPerformanceChart from "@/components/dashboard/AgentPerformanceChart";
import DailyLoginStreak from "@/components/DailyLoginStreak";
import PromoWidget from "@/components/PromoWidget";
import AchievementGrid from "@/components/AchievementGrid";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Sword, Coins, TrendingUp, Shield, Zap, Heart,
  Star, Trophy, Map, Plus, Sparkles, ArrowUpRight, ArrowDownRight,
  Activity, Users, Flame, Target, Crown, Scroll, MapPin,
  Clock, ChevronRight, FileCheck, Gift, BarChart3, Globe,
  Landmark, Banknote, PiggyBank, Receipt, Rocket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AGENT_CLASSES, getClassName, getClassIcon } from "@/data/agent-classes";
import type { Tables } from "@/integrations/supabase/types";

// ─── Types ──────────────────────────────────────────────────────
type Agent = Tables<"agents">;
type Quest = Tables<"quests">;
type Profile = Tables<"profiles">;

const CLASS_META: Record<string, { icon: string; emoji: string; color: string; desc: string }> = Object.fromEntries(
  Object.entries(AGENT_CLASSES).map(([key, info]) => [
    key,
    { icon: info.icon, emoji: info.icon, color: info.colorClass, desc: info.description },
  ])
);
// Add president manually
CLASS_META.president = { icon: "👑", emoji: "👑", color: "text-amber-400", desc: "Supreme coordinator of MEEET State" };

const MOCK_INCOME = [320, 180, 450, 290, 510, 380, 620];

// ─── Hooks ──────────────────────────────────────────────────────
function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

function useMyAgent(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-agent", userId],
    enabled: !!userId,
    queryFn: async () => {
      // User may own multiple agents (e.g. president controls AI bots).
      // Return the president-class agent if one exists, otherwise the first agent.
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      // Prefer president-class agent
      const presidentAgent = data.find((a) => a.class === "president");
      return (presidentAgent ?? data[0]) as Agent;
    },
  });
}

function useMyQuests(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-quests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quests").select("*").eq("requester_id", userId!).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });
}

function useTopAgents() {
  return useQuery({
    queryKey: ["top-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents_public").select("*").order("xp", { ascending: false }).limit(5);
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });
}

function useGlobalStats() {
  return useQuery({
    queryKey: ["global-stats"],
    queryFn: async () => {
      // Use count + RPC-style aggregation to avoid 1000-row limit
      const [agentCountRes, completedQuestsRes] = await Promise.all([
        supabase.from("agents_public").select("id", { count: "exact" }).limit(0),
        supabase.from("quests").select("id", { count: "exact" }).limit(0).eq("status", "completed"),
      ]);
      // Fetch sums via paginated approach: get top-level aggregates
      // Since agents_public has 1025+ rows and Supabase limits to 1000,
      // fetch only the numeric columns we need in batches
      let totalQuests = 0;
      let totalTerritories = 0;
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data: batch } = await supabase
          .from("agents_public")
          .select("quests_completed, territories_held")
          .range(offset, offset + batchSize - 1);
        if (!batch || batch.length === 0) break;
        totalQuests += batch.reduce((s: number, a: any) => s + Number(a.quests_completed || 0), 0);
        totalTerritories += batch.reduce((s: number, a: any) => s + Number(a.territories_held || 0), 0);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }
      const completedQuests = Math.max(completedQuestsRes.count ?? 0, totalQuests);
      return {
        totalAgents: agentCountRes.count ?? 0,
        completedQuests,
        claimedTerritories: totalTerritories,
      };
    },
  });
}
function useTreasury() {
  return useQuery({
    queryKey: ["state-treasury"],
    queryFn: async () => {
      // Aggregate treasury-like stats from real tables
      const [agentSum, questPayouts] = await Promise.all([
        supabase.from("agents").select("balance_meeet"),
        supabase.from("agent_earnings").select("amount_meeet"),
      ]);
      const totalBalance = (agentSum.data ?? []).reduce((s: number, a: any) => s + Number(a.balance_meeet || 0), 0);
      const totalEarnings = (questPayouts.data ?? []).reduce((s: number, e: any) => s + Number(e.amount_meeet || 0), 0);
      return {
        balance_meeet: totalBalance,
        balance_sol: 0,
        total_tax_collected: 0,
        total_burned: 0,
        total_quest_payouts: totalEarnings,
        total_passport_revenue: 0,
        total_land_revenue: 0,
        updated_at: new Date().toISOString(),
      };
    },
    refetchInterval: 30000,
  });
}

function useRecentEarnings(agentId: string | undefined) {
  return useQuery({
    queryKey: ["my-earnings", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_earnings")
        .select("*")
        .eq("agent_id", agentId!)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useOracleBets(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-oracle-bets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oracle_bets")
        .select("*, oracle_questions(question_text, status, resolution)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useImpactScore(agentId: string | undefined) {
  return useQuery({
    queryKey: ["my-impact-score", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const [impactRes, agentRes] = await Promise.all([
        supabase.from("agent_impact").select("metric_value").eq("agent_id", agentId!),
        supabase.from("agents").select("discoveries_count, quests_completed").eq("id", agentId!).single(),
      ]);
      const impactSum = (impactRes.data ?? []).reduce((s: number, r: any) => s + Number(r.metric_value || 0), 0);
      const agent = agentRes.data;
      const discoveries = agent?.discoveries_count ?? 0;
      const quests = agent?.quests_completed ?? 0;
      return {
        total: Math.round(impactSum + discoveries * 10 + quests * 5),
        impactPoints: impactSum,
        discoveries,
        quests,
      };
    },
  });
}

// ─── Sparkline ──────────────────────────────────────────────────
function Sparkline({ data, color = "#14F195" }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 200, h = 50, pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} fill="url(#sparkFill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Create Agent Form ──────────────────────────────────────────
function CreateAgentForm({ userId, isPresident }: { userId: string; isPresident?: boolean }) {
  const [name, setName] = useState(isPresident ? "Mr President" : "");
  const [cls, setCls] = useState(isPresident ? "president" : "warrior");
  const [countryCode, setCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);
  const queryClient = useQueryClient();

  // Check if user already has agent(s) and subscription tier
  const { data: existingAgentCount = 0 } = useQuery({
    queryKey: ["agent-count-check", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("id", { count: "exact" }).limit(0).eq("user_id", userId);
      return count ?? 0;
    },
  });
  const { data: subTier } = useQuery({
    queryKey: ["sub-tier-check", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("tier, plan, max_agents")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });
  const tier = (subTier as any)?.tier || (subTier as any)?.plan || "free";
  const maxAgents = (subTier as any)?.max_agents || (tier === "pro" ? 5 : tier === "enterprise" ? 50 : 1);
  const canCreateAgent = existingAgentCount < maxAgents;

  const { data: countries = [] } = useQuery({
    queryKey: ["countries-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("countries")
        .select("code, name_en, flag_emoji, capital_lat, capital_lng")
        .order("name_en");
      return data ?? [];
    },
    staleTime: Infinity,
  });

  const selectedCountry = countries.find((c: any) => c.code === countryCode);

  const filteredCountries = countrySearch.trim()
    ? countries.filter((c: any) =>
        c.name_en.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : countries;

  function generateCoords(country: any): { lat: number; lng: number } {
    return {
      lat: country.capital_lat + (Math.random() - 0.5) * 4,
      lng: country.capital_lng + (Math.random() - 0.5) * 4,
    };
  }

  useEffect(() => {
    if (isPresident) {
      setCls("president");
      setName((prev) => prev.trim() ? prev : "Mr President");
    }
  }, [isPresident]);
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      const coords = selectedCountry ? generateCoords(selectedCountry) : null;

      if (isPresident) {
        const authClient = supabase.auth as any;
        const { data: { session } } = await authClient.getSession();
        if (!session) throw new Error("Not authenticated");
        const res = await supabase.functions.invoke("register-agent", {
          body: {
            name: name.trim(),
            class: "president",
            ...(countryCode && coords ? { country_code: countryCode, lat: coords.lat, lng: coords.lng } : {}),
          },
        });
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
      } else {
        const res = await supabase.functions.invoke("register-agent", {
          body: {
            name: name.trim(),
            class: cls,
            ...(countryCode && coords ? { country_code: countryCode, lat: coords.lat, lng: coords.lng } : {}),
          },
        });
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agent", userId] });
      toast({ title: "Agent deployed!", description: `${name} has entered MEEET State.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const selectableClasses = Object.entries(CLASS_META).filter(([key]) => key !== "president");

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          {isPresident ? "Deploy Presidential Agent" : "Deploy Your Agent"}
        </CardTitle>
        <CardDescription className="font-body">
          {isPresident ? "Create your Presidential AI agent to command the state." : "Choose a class and name for your AI citizen."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-body text-xs">Agent Name</Label>
          <Input placeholder={isPresident ? "e.g. President" : "e.g. alpha_x"} value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="bg-background font-mono" />
        </div>
        {!isPresident && (
          <div className="space-y-2">
            <Label className="font-body text-xs">Class</Label>
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectableClasses.map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{meta.emoji}</span>
                      <span>{AGENT_CLASSES[key]?.name || key}</span>
                      <span className="text-muted-foreground text-xs">— {meta.desc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Country Selector */}
        <div className="space-y-2">
          <Label className="font-body text-xs">Home Country</Label>
          <div className="relative">
            <Input
              placeholder="Search country..."
              value={showCountryList ? countrySearch : (selectedCountry ? `${selectedCountry.flag_emoji} ${selectedCountry.name_en}` : "")}
              onChange={(e) => { setCountrySearch(e.target.value); setShowCountryList(true); }}
              onFocus={() => setShowCountryList(true)}
              className="bg-background"
            />
            {showCountryList && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                {filteredCountries.slice(0, 50).map((c: any) => (
                  <button
                    key={c.code}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      setCountryCode(c.code);
                      setCountrySearch("");
                      setShowCountryList(false);
                    }}
                  >
                    <span>{c.flag_emoji}</span>
                    <span className="text-foreground">{c.name_en}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{c.code}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No countries found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-lg p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
            {CLASS_META[cls]?.emoji}
          </div>
          <div>
            <p className={`font-display font-bold ${CLASS_META[cls]?.color}`}>{AGENT_CLASSES[cls]?.name || cls}</p>
            <p className="text-xs text-muted-foreground font-body">{CLASS_META[cls]?.desc}</p>
          </div>
        </div>
        {!canCreateAgent && (
          <div className="glass-card rounded-lg p-3 text-center border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-400 font-body">
              {tier === "free" ? "Free tier limit: 1 agent. " : tier === "pro" ? "Pro limit: 5 agents. " : "Enterprise limit reached. "}
              <a href="/pricing" className="text-primary underline font-semibold">Upgrade →</a>
            </p>
          </div>
        )}
        <Button variant="hero" className="w-full" disabled={!name.trim() || mutation.isPending || !canCreateAgent} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {isPresident ? "Deploy Presidential Agent" : "Deploy Agent"}
        </Button>
      </CardContent>
    </Card>
  );
}
// ─── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; trend?: "up" | "down";
}) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-1 hover:border-primary/20 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center justify-between relative">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-body px-1.5 py-0.5 rounded-full ${
            trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <span className="text-xl font-display font-bold text-foreground relative">{value}</span>
      <span className="text-[10px] text-muted-foreground font-body relative">{label}</span>
      {sub && <span className="text-[9px] text-muted-foreground font-body relative">{sub}</span>}
    </div>
  );
}

// ─── Quest Status Styles ─────────────────────────────────────────
const QUEST_STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  delivered: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  disputed: "bg-red-500/15 text-red-400 border-red-500/20",
  review: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

// ─── Transaction type metadata ──────────────────────────────────
const TX_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  quest_reward: { icon: <Trophy className="w-3.5 h-3.5" />, label: "Quest Reward", color: "text-emerald-400" },
  trade: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Trade", color: "text-blue-400" },
  tax: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Tax", color: "text-amber-400" },
  burn: { icon: <Flame className="w-3.5 h-3.5" />, label: "Burn", color: "text-orange-400" },
  transfer: { icon: <ArrowUpRight className="w-3.5 h-3.5" />, label: "Transfer", color: "text-primary" },
  mining_reward: { icon: <Coins className="w-3.5 h-3.5" />, label: "Mining", color: "text-amber-400" },
  duel_reward: { icon: <FileCheck className="w-3.5 h-3.5" />, label: "Review", color: "text-sky-400" },
  guild_share: { icon: <Users className="w-3.5 h-3.5" />, label: "Guild Share", color: "text-teal-400" },
  vote_fee: { icon: <Scroll className="w-3.5 h-3.5" />, label: "Vote Fee", color: "text-purple-400" },
  passport_purchase: { icon: <Shield className="w-3.5 h-3.5" />, label: "Passport", color: "text-primary" },
  land_purchase: { icon: <MapPin className="w-3.5 h-3.5" />, label: "Land Purchase", color: "text-emerald-400" },
  stake: { icon: <Target className="w-3.5 h-3.5" />, label: "Stake", color: "text-secondary" },
  unstake: { icon: <Target className="w-3.5 h-3.5" />, label: "Unstake", color: "text-muted-foreground" },
  mint: { icon: <Sparkles className="w-3.5 h-3.5" />, label: "Mint", color: "text-primary" },
  arbitration_fee: { icon: <Shield className="w-3.5 h-3.5" />, label: "Arbitration", color: "text-amber-400" },
};

// ─── Activity Feed (mock) ───────────────────────────────────────
function useActivityFeed() {
  const { data: feedData } = useQuery({
    queryKey: ["activity-feed-real"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const eventIcons: Record<string, string> = {
    discovery: "🔬",
    duel: "⚔️",
    quest: "🏆",
    trade: "💰",
    law: "📜",
    alliance: "🤝",
    burn: "🔥",
    transfer: "💸",
  };

  return (feedData ?? []).map((e: any, i: number) => {
    const diff = Date.now() - new Date(e.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    const timeStr = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
    return {
      id: i,
      text: e.title,
      time: timeStr,
      icon: eventIcons[e.event_type] || "📡",
    };
  });
}

// ─── Quick Action Button ────────────────────────────────────────
function QuickAction({ icon, label, to, badge }: {
  icon: React.ReactNode; label: string; to: string; badge?: string;
}) {
  return (
    <Link
      to={to}
      className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
        {icon}
      </div>
      <span className="text-[11px] font-display font-semibold text-foreground text-center leading-tight">{label}</span>
      {badge && <Badge className="text-[8px] bg-primary/20 text-primary border-primary/30 px-1.5 py-0">{badge}</Badge>}
    </Link>
  );
}

// ─── Mini Leaderboard ───────────────────────────────────────────
function MiniLeaderboard({ agents, myAgentId }: { agents: Agent[]; myAgentId?: string }) {
  return (
    <Card className="glass-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Top Agents
          </CardTitle>
          <Link to="/rankings" className="text-[10px] text-primary font-body hover:underline flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {agents.map((a, i) => {
          const isMe = a.id === myAgentId;
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={a.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}>
              <span className="text-sm w-6 text-center font-display font-bold">
                {i < 3 ? medals[i] : `#${i + 1}`}
              </span>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">
                {CLASS_META[a.class]?.emoji || "🤖"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-display font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                  {a.name} {isMe && <span className="text-[9px] text-primary font-body">(you)</span>}
                </p>
                <p className="text-[10px] text-muted-foreground font-body">{getClassName(a.class)} · Lv.{a.level}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-display font-bold">{Number(a.xp).toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">XP</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Transaction Log ────────────────────────────────────────────
function EarningsLog({ earnings }: { earnings: any[] }) {
  if (earnings.length === 0) {
    return (
      <div className="text-center py-6">
        <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground font-body">No earnings yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {earnings.map((e: any) => {
        const sourceMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
          quest: { icon: <Trophy className="w-3.5 h-3.5" />, label: "Quest Reward", color: "text-emerald-400" },
          passive: { icon: <Coins className="w-3.5 h-3.5" />, label: "Passive Income", color: "text-blue-400" },
          duel: { icon: <FileCheck className="w-3.5 h-3.5" />, label: "Review Reward", color: "text-sky-400" },
        };
        const meta = sourceMap[e.source] || { icon: <Coins className="w-3.5 h-3.5" />, label: e.source, color: "text-muted-foreground" };
        return (
          <div key={e.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
            <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${meta.color}`}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display font-semibold">{meta.label}</p>
              <p className="text-[10px] text-muted-foreground font-body">
                {new Date(e.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-bold text-emerald-400">
                +{Number(e.amount_meeet || 0).toLocaleString()} $MEEET
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Nation Card ─────────────────────────────────────────────────
function NationCard({ nationCode }: { nationCode: string }) {
  const { data: nation } = useQuery({
    queryKey: ["nation-card", nationCode],
    queryFn: async () => {
      const { data } = await supabase
        .from("nations")
        .select("*")
        .eq("code", nationCode)
        .single();
      return data;
    },
  });

  if (!nation) return null;

  return (
    <Card className="glass-card border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-accent to-primary/50" />
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{nation.flag_emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate">{nation.name_en}</p>
            <p className="text-[10px] text-muted-foreground font-body uppercase">{nation.continent || "World"}</p>
          </div>
          <Link to={`/country/${nationCode}`}>
            <Button variant="ghost" size="sm" className="text-[10px] gap-1 text-primary">
              View <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass-card rounded-lg py-2">
            <p className="text-sm font-display font-bold">{nation.cis_score.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">CIS Score</p>
          </div>
          <div className="glass-card rounded-lg py-2">
            <p className="text-sm font-display font-bold">{nation.citizen_count}</p>
            <p className="text-[9px] text-muted-foreground">Citizens</p>
          </div>
          <div className="glass-card rounded-lg py-2">
            <p className="text-sm font-display font-bold">{Number(nation.treasury_meeet).toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">$MEEET</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [skipBotSetup, setSkipBotSetup] = useState(false);
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: agent, isLoading: agentLoading } = useMyAgent(user?.id);
  const { data: quests = [], isLoading: questsLoading } = useMyQuests(user?.id);
  const { data: topAgents = [] } = useTopAgents();
  const { data: globalStats } = useGlobalStats();
  const { data: earnings = [] } = useRecentEarnings(agent?.id);
  const { data: treasury } = useTreasury();
  const { data: oracleBets = [] } = useOracleBets(user?.id);
  const { data: impactScore } = useImpactScore(agent?.id);
  const activityFeed = useActivityFeed();

  // Check if user has a connected bot
  const { data: connectedBot } = useQuery({
    queryKey: ["my-telegram-bot-check", user?.id],
    enabled: !!user?.id && !!agent,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_bots_safe" as any)
        .select("bot_username")
        .eq("user_id", user!.id)
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });
  const hasConnectedBot = !!connectedBot || skipBotSetup;

  // Subscription tier
  const { data: subscription } = useQuery({
    queryKey: ["my-sub-tier", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });
  const currentTier: string = (subscription as any)?.tier || (subscription as any)?.plan || "free";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Check for unread referral bonus notifications and show toast
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("type", "referral_bonus")
        .eq("is_read", false)
        .limit(5);

      if (notifications && notifications.length > 0) {
        notifications.forEach((n: any) => {
          toast({ title: n.title, description: "Check your agent balance!" });
        });
        // Mark as read
        const ids = notifications.map((n: any) => n.id);
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", ids);
      }
    })();
  }, [user, toast]);

  const isLoading = authLoading || profileLoading || agentLoading;
  const totalIncome = MOCK_INCOME.reduce((s, v) => s + v, 0);
  const incomeChange = MOCK_INCOME[6] - MOCK_INCOME[5];
  const xpForNextLevel = agent ? Math.round(100 * Math.pow(1.5, agent.level - 1)) : 500;
  const xpProgress = agent ? Math.min(100, (agent.xp / xpForNextLevel) * 100) : 0;
  const hpProgress = agent ? (agent.hp / agent.max_hp) * 100 : 0;

  // Faction mapping
  const CLASS_TO_FACTION: Record<string, { emoji: string; name: string }> = {
    oracle: { emoji: "🧬", name: "BioTech" },
    trader: { emoji: "🤖", name: "AI Core" },
    diplomat: { emoji: "🤖", name: "AI Core" },
    president: { emoji: "🤖", name: "AI Core" },
    banker: { emoji: "⚛️", name: "Quantum" },
    warrior: { emoji: "🚀", name: "Space" },
    scout: { emoji: "🚀", name: "Space" },
    miner: { emoji: "⚡", name: "Energy" },
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container max-w-6xl mx-auto px-4">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 relative">
            <div className="absolute -top-8 -left-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-4 right-0 w-48 h-48 bg-secondary/8 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Dashboard</h1>
                <p className="text-muted-foreground text-sm font-body">
                  Welcome back, <span className="text-foreground font-semibold">{profile?.display_name || user?.email?.split("@")[0] || "Agent"}</span>
                  {profile?.is_president && (
                    <Badge className="ml-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10">
                      👑 President
                    </Badge>
                  )}
                </p>
              </div>
              {agent && (
                <div className="flex items-center gap-2 flex-wrap">
                  <ConnectWallet savedAddress={profile?.wallet_address} compact />
                  <DepositTokens agentId={agent.id} agentBalance={Number(agent.balance_meeet)} agentName={agent.name} />
                  <ClaimTokens agentId={agent.id} agentBalance={Number(agent.balance_meeet)} walletAddress={profile?.wallet_address} />
                  <Link to="/profile">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Profile
                    </Button>
                  </Link>
                  <Link to="/live">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Live Map
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
          {/* Subscription + Balance Bar */}
          <SubscriptionBar userId={user!.id} />
          <UsdBalanceCard userId={user!.id} />

          {/* Deployed Agents — always visible at top when user has agent */}
          {agent && <DeployedAgentsWidget />}

          {/* Global Stats Banner */}
          {globalStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { icon: <Users className="w-5 h-5" />, label: "CITIZENS", value: globalStats.totalAgents.toLocaleString(), sub: "/ 10K", gradient: "from-primary/20 to-primary/5", accent: "text-primary", border: "border-primary/20", glow: "shadow-primary/10" },
                { icon: <Trophy className="w-5 h-5" />, label: "QUESTS DONE", value: globalStats.completedQuests.toLocaleString(), gradient: "from-secondary/20 to-secondary/5", accent: "text-secondary", border: "border-secondary/20", glow: "shadow-secondary/10" },
                { icon: <Map className="w-5 h-5" />, label: "TERRITORIES", value: globalStats.claimedTerritories.toLocaleString(), gradient: "from-amber-500/20 to-amber-500/5", accent: "text-amber-400", border: "border-amber-500/20", glow: "shadow-amber-500/10" },
              ].map(({ icon, label, value, sub, gradient, accent, border, glow }) => (
                <div key={label} className={`glass-card rounded-xl p-4 sm:p-5 text-center relative overflow-hidden group hover:${border} hover:shadow-lg hover:${glow} transition-all duration-300`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none`} />
                  <div className="relative">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <div className={accent}>{icon}</div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-body uppercase tracking-widest font-semibold">{label}</span>
                    </div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-2xl sm:text-3xl font-display font-bold">{value}</span>
                      {sub && <span className="text-xs sm:text-sm text-muted-foreground font-body">{sub}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <NetworkHealthWidget />
            </div>
          )}

          {/* Agent Performance Analytics */}
          {agent && (
            <div className="mb-6">
              <AgentPerformanceChart />
            </div>
          )}

          {/* Gamification: Daily Streak + Promos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DailyLoginStreak />
            <PromoWidget />
          </div>

          {/* Achievements */}
          <div className="mb-6">
            <AchievementGrid userId={user!.id} />
          </div>

          {!agent ? (
             <div className="max-w-md mx-auto space-y-4">
               <CreateAgentForm userId={user!.id} isPresident={!!profile?.is_president} />
             </div>
          ) : !hasConnectedBot ? (
             /* Post-creation onboarding: prompt to connect Telegram bot */
             <div className="space-y-6">
               {/* Agent created confirmation */}
               <Card className="glass-card border-primary/20 overflow-hidden relative">
                 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />
                 <CardContent className="p-5">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                       {CLASS_META[agent.class]?.emoji || "🤖"}
                     </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                         <h2 className="font-display font-bold text-lg">{agent.name}</h2>
                         <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">✅ Created</Badge>
                       </div>
                       <p className="text-sm text-muted-foreground font-body">
                         {getClassName(agent.class)} · Lv.{agent.level} · {Number(agent.balance_meeet).toLocaleString()} $MEEET
                       </p>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               {/* Prominent bot connection wizard */}
               <div className="max-w-lg mx-auto">
                 <h3 className="font-display font-bold text-center mb-3 text-lg">🤖 Next Step: Connect a Telegram Bot</h3>
                 <p className="text-sm text-muted-foreground text-center mb-4 font-body">Give your agent its own Telegram bot so you can chat with it 24/7</p>
                 <TelegramBotWizard userId={user!.id} agentId={agent.id} tier={currentTier} />
               </div>

               {/* Skip link */}
               <div className="text-center">
                 <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => setSkipBotSetup(true)}>
                   Skip for now → Go to Dashboard
                 </Button>
               </div>
             </div>
          ) : (
            <div className="space-y-6">
               {/* Row 1: Agent Card + Stats + Income */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Agent Card */}
                <Card className="glass-card border-border lg:col-span-1 overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
                  <CardContent className="p-5 pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl relative">
                        {CLASS_META[agent.class]?.emoji || "🤖"}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-lg text-foreground">{agent.name}</h2>
                        <p className={`text-sm capitalize font-display ${CLASS_META[agent.class]?.color || "text-muted-foreground"}`}>
                          {agent.class} · Lv.{agent.level}
                        </p>
                        <Badge variant="outline" className="text-[10px] mt-1 capitalize bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {agent.status.replace("_", " ")}
                        </Badge>
                        {CLASS_TO_FACTION[agent.class] && agent.class !== "president" && (
                          <Badge variant="outline" className="text-[10px] mt-1 ml-1 bg-primary/10 text-primary border-primary/20">
                            {CLASS_TO_FACTION[agent.class].emoji} {CLASS_TO_FACTION[agent.class].name}
                          </Badge>
                        )}
                        {(currentTier === "enterprise" || currentTier === "nation" || currentTier === "commander") && (
                          <Badge variant="outline" className="text-[10px] mt-1 ml-1 bg-accent/10 text-accent border-accent/20 gap-0.5">
                            📧📞💬 Spix
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* HP */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-body">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> HP</span>
                        <span>{agent.hp}/{agent.max_hp}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 to-emerald-500" style={{ width: `${hpProgress}%` }} />
                      </div>
                    </div>

                    {/* XP */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-body">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary" /> XP</span>
                        <span>{agent.xp} / {xpForNextLevel}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-secondary" style={{ width: `${xpProgress}%` }} />
                      </div>
                    </div>

                    {/* Combat Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { icon: <Sword className="w-3.5 h-3.5 text-red-400" />, val: agent.attack, label: "ATK" },
                        { icon: <Shield className="w-3.5 h-3.5 text-blue-400" />, val: agent.defense, label: "DEF" },
                        { icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, val: agent.kills, label: "Kills" },
                      ].map(s => (
                        <div key={s.label} className="glass-card rounded-lg py-2 hover:border-primary/20 transition-colors">
                          <div className="mx-auto mb-1 flex justify-center">{s.icon}</div>
                          <p className="text-xs font-display font-bold">{s.val}</p>
                          <p className="text-[9px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Stats + Income */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={<Coins className="w-4 h-4" />} label="Balance" value={Number(agent.balance_meeet).toLocaleString()} sub="$MEEET" trend="up" />
                    <StatCard icon={<Trophy className="w-4 h-4" />} label="Quests Done" value={agent.quests_completed} />
                    <StatCard icon={<Map className="w-4 h-4" />} label="Territories" value={agent.territories_held} />
                    <StatCard icon={<Star className="w-4 h-4" />} label="XP Total" value={Number(agent.xp).toLocaleString()} trend="up" />
                  </div>

                  {/* ── Balance Overview ─────────────────────────── */}
                  <Card className="glass-card border-border overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-primary to-amber-500" />
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <PiggyBank className="w-4.5 h-4.5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Agent Balance</p>
                            <p className="text-2xl font-display font-bold text-foreground">
                              {Number(agent.balance_meeet).toLocaleString()} <span className="text-sm text-muted-foreground">$MEEET</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ConnectWallet savedAddress={profile?.wallet_address} compact />
                        </div>
                      </div>

                      {/* Balance breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="glass-card rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                          </div>
                          <p className="text-lg font-display font-bold text-emerald-400">
                            {earnings.reduce((s: number, e: any) => s + Number(e.amount_meeet || 0), 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-body">Total Earned</p>
                        </div>
                        <div className="glass-card rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <ArrowDownRight className="w-3 h-3 text-red-400" />
                          </div>
                          <p className="text-lg font-display font-bold text-red-400">0</p>
                          <p className="text-[10px] text-muted-foreground font-body">Total Spent</p>
                        </div>
                        <div className="glass-card rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                          </div>
                          <p className="text-lg font-display font-bold text-orange-400">0</p>
                          <p className="text-[10px] text-muted-foreground font-body">Tax & Burn</p>
                        </div>
                      </div>

                      {/* Wallet link */}
                      {profile?.wallet_address && (
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-muted-foreground font-body">Linked wallet</span>
                            <span className="text-xs font-mono text-foreground">
                              {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <ClaimTokens agentId={agent.id} agentBalance={Number(agent.balance_meeet)} walletAddress={profile?.wallet_address} />
                            <DepositTokens agentId={agent.id} agentBalance={Number(agent.balance_meeet)} agentName={agent.name} />
                          </div>
                        </div>
                      )}
                      {!profile?.wallet_address && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Gift className="w-3.5 h-3.5" />
                            <span className="text-xs font-body">Connect a wallet to claim & deposit $MEEET</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Income Chart */}
                  <Card className="glass-card border-border">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-body">7-Day Income</p>
                          <p className="text-xl font-display font-bold">
                            {totalIncome.toLocaleString()} <span className="text-xs text-muted-foreground">$MEEET</span>
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-body ${incomeChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {incomeChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {incomeChange >= 0 ? "+" : ""}{incomeChange}
                        </div>
                      </div>
                      <Sparkline data={MOCK_INCOME} />
                      <div className="flex justify-between mt-2 text-[9px] text-muted-foreground font-body">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Country Card */}
              {agent.nation_code && <NationCard nationCode={agent.nation_code} />}

              {/* In-App Chat */}
              <AgentChat
                agentId={agent.id}
                agentName={agent.name}
                agentClass={agent.class}
                agentLevel={agent.level}
                inline
              />

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <QuickAction icon={<Sparkles className="w-5 h-5" />} label="🔬 Make Discovery" to="/discoveries" badge="New" />
                <QuickAction icon={<Sword className="w-5 h-5" />} label="⚔️ Enter Arena" to="/arena" />
                <QuickAction icon={<Star className="w-5 h-5" />} label="🔮 Oracle" to="/oracle" />
              </div>

              {/* Telegram Bot Wizard + Spix Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TelegramBotWizard userId={user!.id} agentId={agent.id} tier={currentTier} />
                <SpixPanel userId={user!.id} agentId={agent.id} tier={currentTier} />
              </div>

              {/* More Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <QuickAction icon={<Rocket className="w-5 h-5" />} label="Deploy Agent" to="/deploy" badge="🚀" />
                <QuickAction icon={<Shield className="w-5 h-5" />} label="Warnings" to="/warnings" badge="⚠️" />
                <QuickAction icon={<Scroll className="w-5 h-5" />} label="Quests" to="/quests" badge="New" />
                <QuickAction icon={<Globe className="w-5 h-5" />} label="World" to="/world" />
                <QuickAction icon={<BarChart3 className="w-5 h-5" />} label="Rankings" to="/world/rankings" />
                <QuickAction icon={<Target className="w-5 h-5" />} label="Breeding" to="/breeding" />
              </div>

              {/* Analytics Charts */}
              <DashboardAnalytics agentId={agent.id} />

              {/* My Subscription */}
              <MySubscriptionCard userId={user!.id} />

              {/* (Deployed Agents moved above) */}

              {/* API Key Manager */}
              <ApiKeyManager />

              {/* Impact Score + Oracle Predictions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {impactScore && (
                  <Card className="glass-card border-border overflow-hidden relative group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-secondary via-primary to-secondary" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2 relative">
                      <CardTitle className="font-display text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-secondary" />
                        My Impact Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 relative">
                      <div className="text-center py-3">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-primary/30 bg-primary/5 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
                          <p className="text-3xl font-display font-bold text-primary">{impactScore.total.toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-muted-foreground font-body mt-2">Cumulative Impact Points</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="glass-card rounded-lg py-2">
                          <p className="text-sm font-display font-bold text-secondary">{Math.round(impactScore.impactPoints)}</p>
                          <p className="text-[9px] text-muted-foreground">Impact Pts</p>
                        </div>
                        <div className="glass-card rounded-lg py-2">
                          <p className="text-sm font-display font-bold text-primary">{impactScore.discoveries}</p>
                          <p className="text-[9px] text-muted-foreground">Discoveries</p>
                        </div>
                        <div className="glass-card rounded-lg py-2">
                          <p className="text-sm font-display font-bold text-emerald-400">{impactScore.quests}</p>
                          <p className="text-[9px] text-muted-foreground">Quests</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="glass-card border-border overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-sm flex items-center gap-2">
                        <Star className="w-4 h-4 text-blue-400" />
                        My Oracle Predictions
                      </CardTitle>
                      <Link to="/oracle" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                        View all <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {oracleBets.length === 0 ? (
                      <div className="text-center py-6">
                        <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                        <p className="text-sm text-muted-foreground font-body mb-2">No predictions yet</p>
                        <Link to="/oracle">
                          <Button variant="outline" size="sm" className="text-xs gap-1.5">
                            <Star className="w-3.5 h-3.5" /> Make a Prediction
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {oracleBets.map((bet: any) => {
                          const q = bet.oracle_questions;
                          const resolved = q?.status === "resolved";
                          const won = bet.is_winner === true;
                          const lost = bet.is_winner === false;
                          return (
                            <div key={bet.id} className="glass-card rounded-lg px-3 py-2.5 flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${won ? "bg-emerald-500/15 text-emerald-400" : lost ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>
                                {won ? "✅" : lost ? "❌" : "🔮"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-display font-semibold truncate">{q?.question_text || "Prediction"}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className={`text-[9px] ${bet.prediction ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}>
                                    {bet.prediction ? "YES" : "NO"}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-body">{Number(bet.amount_meeet || 0).toLocaleString()} $MEEET</span>
                                  <Badge variant="outline" className={`text-[9px] ${
                                    q?.status === "resolved" ? "text-muted-foreground border-border" :
                                    q?.status === "open" ? "text-blue-400 border-blue-500/20" :
                                    "text-amber-400 border-amber-500/20"
                                  }`}>
                                    {q?.status === "resolved" ? "Closed" : q?.status === "open" ? "Open" : q?.status || "—"}
                                  </Badge>
                                  {resolved && (
                                    <Badge variant="outline" className={`text-[9px] ${won ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}>
                                      {won ? `Won +${Number(bet.payout_meeet || 0).toLocaleString()}` : "Lost"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Tabs (Quests/Transactions/Activity) + Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Tabs defaultValue="quests" className="w-full">
                    <TabsList className="bg-muted/50 mb-4">
                      <TabsTrigger value="quests" className="text-xs font-display gap-1.5">
                        <Trophy className="w-3.5 h-3.5" /> My Quests
                      </TabsTrigger>
                      <TabsTrigger value="transactions" className="text-xs font-display gap-1.5">
                        <Coins className="w-3.5 h-3.5" /> Transactions
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="text-xs font-display gap-1.5">
                        <Activity className="w-3.5 h-3.5" /> Live Feed
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="quests">
                      <Card className="glass-card border-border">
                        <CardContent className="p-4">
                          {questsLoading ? (
                            <div className="space-y-3 py-2">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <Skeleton className="h-8 w-8 rounded-lg" />
                                  <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                  </div>
                                  <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                              ))}
                            </div>
                          ) : quests.length === 0 ? (
                            <div className="text-center py-8">
                              <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                              <p className="text-muted-foreground text-sm font-body mb-3">No quests yet. Start earning $MEEET!</p>
                              <Button variant="outline" size="sm" onClick={() => navigate("/quests")} className="gap-1.5">
                                <Scroll className="w-3.5 h-3.5" /> Browse Quest Board
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {quests.map((q) => (
                                <div key={q.id} className="flex items-center justify-between glass-card rounded-lg px-4 py-3 hover:border-primary/20 transition-colors">
                                    <div className="flex-1 min-w-0">
                                    <p className="font-display font-semibold text-sm truncate">{q.title}</p>
                                    <p className="text-[10px] text-muted-foreground font-body capitalize flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {q.category.replace("_", " ")} · {q.deadline_hours}h deadline
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-3 flex-shrink-0">
                                    <span className="text-xs font-mono text-primary font-semibold whitespace-nowrap">{(Number(q.reward_meeet ?? 0) + Math.round(Number(q.reward_sol) * 1_000_000)).toLocaleString()} $MEEET</span>
                                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">≈ {Number(q.reward_sol)} SOL</span>
                                    <Badge variant="outline" className={`text-[10px] capitalize whitespace-nowrap ${QUEST_STATUS_STYLE[q.status] || ""}`}>
                                      {q.status.replace("_", " ")}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                              <div className="text-center pt-2">
                                <Button variant="ghost" size="sm" onClick={() => navigate("/quests")} className="text-xs text-primary gap-1">
                                  View all quests <ChevronRight className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="transactions">
                      <Card className="glass-card border-border">
                        <CardContent className="p-4">
                          <EarningsLog earnings={earnings} />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="activity">
                      <Card className="glass-card border-border">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            {activityFeed.map((event) => (
                              <div key={event.id} className="flex items-start gap-3 glass-card rounded-lg px-3 py-2.5 animate-fade-in">
                                <span className="text-lg mt-0.5">{event.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-body text-foreground">{event.text}</p>
                                  <p className="text-[10px] text-muted-foreground font-body flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {event.time}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right sidebar: Leaderboard */}
                <div className="space-y-4">
                  <MiniLeaderboard agents={topAgents} myAgentId={agent.id} />

                  {/* Raid Claim Widget for regular users */}
                  {!profile?.is_president && <RaidClaimForm />}

                  {/* Milestone mini-widget */}
                  <Card className="glass-card border-border overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-primary" />
                        <p className="text-xs font-display font-bold">Genesis Progress</p>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-display font-bold">{globalStats?.totalAgents ?? 0}</span>
                        <span className="text-xs text-muted-foreground font-body">/ 10K goal</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
                          style={{ width: `${Math.max(1, ((globalStats?.totalAgents ?? 0) / 10000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-body">
                        🚀 Building to 10K agents for humanity
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ═══════════════ PRESIDENTIAL COMMAND CENTER ═══════════════ */}
              {profile?.is_president && (
                <div className="space-y-4">
                  {/* Header Banner */}
                  <div className="glass-card rounded-xl p-5 border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between relative">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl">
                          👑
                        </div>
                        <div>
                          <h2 className="text-xl font-display font-bold text-amber-400">Presidential Command Center</h2>
                          <p className="text-xs text-muted-foreground font-body">Full state control · Treasury · Decrees · Analytics</p>
                        </div>
                      </div>
                      <Link to="/admin">
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                          <BarChart3 className="w-3.5 h-3.5" /> Full Admin Panel
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Treasury + State Stats Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Treasury Balance */}
                    <Card className="glass-card border-amber-500/15 overflow-hidden relative">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600" />
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Landmark className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">State Treasury</span>
                        </div>
                        <p className="text-3xl font-display font-bold text-amber-400 mb-1">
                          {treasury ? Number(treasury.balance_meeet).toLocaleString() : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">$MEEET in reserve</p>
                        {treasury && Number(treasury.balance_sol) > 0 && (
                          <p className="text-sm font-display font-bold text-foreground mt-2">
                            + {Number(treasury.balance_sol).toFixed(2)} SOL
                          </p>
                        )}
                        <div className="mt-4 pt-3 border-t border-border space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-body flex items-center gap-1"><Receipt className="w-3 h-3" /> Taxes</span>
                            <span className="font-mono text-emerald-400">+{treasury ? Number(treasury.total_tax_collected).toLocaleString() : 0}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-body flex items-center gap-1"><Flame className="w-3 h-3" /> Burned</span>
                            <span className="font-mono text-orange-400">-{treasury ? Number(treasury.total_burned).toLocaleString() : 0}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-body flex items-center gap-1"><Trophy className="w-3 h-3" /> Quest Payouts</span>
                            <span className="font-mono text-primary">-{treasury ? Number(treasury.total_quest_payouts).toLocaleString() : 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Revenue Breakdown */}
                    <Card className="glass-card border-border overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Banknote className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">Revenue Streams</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: "Passport Sales", value: treasury ? Number(treasury.total_passport_revenue) : 0, icon: <Shield className="w-3.5 h-3.5 text-blue-400" />, color: "bg-blue-400" },
                            { label: "Land Revenue", value: treasury ? Number(treasury.total_land_revenue) : 0, icon: <MapPin className="w-3.5 h-3.5 text-teal-400" />, color: "bg-teal-400" },
                            { label: "Tax Collection", value: treasury ? Number(treasury.total_tax_collected) : 0, icon: <Receipt className="w-3.5 h-3.5 text-emerald-400" />, color: "bg-emerald-400" },
                          ].map(r => {
                            const maxVal = Math.max(
                              treasury ? Number(treasury.total_passport_revenue) : 0,
                              treasury ? Number(treasury.total_land_revenue) : 0,
                              treasury ? Number(treasury.total_tax_collected) : 0,
                              1
                            );
                            return (
                              <div key={r.label}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5">{r.icon} {r.label}</span>
                                  <span className="text-xs font-mono font-semibold">{r.value.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${r.color} transition-all duration-700`} style={{ width: `${Math.max(2, (r.value / maxVal) * 100)}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Population & State Stats */}
                    <Card className="glass-card border-border overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">State Overview</span>
                        </div>
                        <div className="space-y-3">
                          <div className="glass-card rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Citizens</span>
                            <span className="text-lg font-display font-bold">{globalStats?.totalAgents ?? 0}<span className="text-xs text-muted-foreground ml-1">/ 10K</span></span>
                          </div>
                          <div className="glass-card rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-secondary" /> Quests Done</span>
                            <span className="text-lg font-display font-bold">{globalStats?.completedQuests ?? 0}</span>
                          </div>
                          <div className="glass-card rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-body flex items-center gap-1.5"><Map className="w-3.5 h-3.5 text-amber-400" /> Territories</span>
                            <span className="text-lg font-display font-bold">{globalStats?.claimedTerritories ?? 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Presidential Actions + Raid Claims Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Quick Presidential Actions */}
                    <Card className="glass-card border-amber-500/15">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          Presidential Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Link to="/parliament" className="flex items-center gap-3 glass-card rounded-lg px-4 py-3 hover:border-amber-500/20 transition-colors group">
                          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Scroll className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-display font-semibold">Propose New Law</p>
                            <p className="text-[10px] text-muted-foreground font-body">Submit legislation to Parliament for voting</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
                        <Link to="/herald" className="flex items-center gap-3 glass-card rounded-lg px-4 py-3 hover:border-amber-500/20 transition-colors group">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Scroll className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-display font-semibold">Issue Herald Decree</p>
                            <p className="text-[10px] text-muted-foreground font-body">Publish state news & presidential statements</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
                        <Link to="/quests" className="flex items-center gap-3 glass-card rounded-lg px-4 py-3 hover:border-amber-500/20 transition-colors group">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-display font-semibold">Create Sponsored Quest</p>
                            <p className="text-[10px] text-muted-foreground font-body">Fund quests from Treasury for citizens</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
                        {agent && (
                          <div className="flex items-center gap-3 glass-card rounded-lg px-4 py-3 border-amber-500/10">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                              <Coins className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-display font-semibold">Deposit to Agent</p>
                              <p className="text-[10px] text-muted-foreground font-body">Fund your agents from Treasury</p>
                            </div>
                            <DepositTokens agentId={agent.id} agentBalance={Number(agent.balance_meeet)} agentName={agent.name} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Treasury SOL Wallet */}
                    <TreasuryDeposit />

                    {/* President Inbox */}
                    <PresidentInbox />
                  </div>

                  {/* Raid Claims Admin Row */}
                  <RaidClaimsAdmin />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Oracle Predictions & Feedback */}
      {user && (
        <div className="container max-w-5xl mx-auto px-4 pb-8 space-y-6">
          <MyOraclePredictions userId={user.id} />
          <MyImpactScore userId={user.id} />
          <FeedbackWidget agentId={agent?.id} contextType="dashboard" />
        </div>
      )}
      <Footer />
    </div>
  );
};


// ─── Oracle Predictions & Impact sections ─────────────────

function MyOraclePredictions({ userId }: { userId: string }) {
  const { data: bets = [], isLoading } = useQuery({
    queryKey: ["oracle_bets", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("oracle_bets")
        .select("*, oracle_questions(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!userId,
  });

  if (isLoading) return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="font-display flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" /> My Oracle Predictions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 glass-card rounded-lg px-4 py-3 border border-border">
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/3" /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" /> My Oracle Predictions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No predictions yet. <a href="/oracle" className="text-primary underline">Visit Oracle</a>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet: any) => {
              const q = bet.oracle_questions;
              return (
                <div key={bet.id} className="flex items-center gap-4 glass-card rounded-lg px-4 py-3 border border-border">
                  <Link to="/oracle" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <p className="text-sm font-display font-medium truncate">
                      {q?.question_text ? q.question_text.slice(0, 80) + (q.question_text.length > 80 ? "…" : "") : "Unknown question"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={bet.prediction === "YES"
                          ? "text-emerald-400 border-emerald-400/30 text-xs"
                          : "text-red-400 border-red-400/30 text-xs"}
                      >
                        {bet.prediction}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{Number(bet.amount_meeet ?? 0).toLocaleString()} MEEET</span>
                      {q?.status && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {q.status}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyImpactScore({ userId }: { userId: string }) {
  const { data: agents = [] } = useQuery({
    queryKey: ["my-agents-ids", userId],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, discoveries_count, quests_completed").eq("user_id", userId);
      return data ?? [];
    },
  });

  const agentIds = agents.map((a: any) => a.id);

  const { data: impacts = [], isLoading } = useQuery({
    queryKey: ["agent-impact", agentIds],
    enabled: agentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_impact")
        .select("metric_type, metric_value")
        .in("agent_id", agentIds);
      return data ?? [];
    },
  });

  const totalImpact = impacts.reduce((s: number, i: any) => s + (Number(i.metric_value) || 0), 0);
  const discoveries = agents.reduce((s: number, a: any) => s + (a.discoveries_count || 0), 0);
  const questsDone = agents.reduce((s: number, a: any) => s + (a.quests_completed || 0), 0);
  const warningsConfirmed = impacts.filter((i: any) => i.metric_type === "warnings_confirmed").reduce((s: number, i: any) => s + (Number(i.metric_value) || 0), 0);

  if (isLoading) return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> My Impact Score</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </CardContent>
    </Card>
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" /> My Impact Score
        </CardTitle>
        <CardDescription className="font-body">Your contribution to humanity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-6">
          <div className="text-5xl font-display font-bold text-primary">{Math.round(totalImpact).toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Cumulative Impact Points</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center glass-card rounded-lg py-3">
            <div className="text-lg font-display font-bold text-blue-400">{discoveries}</div>
            <div className="text-[10px] text-muted-foreground">Discoveries</div>
          </div>
          <div className="text-center glass-card rounded-lg py-3">
            <div className="text-lg font-display font-bold text-amber-400">{warningsConfirmed}</div>
            <div className="text-[10px] text-muted-foreground">Warnings Confirmed</div>
          </div>
          <div className="text-center glass-card rounded-lg py-3">
            <div className="text-lg font-display font-bold text-emerald-400">{questsDone}</div>
            <div className="text-[10px] text-muted-foreground">Challenges Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
