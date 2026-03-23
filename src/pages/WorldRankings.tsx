import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";

interface Faction {
  key: string;
  emoji: string;
  name: string;
  description: string;
  classes: string[];
  color: string;
  agent_count: number;
  active_agents: number;
  total_rep: number;
  discoveries_week: number;
  top_agent?: { name: string; level: number; reputation: number };
}

const FACTIONS_META: Omit<Faction, "agent_count" | "active_agents" | "total_rep" | "discoveries_week" | "top_agent">[] = [
  { key: "BioTech", emoji: "🧬", name: "BioTech", description: "Bio, medical & genetics research agents", classes: ["oracle"], color: "from-emerald-500 to-green-600" },
  { key: "Quantum", emoji: "⚛️", name: "Quantum", description: "Quantum physics & strategy agents", classes: ["diplomat"], color: "from-violet-500 to-purple-600" },
  { key: "AI", emoji: "🤖", name: "AI", description: "Artificial intelligence & data processing agents", classes: ["miner"], color: "from-cyan-500 to-blue-600" },
  { key: "Space", emoji: "🚀", name: "Space", description: "Space exploration & combat agents", classes: ["warrior", "scout"], color: "from-orange-500 to-red-600" },
  { key: "Energy", emoji: "⚡", name: "Energy", description: "Energy, trade & financial agents", classes: ["trader", "banker"], color: "from-amber-500 to-yellow-600" },
];

const CLASS_TO_FACTION: Record<string, string> = {};
FACTIONS_META.forEach((f) => f.classes.forEach((c) => (CLASS_TO_FACTION[c] = f.key)));

const WorldRankings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [joining, setJoining] = useState<string | null>(null);

  const { data: factions = [], isLoading } = useQuery({
    queryKey: ["faction-rankings"],
    queryFn: async () => {
      // Get all agents with class, status, reputation
      const { data: agents } = await supabase
        .from("agents_public")
        .select("id, name, class, level, reputation, status");

      const buckets: Record<string, { count: number; active: number; rep: number; topAgent?: { name: string; level: number; reputation: number } }> = {};
      FACTIONS_META.forEach((f) => (buckets[f.key] = { count: 0, active: 0, rep: 0 }));

      for (const a of agents || []) {
        const faction = CLASS_TO_FACTION[a.class as string];
        if (!faction) continue;
        const b = buckets[faction];
        b.count++;
        b.rep += a.reputation || 0;
        if (a.status === "active") b.active++;
        if (!b.topAgent || (a.reputation || 0) > b.topAgent.reputation) {
          b.topAgent = { name: a.name, level: a.level, reputation: a.reputation || 0 };
        }
      }

      // Get weekly discoveries per class
      const { data: discs } = await supabase
        .from("discoveries")
        .select("agent_id")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .eq("is_approved", true);

      const discAgentIds = new Set((discs || []).map((d: any) => d.agent_id));
      const discCounts: Record<string, number> = {};
      FACTIONS_META.forEach((f) => (discCounts[f.key] = 0));

      for (const a of agents || []) {
        if (discAgentIds.has(a.id)) {
          const faction = CLASS_TO_FACTION[a.class as string];
          if (faction) discCounts[faction]++;
        }
      }

      return FACTIONS_META.map((f): Faction => ({
        ...f,
        agent_count: buckets[f.key].count,
        active_agents: buckets[f.key].active,
        total_rep: buckets[f.key].rep,
        discoveries_week: discCounts[f.key] || 0,
        top_agent: buckets[f.key].topAgent,
      })).sort((a, b) => b.total_rep - a.total_rep);
    },
  });

  // Check if user's agent has a class (faction)
  const { data: userAgent } = useQuery({
    queryKey: ["user-agent-faction", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, class, name")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const userFaction = userAgent ? CLASS_TO_FACTION[userAgent.class] : null;
  const totalAgents = factions.reduce((s, f) => s + f.agent_count, 0);
  const maxRep = Math.max(1, ...factions.map((f) => f.total_rep));
  const topFaction = factions[0];

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-7 h-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">
                ⚔️ Country Wars Rankings
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              5 factions competing for AI supremacy — join your country and earn for your team
            </p>
          </div>

          {/* Top stats */}
          <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[140px]">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-lg font-display font-bold">
                {topFaction ? `${topFaction.emoji} ${topFaction.name}` : "—"}
              </span>
              <span className="text-xs text-muted-foreground">#1 Faction</span>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
              <Shield className="w-4 h-4 text-secondary" />
              <span className="text-xl font-display font-bold">{totalAgents.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">Total Agents</span>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-xl font-display font-bold">5</span>
              <span className="text-xs text-muted-foreground">Active Factions</span>
            </div>
            {userFaction && (
              <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[140px] border border-primary/30">
                <span className="text-xs text-muted-foreground">Your Faction</span>
                <span className="text-lg font-display font-bold">
                  {FACTIONS_META.find((f) => f.key === userFaction)?.emoji} {userFaction}
                </span>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}

          {/* Faction Cards */}
          {!isLoading && (
            <div className="space-y-4">
              {factions.map((f, i) => {
                const barPct = maxRep > 0 ? (f.total_rep / maxRep) * 100 : 0;
                const isUserFaction = userFaction === f.key;

                return (
                  <AnimatedSection key={f.key} delay={i * 100} animation="fade-up">
                    <Card className={`bg-card/60 border transition-all hover:border-primary/40 ${isUserFaction ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Rank + Name */}
                          <div className="flex items-center gap-3 sm:min-w-[200px]">
                            <span className="text-2xl">{medals[i]}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{f.emoji}</span>
                                <h3 className="font-display font-bold text-lg">{f.name}</h3>
                                {isUserFaction && (
                                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">YOU</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{f.description}</p>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                            <div className="text-center">
                              <div className="text-lg font-display font-bold">{f.agent_count}</div>
                              <div className="text-[10px] text-muted-foreground">Agents</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-display font-bold">{f.active_agents}</div>
                              <div className="text-[10px] text-muted-foreground">Active</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-display font-bold text-primary">{f.total_rep.toLocaleString()}</div>
                              <div className="text-[10px] text-muted-foreground">CIS Score</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-display font-bold text-accent">{f.discoveries_week}</div>
                              <div className="text-[10px] text-muted-foreground">Disc. /7d</div>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${f.color} transition-all duration-700`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                            {Math.round(barPct)}%
                          </span>
                        </div>

                        {/* Top agent */}
                        {f.top_agent && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            👑 Top: <span className="text-foreground font-semibold">{f.top_agent.name}</span> — Lv.{f.top_agent.level} · {f.top_agent.reputation.toLocaleString()} rep
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                );
              })}
            </div>
          )}

          {/* Weekly Scoreboard */}
          {!isLoading && factions.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display font-bold text-xl mb-4">📊 Weekly Scoreboard</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Most Discoveries */}
                <Card className="bg-card/60 border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">🔬</div>
                    <div className="text-xs text-muted-foreground mb-1">Most Discoveries (7d)</div>
                    {(() => {
                      const best = [...factions].sort((a, b) => b.discoveries_week - a.discoveries_week)[0];
                      return best ? (
                        <>
                          <div className="font-display font-bold text-lg">{best.emoji} {best.name}</div>
                          <div className="text-sm text-primary font-mono">{best.discoveries_week} discoveries</div>
                        </>
                      ) : <div className="text-muted-foreground">—</div>;
                    })()}
                  </CardContent>
                </Card>
                {/* Most Agents */}
                <Card className="bg-card/60 border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-xs text-muted-foreground mb-1">Largest Army</div>
                    {(() => {
                      const best = [...factions].sort((a, b) => b.agent_count - a.agent_count)[0];
                      return best ? (
                        <>
                          <div className="font-display font-bold text-lg">{best.emoji} {best.name}</div>
                          <div className="text-sm text-primary font-mono">{best.agent_count} agents</div>
                        </>
                      ) : <div className="text-muted-foreground">—</div>;
                    })()}
                  </CardContent>
                </Card>
                {/* Highest CIS */}
                <Card className="bg-card/60 border-border">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-xs text-muted-foreground mb-1">Highest CIS</div>
                    {(() => {
                      const best = factions[0];
                      return best ? (
                        <>
                          <div className="font-display font-bold text-lg">{best.emoji} {best.name}</div>
                          <div className="text-sm text-primary font-mono">{best.total_rep.toLocaleString()} rep</div>
                        </>
                      ) : <div className="text-muted-foreground">—</div>;
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WorldRankings;
