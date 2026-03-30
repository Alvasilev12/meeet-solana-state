import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Send, Loader2, MessageSquare, Coins, X,
  Phone, Mail, ChevronDown, ChevronUp,
} from "lucide-react";

interface AgentChatProps {
  agentId: string;
  agentName: string;
  agentClass: string;
  agentLevel?: number;
  inline?: boolean;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender_type: "user" | "agent";
  message: string;
  created_at: string;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openclaw-chat`;

async function streamAgentChat({
  message,
  agentId,
  userId,
  roomId,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  message: string;
  agentId: string;
  userId: string;
  roomId: string;
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ message, agent_id: agentId, user_id: userId, room_id: roomId }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        onError(new Error(data.error || `Error ${resp.status}`));
        return;
      }
      onError(new Error(`Error ${resp.status}`));
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullText = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch { /* partial */ }
      }
    }

    onDone(fullText);
  } catch (e: any) {
    if (e.name === "AbortError") return;
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}

// ── Spix Actions Panel ──────────────────────────────────────────────

type SpixTab = "call" | "email" | "sms" | null;

function SpixActionsPanel({ agentId, agentName, userId }: { agentId: string; agentName: string; userId: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SpixTab>(null);

  // Call fields
  const [callPhone, setCallPhone] = useState("");
  const [callPlaybook, setCallPlaybook] = useState("");
  const [callSource, setCallSource] = useState("");

  // Email fields
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // SMS fields
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMsg, setSmsMsg] = useState("");

  const spixAction = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload: Record<string, unknown> }) => {
      const res = await supabase.functions.invoke("spix-proxy", {
        body: { action, ...payload },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.success) throw new Error(res.data?.error || "Spix error");
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "✅ Sent", description: `Action completed via ${agentName}` });
      setActiveTab(null);
      setCallPhone(""); setCallPlaybook(""); setCallSource("");
      setEmailTo(""); setEmailSubject(""); setEmailBody("");
      setSmsPhone(""); setSmsMsg("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleTab = (tab: SpixTab) => setActiveTab(prev => prev === tab ? null : tab);

  return (
    <div className="border-t border-primary/20 bg-card/80 backdrop-blur-sm">
      {/* Action buttons row */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="text-[9px] text-primary/60 font-bold mr-1 uppercase tracking-widest font-display">Spix</span>
        <button
          onClick={() => toggleTab("call")}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${
            activeTab === "call"
              ? "bg-accent/20 text-accent border border-accent/30 shadow-[0_0_8px_hsl(var(--accent)/0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
          }`}
        >
          <Phone className="w-3 h-3" /> 📞 Call
        </button>
        <button
          onClick={() => toggleTab("email")}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${
            activeTab === "email"
              ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_8px_hsl(var(--primary)/0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
          }`}
        >
          <Mail className="w-3 h-3" /> 📧 Email
        </button>
        <button
          onClick={() => toggleTab("sms")}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${
            activeTab === "sms"
              ? "bg-accent/20 text-accent border border-accent/30 shadow-[0_0_8px_hsl(var(--accent)/0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
          }`}
        >
          <MessageSquare className="w-3 h-3" /> 💬 SMS
        </button>
        {activeTab && (
          <button onClick={() => setActiveTab(null)} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded forms */}
      {activeTab === "call" && (
        <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-2.5 space-y-2">
            <Input placeholder="Playbook ID" value={callPlaybook} onChange={e => setCallPlaybook(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <Input placeholder="Source number" value={callSource} onChange={e => setCallSource(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <Input placeholder="+1 555 123 4567" value={callPhone} onChange={e => setCallPhone(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <Button
              size="sm" className="w-full h-8 text-xs gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/0.2)]"
              disabled={!callPlaybook || !callSource || !callPhone || spixAction.isPending}
              onClick={() => spixAction.mutate({
                action: "create-call",
                payload: { playbook_id: callPlaybook, source_number: callSource, destination_number: callPhone },
              })}
            >
              {spixAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
              📞 Call · $0.10/min
            </Button>
          </div>
        </div>
      )}

      {activeTab === "email" && (
        <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
            <Input placeholder="recipient@example.com" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <Input placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <textarea
              placeholder="Email body..."
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              className="w-full h-20 rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground"
            />
            <Button
              size="sm" className="w-full h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
              disabled={!emailTo || !emailSubject || !emailBody || spixAction.isPending}
              onClick={() => spixAction.mutate({
                action: "send-email",
                payload: { to: emailTo, subject: emailSubject, body: emailBody, from_name: `${agentName} (MEEET)` },
              })}
            >
              {spixAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              📧 Send Email · $0.02
            </Button>
          </div>
        </div>
      )}

      {activeTab === "sms" && (
        <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-2.5 space-y-2">
            <Input placeholder="+1 555 123 4567" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <Input placeholder="SMS message..." value={smsMsg} onChange={e => setSmsMsg(e.target.value)} className="h-8 text-xs bg-background/60 border-border/50" />
            <Button
              size="sm" className="w-full h-8 text-xs gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/0.2)]"
              disabled={!smsPhone || !smsMsg || spixAction.isPending}
              onClick={() => spixAction.mutate({
                action: "send-sms",
                payload: { to: smsPhone, message: smsMsg },
              })}
            >
              {spixAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
              💬 Send SMS · $0.04
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Chat Component ─────────────────────────────────────────────

export default function AgentChat({ agentId, agentName, agentClass, agentLevel, inline, onClose }: AgentChatProps) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(!!inline);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const qc = useQueryClient();

  const roomId = user ? `dm_${user.id}_${agentId}` : null;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["agent-chat-messages", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, sender_type, message, created_at")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(500);
      if (error) console.error("Chat history error:", error);
      return (data as ChatMessage[]) ?? [];
    },
    refetchInterval: isStreaming ? false : 8000,
  });

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isStreaming || !user || !roomId) return;
    setInput("");
    setStreamError(null);
    setIsStreaming(true);
    setStreamingText("");

    qc.setQueryData<ChatMessage[]>(["agent-chat-messages", roomId], (old = []) => [
      ...old,
      { id: `opt-user-${Date.now()}`, sender_type: "user", message: msg, created_at: new Date().toISOString() },
    ]);

    const MAX_RETRIES = 3;

    const attempt = (retry: number) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let accumulated = "";

      streamAgentChat({
        message: msg,
        agentId,
        userId: user.id,
        roomId,
        signal: controller.signal,
        onDelta: (delta) => {
          accumulated += delta;
          setStreamingText(accumulated);
        },
        onDone: () => {
          clearTimeout(timeoutId);
          setIsStreaming(false);
          setStreamingText("");
          abortRef.current = null;
          setTimeout(() => qc.invalidateQueries({ queryKey: ["agent-chat-messages", roomId] }), 500);
          qc.invalidateQueries({ queryKey: ["my-balance"] });
        },
        onError: (err) => {
          clearTimeout(timeoutId);
          const isTimeout = err.name === "AbortError" || err.message?.includes("TIMEOUT") || err.message?.includes("timeout");
          const isRetryable = isTimeout || err.message?.includes("502") || err.message?.includes("503") || err.message?.includes("504");

          if (isRetryable && retry < MAX_RETRIES && !accumulated) {
            const delay = Math.min(1000 * Math.pow(2, retry), 8000);
            setStreamingText("");
            setTimeout(() => attempt(retry + 1), delay);
          } else {
            setIsStreaming(false);
            setStreamingText("");
            setStreamError(retry > 0 ? `${err.message} (после ${retry} повторов)` : err.message);
            abortRef.current = null;
          }
        },
      });
    };

    attempt(0);
  }, [input, isStreaming, user, roomId, agentId, qc]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, isStreaming]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          <a href="/auth" className="text-primary underline">Sign in</a> to chat with your agent
        </p>
      </div>
    );
  }

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
          <Coins className="w-3 h-3 mr-0.5" /> ~$0.006/msg
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
        {!isLoading && messages.length === 0 && !isStreaming && (
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
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
              msg.sender_type === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/60 text-foreground rounded-bl-md"
            }`}>
              {msg.message}
            </div>
          </div>
        ))}

        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm bg-muted/60 text-foreground whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}

        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{agentName} is thinking...</span>
            </div>
          </div>
        )}

        {streamError && (
          <div className="text-center py-2">
            <p className="text-xs text-destructive">{streamError}</p>
            <button onClick={() => setStreamError(null)} className="text-xs text-primary underline mt-1">Dismiss</button>
          </div>
        )}
      </div>

      {/* Spix Actions Panel */}
      {user && <SpixActionsPanel agentId={agentId} agentName={agentName} userId={user.id} />}

      {/* Chat Input */}
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
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isStreaming}
            className="px-3"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
