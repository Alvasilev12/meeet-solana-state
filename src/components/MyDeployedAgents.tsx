import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2, Bot, Trash2, MessageCircle, Coins, Trophy,
  ChevronRight, Zap, ZapOff, Users, UsersRound, Settings,
  Pause, Play, Shield, Swords, FlaskConical, TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import AgentChat from "@/components/AgentChat";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useState } from "react";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

const CLASS_EMOJI: Record<string, string> = {
  warrior: "⚔️", trader: "💰", oracle: "🔮",
  diplomat: "🤝", miner: "⛏️", banker: "🏦", president: "👑",
  scientist: "🔬", spy: "🕵️", merchant: "📊",
};

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  running: { label: "Running", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  paused: { label: "Paused", dotClass: "bg-amber-500", badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  stopped: { label: "Stopped", dotClass: "bg-red-500", badgeClass: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export default function MyDeployedAgents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);
  const [settingsAgent, setSettingsAgent] = useState<any | null>(null);
  const [chatAgent, setChatAgent] = useState<any | null>(null);

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

  const act = async (id: string, key: string, fn: () => Promise<void>) => {
    setActingId(key + id);
    try { await fn(); queryClient.invalidateQueries({ queryKey: ["my-deployed-agents"] }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setActingId(null); }
  };

  const toggleAutoMode = (da: any) => act(da.id, "auto-", async () => {
    const { data, error } = await supabase.functions.invoke("toggle-auto-mode", {
      body: { deployed_agent_id: da.id, enable: !da.auto_mode },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    toast({ title: !da.auto_mode ? "⚡ Auto mode ON" : "Auto mode OFF" });
  });

  const toggleSocialMode = (da: any) => act(da.id, "social-", async () => {
    const { data, error } = await supabase.functions.invoke("toggle-social-mode", {
      body: { deployed_agent_id: da.id, enable: !da.social_mode },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    toast({ title: !da.social_mode ? "🤝 Social mode ON" : "Social mode OFF" });
  });

  const togglePause = (da: any) => act(da.id, "pause-", async () => {
    const newAction = da.status === "running" ? "pause" : "resume";
    
    // Try edge function first
    try {
      const { data, error } = await supabase.functions.invoke("pause-agent", {
        body: { deployed_agent_id: da.id, action: newAction },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    } catch (fnErr: any) {
      // Fallback: update directly via supabase client
      console.warn("[Pause] Edge function failed, using direct update:", fnErr.message);
      const newStatus = newAction === "pause" ? "paused" : "running";
      const { error: directErr } = await supabase
        .from("deployed_agents")
        .update({ status: newStatus } as any)
        .eq("id", da.id)
        .eq("user_id", user!.id);
      if (directErr) throw new Error(directErr.message);
    }
    
    toast({ title: newAction === "pause" ? "⏸ Agent paused" : "▶️ Agent resumed" });
  });

  const deleteAgent = (da: any) => act(da.id, "del-", async () => {
    if (!confirm("Delete this agent? This action cannot be undone.")) throw new Error("Cancelled");
    const { error } = await supabase.from("deployed_agents").delete().eq("id", da.id).eq("user_id", user!.id);
    if (error) throw error;
    toast({ title: "Agent deleted 🗑️" });
    if (settingsAgent?.id === da.id) setSettingsAgent(null);
  });

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
          <p className="font-display font-bold text-foreground">No agents deployed yet</p>
          <p className="text-xs text-muted-foreground">Deploy an AI agent to start earning $MEEET automatically.</p>
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
    <>
      <Card className="glass-card border-border overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-secondary to-primary/50" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              My Agents ({deployedAgents.length})
            </CardTitle>
            <Link to="/deploy">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7">
                <Bot className="w-3 h-3" /> Create Agent
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {deployedAgents.map((da: any) => {
            const agent = da.agents;
            const st = STATUS_CONFIG[da.status] || STATUS_CONFIG.stopped;
            return (
              <div key={da.id} className="glass-card rounded-xl p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  <img
                    src={getAgentAvatarUrl(agent?.id || da.id, 48)}
                    alt={agent?.name || "Agent"}
                    className="w-11 h-11 rounded-xl border border-primary/20 bg-primary/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-display font-bold truncate">{agent?.name || "Agent"}</p>
                      <Badge variant="outline" className={`text-[9px] ${st.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass} mr-1`} />
                        {st.label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                      {agent?.class} · Lv.{agent?.level || 1}
                    </p>
                  </div>
                </div>

                {/* XP Progress Bar */}
                {(() => {
                  const level = agent?.level || 1;
                  const xp = agent?.xp || 0;
                  const xpForCurrent = Math.round(100 * Math.pow(1.5, level - 2));
                  const xpForNext = Math.round(100 * Math.pow(1.5, level - 1));
                  const prevThreshold = level <= 1 ? 0 : xpForCurrent;
                  const progress = xpForNext > prevThreshold ? Math.min(100, ((xp - prevThreshold) / (xpForNext - prevThreshold)) * 100) : 100;
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">XP: {xp.toLocaleString()} / {xpForNext.toLocaleString()}</span>
                        <span className="text-primary font-bold">Lv.{level + 1}</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  );
                })()}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <Coins className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-display font-bold">{Number(da.total_earned_meeet ?? 0).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">$MEEET</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <Trophy className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <div>
                      <p className="text-xs font-display font-bold">{da.quests_completed ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground">Quests</p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs gap-1.5 w-full"
                    onClick={() => setChatAgent(da)}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 border-primary/30"
                    onClick={() => setSettingsAgent(da)}
                  >
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </Button>
                  <Button
                    size="sm"
                    variant={da.status === "running" ? "outline" : "default"}
                    className={`text-xs gap-1.5 ${da.status === "running" ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                    disabled={actingId === "pause-" + da.id}
                    onClick={() => togglePause(da)}
                  >
                    {actingId === "pause-" + da.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : da.status === "running" ? (
                      <><Pause className="w-3.5 h-3.5" /> Pause</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Resume</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={!!settingsAgent} onOpenChange={(open) => !open && setSettingsAgent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{CLASS_EMOJI[settingsAgent?.agents?.class] || "🤖"}</span>
              {settingsAgent?.agents?.name || "Agent"} — Settings
            </DialogTitle>
            <DialogDescription>
              Configure autonomous behavior and manage your agent.
            </DialogDescription>
          </DialogHeader>

          {settingsAgent && (
            <div className="space-y-5 pt-2">
              {/* Auto Mode */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <Label className="font-display text-sm font-bold">System Interaction</Label>
                    <p className="text-[10px] text-muted-foreground">Auto quests, battles, research. ~$0.006/action</p>
                  </div>
                </div>
                <Switch
                  checked={!!settingsAgent.auto_mode}
                  disabled={actingId === "auto-" + settingsAgent.id}
                  onCheckedChange={() => {
                    toggleAutoMode(settingsAgent);
                    setSettingsAgent({ ...settingsAgent, auto_mode: !settingsAgent.auto_mode });
                    toast({ title: !settingsAgent.auto_mode ? "⚡ System Interaction enabled" : "System Interaction disabled", description: "Settings saved!" });
                  }}
                />
              </div>

              {/* Social Mode */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <UsersRound className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <Label className="font-display text-sm font-bold">Social Mode</Label>
                    <p className="text-[10px] text-muted-foreground">Chat with agents, discuss discoveries (+5 MEEET). ~$0.004/msg</p>
                  </div>
                </div>
                <Switch
                  checked={!!settingsAgent.social_mode}
                  disabled={actingId === "social-" + settingsAgent.id}
                  onCheckedChange={() => {
                    toggleSocialMode(settingsAgent);
                    setSettingsAgent({ ...settingsAgent, social_mode: !settingsAgent.social_mode });
                    toast({ title: !settingsAgent.social_mode ? "🤝 Social Mode enabled" : "Social Mode disabled", description: "Settings saved!" });
                  }}
                />
              </div>

              {/* Agent Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <Shield className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="font-bold">{settingsAgent.agents?.defense ?? 10}</p>
                  <p className="text-[9px] text-muted-foreground">Defense</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <Swords className="w-4 h-4 text-destructive mx-auto mb-1" />
                  <p className="font-bold">{settingsAgent.agents?.attack ?? 10}</p>
                  <p className="text-[9px] text-muted-foreground">Attack</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <FlaskConical className="w-4 h-4 text-secondary mx-auto mb-1" />
                  <p className="font-bold">{settingsAgent.agents?.discoveries_count ?? 0}</p>
                  <p className="text-[9px] text-muted-foreground">Discoveries</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="font-bold">{settingsAgent.agents?.reputation ?? 0}</p>
                  <p className="text-[9px] text-muted-foreground">Reputation</p>
                </div>
              </div>

              {/* Danger zone */}
              <div className="border-t border-border pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  disabled={actingId === "del-" + settingsAgent.id}
                  onClick={() => deleteAgent(settingsAgent)}
                >
                  {actingId === "del-" + settingsAgent.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete Agent
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={!!chatAgent} onOpenChange={(open) => !open && setChatAgent(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Chat with {chatAgent?.agents?.name}</DialogTitle>
            <DialogDescription>Send messages to your agent</DialogDescription>
          </DialogHeader>
          {chatAgent && (
            <AgentChat
              agentId={chatAgent.agents?.id || chatAgent.agent_id}
              agentName={chatAgent.agents?.name || "Agent"}
              agentClass={chatAgent.agents?.class || "oracle"}
              agentLevel={chatAgent.agents?.level || 1}
              inline
              onClose={() => setChatAgent(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
