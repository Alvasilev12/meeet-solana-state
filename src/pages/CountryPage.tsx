import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WorldMap from "@/components/WorldMap";
import { Globe, Users, TrendingUp, Zap } from "lucide-react";

const CountryPage = () => {
  const { code } = useParams<{ code: string }>();

  const { data: nation } = useQuery({
    queryKey: ["country", code],
    queryFn: async () => {
      const { data } = await supabase
        .from("nations")
        .select("*")
        .eq("code", code!.toUpperCase())
        .single();
      return data;
    },
    enabled: !!code,
  });

  const { data: topAgents = [] } = useQuery({
    queryKey: ["country-agents", code],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, class, level, reputation, balance_meeet, status")
        .eq("nation_code", code!.toUpperCase())
        .order("reputation", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!code,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ["country-events", code],
    queryFn: async () => {
      const { data } = await supabase
        .from("world_events")
        .select("*")
        .contains("nation_codes", [code!.toUpperCase()])
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!code,
  });

  if (!nation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container max-w-4xl mx-auto px-4">
          <div className="text-center text-muted-foreground py-20">Loading country data...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-5xl">{nation.flag_emoji}</span>
            <div>
              <h1 className="text-3xl font-display font-bold">{nation.name_en}</h1>
              <p className="text-muted-foreground text-sm">{nation.continent} · {nation.code}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="glass-card rounded-xl p-4 text-center">
              <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="text-2xl font-display font-bold">{nation.cis_score.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">CIS Score</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <Users className="w-4 h-4 text-secondary mx-auto mb-1" />
              <div className="text-2xl font-display font-bold">{nation.citizen_count}</div>
              <div className="text-xs text-muted-foreground">Citizens</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <Globe className="w-4 h-4 text-accent mx-auto mb-1" />
              <div className="text-2xl font-display font-bold">{Number(nation.treasury_meeet).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Treasury $MEEET</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-display font-bold">{recentEvents.length}</div>
              <div className="text-xs text-muted-foreground">Recent Events</div>
            </div>
          </div>

          {/* Map zoomed to country */}
          <div className="glass-card rounded-xl overflow-hidden mb-8 border border-border">
            <WorldMap height="360px" interactive={false} />
          </div>

          {/* Top Agents */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display font-bold text-lg mb-4">Top Agents</h2>
              {topAgents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No agents in this country yet</p>
              ) : (
                <div className="space-y-2">
                  {topAgents.map((a: any, i: number) => (
                    <div key={a.id} className="glass-card rounded-lg p-3 flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-sm truncate">{a.name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{a.class} · Lv.{a.level}</div>
                      </div>
                      <span className="text-xs font-mono text-primary">{Number(a.balance_meeet ?? 0).toLocaleString()} $M</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg mb-4">Recent Events</h2>
              {recentEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events for this country</p>
              ) : (
                <div className="space-y-2">
                  {recentEvents.map((ev: any) => (
                    <div key={ev.id} className="glass-card rounded-lg p-3">
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">{ev.event_type}</div>
                      <div className="text-sm font-medium text-foreground line-clamp-2">{ev.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CountryPage;
