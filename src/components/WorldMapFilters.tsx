import { Filter, X, Users, MapPin, Layers } from "lucide-react";
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

// Synced with AGENT_CLASSES (src/data/agent-classes.ts) — canonical scientific roles
const CLASS_LABELS: Record<string, string> = {
  warrior: "🔒 Security Analyst",
  trader: "📊 Data Economist",
  oracle: "🔬 Research Scientist",
  diplomat: "🌐 Global Coordinator",
  miner: "🌍 Earth Scientist",
  banker: "💊 Health Economist",
  builder: "🏗️ Systems Architect",
  hacker: "💻 Quant Engineer",
  scout: "🛰️ Field Reporter",
  president: "👑 President",
};

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
      {/* Filter toggle */}
      <div className="absolute top-3 right-14 pointer-events-auto z-10">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`rpg-box-btn ${filtersOpen ? "rpg-box-btn-active" : ""}`}
        >
          {filtersOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="absolute top-14 right-14 w-56 pointer-events-auto z-10 animate-fade-in">
          <div className="rpg-box p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="rpg-stat-label text-amber-400">LAYERS</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAgents(!showAgents)}
                className={`flex-1 rpg-toggle ${showAgents ? "rpg-toggle-on" : "rpg-toggle-off"}`}
              >
                <Users className="w-3 h-3 inline mr-1" />Agents
              </button>
              <button
                onClick={() => setShowEvents(!showEvents)}
                className={`flex-1 rpg-toggle ${showEvents ? "rpg-toggle-on-alt" : "rpg-toggle-off"}`}
              >
                <MapPin className="w-3 h-3 inline mr-1" />Events
              </button>
            </div>

            {showAgents && (
              <div className="space-y-1">
                <div className="rpg-section-label">CLASSES</div>
                <div className="grid grid-cols-2 gap-0.5">
                  {Object.entries(classColors).map(([cls, color]) => (
                    <button
                      key={cls}
                      onClick={() => toggleClass(cls)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono transition-all ${
                        classFilters.has(cls)
                          ? "text-amber-100/90"
                          : "text-amber-100/25 line-through"
                      }`}
                    >
                      <span
                        className="w-2 h-2 shrink-0"
                        style={{ backgroundColor: classFilters.has(cls) ? color : "#333", imageRendering: "pixelated" }}
                      />
                      <span>{CLASS_LABELS[cls]?.split(" ")[0] || ""} {cls}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showEvents && (
              <div className="space-y-1">
                <div className="rpg-section-label">EVENTS</div>
                <div className="space-y-0.5">
                  {EVENT_TYPES.map(({ key, label, color, icon }) => (
                    <button
                      key={key}
                      onClick={() => toggleEventType(key)}
                      className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 text-[9px] font-mono transition-all ${
                        eventFilters.has(key)
                          ? "text-amber-100/90"
                          : "text-amber-100/25 line-through"
                      }`}
                    >
                      <span
                        className="w-2 h-2 shrink-0"
                        style={{ backgroundColor: eventFilters.has(key) ? color : "#333" }}
                      />
                      <span>{icon} {label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default WorldMapFilters;
