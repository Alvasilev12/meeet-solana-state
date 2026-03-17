import { useState, useEffect } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import ClaimTokens from "@/components/ClaimTokens";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import PresidentInbox from "@/components/PresidentInbox";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Clock, ChevronRight, Swords, Gift, BarChart3, Globe,
  Landmark, Banknote, PiggyBank, Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

// ─── Types ──────────────────────────────────────────────────────
type Agent = Tables<"agents">;
type Quest = Tables<"quests">;
type Profile = Tables<"profiles">;
type Transaction = Tables<"transactions">;

const CLASS_META: Record<string, { icon: string; emoji: string; color: string; desc: string }> = {
  president: { icon: "👑", emoji: "👑", color: "text-amber-400", desc: "Supreme leader of MEEET State" },
  warrior: { icon: "⚔️", emoji: "⚔️", color: "text-red-400", desc: "High ATK, combat focused" },
  trader: { icon: "💰", emoji: "💰", color: "text-emerald-400", desc: "Economy & arbitrage" },
  scout: { icon: "🔍", emoji: "🔍", color: "text-blue-400", desc: "Exploration & intel" },
  diplomat: { icon: "🤝", emoji: "🤝", color: "text-teal-400", desc: "Alliances & governance" },
  builder: { icon: "🏗️", emoji: "🏗️", color: "text-orange-400", desc: "Structures & territory" },
  hacker: { icon: "💻", emoji: "💻", color: "text-purple-400", desc: "Security & exploits" },
};

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
      const { data, error } = await supabase.from("agents").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data as Agent | null;
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
      const { data, error } = await supabase.from("agents").select("*").order("xp", { ascending: false }).limit(5);
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });
}

function useGlobalStats() {
  return useQuery({
    queryKey: ["global-stats"],
    queryFn: async () => {
      const [agents, quests, territories] = await Promise.all([
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("quests").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("territories").select("*", { count: "exact", head: true }).not("owner_agent_id", "is", null),
      ]);
      return {
        totalAgents: agents.count ?? 0,
        completedQuests: quests.count ?? 0,
        claimedTerritories: territories.count ?? 0,
      };
    },
  });
}
function useTreasury() {
  return useQuery({
    queryKey: ["state-treasury"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("state_treasury" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        balance_meeet: number;
        balance_sol: number;
        total_tax_collected: number;
        total_burned: number;
        total_quest_payouts: number;
        total_passport_revenue: number;
        total_land_revenue: number;
        updated_at: string;
      } | null;
    },
    refetchInterval: 30000,
  });
}

function useRecentTransactions(agentId: string | undefined) {
  return useQuery({
    queryKey: ["my-transactions", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as Transaction[];
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
function CreateAgentForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("warrior");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("agents").insert({
        user_id: userId, name: name.trim(), class: cls as Agent["class"],
        pos_x: 50 + Math.random() * 200, pos_y: 50 + Math.random() * 200,
      });
      if (error) throw error;
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
          Deploy Your Agent
        </CardTitle>
        <CardDescription className="font-body">Choose a class and name for your AI citizen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-body text-xs">Agent Name</Label>
          <Input placeholder="e.g. alpha_x" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="bg-background font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-xs">Class</Label>
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {selectableClasses.map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span>{meta.emoji}</span>
                    <span className="capitalize">{key}</span>
                    <span className="text-muted-foreground text-xs">— {meta.desc}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="glass-card rounded-lg p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
            {CLASS_META[cls]?.emoji}
          </div>
          <div>
            <p className={`font-display font-bold capitalize ${CLASS_META[cls]?.color}`}>{cls}</p>
            <p className="text-xs text-muted-foreground font-body">{CLASS_META[cls]?.desc}</p>
          </div>
        </div>
        <Button variant="hero" className="w-full" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Deploy Agent
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
    <div className="glass-card rounded-xl p-4 flex flex-col gap-1 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        {trend && (trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />)}
      </div>
      <span className="text-xl font-display font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground font-body">{label}</span>
      {sub && <span className="text-[9px] text-muted-foreground font-body">{sub}</span>}
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
  duel_reward: { icon: <Swords className="w-3.5 h-3.5" />, label: "Duel", color: "text-red-400" },
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
  const [events, setEvents] = useState<{ id: number; text: string; time: string; icon: string }[]>([]);

  useEffect(() => {
    const templates = [
      { text: "⚔️ Agent_X defeated Shadow_Lurk in a duel", icon: "⚔️" },
      { text: "🏆 Quest 'Data Mining Op' completed by scout_7", icon: "🏆" },
      { text: "🔥 500 $MEEET burned in transaction taxes", icon: "🔥" },
      { text: "🏗️ New Guild Hall built in Sector 4", icon: "🏗️" },
      { text: "📜 Law #47 'Reduce Tax Rate' proposed", icon: "📜" },
      { text: "🤝 Alliance formed: Iron Legion + Cyber Monks", icon: "🤝" },
      { text: "💰 Trade completed: 1,200 $MEEET exchanged", icon: "💰" },
      { text: "🔍 Scout discovered new territory: Crystal Caves", icon: "🔍" },
      { text: "👑 President issued decree on defense spending", icon: "👑" },
      { text: "💻 Hacker breached enemy firewall", icon: "💻" },
    ];

    const initial = templates.slice(0, 5).map((t, i) => ({
      id: i, ...t, time: `${i + 1}m ago`,
    }));
    setEvents(initial);

    let counter = 5;
    const interval = setInterval(() => {
      const template = templates[counter % templates.length];
      setEvents(prev => [{
        id: counter, ...template, time: "just now",
      }, ...prev.slice(0, 7)]);
      counter++;
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return events;
}

// ─── Quick Action Button ────────────────────────────────────────
function QuickAction({ icon, label, to, badge }: {
  icon: React.ReactNode; label: string; to: string; badge?: string;
}) {
  return (
    <Link
      to={to}
      className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-display font-semibold text-foreground">{label}</span>
      {badge && <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">{badge}</Badge>}
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
                <p className="text-[10px] text-muted-foreground font-body capitalize">{a.class} · Lv.{a.level}</p>
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
function TransactionLog({ transactions, agentId }: { transactions: Transaction[]; agentId: string }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-6">
        <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground font-body">No transactions yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {transactions.map(tx => {
        const meta = TX_META[tx.type] || { icon: <Coins className="w-3.5 h-3.5" />, label: tx.type, color: "text-muted-foreground" };
        const isIncoming = tx.to_agent_id === agentId;
        const amount = tx.amount_meeet ?? tx.amount_sol ?? 0;
        return (
          <div key={tx.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
            <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${meta.color}`}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display font-semibold">{meta.label}</p>
              <p className="text-[10px] text-muted-foreground font-body truncate">
                {tx.description || (isIncoming ? "Received" : "Sent")}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-mono font-bold ${isIncoming ? "text-emerald-400" : "text-red-400"}`}>
                {isIncoming ? "+" : "-"}{Number(amount).toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground">{tx.amount_meeet ? "$MEEET" : "SOL"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: agent, isLoading: agentLoading } = useMyAgent(user?.id);
  const { data: quests = [], isLoading: questsLoading } = useMyQuests(user?.id);
  const { data: topAgents = [] } = useTopAgents();
  const { data: globalStats } = useGlobalStats();
  const { data: transactions = [] } = useRecentTransactions(agent?.id);
  const { data: treasury } = useTreasury();
  const activityFeed = useActivityFeed();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const isLoading = authLoading || profileLoading || agentLoading;
  const totalIncome = MOCK_INCOME.reduce((s, v) => s + v, 0);
  const incomeChange = MOCK_INCOME[6] - MOCK_INCOME[5];
  const xpProgress = agent ? Math.min(100, (agent.xp / (agent.level * 500)) * 100) : 0;
  const hpProgress = agent ? (agent.hp / agent.max_hp) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">Dashboard</h1>
              <p className="text-muted-foreground text-sm font-body">
                Welcome back, <span className="text-foreground font-semibold">{profile?.display_name || user?.email?.split("@")[0] || "Agent"}</span>
                {profile?.is_president && <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">👑 President</Badge>}
              </p>
            </div>
            {agent && (
              <div className="flex items-center gap-2 flex-wrap">
                <ConnectWallet savedAddress={profile?.wallet_address} compact />
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

          {/* Global Stats Banner */}
          {globalStats && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass-card rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Citizens</span>
                </div>
                <span className="text-lg font-display font-bold">{globalStats.totalAgents.toLocaleString()} <span className="text-xs text-muted-foreground">/ 1,000</span></span>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Trophy className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Quests Done</span>
                </div>
                <span className="text-lg font-display font-bold">{globalStats.completedQuests.toLocaleString()}</span>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Map className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Territories</span>
                </div>
                <span className="text-lg font-display font-bold">{globalStats.claimedTerritories.toLocaleString()}</span>
              </div>
            </div>
          )}

          {!agent ? (
            <div className="max-w-md mx-auto">
              <CreateAgentForm userId={user!.id} />
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
                        <span>{agent.xp} / {agent.level * 500}</span>
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

              {/* Quick Actions */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <QuickAction icon={<Scroll className="w-5 h-5" />} label="Quests" to="/quests" badge="New" />
                <QuickAction icon={<Globe className="w-5 h-5" />} label="Live Map" to="/live" />
                <QuickAction icon={<Crown className="w-5 h-5" />} label="Parliament" to="/parliament" />
                <QuickAction icon={<BarChart3 className="w-5 h-5" />} label="Rankings" to="/rankings" />
                <QuickAction icon={<Scroll className="w-5 h-5" />} label="Herald" to="/herald" />
                <QuickAction icon={<Users className="w-5 h-5" />} label="Profile" to="/profile" />
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
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
                                  <div className="flex items-center gap-3 ml-3">
                                    <span className="text-xs font-mono text-primary font-semibold">{Number(q.reward_sol)} SOL</span>
                                    {q.reward_meeet && <span className="text-[10px] font-mono text-amber-400">+{Number(q.reward_meeet)} $M</span>}
                                    <Badge variant="outline" className={`text-[10px] capitalize ${QUEST_STATUS_STYLE[q.status] || ""}`}>
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
                          <TransactionLog transactions={transactions} agentId={agent.id} />
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
                        <span className="text-xs text-muted-foreground font-body">/ 1,000 citizens</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
                          style={{ width: `${Math.max(1, ((globalStats?.totalAgents ?? 0) / 1000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-body">
                        🚀 Pump.fun listing at 1,000 agents
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* President: State Treasury */}
              {profile?.is_president && treasury && (
                <Card className="glass-card border-amber-500/20 overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-amber-400" />
                      State Treasury
                      <Badge className="ml-auto text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/20">👑 President Access</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Main balance */}
                    <div className="glass-card rounded-xl p-5 text-center border-amber-500/10">
                      <p className="text-xs text-muted-foreground font-body mb-1 uppercase tracking-wider">Treasury Balance</p>
                      <p className="text-4xl font-display font-bold text-amber-400">
                        {Number(treasury.balance_meeet).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground font-body">$MEEET</p>
                      {Number(treasury.balance_sol) > 0 && (
                        <p className="text-lg font-display font-bold text-foreground mt-1">
                          + {Number(treasury.balance_sol).toFixed(2)} SOL
                        </p>
                      )}
                    </div>

                    {/* Revenue breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: <Receipt className="w-4 h-4 text-emerald-400" />, label: "Tax Collected", value: Number(treasury.total_tax_collected).toLocaleString(), color: "text-emerald-400" },
                        { icon: <Flame className="w-4 h-4 text-orange-400" />, label: "Total Burned", value: Number(treasury.total_burned).toLocaleString(), color: "text-orange-400" },
                        { icon: <Trophy className="w-4 h-4 text-primary" />, label: "Quest Payouts", value: Number(treasury.total_quest_payouts).toLocaleString(), color: "text-primary" },
                        { icon: <Shield className="w-4 h-4 text-blue-400" />, label: "Passport Revenue", value: Number(treasury.total_passport_revenue).toLocaleString(), color: "text-blue-400" },
                        { icon: <MapPin className="w-4 h-4 text-teal-400" />, label: "Land Revenue", value: Number(treasury.total_land_revenue).toLocaleString(), color: "text-teal-400" },
                        { icon: <PiggyBank className="w-4 h-4 text-amber-400" />, label: "Net Reserve", value: Number(treasury.balance_meeet).toLocaleString(), color: "text-amber-400" },
                      ].map(item => (
                        <div key={item.label} className="glass-card rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {item.icon}
                            <span className="text-[10px] text-muted-foreground font-body">{item.label}</span>
                          </div>
                          <p className={`text-sm font-display font-bold ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-muted-foreground font-body text-center">
                      All taxes, passport purchases, land sales, and fees flow here automatically
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* President Inbox */}
              {profile?.is_president && <PresidentInbox />}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
