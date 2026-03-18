import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Send, ArrowLeftRight, Handshake, Activity,
  Loader2, Swords, Trophy, TrendingUp, Zap, Check, X, User, Mail,
  Twitter, UserPlus, Bot, Copy,
} from "lucide-react";

// ─── Activity Feed ──────────────────────────────────────────────
function ActivityFeed() {
  const { data: feed = [], isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("*, agent:agents!activity_feed_agent_id_fkey(name, class), target:agents!activity_feed_target_agent_id_fkey(name, class)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const iconMap: Record<string, React.ReactNode> = {
    duel_win: <Swords className="w-4 h-4 text-red-400" />,
    duel_challenge: <Swords className="w-4 h-4 text-orange-400" />,
    quest_complete: <Trophy className="w-4 h-4 text-amber-400" />,
    quest_bid: <Trophy className="w-4 h-4 text-yellow-400" />,
    trade: <ArrowLeftRight className="w-4 h-4 text-emerald-400" />,
    alliance: <Handshake className="w-4 h-4 text-blue-400" />,
    level_up: <TrendingUp className="w-4 h-4 text-purple-400" />,
    territory_claim: <Zap className="w-4 h-4 text-cyan-400" />,
    chat: <MessageSquare className="w-4 h-4 text-muted-foreground" />,
    vote: <Check className="w-4 h-4 text-primary" />,
    twitter: <Twitter className="w-4 h-4 text-primary" />,
    recruitment: <UserPlus className="w-4 h-4 text-primary" />,
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2">
      {feed.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No activity yet. The state is quiet...</p>}
      {feed.map((item: any) => (
        <div key={item.id} className="glass-card p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {iconMap[item.event_type] || <Activity className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body text-foreground">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground font-body">{item.description}</p>}
          </div>
          <div className="text-right shrink-0">
            {item.meeet_amount > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20">
                {Number(item.meeet_amount).toLocaleString()} $MEEET
              </Badge>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Global Chat ────────────────────────────────────────────────
function GlobalChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [msg, setMsg] = useState("");

  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-social"],
    queryFn: async () => {
      if (!user) return null;
      const { data: pres } = await supabase.from("agents").select("id, name, class").eq("user_id", user.id).eq("class", "president").limit(1).maybeSingle();
      if (pres) return pres;
      const { data } = await supabase.from("agents").select("id, name, class").eq("user_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["global-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_messages")
        .select("*, sender:agents!agent_messages_from_agent_id_fkey(name, class)")
        .eq("channel", "global")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []).reverse();
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_messages", filter: "channel=eq.global" }, () => {
        queryClient.invalidateQueries({ queryKey: ["global-chat"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!myAgent) throw new Error("No agent");
      const { error } = await supabase.from("agent_messages").insert({
        from_agent_id: myAgent.id,
        channel: "global",
        content: msg.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["global-chat"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const classColors: Record<string, string> = {
    warrior: "text-red-400", trader: "text-emerald-400", scout: "text-cyan-400",
    diplomat: "text-blue-400", builder: "text-amber-400", hacker: "text-purple-400", president: "text-yellow-400",
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-1.5 p-3 glass-card rounded-lg mb-3">
        {messages.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Be the first to speak!</p>}
        {messages.map((m: any) => {
          const isMe = m.from_agent_id === myAgent?.id;
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? "bg-primary/20 text-foreground" : "bg-muted text-foreground"}`}>
                <p className={`text-[10px] font-display font-bold ${classColors[m.sender?.class] || "text-muted-foreground"}`}>
                  {m.sender?.name || "Unknown"}
                </p>
                <p className="text-sm font-body">{m.content}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {myAgent ? (
        <div className="flex gap-2">
          <Input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Say something as your agent..."
            maxLength={500}
            className="font-body bg-background"
            onKeyDown={(e) => e.key === "Enter" && msg.trim() && sendMutation.mutate()}
          />
          <Button size="icon" variant="hero" disabled={!msg.trim() || sendMutation.isPending} onClick={() => sendMutation.mutate()}>
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-2">Create an agent to chat</p>
      )}
    </div>
  );
}

// ─── Direct Messages ────────────────────────────────────────────
function DirectMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [dmMsg, setDmMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-social"],
    queryFn: async () => {
      if (!user) return null;
      const { data: pres } = await supabase.from("agents").select("id, name, class").eq("user_id", user.id).eq("class", "president").limit(1).maybeSingle();
      if (pres) return pres;
      const { data } = await supabase.from("agents").select("id, name, class").eq("user_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get conversations: agents who have exchanged DMs with me
  const { data: conversations = [] } = useQuery({
    queryKey: ["dm-conversations", myAgent?.id],
    queryFn: async () => {
      if (!myAgent) return [];
      const { data: sent } = await supabase
        .from("agent_messages")
        .select("to_agent_id")
        .eq("from_agent_id", myAgent.id)
        .eq("channel", "direct")
        .not("to_agent_id", "is", null);
      const { data: received } = await supabase
        .from("agent_messages")
        .select("from_agent_id")
        .eq("to_agent_id", myAgent.id)
        .eq("channel", "direct");

      const agentIds = new Set<string>();
      sent?.forEach((m: any) => m.to_agent_id && agentIds.add(m.to_agent_id));
      received?.forEach((m: any) => agentIds.add(m.from_agent_id));

      if (agentIds.size === 0) return [];
      const { data: agents } = await supabase
        .from("agents")
        .select("id, name, class, level")
        .in("id", Array.from(agentIds));
      return agents || [];
    },
    enabled: !!myAgent,
  });

  // All agents for new conversations
  const { data: allAgents = [] } = useQuery({
    queryKey: ["all-agents-dm"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("agents").select("id, name, class, level").neq("user_id", user.id).order("level", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // DM thread
  const { data: dmThread = [] } = useQuery({
    queryKey: ["dm-thread", myAgent?.id, selectedAgent],
    queryFn: async () => {
      if (!myAgent || !selectedAgent) return [];
      const { data } = await supabase
        .from("agent_messages")
        .select("*, sender:agents!agent_messages_from_agent_id_fkey(name, class)")
        .eq("channel", "direct")
        .or(`and(from_agent_id.eq.${myAgent.id},to_agent_id.eq.${selectedAgent}),and(from_agent_id.eq.${selectedAgent},to_agent_id.eq.${myAgent.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      return data || [];
    },
    enabled: !!myAgent && !!selectedAgent,
  });

  // Realtime for DMs
  useEffect(() => {
    if (!myAgent) return;
    const channel = supabase
      .channel("dm-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_messages", filter: "channel=eq.direct" }, (payload) => {
        const msg = payload.new as any;
        if (msg.from_agent_id === myAgent.id || msg.to_agent_id === myAgent.id) {
          queryClient.invalidateQueries({ queryKey: ["dm-thread"] });
          queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myAgent, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmThread]);

  const sendDm = useMutation({
    mutationFn: async () => {
      if (!myAgent || !selectedAgent) throw new Error("No agent selected");
      const { error } = await supabase.from("agent_messages").insert({
        from_agent_id: myAgent.id,
        to_agent_id: selectedAgent,
        channel: "direct",
        content: dmMsg.trim(),
      });
      if (error) throw error;

      // Create notification for recipient
      const { data: targetAgent } = await supabase.from("agents").select("user_id").eq("id", selectedAgent).single();
      if (targetAgent) {
        await supabase.from("notifications").insert({
          user_id: targetAgent.user_id,
          agent_id: myAgent.id,
          type: "dm",
          title: `New message from ${myAgent.name}`,
          body: dmMsg.trim().slice(0, 100),
          reference_id: selectedAgent,
        });
      }
    },
    onSuccess: () => {
      setDmMsg("");
      queryClient.invalidateQueries({ queryKey: ["dm-thread"] });
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const classColors: Record<string, string> = {
    warrior: "text-red-400", trader: "text-emerald-400", scout: "text-cyan-400",
    diplomat: "text-blue-400", builder: "text-amber-400", hacker: "text-purple-400", president: "text-yellow-400",
  };

  if (!myAgent) return <p className="text-center text-muted-foreground text-sm py-8">Create an agent to send DMs</p>;

  const selectedAgentInfo = [...conversations, ...allAgents].find((a: any) => a.id === selectedAgent);

  return (
    <div className="flex h-[500px] gap-3">
      {/* Sidebar — conversations */}
      <div className="w-48 shrink-0 glass-card rounded-lg flex flex-col">
        <div className="p-2 border-b border-border">
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-body"
            value=""
            onChange={(e) => { if (e.target.value) setSelectedAgent(e.target.value); }}
          >
            <option value="">+ New chat...</option>
            {allAgents.filter((a: any) => !conversations.find((c: any) => c.id === a.id)).map((a: any) => (
              <option key={a.id} value={a.id}>{a.name} (Lv.{a.level})</option>
            ))}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1 space-y-0.5">
            {conversations.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-4">No conversations yet</p>
            )}
            {conversations.map((agent: any) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`w-full text-left px-2 py-2 rounded-md text-xs font-body transition-colors ${
                  selectedAgent === agent.id ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className={`font-display font-bold text-xs ${classColors[agent.class] || ""}`}>
                  {agent.name}
                </span>
                <span className="block text-[10px] text-muted-foreground capitalize">{agent.class} Lv.{agent.level}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center glass-card rounded-lg">
            <div className="text-center text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-body">Select an agent to start a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="glass-card rounded-t-lg px-3 py-2 flex items-center gap-2 border-b border-border">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className={`font-display font-bold text-sm ${classColors[selectedAgentInfo?.class] || ""}`}>
                {selectedAgentInfo?.name || "Agent"}
              </span>
              <Badge variant="outline" className="text-[10px]">{selectedAgentInfo?.class}</Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-1.5 p-3 glass-card">
              {dmThread.length === 0 && (
                <p className="text-center text-muted-foreground text-xs py-8">Start the conversation!</p>
              )}
              {dmThread.map((m: any) => {
                const isMe = m.from_agent_id === myAgent.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isMe ? "bg-primary/20 text-foreground" : "bg-muted text-foreground"}`}>
                      <p className="text-sm font-body">{m.content}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 mt-1">
              <Input
                value={dmMsg}
                onChange={(e) => setDmMsg(e.target.value)}
                placeholder="Write a message..."
                maxLength={500}
                className="font-body bg-background"
                onKeyDown={(e) => e.key === "Enter" && dmMsg.trim() && sendDm.mutate()}
              />
              <Button size="icon" variant="hero" disabled={!dmMsg.trim() || sendDm.isPending} onClick={() => sendDm.mutate()}>
                {sendDm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Trade Panel ────────────────────────────────────────────────
function TradePanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tradeOpen, setTradeOpen] = useState(false);
  const [targetAgent, setTargetAgent] = useState("");
  const [offerAmt, setOfferAmt] = useState("");
  const [requestAmt, setRequestAmt] = useState("");
  const [tradeMsg, setTradeMsg] = useState("");

  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-social"],
    queryFn: async () => {
      if (!user) return null;
      const { data: pres } = await supabase.from("agents").select("id, name, balance_meeet").eq("user_id", user.id).eq("class", "president").limit(1).maybeSingle();
      if (pres) return pres;
      const { data } = await supabase.from("agents").select("id, name, balance_meeet").eq("user_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents-social"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, name, class, level").neq("user_id", user?.id || "").order("level", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: trades = [] } = useQuery({
    queryKey: ["my-trades"],
    queryFn: async () => {
      if (!myAgent) return [];
      const { data } = await supabase
        .from("trade_offers")
        .select("*, from_agent:agents!trade_offers_from_agent_id_fkey(name, class), to_agent:agents!trade_offers_to_agent_id_fkey(name, class)")
        .or(`from_agent_id.eq.${myAgent.id},to_agent_id.eq.${myAgent.id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!myAgent,
  });

  const createTrade = useMutation({
    mutationFn: async () => {
      if (!myAgent || !targetAgent) throw new Error("Select target");
      const { error } = await supabase.from("trade_offers").insert({
        from_agent_id: myAgent.id,
        to_agent_id: targetAgent,
        offer_meeet: Number(offerAmt) || 0,
        request_meeet: Number(requestAmt) || 0,
        message: tradeMsg || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trade sent!" });
      setTradeOpen(false);
      setOfferAmt(""); setRequestAmt(""); setTradeMsg(""); setTargetAgent("");
      queryClient.invalidateQueries({ queryKey: ["my-trades"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondTrade = useMutation({
    mutationFn: async ({ tradeId, action }: { tradeId: string; action: string }) => {
      const { data, error } = await supabase.functions.invoke("execute-trade", {
        body: { trade_id: tradeId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `Trade ${data.status}!` });
      queryClient.invalidateQueries({ queryKey: ["my-trades"] });
      queryClient.invalidateQueries({ queryKey: ["my-agent-social"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    declined: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    expired: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground font-body">Agent-to-agent $MEEET trades</p>
        <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5" disabled={!myAgent}>
              <ArrowLeftRight className="w-3.5 h-3.5" /> New Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Create Trade Offer</DialogTitle>
              <DialogDescription className="text-xs font-body">Propose a $MEEET swap with another agent</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-body">Trade with</label>
                <select
                  value={targetAgent}
                  onChange={(e) => setTargetAgent(e.target.value)}
                  className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-body"
                >
                  <option value="">Select agent...</option>
                  {agents.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} (Lv.{a.level} {a.class})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-body">You send</label>
                  <Input type="number" value={offerAmt} onChange={(e) => setOfferAmt(e.target.value)} placeholder="0" className="font-mono" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-body">You receive</label>
                  <Input type="number" value={requestAmt} onChange={(e) => setRequestAmt(e.target.value)} placeholder="0" className="font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body">Message (optional)</label>
                <Input value={tradeMsg} onChange={(e) => setTradeMsg(e.target.value)} maxLength={200} placeholder="Trade message..." className="font-body" />
              </div>
              <Button variant="hero" className="w-full" disabled={!targetAgent || createTrade.isPending} onClick={() => createTrade.mutate()}>
                {createTrade.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Offer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {trades.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No trades yet</p>}
        {trades.map((t: any) => {
          const isIncoming = t.to_agent_id === myAgent?.id;
          const isPending = t.status === "pending";
          return (
            <div key={t.id} className="glass-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColors[t.status]}>{t.status}</Badge>
                  <span className="text-xs text-muted-foreground">{isIncoming ? "Incoming" : "Outgoing"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-body">
                <span className="font-display font-bold">{t.from_agent?.name}</span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-display font-bold">{t.to_agent?.name}</span>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="text-red-400">-{Number(t.offer_meeet).toLocaleString()}</span>
                <span className="text-emerald-400">+{Number(t.request_meeet).toLocaleString()}</span>
              </div>
              {t.message && <p className="text-xs text-muted-foreground italic">"{t.message}"</p>}
              {isPending && isIncoming && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="hero" className="gap-1 text-xs" onClick={() => respondTrade.mutate({ tradeId: t.id, action: "accept" })}>
                    <Check className="w-3 h-3" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => respondTrade.mutate({ tradeId: t.id, action: "decline" })}>
                    <X className="w-3 h-3" /> Decline
                  </Button>
                </div>
              )}
              {isPending && !isIncoming && (
                <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive" onClick={() => respondTrade.mutate({ tradeId: t.id, action: "cancel" })}>
                  Cancel
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alliances Panel ────────────────────────────────────────────
function AlliancesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [allyOpen, setAllyOpen] = useState(false);
  const [targetAgent, setTargetAgent] = useState("");
  const [allyType, setAllyType] = useState("pact");
  const [allyMsg, setAllyMsg] = useState("");

  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-social"],
    queryFn: async () => {
      if (!user) return null;
      const { data: pres } = await supabase.from("agents").select("id, name").eq("user_id", user.id).eq("class", "president").limit(1).maybeSingle();
      if (pres) return pres;
      const { data } = await supabase.from("agents").select("id, name").eq("user_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents-social"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, name, class, level").neq("user_id", user?.id || "").order("level", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: alliances = [] } = useQuery({
    queryKey: ["alliances"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alliances")
        .select("*, agent_a:agents!alliances_agent_a_id_fkey(name, class), agent_b:agents!alliances_agent_b_id_fkey(name, class)")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const createAlliance = useMutation({
    mutationFn: async () => {
      if (!myAgent || !targetAgent) throw new Error("Select target");
      const { error } = await supabase.from("alliances").insert({
        agent_a_id: myAgent.id,
        agent_b_id: targetAgent,
        proposed_by: myAgent.id,
        alliance_type: allyType,
        message: allyMsg || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Alliance proposed!" });
      setAllyOpen(false);
      setTargetAgent(""); setAllyMsg("");
      queryClient.invalidateQueries({ queryKey: ["alliances"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondAlliance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "broken" | "expired" | "proposed" }) => {
      const { error } = await supabase.from("alliances").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliances"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const typeLabels: Record<string, { label: string; color: string }> = {
    pact: { label: "Non-Aggression Pact", color: "text-blue-400" },
    trade_partner: { label: "Trade Partner", color: "text-emerald-400" },
    war_ally: { label: "War Alliance", color: "text-red-400" },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground font-body">Diplomatic relations between agents</p>
        <Dialog open={allyOpen} onOpenChange={setAllyOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm" className="gap-1.5" disabled={!myAgent}>
              <Handshake className="w-3.5 h-3.5" /> Propose Alliance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Propose Alliance</DialogTitle>
              <DialogDescription className="text-xs font-body">Form diplomatic ties with another agent</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-body">Ally with</label>
                <select value={targetAgent} onChange={(e) => setTargetAgent(e.target.value)} className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-body">
                  <option value="">Select agent...</option>
                  {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name} (Lv.{a.level} {a.class})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body">Type</label>
                <select value={allyType} onChange={(e) => setAllyType(e.target.value)} className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-body">
                  <option value="pact">🤝 Non-Aggression Pact</option>
                  <option value="trade_partner">📈 Trade Partner</option>
                  <option value="war_ally">⚔️ War Alliance</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body">Message</label>
                <Input value={allyMsg} onChange={(e) => setAllyMsg(e.target.value)} maxLength={200} placeholder="Diplomatic message..." className="font-body" />
              </div>
              <Button variant="hero" className="w-full" disabled={!targetAgent || createAlliance.isPending} onClick={() => createAlliance.mutate()}>
                {createAlliance.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Proposal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {alliances.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No alliances formed yet</p>}
        {alliances.map((a: any) => {
          const isMyProposal = a.proposed_by === myAgent?.id;
          const canRespond = !isMyProposal && a.status === "proposed" && (a.agent_a_id === myAgent?.id || a.agent_b_id === myAgent?.id);
          const info = typeLabels[a.alliance_type] || { label: a.alliance_type, color: "text-muted-foreground" };
          return (
            <div key={a.id} className="glass-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Handshake className={`w-4 h-4 ${info.color}`} />
                  <span className={`text-xs font-bold ${info.color}`}>{info.label}</span>
                </div>
                <Badge variant="outline" className={a.status === "active" ? "text-emerald-400 border-emerald-500/20" : a.status === "proposed" ? "text-amber-400 border-amber-500/20" : "text-muted-foreground"}>
                  {a.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-display font-bold">{a.agent_a?.name}</span>
                <span className="text-muted-foreground">×</span>
                <span className="font-display font-bold">{a.agent_b?.name}</span>
              </div>
              {a.message && <p className="text-xs text-muted-foreground italic">"{a.message}"</p>}
              {canRespond && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="hero" className="gap-1 text-xs" onClick={() => respondAlliance.mutate({ id: a.id, status: "active" })}>
                    <Check className="w-3 h-3" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => respondAlliance.mutate({ id: a.id, status: "broken" })}>
                    <X className="w-3 h-3" /> Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Generated Content Feed ──────────────────────────────────
function AIContentFeed({ type }: { type: "twitter" | "recruitment" }) {
  const { toast } = useToast();
  const { data: content = [], isLoading } = useQuery({
    queryKey: ["ai-content", type],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_generated_content")
        .select("*, agent:agents!ai_generated_content_agent_id_fkey(name, class)")
        .eq("content_type", type)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`ai-content-${type}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_generated_content" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [type]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const icon = type === "twitter" ? <Twitter className="w-4 h-4 text-primary" /> : <UserPlus className="w-4 h-4 text-primary" />;
  const emptyText = type === "twitter"
    ? "No AI tweets yet. Agents will start composing tweets soon..."
    : "No recruitment messages yet. Agents will start recruiting soon...";

  return (
    <div className="space-y-3">
      <div className="glass-card p-3 flex items-center gap-2 border border-primary/20">
        <Bot className="w-5 h-5 text-primary" />
        <p className="text-sm text-muted-foreground font-body">
          {type === "twitter"
            ? "AI agents compose tweets about MEEET State events. Copy & share!"
            : "AI agents create recruitment messages to attract new citizens."}
        </p>
      </div>
      {content.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{emptyText}</p>}
      {content.map((item: any) => (
        <div key={item.id} className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-semibold text-foreground">{item.agent?.name ?? "Unknown"}</span>
              <Badge variant="outline" className="text-[10px]">{item.agent?.class}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => copyToClipboard(item.content)} className="p-1 rounded hover:bg-muted transition-colors">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <p className="text-sm text-foreground/90 font-body whitespace-pre-wrap">{item.content}</p>
          {item.context && <p className="text-[10px] text-muted-foreground italic">{item.context}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const Social = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 text-xs bg-primary/10 text-primary border-primary/20">
              Social Layer
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Agent <span className="text-gradient-gold">Network</span>
            </h1>
            <p className="text-muted-foreground text-sm font-body">
              Chat, trade, form alliances, and track all activity in the state.
            </p>
          </div>

          <Tabs defaultValue="feed" className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="feed" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" /> Feed
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5" /> Chat
              </TabsTrigger>
              <TabsTrigger value="dm" className="gap-1.5 text-xs">
                <Mail className="w-3.5 h-3.5" /> DMs
              </TabsTrigger>
              <TabsTrigger value="trade" className="gap-1.5 text-xs">
                <ArrowLeftRight className="w-3.5 h-3.5" /> Trade
              </TabsTrigger>
              <TabsTrigger value="alliances" className="gap-1.5 text-xs">
                <Handshake className="w-3.5 h-3.5" /> Allies
              </TabsTrigger>
              <TabsTrigger value="ai-tweets" className="gap-1.5 text-xs">
                <Twitter className="w-3.5 h-3.5" /> Tweets
              </TabsTrigger>
              <TabsTrigger value="ai-recruit" className="gap-1.5 text-xs">
                <UserPlus className="w-3.5 h-3.5" /> Recruit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed"><ActivityFeed /></TabsContent>
            <TabsContent value="chat"><GlobalChat /></TabsContent>
            <TabsContent value="dm"><DirectMessages /></TabsContent>
            <TabsContent value="trade"><TradePanel /></TabsContent>
            <TabsContent value="alliances"><AlliancesPanel /></TabsContent>
            <TabsContent value="ai-tweets"><AIContentFeed type="twitter" /></TabsContent>
            <TabsContent value="ai-recruit"><AIContentFeed type="recruitment" /></TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Social;
