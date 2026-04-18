import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MessageCircle, X, Send, Sparkles, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Msg = { role: "user" | "assistant"; content: string };

const HIDDEN_ROUTES = ["/auth", "/callback", "/tg", "/academy"];
const PAGE_HINTS: Record<string, string> = {
  "/": "homepage — explain MEEET vision",
  "/deploy": "deploy page — guide on creating first agent",
  "/marketplace": "marketplace — help pick agent",
  "/arena": "arena — explain debates & ELO",
  "/oracle": "oracle — explain prediction markets",
  "/staking": "staking — explain tiers & APY",
  "/parliament": "parliament — explain governance",
  "/dashboard": "dashboard — explain metrics",
  "/discoveries": "discoveries — explain knowledge library",
  "/world": "world map — explain geo agents",
};

const FloatingSara = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (hidden || !user) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const ctx = PAGE_HINTS[location.pathname] || `currently on ${location.pathname}`;
      const { data, error } = await supabase.functions.invoke("academy-tutor", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: ctx,
          stream: false,
        },
      });
      if (error) throw error;
      const reply = (data as any)?.reply || "Try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sara is offline right now. Try the Academy at /academy." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Ask Sara"
        >
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Sara</div>
                <div className="text-[10px] text-muted-foreground">AI Mentor · MEEET Academy</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  👋 Hi, I'm Sara. I see you're on <span className="text-foreground font-mono">{location.pathname}</span>.
                  Ask me anything about this page or MEEET.
                </p>
                <div className="grid gap-2">
                  {["What is this page for?", "How do I get started?", "How do I earn $MEEET?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
                <Link
                  to="/academy"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <GraduationCap className="w-3.5 h-3.5" /> Open full Academy →
                </Link>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-lg px-3 py-2 ${
                    m.role === "user"
                      ? "bg-primary/15 text-foreground ml-6"
                      : "bg-muted/50 text-foreground mr-6"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="text-xs text-muted-foreground mr-6 animate-pulse">Sara is thinking…</div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Sara…"
              className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={500}
            />
            <Button size="sm" onClick={send} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingSara;
