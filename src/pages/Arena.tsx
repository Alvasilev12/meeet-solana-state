import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Swords, Trophy, Skull, Flame, Shield, Zap, Heart, Coins,
  Loader2, Crown, Eye, Volume2, VolumeX, ArrowRight, Target,
  TrendingUp, Clock, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"agents">;

// ─── Hooks ──────────────────────────────────────────────────────
function useMyAgent(userId: string | undefined) {
  return useQuery<Agent | null>({
    queryKey: ["my-agent", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("agents").select("*").eq("user_id", userId).maybeSingle();
      return (data as Agent | null) ?? null;
    },
    enabled: !!userId,
  });
}

function useAllAgents() {
  return useQuery<Agent[]>({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").neq("status", "dead").order("level", { ascending: false });
      return (data as Agent[] | null) ?? [];
    },
  });
}

function useDuels() {
  return useQuery({
    queryKey: ["duels"],
    queryFn: async () => {
      const { data } = await supabase.from("duels").select("*").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as any[];
    },
    refetchInterval: 5000,
  });
}

// ─── Sound Effects ──────────────────────────────────────────────
const SFX_URLS = {
  challenge: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
  hit: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
  victory: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
};

function playSfx(type: keyof typeof SFX_URLS, enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    if (type === "challenge") {
      osc.frequency.value = 440;
      osc.type = "sawtooth";
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === "hit") {
      osc.frequency.value = 120;
      osc.type = "square";
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.value = 660;
      osc.type = "sine";
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    }
  } catch { /* silent fail */ }
}

// ─── Animated HP Bar ────────────────────────────────────────────
function AnimatedHPBar({ current, max, color, label, showDamage }: {
  current: number; max: number; color: string; label: string; showDamage?: number;
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = pct > 50 ? "bg-emerald-500" : pct > 25 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {current}/{max}
          {showDamage != null && showDamage > 0 && (
            <span className="text-red-400 ml-1 animate-pulse">-{showDamage}</span>
          )}
        </span>
      </div>
      <div className="h-3 bg-muted/50 rounded-full overflow-hidden border border-white/[0.06] relative">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out relative`}
          style={{ width: `${pct}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
          {/* Pulse glow on low HP */}
          {pct < 25 && (
            <div className="absolute inset-0 bg-red-500/30 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live Duel Card (Spectator View) ────────────────────────────
function LiveDuelCard({ duel, agentMap, isSpectating, onSpectate, sfxEnabled }: {
  duel: any; agentMap: Map<string, Agent>;
  isSpectating: boolean; onSpectate: (id: string) => void; sfxEnabled: boolean;
}) {
  const challenger = agentMap.get(duel.challenger_agent_id);
  const defender = agentMap.get(duel.defender_agent_id);
  const [tick, setTick] = useState(0);

  // Simulate combat animation ticks
  useEffect(() => {
    if (!isSpectating) return;
    const iv = setInterval(() => {
      setTick(t => t + 1);
      if (Math.random() < 0.4) playSfx("hit", sfxEnabled);
    }, 800);
    return () => clearInterval(iv);
  }, [isSpectating, sfxEnabled]);

  if (!challenger || !defender) return null;

  // Simulated damage for visual flair (actual damage is server-side)
  const chalSimDmg = isSpectating ? Math.floor(Math.sin(tick * 0.7) * 5 + 5) : 0;
  const defSimDmg = isSpectating ? Math.floor(Math.cos(tick * 0.5) * 5 + 5) : 0;
  const chalHpSim = isSpectating ? Math.max(10, challenger.hp - tick * 3 % 30) : challenger.hp;
  const defHpSim = isSpectating ? Math.max(10, defender.hp - tick * 2 % 25) : defender.hp;

  return (
    <Card className={`border-red-500/20 bg-gradient-to-br from-red-950/20 to-background transition-all ${
      isSpectating ? "ring-1 ring-red-500/30 shadow-lg shadow-red-500/10" : ""
    }`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider">LIVE DUEL</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
              <Coins className="h-3 w-3 mr-1" />
              {Number(duel.stake_meeet) * 2} pot
            </Badge>
            <Button
              size="sm"
              variant={isSpectating ? "destructive" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => onSpectate(duel.id)}
            >
              <Eye className="h-3 w-3" />
              {isSpectating ? "Watching" : "Spectate"}
            </Button>
          </div>
        </div>

        {/* VS Layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          {/* Challenger */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${
                isSpectating && tick % 2 === 0 ? "border-red-400 scale-110" : "border-red-500/40"
              } bg-red-950/40 transition-all duration-200`}>
                ⚔️
              </div>
              <div>
                <p className="font-bold text-sm">{challenger.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {challenger.class} · Lv.{challenger.level}
                </p>
              </div>
            </div>
            <AnimatedHPBar
              current={chalHpSim}
              max={challenger.max_hp}
              color="#ef4444"
              label="HP"
              showDamage={isSpectating ? defSimDmg : undefined}
            />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>⚔️ {challenger.attack}</span>
              <span>🛡️ {challenger.defense}</span>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <div className={`text-2xl font-black ${isSpectating ? "text-red-400 animate-pulse" : "text-muted-foreground"}`}>
              VS
            </div>
            {isSpectating && (
              <div className="flex gap-0.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            )}
          </div>

          {/* Defender */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <div className="text-right">
                <p className="font-bold text-sm">{defender.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {defender.class} · Lv.{defender.level}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${
                isSpectating && tick % 2 === 1 ? "border-blue-400 scale-110" : "border-blue-500/40"
              } bg-blue-950/40 transition-all duration-200`}>
                🛡️
              </div>
            </div>
            <AnimatedHPBar
              current={defHpSim}
              max={defender.max_hp}
              color="#3b82f6"
              label="HP"
              showDamage={isSpectating ? chalSimDmg : undefined}
            />
            <div className="flex gap-2 text-[10px] text-muted-foreground justify-end">
              <span>⚔️ {defender.attack}</span>
              <span>🛡️ {defender.defense}</span>
            </div>
          </div>
        </div>

        {/* Spectator combat log */}
        {isSpectating && (
          <div className="mt-3 p-2 bg-black/30 rounded border border-white/[0.04] max-h-24 overflow-y-auto">
            <div className="space-y-1">
              {Array.from({ length: Math.min(tick, 6) }).map((_, i) => {
                const isLeft = (tick - i) % 2 === 0;
                const attacker = isLeft ? challenger : defender;
                const target = isLeft ? defender : challenger;
                const dmg = Math.floor(Math.random() * 15 + 5);
                return (
                  <p key={i} className="text-[10px] font-mono text-muted-foreground/70 animate-fade-in">
                    <span className={isLeft ? "text-red-400" : "text-blue-400"}>{attacker.name}</span>
                    {" hits "}
                    <span className={isLeft ? "text-blue-400" : "text-red-400"}>{target.name}</span>
                    {" for "}<span className="text-amber-400">{dmg}</span> damage
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Duel History Row ───────────────────────────────────────────
function DuelHistoryRow({ duel, agentMap, myAgentId }: {
  duel: any; agentMap: Map<string, Agent>; myAgentId?: string;
}) {
  const chal = agentMap.get(duel.challenger_agent_id);
  const def = agentMap.get(duel.defender_agent_id);
  const winner = agentMap.get(duel.winner_agent_id);
  const loser = duel.winner_agent_id === duel.challenger_agent_id ? def : chal;
  const isMine = duel.challenger_agent_id === myAgentId || duel.defender_agent_id === myAgentId;
  const iWon = duel.winner_agent_id === myAgentId;

  const netReward = Number(duel.stake_meeet) * 2 - Number(duel.tax_amount || 0);
  const xpGain = Math.floor(Number(duel.stake_meeet) * 0.1 + (duel.challenger_damage || 0) + (duel.defender_damage || 0));
  const timeAgo = getTimeAgo(duel.resolved_at || duel.created_at);

  return (
    <div className={`p-3 rounded-lg border transition-all ${
      isMine
        ? iWon ? "border-emerald-500/20 bg-emerald-950/10" : "border-red-500/20 bg-red-950/10"
        : "border-border bg-card/50 hover:bg-card/80"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${
            duel.winner_agent_id === duel.challenger_agent_id ? "text-emerald-400" : "text-muted-foreground"
          }`}>
            {chal?.name ?? "???"}
          </span>
          <Swords className="h-3 w-3 text-muted-foreground/50" />
          <span className={`font-semibold text-sm ${
            duel.winner_agent_id === duel.defender_agent_id ? "text-emerald-400" : "text-muted-foreground"
          }`}>
            {def?.name ?? "???"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 font-mono">{timeAgo}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1 text-amber-400">
          <Crown className="h-3 w-3" />
          <span className="font-bold">{winner?.name ?? "???"}</span>
        </div>
        <div className="flex items-center gap-1 text-red-400/60">
          <Skull className="h-3 w-3" />
          <span>{loser?.name ?? "???"}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <TrendingUp className="h-3 w-3" />
          <span>+{xpGain} XP</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <Coins className="h-3 w-3" />
          <span>{netReward.toLocaleString()}</span>
        </div>
      </div>

      {(duel.challenger_roll || duel.defender_roll) && (
        <div className="mt-1 text-[10px] text-muted-foreground/40 font-mono">
          🎲 {duel.challenger_roll ?? "?"} vs {duel.defender_roll ?? "?"} 
          {Number(duel.burn_amount) > 0 && <span className="ml-2">🔥 {duel.burn_amount} burned</span>}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
const Arena = () => {
  const { user } = useAuth();
  const { data: myAgent } = useMyAgent(user?.id);
  const { data: agents = [] } = useAllAgents();
  const { data: duels = [] } = useDuels();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [stake, setStake] = useState("100");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [spectatingDuel, setSpectatingDuel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("live");

  const challengeMut = useMutation({
    mutationFn: async ({ defenderId, stakeAmount }: { defenderId: string; stakeAmount: number }) => {
      const { data, error } = await supabase.functions.invoke("duel", {
        body: {
          action: "challenge",
          challenger_agent_id: myAgent!.id,
          defender_agent_id: defenderId,
          stake_meeet: stakeAmount,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      playSfx("challenge", sfxEnabled);
      toast({ title: "⚔️ Challenge sent!", description: "Waiting for opponent to accept..." });
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["my-agent"] });
      setSelectedTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const acceptMut = useMutation({
    mutationFn: async (duelId: string) => {
      const { data, error } = await supabase.functions.invoke("duel", {
        body: { action: "accept", duel_id: duelId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const won = data.winner === myAgent?.id;
      playSfx(won ? "victory" : "hit", sfxEnabled);
      toast({
        title: won ? "🏆 Victory!" : "💀 Defeated!",
        description: `Roll: ${data.challenger_roll} vs ${data.defender_roll}. ${won ? `Won ${data.net_reward} $MEEET` : "Stake lost"}`,
      });
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["my-agent"] });
      qc.invalidateQueries({ queryKey: ["all-agents"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMut = useMutation({
    mutationFn: async (duelId: string) => {
      const { data, error } = await supabase.functions.invoke("duel", {
        body: { action: "cancel", duel_id: duelId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Duel cancelled", description: "Stake returned" });
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["my-agent"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const agentMap = new Map<string, Agent>(agents.map((a) => [a.id, a] as const));
  const opponents = agents.filter((a) => a.id !== myAgent?.id);
  const liveDuels = duels.filter((d: any) => d.status === "pending");
  const myPendingDuels = liveDuels.filter((d: any) => d.defender_agent_id === myAgent?.id);
  const myOutgoing = liveDuels.filter((d: any) => d.challenger_agent_id === myAgent?.id);
  const completedDuels = duels.filter((d: any) => d.status === "completed");

  // Arena stats
  const totalFights = completedDuels.length;
  const totalMeeetWagered = completedDuels.reduce((s: number, d: any) => s + Number(d.stake_meeet) * 2, 0);
  const totalBurned = completedDuels.reduce((s: number, d: any) => s + Number(d.burn_amount || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <Swords className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Arena</h1>
              <p className="text-muted-foreground text-sm">Fight for $MEEET · 5% tax · 20% burn</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* SFX Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setSfxEnabled(!sfxEnabled)}
            >
              {sfxEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-xs">SFX</span>
            </Button>
            {/* Arena Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-muted-foreground bg-card/50 rounded-lg px-4 py-2 border border-border">
              <span className="flex items-center gap-1"><Swords className="h-3 w-3 text-red-400" />{totalFights} fights</span>
              <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-amber-400" />{totalMeeetWagered.toLocaleString()} wagered</span>
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{totalBurned.toLocaleString()} burned</span>
            </div>
          </div>
        </div>

        {!myAgent ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center">
              <Swords className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold mb-2">No Agent Deployed</p>
              <p className="text-muted-foreground text-sm">Deploy an agent on the Dashboard to enter the Arena</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Incoming Challenges Banner */}
            {myPendingDuels.length > 0 && (
              <Card className="border-red-500/30 bg-red-950/10 animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-5 w-5 text-red-400 animate-pulse" />
                    <span className="font-bold text-red-400">Incoming Challenges ({myPendingDuels.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myPendingDuels.map((d: any) => {
                      const chal = agentMap.get(d.challenger_agent_id);
                      return (
                        <div key={d.id} className="p-3 rounded-lg bg-card border border-red-500/20 flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{chal?.name ?? "???"}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              Lv.{chal?.level} · ⚔️{chal?.attack} · 🛡️{chal?.defense}
                            </span>
                            <Badge variant="secondary" className="ml-2">{Number(d.stake_meeet)} $MEEET</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={acceptMut.isPending}
                            onClick={() => acceptMut.mutate(d.id)}
                          >
                            {acceptMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Swords className="h-4 w-4 mr-1" /> Accept</>}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-card/50 border border-border">
                <TabsTrigger value="live" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Live Duels
                  {liveDuels.length > 0 && (
                    <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                      {liveDuels.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="challenge" className="gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Challenge
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  History
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Leaderboard
                </TabsTrigger>
              </TabsList>

              {/* ═══ LIVE DUELS ═══ */}
              <TabsContent value="live" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* My Agent Stats */}
                  <Card className="border-border bg-card lg:col-span-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-xl">
                            {myAgent.class === "warrior" ? "⚔️" : myAgent.class === "oracle" ? "🔮" : myAgent.class === "trader" ? "💰" : "🤖"}
                          </div>
                          <div>
                            <p className="font-bold">{myAgent.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{myAgent.class} · Lv.{myAgent.level}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center"><Zap className="h-4 w-4 text-red-400 mx-auto" /><span className="font-bold">{myAgent.attack}</span><span className="text-[10px] text-muted-foreground block">ATK</span></div>
                          <div className="text-center"><Shield className="h-4 w-4 text-blue-400 mx-auto" /><span className="font-bold">{myAgent.defense}</span><span className="text-[10px] text-muted-foreground block">DEF</span></div>
                          <div className="text-center"><Heart className="h-4 w-4 text-emerald-400 mx-auto" /><span className="font-bold">{myAgent.hp}/{myAgent.max_hp}</span><span className="text-[10px] text-muted-foreground block">HP</span></div>
                          <div className="text-center"><Skull className="h-4 w-4 text-amber-400 mx-auto" /><span className="font-bold">{myAgent.kills}</span><span className="text-[10px] text-muted-foreground block">Kills</span></div>
                          <div className="text-center"><Coins className="h-4 w-4 text-emerald-400 mx-auto" /><span className="font-bold">{Number(myAgent.balance_meeet).toLocaleString()}</span><span className="text-[10px] text-muted-foreground block">$MEEET</span></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Live duel cards */}
                  {liveDuels.length === 0 ? (
                    <div className="lg:col-span-2 text-center py-12 text-muted-foreground">
                      <Swords className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No active duels right now</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">Challenge someone to start fighting!</p>
                    </div>
                  ) : (
                    liveDuels.map((d: any) => (
                      <LiveDuelCard
                        key={d.id}
                        duel={d}
                        agentMap={agentMap}
                        isSpectating={spectatingDuel === d.id}
                        onSpectate={(id) => setSpectatingDuel(spectatingDuel === id ? null : id)}
                        sfxEnabled={sfxEnabled}
                      />
                    ))
                  )}

                  {/* My outgoing challenges */}
                  {myOutgoing.length > 0 && (
                    <Card className="lg:col-span-2 border-border bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Your Outgoing Challenges</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {myOutgoing.map((d: any) => {
                          const def = agentMap.get(d.defender_agent_id);
                          return (
                            <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-semibold">{def?.name ?? "???"}</span>
                                <Badge variant="outline" className="text-xs">{Number(d.stake_meeet)} $MEEET</Badge>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(d.id)} disabled={cancelMut.isPending}>
                                Cancel
                              </Button>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* ═══ CHALLENGE ═══ */}
              <TabsContent value="challenge" className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-red-400" /> Pick Your Opponent
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Stake:</span>
                        <Input
                          type="number"
                          value={stake}
                          onChange={(e) => setStake(e.target.value)}
                          className="w-28 h-8 text-sm"
                          min={10}
                        />
                        <span className="text-xs text-muted-foreground">$MEEET</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
                      {opponents.length === 0 && (
                        <p className="text-muted-foreground text-sm text-center py-8 col-span-full">No opponents available</p>
                      )}
                      {opponents.map((opp) => {
                        const power = opp.attack * 2 + opp.defense + opp.level * 3;
                        const myPower = myAgent ? myAgent.attack * 2 + myAgent.defense + myAgent.level * 3 : 0;
                        const diff = power - myPower;
                        const diffLabel = diff > 10 ? "Dangerous" : diff > 0 ? "Tough" : diff > -10 ? "Even" : "Easy";
                        const diffColor = diff > 10 ? "text-red-400" : diff > 0 ? "text-amber-400" : diff > -10 ? "text-muted-foreground" : "text-emerald-400";

                        return (
                          <div
                            key={opp.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                              selectedTarget === opp.id
                                ? "border-red-500/40 bg-red-950/15 shadow-md shadow-red-500/5"
                                : "border-border bg-card/50 hover:bg-card hover:border-border/80"
                            }`}
                            onClick={() => setSelectedTarget(opp.id === selectedTarget ? null : opp.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{opp.name}</span>
                                <Badge variant="outline" className="text-[10px] capitalize h-5">{opp.class}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">Lv.{opp.level}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex gap-2 text-muted-foreground">
                                <span>⚔️{opp.attack}</span>
                                <span>🛡️{opp.defense}</span>
                                <span>💀{opp.kills}</span>
                              </div>
                              <span className={`text-[10px] font-mono ${diffColor}`}>{diffLabel}</span>
                            </div>
                            <AnimatedHPBar current={opp.hp} max={opp.max_hp} color="#94a3b8" label="" />

                            {selectedTarget === opp.id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full mt-3 gap-1"
                                disabled={challengeMut.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  challengeMut.mutate({ defenderId: opp.id, stakeAmount: Number(stake) || 100 });
                                }}
                              >
                                {challengeMut.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>⚔️ Challenge ({stake} $MEEET)</>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ HISTORY ═══ */}
              <TabsContent value="history" className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" /> Duel History
                      <Badge variant="outline" className="ml-auto">{completedDuels.length} fights</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                    {completedDuels.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">No completed duels yet</p>
                    ) : (
                      completedDuels.map((d: any) => (
                        <DuelHistoryRow key={d.id} duel={d} agentMap={agentMap} myAgentId={myAgent?.id} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══ LEADERBOARD ═══ */}
              <TabsContent value="leaderboard" className="mt-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" /> Arena Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {agents
                        .sort((a, b) => b.kills - a.kills)
                        .slice(0, 20)
                        .map((agent, i) => {
                          const isMe = agent.id === myAgent?.id;
                          const power = agent.attack * 2 + agent.defense + agent.level * 3;
                          return (
                            <div
                              key={agent.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                isMe ? "border-primary/30 bg-primary/5" : "border-border bg-card/50 hover:bg-card"
                              } ${!isMe ? "cursor-pointer" : ""}`}
                              onClick={() => {
                                if (!isMe) {
                                  setSelectedTarget(agent.id);
                                  setActiveTab("challenge");
                                }
                              }}
                            >
                              {/* Rank */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                i === 0 ? "bg-amber-500/20 text-amber-400" :
                                i === 1 ? "bg-gray-400/20 text-gray-300" :
                                i === 2 ? "bg-orange-600/20 text-orange-400" :
                                "bg-muted/50 text-muted-foreground"
                              }`}>
                                {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm truncate">{agent.name}</span>
                                  <Badge variant="outline" className="text-[10px] capitalize h-5">{agent.class}</Badge>
                                  {isMe && <Badge className="text-[10px] h-5 bg-primary/20 text-primary border-primary/30">YOU</Badge>}
                                </div>
                                <div className="flex gap-3 mt-0.5 text-[11px] text-muted-foreground">
                                  <span>Lv.{agent.level}</span>
                                  <span>⚔️{agent.attack}</span>
                                  <span>🛡️{agent.defense}</span>
                                  <span>⚡{power} PWR</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                                  <Skull className="h-3.5 w-3.5" />
                                  {agent.kills}
                                </div>
                                <span className="text-[10px] text-muted-foreground">kills</span>
                              </div>

                              {!isMe && (
                                <Button size="sm" variant="ghost" className="shrink-0 h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                  <Swords className="h-3 w-3 mr-1" /> Fight
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Arena;
