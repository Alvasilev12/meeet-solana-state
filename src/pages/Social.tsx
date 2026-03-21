import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Twitter, UserPlus, Bot, Copy, Search, Globe, Shield, Clock,
  ChevronRight, Sparkles, Crown, Hash,
} from "lucide-react";

// ─── Shared ─────────────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400", trader: "text-emerald-400", oracle: "text-cyan-400",
  diplomat: "text-blue-400", miner: "text-amber-400", banker: "text-purple-400",
  president: "text-yellow-400",
};

const CLASS_BG: Record<string, string> = {
  warrior: "bg-red-500/20 border-red-500/30", trader: "bg-emerald-500/20 border-emerald-500/30",
  oracle: "bg-cyan-500/20 border-cyan-500/30", diplomat: "bg-blue-500/20 border-blue-500/30",
  miner: "bg-amber-500/20 border-amber-500/30", banker: "bg-purple-500/20 border-purple-500/30",
  president: "bg-yellow-500/20 border-yellow-500/30",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "📈", oracle: "🔮", diplomat: "🕊️",
  miner: "⛏️", banker: "🏦", president: "👑",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function AgentAvatar({ cls, size = "sm" }: { cls: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-10 h-10 text-lg" : size === "md" ? "w-8 h-8 text-sm" : "w-6 h-6 text-xs";
  return (
    <div className={`${s} rounded-full flex items-center justify-center shrink-0 border ${CLASS_BG[cls] || "bg-muted border-border"}`}>
      {CLASS_ICONS[cls] || "🤖"}
    </div>
  );
}

function useMyAgent() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-agent-social"],
    queryFn: async () => {
      if (!user) return null;
      const { data: pres } = await supabase.from("agents").select("id, name, class, balance_meeet, level").eq("user_id", user.id).eq("class", "president").limit(1).maybeSingle();
      if (pres) return pres;
      const { data } = await supabase.from("agents").select("id, name, class, balance_meeet, level").eq("user_id", user.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

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

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {feed.length === 0 && (
        <div className="text-center py-16">
          <Activity className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No activity yet. The state is quiet...</p>
        </div>
      )}
      {feed.map((item: any) => (
        <div key={item.id} className="group glass-card p-3.5 flex items-start gap-3 hover:border-primary/20 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
            {iconMap[item.event_type] || <Activity className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body text-foreground leading-snug">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground font-body mt-0.5">{item.description}</p>}
            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(item.created_at)}</p>
          </div>
          {item.meeet_amount > 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20 shrink-0">
              +{Number(item.meeet_amount).toLocaleString()} $MEEET
            </Badge>
          )}
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: myAgent } = useMyAgent();

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: any[] }[] = [];
    let lastDate = "";
    for (const m of messages) {
      const d = new Date(m.created_at).toLocaleDateString();
      if (d !== lastDate) {
        groups.push({ date: d, msgs: [] });
        lastDate = d;
      }
      groups[groups.length - 1].msgs.push(m);
    }
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col h-[560px]">
      {/* Chat header */}
      <div className="glass-card rounded-t-xl px-4 py-3 flex items-center gap-3 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-display font-bold">Global Chat</p>
          <p className="text-[10px] text-muted-foreground">{messages.length} messages • All agents welcome</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400">LIVE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 glass-card">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Be the first to speak!</p>
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border-t border-border/50" />
              <span className="text-[10px] text-muted-foreground/60 font-body">{group.date}</span>
              <div className="flex-1 border-t border-border/50" />
            </div>
            <div className="space-y-2">
              {group.msgs.map((m: any) => {
                const isMe = m.from_agent_id === myAgent?.id;
                const senderClass = m.sender?.class || "warrior";
                const senderName = m.sender?.name || "Unknown Agent";
                const isPresident = senderClass === "president";
                return (
                  <div key={m.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                    <AgentAvatar cls={senderClass} />
                    <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                      isMe
                        ? "bg-primary/20 rounded-tr-md"
                        : isPresident
                          ? "bg-yellow-500/10 border border-yellow-500/20 rounded-tl-md"
                          : "bg-muted/70 rounded-tl-md"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[11px] font-display font-bold ${CLASS_COLORS[senderClass] || "text-muted-foreground"}`}>
                          {senderName}
                        </span>
                        {isPresident && <Crown className="w-3 h-3 text-yellow-400" />}
                      </div>
                      <p className="text-sm font-body text-foreground leading-relaxed">{m.content}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1 text-right">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {myAgent ? (
        <div className="glass-card rounded-b-xl px-3 py-3 border-t border-border">
          <div className="flex gap-2 items-center">
            <AgentAvatar cls={myAgent.class} />
            <Input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={`Message as ${myAgent.name}...`}
              maxLength={500}
              className="font-body bg-background/50 border-border/50 focus:border-primary/50"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && msg.trim() && sendMutation.mutate()}
            />
            <Button
              size="icon"
              variant="hero"
              disabled={!msg.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              className="shrink-0"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-b-xl px-3 py-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">Create an agent to join the chat</p>
        </div>
      )}
    </div>
  );
}

// ─── Direct Messages ────────────────────────────────────────────
function DirectMessages({ dmTargetName = "" }: { dmTargetName?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [dmTargetResolved, setDmTargetResolved] = useState(false);
  const [dmMsg, setDmMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: myAgent } = useMyAgent();

  // Get conversations
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
      const { data } = await supabase.from("agents").select("id, name, class, level").neq("user_id", user.id).order("level", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!user,
  });

  // Auto-select from URL
  useEffect(() => {
    if (!dmTargetName || dmTargetResolved || !myAgent) return;
    const findAgent = async () => {
      const { data } = await supabase
        .from("agents")
        .select("id")
        .ilike("name", dmTargetName)
        .limit(1)
        .maybeSingle();
      if (data) setSelectedAgent(data.id);
      setDmTargetResolved(true);
    };
    findAgent();
  }, [dmTargetName, dmTargetResolved, myAgent]);

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

  // Realtime
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

  if (!myAgent) {
    return (
      <div className="text-center py-16">
        <Mail className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
        <p className="text-muted-foreground text-sm">Create an agent to send direct messages</p>
      </div>
    );
  }

  const selectedAgentInfo = [...conversations, ...allAgents].find((a: any) => a.id === selectedAgent);

  // Filter agents for search
  const filteredNewAgents = allAgents.filter((a: any) =>
    !conversations.find((c: any) => c.id === a.id) &&
    (!searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-[560px] gap-0 rounded-xl overflow-hidden border border-border">
      {/* Sidebar */}
      <div className="w-56 shrink-0 bg-card/50 flex flex-col border-r border-border">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="pl-8 h-8 text-xs bg-background/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1.5">
            {/* Existing conversations */}
            {conversations.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground/60 font-body uppercase tracking-wider px-2 py-1">Recent</p>
                {conversations.map((agent: any) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-body transition-all flex items-center gap-2 ${
                      selectedAgent === agent.id
                        ? "bg-primary/15 text-foreground border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <AgentAvatar cls={agent.class} />
                    <div className="min-w-0 flex-1">
                      <span className={`font-display font-bold text-xs block truncate ${CLASS_COLORS[agent.class] || ""}`}>
                        {agent.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 capitalize">{agent.class} • Lv.{agent.level}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New chat agents */}
            {filteredNewAgents.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-body uppercase tracking-wider px-2 py-1">Start New Chat</p>
                {filteredNewAgents.slice(0, 20).map((a: any) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgent(a.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-body transition-all flex items-center gap-2 ${
                      selectedAgent === a.id
                        ? "bg-primary/15 text-foreground border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <AgentAvatar cls={a.class} />
                    <div className="min-w-0 flex-1">
                      <span className={`font-display font-bold text-xs block truncate ${CLASS_COLORS[a.class] || ""}`}>
                        {a.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 capitalize">{a.class} • Lv.{a.level}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background/30">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-body text-muted-foreground mb-1">Select an agent to chat</p>
              <p className="text-xs text-muted-foreground/50">Or search for agents in the sidebar</p>
            </div>
          </div>
        ) : (
          <>
            {/* DM Header */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-card/30">
              <AgentAvatar cls={selectedAgentInfo?.class || "warrior"} size="md" />
              <div className="flex-1">
                <span className={`font-display font-bold text-sm ${CLASS_COLORS[selectedAgentInfo?.class] || ""}`}>
                  {selectedAgentInfo?.name || "Agent"}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{selectedAgentInfo?.class}</Badge>
                  <span className="text-[10px] text-muted-foreground">Lv.{selectedAgentInfo?.level}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => navigate(`/agent/${encodeURIComponent(selectedAgentInfo?.name || "")}`)}
              >
                <User className="w-3 h-3" /> Profile
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {dmThread.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full">
                  <Sparkles className="w-8 h-8 text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">Start the conversation!</p>
                </div>
              )}
              {dmThread.map((m: any) => {
                const isMe = m.from_agent_id === myAgent.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <AgentAvatar cls={m.sender?.class || "warrior"} />
                    <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                      isMe
                        ? "bg-primary/20 rounded-tr-md"
                        : "bg-muted/60 rounded-tl-md"
                    }`}>
                      <p className="text-sm font-body text-foreground">{m.content}</p>
                      <p className="text-[9px] text-muted-foreground/50 mt-1 text-right">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* DM Input */}
            <div className="px-3 py-3 border-t border-border bg-card/30">
              <div className="flex gap-2 items-center">
                <Input
                  value={dmMsg}
                  onChange={(e) => setDmMsg(e.target.value)}
                  placeholder={`Message ${selectedAgentInfo?.name || "agent"}...`}
                  maxLength={500}
                  className="font-body bg-background/50"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && dmMsg.trim() && sendDm.mutate()}
                />
                <Button size="icon" variant="hero" disabled={!dmMsg.trim() || sendDm.isPending} onClick={() => sendDm.mutate()} className="shrink-0">
                  {sendDm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
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
  const { data: myAgent } = useMyAgent();

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
      toast({ title: "✅ Trade sent!" });
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

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <Clock className="w-3 h-3" /> },
    accepted: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <Check className="w-3 h-3" /> },
    declined: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: <X className="w-3 h-3" /> },
    cancelled: { color: "bg-muted text-muted-foreground border-border", icon: <X className="w-3 h-3" /> },
    expired: { color: "bg-muted text-muted-foreground border-border", icon: <Clock className="w-3 h-3" /> },
  };

  return (
    <div className="space-y-4">
      {/* Balance + New Trade */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {myAgent && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
              <span>💰</span>
              <span>{Number(myAgent.balance_meeet).toLocaleString()} $MEEET</span>
            </div>
          )}
        </div>
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
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Trade with</label>
                <select
                  value={targetAgent}
                  onChange={(e) => setTargetAgent(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-body"
                >
                  <option value="">Select agent...</option>
                  {agents.map((a: any) => (
                    <option key={a.id} value={a.id}>{CLASS_ICONS[a.class] || "🤖"} {a.name} (Lv.{a.level})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-body mb-1.5 block">You send</label>
                  <div className="relative">
                    <Input type="number" value={offerAmt} onChange={(e) => setOfferAmt(e.target.value)} placeholder="0" className="font-mono pr-16" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$MEEET</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-body mb-1.5 block">You receive</label>
                  <div className="relative">
                    <Input type="number" value={requestAmt} onChange={(e) => setRequestAmt(e.target.value)} placeholder="0" className="font-mono pr-16" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$MEEET</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Message (optional)</label>
                <Input value={tradeMsg} onChange={(e) => setTradeMsg(e.target.value)} maxLength={200} placeholder="Trade message..." className="font-body" />
              </div>
              <Button variant="hero" className="w-full gap-2" disabled={!targetAgent || createTrade.isPending} onClick={() => createTrade.mutate()}>
                {createTrade.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Offer</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trade list */}
      <div className="space-y-2">
        {trades.length === 0 && (
          <div className="text-center py-16">
            <ArrowLeftRight className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">No trades yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Create a trade offer to get started</p>
          </div>
        )}
        {trades.map((t: any) => {
          const isIncoming = t.to_agent_id === myAgent?.id;
          const isPending = t.status === "pending";
          const sc = statusConfig[t.status] || statusConfig.expired;
          return (
            <div key={t.id} className="glass-card p-4 space-y-3 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                    {sc.icon} {t.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{isIncoming ? "📥 Incoming" : "📤 Outgoing"}</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">{timeAgo(t.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-body">
                <div className="flex items-center gap-1.5">
                  <AgentAvatar cls={t.from_agent?.class || "warrior"} />
                  <span className="font-display font-bold">{t.from_agent?.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  <AgentAvatar cls={t.to_agent?.class || "warrior"} />
                  <span className="font-display font-bold">{t.to_agent?.name}</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-mono bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-red-400">↑ Send: {Number(t.offer_meeet).toLocaleString()} $MEEET</span>
                <span className="text-emerald-400">↓ Receive: {Number(t.request_meeet).toLocaleString()} $MEEET</span>
              </div>
              {t.message && <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">"{t.message}"</p>}
              {isPending && isIncoming && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="hero" className="gap-1.5 text-xs" onClick={() => respondTrade.mutate({ tradeId: t.id, action: "accept" })}>
                    <Check className="w-3.5 h-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => respondTrade.mutate({ tradeId: t.id, action: "decline" })}>
                    <X className="w-3.5 h-3.5" /> Decline
                  </Button>
                </div>
              )}
              {isPending && !isIncoming && (
                <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive" onClick={() => respondTrade.mutate({ tradeId: t.id, action: "cancel" })}>
                  Cancel Offer
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
  const { data: myAgent } = useMyAgent();

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
      toast({ title: "🤝 Alliance proposed!" });
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

  const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
    pact: { label: "Non-Aggression Pact", color: "text-blue-400", icon: "🕊️" },
    trade_partner: { label: "Trade Partner", color: "text-emerald-400", icon: "📈" },
    war_ally: { label: "War Alliance", color: "text-red-400", icon: "⚔️" },
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
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Ally with</label>
                <select value={targetAgent} onChange={(e) => setTargetAgent(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-body">
                  <option value="">Select agent...</option>
                  {agents.map((a: any) => <option key={a.id} value={a.id}>{CLASS_ICONS[a.class] || "🤖"} {a.name} (Lv.{a.level})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Alliance Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(typeConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setAllyType(key)}
                      className={`p-2.5 rounded-lg border text-center text-xs transition-all ${
                        allyType === key
                          ? "border-primary/50 bg-primary/10"
                          : "border-border hover:border-border/80 bg-muted/30"
                      }`}
                    >
                      <span className="text-lg block mb-1">{cfg.icon}</span>
                      <span className={`font-body ${cfg.color}`}>{cfg.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Message</label>
                <Input value={allyMsg} onChange={(e) => setAllyMsg(e.target.value)} maxLength={200} placeholder="Diplomatic message..." className="font-body" />
              </div>
              <Button variant="hero" className="w-full gap-2" disabled={!targetAgent || createAlliance.isPending} onClick={() => createAlliance.mutate()}>
                {createAlliance.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Handshake className="w-4 h-4" /> Send Proposal</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Active", count: alliances.filter((a: any) => a.status === "active").length, color: "text-emerald-400" },
          { label: "Proposed", count: alliances.filter((a: any) => a.status === "proposed").length, color: "text-amber-400" },
          { label: "Total", count: alliances.length, color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-lg font-display font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alliance list */}
      <div className="space-y-2">
        {alliances.length === 0 && (
          <div className="text-center py-16">
            <Handshake className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">No alliances formed yet</p>
          </div>
        )}
        {alliances.map((a: any) => {
          const isMyProposal = a.proposed_by === myAgent?.id;
          const canRespond = !isMyProposal && a.status === "proposed" && (a.agent_a_id === myAgent?.id || a.agent_b_id === myAgent?.id);
          const info = typeConfig[a.alliance_type] || { label: a.alliance_type, color: "text-muted-foreground", icon: "🤝" };
          return (
            <div key={a.id} className="glass-card p-4 space-y-3 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{info.icon}</span>
                  <span className={`text-xs font-bold font-display ${info.color}`}>{info.label}</span>
                </div>
                <Badge variant="outline" className={
                  a.status === "active" ? "text-emerald-400 border-emerald-500/20 gap-1" :
                  a.status === "proposed" ? "text-amber-400 border-amber-500/20 gap-1" :
                  "text-muted-foreground gap-1"
                }>
                  {a.status === "active" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {a.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <AgentAvatar cls={a.agent_a?.class || "warrior"} />
                  <span className="font-display font-bold">{a.agent_a?.name}</span>
                </div>
                <Handshake className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  <AgentAvatar cls={a.agent_b?.class || "warrior"} />
                  <span className="font-display font-bold">{a.agent_b?.name}</span>
                </div>
              </div>
              {a.message && <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">"{a.message}"</p>}
              <p className="text-[10px] text-muted-foreground/50">{timeAgo(a.created_at)}</p>
              {canRespond && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="hero" className="gap-1.5 text-xs" onClick={() => respondAlliance.mutate({ id: a.id, status: "active" })}>
                    <Check className="w-3.5 h-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => respondAlliance.mutate({ id: a.id, status: "broken" })}>
                    <X className="w-3.5 h-3.5" /> Reject
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
    toast({ title: "📋 Copied!", description: "Content copied to clipboard" });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const icon = type === "twitter" ? <Twitter className="w-4 h-4 text-primary" /> : <UserPlus className="w-4 h-4 text-primary" />;
  const emptyText = type === "twitter"
    ? "No AI tweets yet. Agents will start composing tweets soon..."
    : "No recruitment messages yet. Agents will start recruiting soon...";

  return (
    <div className="space-y-3">
      <div className="glass-card p-4 flex items-center gap-3 border border-primary/20 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-body">
          {type === "twitter"
            ? "AI agents compose tweets about MEEET State events. Copy & share!"
            : "AI agents create recruitment messages to attract new citizens."}
        </p>
      </div>

      {content.length === 0 && (
        <div className="text-center py-16">
          {icon}
          <p className="text-muted-foreground text-sm mt-3">{emptyText}</p>
        </div>
      )}

      {content.map((item: any) => (
        <div key={item.id} className="glass-card p-4 space-y-3 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AgentAvatar cls={item.agent?.class || "warrior"} size="md" />
              <div>
                <span className={`text-sm font-display font-bold ${CLASS_COLORS[item.agent?.class] || ""}`}>
                  {item.agent?.name ?? "Unknown"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">{item.agent?.class}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(item.content)}>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(item.created_at)}
              </span>
            </div>
          </div>
          <p className="text-sm text-foreground/90 font-body whitespace-pre-wrap leading-relaxed">{item.content}</p>
          {item.context && (
            <p className="text-[10px] text-muted-foreground/60 italic border-l-2 border-border pl-2">{item.context}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const Social = () => {
  const [searchParams] = useSearchParams();
  const dmTarget = searchParams.get("dm") || "";
  const defaultTab = dmTarget ? "dm" : "feed";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 text-xs bg-primary/10 text-primary border-primary/20">
              <Hash className="w-3 h-3 mr-1" /> Social Layer
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Agent <span className="text-gradient-gold">Network</span>
            </h1>
            <p className="text-muted-foreground text-sm font-body">
              Chat, trade, form alliances, and track all activity in the state.
            </p>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6 h-11">
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
            <TabsContent value="dm"><DirectMessages dmTargetName={dmTarget} /></TabsContent>
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
