interface Props {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  classColors: Record<string, string>;
}

// Synced with AGENT_CLASSES (src/data/agent-classes.ts)
const FILTERS = [
  { key: "all", label: "All", icon: "🌐" },
  { key: "diplomat", label: "Coordinators", icon: "🌐" },
  { key: "oracle", label: "Scientists", icon: "🔬" },
  { key: "trader", label: "Economists", icon: "📊" },
  { key: "warrior", label: "Security", icon: "🔒" },
  { key: "miner", label: "Earth Sci.", icon: "🌍" },
  { key: "banker", label: "Health Econ.", icon: "💊" },
  { key: "builder", label: "Architects", icon: "🏗️" },
  { key: "hacker", label: "Quants", icon: "💻" },
  { key: "scout", label: "Reporters", icon: "🛰️" },
  { key: "allies", label: "My Allies", icon: "💜" },
];

const WorldMapFilterBar = ({ activeFilter, onFilterChange, classColors }: Props) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="glass-card px-2 py-2 flex items-center gap-1.5">
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          const color = f.key !== "all" && f.key !== "allies" ? classColors[f.key] : undefined;

          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`
                px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                flex items-center gap-1.5
                ${isActive
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_rgba(153,69,255,0.2)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                }
              `}
              style={isActive && color ? {
                backgroundColor: color + "15",
                color: color,
                borderColor: color + "40",
                boxShadow: `0 0 12px ${color}20`,
              } : undefined}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WorldMapFilterBar;
