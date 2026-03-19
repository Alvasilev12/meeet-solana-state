import { Filter, Layers, X, Users, MapPin } from "lucide-react";
import { EVENT_TYPES } from "./WorldMap";

interface Props {
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  showAgents: boolean;
  setShowAgents: (v: boolean) => void;
  showEvents: boolean;
  setShowEvents: (v: boolean) => void;
  classFilters: Set<string>;
  toggleClass: (cls: string) => void;
  eventFilters: Set<string>;
  toggleEventType: (t: string) => void;
  classColors: Record<string, string>;
}

const WorldMapFilters = ({
  filtersOpen, setFiltersOpen,
  showAgents, setShowAgents,
  showEvents, setShowEvents,
  classFilters, toggleClass,
  eventFilters, toggleEventType,
  classColors,
}: Props) => {
  return (
    <>
      {/* Filter toggle - top right area */}
      <div className="absolute top-3 right-14 pointer-events-auto z-10">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all shadow-lg shadow-black/20 ${
            filtersOpen
              ? "bg-primary/15 border-primary/30 text-primary"
              : "bg-background/70 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {filtersOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="absolute top-14 right-14 w-60 rounded-xl bg-background/80 backdrop-blur-xl border border-border/40 p-3 pointer-events-auto animate-fade-in space-y-3 z-10 shadow-xl shadow-black/30">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[10px]">Layers</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAgents(!showAgents)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                showAgents ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/20 text-muted-foreground border-border/30"
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />Agents
            </button>
            <button
              onClick={() => setShowEvents(!showEvents)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                showEvents ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-muted/20 text-muted-foreground border-border/30"
              }`}
            >
              <MapPin className="w-3 h-3 inline mr-1" />Events
            </button>
          </div>

          {showAgents && (
            <div className="space-y-1.5">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Agent Classes</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(classColors).map(([cls, color]) => (
                  <button
                    key={cls}
                    onClick={() => toggleClass(cls)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-all border ${
                      classFilters.has(cls)
                        ? "border-white/10 bg-white/5 text-foreground"
                        : "border-transparent text-muted-foreground/40 line-through"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: classFilters.has(cls) ? color : "#333" }} />
                    <span className="capitalize">{cls}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showEvents && (
            <div className="space-y-1.5">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Event Types</div>
              <div className="space-y-0.5">
                {EVENT_TYPES.map(({ key, label, color, icon }) => (
                  <button
                    key={key}
                    onClick={() => toggleEventType(key)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-mono transition-all border ${
                      eventFilters.has(key)
                        ? "border-white/10 bg-white/5 text-foreground"
                        : "border-transparent text-muted-foreground/40 line-through"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: eventFilters.has(key) ? color : "#333" }} />
                    <span>{icon} {label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default WorldMapFilters;
