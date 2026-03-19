import { useEffect, useRef, useState } from "react";

interface FeedEvent {
  id: string;
  text: string;
  icon: string;
  time: string;
}

interface Props {
  events: FeedEvent[];
}

const WorldMapEventFeed = ({ events }: Props) => {
  const [visible, setVisible] = useState(true);

  if (!visible || events.length === 0) return null;

  return (
    <div className="absolute right-4 top-28 bottom-20 w-52 z-20 pointer-events-auto">
      <div className="glass-card h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Live Feed</span>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ×
          </button>
        </div>

        {/* Events */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {events.slice(0, 8).map((event, i) => (
            <div
              key={event.id}
              className="px-3 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              style={{ opacity: 1 - i * 0.08 }}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0 mt-0.5">{event.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-foreground/90 leading-snug line-clamp-2">
                    {event.text}
                  </p>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block">{event.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorldMapEventFeed;
