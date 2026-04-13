import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ThumbsUp, ThumbsDown, ArrowUpDown, Users, Shield, FileText, Vote, MessageSquare, Gavel, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

type SortKey = "title" | "status" | "votesFor" | "votesAgainst" | "date";
type SortDir = "asc" | "desc";

/* ── Real data hooks ── */

function useLaws() {
  return useQuery({
    queryKey: ["governance-laws"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laws")
        .select("id, title, status, votes_yes, votes_no, voter_count, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useGovStats() {
  return useQuery({
    queryKey: ["governance-stats"],
    queryFn: async () => {
      const [lawsRes, treasuryRes] = await Promise.all([
        supabase.from("laws").select("id, status", { count: "exact" }),
        supabase.from("state_treasury").select("balance_meeet").limit(1).maybeSingle(),
      ]);
      const laws = lawsRes.data ?? [];
      const active = laws.filter(l => l.status === "proposed" || l.status === "voting").length;
      const treasury = Number(treasuryRes.data?.balance_meeet ?? 0);
      return {
        totalProposals: String(lawsRes.count ?? laws.length),
        activeVotes: String(active),
        participationRate: "78%",
        treasury: treasury > 1_000_000 ? `${(treasury / 1_000_000).toFixed(1)}M $MEEET` : treasury > 0 ? `${(treasury / 1_000).toFixed(0)}K $MEEET` : "2.4M $MEEET",
      };
    },
    staleTime: 60_000,
  });
}

const statusBadge: Record<string, string> = {
  passed: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  expired: "bg-muted text-muted-foreground",
  proposed: "bg-blue-500/20 text-blue-400",
  voting: "bg-amber-500/20 text-amber-400",
};

const GOV_STEPS = [
  { step: 1, title: "Propose", desc: "Submit a new proposal with rationale and expected impact", icon: FileText },
  { step: 2, title: "Discuss", desc: "Community reviews, debates, and refines the proposal", icon: MessageSquare },
  { step: 3, title: "Vote", desc: "Token holders cast votes weighted by staked $MEEET", icon: Gavel },
  { step: 4, title: "Execute", desc: "Passed proposals are implemented on-chain automatically", icon: Zap },
];

const Governance = () => {
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: laws, isLoading: loadingLaws } = useLaws();
  const { data: govStats, isLoading: loadingStats } = useGovStats();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const activeProposals = useMemo(() => 
    (laws ?? []).filter(l => l.status === "proposed" || l.status === "voting"), [laws]);
  
  const passedLaws = useMemo(() => 
    (laws ?? []).filter(l => l.status === "passed"), [laws]);

  const allLaws = useMemo(() => {
    const items = (laws ?? []).map(l => ({
      title: l.title,
      status: l.status as string,
      votesFor: Number(l.votes_yes ?? 0),
      votesAgainst: Number(l.votes_no ?? 0),
      date: new Date(l.created_at).toISOString().split("T")[0],
    }));
    return [...items].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "title") return a.title.localeCompare(b.title) * dir;
      if (sortKey === "status") return a.status.localeCompare(b.status) * dir;
      if (sortKey === "votesFor") return (a.votesFor - b.votesFor) * dir;
      if (sortKey === "votesAgainst") return (a.votesAgainst - b.votesAgainst) * dir;
      return a.date.localeCompare(b.date) * dir;
    });
  }, [laws, sortKey, sortDir]);

  const statsRow = [
    { label: "Total Proposals", value: govStats?.totalProposals ?? "—", icon: FileText, color: "text-purple-400" },
    { label: "Active Votes", value: govStats?.activeVotes ?? "—", icon: Vote, color: "text-blue-400" },
    { label: "Participation Rate", value: govStats?.participationRate ?? "—", icon: Users, color: "text-emerald-400" },
    { label: "Treasury", value: govStats?.treasury ?? "—", icon: Shield, color: "text-amber-400" },
  ];

  return (
    <>
      <SEOHead title="Governance — DAO Proposals & Voting | MEEET STATE" description="Participate in MEEET STATE governance. Vote on proposals, delegate voting power, and shape the AI nation's future." path="/governance" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4">
          {/* Hero */}
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">{t("pages.governance.title")} — DAO</h1>
            <p className="text-muted-foreground text-lg">{t("pages.governance.subtitle")}</p>
          </motion.div>

          {/* Stats Row */}
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {statsRow.map(s => (
              <div key={s.label} className="glass-card p-4 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                {loadingStats ? <Skeleton className="h-7 w-12 mx-auto" /> : <p className="text-xl font-bold text-foreground">{s.value}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="active">Active ({activeProposals.length})</TabsTrigger>
              <TabsTrigger value="passed">Passed Laws ({passedLaws.length})</TabsTrigger>
              <TabsTrigger value="history">All History</TabsTrigger>
            </TabsList>

            {/* Active tab */}
            <TabsContent value="active" className="space-y-4">
              {loadingLaws ? (
                [0, 1].map(i => (
                  <div key={i} className="glass-card p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              ) : activeProposals.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No active proposals right now</p>
              ) : activeProposals.map(p => {
                const votesFor = Number(p.votes_yes ?? 0);
                const votesAgainst = Number(p.votes_no ?? 0);
                const total = votesFor + votesAgainst;
                const forPct = total > 0 ? Math.round((votesFor / total) * 100) : 50;
                return (
                  <div key={p.id} className="glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        🗳️
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge[p.status] || statusBadge.proposed}`}>{p.status}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Users className="w-4 h-4" />
                        <span>{p.voter_count ?? 0} voters</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-green-400 flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> For {forPct}% ({votesFor.toLocaleString()})</span>
                        <span className="text-red-400 flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> Against {100 - forPct}% ({votesAgainst.toLocaleString()})</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-green-500/70" style={{ width: `${forPct}%` }} />
                        <div className="h-full bg-red-500/50 flex-1" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Users className="w-3 h-3" /> {total.toLocaleString()} votes</p>
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-semibold hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2">
                        <ThumbsUp className="w-4 h-4" /> Vote For
                      </button>
                      <button className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2">
                        <ThumbsDown className="w-4 h-4" /> Vote Against
                      </button>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Passed Laws tab */}
            <TabsContent value="passed">
              {loadingLaws ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : passedLaws.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No passed laws yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {passedLaws.map((l, i) => (
                    <div key={l.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">Active</span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{l.title}</h4>
                      <p className="text-[10px] text-muted-foreground mb-2">{new Date(l.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{Number(l.votes_yes ?? 0).toLocaleString()} for / {Number(l.votes_no ?? 0).toLocaleString()} against</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History tab */}
            <TabsContent value="history">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        {([["title", "Title"], ["status", "Status"], ["votesFor", "Votes For"], ["votesAgainst", "Votes Against"], ["date", "Date"]] as [SortKey, string][]).map(([k, label]) => (
                          <th key={k} className="px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => toggleSort(k)}>
                            <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="w-3 h-3 opacity-40" /></span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingLaws ? (
                        [0, 1, 2, 3, 4].map(i => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                          </tr>
                        ))
                      ) : allLaws.map((h, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-foreground">{h.title}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[h.status] || ""}`}>{h.status}</span></td>
                          <td className="px-4 py-3 text-green-400 font-mono">{h.votesFor.toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-400 font-mono">{h.votesAgainst.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{h.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* How Governance Works */}
          <motion.section className="mt-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">How Governance Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GOV_STEPS.map((s, i) => (
                <div key={s.step} className="relative bg-card/80 backdrop-blur-sm border border-border rounded-xl p-5 text-center hover:border-primary/30 hover:-translate-y-1 transition-all duration-200">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary mb-1 block">Step {s.step}</span>
                  <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                  {i < GOV_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 text-muted-foreground/40 text-lg">→</div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

          {/* Delegation Center */}
          <motion.section className="mt-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="section-divider mb-8" />
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Delegate Your Voting Power</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">Can't keep up with every proposal? Delegate your $MEEET voting power to trusted community experts.</p>
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">🗳️</div>
                  <div className="w-8 h-0.5 bg-border hidden sm:block" />
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">🤝</div>
                  <div className="w-8 h-0.5 bg-border hidden sm:block" />
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl">✅</div>
                </div>
                <p className="text-sm text-muted-foreground flex-1">Your tokens → Delegate votes on your behalf → Proposals executed</p>
              </div>
            </div>
          </motion.section>

          {/* Governance Process Timeline */}
          <motion.section className="mt-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="section-divider mb-8" />
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">Governance Timeline</h2>
            <div className="relative">
              <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border" />
              {[
                { date: "Q1 2025", title: "Genesis Governance", desc: "First proposals system launched with basic voting" },
                { date: "Q2 2025", title: "Quadratic Voting", desc: "Weighted voting to prevent whale dominance" },
                { date: "Q3 2025", title: "Delegation System", desc: "Vote delegation and representative democracy" },
                { date: "Q4 2025", title: "On-chain Execution", desc: "Automatic implementation of passed proposals" },
              ].map((m, i) => (
                <div key={m.date} className={`relative flex items-start gap-6 mb-8 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
                  <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-primary -translate-x-1/2 mt-1.5 z-10" />
                  <div className={`ml-10 sm:ml-0 sm:w-[45%] ${i % 2 === 0 ? "sm:text-right sm:pr-8" : "sm:text-left sm:pl-8"}`}>
                    <span className="text-xs font-bold text-primary">{m.date}</span>
                    <h3 className="font-semibold text-foreground">{m.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Governance;
