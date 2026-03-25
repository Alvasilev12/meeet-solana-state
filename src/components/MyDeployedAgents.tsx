import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Trash2, MessageCircle, Coins, Trophy, ChevronRight, Zap, ZapOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useState } from "react";

const CLASS_EMOJI: Record<string, string> = {
  warrior: "⚔️", trader: "💰", oracle: "🔮",
  diplomat: "🤝", miner: "⛏️", banker: "🏦", president: "👑",
};

const STATUS_CONFIG: Record<string, { emoji: string; label: string; dotClass: string; badgeClass: string }> = {
  running: { emoji: "🟢", label: "Running", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  paused: { emoji: "🟡", label: "Paused", dotClass: "bg-amber-500", badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  stopped: { emoji: "🔴", label: "Stopped", dotClass: "bg-red-500", badgeClass: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export default function MyDeployedAgents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: deployedAgents = [], isLoading } = useQuery({
    queryKey: ["my-deployed-agents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployed_agents")
        .select("*, agents(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAutoMode = async (deployedId: string, currentMode: boolean) => {
    setTogglingId(deployedId);
    try {
      const { data, error } = await supabase.functions.invoke("toggle-auto-mode", {
        body: { deployed_agent_id: deployedId, enable: !currentMode },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      queryClient.invalidateQueries({ queryKey: ["my-deployed-agents"] });
      toast({
        title: !currentMode ? "⚡ Автономный режим включён" : "Автономный режим выключен",
        description: !currentMode
          ? "Агент начнёт взаимодействие с системой и зарабатывать $MEEET"
          : "Агент остановлен",
      });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const deleteAgent = async (deployedId: string) => {
    if (!confirm("Delete this agent? This action cannot be undone.")) return;
    setTogglingId(deployedId);
    try {
      const { error } = await supabase.from("deployed_agents").delete().eq("id", deployedId).eq("user_id", user!.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-deployed-agents"] });
      toast({ title: "Agent deleted 🗑️" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (deployedAgents.length === 0) {
    return (
      <Card className="glass-card border-border overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-secondary to-primary/50" />
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">No agents deployed yet</p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Deploy an AI agent to start earning $MEEET automatically.
            </p>
          </div>
          <Link to="/deploy">
            <Button variant="default" size="sm" className="gap-1.5">
              <Bot className="w-3.5 h-3.5" /> Deploy New Agent <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-secondary to-primary/50" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            My Agents ({deployedAgents.length})
          </CardTitle>
          <Link to="/deploy" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
            Deploy more <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {deployedAgents.map((da: any) => {
          const agent = da.agents;
          const status = STATUS_CONFIG[da.status] || STATUS_CONFIG.stopped;
          return (
            <div key={da.id} className="glass-card rounded-xl p-4 space-y-3">
              {/* Top row: agent info + status */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">
                  {CLASS_EMOJI[agent?.class] || "🤖"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-display font-bold truncate">{agent?.name || "Agent"}</p>
                    <Badge variant="outline" className={`text-[9px] ${status.badgeClass}`}>
                      {status.emoji} {status.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body capitalize mt-0.5">
                    {agent?.class} · Lv.{agent?.level || 1}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Link to={`/dashboard?chat=${agent?.id}`}>
                    <Button size="sm" variant="default" className="text-xs gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs gap-1.5"
                    disabled={togglingId === da.id}
                    onClick={() => deleteAgent(da.id)}
                  >
                    {togglingId === da.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Auto-mode toggle */}
              <Button
                size="sm"
                variant={da.auto_mode ? "default" : "outline"}
                className={`w-full text-xs gap-2 ${da.auto_mode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-primary/30 hover:bg-primary/10"}`}
                disabled={togglingId === da.id}
                onClick={() => toggleAutoMode(da.id, !!da.auto_mode)}
              >
                {togglingId === da.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : da.auto_mode ? (
                  <Zap className="w-3.5 h-3.5" />
                ) : (
                  <ZapOff className="w-3.5 h-3.5" />
                )}
                {da.auto_mode ? "⚡ Взаимодействие с системой включено" : "Разрешить взаимодействие с системой"}
              </Button>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-display font-bold">{Number(da.total_earned_meeet ?? 0).toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">$MEEET earned</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <Trophy className="w-3.5 h-3.5 text-secondary" />
                  <div>
                    <p className="text-xs font-display font-bold">{da.quests_completed ?? 0}</p>
                    <p className="text-[9px] text-muted-foreground">Quests done</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
