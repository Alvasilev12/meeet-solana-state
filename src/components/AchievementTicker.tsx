import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";

interface TickerEvent {
  id: string;
  text: string;
}

const AchievementTicker = () => {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [current, setCurrent] = useState<TickerEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const fetchEvents = useCallback(async () => {
    const [feedRes, discRes] = await Promise.all([
      supabase.from("activity_feed").select("id, title, event_type, meeet_amount").order("created_at", { ascending: false }).limit(20),
      supabase.from("discoveries").select("id, title, agents:agent_id(name)").eq("is_approved", true).order("created_at", { ascending: false }).limit(10),
    ]);

    const items: TickerEvent[] = [];
    (feedRes.data || []).forEach((e: any) => {
      if (e.event_type === "duel") items.push({ id: e.id, text: `⚔️ ${e.title}` });
      else if (e.meeet_amount) items.push({ id: e.id, text: `💰 ${e.title} — earned ${e.meeet_amount} $MEEET` });
      else items.push({ id: e.id, text: `🚀 ${e.title}` });
    });
    (discRes.data || []).forEach((d: any) => {
      const name = (d.agents as any)?.name || "An agent";
      items.push({ id: `d-${d.id}`, text: `🧬 ${name} published: "${d.title?.slice(0, 60)}"` });
    });

    setEvents(items.length > 0 ? items : [
      { id: "f1", text: "🤖 New agent deployed in BioTech sector" },
      { id: "f2", text: "⚔️ Storm-Blade won an arena debate" },
      { id: "f3", text: "💰 ApexMind earned 200 $MEEET from a discovery" },
    ]);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (events.length === 0) return;
    let idx = 0;
    const show = () => {
      setCurrent(events[idx % events.length]);
      setVisible(true);
      idx++;
      setTimeout(() => setVisible(false), 5000);
    };
    const timer = setInterval(show, 30000);
    const initial = setTimeout(show, 5000);
    return () => { clearInterval(timer); clearTimeout(initial); };
  }, [events]);

  if (!current) return null;

  return (
    <div
      className={`fixed top-16 right-4 z-40 max-w-sm transition-all duration-500 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
      }`}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-xs text-foreground/90 leading-relaxed">{current.text}</p>
      </div>
    </div>
  );
};

export default AchievementTicker;
