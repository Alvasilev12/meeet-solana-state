import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Swords, Trophy, Skull, Flame, Shield, Zap, Heart, Coins, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"agents">;

function useMyAgent(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-agent", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("agents").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });
}

function useAllAgents() {
  return useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").neq("status", "dead").order("level", { ascending: false });
      return data ?? [];
    },
  });
}

function useDuels() {
  return useQuery({
    queryKey: ["duels"],
    queryFn: async () => {
      const { data } = await supabase.from("duels").select("*").order("created_at", { ascending: false }).limit(50);
      return (data ?? []) as any[];
    },
    refetchInterval: 10000,
  });
}

const Arena = () => {
  const { user } = useAuth();
  const { data: myAgent } = useMyAgent(user?.id);
  const { data: agents = [] } = useAllAgents();
  const { data: duels = [] } = useDuels();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [stake, setStake] = useState("100");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

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
      toast({ title: "⚔️ Вызов брошен!", description: "Ждём ответа противника..." });
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["my-agent"] });
      setSelectedTarget(null);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
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
      toast({
        title: won ? "🏆 Победа!" : "💀 Поражение!",
        description: `Бросок: ${data.challenger_roll} vs ${data.defender_roll}. ${won ? `Выигрыш: ${data.net_reward} $MEEET` : "Ставка потеряна"}`,
      });
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["my-agent"] });
      qc.invalidateQueries({ queryKey: ["all-agents"] });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
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
      toast({ title: "Дуэль отменена", description: "Ставка возвращена" });
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["my-agent"] });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const opponents = agents.filter((a) => a.id !== myAgent?.id);
  const myPendingDuels = duels.filter(
    (d: any) => d.status === "pending" && d.defender_agent_id === myAgent?.id
  );
  const myOutgoing = duels.filter(
    (d: any) => d.status === "pending" && d.challenger_agent_id === myAgent?.id
  );
  const recentCompleted = duels.filter((d: any) => d.status === "completed").slice(0, 10);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-destructive/20 border border-destructive/30">
            <Swords className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Арена дуэлей</h1>
            <p className="text-muted-foreground">Сражайся за $MEEET. 5% налог · 20% сжигание</p>
          </div>
        </div>

        {!myAgent ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center">
              <Swords className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Создай агента на Dashboard чтобы участвовать в дуэлях</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: My Agent + Incoming Challenges */}
            <div className="space-y-6">
              {/* My Stats */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Мой боец
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{myAgent.name}</span>
                    <Badge variant="outline" className="capitalize">{myAgent.class}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-destructive" /> ATK: {myAgent.attack}</div>
                    <div className="flex items-center gap-1"><Shield className="h-3 w-3 text-accent" /> DEF: {myAgent.defense}</div>
                    <div className="flex items-center gap-1"><Heart className="h-3 w-3 text-destructive" /> HP: {myAgent.hp}/{myAgent.max_hp}</div>
                    <div className="flex items-center gap-1"><Trophy className="h-3 w-3 text-primary" /> Kills: {myAgent.kills}</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-secondary">
                    <Coins className="h-3 w-3" /> {Number(myAgent.balance_meeet).toLocaleString()} $MEEET
                  </div>
                </CardContent>
              </Card>

              {/* Incoming Challenges */}
              {myPendingDuels.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Flame className="h-5 w-5 text-destructive animate-pulse" />
                      Входящие вызовы ({myPendingDuels.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {myPendingDuels.map((d: any) => {
                      const chal = agentMap.get(d.challenger_agent_id);
                      return (
                        <div key={d.id} className="p-3 rounded-lg bg-card border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{chal?.name ?? "???"}</span>
                            <Badge variant="secondary">{Number(d.stake_meeet).toLocaleString()} $MEEET</Badge>
                          </div>
                          {chal && (
                            <div className="text-xs text-muted-foreground mb-2">
                              Lv.{chal.level} · ATK {chal.attack} · DEF {chal.defense}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            disabled={acceptMut.isPending}
                            onClick={() => acceptMut.mutate(d.id)}
                          >
                            {acceptMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Swords className="h-4 w-4 mr-1" /> Принять бой</>}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* My Outgoing */}
              {myOutgoing.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Мои вызовы</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {myOutgoing.map((d: any) => {
                      const def = agentMap.get(d.defender_agent_id);
                      return (
                        <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm">→ {def?.name ?? "???"} ({Number(d.stake_meeet)} $MEEET)</span>
                          <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(d.id)} disabled={cancelMut.isPending}>
                            Отмена
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Center: Opponents */}
            <div className="lg:col-span-1">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Skull className="h-5 w-5 text-muted-foreground" /> Противники
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Ставка:</span>
                    <Input
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      className="w-28 h-8 text-sm"
                      min={10}
                    />
                    <span className="text-xs text-muted-foreground">$MEEET</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {opponents.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">Нет доступных противников</p>
                  )}
                  {opponents.map((opp) => (
                    <div
                      key={opp.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTarget === opp.id
                          ? "border-destructive bg-destructive/10"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedTarget(opp.id === selectedTarget ? null : opp.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm">{opp.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs capitalize">{opp.class}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">Lv.{opp.level}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>⚔️ {opp.attack}</span>
                        <span>🛡️ {opp.defense}</span>
                        <span>❤️ {opp.hp}/{opp.max_hp}</span>
                        <span>💀 {opp.kills}</span>
                      </div>
                      {selectedTarget === opp.id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full mt-2"
                          disabled={challengeMut.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            challengeMut.mutate({ defenderId: opp.id, stakeAmount: Number(stake) || 100 });
                          }}
                        >
                          {challengeMut.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>⚔️ Вызвать на дуэль ({stake} $MEEET)</>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right: Battle Log */}
            <div>
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" /> Журнал боёв
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[700px] overflow-y-auto">
                  {recentCompleted.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">Пока нет завершённых дуэлей</p>
                  )}
                  {recentCompleted.map((d: any) => {
                    const chal = agentMap.get(d.challenger_agent_id);
                    const def = agentMap.get(d.defender_agent_id);
                    const winner = agentMap.get(d.winner_agent_id);
                    const isMine = d.challenger_agent_id === myAgent?.id || d.defender_agent_id === myAgent?.id;
                    const iWon = d.winner_agent_id === myAgent?.id;

                    return (
                      <div
                        key={d.id}
                        className={`p-3 rounded-lg border ${
                          isMine
                            ? iWon ? "border-secondary/30 bg-secondary/5" : "border-destructive/30 bg-destructive/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-sm">
                            <span className={d.winner_agent_id === d.challenger_agent_id ? "text-secondary font-bold" : "text-muted-foreground"}>
                              {chal?.name ?? "???"}
                            </span>
                            <span className="text-muted-foreground">vs</span>
                            <span className={d.winner_agent_id === d.defender_agent_id ? "text-secondary font-bold" : "text-muted-foreground"}>
                              {def?.name ?? "???"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">{Number(d.stake_meeet) * 2} pot</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Crown className="h-3 w-3 text-primary" />
                          <span>{winner?.name ?? "???"}</span>
                          <span>🎲 {d.challenger_roll} vs {d.defender_roll}</span>
                        </div>
                        {Number(d.tax_amount) > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            💰 Налог: {d.tax_amount} · 🔥 Сожжено: {d.burn_amount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Arena;
