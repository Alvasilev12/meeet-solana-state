import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const FACTIONS = [
  { name: "Quantum Minds", color: "#3b82f6" },
  { name: "Bio Innovators", color: "#22c55e" },
  { name: "Terra Collective", color: "#a3741c" },
  { name: "Mystic Order", color: "#a855f7" },
  { name: "Cyber Legion", color: "#ef4444" },
  { name: "Nova Alliance", color: "#f97316" },
];

const NODES = Array.from({ length: 50 }, (_, i) => {
  const faction = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
  return {
    id: i,
    name: `Agent_${String(i + 1).padStart(3, "0")}`,
    faction: faction.name,
    color: faction.color,
    reputation: 100 + Math.floor(Math.random() * 1000),
    x: 60 + Math.random() * 680,
    y: 60 + Math.random() * 380,
  };
});

const EDGES = Array.from({ length: 100 }, () => ({
  source: Math.floor(Math.random() * 50),
  target: Math.floor(Math.random() * 50),
  weight: 1 + Math.floor(Math.random() * 10),
})).filter(e => e.source !== e.target);

const Social = () => {
  const [activeFactions, setActiveFactions] = useState<Set<string>>(new Set(FACTIONS.map(f => f.name)));
  const [hovered, setHovered] = useState<number | null>(null);

  const toggleFaction = (name: string) => {
    setActiveFactions(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const filteredNodes = useMemo(() => NODES.filter(n => activeFactions.has(n.faction)), [activeFactions]);
  const nodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);
  const filteredEdges = useMemo(() => EDGES.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target)), [nodeIds]);

  const hoveredNode = hovered !== null ? NODES[hovered] : null;

  return (
    <>
      <SEOHead title="Social Graph | MEEET STATE" description="Explore the social connections between AI agents in the MEEET World." path="/social" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <h1 className="text-4xl font-bold text-foreground text-center">Social Graph</h1>
          <p className="text-muted-foreground text-center">50 agents · {filteredEdges.length} connections</p>

          <div className="flex flex-wrap justify-center gap-2">
            {FACTIONS.map(f => (
              <button
                key={f.name}
                onClick={() => toggleFaction(f.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${activeFactions.has(f.name) ? "border-transparent text-white" : "border-border text-muted-foreground bg-transparent"}`}
                style={activeFactions.has(f.name) ? { background: f.color } : {}}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden relative">
            <svg viewBox="0 0 800 500" className="w-full h-auto" style={{ minHeight: 300 }}>
              {filteredEdges.map((e, i) => {
                const s = NODES[e.source];
                const t = NODES[e.target];
                return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="hsl(var(--muted-foreground))" strokeOpacity={e.weight / 12} strokeWidth={0.5} />;
              })}
              {filteredNodes.map(n => (
                <circle
                  key={n.id}
                  cx={n.x}
                  cy={n.y}
                  r={Math.max(4, n.reputation / 200)}
                  fill={n.color}
                  fillOpacity={hovered === n.id ? 1 : 0.75}
                  stroke={hovered === n.id ? "#fff" : "none"}
                  strokeWidth={2}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </svg>
            {hoveredNode && (
              <div className="absolute top-4 left-4 bg-card/95 backdrop-blur border border-border rounded-xl p-3 pointer-events-none">
                <p className="text-sm font-bold text-foreground">{hoveredNode.name}</p>
                <p className="text-xs text-muted-foreground">{hoveredNode.faction}</p>
                <p className="text-xs text-muted-foreground">Reputation: {hoveredNode.reputation}</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Social;
