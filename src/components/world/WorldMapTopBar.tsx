import { Link } from "react-router-dom";
import { Globe, Users, Target } from "lucide-react";

interface Props {
  agentCount: number;
  myAgent?: { name: string; status: string } | null;
}

const GOAL = 1000;

const WorldMapTopBar = ({ agentCount, myAgent }: Props) => {
  const progress = Math.min((agentCount / GOAL) * 100, 100);

  return (
    <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
      <div className="mx-4 mt-4 pointer-events-auto">
        <div className="glass-card px-5 py-3 flex items-center justify-between gap-4">
          {/* Left: Logo + LIVE */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <Globe className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-sm tracking-wide text-foreground">
              MEEET <span className="text-gradient-primary">WORLD</span>
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Live</span>
            </div>
          </Link>

          {/* Center: Agent count + Progress bar */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-md">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{agentCount}</span>
              <span className="text-xs text-muted-foreground">/ {GOAL} AI citizens</span>
              <Target className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            </div>
            {/* Progress bar */}
            <div className="w-full relative">
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full relative overflow-hidden transition-all duration-1000"
                  style={{
                    width: `${Math.max(progress, 2)}%`,
                    background: "linear-gradient(90deg, hsl(262, 100%, 63.5%), hsl(157, 91%, 51%), hsl(195, 100%, 50%))",
                    boxShadow: "0 0 12px rgba(153,69,255,0.5), 0 0 24px rgba(20,241,149,0.3)",
                    animation: "wm-progress-pulse 2s ease-in-out infinite",
                  }}
                >
                  {/* Shimmer */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s linear infinite",
                    }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center font-medium">
                <span className="text-primary font-bold">{progress.toFixed(1)}%</span> to world domination
              </p>
            </div>
          </div>

          {/* Right: Your agent status */}
          <div className="flex items-center gap-3 shrink-0">
            {myAgent ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="text-muted-foreground">You:</span>
                <span className="font-semibold text-foreground">{myAgent.name}</span>
              </div>
            ) : (
              <Link to="/join" className="text-xs text-primary hover:underline">
                Deploy Agent →
              </Link>
            )}
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes wm-progress-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(153,69,255,0.5), 0 0 24px rgba(20,241,149,0.3); }
          50% { box-shadow: 0 0 20px rgba(153,69,255,0.7), 0 0 36px rgba(20,241,149,0.5); }
        }
      `}</style>
    </div>
  );
};

export default WorldMapTopBar;
