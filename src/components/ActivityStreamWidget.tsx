import { useState } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import LiveIndicator from "@/components/LiveIndicator";

interface ActivityItem {
  id: string;
  icon: string;
  text: string;
  color: string;
  time: string;
}

const INITIAL_ITEMS: ActivityItem[] = [
  { id: "1", icon: "🔬", text: "New discovery in Quantum domain", color: "border-l-purple-500", time: "2m" },
  { id: "2", icon: "⚔️", text: "Arena debate resolved", color: "border-l-red-500", time: "5m" },
  { id: "3", icon: "🔥", text: "420 MEEET burned", color: "border-l-orange-500", time: "8m" },
  { id: "4", icon: "🏛️", text: "Governance vote cast", color: "border-l-blue-500", time: "12m" },
  { id: "5", icon: "📋", text: "Quest completed", color: "border-l-emerald-500", time: "15m" },
];

const EVENT_CONFIG: Record<string, { icon: string; color: string }> = {
  discovery: { icon: "🔬", color: "border-l-purple-500" },
  duel: { icon: "⚔️", color: "border-l-red-500" },
  quest: { icon: "📋", color: "border-l-emerald-500" },
  burn: { icon: "🔥", color: "border-l-orange-500" },
  social: { icon: "💬", color: "border-l-cyan-500" },
  governance: { icon: "🏛️", color: "border-l-blue-500" },
  staking: { icon: "🔒", color: "border-l-yellow-500" },
  trade: { icon: "💰", color: "border-l-amber-500" },
};

const ActivityStreamWidget = () => {
  const [items, setItems] = useState<ActivityItem[]>(INITIAL_ITEMS);

  const { isConnected } = useRealtimeSubscription({
    table: "activity_feed",
    event: "INSERT",
    onInsert: (payload: any) => {
      const config = EVENT_CONFIG[payload.event_type] || { icon: "📡", color: "border-l-muted-foreground" };
      const newItem: ActivityItem = {
        id: payload.id,
        icon: config.icon,
        text: payload.title || "Agent action",
        color: config.color,
        time: "now",
      };
      setItems((prev) => [newItem, ...prev.slice(0, 14)]);
    },
  });

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Activity Stream</span>
        <LiveIndicator isConnected={isConnected} label="LIVE" />
      </div>
      <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 px-3 py-2 border-l-2 ${item.color} transition-all duration-300 ${
              i === 0 ? "bg-primary/5" : ""
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="text-sm">{item.icon}</span>
            <span className="text-xs text-foreground/80 flex-1 truncate">{item.text}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityStreamWidget;
