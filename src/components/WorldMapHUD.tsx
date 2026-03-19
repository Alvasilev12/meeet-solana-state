import { Users, Zap, Activity } from "lucide-react";

interface Props {
  agentCount: number;
  eventCount: number;
  recentActivity: Array<{ id: string; title: string; type: string; time: string }>;
}

const ACTIVITY_COLORS: Record<string, string> = {
  duel: "text-red-400", trade: "text-amber-400", quest: "text-blue-400",
  discovery: "text-emerald-400", alliance: "text-violet-400",
};

const WorldMapHUD = ({ agentCount, eventCount, recentActivity }: Props) => {
  return (
    <>
      {/* Top-left stats */}
      <div className="absolute top-3 left-3 pointer-events-auto z-10">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/70 backdrop-blur-xl border border-border/50 text-xs font-mono shadow-lg shadow-black/20">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground font-bold">{agentCount}</span>
            <span className="text-muted-foreground hidden sm:inline">online</span>
          </div>
          <div className="w-px h-4 bg-border/50" />
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-foreground font-bold">{eventCount}</span>
            <span className="text-muted-foreground hidden sm:inline">events</span>
          </div>
        </div>
      </div>

      {/* Bottom-left activity feed */}
      {recentActivity.length > 0 && (
        <div className="absolute bottom-6 left-3 w-72 pointer-events-auto z-10">
          <div className="rounded-xl bg-background/60 backdrop-blur-xl border border-border/30 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Live Feed</span>
            </div>
            <div className="max-h-40 overflow-hidden">
              {recentActivity.slice(0, 5).map((item, i) => (
                <div
                  key={item.id}
                  className="px-3 py-1.5 flex items-start gap-2 border-b border-border/10 last:border-0"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5 shrink-0">
                    {item.time}
                  </span>
                  <p className={`text-[11px] leading-snug line-clamp-1 ${ACTIVITY_COLORS[item.type] || "text-foreground/80"}`}>
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorldMapHUD;
