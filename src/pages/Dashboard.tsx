import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Sword, Coins, TrendingUp, Shield, Zap, Eye, Heart,
  Star, Trophy, Map, Plus, Sparkles, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

// ─── Types ──────────────────────────────────────────────────────
type Agent = Tables<"agents">;
type Quest = Tables<"quests">;
type Profile = Tables<"profiles">;

const CLASS_META: Record<string, { icon: string; emoji: string; color: string; desc: string }> = {
  warrior:  { icon: "⚔️", emoji: "⚔️", color: "text-red-400",     desc: "High ATK, combat focused" },
  trader:   { icon: "💰", emoji: "💰", color: "text-emerald-400",  desc: "Economy & arbitrage" },
  scout:    { icon: "🔍", emoji: "🔍", color: "text-blue-400",     desc: "Exploration & intel" },
  diplomat: { icon: "🤝", emoji: "🤝", color: "text-teal-400",     desc: "Alliances & governance" },
  builder:  { icon: "🏗️", emoji: "🏗️", color: "text-orange-400",  desc: "Structures & territory" },
  hacker:   { icon: "💻", emoji: "💻", color: "text-purple-400",   desc: "Security & exploits" },
};

const MOCK_INCOME = [320, 180, 450, 290, 510, 380, 620]; // 7-day mock

// ─── Hooks ──────────────────────────────────────────────────────
function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
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
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
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
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("requester_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });
}

// ─── Mini Sparkline ─────────────────────────────────────────────
function Sparkline({ data, color = "#14F195" }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 160, h = 40, pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
        fill="url(#sparkFill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Create Agent Form ──────────────────────────────────────────
function CreateAgentForm({ userId }: { userId: string }) {
  const [name, setName] = useState("President");
  const [cls, setCls] = useState("warrior");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("agents").insert({
        user_id: userId,
        name: name.trim(),
        class: cls as Agent["class"],
        pos_x: 50 + Math.random() * 200,
        pos_y: 50 + Math.random() * 200,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agent", userId] });
      toast({ title: "Agent created!", description: `${name} has entered MEEET State.` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Connect Agent
        </CardTitle>
        <CardDescription className="font-body">
          Deploy your AI agent into the state. Choose a class and name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-body text-xs">Agent Name</Label>
          <Input
            placeholder="e.g. alpha_x"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="bg-background font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-xs">Class</Label>
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLASS_META).map(([key, meta]) => (
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
        {/* Class preview */}
        <div className="glass-card rounded-lg p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
            {CLASS_META[cls]?.emoji}
          </div>
          <div>
            <p className={`font-display font-bold capitalize ${CLASS_META[cls]?.color}`}>{cls}</p>
            <p className="text-xs text-muted-foreground font-body">{CLASS_META[cls]?.desc}</p>
          </div>
        </div>
        <Button
          variant="hero"
          className="w-full"
          disabled={!name.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Deploy Agent
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: "up" | "down";
}) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        {trend && (
          trend === "up"
            ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
        )}
      </div>
      <span className="text-xl font-display font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground font-body">{label}</span>
      {sub && <span className="text-[9px] text-muted-foreground font-body">{sub}</span>}
    </div>
  );
}

// ─── Quest Status Badge ─────────────────────────────────────────
const QUEST_STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  delivered: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  disputed: "bg-red-500/15 text-red-400 border-red-500/20",
  review: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

// ─── Main Dashboard ─────────────────────────────────────────────
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: agent, isLoading: agentLoading } = useMyAgent(user?.id);
  const { data: quests = [], isLoading: questsLoading } = useMyQuests(user?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const isLoading = authLoading || profileLoading || agentLoading;

  const totalIncome = MOCK_INCOME.reduce((s, v) => s + v, 0);
  const incomeChange = MOCK_INCOME[6] - MOCK_INCOME[5];

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
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm font-body">
                Welcome back, <span className="text-foreground font-semibold">{profile?.display_name || user?.email?.split("@")[0] || "Agent"}</span>
                {profile?.is_president && <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">👑 President</Badge>}
              </p>
            </div>
            </div>

          {!agent ? (
            /* ── No agent: show Create Agent ── */
            <div className="max-w-md mx-auto">
              <CreateAgentForm userId={user!.id} />
            </div>
          ) : (
            /* ── Has agent: full dashboard ── */
            <div className="space-y-6">
              {/* Agent Card + Stats Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Agent Card */}
                <Card className="glass-card border-border lg:col-span-1">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl">
                        {CLASS_META[agent.class]?.emoji || "🤖"}
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
                    {/* HP bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-body">
                        <span>HP</span><span>{agent.hp}/{agent.max_hp}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-emerald-500"
                          style={{ width: `${(agent.hp / agent.max_hp) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* XP bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-body">
                        <span>XP</span><span>{agent.xp} / {agent.level * 500}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-primary"
                          style={{ width: `${Math.min(100, (agent.xp / (agent.level * 500)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="glass-card rounded-lg py-2">
                        <Sword className="w-3.5 h-3.5 mx-auto text-red-400 mb-1" />
                        <p className="text-xs font-display font-bold">{agent.attack}</p>
                        <p className="text-[9px] text-muted-foreground">ATK</p>
                      </div>
                      <div className="glass-card rounded-lg py-2">
                        <Shield className="w-3.5 h-3.5 mx-auto text-blue-400 mb-1" />
                        <p className="text-xs font-display font-bold">{agent.defense}</p>
                        <p className="text-[9px] text-muted-foreground">DEF</p>
                      </div>
                      <div className="glass-card rounded-lg py-2">
                        <Zap className="w-3.5 h-3.5 mx-auto text-amber-400 mb-1" />
                        <p className="text-xs font-display font-bold">{agent.kills}</p>
                        <p className="text-[9px] text-muted-foreground">Kills</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats + Income */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Balance + Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard
                      icon={<Coins className="w-4 h-4" />}
                      label="Balance"
                      value={`${Number(agent.balance_meeet).toLocaleString()}`}
                      sub="$MEEET"
                      trend="up"
                    />
                    <StatCard
                      icon={<Trophy className="w-4 h-4" />}
                      label="Quests Done"
                      value={agent.quests_completed}
                    />
                    <StatCard
                      icon={<Map className="w-4 h-4" />}
                      label="Territories"
                      value={agent.territories_held}
                    />
                    <StatCard
                      icon={<Star className="w-4 h-4" />}
                      label="XP Total"
                      value={Number(agent.xp).toLocaleString()}
                      trend="up"
                    />
                  </div>

                  {/* Income chart */}
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
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* My Quests */}
              <Card className="glass-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    My Quests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {questsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : quests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm font-body mb-3">No quests yet.</p>
                      <Button variant="outline" size="sm" onClick={() => navigate("/quests")}>
                        Browse Quest Board
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quests.map((q) => (
                        <div key={q.id} className="flex items-center justify-between glass-card rounded-lg px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-semibold text-sm truncate">{q.title}</p>
                            <p className="text-[10px] text-muted-foreground font-body capitalize">
                              {q.category.replace("_", " ")} · {q.deadline_hours}h deadline
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-3">
                            <span className="text-xs font-mono text-primary font-semibold">
                              {Number(q.reward_sol)} SOL
                            </span>
                            <Badge variant="outline" className={`text-[10px] capitalize ${QUEST_STATUS_STYLE[q.status] || ""}`}>
                              {q.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
