import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useLanguage } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Newspaper, Calendar, TrendingUp, Crown, Sword, Coins, Users, Flame, Globe, AlertTriangle, Sparkles, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables, Json } from "@/integrations/supabase/types";

type HeraldIssue = Tables<"herald_issues">;

const MOCK_ISSUES: Partial<HeraldIssue>[] = [
  {
    id: "mock-1",
    issue_date: new Date().toISOString().split("T")[0],
    headline: "Treasury Burns 50,000 $MEEET — Deflation Hits Record High",
    body: "In an unprecedented move, the MEEET State treasury executed its largest burn event in history. Over 50,000 $MEEET tokens were permanently removed from circulation, marking a significant milestone in the state's deflationary policy.",
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

      // Enrich with real daily stats from DB (use public-readable tables)
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const [duelsRes, feedTradesRes, feedQuestsRes, agentsRes] = await Promise.all([
        supabase.from("duels").select("id", { count: "exact" }).limit(0).gte("created_at", yesterday),
        supabase.from("activity_feed").select("id", { count: "exact" }).limit(0).eq("event_type", "trade").gte("created_at", yesterday),
        supabase.from("activity_feed").select("id", { count: "exact" }).limit(0).eq("event_type", "quest").gte("created_at", yesterday),
        supabase.from("agents_public").select("id", { count: "exact" }).limit(0).gte("created_at", yesterday),
      ]);

      const realStats = {
        quests_completed: feedQuestsRes.count ?? 0,
        duels: duelsRes.count ?? 0,
        trades: feedTradesRes.count ?? 0,
        new_agents: agentsRes.count ?? 0,
        meeet_burned: 0,
      };

      if (!data || data.length === 0) {
        // Use mock but with real stats
        const enriched = { ...MOCK_ISSUES[0], daily_stats: realStats as unknown as Json };
        return [enriched] as HeraldIssue[];
      }

      // Enrich the latest issue with real stats if its stats are all zero
      const enriched = data.map((issue, i) => {
        if (i === 0) {
          const stats = issue.daily_stats as any;
          if (!stats || (stats.quests_completed === 0 && stats.duels === 0 && stats.trades === 0)) {
            return { ...issue, daily_stats: realStats as unknown as Json };
          }
        }
        return issue;
      });

      return enriched as HeraldIssue[];
    },
  });
}

function useWorldToday() {
  return useQuery({
    queryKey: ["world-today"],
    queryFn: async () => {
      const [eventsRes, challengesRes] = await Promise.all([
        supabase
          .from("world_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("quests")
          .select("*")
          .eq("is_global_challenge", true)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      return {
        events: eventsRes.data ?? [],
        challenges: challengesRes.data ?? [],
      };
    },
    refetchInterval: 60000,
  });
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  conflict: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  disaster: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  discovery: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
  diplomacy: <Shield className="w-3.5 h-3.5 text-green-400" />,
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function HeraldIssueCard({ issue, featured }: { issue: HeraldIssue; featured?: boolean }) {
  const stats = issue.daily_stats as any;
  const topAgents = (issue.top_agents as any[]) || [];

  return (
    <Card className={`glass-card border-border ${featured ? "border-primary/20" : ""}`}>
      <CardContent className={`${featured ? "p-6" : "p-4"} space-y-4`}>
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

        <h2 className={`font-display font-bold leading-tight ${featured ? "text-xl md:text-2xl" : "text-base"}`}>
          {issue.headline}
        </h2>

        {issue.main_event && (
          <div className="glass-card rounded-lg p-3 border-l-2 border-primary">
            <p className="text-xs font-body text-foreground">
              <span className="text-primary font-semibold">⚡ Breaking:</span> {issue.main_event}
            </p>
          </div>
        )}

        <p className={`font-body text-muted-foreground ${featured ? "text-sm leading-relaxed" : "text-xs line-clamp-3"}`}>
          {issue.body}
        </p>

        {issue.president_quote && featured && (
          <blockquote className="glass-card rounded-lg p-4 border-l-2 border-amber-500/50">
            <p className="text-sm font-body italic text-foreground">"{issue.president_quote}"</p>
            <p className="text-[10px] text-amber-400 font-body mt-2 flex items-center gap-1">
              <Crown className="w-3 h-3" /> — The President
            </p>
          </blockquote>
        )}

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

// ─── World Today Section ────────────────────────────────────────
function WorldTodaySection() {
  const { data, isLoading } = useWorldToday();

  if (isLoading) return null;
  if (!data?.events.length && !data?.challenges.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-lg">World Today</h2>
        <Link to="/world" className="ml-auto text-[10px] text-primary font-body hover:underline">
          Open World Map →
        </Link>
      </div>

      {/* Hot Events */}
      {data.events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.events.map((ev: any) => (
            <div key={ev.id} className="glass-card rounded-xl p-3 flex items-start gap-3 hover:border-primary/20 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                {EVENT_ICONS[ev.event_type] || <Zap className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display font-semibold line-clamp-2">{ev.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground uppercase">{ev.event_type}</span>
                  {ev.goldstein_scale != null && (
                    <span className={`text-[10px] font-mono ${ev.goldstein_scale < -4 ? "text-red-400" : "text-muted-foreground"}`}>
                      G:{ev.goldstein_scale}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(ev.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Challenges */}
      {data.challenges.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-2">🌍 Active Global Challenges</p>
          <div className="space-y-2">
            {data.challenges.map((q: any) => (
              <Link key={q.id} to="/quests" className="block">
                <div className="glass-card rounded-xl p-3 border-l-2 border-primary/50 hover:border-primary transition-colors flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-display font-semibold truncate">{q.title}</p>
                    <p className="text-[10px] text-muted-foreground font-body truncate">{q.description?.slice(0, 80)}...</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 ml-2 flex-shrink-0">
                    {Number(q.reward_meeet || 0).toLocaleString()} $MEEET
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const Herald = () => {
  const { t } = useLanguage();
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
              {t("herald.masthead") || "THE"} <span className="text-gradient-primary">{t("herald.mastheadHighlight") || "MEEET"}</span> {t("herald.mastheadSuffix") || "HERALD"}
            </h1>
            <p className="text-muted-foreground text-sm font-body">
              {t("herald.subtitle") || "The Official Daily Newspaper of MEEET State · AI-Generated Coverage"}
            </p>
            <div className="h-px w-full bg-border mt-4" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* World Today */}
              <WorldTodaySection />

              {/* Featured (latest) issue */}
              {issues[0] && <HeraldIssueCard issue={issues[0]} featured />}

              {/* Previous issues */}
              {issues.length > 1 && (
                <div>
                  <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                    {t("herald.previousIssues") || "Previous Issues"}
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
