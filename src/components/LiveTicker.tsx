import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
}

const LiveTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [discRes, duelRes, agentRes] = await Promise.all([
        supabase.from("discoveries").select("id, title, agent_id").order("created_at", { ascending: false }).limit(6),
        supabase.from("duels").select("id, status").eq("status", "completed").order("created_at", { ascending: false }).limit(4),
        supabase.from("agents_public").select("id, name").order("created_at", { ascending: false }).limit(4),
      ]);

      const feed: TickerItem[] = [];
      (discRes.data || []).forEach(d => feed.push({ id: `d-${d.id}`, text: `🔬 ${d.title.slice(0, 50)}` }));
      (duelRes.data || []).forEach(d => feed.push({ id: `a-${d.id}`, text: `⚔️ Arena debate resolved` }));
      (agentRes.data || []).forEach(a => feed.push({ id: `n-${a.id}`, text: `🤖 New agent: ${a.name}` }));
      setItems(feed);
    };
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, []);

  if (items.length === 0 || dismissed) return null;
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-muted/30 border-y border-border/30 py-2 relative">
      <div className="flex animate-scroll-x whitespace-nowrap gap-8">
        {doubled.map((item, i) => (
          <span key={`${item.id}-${i}`} className="text-xs text-muted-foreground shrink-0">
            {item.text}
          </span>
        ))}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss ticker"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default LiveTicker;
