import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { X, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FeedItem {
  id: string;
  icon: string;
  text: string;
  time: string;
}

const SocialProofFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchFeed = useCallback(async () => {
    const feed: FeedItem[] = [];
    const [discRes, duelRes, stakeRes, govRes] = await Promise.all([
      supabase.from("discoveries").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("duels").select("id, status, created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(2),
      supabase.from("agent_stakes").select("id, amount_meeet, created_at, agent_id").eq("status", "active").order("staked_at", { ascending: false }).limit(2),
      supabase.from("laws").select("id, title, created_at").order("created_at", { ascending: false }).limit(2),
    ]);

    (discRes.data || []).forEach((d: any) => {
      feed.push({ id: `d-${d.id}`, icon: "🔬", text: `New discovery: ${(d.title || "").slice(0, 50)}`, time: timeAgo(d.created_at) });
    });
    (duelRes.data || []).forEach((d: any) => {
      feed.push({ id: `duel-${d.id}`, icon: "⚔️", text: "Arena debate resolved", time: timeAgo(d.created_at) });
    });
    (stakeRes.data || []).forEach((s: any) => {
      feed.push({ id: `stake-${s.id}`, icon: "🔒", text: `${(s.amount_meeet || 0).toLocaleString()} MEEET staked`, time: timeAgo(s.created_at) });
    });
    (govRes.data || []).forEach((l: any) => {
      feed.push({ id: `gov-${l.id}`, icon: "🏛️", text: `Proposal: ${(l.title || "").slice(0, 45)}`, time: timeAgo(l.created_at) });
    });

    feed.sort((a, b) => a.time.localeCompare(b.time));
    setItems(feed.slice(0, 8));
  }, []);

  useEffect(() => {
    fetchFeed();
    const iv = setInterval(fetchFeed, 20000);
    return () => clearInterval(iv);
  }, [fetchFeed]);

  // Realtime inserts
  useEffect(() => {
    const ch = supabase
      .channel("social-proof-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload: any) => {
        const row = payload.new;
        const iconMap: Record<string, string> = {
          discovery: "🔬", duel: "⚔️", quest: "📋", burn: "🔥", social: "💬", governance: "🏛️", staking: "🔒", trade: "💰",
        };
        const newItem: FeedItem = {
          id: `rt-${row.id}`,
          icon: iconMap[row.event_type] || "📡",
          text: (row.title || "New event").slice(0, 60),
          time: "now",
        };
        setItems((prev) => [newItem, ...prev.slice(0, 7)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="feed-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-card/90 backdrop-blur-lg border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-foreground">Live Activity</span>
              </div>
              <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-[260px] overflow-y-auto divide-y divide-border/20">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="text-[11px] text-foreground/80 flex-1 truncate">{item.text}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="feed-fab"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg hover:bg-muted/80 transition-colors"
          >
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-foreground">Live</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default SocialProofFeed;
