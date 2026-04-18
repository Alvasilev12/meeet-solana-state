import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentStats } from "@/hooks/useAgentStats";
import { useTokenStats } from "@/hooks/useTokenStats";
import { useLanguage } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import ParticleCanvas from "@/components/ParticleCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Share2, Copy, Check, Send, Twitter, ArrowRight, TrendingUp,
  TrendingDown, Shield, Flame, Bot, AlertTriangle, Calendar, ThumbsUp,
  ThumbsDown, Sparkles, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TREND_KEYS = ["trendQ1", "trendQ2", "trendQ3", "trendQ4", "trendQ5", "trendQ6"];
const TREND_DATA = [
  { pct: 67, votes: 892 },
  { pct: 74, votes: 1203 },
  { pct: 41, votes: 567 },
  { pct: 12, votes: 2341 },
  { pct: 83, votes: 789 },
  { pct: 56, votes: 1567 },
];

const TAG_KEYS = ["tagCrypto", "tagAiTech", "tagSports", "tagWorld", "tagMarkets", "tagEntertainment"];

// Faction visual styling — keys must match those returned by edge function
const FACTION_STYLES: Record<string, string> = {
  fQuantumMinds:    "from-purple-500 to-indigo-500",
  fBioInnovators:   "from-emerald-500 to-teal-500",
  fTerraCollective: "from-amber-500 to-orange-500",
  fMysticOrder:     "from-violet-500 to-purple-500",
  fCyberLegion:     "from-red-500 to-rose-500",
  fNovaAlliance:    "from-cyan-500 to-blue-500",
};

type Forecast = {
  verdict: "YES" | "NO" | "UNCERTAIN";
  yesPct: number;
  noPct: number;
  yesAgents: number;
  noAgents: number;
  totalAgents: number;
  confidence: number;
  summary: string;
  timeframe: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
  timeline: Array<{ when: string; event: string }>;
  risks: string[];
  factions: Array<{ key: string; name: string; side: "YES" | "NO"; pct: number; text: string }>;
  stakes: { yes: number; no: number; total: number };
  dissents: number;
  generatedAt: string;
};

const Oracle = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: agentStats } = useAgentStats();
  const { data: tokenStats } = useTokenStats();

  const { data: oracleStats } = useQuery({
    queryKey: ["oracle-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("oracle_bets").select("id", { count: "exact", head: true });
      return { predictions: count ?? 0 };
    },
    staleTime: 60000,
  });

  const [question, setQuestion] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<"YES" | "NO" | null>(null);
  const [copied, setCopied] = useState(false);

  const totalAgents = agentStats?.totalAgents ?? 1020;
  const agentCount = totalAgents.toLocaleString();
  const r = (s: string, replacements: Record<string, string>) => {
    let result = s;
    for (const [k, v] of Object.entries(replacements)) result = result.replace(`{{${k}}}`, v);
    return result;
  };

  const tags = useMemo(() => TAG_KEYS.map(k => ({
    key: k,
    label: t(`oracle.${k}`) as string,
    rawTag: k.replace("tag", ""),
  })), [t]);

  const handleAsk = useCallback(async () => {
    const q = question.trim();
    if (!q) return;
    setShowResults(true);
    setLoading(true);
    setForecast(null);
    setErrorMsg(null);
    setUserVote(null);

    try {
      const tagLabel = selectedTag ? (t(`oracle.${selectedTag}`) as string) : null;
      const { data, error } = await supabase.functions.invoke("oracle-predict", {
        body: { question: q, tag: tagLabel, totalAgents },
      });
      if (error) {
        console.error("[Oracle] invoke error", error);
        const msg = error.message || (t("oracle.errorGeneric") as string) || "Forecast failed";
        setErrorMsg(msg);
        toast({ title: msg, variant: "destructive" });
        return;
      }
      if ((data as any)?.error) {
        setErrorMsg((data as any).error);
        toast({ title: (data as any).error, variant: "destructive" });
        return;
      }
      setForecast(data as Forecast);
    } catch (e) {
      console.error("[Oracle] unexpected", e);
      const msg = e instanceof Error ? e.message : "Forecast failed";
      setErrorMsg(msg);
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [question, selectedTag, totalAgents, toast, t]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: t("oracle.linkCopied") as string });
    setTimeout(() => setCopied(false), 2000);
  };

  const isYes = forecast ? forecast.yesPct >= 50 : true;
  const verdictLabel = forecast?.verdict === "UNCERTAIN"
    ? (t("oracle.uncertain") as string) || "Uncertain"
    : isYes
      ? (t("oracle.yes") as string)
      : (t("oracle.no") as string);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SEOHead title={`MEEET Oracle — Ask ${agentCount} AI Agents`} description="Ask any question. AI agents forecast with calibrated probabilities, arguments, timelines and risks." path="/oracle" />
        <Navbar />

        <main className="flex-1 pt-14">
          {/* HERO */}
          <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
            <ParticleCanvas />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background pointer-events-none" />
            <div className="relative z-10 text-center px-4 max-w-3xl mx-auto py-20">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
                  <Eye className="w-3 h-3 mr-1" /> {t("oracle.badge")}
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
                  MEEET <span className="text-gradient-primary">Oracle</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  {r(t("oracle.subtitle") as string, { count: agentCount })}
                </p>
              </motion.div>
            </div>
          </section>

          {/* INPUT */}
          <section className="relative z-10 -mt-12 px-4">
            <div className="max-w-2xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t("oracle.placeholder") as string}
                    className="flex-1 h-14 text-lg bg-background/50 border-border/50"
                    disabled={loading}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleAsk()}
                    maxLength={500}
                  />
                  <Button onClick={handleAsk} disabled={loading || !question.trim()} className="h-14 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shrink-0">
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Bot className="w-5 h-5 mr-2" />}
                    {loading ? t("oracle.asking") || "Asking..." : r(t("oracle.askAgents") as string, { count: agentCount })}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {tags.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTag(key === selectedTag ? null : key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTag === key ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* RESULTS */}
          <AnimatePresence>
            {showResults && (
              <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }} className="px-4 mt-12">
                <div className="max-w-4xl mx-auto space-y-8">
                  {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="text-lg font-semibold text-foreground">{t("oracle.agentsVoting")}</span>
                      </div>
                      <Progress value={undefined} className="h-3 max-w-md mx-auto" />
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        {t("oracle.askingHint") || "AI council is analyzing arguments, weighing factions and stress-testing risks…"}
                      </p>
                    </motion.div>
                  )}

                  {!loading && errorMsg && (
                    <Card className="border-destructive/40 bg-destructive/5">
                      <CardContent className="p-6 text-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                        <h3 className="text-lg font-bold text-foreground">{t("oracle.errorTitle") || "Forecast failed"}</h3>
                        <p className="text-sm text-muted-foreground">{errorMsg}</p>
                        <Button variant="outline" onClick={handleAsk} className="mt-3">
                          {t("oracle.retry") || "Retry"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {!loading && forecast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      {/* VERDICT + SUMMARY */}
                      <Card className="bg-card/60 backdrop-blur border-border/50">
                        <CardContent className="p-6 space-y-5">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <h3 className="text-xl font-bold text-foreground flex-1 min-w-0">"{question}"</h3>
                            <Badge className={`text-sm font-bold ${isYes ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-red-500/20 text-red-300 border-red-500/40"}`}>
                              <Sparkles className="w-3 h-3 mr-1" /> {verdictLabel} · {forecast.yesPct}%
                            </Badge>
                          </div>

                          {forecast.summary && (
                            <p className="text-base text-foreground/90 leading-relaxed border-l-2 border-primary/40 pl-4">
                              {forecast.summary}
                            </p>
                          )}

                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-emerald-400 font-bold">{t("oracle.yes")} — {forecast.yesPct}%</span>
                                <span className="text-muted-foreground">{forecast.yesAgents.toLocaleString()} {t("oracle.agents")}</span>
                              </div>
                              <div className="h-5 rounded-full bg-muted/30 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${forecast.yesPct}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-red-400 font-bold">{t("oracle.no")} — {forecast.noPct}%</span>
                                <span className="text-muted-foreground">{forecast.noAgents.toLocaleString()} {t("oracle.agents")}</span>
                              </div>
                              <div className="h-5 rounded-full bg-muted/30 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${forecast.noPct}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400" />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                            <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-400" /> {forecast.stakes.yes.toLocaleString()} {t("oracle.stakedOn")} {t("oracle.yes")}</span>
                            <span className="flex items-center gap-1"><TrendingDown className="w-4 h-4 text-red-400" /> {forecast.stakes.no.toLocaleString()} {t("oracle.stakedOn")} {t("oracle.no")}</span>
                            {forecast.timeframe && (
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-primary" /> {forecast.timeframe}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* ARGUMENTS FOR / AGAINST */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-emerald-500/5 border-emerald-500/20">
                          <CardContent className="p-5">
                            <h4 className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
                              <ThumbsUp className="w-4 h-4" /> {t("oracle.argumentsFor") || "Arguments for YES"}
                            </h4>
                            <ul className="space-y-2">
                              {forecast.argumentsFor.length === 0 && (
                                <li className="text-xs text-muted-foreground italic">—</li>
                              )}
                              {forecast.argumentsFor.map((a, i) => (
                                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                  <span className="text-emerald-400 shrink-0">▸</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                        <Card className="bg-red-500/5 border-red-500/20">
                          <CardContent className="p-5">
                            <h4 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2">
                              <ThumbsDown className="w-4 h-4" /> {t("oracle.argumentsAgainst") || "Arguments for NO"}
                            </h4>
                            <ul className="space-y-2">
                              {forecast.argumentsAgainst.length === 0 && (
                                <li className="text-xs text-muted-foreground italic">—</li>
                              )}
                              {forecast.argumentsAgainst.map((a, i) => (
                                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                  <span className="text-red-400 shrink-0">▸</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      {/* TIMELINE */}
                      {forecast.timeline.length > 0 && (
                        <Card className="bg-card/60 backdrop-blur border-border/50">
                          <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-primary" /> {t("oracle.timelineTitle") || "Timeline & key signals"}
                            </h3>
                            <ol className="relative border-l border-border/50 ml-2 space-y-4">
                              {forecast.timeline.map((step, i) => (
                                <li key={i} className="ml-4">
                                  <span className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                                  <div className="text-xs uppercase tracking-wider text-primary font-bold mb-0.5">{step.when}</div>
                                  <div className="text-sm text-foreground/90">{step.event}</div>
                                </li>
                              ))}
                            </ol>
                          </CardContent>
                        </Card>
                      )}

                      {/* RISKS */}
                      {forecast.risks.length > 0 && (
                        <Card className="bg-amber-500/5 border-amber-500/20">
                          <CardContent className="p-5">
                            <h4 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> {t("oracle.risksTitle") || "Risks & black swans"}
                            </h4>
                            <ul className="space-y-2">
                              {forecast.risks.map((risk, i) => (
                                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                  <span className="text-amber-400 shrink-0">⚠</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* FACTIONS */}
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-4">{t("oracle.factionBreakdown")}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {forecast.factions.map((f) => (
                            <motion.div key={f.key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
                              <Card className="bg-card/60 backdrop-blur border-border/50 hover:border-primary/30 transition-all">
                                <CardContent className="p-5">
                                  <div className="flex items-center justify-between mb-3 gap-2">
                                    <span className="font-bold text-foreground text-sm truncate">{t(`oracle.${f.key}`) || f.name}</span>
                                    <Badge variant={f.side === "YES" ? "default" : "destructive"} className="text-xs shrink-0">
                                      {f.pct}% {f.side === "YES" ? t("oracle.yes") : t("oracle.no")}
                                    </Badge>
                                  </div>
                                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden mb-3">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${FACTION_STYLES[f.key] || "from-slate-500 to-slate-400"}`} style={{ width: `${f.pct}%` }} />
                                  </div>
                                  <p className="text-xs text-muted-foreground italic">"{f.text}"</p>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* CONFIDENCE */}
                      <Card className="bg-card/60 backdrop-blur border-border/50">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" /> {t("oracle.confidenceAnalysis")}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 text-center">
                              <div className="text-3xl font-black text-emerald-400 mb-1">{forecast.confidence}%</div>
                              <div className="text-xs text-muted-foreground">{t("oracle.confidenceLabel") || "Council confidence"}</div>
                            </div>
                            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 text-center">
                              <div className="text-3xl font-black text-primary mb-1">{forecast.stakes.total.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">$MEEET {t("oracle.stakedTotal") || "at stake"}</div>
                            </div>
                            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 text-center">
                              <div className="text-3xl font-black text-amber-400 mb-1">{forecast.dissents}</div>
                              <div className="text-xs text-muted-foreground">{t("oracle.dissents")}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Share */}
                      <div className="flex flex-wrap justify-center gap-3">
                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`MEEET Oracle: ${question} — ${forecast.yesPct}% ${verdictLabel} from ${forecast.totalAgents.toLocaleString()} AI agents`)}&url=${encodeURIComponent("https://meeet.world/oracle")}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="gap-2 border-border/50"><Twitter className="w-4 h-4" /> {t("oracle.shareOnX")}</Button>
                        </a>
                        <a href={`https://t.me/share/url?url=${encodeURIComponent("https://meeet.world/oracle")}&text=${encodeURIComponent(`MEEET Oracle: ${question} — ${forecast.yesPct}% ${verdictLabel}`)}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="gap-2 border-border/50"><Send className="w-4 h-4" /> {t("oracle.shareOnTelegram")}</Button>
                        </a>
                        <Button variant="outline" className="gap-2 border-border/50" onClick={copyLink}>
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? t("oracle.copied") : t("oracle.copyLink")}
                        </Button>
                      </div>

                      {/* User Vote */}
                      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                        <CardContent className="p-6 text-center space-y-4">
                          <h3 className="text-xl font-bold text-foreground">{t("oracle.yourPrediction")}</h3>
                          <p className="text-muted-foreground">{t("oracle.doYouAgree")}</p>
                          <div className="flex justify-center gap-4">
                            <Button
                              onClick={() => { setUserVote("YES"); toast({ title: t("oracle.votedYes") as string }); }}
                              className={`px-8 py-3 text-lg font-bold ${userVote === "YES" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400"}`}
                            >
                              {t("oracle.yes")}
                            </Button>
                            <Button
                              onClick={() => { setUserVote("NO"); toast({ title: t("oracle.votedNo") as string }); }}
                              className={`px-8 py-3 text-lg font-bold ${userVote === "NO" ? "bg-red-500 hover:bg-red-600" : "bg-red-500/20 hover:bg-red-500/40 text-red-400"}`}
                            >
                              {t("oracle.no")}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{t("oracle.voteToEarn")}</p>
                        </CardContent>
                      </Card>

                      {/* CTA */}
                      <div className="text-center space-y-3 py-4">
                        <p className="text-muted-foreground">{t("oracle.wantDeeper")}</p>
                        <div className="flex justify-center gap-3 flex-wrap">
                          <a href="https://t.me/meeetworld_bot" target="_blank" rel="noopener noreferrer">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2">
                              <Bot className="w-4 h-4" /> {t("oracle.createAgent")}
                            </Button>
                          </a>
                          <Link to="/developer">
                            <Button variant="outline" className="border-border/50 gap-2">{t("oracle.viewApiDocs")}</Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* TRENDING */}
          <section className="px-4 py-16">
            <div className="max-w-5xl mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">{t("oracle.trendingPredictions")}</h2>
                <p className="text-muted-foreground text-center mb-8">{r(t("oracle.liveConsensus") as string, { count: agentCount })}</p>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TREND_KEYS.map((key, i) => {
                  const td = TREND_DATA[i];
                  const q = t(`oracle.${key}`) as string;
                  return (
                    <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                      <Card className="bg-card/60 backdrop-blur border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                        onClick={() => {
                          setQuestion(q);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                          setTimeout(() => handleAsk(), 350);
                        }}>
                        <CardContent className="p-5">
                          <p className="text-sm font-medium text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">{q}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-muted/30 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${td.pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-emerald-400">{td.pct}% {t("oracle.yes")}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{td.votes.toLocaleString()} {t("oracle.votes")}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* STATS BAR */}
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur p-6 flex flex-col sm:flex-row items-center justify-around gap-6 text-center">
                <div>
                  <div className="text-2xl font-black text-foreground">{(oracleStats?.predictions ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{t("oracle.predictionsMade")}</div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-border/50" />
                <div>
                  <div className="text-2xl font-black text-emerald-400">N/A</div>
                  <div className="text-xs text-muted-foreground">{t("oracle.accuracyResolved")}</div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-border/50" />
                <div>
                  <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1"><Flame className="w-5 h-5" /> {(tokenStats?.totalBurned ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{t("oracle.meeetBurned")}</div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Oracle;
