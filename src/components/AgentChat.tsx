import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Loader2, MessageSquare, Coins, X, Maximize2, Minimize2,
} from "lucide-react";

interface AgentChatProps {
  agentId: string;
  agentName: string;
  agentClass: string;
  agentLevel?: number;
  /** If true, render as full-page; otherwise floating widget */
  inline?: boolean;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender_type: "user" | "agent";
  message: string;
  created_at: string;
}

export default function AgentChat({ agentId, agentName, agentClass, agentLevel, inline, onClose }: AgentChatProps) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(!!inline);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const roomId = user ? `dm_${user.id}_${agentId}` : null;

  // Load history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["agent-chat-messages", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, sender_type, message, created_at")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true })
        .limit(50);
      return (data as ChatMessage[]) ?? [];
    },
    refetchInterval: 5000,
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await supabase.functions.invoke("openclaw-chat", {
        body: { message: msg, agent_id: agentId, user_id: user!.id, room_id: roomId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-chat-messages", roomId] });
      qc.invalidateQueries({ queryKey: ["my-balance"] });
    },
  });

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(msg);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMutation.isPending]);

  // Focus input on expand
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (!user) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            <a href="/auth" className="text-primary underline">Sign in</a> to chat with your agent
          </p>
        </CardContent>
      </Card>
    );
  }

  // Minimized floating button
  if (!expanded && !inline) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center group"
      >
        <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
      </button>
    );
  }

  const containerClass = inline
    ? "w-full h-[600px] flex flex-col bg-card border border-border rounded-2xl overflow-hidden"
    : "fixed bottom-20 right-4 z-50 w-[380px] h-[520px] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-foreground truncate">{agentName}</p>
          <p className="text-[10px] text-muted-foreground">
            {agentClass} · Lv.{agentLevel || 1} · <span className="text-emerald-400">Online</span>
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">
          <Coins className="w-3 h-3 mr-0.5" /> 6 MEEET/msg
        </Badge>
        {!inline && (
          <button onClick={onClose || (() => setExpanded(false))} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Bot className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Start chatting with <span className="text-foreground font-medium">{agentName}</span></p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {["What's your expertise?", "Make a discovery", "Tell me about MEEET"].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-[11px] bg-muted/50 hover:bg-muted border border-border rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              msg.sender_type === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/60 text-foreground rounded-bl-md"
            }`}>
              {msg.message}
            </div>
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[10px] text-muted-foreground">thinking...</span>
            </div>
          </div>
        )}
        {sendMutation.isError && (
          <div className="text-center">
            <p className="text-xs text-destructive">{(sendMutation.error as any)?.message || "Failed to send"}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-muted/20">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${agentName}...`}
            className="flex-1 bg-background text-sm"
            disabled={sendMutation.isPending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || sendMutation.isPending}
            className="px-3"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
