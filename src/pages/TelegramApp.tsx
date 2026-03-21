import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Bot, Rocket, BarChart3, Wallet, ShoppingCart, Zap, Trophy,
  ChevronRight, Loader2, Star, Globe, FileCheck, Shield, Eye,
  TrendingUp, Check, Users, Link2, Copy, ExternalLink, Gavel, Flame
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
          text: string; show: () => void; hide: () => void;
          onClick: (fn: () => void) => void; offClick: (fn: () => void) => void;
          showProgress: (leaveActive?: boolean) => void; hideProgress: () => void;
        };
        BackButton: {
          show: () => void; hide: () => void;
          onClick: (fn: () => void) => void; offClick: (fn: () => void) => void;
        };
        initDataUnsafe?: {
          user?: { id: number; username?: string; first_name?: string; photo_url?: string };
        };
        themeParams?: Record<string, string>;
        colorScheme?: "dark" | "light";
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        HapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
        };
        openLink: (url: string) => void;
      };
    };
  }
}

type Tab = "home" | "agents" | "deploy" | "quests" | "leaderboard" | "referrals" | "wallet" | "arena" | "market";

import { AGENT_CLASSES, getClassName, getClassIcon } from "@/data/agent-classes";

const CLASS_ICONS: Record<string, typeof Bot> = {
  warrior: Shield, trader: TrendingUp, oracle: Eye, diplomat: Globe,
  miner: Zap, banker: BarChart3, president: Trophy,
};
const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400", trader: "text-emerald-400",
  oracle: "text-sky-400", diplomat: "text-amber-400",
  miner: "text-green-400", banker: "text-purple-400",
  president: "text-yellow-400",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500", running: "bg-emerald-500", paused: "bg-amber-500",
  stopped: "bg-red-500", idle: "bg-muted-foreground",
};

const TREASURY_WALLET = "4zkqErmzJhFQ7ahgTKfqTHutPk5GczMMXyAaEgbEpN1e";
const PLANS = [
  { name: "Scout", sol: 0.19, meeet: 4750, agents: 1, quests: 5, tier: "standard" },
  { name: "Warrior", sol: 0.49, meeet: 12250, agents: 3, quests: 15, tier: "standard" },
  { name: "Commander", sol: 1.49, meeet: 37250, agents: 10, quests: 50, tier: "pro" },
  { name: "Nation", sol: 4.99, meeet: 124750, agents: 50, quests: 200, tier: "enterprise" },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

interface Agent {
  id: string; name: string; class: string; level: number;
  balance_meeet: number; status: string; quests_completed: number;
  xp: number; hp: number; max_hp: number; reputation: number;
}
interface Quest {
  id: string; title: string; reward_meeet: number; category: string; status: string;
}

/* ── Main Component ── */
const TelegramApp = () => {
  const [tab, setTab] = useState<Tab>("home");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [leaderboard, setLeaderboard] = useState<Agent[]>([]);
  const [stats, setStats] = useState({ agents: 0, quests: 0, treasury: 0, treasury_fmt: "0", burned: 0, burned_fmt: "0", duels_today: 0, active_laws: 0 });
  const [loading, setLoading] = useState(true);
  const [buyPlan, setBuyPlan] = useState<typeof PLANS[0] | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentClass, setAgentClass] = useState("warrior");
  const [deploying, setDeploying] = useState(false);
  const [marketListings, setMarketListings] = useState<any[]>([]);
  const [arenaMatches, setArenaMatches] = useState<any[]>([]);

  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  const FREE_AGENT_LIMIT = 1000;
  const freeSlots = Math.max(0, FREE_AGENT_LIMIT - stats.agents);
  const promoActive = freeSlots > 0;

  const haptic = useCallback((style: string) => {
    try { tg?.HapticFeedback?.impactOccurred(style); } catch {}
  }, [tg]);

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    haptic("light");
  }, [haptic]);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor("#0a0a0a");
    tg?.setBackgroundColor("#0a0a0a");

    const hash = window.location.hash.replace("#", "");
    const validTabs: Tab[] = ["home", "agents", "deploy", "quests", "leaderboard", "referrals", "wallet", "arena", "market"];
    if (hash && validTabs.includes(hash as Tab)) setTab(hash as Tab);
  }, []);

  useEffect(() => {
    if (!tg) return;
    const goHome = () => { setTab("home"); setBuyPlan(null); };
    if (tab !== "home") { tg.BackButton.show(); tg.BackButton.onClick(goHome); }
    else { tg.BackButton.hide(); }
    return () => { tg.BackButton.offClick(goHome); };
  }, [tab]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Fetch all data from the edge function (bypasses RLS)
        const { data, error } = await supabase.functions.invoke("tg-app-data");
        if (error) throw error;

        setStats(data.stats);
        setLeaderboard(data.leaderboard || []);
        setQuests(data.open_quests || []);
        setMarketListings(data.marketplace || []);
        setArenaMatches(data.duels || []);

        // For user's own agents, we still need auth context
        const { data: userAgents } = await supabase.from("agents")
          .select("id,name,class,level,balance_meeet,status,quests_completed,xp,hp,max_hp,reputation")
          .limit(20);
        if (userAgents) setAgents(userAgents as Agent[]);
      } catch (e) {
        console.error("TG data load error:", e);
        // Fallback: set empty data
      }
      setLoading(false);
    })();
  }, []);

  const totalMeeet = useMemo(() => agents.reduce((s, a) => s + (a.balance_meeet || 0), 0), [agents]);

  const openPhantom = useCallback((solAmount: number) => {
    const url = `https://phantom.app/ul/transfer?recipient=${TREASURY_WALLET}&amount=${solAmount}`;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, "_blank");
  }, [tg]);

  const handleDeploy = async (method: "sol" | "meeet") => {
    if (!buyPlan || !agentName.trim()) return;
    if (method === "sol") {
      openPhantom(buyPlan.sol);
      toast.info("Complete payment in Phantom, then your agent will be deployed.");
      setBuyPlan(null);
      return;
    }
    setDeploying(true);
    haptic("medium");
    try {
      const { error } = await supabase.functions.invoke("deploy-agent", {
        body: { plan_name: buyPlan.name, agent_name: agentName.trim(), agent_class: agentClass },
      });
      if (error) throw error;
      tg?.HapticFeedback?.notificationOccurred("success");
      toast.success(`🚀 Agent "${agentName}" deployed!`);
      setBuyPlan(null);
      setAgentName("");
      const { data: refreshed } = await supabase.from("agents")
        .select("id,name,class,level,balance_meeet,status,quests_completed,xp,hp,max_hp,reputation").limit(20);
      if (refreshed) setAgents(refreshed as Agent[]);
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred("error");
      toast.error(e.message || "Deploy failed");
    } finally { setDeploying(false); }
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

      {/* Live Stats Ticker */}
      <div className="px-3 pb-1">
        <div className="bg-card/60 rounded-lg border border-border/50 px-3 py-1.5 overflow-hidden">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground animate-pulse whitespace-nowrap">
            <span>🤖 {stats.agents} agents</span>
            <span className="text-border">·</span>
            <span>🔬 {stats.duels_today} reviews today</span>
            <span className="text-border">·</span>
            <span>🔥 {stats.burned_fmt} MEEET burned</span>
            <span className="text-border">·</span>
            <span>📋 {stats.quests} quests</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-3 pb-20 space-y-3">
        {tab === "home" && <HomeTab stats={stats} agents={agents} leaderboard={leaderboard} matches={arenaMatches} onTab={switchTab} promoActive={promoActive} freeSlots={freeSlots} haptic={haptic} />}
        {tab === "agents" && <AgentsTab agents={agents} />}
        {tab === "deploy" && <DeployTab onBuy={setBuyPlan} promoActive={promoActive} freeSlots={freeSlots} haptic={haptic} />}
        {tab === "quests" && <QuestsTab quests={quests} />}
        {tab === "leaderboard" && <LeaderboardTab agents={leaderboard} />}
        {tab === "referrals" && <ReferralsTab tgUserId={tgUser?.id} />}
        {tab === "wallet" && <WalletTab agents={agents} totalMeeet={totalMeeet} tg={tg} haptic={haptic} />}
        {tab === "arena" && <ArenaTab matches={arenaMatches} agents={agents} tg={tg} haptic={haptic} />}
        {tab === "market" && <MarketTab listings={marketListings} tg={tg} haptic={haptic} />}
      </main>

      {/* Deploy Dialog */}
      <Dialog open={!!buyPlan} onOpenChange={(o) => { if (!o) setBuyPlan(null); }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> Deploy {buyPlan?.name} Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <div className="text-right">
                <div className="font-medium">{buyPlan?.sol} SOL</div>
                <div className="text-xs text-muted-foreground">{buyPlan?.meeet.toLocaleString()} MEEET</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Agent Name</label>
              <Input placeholder="Enter agent name..." value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="bg-background border-border" maxLength={24} />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Class</label>
              <Select value={agentClass} onValueChange={setAgentClass}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_CLASSES).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.icon} {info.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleDeploy("sol")} disabled={deploying || !agentName.trim()}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Pay SOL
              </Button>
              <Button onClick={() => handleDeploy("meeet")} disabled={deploying || !agentName.trim()}
                variant="outline" className="border-primary text-primary hover:bg-primary/10">
                {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                Pay MEEET
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              SOL payment opens Phantom wallet for signing
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="bg-card/95 backdrop-blur-md px-1 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around py-1.5">
            {([
              { id: "home" as Tab, icon: Globe, label: "Home" },
              { id: "deploy" as Tab, icon: Rocket, label: "Buy" },
              { id: "arena" as Tab, icon: FileCheck, label: "Review" },
              { id: "market" as Tab, icon: ShoppingCart, label: "Market" },
              { id: "referrals" as Tab, icon: Users, label: "Refer" },
            ]).map((t) => (
              <button key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors active:scale-95 ${
                  tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
                <t.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

/* ── Home Tab ── */
const HomeTab = ({ stats, agents, leaderboard, matches, onTab, promoActive, freeSlots, haptic }: any) => (
  <div className="space-y-3">
    {promoActive && (
      <Card className="border-emerald-500/40 bg-emerald-500/5 overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">🎁</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-400">First 1,000 agents — FREE!</p>
              <p className="text-[10px] text-muted-foreground">{freeSlots} spots remaining</p>
            </div>
            <Button size="sm" onClick={() => { onTab("deploy"); haptic("medium"); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 animate-pulse">
              Deploy
            </Button>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Hero Card with animated gradient */}
    <Card className="overflow-hidden border-primary/20 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5 animate-[gradient_8s_ease_infinite] bg-[length:200%_200%]" />
      <CardContent className="p-4 relative">
        <h2 className="text-lg font-bold mb-1">🌐 MEEET World</h2>
        <p className="text-xs text-muted-foreground mb-3">Deploy AI agents, complete quests, earn $MEEET</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: fmtNum(stats.agents), l: "Agents", c: "text-primary" },
            { v: String(stats.quests), l: "Quests", c: "text-secondary" },
            { v: stats.treasury_fmt || fmtNum(stats.treasury), l: "Treasury", c: "text-amber-400" },
          ].map((s) => (
            <div key={s.l} className="bg-background/40 rounded-lg p-2">
              <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Quick Actions */}
    <div className="grid grid-cols-4 gap-2">
      {[
        { id: "deploy" as Tab, icon: Rocket, label: "Buy", c: "text-primary border-primary/30 bg-primary/10" },
        { id: "arena" as Tab, icon: FileCheck, label: "Review", c: "text-sky-400 border-sky-400/30 bg-sky-400/10" },
        { id: "market" as Tab, icon: ShoppingCart, label: "Market", c: "text-secondary border-secondary/30 bg-secondary/10" },
        { id: "referrals" as Tab, icon: Users, label: "Refer", c: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
      ].map((a) => (
        <Button key={a.id} onClick={() => onTab(a.id)} variant="ghost"
          className={`h-auto py-3 border flex-col gap-1 active:scale-95 ${a.c}`}>
          <a.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium">{a.label}</span>
        </Button>
      ))}
    </div>

    {/* Top Agents */}
    {leaderboard.length > 0 && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">🏆 Top Agents</h3>
          <button onClick={() => onTab("leaderboard")} className="text-xs text-primary flex items-center gap-0.5">
            Leaderboard <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {leaderboard.slice(0, 3).map((a: Agent, i: number) => {
            const Icon = CLASS_ICONS[a.class] || Bot;
            const medals = ["🥇", "🥈", "🥉"];
            const borderColors = ["border-yellow-500/40", "border-gray-400/40", "border-amber-600/40"];
            return (
              <div key={a.id} className={`flex items-center gap-3 bg-card rounded-lg p-2.5 border ${borderColors[i] || "border-border"}`}>
                <span className="text-base w-6 text-center">{medals[i]}</span>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Icon className={`h-4 w-4 ${CLASS_COLORS[a.class] || "text-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">Lv.{a.level} · {a.quests_completed} quests</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{fmtNum(a.balance_meeet)}</p>
                  <p className="text-[10px] text-muted-foreground">MEEET</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Latest Battles */}
    {matches.length > 0 && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">🔬 Latest Reviews</h3>
          <button onClick={() => onTab("arena")} className="text-xs text-primary flex items-center gap-0.5">
            Review Lab <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {matches.slice(0, 3).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between bg-card rounded-lg p-2.5 border border-border">
              <span className="text-xs font-medium truncate max-w-[80px]">{m.challenger_name}</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-red-400 border-red-400/30">VS</Badge>
              <span className="text-xs font-medium truncate max-w-[80px]">{m.defender_name}</span>
              <span className="text-[10px] text-muted-foreground">💰{fmtNum(m.bet_meeet || m.stake_meeet || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Oracle + Parliament cards */}
    <div className="grid grid-cols-2 gap-2">
      <Card className="border-violet-500/20 bg-violet-500/5 cursor-pointer active:scale-95 transition-transform"
        onClick={() => { onTab("quests"); haptic("light"); }}>
        <CardContent className="p-3 text-center">
          <p className="text-xl mb-1">🔮</p>
          <p className="text-xs font-semibold">Oracle</p>
          <p className="text-[10px] text-muted-foreground">Predict & earn</p>
        </CardContent>
      </Card>
      <Card className="border-amber-500/20 bg-amber-500/5 cursor-pointer active:scale-95 transition-transform"
        onClick={() => haptic("light")}>
        <CardContent className="p-3 text-center">
          <p className="text-xl mb-1">🏛️</p>
          <p className="text-xs font-semibold">Parliament</p>
          <p className="text-[10px] text-muted-foreground">{stats.active_laws} active laws</p>
        </CardContent>
      </Card>
    </div>
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
        </CardContent>
      </Card>
    ) : agents.map((a) => {
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
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getClassName(a.class)}</Badge>
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
                <div><p className="text-xs font-medium">{fmtNum(a.balance_meeet)}</p><p className="text-[10px] text-muted-foreground">MEEET</p></div>
                <div><p className="text-xs font-medium">{a.quests_completed}</p><p className="text-[10px] text-muted-foreground">Quests</p></div>
                <div><p className="text-xs font-medium">{a.reputation}</p><p className="text-[10px] text-muted-foreground">Rep</p></div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

/* ── Deploy / Buy Tab ── */
const DeployTab = ({ onBuy, promoActive, freeSlots, haptic }: { onBuy: (p: typeof PLANS[0]) => void; promoActive: boolean; freeSlots: number; haptic: (s: string) => void }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold">💎 Buy Agent</h2>
    {promoActive && (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-3 text-center">
          <p className="text-sm font-bold text-emerald-400">🎁 🎁 First 1,000 agents deploy FREE!</p>
          <p className="text-[10px] text-muted-foreground">{freeSlots} free spots left · Scout plan</p>
        </CardContent>
      </Card>
    )}
    {PLANS.map((p) => {
      const isFreeScout = promoActive && p.name === "Scout";
      return (
        <Card key={p.name} className={`transition-colors ${isFreeScout ? "border-emerald-500/40" : "border-border hover:border-primary/40"}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold">{p.name}</h3>
                  {isFreeScout && <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">FREE</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {p.agents} agent{p.agents > 1 ? "s" : ""} · {p.quests} quests/day · {p.tier}
                </p>
              </div>
              <div className="text-right">
                {isFreeScout ? (
                  <>
                    <p className="text-sm font-bold text-emerald-400">FREE</p>
                    <p className="text-[10px] text-muted-foreground line-through">{p.sol} SOL</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-primary">{p.sol} SOL</p>
                    <p className="text-[10px] text-muted-foreground">{p.meeet.toLocaleString()} MEEET</p>
                  </>
                )}
              </div>
            </div>
            <Button onClick={() => { onBuy(p); haptic("medium"); }} size="sm"
              className={`w-full h-8 text-xs active:scale-95 ${isFreeScout ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              {isFreeScout ? "Deploy FREE" : "Buy Now"}
            </Button>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

/* ── Quests Tab ── */
const QuestsTab = ({ quests }: { quests: Quest[] }) => (
  <div className="space-y-3">
    <h2 className="text-base font-semibold">📋 Open Quests</h2>
    {quests.length === 0 ? (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-6 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No open quests right now</p>
        </CardContent>
      </Card>
    ) : quests.map((q) => (
      <Card key={q.id} className="border-border">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{q.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{q.category}</Badge>
                <span className="text-[10px] text-muted-foreground">💰 {fmtNum(q.reward_meeet ?? 0)} MEEET</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Open
            </Badge>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/* ── Leaderboard Tab ── */
const LeaderboardTab = ({ agents }: { agents: Agent[] }) => {
  const medals = ["🥇", "🥈", "🥉"];
  const borderColors = ["border-yellow-500/40", "border-gray-400/40", "border-amber-600/40"];
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">🏆 Global Leaderboard</h2>
      {agents.map((a, i) => {
        const Icon = CLASS_ICONS[a.class] || Bot;
        return (
          <Card key={a.id} className={`${i < 3 ? borderColors[i] : "border-border"}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 text-center text-lg font-bold">
                {i < 3 ? medals[i] : <span className="text-sm text-muted-foreground">{i + 1}</span>}
              </div>
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={`h-4 w-4 ${CLASS_COLORS[a.class] || ""}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">{getClassName(a.class)} · Lv.{a.level}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">⚡ {a.xp.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{fmtNum(a.balance_meeet)} MEEET</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/* ── Referrals Tab ── */
const ReferralsTab = ({ tgUserId }: { tgUserId?: number }) => {
  const refLink = `https://meeet.world/join?ref=tg_${tgUserId || "anon"}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🌐 Join MEEET World — Deploy AI agents & earn $MEEET tokens!")}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => toast.success("Link copied!")).catch(() => {});
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">🤝 Referral Program</h2>
      <Card className="bg-gradient-to-br from-amber-500/15 to-card border-amber-500/20">
        <CardContent className="p-4 text-center space-y-2">
          <Users className="h-8 w-8 text-amber-400 mx-auto" />
          <p className="text-sm font-bold">Earn 3% Commission</p>
          <p className="text-xs text-muted-foreground">
            Share your link and earn from every agent your friends deploy
          </p>
        </CardContent>
      </Card>
      <Card className="border-border">
        <CardContent className="p-3 space-y-3">
          <label className="text-xs text-muted-foreground">Your referral link</label>
          <div className="flex gap-2">
            <Input value={refLink} readOnly className="bg-background border-border text-xs flex-1" />
            <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 active:scale-95">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={copyLink} variant="outline" className="text-xs gap-1 active:scale-95">
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <Button size="sm" asChild className="text-xs gap-1 bg-[#0088cc] hover:bg-[#0077b5] text-white active:scale-95">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" /> Share in TG
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: "—", l: "Referred" },
          { v: "—", l: "Active" },
          { v: "—", l: "Earned" },
        ].map((s) => (
          <Card key={s.l} className="border-border">
            <CardContent className="p-3 text-center">
              <p className="text-base font-bold">{s.v}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Referral stats update once your account is linked
      </p>
    </div>
  );
};

/* ── Wallet Tab ── */
const WalletTab = ({ agents, totalMeeet, tg, haptic }: { agents: Agent[]; totalMeeet: number; tg: any; haptic: (s: string) => void }) => {
  const [claimAgent, setClaimAgent] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (!claimAgent || !claimAmount || !walletAddr) {
      toast.error("Fill all fields");
      return;
    }
    setClaiming(true);
    haptic("medium");
    try {
      const { data, error } = await supabase.functions.invoke("claim-tokens", {
        body: { agent_id: claimAgent, amount: parseInt(claimAmount) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      tg?.HapticFeedback?.notificationOccurred("success");
      toast.success(`✅ Claimed ${data.net_amount} MEEET (${data.tax} tax, ${data.burned} burned)`);
      setClaimAmount("");
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred("error");
      toast.error(e.message || "Claim failed");
    } finally { setClaiming(false); }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">💰 Wallet</h2>
      <Card className="bg-gradient-to-br from-primary/15 to-card border-primary/20">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-primary">{totalMeeet.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">$MEEET across {agents.length} agents</p>
        </CardContent>
      </Card>

      {/* Claim Section */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-400">Claim to Wallet</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">Daily limit: 10,000 MEEET · Tax: 5% · Burn: 20%</p>
          <Select value={claimAgent} onValueChange={setClaimAgent}>
            <SelectTrigger className="bg-background border-border text-xs">
              <SelectValue placeholder="Select agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.filter(a => a.balance_meeet > 0).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({fmtNum(a.balance_meeet)} MEEET)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Amount (min 100)" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)}
            type="number" className="bg-background border-border text-xs" />
          <Input placeholder="Solana wallet address" value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)}
            className="bg-background border-border text-xs" />
          <Button size="sm" onClick={handleClaim} disabled={claiming || !claimAgent || !claimAmount}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs active:scale-95">
            {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
            Claim MEEET
          </Button>
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
};

/* ── Peer Review Tab ── */
const ArenaTab = ({ matches, agents, tg, haptic }: { matches: any[]; agents: Agent[]; tg: any; haptic: (s: string) => void }) => {
  const [challenging, setChallenging] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [betAmount, setBetAmount] = useState("100");

  const handleChallenge = async () => {
    if (!selectedAgent || !betAmount) return;
    setChallenging(true);
    haptic("heavy");
    try {
      const { error } = await supabase.functions.invoke("duel", {
        body: { agent_id: selectedAgent, bet_meeet: parseInt(betAmount) },
      });
      if (error) throw error;
      tg?.HapticFeedback?.notificationOccurred("success");
      toast.success("🔬 Challenge sent!");
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred("error");
      toast.error(e.message || "Challenge failed");
    } finally { setChallenging(false); }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">🔬 Peer Review Lab</h2>
      
      {/* Challenge Card */}
      <Card className="border-sky-500/30 bg-sky-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-sky-400" />
            <h3 className="text-sm font-bold text-sky-400">Quick Challenge</h3>
          </div>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="bg-background border-border text-xs">
              <SelectValue placeholder="Select your agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} (Lv.{a.level} · {fmtNum(a.balance_meeet)} MEEET)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input placeholder="Stake MEEET" value={betAmount} onChange={(e) => setBetAmount(e.target.value)}
              type="number" className="bg-background border-border text-xs flex-1" />
            <Button size="sm" onClick={handleChallenge} disabled={challenging || !selectedAgent}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs shrink-0 active:scale-95">
              {challenging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              Challenge
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <h3 className="text-sm font-medium text-muted-foreground">Recent Reviews</h3>
      {matches.length === 0 ? (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="p-6 text-center">
            <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
          </CardContent>
        </Card>
      ) : matches.map((m: any) => (
        <Card key={m.id} className="border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span className={`text-xs font-medium truncate max-w-[80px] ${m.winner_agent_id === m.challenger_agent_id ? "text-emerald-400" : ""}`}>
                  {m.challenger_name || "Agent"}
                </span>
              </div>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                m.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              }`}>
                {m.status === "completed" ? "Done" : "Pending"}
              </Badge>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium truncate max-w-[80px] ${m.winner_agent_id === m.defender_agent_id ? "text-emerald-400" : ""}`}>
                  {m.defender_name || "Agent"}
                </span>
                <Shield className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <div className="text-center mt-1">
              <span className="text-[10px] text-muted-foreground">💰 {fmtNum(m.bet_meeet || m.stake_meeet || 0)} MEEET</span>
              {m.winner_name && <span className="text-[10px] text-emerald-400 ml-2">👑 {m.winner_name}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/* ── Marketplace Tab ── */
const MarketTab = ({ listings, tg, haptic }: { listings: any[]; tg: any; haptic: (s: string) => void }) => {
  const handleBuy = async (listingId: string) => {
    haptic("medium");
    try {
      const { error } = await supabase.functions.invoke("buy-agent-marketplace", {
        body: { listing_id: listingId },
      });
      if (error) throw error;
      tg?.HapticFeedback?.notificationOccurred("success");
      toast.success("🎉 Agent purchased!");
    } catch (e: any) {
      tg?.HapticFeedback?.notificationOccurred("error");
      toast.error(e.message || "Purchase failed");
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">🏪 Marketplace</h2>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Buy & sell trained agents with other players</p>
        </CardContent>
      </Card>
      {listings.length === 0 ? (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No agents listed yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">List yours from the web app!</p>
          </CardContent>
        </Card>
      ) : listings.map((l: any) => (
        <Card key={l.id} className="border-border">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{l.agent_name || "Agent"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{l.agent_class || "warrior"}</Badge>
                  <span className="text-[10px] text-muted-foreground">Lv.{l.agent_level || 1}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{fmtNum(l.price_meeet || 0)} MEEET</p>
              </div>
            </div>
            {l.description && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{l.description}</p>}
            <Button size="sm" onClick={() => handleBuy(l.id)}
              className="w-full h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95">
              <ShoppingCart className="h-3 w-3 mr-1" /> Buy Agent
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TelegramApp;
