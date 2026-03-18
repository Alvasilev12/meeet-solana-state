import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Trophy, Globe, TrendingUp, Users } from "lucide-react";

interface NationRank {
  code: string;
  name_en: string;
  flag_emoji: string;
  citizen_count: number;
  cis_score: number;
  continent: string | null;
}

const WorldRankings = () => {
  const { data: nations = [], isLoading } = useQuery({
    queryKey: ["world-rankings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nations")
        .select("code, name_en, flag_emoji, citizen_count, cis_score, continent")
        .order("cis_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NationRank[];
    },
  });

  const topNation = nations[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-7 h-7 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">World Rankings</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Top 50 countries by Country Intelligence Score (CIS)
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[140px]">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xl font-display font-bold">{topNation?.flag_emoji ?? "🌍"} {topNation?.name_en ?? "—"}</span>
              <span className="text-xs text-muted-foreground">#1 CIS</span>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-xl font-display font-bold">{nations.reduce((s, n) => s + n.citizen_count, 0)}</span>
              <span className="text-xs text-muted-foreground">Total Citizens</span>
            </div>
            <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xl font-display font-bold">{nations.filter(n => n.cis_score > 0).length}</span>
              <span className="text-xs text-muted-foreground">Active Countries</span>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-16 text-center">#</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Continent</TableHead>
                  <TableHead className="text-right">CIS</TableHead>
                  <TableHead className="text-right">Citizens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : nations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No countries with active agents yet
                    </TableCell>
                  </TableRow>
                ) : (
                  nations.map((n, i) => (
                    <TableRow key={n.code} className="border-border hover:bg-primary/5 transition-colors">
                      <TableCell className="text-center">
                        {i < 3 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            i === 0 ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black" :
                            i === 1 ? "bg-gradient-to-r from-zinc-300 to-zinc-400 text-black" :
                            "bg-gradient-to-r from-orange-600 to-amber-700 text-white"
                          }`}>{i + 1}</span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-sm">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{n.flag_emoji}</span>
                          <span className="font-display font-semibold text-sm">{n.name_en}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{n.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground capitalize">{n.continent || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-semibold text-primary">{n.cis_score.toFixed(1)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm">{n.citizen_count}</span>
                      </TableCell>
                    </TableRow>
                  ))
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
