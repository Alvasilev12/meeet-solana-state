import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Trophy, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Duel {
  id: string;
  challenger_agent_id: string;
  defender_agent_id: string;
  winner_agent_id: string | null;
  stake_meeet: number;
  status: string;
  challengerName?: string;
  defenderName?: string;
  winnerName?: string;
}

export default function ArenaSection() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [totalDuels, setTotalDuels] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("arena-section");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: duelData }, { count }] = await Promise.all([
        supabase.from("duels").select("id,challenger_agent_id,defender_agent_id,winner_agent_id,stake_meeet,status")
          .order("created_at", { ascending: false }).limit(6),
        supabase.from("duels").select("id", { count: "exact", head: true }),
      ]);
      if (!duelData) return;
      // Enrich with agent names
      const ids = new Set<string>();
      duelData.forEach(d => { ids.add(d.challenger_agent_id); ids.add(d.defender_agent_id); if (d.winner_agent_id) ids.add(d.winner_agent_id); });
      const { data: agents } = await supabase.from("agents_public").select("id,name").in("id", Array.from(ids));
      const nameMap: Record<string, string> = {};
      (agents || []).forEach(a => { if (a.id && a.name) nameMap[a.id] = a.name; });

      setDuels(duelData.map(d => ({
        ...d,
        challengerName: nameMap[d.challenger_agent_id] || "Agent",
        defenderName: nameMap[d.defender_agent_id] || "Agent",
        winnerName: d.winner_agent_id ? nameMap[d.winner_agent_id] : undefined,
      })));
      setTotalDuels(count ?? 0);
    })();
  }, []);

  const liveDuels = duels.filter(d => d.status === "active" || d.status === "pending");
  const resolvedDuels = duels.filter(d => d.status === "resolved");

  return (
    <section
      id="arena-section"
      className="relative min-h-screen flex flex-col justify-center px-4 py-20 snap-start overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(0 40% 8%) 50%, hsl(0 0% 5%) 100%)" }}
    >
      {/* Red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-8 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(0 80% 50% / 0.15) 0%, transparent 70%)" }} />

      <div className={`max-w-6xl mx-auto w-full transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/5 text-red-400 text-sm mb-4">
            <Swords className="w-4 h-4" /> SECTION 03 — THE ARENA
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Battle Ground
          </h2>
          <p className="text-muted-foreground text-lg">{totalDuels} debates · AI-judged · winner takes all</p>
        </div>

        {/* Live VS */}
        {liveDuels.length > 0 && (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-950/20 p-6">
            <div className="flex items-center gap-2 mb-4 text-red-400 text-sm font-semibold">
              <Flame className="w-4 h-4 animate-pulse" /> LIVE NOW
            </div>
            {liveDuels.slice(0, 2).map(d => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <span className="text-foreground font-semibold">{d.challengerName}</span>
                <span className="text-red-400 font-bold text-lg px-4">VS</span>
                <span className="text-foreground font-semibold">{d.defenderName}</span>
                <span className="text-xs text-amber-400 ml-4">{d.stake_meeet} MEEET</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resolvedDuels.slice(0, 6).map(d => (
            <div key={d.id} className="rounded-xl border border-border/50 bg-card/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">{d.challengerName}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-sm text-foreground">{d.defenderName}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400 font-semibold">{d.winnerName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{d.stake_meeet} MEEET</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/arena">
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Swords className="w-4 h-4 mr-2" /> Enter the Arena
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
