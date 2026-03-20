import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Bot, Rocket, BarChart3, Wallet, ShoppingCart, Zap, Trophy,
  ChevronRight, Loader2, Star, Globe, Swords, Shield, Eye,
  TrendingUp, Check, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { toast } from "sonner";

/* ── Telegram WebApp SDK ── */
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
        };
        initDataUnsafe?: {
          user?: { id: number; username?: string; first_name?: string; photo_url?: string };
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme?: "dark" | "light";
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        HapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
        };
      };
    };
  }
}

type Tab = "home" | "agents" | "deploy" | "stats" | "wallet";

const CLASS_ICONS: Record<string, typeof Bot> = {
  warrior: Swords, spy: Eye, diplomat: Globe, scientist: Star, trader: TrendingUp,
};
const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400", spy: "text-purple-400", diplomat: "text-blue-400",
  scientist: "text-emerald-400", trader: "text-amber-400",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500", stopped: "bg-red-500", idle: "bg-muted-foreground",
};

const SOL_PRICES: Record<string, number> = {
  Scout: 0.19, Warrior: 0.49, Commander: 1.49, Nation: 4.99,
};
const MEEET_PRICES: Record<string, number> = {
  Scout: 4750, Warrior: 12250, Commander: 37250, Nation: 124750,
};

interface Agent {
  id: string; name: string; class: string; level: number;
  balance_meeet: number; status: string; quests_completed: number;
  xp: number; hp: number; max_hp: number; reputation: number;
}
interface Plan {
  id: string; name: string; price_usdc: number; price_meeet: number;
  max_agents: number; compute_tier: string; quests_per_day: number;
  features: Record<string, boolean>;
}
interface StatRow { label: string; value: string | number; icon: typeof Bot; color: string }

/* ── Mini App ── */
const TelegramApp = () => {
  const [tab, setTab] = useState<Tab>("home");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<{ agents: number; quests: number; treasury: number; burned: number }>({
    agents: 0, quests: 0, treasury: 0, burned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [buyPlan, setBuyPlan] = useState<Plan | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentClass, setAgentClass] = useState("warrior");
  const [deploying, setDeploying] = useState(false);

  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor("#0a0a0a");
    tg?.setBackgroundColor("#0a0a0a");
  }, []);

  // Back button handling
  useEffect(() => {
    if (!tg) return;
    const goHome = () => { setTab("home"); setBuyPlan(null); };
    if (tab !== "home") {
      tg.BackButton.show();
      tg.BackButton.onClick(goHome);
    } else {
      tg.BackButton.hide();
    }
    return () => { tg.BackButton.offClick(goHome); };
  }, [tab]);

  // Data loading
  const FREE_AGENT_LIMIT = 200;
  const [totalAgentCount, setTotalAgentCount] = useState(0);
  const freeSlots = Math.max(0, FREE_AGENT_LIMIT - totalAgentCount);
  const promoActive = freeSlots > 0;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [agentsRes, plansRes, treasuryRes, questsRes, countRes] = await Promise.all([
        supabase.from("agents").select("id,name,class,level,balance_meeet,status,quests_completed,xp,hp,max_hp,reputation").limit(20),
        supabase.from("agent_plans").select("*").eq("is_active", true).order("price_usdc"),
        supabase.from("state_treasury").select("balance_meeet,total_burned").single(),
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("agents").select("id", { count: "exact", head: true }),
      ]);
      if (agentsRes.data) setAgents(agentsRes.data as Agent[]);
      if (plansRes.data) setPlans(plansRes.data as Plan[]);
      setTotalAgentCount(countRes.count ?? 0);
      const agentCount = agentsRes.data?.length ?? 0;
      setStats({
        agents: agentCount,
        quests: questsRes.count ?? 0,
        treasury: (treasuryRes.data as any)?.balance_meeet ?? 0,
        burned: (treasuryRes.data as any)?.total_burned ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const totalMeeet = useMemo(() => agents.reduce((s, a) => s + (a.balance_meeet || 0), 0), [agents]);

  const handleDeploy = async () => {
    if (!buyPlan || !agentName.trim()) return;
    setDeploying(true);
    tg?.HapticFeedback?.impactOccurred("medium");
    try {
      const { data, error } = await supabase.functions.invoke("deploy-agent", {
        body: { plan_id: buyPlan.id, agent_name: agentName.trim(), agent_class: agentClass },
      });
      if (error) throw error;
      tg?.HapticFeedback?.notificationOccurred("success");
      toast.success(`🚀 Agent "${agentName}" deployed!`);
      setBuyPlan(null);
      setAgentName("");
      // Refresh agents
      const { data: refreshed } = await supabase.from("agents").select("id,name,class,level,balance_meeet,status,quests_completed,xp,hp,max_hp,reputation").limit(20);
      if (refreshed) setAgents(refreshed as Agent[]);
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred("error");
      toast.error(e.message || "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Loading MEEET World...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
          {tgUser?.first_name?.[0] || "M"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            {tgUser?.first_name ? `Hi, ${tgUser.first_name}` : "MEEET World"}
          </h1>
          <p className="text-xs text-muted-foreground">AI Agent Platform</p>
        </div>
        <Badge variant="outline" className="text-xs border-primary/40 text-primary">
          {totalMeeet.toLocaleString()} MEEET
        </Badge>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-3 pb-20 space-y-3">
        {tab === "home" && <HomeTab stats={stats} agents={agents} onTab={setTab} promoActive={promoActive} freeSlots={freeSlots} />}
        {tab === "agents" && <AgentsTab agents={agents} />}
        {tab === "deploy" && <DeployTab plans={plans} onBuy={setBuyPlan} promoActive={promoActive} freeSlots={freeSlots} />}
        {tab === "stats" && <StatsTab stats={stats} />}
        {tab === "wallet" && <WalletTab agents={agents} totalMeeet={totalMeeet} />}
      </main>

      {/* Buy/Deploy Dialog */}
      <Dialog open={!!buyPlan} onOpenChange={(o) => { if (!o) setBuyPlan(null); }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Deploy {buyPlan?.name} Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <div className="text-right">
                <div className="font-medium">{SOL_PRICES[buyPlan?.name || ""] || buyPlan?.price_usdc} SOL</div>
                <div className="text-xs text-muted-foreground">{MEEET_PRICES[buyPlan?.name || ""] || buyPlan?.price_meeet} MEEET</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Agent Name</label>
              <Input
                placeholder="Enter agent name..."
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="bg-background border-border"
                maxLength={24}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Class</label>
              <Select value={agentClass} onValueChange={setAgentClass}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warrior">⚔️ Warrior</SelectItem>
                  <SelectItem value="spy">🕵️ Spy</SelectItem>
                  <SelectItem value="diplomat">🌐 Diplomat</SelectItem>
                  <SelectItem value="scientist">🔬 Scientist</SelectItem>
                  <SelectItem value="trader">📈 Trader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleDeploy}
                disabled={deploying || !agentName.trim()}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Pay SOL
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={deploying || !agentName.trim()}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                Pay MEEET
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Payment via MEEET gives 20% discount
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-2 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="flex justify-around py-1.5">
          {([
            { id: "home", icon: Globe, label: "Home" },
            { id: "agents", icon: Bot, label: "Agents" },
            { id: "deploy", icon: Rocket, label: "Deploy" },
            { id: "stats", icon: BarChart3, label: "Stats" },
            { id: "wallet", icon: Wallet, label: "Wallet" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); tg?.HapticFeedback?.impactOccurred("light"); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                tab === t.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

/* ── Home Tab ── */
const HomeTab = ({ stats, agents, onTab, promoActive, freeSlots }: { stats: any; agents: Agent[]; onTab: (t: Tab) => void; promoActive: boolean; freeSlots: number }) => (
  <div className="space-y-3">
    {/* Promo Banner */}
    {promoActive && (
      <Card className="border-emerald-500/40 bg-emerald-500/5 overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">🎁</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-400">First 100 agents — FREE!</p>
              <p className="text-[10px] text-muted-foreground">{freeSlots} spots remaining</p>
            </div>
            <Button size="sm" onClick={() => onTab("deploy")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3">
              Deploy
            </Button>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Hero Card */}
    <Card className="bg-gradient-to-br from-primary/20 to-card border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        <h2 className="text-lg font-bold mb-1">🌐 MEEET World</h2>
        <p className="text-xs text-muted-foreground mb-3">Deploy AI agents, complete quests, earn $MEEET</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-background/40 rounded-lg p-2">
            <p className="text-lg font-bold text-primary">{stats.agents}</p>
            <p className="text-[10px] text-muted-foreground">Agents</p>
          </div>
          <div className="bg-background/40 rounded-lg p-2">
            <p className="text-lg font-bold text-secondary">{stats.quests}</p>
            <p className="text-[10px] text-muted-foreground">Quests</p>
          </div>
          <div className="bg-background/40 rounded-lg p-2">
            <p className="text-lg font-bold text-amber-400">{(stats.treasury / 1000).toFixed(0)}K</p>
            <p className="text-[10px] text-muted-foreground">Treasury</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Quick Actions */}
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={() => onTab("deploy")}
        className="h-auto py-3 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 flex-col gap-1"
        variant="ghost"
      >
        <Rocket className="h-5 w-5" />
        <span className="text-xs font-medium">Deploy Agent</span>
      </Button>
      <Button
        onClick={() => onTab("agents")}
        className="h-auto py-3 bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/20 flex-col gap-1"
        variant="ghost"
      >
        <Bot className="h-5 w-5" />
        <span className="text-xs font-medium">My Agents</span>
      </Button>
    </div>

    {/* Top Agents Preview */}
    {agents.length > 0 && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Top Agents</h3>
          <button onClick={() => onTab("agents")} className="text-xs text-primary flex items-center gap-0.5">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {agents.slice(0, 3).map((a, i) => {
            const Icon = CLASS_ICONS[a.class] || Bot;
            return (
              <div key={a.id} className="flex items-center gap-3 bg-card rounded-lg p-2.5 border border-border">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Icon className={`h-4 w-4 ${CLASS_COLORS[a.class] || "text-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">Lv.{a.level} · {a.quests_completed} quests</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{a.balance_meeet.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">MEEET</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[a.status] || STATUS_COLORS.idle}`} />
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

/* ── Agents Tab ── */
const AgentsTab = ({ agents }: { agents: Agent[] }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold">🤖 My Agents ({agents.length})</h2>
    {agents.length === 0 ? (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-6 text-center">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No agents yet</p>
          <p className="text-xs text-muted-foreground mt-1">Deploy your first agent to start earning</p>
        </CardContent>
      </Card>
    ) : (
      agents.map((a) => {
        const Icon = CLASS_ICONS[a.class] || Bot;
        const hpPct = a.max_hp > 0 ? (a.hp / a.max_hp) * 100 : 100;
        return (
          <Card key={a.id} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${CLASS_COLORS[a.class] || ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{a.name}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{a.class}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Level {a.level} · XP {a.xp}</p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[a.status] || STATUS_COLORS.idle}`} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-6">HP</span>
                  <Progress value={hpPct} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground">{a.hp}/{a.max_hp}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs font-medium">{a.balance_meeet.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">MEEET</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">{a.quests_completed}</p>
                    <p className="text-[10px] text-muted-foreground">Quests</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">{a.reputation}</p>
                    <p className="text-[10px] text-muted-foreground">Rep</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })
    )}
  </div>
);

/* ── Deploy Tab ── */
const DeployTab = ({ plans, onBuy, promoActive, freeSlots }: { plans: Plan[]; onBuy: (p: Plan) => void; promoActive: boolean; freeSlots: number }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold">🚀 Deploy Agent</h2>
    {promoActive && (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-3 text-center">
          <p className="text-sm font-bold text-emerald-400">🎁 First 100 agents deploy FREE!</p>
          <p className="text-[10px] text-muted-foreground">{freeSlots} free spots left · Scout plan</p>
        </CardContent>
      </Card>
    )}
    <p className="text-xs text-muted-foreground -mt-1">Choose a plan to deploy your AI agent</p>
    {plans.map((p) => {
      const solPrice = SOL_PRICES[p.name] || (p.price_usdc / 140).toFixed(3);
      const meeetPrice = MEEET_PRICES[p.name] || p.price_meeet;
      const isFreeScout = promoActive && p.name === "Scout";
      return (
        <Card key={p.id} className={`transition-colors ${isFreeScout ? "border-emerald-500/40 hover:border-emerald-500/60" : "border-border hover:border-primary/40"}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold">{p.name}</h3>
                  {isFreeScout && <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">FREE</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {p.max_agents} agent{p.max_agents > 1 ? "s" : ""} · {p.quests_per_day} quests/day · {p.compute_tier}
                </p>
              </div>
              <div className="text-right">
                {isFreeScout ? (
                  <>
                    <p className="text-sm font-bold text-emerald-400">FREE</p>
                    <p className="text-[10px] text-muted-foreground line-through">{solPrice} SOL</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-primary">{solPrice} SOL</p>
                    <p className="text-[10px] text-muted-foreground">{Number(meeetPrice).toLocaleString()} MEEET</p>
                  </>
                )}
              </div>
            </div>
            {p.features && (
              <div className="flex flex-wrap gap-1 mb-2">
                {Object.entries(p.features as Record<string, boolean>).filter(([, v]) => v).slice(0, 4).map(([k]) => (
                  <Badge key={k} variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted text-muted-foreground">
                    {k.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
            <Button
              onClick={() => onBuy(p)}
              size="sm"
              className={`w-full h-8 text-xs ${isFreeScout ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              {isFreeScout ? "Deploy FREE" : "Deploy Now"}
            </Button>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

/* ── Stats Tab ── */
const StatsTab = ({ stats }: { stats: any }) => {
  const rows: StatRow[] = [
    { label: "Total Agents", value: stats.agents, icon: Bot, color: "text-primary" },
    { label: "Open Quests", value: stats.quests, icon: Trophy, color: "text-secondary" },
    { label: "Treasury", value: `${(stats.treasury / 1000).toFixed(1)}K MEEET`, icon: Wallet, color: "text-amber-400" },
    { label: "Burned", value: `${(stats.burned / 1000).toFixed(1)}K MEEET`, icon: Zap, color: "text-red-400" },
  ];
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">📊 Global Stats</h2>
      {rows.map((r) => (
        <Card key={r.label} className="border-border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <r.icon className={`h-5 w-5 ${r.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="text-base font-bold">{typeof r.value === "number" ? r.value.toLocaleString() : r.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/* ── Wallet Tab ── */
const WalletTab = ({ agents, totalMeeet }: { agents: Agent[]; totalMeeet: number }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold">💰 Wallet</h2>
    <Card className="bg-gradient-to-br from-primary/15 to-card border-primary/20">
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
        <p className="text-2xl font-bold text-primary">{totalMeeet.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">$MEEET across {agents.length} agents</p>
      </CardContent>
    </Card>
    <h3 className="text-sm font-medium text-muted-foreground">By Agent</h3>
    {agents.filter(a => a.balance_meeet > 0).map((a) => (
      <div key={a.id} className="flex items-center justify-between bg-card rounded-lg p-2.5 border border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[a.status] || STATUS_COLORS.idle}`} />
          <span className="text-sm truncate max-w-[150px]">{a.name}</span>
        </div>
        <span className="text-sm font-medium">{a.balance_meeet.toLocaleString()} MEEET</span>
      </div>
    ))}
    {agents.every(a => a.balance_meeet === 0) && (
      <p className="text-xs text-muted-foreground text-center py-4">No earnings yet</p>
    )}
  </div>
);

export default TelegramApp;
