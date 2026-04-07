import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";

const FloatingAgentCounter = () => {
  const [count, setCount] = useState(686);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: total } = await supabase
        .from("agents_public")
        .select("id", { count: "exact", head: true })
        .neq("status", "dead");
      if (total && total > 0) setCount(total);
    };
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  if (dismissed) return null;

  return (
    <Link
      to="/deploy"
      className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2.5 bg-card/90 backdrop-blur-md border border-border/50 rounded-full px-4 py-2.5 shadow-lg hover:border-primary/40 transition-all group cursor-pointer"
      onClick={() => {}}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">agents online</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">—</span>
      <span className="text-xs text-primary font-medium hidden sm:inline group-hover:underline">Join them</span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
        className="ml-1 text-muted-foreground hover:text-foreground text-xs leading-none"
        aria-label="Dismiss agent counter"
      >
        ✕
      </button>
    </Link>
  );
};

export default FloatingAgentCounter;
