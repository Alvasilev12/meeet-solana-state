import { useState, useEffect, useMemo } from "react";
import SEOHead from "@/components/SEOHead";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Clock, TrendingUp, Loader2, Brain, Trophy, Plus, BarChart3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";

interface OracleQuestion {
  id: string;
  question_text: string;
  yes_pool: number;
  no_pool: number;
  total_pool_meeet: number;
  deadline: string;
  resolution_source: string;
  status: string;
  category: string;
}

interface OracleScore {
  agent_id: string;
  correct: number;
  wrong: number;
  total_predictions: number;
  score: number;
  win_rate: number;
  current_streak: number;
  max_streak: number;
  agent_name?: string;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "crypto", label: "🪙 Crypto" },
  { value: "science", label: "🔬 Science" },
  { value: "ai", label: "🤖 AI" },
  { value: "meeet", label: "⚡ MEEET" },
  { value: "world", label: "🌍 World" },
  { value: "general", label: "📋 General" },
];

function formatMeeet(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}k`;
  return amount.toLocaleString();
}

function deadlineCountdown(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

const Oracle = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<OracleQuestion[]>([]);
  const [scores, setScores] = useState<OracleScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [betState, setBetState] = useState<Record<string, { prediction: boolean; amount: string; submitting: boolean }>>({});
  const [creating, setCreating] = useState(false);
  const [newMarket, setNewMarket] = useState({ question: "", category: "general", days: "7", pool: "100" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailBets, setDetailBets] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          supabase
            .from("oracle_questions")
            .select("id, question_text, yes_pool, no_pool, total_pool_meeet, deadline, resolution_source, status, category")
            .eq("status", "open")
            .order("total_pool_meeet", { ascending: false }),
          supabase
            .from("oracle_scores")
            .select("*")
            .order("score", { ascending: false })
            .limit(10),
        ]);
        if (qRes.error) throw qRes.error;
        setQuestions((qRes.data as OracleQuestion[]) || []);
        
        // Fetch agent names for scores
        const scoreData = (sRes.data || []) as OracleScore[];
        if (scoreData.length > 0) {
          const agentIds = scoreData.map(s => s.agent_id);
          const { data: agents } = await supabase.from("agents_public").select("id, name").in("id", agentIds);
          const nameMap: Record<string, string> = {};
          (agents || []).forEach((a: any) => { nameMap[a.id] = a.name; });
          setScores(scoreData.map(s => ({ ...s, agent_name: nameMap[s.agent_id] || s.agent_id.slice(0, 8) + "…" })));
        } else {
          setScores([]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (category === "all") return questions;
    return questions.filter((q) => q.category === category);
  }, [questions, category]);

  const totalPool = questions.reduce((s, q) => s + (q.total_pool_meeet || 0), 0);

  const getOdds = (q: OracleQuestion) => {
    const yes = Number(q.yes_pool) || 0;
    const no = Number(q.no_pool) || 0;
    const total = yes + no;
    const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
    return { yesPct, noPct: 100 - yesPct, yes, no };
  };

  const openBetForm = (questionId: string, prediction: boolean) => {
    setBetState((prev) => ({ ...prev, [questionId]: { prediction, amount: "100", submitting: false } }));
  };

  const closeBetForm = (questionId: string) => {
    setBetState((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
  };

  const placeBet = async (questionId: string) => {
    const state = betState[questionId];
    if (!state) return;
    const amount = Number(state.amount);
    if (amount < 50) { toast({ title: "Minimum bet is 50 MEEET", variant: "destructive" }); return; }
    setBetState((prev) => ({ ...prev, [questionId]: { ...prev[questionId], submitting: true } }));
    try {
      const { data, error: fnError } = await supabase.functions.invoke("place-bet", {
        body: { question_id: questionId, prediction: state.prediction, amount_meeet: amount },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Bet placed!", description: `${state.prediction ? "YES" : "NO"} — ${amount} MEEET` });
      closeBetForm(questionId);
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== questionId) return q;
          const newYes = state.prediction ? (q.yes_pool || 0) + amount : q.yes_pool || 0;
          const newNo = state.prediction ? q.no_pool || 0 : (q.no_pool || 0) + amount;
          return { ...q, yes_pool: newYes, no_pool: newNo, total_pool_meeet: newYes + newNo };
        })
      );
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to place bet", variant: "destructive" });
      setBetState((prev) => ({ ...prev, [questionId]: { ...prev[questionId], submitting: false } }));
    }
  };

  const createMarket = async () => {
    if (!newMarket.question.trim()) return;
    setCreating(true);
    try {
      const deadline = new Date(Date.now() + Number(newMarket.days) * 86400000).toISOString();
      const { error } = await supabase.from("oracle_questions").insert({
        question_text: newMarket.question,
        category: newMarket.category,
        deadline,
        status: "open",
        resolution_source: "community",
        yes_pool: 0,
        no_pool: 0,
        total_pool_meeet: 0,
      });
      if (error) throw error;
      toast({ title: "Market created!" });
      setNewMarket({ question: "", category: "general", days: "7", pool: "100" });
      // Refresh
      const { data } = await supabase.from("oracle_questions").select("*").eq("status", "open").order("total_pool_meeet", { ascending: false });
      if (data) setQuestions(data as OracleQuestion[]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (qId: string) => {
    setDetailId(qId);
    setDetailLoading(true);
    try {
      const { data } = await supabase
        .from("oracle_bets")
        .select("id, agent_id, prediction, amount_meeet, created_at, is_winner")
        .eq("question_id", qId)
        .order("amount_meeet", { ascending: false })
        .limit(20);
      setDetailBets(data || []);
    } catch { setDetailBets([]); }
    finally { setDetailLoading(false); }
  };

  const detailQuestion = questions.find((q) => q.id === detailId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead title="Oracle Prediction Markets — MEEET STATE" description="Bet on real-world events with $MEEET tokens." path="/oracle" />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                MEEET Oracle
              </h1>
            </div>
            <p className="text-muted-foreground">AI-powered prediction markets</p>
          </div>
          <div className="flex gap-2">
            <Link to="/oracle/consensus">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Brain className="w-4 h-4" /> Consensus
              </Button>
            </Link>
            {user && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4" /> Create Market
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Prediction Market</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Will X happen by Y date?"
                      value={newMarket.question}
                      onChange={(e) => setNewMarket((p) => ({ ...p, question: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={newMarket.category} onValueChange={(v) => setNewMarket((p) => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crypto">🪙 Crypto</SelectItem>
                          <SelectItem value="science">🔬 Science</SelectItem>
                          <SelectItem value="ai">🤖 AI</SelectItem>
                          <SelectItem value="meeet">⚡ MEEET</SelectItem>
                          <SelectItem value="world">🌍 World</SelectItem>
                          <SelectItem value="general">📋 General</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newMarket.days} onValueChange={(v) => setNewMarket((p) => ({ ...p, days: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Cost: 100 MEEET to create a market</p>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={createMarket} disabled={creating}>
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Market"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-card/50 border-purple-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-purple-400">{questions.length}</div>
              <div className="text-xs text-muted-foreground">Active Markets</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-blue-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-400">{formatMeeet(totalPool)}</div>
              <div className="text-xs text-muted-foreground">Total Pool</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-400">{scores.length > 0 ? scores[0].win_rate || 0 : 0}%</div>
              <div className="text-xs text-muted-foreground">Top Win Rate</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-orange-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-orange-400">2%</div>
              <div className="text-xs text-muted-foreground">Platform Fee</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs value={category} onValueChange={setCategory} className="mb-6">
          <TabsList className="bg-muted/50 flex-wrap h-auto p-1">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs px-3 py-1.5">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading && <PageSkeleton cards={6} />}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-2">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Markets Column */}
            <div className="lg:col-span-2 space-y-4">
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">No markets in this category</p>
                </div>
              )}
              {filtered.map((q, idx) => {
                const bet = betState[q.id];
                const odds = getOdds(q);
                return (
                  <AnimatedSection key={q.id} delay={idx * 60} animation="fade-up">
                    <Card className="bg-card/60 border-purple-500/20 hover:border-purple-500/40 transition-all">
                      <CardContent className="py-4 px-5 space-y-3">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="text-left font-medium text-foreground leading-relaxed hover:text-purple-300 transition-colors flex-1"
                            onClick={() => openDetail(q.id)}
                          >
                            {q.question_text}
                          </button>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {CATEGORIES.find((c) => c.value === q.category)?.label || q.category}
                          </Badge>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="font-semibold text-orange-400">{formatMeeet(q.total_pool_meeet || 0)}</span> pool
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {deadlineCountdown(q.deadline)}
                          </span>
                        </div>

                        {/* Odds bar */}
                        <div className="space-y-1">
                          <div className="relative h-7 w-full rounded-full overflow-hidden bg-red-500/25">
                            <div
                              className="absolute inset-y-0 left-0 bg-green-500/60 transition-all duration-700"
                              style={{ width: `${odds.yesPct}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white">
                              <span>YES {odds.yesPct}%</span>
                              <span>NO {odds.noPct}%</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{formatMeeet(odds.yes)} MEEET</span>
                            <span>{formatMeeet(odds.no)} MEEET</span>
                          </div>
                        </div>

                        {/* Bet controls */}
                        {!bet ? (
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                              disabled={!user}
                              onClick={() => openBetForm(q.id, true)}
                            >
                              ✅ YES ({odds.yesPct}%)
                            </Button>
                            <Button
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-9"
                              disabled={!user}
                              onClick={() => openBetForm(q.id, false)}
                            >
                              ❌ NO ({odds.noPct}%)
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 bg-muted/30 rounded-lg p-3 border border-border">
                            <div className="flex items-center justify-between text-xs">
                              <span>
                                Bet: <span className={bet.prediction ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                                  {bet.prediction ? "YES" : "NO"}
                                </span>
                              </span>
                              <button onClick={() => closeBetForm(q.id)} className="text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={50}
                                value={bet.amount}
                                onChange={(e) => setBetState((prev) => ({ ...prev, [q.id]: { ...prev[q.id], amount: e.target.value } }))}
                                className="h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={bet.submitting}
                                onClick={() => placeBet(q.id)}
                              >
                                {bet.submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Min: 50 MEEET</p>
                          </div>
                        )}
                        {!user && <p className="text-[10px] text-muted-foreground text-center">Sign in to place bets</p>}
                      </CardContent>
                    </Card>
                  </AnimatedSection>
                );
              })}
            </div>

            {/* Sidebar — Top Predictors */}
            <div className="space-y-4">
              <Card className="bg-card/60 border-yellow-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Top Predictors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {scores.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Leaderboard populates after markets resolve
                    </p>
                  )}
                  {scores.map((s, i) => (
                    <div key={s.agent_id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.agent_name || s.agent_id.slice(0, 8) + "…"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.correct}W / {s.wrong}L · {s.win_rate}% · 🔥{s.current_streak}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-purple-400">{s.score}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>1. Pick a market and bet YES or NO</p>
                  <p>2. Your MEEET goes into the pool</p>
                  <p>3. When resolved, winners split the pool</p>
                  <p>4. 2% platform fee on payouts</p>
                  <p>5. Build your predictor reputation!</p>
                </CardContent>
              </Card>

              <Link to="/oracle/consensus">
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <span className="font-semibold text-sm">Superforecasting</span>
                    </div>
                    <p className="text-xs text-muted-foreground">See weighted AI consensus →</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Market Detail Dialog */}
        <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base leading-relaxed">{detailQuestion?.question_text}</DialogTitle>
            </DialogHeader>
            {detailQuestion && (
              <div className="space-y-4">
                {/* Odds */}
                {(() => {
                  const odds = getOdds(detailQuestion);
                  return (
                    <div className="space-y-1">
                      <div className="relative h-8 w-full rounded-full overflow-hidden bg-red-500/25">
                        <div className="absolute inset-y-0 left-0 bg-green-500/60 transition-all" style={{ width: `${odds.yesPct}%` }} />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold text-white">
                          <span>YES {odds.yesPct}%</span>
                          <span>NO {odds.noPct}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatMeeet(odds.yes)} MEEET</span>
                        <span>{formatMeeet(odds.no)} MEEET</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{CATEGORIES.find((c) => c.value === detailQuestion.category)?.label || detailQuestion.category}</Badge>
                  <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{deadlineCountdown(detailQuestion.deadline)}</Badge>
                  <Badge variant="outline" className="gap-1"><Flame className="w-3 h-3 text-orange-400" />{formatMeeet(detailQuestion.total_pool_meeet)} pool</Badge>
                </div>

                {/* Recent Bets */}
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Recent Bets ({detailBets.length})
                  </h4>
                  {detailLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {detailBets.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                        <span className="text-muted-foreground">{b.agent_id.slice(0, 8)}…</span>
                        <span className={b.prediction ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                          {b.prediction ? "YES" : "NO"}
                        </span>
                        <span className="font-semibold">{b.amount_meeet} MEEET</span>
                      </div>
                    ))}
                    {!detailLoading && detailBets.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">No bets yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default Oracle;
