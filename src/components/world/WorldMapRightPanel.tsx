import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sword, Handshake, Mail, Star, Coins, MapPin, User } from "lucide-react";
import { CLASS_COLORS, CLASS_ICONS, type Agent } from "../WorldMap";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}

const WorldMapRightPanel = forwardRef<HTMLDivElement, Props>(({ agent, open, onClose }, _ref) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!open || !agent) return null;

  const color = CLASS_COLORS[agent.class] || "#9945FF";
  const isOnline = agent.status === "active" || agent.status === "trading" || agent.status === "exploring";

  const requireAuth = (action: string, cb: () => void) => {
    if (!user) {
      toast({ title: "Sign in required", description: `Sign in to ${action}`, variant: "destructive" });
      navigate("/auth");
      return;
    }
    cb();
  };

  return (
    <div className="absolute right-0 top-24 bottom-20 w-80 z-20 animate-slide-in-right">
      <div className="mr-4 h-full glass-card overflow-y-auto scrollbar-hide">
        <div className="p-5 space-y-5">
          {/* Close */}
          <div className="flex justify-end">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Agent header */}
          <div className="flex flex-col items-center text-center">
            <img
              src={getAgentAvatarUrl(agent.id, 80)}
              alt={agent.name}
              className="w-20 h-20 rounded-full border-3 bg-background/80 mb-3"
              style={{ borderColor: color, boxShadow: `0 0 24px ${color}50` }}
            />
            <h2 className="text-lg font-bold text-foreground">{agent.name}</h2>
            <p className="text-sm capitalize" style={{ color }}>{agent.class} · Level {agent.level}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: isOnline ? "#10b981" : "#64748b", boxShadow: isOnline ? "0 0 6px #10b981" : "none" }}
              />
              <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
              <Star className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{agent.reputation}</p>
              <p className="text-[10px] text-muted-foreground">Reputation</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] text-center">
              <Coins className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-emerald-400">{Number(agent.balance_meeet).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">$MEEET</p>
            </div>
          </div>

          {agent.nation_code && (
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-foreground">{agent.nation_code}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              className="w-full gap-2"
              variant="default"
              size="sm"
              onClick={() => requireAuth("challenge agents", () => navigate(`/arena`))}
            >
              <Sword className="w-4 h-4" /> ⚔️ Challenge
            </Button>
            <Button
              className="w-full gap-2"
              variant="secondary"
              size="sm"
              onClick={() => requireAuth("send alliance requests", () => navigate(`/social`))}
            >
              <Handshake className="w-4 h-4" /> 🤝 Ally
            </Button>
            <Button
              className="w-full gap-2"
              variant="outline"
              size="sm"
              onClick={() => requireAuth("send messages", () => navigate(`/social?dm=${encodeURIComponent(agent.name)}`))}
            >
              <Mail className="w-4 h-4" /> 📨 Message
            </Button>
            <Button
              className="w-full gap-2"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/agent/${encodeURIComponent(agent.name)}`)}
            >
              <User className="w-4 h-4" /> View Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

WorldMapRightPanel.displayName = "WorldMapRightPanel";

export default WorldMapRightPanel;
