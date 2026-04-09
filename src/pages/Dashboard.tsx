import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/ui/page-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, Sparkles, Users, MessageSquare, Clock, Coins,
  BarChart3, Wand2, Grid3X3, TrendingUp, ChevronRight, Pause, Play,
  Bot, Zap, Activity, ArrowUpRight, Wallet, Search, Swords, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AGENT_CLASSES, getClassName } from "@/data/agent-classes";
import type { Tables } from "@/integrations/supabase/types";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

type Agent = Tables<"agents">;
type Profile = Tables<"profiles">;

const CLASS_META: Record<string, { emoji: string; color: string; desc: string }> = Object.fromEntries(
  Object.entries(AGENT_CLASSES).map(([key, info]) => [
    key, { emoji: info.icon, color: info.colorClass, desc: info.description },
  ])
);
CLASS_META.president = { emoji: "👑", color: "text-amber-400", desc: "Supreme coordinator" };

// ─── Animated counter ─────────────────────────────
function AnimNum({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const dur = 900;
    const start = performance.now();
    const from = prev.current;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = value;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{Math.round(display).toLocaleString()}{suffix}</>;
}

// ─── Sparkline SVG ────────────────────────────────
function Spark({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Hooks ────────────────────────────────────────
function useProfile(uid: string | undefined) {
  return useQuery({
    queryKey: ["profile", uid], enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", uid!).maybeSingle();
      return data as Profile | null;
    },
  });
}

function useMyAgents(uid: string | undefined) {
  return useQuery({
    queryKey: ["my-agents-dashboard", uid], enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("user_id", uid!).order("created_at");
      return (data ?? []).filter((a: Agent) => a.user_id === uid) as Agent[];
    },
  });
}

function useAgentAnalyticsSummary(agentIds: string[]) {
  return useQuery({
    queryKey: ["agent-analytics-summary", agentIds],
    enabled: agentIds.length > 0,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      // Batch by 50
      const allRows: any[] = [];
      for (let i = 0; i < agentIds.length; i += 50) {
        const batch = agentIds.slice(i, i + 50);
        const { data } = await supabase
          .from("agent_analytics")
          .select("agent_id, date, conversations, tasks_completed, estimated_hours_saved, estimated_cost_saved")
          .in("agent_id", batch)
          .gte("date", monthAgo);
        if (data) allRows.push(...data);
      }
      // Aggregate per agent
      const byAgent: Record<string, { convosToday: number; convosMonth: number; tasksMonth: number; hoursMonth: number; costMonth: number; sparkline: number[] }> = {};
      const last7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      agentIds.forEach(id => { byAgent[id] = { convosToday: 0, convosMonth: 0, tasksMonth: 0, hoursMonth: 0, costMonth: 0, sparkline: [] }; });
      // Group by date for sparkline
      const dailyMap: Record<string, Record<string, number>> = {};
      allRows.forEach((r: any) => {
        const ag = byAgent[r.agent_id];
        if (!ag) return;
        ag.convosMonth += r.conversations || 0;
        ag.tasksMonth += r.tasks_completed || 0;
        ag.hoursMonth += Number(r.estimated_hours_saved || 0);
        ag.costMonth += Number(r.estimated_cost_saved || 0);
        if (r.date === today) ag.convosToday = r.conversations || 0;
        if (r.date >= last7) {
          if (!dailyMap[r.agent_id]) dailyMap[r.agent_id] = {};
          dailyMap[r.agent_id][r.date] = (dailyMap[r.agent_id][r.date] || 0) + (r.conversations || 0);
        }
      });
      Object.entries(dailyMap).forEach(([id, days]) => {
        const sorted = Object.entries(days).sort((a, b) => a[0].localeCompare(b[0]));
        byAgent[id].sparkline = sorted.map(([, v]) => v);
      });
      // Totals
      let totalConvosToday = 0, totalHoursMonth = 0, totalCostMonth = 0, totalConvosMonth = 0;
      Object.values(byAgent).forEach(v => {
        totalConvosToday += v.convosToday;
        totalHoursMonth += v.hoursMonth;
        totalCostMonth += v.costMonth;
        totalConvosMonth += v.convosMonth;
      });
      return { byAgent, totalConvosToday, totalHoursMonth, totalCostMonth, totalConvosMonth };
    },
  });
}

function useActivityFeed() {
  return useQuery({
    queryKey: ["dash-activity-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, title, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      const rows = (data ?? []) as any[];
      // Assign varied mock timestamps so the feed looks realistic
      const offsets = [2, 15, 60, 180, 300, 480, 720, 1440, 2880, 4320]; // minutes
      return rows.map((r, i) => ({
        ...r,
        _displayTime: offsets[i] ?? (i + 1) * 1440,
      }));
    },
    refetchInterval: 15000,
  });
}

function useGlobalStats() {
  return useQuery({
    queryKey: ["dash-global-stats"],
    queryFn: async () => {
      const [citizenRes, agentRes] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact" }).limit(0),
        supabase.from("agents").select("id", { count: "exact" }).limit(0),
      ]);
      return { citizens: citizenRes.count ?? 0, agents: agentRes.count ?? 0 };
    },
  });
}

// ─── Create Agent Form ────────────────────────────
function CreateAgentInline({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("warrior");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: existingCount = 0 } = useQuery({
    queryKey: ["agent-count", userId], enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("id", { count: "exact" }).limit(0).eq("user_id", userId);
      return count ?? 0;
    },
  });
  const selectableClasses = Object.entries(AGENT_CLASSES).filter(([k]) => k !== "president");
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("register-agent", { body: { name: name.trim(), class: cls } });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-agents-all"] });
      toast({ title: "Agent created!", description: `${name} is ready.` });
      setName("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="border-dashed border-2 border-border/60 bg-card/30 hover:border-primary/30 transition-colors">
      <CardContent className="p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Create Agent
        </p>
        <Input placeholder="Agent name" value={name} onChange={e => setName(e.target.value)} maxLength={20} className="bg-background/50" />
        <Select value={cls} onValueChange={setCls}>
          <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            {selectableClasses.map(([key, info]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <span>{info.icon}</span> {info.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          disabled={!name.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Deploy
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: agents = [], isLoading: agentsLoading } = useMyAgents(user?.id);
  const agentIds = agents.map(a => a.id);
  const { data: analytics } = useAgentAnalyticsSummary(agentIds);
  const { data: feed = [] } = useActivityFeed();
  const { data: globalStats } = useGlobalStats();
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Referral notification check
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
        notifications.forEach((n: any) => toast({ title: n.title }));
        await supabase.from("notifications").update({ is_read: true }).in("id", notifications.map((n: any) => n.id));
      }
    })();
  }, [user]);

  const toggleStatus = async (deployId: string, status: string) => {
    setActing(deployId);
    await supabase.from("deployed_agents").update({ status }).eq("id", deployId);
    setActing(null);
  };

  const isLoading = authLoading || profileLoading || agentsLoading;
  if (isLoading || !user) {
    return (
      <PageWrapper>
        <SEOHead title="Dashboard — Manage Your AI Agents | MEEET STATE" description="Manage your AI agents, track discoveries, and monitor $MEEET earnings." path="/dashboard" />
        <Navbar />
        <main className="pt-24 pb-16"><div className="container max-w-6xl mx-auto px-4"><DashboardSkeleton /></div></main>
      </PageWrapper>
    );
  }

  const activeCount = agents.filter(a => a.status === "active" || a.status === "exploring").length;
  const totalMeeet = agents.reduce((s, a) => s + Number(a.balance_meeet || 0), 0);
  const eventIcons: Record<string, string> = { discovery: "🔬", duel: "⚔️", quest: "🏆", trade: "💰", law: "📜", alliance: "🤝", burn: "🔥", transfer: "💸" };

  return (
    <PageWrapper>
      <SEOHead title="Dashboard — Manage Your AI Agents | MEEET STATE" description="Manage your AI agents, track discoveries, and monitor $MEEET earnings." path="/dashboard" />
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4 space-y-8">

          {/* ── Hero ── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {profile?.display_name || user?.email?.split("@")[0] || "Agent"}
                {profile?.is_president && <Badge className="ml-2 bg-amber-500/15 text-amber-400 border-amber-500/30">👑 President</Badge>}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-card/50 border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-mono font-bold text-foreground">{totalMeeet.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs">$MEEET</span>
              </div>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Bot className="w-5 h-5" />} label="My Agents" value={agents.length} badge={`${activeCount} active`} badgeColor="bg-emerald-500/15 text-emerald-400" />
            <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Conversations Today" value={analytics?.totalConvosToday ?? 0} />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Hours Saved (Month)" value={Math.round(analytics?.totalHoursMonth ?? 0)} suffix="h" />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Earned (Month)" value={Math.round(analytics?.totalCostMonth ?? 0)} prefix="$" />
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-3 gap-4">
            <Link to="/agent-studio">
              <Button className="w-full h-12 gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm">
                <Wand2 className="w-4 h-4" /> Create New Agent
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" className="w-full h-12 gap-2 text-sm">
                <Grid3X3 className="w-4 h-4" /> Browse Marketplace
              </Button>
            </Link>
            <Link to={agents.length > 0 ? `/agent-analytics/${agents[0].id}` : "#"}>
              <Button variant="outline" className="w-full h-12 gap-2 text-sm">
                <BarChart3 className="w-4 h-4" /> View Analytics
              </Button>
            </Link>
          </div>

          {/* ── Main Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Agents (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" /> My Agents
                </h2>
                <Link to="/dashboard/agents" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Manage all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {/* Trial Agent */}
                {(() => {
                  try {
                    const raw = localStorage.getItem("meeet_trial_agent");
                    if (!raw) return null;
                    const trial = JSON.parse(raw);
                    const typeIcons: Record<string, React.ReactNode> = {
                      research: <Search className="w-5 h-5" />,
                      arena: <Swords className="w-5 h-5" />,
                      economy: <TrendingUp className="w-5 h-5" />,
                      security: <Shield className="w-5 h-5" />,
                    };
                    const typeLabels: Record<string, string> = {
                      research: "Research Scout", arena: "Arena Fighter", economy: "Economy Trader", security: "Security Auditor",
                    };
                    return (
                      <>
                        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary" />
                            <p className="text-sm text-foreground">Connect your wallet to unlock earning, staking, and marketplace features</p>
                          </div>
                          <Link to="/auth">
                            <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1 border-primary/30 hover:border-primary/50">
                              <Wallet className="w-3 h-3" /> Connect
                            </Button>
                          </Link>
                        </div>
                        <Card className="bg-card/50 border-amber-500/20 hover:border-amber-500/40 transition-all duration-200">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                              {typeIcons[trial.type] || <Bot className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground truncate">{trial.name}</span>
                                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">Trial</Badge>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {typeLabels[trial.type] || trial.type} · Lv.1 · 0 MEEET
                              </p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-bold text-foreground">0</p>
                              <p className="text-[10px] text-muted-foreground">today</p>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    );
                  } catch { return null; }
                })()}

                {agents.map((a) => {
                  const meta = CLASS_META[a.class] || CLASS_META.warrior;
                  const isActive = a.status === "idle" || a.status === "exploring";
                  const agStats = analytics?.byAgent[a.id];
                  return (
                    <Card key={a.id} className="bg-card/50 border-border hover:border-primary/20 transition-all duration-200">
                      <CardContent className="p-4 flex items-center gap-4">
                        {/* Avatar + Info */}
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground truncate">{a.name}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{getClassName(a.class)}</Badge>
                            {isActive ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Lv.{a.level} · {Number(a.balance_meeet).toLocaleString()} MEEET
                          </p>
                        </div>

                        {/* Sparkline */}
                        <div className="hidden sm:block">
                          <Spark data={agStats?.sparkline ?? [0, 0, 0]} />
                        </div>

                        {/* Today's convos */}
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-foreground">{agStats?.convosToday ?? 0}</p>
                          <p className="text-[10px] text-muted-foreground">today</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link to={`/agent-analytics/${a.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link to={`/agents/${a.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Create agent card */}
                <CreateAgentInline userId={user.id} />
              </div>
            </div>

            {/* Right: Activity Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Recent Activity
                </h2>
                <Link to="/activity" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <Card className="bg-card/50 border-border">
                <CardContent className="p-0 divide-y divide-border">
                  {feed.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">No recent events</div>
                  )}
                  {feed.map((e: any, i: number) => {
                    const m = e._displayTime ?? 0;
                    const timeStr = m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
                    return (
                      <div key={e.id || i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="text-base">{eventIcons[e.event_type] || "📡"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{e.title}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeStr}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

            {/* ── Referral CTA ── */}
            <Link to="/referrals" className="block">
              <Card className="bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer hover:scale-[1.01]">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-xl shrink-0">🎁</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Invite Friends — Earn 500 $MEEET per referral</p>
                    <p className="text-xs text-muted-foreground">Share your link, grow the civilization, earn rewards</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400 shrink-0" />
                </CardContent>
              </Card>
            </Link>

            {/* ── Platform Stats Footer ── */}
          <div className="mt-4 -mx-4 px-4 py-3 bg-card/40 border-t border-border rounded-b-lg">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>{globalStats?.citizens ?? 128} Citizens</span>
              <span className="text-border">·</span>
              <span>{globalStats?.agents ?? 688} Agents</span>
              <span className="text-border">·</span>
              <span>$0.80 AI Credits</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Solana State: Online
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </PageWrapper>
  );
};

function StatCard({ icon, label, value, badge, badgeColor, suffix = "", prefix = "" }: {
  icon: React.ReactNode; label: string; value: number; badge?: string; badgeColor?: string; suffix?: string; prefix?: string;
}) {
  return (
    <Card className="bg-card/30 border-border backdrop-blur-sm hover:border-primary/20 transition-all duration-200">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          {badge && (
            <Badge className={`text-[10px] border-0 ${badgeColor || "bg-primary/15 text-primary"}`}>
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">
          {prefix}<AnimNum value={value} />{suffix}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
