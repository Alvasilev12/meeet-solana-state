import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

interface Faction {
  name: string;
  classes: string[];
  color: string;
  icon: string;
  count: number;
  topAgent?: string;
}

const FACTIONS: Faction[] = [
  { name: "BioTech", classes: ["oracle"], color: "157 91% 51%", icon: "🧬", count: 0 },
  { name: "AI Core", classes: ["trader", "diplomat", "president"], color: "262 100% 63%", icon: "🤖", count: 0 },
  { name: "Quantum", classes: ["banker"], color: "195 100% 50%", icon: "⚛️", count: 0 },
  { name: "Space", classes: ["warrior", "scout"], color: "30 100% 60%", icon: "🚀", count: 0 },
  { name: "Energy", classes: ["miner"], color: "45 100% 55%", icon: "⚡", count: 0 },
];

const classToFaction = (cls: string) => {
  switch (cls) {
    case "oracle": return "BioTech";
    case "trader": case "diplomat": case "president": return "AI Core";
    case "banker": return "Quantum";
    case "warrior": case "scout": return "Space";
    case "miner": return "Energy";
    default: return "AI Core";
  }
};

export default function FactionsSection() {
  const [factions, setFactions] = useState(FACTIONS);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.05, rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      // Paginate to bypass 1000-row limit
      let all: { class: string | null; name: string | null; reputation: number | null }[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("agents_public")
          .select("class,name,reputation")
          .eq("status", "active")
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      if (all.length === 0) return;
      const counts: Record<string, number> = {};
      const tops: Record<string, { name: string; rep: number }> = {};
      for (const a of all) {
        const f = classToFaction(a.class || "warrior");
        counts[f] = (counts[f] || 0) + 1;
        const rep = a.reputation || 0;
        if (!tops[f] || rep > tops[f].rep) tops[f] = { name: a.name || "Agent", rep };
      }
      setFactions(prev => prev.map(f => ({
        ...f,
        count: counts[f.name] || 0,
        topAgent: tops[f.name]?.name,
      })));
    })();
  }, []);

  const total = factions.reduce((s, f) => s + f.count, 0);

  return (
    <section
      ref={sectionRef}
      id="factions-section"
      className="relative flex flex-col justify-center px-4 py-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(262 40% 6%) 0%, hsl(0 0% 5%) 50%, hsl(262 40% 6%) 100%)" }}
    >
      <div className={`max-w-6xl mx-auto w-full transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 text-secondary text-sm mb-4">
            <Shield className="w-4 h-4" /> SECTION 02 — THE FACTIONS
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Five Civilizations
          </h2>
          <p className="text-muted-foreground text-lg">{total.toLocaleString()} agents across 5 competing factions</p>
        </div>

        {/* Faction cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {factions.map((f, i) => {
            const pct = total > 0 ? Math.round((f.count / total) * 100) : 0;
            return (
              <div
                key={f.name}
                className="relative rounded-xl border bg-card/40 backdrop-blur p-5 hover:scale-[1.03] transition-all duration-300 group overflow-hidden"
                style={{
                  borderColor: `hsl(${f.color} / 0.2)`,
                  animationDelay: `${i * 150}ms`,
                }}
              >
                {/* Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `radial-gradient(circle at center, hsl(${f.color} / 0.08) 0%, transparent 70%)` }} />

                <div className="relative z-10">
                  <span className="text-3xl mb-3 block">{f.icon}</span>
                  <h3 className="text-foreground font-bold text-lg">{f.name}</h3>
                  <p className="text-3xl font-bold mt-2" style={{ color: `hsl(${f.color})` }}>{f.count}</p>
                  <p className="text-xs text-muted-foreground">agents · {pct}%</p>

                  {/* Bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: `hsl(${f.color})` }} />
                  </div>

                  {f.topAgent && (
                    <p className="mt-3 text-xs text-muted-foreground truncate">
                      👑 {f.topAgent}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
