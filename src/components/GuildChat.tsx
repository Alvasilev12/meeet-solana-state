import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  display_name: string;
  message: string;
  created_at: string;
  user_id: string;
}

interface Props {
  guildId: string;
}

export default function GuildChat({ guildId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [displayName, setDisplayName] = useState("Anonymous");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch display name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  // Load initial messages
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("guild_messages")
        .select("id, display_name, message, created_at, user_id")
        .eq("guild_id", guildId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data as Message[]);
    };
    load();
  }, [guildId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`guild-chat-${guildId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "guild_messages",
          filter: `guild_id=eq.${guildId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guildId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("guild_messages").insert({
        guild_id: guildId,
        user_id: user.id,
        display_name: displayName,
        message: text.trim(),
      } as any);
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-[360px] border border-border rounded-xl overflow-hidden bg-card/40">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-card/60">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-display font-semibold">Guild Chat</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                isMe
                  ? "bg-primary/15 text-foreground border border-primary/20"
                  : "bg-muted/40 text-foreground border border-border/30"
              }`}>
                {!isMe && (
                  <span className="text-[10px] font-semibold text-primary block mb-0.5">{msg.display_name}</span>
                )}
                <p className="text-xs leading-relaxed">{msg.message}</p>
              </div>
              <span className="text-[9px] text-muted-foreground mt-0.5 px-1">{formatTime(msg.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="px-3 py-2.5 border-t border-border flex items-center gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-8 text-xs"
            maxLength={500}
          />
          <Button type="submit" size="sm" disabled={!text.trim() || sending} className="h-8 w-8 p-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">Sign in to chat</p>
        </div>
      )}
    </div>
  );
}
