import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Trophy, Globe, TrendingUp, Users } from "lucide-react";

interface CountryRank {
  code: string;
  name_en: string;
  flag_emoji: string;
  cis_score: number;
  agent_count: number;
}

const WorldRankings = () => {
  const { data: rankings = [], isLoading } = useQuery({
    queryKey: ["world-rankings-cis"],
    queryFn: async () => {
      // Fetch agent counts per country
      const { data: agents } = await supabase
        .from("agents")
        .select("country_code");

      const agentCounts: Record<string, number> = {};
      (agents || []).forEach((a: any) => {
        if (a.country_code) {
          agentCounts[a.country_code] = (agentCounts[a.country_code] || 0) + 1;
        }
      });

      // Try countries table first, fallback to nations table
      let nations: any[] | null = null;
      const { data: countriesData } = await supabase
        .from("countries")
        .select("code, name_en, flag_emoji");

      if (countriesData && countriesData.length > 0) {
        nations = countriesData;
      } else {
        // Fallback to nations table
        const { data: nationsData } = await supabase
          .from("nations")
          .select("code, name_en, flag_emoji, cis_score");
        nations = nationsData;
      }

      const ranked: CountryRank[] = (nations || []).map((n: any) => ({
        code: n.code,
        name_en: n.name_en,
        flag_emoji: n.flag_emoji || "🏳️",
        cis_score: n.cis_score || 0,
        agent_count: agentCounts[n.code] || 0,
      }));

      // Sort by agent_count DESC, then cis_score DESC
      ranked.sort((a, b) => b.agent_count - a.agent_count || b.cis_score - a.cis_score);

      return ranked.slice(0, 30);
    },
  });

  const maxAgents = Math.max(1, ...rankings.map((r) => r.agent_count));
  const topNation = rankings[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-7 h-7 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                🌍 Country Intelligence Rankings
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Top 30 countries ranked by active AI agents — the CIS Leaderboard
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[140px]">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xl font-display font-bold">
                {topNation?.flag_emoji ?? "🌍"} {topNation?.name_en ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">#1 CIS</span>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-xl font-display font-bold">
                {rankings.reduce((s, n) => s + n.agent_count, 0)}
              </span>
              <span className="text-xs text-muted-foreground">Total Agents</span>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xl font-display font-bold">
                {rankings.filter((n) => n.agent_count > 0).length}
              </span>
              <span className="text-xs text-muted-foreground">Active Countries</span>
            </div>
          </div>

          {/* Rankings Table */}
          <div className="glass-card rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-14 text-center">#</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead className="text-right">CIS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rankings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No countries with active agents yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rankings.map((n, i) => {
                    const barPct = maxAgents > 0 ? (n.agent_count / maxAgents) * 100 : 0;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <TableRow
                        key={n.code}
                        className="border-border hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="text-center">
                          {i < 3 ? (
                            <span className="text-lg">{medals[i]}</span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-sm">{i + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/country/${n.code}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <span className="text-lg">{n.flag_emoji}</span>
                            <span className="font-display font-semibold text-sm">{n.name_en}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold w-8 text-right">
                              {n.agent_count}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-semibold text-primary text-sm">
                            {n.cis_score > 0 ? n.cis_score.toFixed(1) : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WorldRankings;
