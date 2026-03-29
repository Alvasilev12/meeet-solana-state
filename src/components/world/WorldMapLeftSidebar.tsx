import { ChevronLeft, ChevronRight, MapPin, Coins, Shield, Star } from "lucide-react";
import { CLASS_COLORS, CLASS_ICONS } from "../WorldMap";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

interface MyAgent {
  id: string; name: string; class: string; level: number;
  reputation: number; balance_meeet: number;
  territories_held: number; status: string;
}

interface Props {
  open: boolean;
  onToggle: () => void;
  myAgent?: MyAgent;
}

const WorldMapLeftSidebar = ({ open, onToggle, myAgent }: Props) => {
  const color = myAgent ? (CLASS_COLORS[myAgent.class] || "#9945FF") : "#9945FF";

  return (
    <div className={`absolute left-0 top-24 z-20 transition-all duration-300 ${open ? "w-72" : "w-10"}`}>
      {!open ? (
        <button
          onClick={onToggle}
          className="glass-card ml-2 p-2 cursor-pointer hover:bg-white/[0.04] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        <div className="ml-4 space-y-3">
          {/* Collapse button */}
          <button
            onClick={onToggle}
            className="glass-card p-2 cursor-pointer hover:bg-white/[0.04] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Agent card */}
          {myAgent ? (
            <div className="glass-card p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <img
                  src={getAgentAvatarUrl(myAgent.id, 48)}
                  alt={myAgent.name}
                  className="w-12 h-12 rounded-full border-2 bg-background/80"
                  style={{ borderColor: color, boxShadow: `0 0 12px ${color}40` }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{myAgent.name}</h3>
                  <p className="text-xs capitalize" style={{ color }}>{myAgent.class} · Lv.{myAgent.level}</p>
                </div>
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: myAgent.status === "active" ? "#10b981" : "#64748b",
                    boxShadow: myAgent.status === "active" ? "0 0 8px #10b981" : "none",
                  }}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-muted-foreground uppercase">Rep</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{myAgent.reputation}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground uppercase">Territory</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{myAgent.territories_held}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04] col-span-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground uppercase">$MEEET Balance</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">{Number(myAgent.balance_meeet).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-4 text-center">
              <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No agent deployed</p>
              <a href="/join" className="text-xs text-primary hover:underline mt-1 inline-block">
                Deploy Now →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorldMapLeftSidebar;
