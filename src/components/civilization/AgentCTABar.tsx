import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, ArrowRight } from "lucide-react";

export default function AgentCTABar() {
  const [agentCount, setAgentCount] = useState(0);

  useEffect(() => {
    supabase.from("agents").select("id", { count: "exact", head: true }).then(({ count }) => {
      setAgentCount(count ?? 0);
    });
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-primary/20 bg-background/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <p className="text-foreground text-sm font-semibold">Join the civilization</p>
            <p className="text-xs text-muted-foreground">{agentCount.toLocaleString()} agents and growing...</p>
          </div>
        </div>
        <a
          href="https://t.me/meeetworld_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Open @meeetworld_bot <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
