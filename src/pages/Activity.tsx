import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Loader2, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 20;

type FilterType = "all" | "discoveries" | "arena" | "agents" | "economy" | "social";

const EVENT_TYPE_MAP: Record<string, { icon: string; color: string; filter: FilterType; link?: (item: any) => string }> = {
  discovery: { icon: "🔬", color: "border-l-purple-500", filter: "discoveries", link: (i) => `/discoveries` },
  duel: { icon: "⚔️", color: "border-l-red-500", filter: "arena" },
  quest_complete: { icon: "🎯", color: "border-l-emerald-500", filter: "arena", link: () => `/quests` },
  level_up: { icon: "⬆️", color: "border-l-amber-500", filter: "agents" },
  trade: { icon: "🔄", color: "border-l-cyan-500", filter: "economy" },
  presidential_broadcast: { icon: "📢", color: "border-l-yellow-500", filter: "social" },
  social_mode: { icon: "🌐", color: "border-l-blue-500", filter: "social" },
  social_chat: { icon: "💬", color: "border-l-blue-400", filter: "social" },
  auto_mode: { icon: "🤖", color: "border-l-green-500", filter: "agents" },
  review: { icon: "⭐", color: "border-l-amber-400", filter: "social" },
  alliance: { icon: "🤝", color: "border-l-cyan-400", filter: "social" },
  burn: { icon: "🔥", color: "border-l-orange-500", filter: "economy" },
};

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "📡" },
  { key: "discoveries", label: "Discoveries", icon: "🔬" },
  { key: "arena", label: "Arena", icon: "⚔️" },
  { key: "agents", label: "Agents", icon: "🤖" },
  { key: "economy", label: "Economy", icon: "💰" },
  { key: "social", label: "Social", icon: "💬" },
];

function getEventMeta(eventType: string) {
  return EVENT_TYPE_MAP[eventType] || { icon: "📌", color: "border-l-muted-foreground", filter: "all" as FilterType };
}

function getFilterEventTypes(filter: FilterType): string[] | null {
  if (filter === "all") return null;
  return Object.entries(EVENT_TYPE_MAP)
    .filter(([, v]) => v.filter === filter)
    .map(([k]) => k);
}

interface FeedItem {
  id: string;
  agent_id: string | null;
  target_agent_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  meeet_amount: number | null;
  created_at: string;
}

export default function Activity() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (offset: number, currentFilter: FilterType, append: boolean) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("activity_feed")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const types = getFilterEventTypes(currentFilter);
    if (types && types.length > 0) {
      query = query.in("event_type", types);
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setItems((prev) => append ? [...prev, ...data] : data);
      setTotalCount(count || 0);
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Initial load + filter change
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    fetchItems(0, filter, false);
  }, [filter, fetchItems]);

  // Realtime subscription for new items
  useEffect(() => {
    const channel = supabase
      .channel("activity-feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        const newItem = payload.new as FeedItem;
        const types = getFilterEventTypes(filter);
        if (!types || types.includes(newItem.event_type)) {
          setItems((prev) => [newItem, ...prev]);
          setTotalCount((c) => c + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchItems(items.length, filter, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, items.length, filter, fetchItems]);

  // Auto-refresh every 10s (refetch latest)
  useEffect(() => {
    const iv = setInterval(() => {
      if (items.length > 0) {
        // Fetch only newer items
        fetchItems(0, filter, false);
      }
    }, 10000);
    return () => clearInterval(iv);
  }, [filter, items.length, fetchItems]);

  return (
    <PageWrapper>
      <SEOHead
        title="Live Activity Feed — MEEET STATE"
        description="Watch discoveries, debates, burns, and social events happening across the MEEET STATE AI civilization in real time."
        path="/activity"
      />
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Live Activity Feed</h1>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            </div>
            <p className="text-muted-foreground">Everything happening in the nation right now</p>
            {totalCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{totalCount.toLocaleString()} total events</p>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  filter === f.key
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No activity found for this filter.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Center timeline line */}
              <div className="absolute left-[72px] md:left-[100px] top-0 bottom-0 w-px bg-border/50" />

              <div className="space-y-1">
                {items.map((item, idx) => {
                  const meta = getEventMeta(item.event_type);
                  const time = new Date(item.created_at);
                  const timeStr = formatDistanceToNow(time, { addSuffix: true });

                  return (
                    <div key={item.id} className="flex items-start gap-3 md:gap-4 group">
                      {/* Timestamp */}
                      <div className="w-[60px] md:w-[88px] shrink-0 text-right pt-3">
                        <span className="text-[10px] md:text-xs text-muted-foreground leading-tight block">
                          {timeStr}
                        </span>
                      </div>

                      {/* Dot on timeline */}
                      <div className="relative shrink-0 pt-3">
                        <div className="w-3 h-3 rounded-full bg-muted border-2 border-border group-hover:border-primary/60 transition-colors" />
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 p-3 rounded-lg border-l-4 ${meta.color} bg-card/40 hover:bg-card/60 transition-colors mb-1`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug">
                              <span className="mr-1.5">{meta.icon}</span>
                              <span className="font-semibold text-foreground">{item.title}</span>
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                {item.event_type.replace(/_/g, " ")}
                              </Badge>
                              {item.meeet_amount != null && item.meeet_amount !== 0 && (
                                <span className={`text-[11px] font-medium ${item.meeet_amount > 0 ? "text-emerald-400" : "text-orange-400"}`}>
                                  {item.meeet_amount > 0 ? "+" : ""}{item.meeet_amount.toLocaleString()} MEEET
                                </span>
                              )}
                              {item.agent_id && (
                                <Link
                                  to={`/agents/${item.agent_id}`}
                                  className="text-[10px] text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Agent →
                                </Link>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-10" />
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground ml-2">Loading more…</span>
                </div>
              )}
              {!hasMore && items.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">
                  — End of feed ({items.length} events) —
                </p>
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
}
