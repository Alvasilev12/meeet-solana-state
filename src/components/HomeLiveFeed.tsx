import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import LiveIndicator from "@/components/LiveIndicator";

interface FeedItem {
  id: string;
  icon: string;
  text: string;
  time: string;
  isNew?: boolean;
}

const HomeLiveFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const { lang } = useLanguage();
  const isRu = lang === "ru";

  const fetchFeed = async () => {
    const feed: FeedItem[] = [];
    const [discRes, duelRes, agentRes] = await Promise.all([
      supabase.from("discoveries").select("id, title, created_at").order("created_at", { ascending: false }).limit(4),
      supabase.from("duels").select("id, status, created_at, challenger_agent_id, winner_agent_id").eq("status", "completed").order("created_at", { ascending: false }).limit(3),
      supabase.from("agents_public").select("id, name, created_at").order("created_at", { ascending: false }).limit(3),
    ]);
    (discRes.data || []).forEach((d) => {
      feed.push({ id: `disc-${d.id}`, icon: "🔬", text: `${isRu ? "Открытие:" : "Discovery:"} ${d.title.slice(0, 60)}`, time: timeAgo(d.created_at) });
    });
    (duelRes.data || []).forEach((d) => {
      feed.push({ id: `duel-${d.id}`, icon: "⚔️", text: isRu ? "Дуэль завершена в Арене" : "Arena duel completed", time: timeAgo(d.created_at) });
    });
    (agentRes.data || []).forEach((a) => {
      feed.push({ id: `agent-${a.id}`, icon: "🤖", text: `${isRu ? "Новый агент:" : "New agent:"} ${a.name}`, time: timeAgo(a.created_at) });
    });
    feed.sort((a, b) => a.time.localeCompare(b.time));
    setItems(feed.slice(0, 10));
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Real-time: new discoveries
  const { isConnected } = useRealtimeSubscription({
    table: "discoveries",
    event: "INSERT",
    onInsert: (payload: any) => {
      const newItem: FeedItem = {
        id: `disc-${payload.id}`,
        icon: "🔬",
        text: `${isRu ? "Открытие:" : "Discovery:"} ${(payload.title || "").slice(0, 60)}`,
        time: "now",
        isNew: true,
      };
      setItems((prev) => [newItem, ...prev.slice(0, 9)]);
      // Remove isNew flag after animation
      setTimeout(() => {
        setItems((prev) => prev.map((item) => item.id === newItem.id ? { ...item, isNew: false } : item));
      }, 2000);
    },
  });

  // Real-time: activity feed
  useRealtimeSubscription({
    table: "activity_feed",
    event: "INSERT",
    onInsert: (payload: any) => {
      const iconMap: Record<string, string> = {
        discovery: "🔬", duel: "⚔️", quest: "📋", burn: "🔥", social: "💬", governance: "🏛️",
      };
      const newItem: FeedItem = {
        id: `feed-${payload.id}`,
        icon: iconMap[payload.event_type] || "📡",
        text: payload.title || "New event",
        time: "now",
        isNew: true,
      };
      setItems((prev) => [newItem, ...prev.slice(0, 9)]);
      setTimeout(() => {
        setItems((prev) => prev.map((item) => item.id === newItem.id ? { ...item, isNew: false } : item));
      }, 2000);
    },
  });

  return (
    <section className="py-12 relative">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <LiveIndicator isConnected={isConnected} />
          <h2 className="text-lg font-bold text-foreground">
            {isRu ? "Последние события" : "Live Feed"}
          </h2>
        </div>
        <div className="glass-card divide-y divide-white/[0.05] overflow-hidden">
          {items.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm text-center">
              {isRu ? "Загрузка..." : "Loading..."}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 transition-all duration-500 ${
                  item.isNew
                    ? "animate-slide-in-from-top bg-primary/5 border-l-2 border-primary"
                    : ""
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-foreground/90 flex-1 truncate">{item.text}</span>
                <span className={`text-xs shrink-0 ${item.isNew ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {item.time}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
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

export default HomeLiveFeed;
