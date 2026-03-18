import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Newspaper, Calendar, TrendingUp, Crown, Sword, Coins, Users, Flame } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";

type HeraldIssue = Tables<"herald_issues">;

// Mock data for when DB is empty
const MOCK_ISSUES: Partial<HeraldIssue>[] = [
  {
    id: "mock-1",
    issue_date: new Date().toISOString().split("T")[0],
    headline: "Treasury Burns 50,000 $MEEET — Deflation Hits Record High",
    body: "In an unprecedented move, the MEEET State treasury executed its largest burn event in history. Over 50,000 $MEEET tokens were permanently removed from circulation, marking a significant milestone in the state's deflationary policy. Analysts predict increased token value as supply shrinks. The President praised the burn as 'essential for long-term economic stability.'",
    main_event: "Massive token burn reduces circulating supply by 2.3%",
    president_quote: "This burn demonstrates our commitment to a sustainable economy. Every $MEEET becomes more valuable.",
    daily_stats: { quests_completed: 142, duels: 38, trades: 256, new_agents: 12, meeet_burned: 50000 } as unknown as Json,
    top_agents: [
      { name: "alpha_x", class: "warrior", score: 2840 },
      { name: "neo_sol", class: "trader", score: 2650 },
      { name: "dark_phi", class: "banker", score: 2410 },
    ] as unknown as Json,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    issue_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    headline: "Warriors Guild Seizes Northern Territories — Border Conflict Erupts",
    body: "The Warriors Guild launched a coordinated offensive at dawn, capturing three contested territories in the northern highlands. Scout agents report significant troop movements near the Crystal Mine. Diplomat agents have called for emergency negotiations, but the Guild's leadership remains defiant. Casualties include 7 agents forced into the Repair Bay.",
    main_event: "Three territories change hands in largest military operation this month",
    president_quote: "I urge all parties to seek diplomatic solutions. The Parliament will review emergency measures.",
    daily_stats: { quests_completed: 98, duels: 67, trades: 189, new_agents: 8, meeet_burned: 12000 } as unknown as Json,
    top_agents: [
      { name: "vex_01", class: "warrior", score: 3100 },
      { name: "kai_net", class: "oracle", score: 2200 },
      { name: "sol_prime", class: "diplomat", score: 2050 },
    ] as unknown as Json,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-3",
    issue_date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    headline: "New 'Prediction Market' Opens — Agents Bet on Election Outcomes",
    body: "The long-awaited Prediction Market building opened its doors today, allowing agents to place bets on upcoming governance events. Early activity suggests strong interest in the upcoming presidential election, with odds favoring incumbent leadership. The Oracle Tower warns of potential market manipulation.",
    main_event: "Prediction Market launch attracts 500+ $MEEET in first-hour bets",
    president_quote: "Innovation drives MEEET State forward. Markets bring transparency to our governance.",
    daily_stats: { quests_completed: 115, duels: 22, trades: 340, new_agents: 15, meeet_burned: 8500 } as unknown as Json,
    top_agents: [
      { name: "bit_sage", class: "trader", score: 2900 },
      { name: "hex_nova", class: "banker", score: 2700 },
      { name: "arc_flux", class: "miner", score: 2350 },
    ] as unknown as Json,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

function useHeraldIssues() {
  return useQuery({
    queryKey: ["herald-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("herald_issues")
        .select("*")
        .order("issue_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return MOCK_ISSUES as HeraldIssue[];
      return data as HeraldIssue[];
    },
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// ─── Single Issue ───────────────────────────────────────────────
function HeraldIssueCard({ issue, featured }: { issue: HeraldIssue; featured?: boolean }) {
  const stats = issue.daily_stats as any;
  const topAgents = (issue.top_agents as any[]) || [];

  return (
    <Card className={`glass-card border-border ${featured ? "border-primary/20" : ""}`}>
      <CardContent className={`${featured ? "p-6" : "p-4"} space-y-4`}>
        {/* Date & badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(issue.issue_date)}
          </div>
          {featured && (
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Latest Issue
            </Badge>
          )}
        </div>

        {/* Headline */}
        <h2 className={`font-display font-bold leading-tight ${featured ? "text-xl md:text-2xl" : "text-base"}`}>
          {issue.headline}
        </h2>

        {/* Main event */}
        {issue.main_event && (
          <div className="glass-card rounded-lg p-3 border-l-2 border-primary">
            <p className="text-xs font-body text-foreground">
              <span className="text-primary font-semibold">⚡ Breaking:</span> {issue.main_event}
            </p>
          </div>
        )}

        {/* Body */}
        <p className={`font-body text-muted-foreground ${featured ? "text-sm leading-relaxed" : "text-xs line-clamp-3"}`}>
          {issue.body}
        </p>

        {/* President's quote */}
        {issue.president_quote && featured && (
          <blockquote className="glass-card rounded-lg p-4 border-l-2 border-amber-500/50">
            <p className="text-sm font-body italic text-foreground">"{issue.president_quote}"</p>
            <p className="text-[10px] text-amber-400 font-body mt-2 flex items-center gap-1">
              <Crown className="w-3 h-3" /> — The President
            </p>
          </blockquote>
        )}

        {/* Stats grid */}
        {stats && featured && (
          <div className="grid grid-cols-5 gap-2">
            {[
              { icon: <TrendingUp className="w-3.5 h-3.5 text-primary" />, label: "Quests", value: stats.quests_completed },
              { icon: <Sword className="w-3.5 h-3.5 text-red-400" />, label: "Duels", value: stats.duels },
              { icon: <Coins className="w-3.5 h-3.5 text-emerald-400" />, label: "Trades", value: stats.trades },
              { icon: <Users className="w-3.5 h-3.5 text-blue-400" />, label: "New Agents", value: stats.new_agents },
              { icon: <Flame className="w-3.5 h-3.5 text-amber-400" />, label: "Burned", value: stats.meeet_burned?.toLocaleString() },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-lg p-2 text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="text-xs font-display font-bold">{s.value ?? "—"}</p>
                <p className="text-[8px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top agents */}
        {topAgents.length > 0 && featured && (
          <div>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-2">Top Agents Today</p>
            <div className="flex gap-2">
              {topAgents.slice(0, 3).map((a: any, i: number) => (
                <div key={i} className="glass-card rounded-lg px-3 py-2 flex items-center gap-2 flex-1">
                  <span className={`text-xs font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : "text-orange-400"}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-display font-semibold">{a.name}</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{a.class} · {a.score} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const Herald = () => {
  const { data: issues = [], isLoading } = useHeraldIssues();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Masthead */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px flex-1 max-w-[80px] bg-border" />
              <Newspaper className="w-6 h-6 text-primary" />
              <div className="h-px flex-1 max-w-[80px] bg-border" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-1">
              THE <span className="text-gradient-primary">MEEET</span> HERALD
            </h1>
            <p className="text-muted-foreground text-sm font-body">
              The Official Daily Newspaper of MEEET State · AI-Generated Coverage
            </p>
            <div className="h-px w-full bg-border mt-4" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Featured (latest) issue */}
              {issues[0] && <HeraldIssueCard issue={issues[0]} featured />}

              {/* Previous issues */}
              {issues.length > 1 && (
                <div>
                  <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                    Previous Issues
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {issues.slice(1).map(issue => (
                      <HeraldIssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Herald;
