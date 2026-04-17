import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { AGENT_CLASSES } from "@/data/agent-classes";
import { useLanguage } from "@/i18n/LanguageContext";

/* ── types ── */
type Phase = "idle" | "selecting" | "analyzing" | "discussing" | "consensus";
type QuestionType = "yes_no" | "timing" | "open";

interface CouncilAgent {
  id: string;
  name: string;
  agentClass: string;
  reputation: number;
  answer: string;
  leansYes: boolean;
}

interface RoundHistory {
  question: string;
  summary: string;
  responses: { name: string; class: string; leansYes: boolean; answer: string }[];
}

/* ── response bank ── */
const RESPONSES: Record<string, { yes: string[]; no: string[] }> = {
  crypto: {
    yes: [
      "Based on current adoption curves and institutional interest, this seems highly probable. The market dynamics strongly support this trajectory.",
      "On-chain metrics and growing developer activity suggest a strong bullish case. I assign over 70% probability to this outcome.",
      "Historical cycles combined with macro liquidity trends point toward yes. The fundamentals are stronger than ever before.",
    ],
    no: [
      "Regulatory uncertainty makes this timeline aggressive. I'd estimate 30% probability at best given current headwinds.",
      "Market saturation and competition from CBDCs create significant downside risk. The path forward is far from guaranteed.",
      "Volatility patterns suggest we're in a distribution phase. I'd recommend caution on overly optimistic projections.",
    ],
  },
  health: {
    yes: [
      "Recent breakthroughs in mRNA and CRISPR technology make this increasingly feasible. The science is advancing exponentially.",
      "Clinical trial data from 2025-2026 shows unprecedented success rates. We're on the cusp of a medical revolution.",
      "AI-driven drug discovery has compressed timelines dramatically. What took decades now takes years.",
    ],
    no: [
      "Biological complexity is consistently underestimated. Regulatory hurdles alone add 5-10 years to any optimistic timeline.",
      "Funding gaps and reproducibility crises in research slow progress. The timeline is far more uncertain than headlines suggest.",
      "Economic incentives in pharma don't always align with breakthrough cures. Structural barriers remain formidable.",
    ],
  },
  energy: {
    yes: [
      "Cost curves for renewables are declining faster than any model predicted. Grid parity has been achieved in most markets.",
      "Engineering milestones in fusion and next-gen solar make the energy transition not just possible but inevitable.",
      "Policy momentum and private investment are creating an irreversible shift. The economics now favor clean energy.",
    ],
    no: [
      "Intermittency and storage challenges remain unsolved at scale. Grid infrastructure requires decades of investment.",
      "Geopolitical dependencies on rare earth minerals create new vulnerabilities. The transition has hidden costs.",
      "Base load demand and industrial processes still require fossil fuel density. A full replacement is technically premature.",
    ],
  },
  space: {
    yes: [
      "Reusable rocket economics and private sector competition are accelerating timelines beyond government projections.",
      "In-space manufacturing and resource utilization research is maturing rapidly. The infrastructure for expansion is being built now.",
      "Multi-planetary ambitions are driving unprecedented collaboration between agencies and private companies worldwide.",
    ],
    no: [
      "Radiation exposure and life support challenges remain unsolved for long-duration missions. Biology is the bottleneck.",
      "The economics of space colonization don't close without breakthroughs in propulsion. Current tech is insufficient.",
      "Political will and sustained funding are unreliable over the timescales required. History shows programs get cut.",
    ],
  },
  tech: {
    yes: [
      "Scaling laws continue to hold and architectural innovations are compounding. The trajectory toward AGI is steepening.",
      "Benchmark performance and emergent capabilities suggest we're closer than mainstream estimates indicate.",
      "Integration of AI into economic systems is creating feedback loops that accelerate capability development.",
    ],
    no: [
      "Current architectures have fundamental limitations in reasoning and world-modeling. We need paradigm shifts, not just scale.",
      "Alignment and safety concerns may deliberately slow deployment. Responsible development means longer timelines.",
      "The gap between narrow AI success and general intelligence is vastly larger than benchmark improvements suggest.",
    ],
  },
  general: {
    yes: [
      "Analyzing historical precedents and current trajectories, the evidence leans toward a positive outcome here.",
      "Multiple converging factors support this thesis. The probability is higher than conventional wisdom suggests.",
      "Cross-domain analysis of available data points toward a favorable resolution within the stated timeframe.",
    ],
    no: [
      "Complexity and second-order effects are often underestimated. I'd assign lower confidence to optimistic projections.",
      "Historical base rates for transformative changes suggest caution. Most ambitious timelines prove overly optimistic.",
      "Systemic risks and unknown unknowns make confident predictions unreliable. The uncertainty band is very wide.",
    ],
  },
};

const PLACEHOLDERS = [
  "Will Bitcoin reach $200K by end of 2026?",
  "Can AI cure cancer within 10 years?",
  "Is nuclear fusion viable by 2035?",
  "Which country will lead AI regulation?",
  "Will Solana overtake Ethereum?",
  "Will AGI arrive before 2030?",
  "Can renewable energy fully replace fossil fuels?",
];

const CLASS_COLORS: Record<string, string> = {
  warrior: "border-red-500/60 shadow-red-500/20",
  trader: "border-emerald-500/60 shadow-emerald-500/20",
  oracle: "border-sky-500/60 shadow-sky-500/20",
  diplomat: "border-amber-500/60 shadow-amber-500/20",
  miner: "border-green-500/60 shadow-green-500/20",
  banker: "border-purple-500/60 shadow-purple-500/20",
};

const CLASS_DOT_COLORS: Record<string, string> = {
  warrior: "bg-red-500",
  trader: "bg-emerald-500",
  oracle: "bg-sky-500",
  diplomat: "bg-amber-500",
  miner: "bg-green-500",
  banker: "bg-purple-500",
};

const CLASS_BADGE_COLORS: Record<string, string> = {
  warrior: "bg-red-500/15 text-red-400",
  trader: "bg-emerald-500/15 text-emerald-400",
  oracle: "bg-sky-500/15 text-sky-400",
  diplomat: "bg-amber-500/15 text-amber-400",
  miner: "bg-green-500/15 text-green-400",
  banker: "bg-purple-500/15 text-purple-400",
};

function detectCategory(q: string): string {
  const lower = q.toLowerCase();
  if (/bitcoin|crypto|token|solana|defi|ethereum|blockchain/.test(lower)) return "crypto";
  if (/cancer|health|medicine|drug|disease|pharma|cure/.test(lower)) return "health";
  if (/climate|energy|solar|nuclear|fusion|renewable|fossil/.test(lower)) return "energy";
  if (/space|mars|rocket|nasa|moon|orbit/.test(lower)) return "space";
  if (/\bai\b|model|gpt|robot|automation|jobs|agi|artificial/.test(lower)) return "tech";
  return "general";
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/* ── Typewriter hook ── */
function useTypewriter(text: string, speed = 25, active = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(""); setDone(false); return; }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, active]);

  return { displayed, done };
}

/* ── Agent Card ── */
const AgentCard = ({ agent, index, activeIndex }: { agent: CouncilAgent; index: number; activeIndex: number }) => {
  const isActive = index === activeIndex;
  const isPast = index < activeIndex;
  const { displayed, done } = useTypewriter(agent.answer, 25, isPast || isActive);
  const cls = AGENT_CLASSES[agent.agentClass];
  const icon = cls?.icon ?? "🤖";
  const name = cls?.name ?? agent.agentClass;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.08 }}
      className={`rounded-xl bg-black/60 backdrop-blur-md border p-4 transition-all duration-300 ${
        isActive
          ? `${CLASS_COLORS[agent.agentClass] || "border-primary/60"} shadow-lg`
          : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{agent.name}</div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CLASS_BADGE_COLORS[agent.agentClass] || "bg-muted text-muted-foreground"}`}>
              {name}
            </span>
            <span className="text-[10px] text-muted-foreground">Rep {agent.reputation}</span>
          </div>
        </div>
        {(isPast || done) && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${agent.leansYes ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
            {agent.leansYes ? "YES" : "NO"}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed min-h-[3rem]">
        {isPast || isActive ? displayed : ""}
        {isActive && !done && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
      </p>
    </motion.div>
  );
};

/* ── Main Component ── */
export default function AINationCouncil() {
  const { t, lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [council, setCouncil] = useState<CouncilAgent[]>([]);
  const [activeAgent, setActiveAgent] = useState(-1);
  const [_consensusPct, setConsensusPct] = useState(0);
  const [questionType, setQuestionType] = useState<QuestionType>("open");
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [followUp, setFollowUp] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Rotate placeholder
  useEffect(() => {
    if (phase !== "idle") return;
    const iv = setInterval(() => setPlaceholderIdx(p => (p + 1) % PLACEHOLDERS.length), 5000);
    return () => clearInterval(iv);
  }, [phase]);

  // Fetch agents pool
  const { data: agentsPool } = useQuery({
    queryKey: ["council-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agents_public")
        .select("id, name, class, reputation")
        .gte("reputation", 50)
        .limit(50);
      return data || [];
    },
    staleTime: 300000,
  });

  // Fallback when AI is unavailable
  const fallbackResponses = useCallback((picked: any[]) => {
    const cat = detectCategory(question);
    const bank = RESPONSES[cat] || RESPONSES.general;
    const yesCount = 3 + Math.floor(Math.random() * 3); // 3-5 (more balanced)
    const filled: CouncilAgent[] = picked.map((a, i) => {
      const leansYes = i < yesCount;
      const pool = leansYes ? bank.yes : bank.no;
      return {
        id: a.id,
        name: a.name,
        agentClass: (a as any).class || "researcher",
        reputation: (a as any).reputation ?? 100,
        answer: pool[Math.floor(Math.random() * pool.length)],
        leansYes,
      };
    });
    for (let i = filled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filled[i], filled[j]] = [filled[j], filled[i]];
    }
    setCouncil(filled);
    setPhase("discussing");
    setActiveAgent(0);
  }, [question]);

  const startCouncil = useCallback(async (opts?: { followUp?: boolean; followUpQuestion?: string }) => {
    const isFollowUp = !!opts?.followUp;
    const currentQuestion = isFollowUp ? (opts?.followUpQuestion || "").trim() : question.trim();
    if (!currentQuestion) return;
    if (!isFollowUp && !agentsPool?.length) return;

    let picked: any[];

    if (isFollowUp && council.length > 0) {
      // Reuse the same council for continuity
      picked = council.map(a => ({
        id: a.id,
        name: a.name,
        class: a.agentClass,
        reputation: a.reputation,
      }));
      // Push previous round into history before resetting answers
      setHistory(prev => [
        ...prev,
        {
          question,
          summary: aiSummary,
          responses: council.map(a => ({
            name: a.name,
            class: a.agentClass,
            leansYes: a.leansYes,
            answer: a.answer,
          })),
        },
      ]);
      setQuestion(currentQuestion);
      setCouncil(picked.map(a => ({
        id: a.id,
        name: a.name,
        agentClass: a.class || "researcher",
        reputation: a.reputation ?? 100,
        answer: "",
        leansYes: false,
      })));
    } else {
      // Pick 7 agents with class diversity
      const byClass = new Map<string, typeof agentsPool>();
      agentsPool!.forEach(a => {
        const key = (a as any).class || "unknown";
        const arr = byClass.get(key) || [];
        arr.push(a);
        byClass.set(key, arr);
      });

      const selected: typeof agentsPool = [];
      const classes = Array.from(byClass.keys());
      for (const cls of classes) {
        if (selected.length >= 7) break;
        const pool = byClass.get(cls)!;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        selected.push(pick);
      }
      const remaining = agentsPool!.filter(a => !selected.some(s => s.id === a.id));
      while (selected.length < 7 && remaining.length > 0) {
        const idx = Math.floor(Math.random() * remaining.length);
        selected.push(remaining.splice(idx, 1)[0]);
      }

      picked = selected.slice(0, 7);
      setCouncil(picked.map(a => ({
        id: a.id,
        name: a.name,
        agentClass: (a as any).class || "researcher",
        reputation: (a as any).reputation ?? 100,
        answer: "",
        leansYes: false,
      })));
    }

    setActiveAgent(-1);
    setConsensusPct(0);
    setAiSummary("");
    setAiError("");
    setPhase("selecting");

    // Snapshot history at this moment for the request
    const historyForRequest = isFollowUp
      ? [
          ...history,
          {
            question,
            summary: aiSummary,
            responses: council.map(a => ({
              name: a.name,
              class: a.agentClass,
              leansYes: a.leansYes,
              answer: a.answer,
            })),
          },
        ]
      : [];

    timerRef.current = setTimeout(async () => {
      setPhase("analyzing");
      try {
        const { data, error } = await supabase.functions.invoke("council-analyze", {
          body: {
            question: currentQuestion,
            language: lang,
            agents: picked.map((a: any) => ({
              name: a.name,
              class: (a as any).class || a.agentClass || "researcher",
              reputation: (a as any).reputation ?? 100,
            })),
            history: historyForRequest,
          },
        });
        if (error) throw error;
        if (data?.error === "rate_limited") {
          setAiError("Слишком много запросов. Попробуйте через минуту.");
          fallbackResponses(picked);
          return;
        }
        if (data?.error === "credits_exhausted") {
          setAiError("AI-кредиты исчерпаны. Используется резервный анализ.");
          fallbackResponses(picked);
          return;
        }

        const responses = data?.responses || [];
        const filled: CouncilAgent[] = picked.map((a: any, i: number) => {
          const r = responses[i] || {};
          return {
            id: a.id,
            name: a.name,
            agentClass: (a as any).class || a.agentClass || "researcher",
            reputation: (a as any).reputation ?? 100,
            answer: r.answer || "Анализирую...",
            leansYes: !!r.leansYes,
          };
        });
        if (!isFollowUp) {
          for (let i = filled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filled[i], filled[j]] = [filled[j], filled[i]];
          }
        }
        setCouncil(filled);
        setQuestionType((data?.question_type as QuestionType) || "open");
        setAiSummary(data?.summary || "");
        setPhase("discussing");
        setActiveAgent(0);
      } catch (e: any) {
        console.error("Council AI error:", e);
        setAiError("Не удалось получить анализ. Используется резервный режим.");
        fallbackResponses(picked);
      }
    }, 1500);
  }, [question, agentsPool, lang, fallbackResponses, council, history, aiSummary]);

  // Sequential agent reveal
  useEffect(() => {
    if (phase !== "discussing" || activeAgent < 0) return;

    const avgChars = council[activeAgent]?.answer.length || 80;
    const typeDuration = avgChars * 22 + 600;

    if (activeAgent < council.length - 1) {
      timerRef.current = setTimeout(() => setActiveAgent(a => a + 1), typeDuration);
    } else {
      timerRef.current = setTimeout(() => {
        const yesC = council.filter(a => a.leansYes).length;
        setConsensusPct(Math.round((yesC / council.length) * 100));
        setPhase("consensus");
      }, typeDuration);
    }

    return () => clearTimeout(timerRef.current);
  }, [phase, activeAgent, council]);

  const reset = () => {
    clearTimeout(timerRef.current);
    setPhase("idle");
    setQuestion("");
    setCouncil([]);
    setActiveAgent(-1);
    setConsensusPct(0);
    setAiSummary("");
    setAiError("");
    setHistory([]);
    setFollowUp("");
  };

  const handleFollowUp = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = followUp.trim();
    if (!q) return;
    setFollowUp("");
    startCouncil({ followUp: true, followUpQuestion: q });
  };

  const yesCount = council.filter(a => a.leansYes).length;
  const noCount = council.length - yesCount;
  // Consensus = % of agents agreeing with majority position (not always YES)
  const majorityCount = Math.max(yesCount, noCount);
  const computedPct = council.length > 0 ? Math.round((majorityCount / council.length) * 100) : 0;
  const majorityIsYes = yesCount >= noCount;

  return (
    <section className="relative py-16 md:py-24 px-4 overflow-hidden">
      {/* bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-purple-950/20 to-black/40 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ══ IDLE ══ */}
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">🏛️ {t("council.title")}</h2>
                <p className="text-muted-foreground">
                  {agentsPool?.length ? `${agentsPool.length}+ ${t("council.agentsReady")}` : t("council.agentsReady")}
                </p>
              </div>

              <div className="relative max-w-2xl mx-auto">
                <form onSubmit={e => { e.preventDefault(); startCouncil(); }} className="relative rounded-xl border border-purple-500/40 bg-black/60 backdrop-blur-md shadow-lg shadow-purple-500/10 focus-within:border-purple-500/70 focus-within:shadow-purple-500/20 transition-all">
                  <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder={PLACEHOLDERS[placeholderIdx]}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 px-5 py-4 pr-14 text-base outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || !agentsPool?.length}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 flex items-center justify-center transition-colors"
                  >
                    <span className="text-lg">🔮</span>
                  </button>
                </form>
                {agentsPool === undefined && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">{t("council.loading")}</p>
                )}
                {agentsPool !== undefined && agentsPool.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">{t("council.noAgents")}</p>
                )}
              </div>

              {/* sleeping dots */}
              <div className="flex items-center justify-center gap-3">
                {Array.from({ length: 7 }).map((_, i) => {
                  const classes = ["warrior", "trader", "oracle", "diplomat", "miner", "banker", "oracle"];
                  return (
                    <motion.div
                      key={i}
                      className={`w-3 h-3 rounded-full ${CLASS_DOT_COLORS[classes[i]]} opacity-60`}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ══ SELECTING ══ */}
          {phase === "selecting" && (
            <motion.div key="selecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-8">
              <div className="text-sm text-muted-foreground bg-black/40 rounded-lg px-4 py-2 inline-block">
                "{question}"
              </div>
              <div className="space-y-4">
                <motion.p
                  className="text-lg font-semibold text-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ⚡ {t("council.assembling")}
                </motion.p>
                <div className="flex items-center justify-center gap-4">
                  {council.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.1 }}
                      className={`w-12 h-12 rounded-full border-2 ${CLASS_COLORS[a.agentClass] || "border-primary/40"} bg-black/60 flex items-center justify-center text-xl`}
                    >
                      {AGENT_CLASSES[a.agentClass]?.icon ?? "🤖"}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ ANALYZING (AI thinking) ══ */}
          {phase === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
              <div className="text-sm text-muted-foreground bg-black/40 rounded-lg px-4 py-2 inline-block">
                "{question}"
              </div>
              <motion.p
                className="text-lg font-semibold text-primary"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                🧠 Совет анализирует вопрос с разных позиций…
              </motion.p>
              <div className="flex items-center justify-center gap-2">
                {council.map((a, i) => (
                  <motion.div
                    key={a.id}
                    className={`w-10 h-10 rounded-full border-2 ${CLASS_COLORS[a.agentClass] || "border-primary/40"} bg-black/60 flex items-center justify-center text-base`}
                    animate={{ scale: [1, 1.1, 1], borderColor: ["rgba(168,85,247,0.4)", "rgba(168,85,247,0.9)", "rgba(168,85,247,0.4)"] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                  >
                    {AGENT_CLASSES[a.agentClass]?.icon ?? "🤖"}
                  </motion.div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Это занимает 3–8 секунд. Каждый агент формирует независимое мнение.</p>
            </motion.div>
          )}

          {/* ══ DISCUSSING ══ */}
          {phase === "discussing" && (
            <motion.div key="discussing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground bg-black/40 rounded-lg px-4 py-2 inline-block mb-2">
                  "{question}"
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeAgent + 1} / {council.length} {t("council.responding")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {council.map((a, i) => (
                  i <= activeAgent && <AgentCard key={a.id} agent={a} index={i} activeIndex={activeAgent} />
                ))}
              </div>

              {/* progress */}
              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{t("council.progress")}</span>
                  <span>{Math.round(((activeAgent + 1) / council.length) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-violet-500"
                    animate={{ width: `${((activeAgent + 1) / council.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ CONSENSUS ══ */}
          {phase === "consensus" && (
            <motion.div key="consensus" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 24 }} className="space-y-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground bg-black/40 rounded-lg px-4 py-2 inline-block mb-4">
                  "{question}"
                </div>
              </div>

              {/* mini agent row */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {council.map(a => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border ${
                      a.leansYes ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    <span>{AGENT_CLASSES[a.agentClass]?.icon ?? "🤖"}</span>
                    <span>{a.name.slice(0, 10)}</span>
                    <span>{a.leansYes ? "YES" : "NO"}</span>
                  </div>
                ))}
              </div>

              {/* verdict */}
              <div className="rounded-xl border border-purple-500/30 bg-black/60 backdrop-blur-md p-6 text-center space-y-4">
                <h3 className="text-lg font-bold text-foreground tracking-wide">🏛️ {t("council.verdict")}</h3>

                {questionType === "timing" && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    ⏱️ Вопрос о сроках — YES = «скоро/в обозримом будущем», NO = «не скоро / маловероятно»
                  </div>
                )}
                {questionType === "open" && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold">
                    💭 Открытый вопрос — YES = «оптимистичный сценарий», NO = «скептический»
                  </div>
                )}

                <div className="max-w-sm mx-auto">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-bold">YES {yesCount}/{council.length}</span>
                    <span className="text-red-400 font-bold">NO {noCount}/{council.length}</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${majorityIsYes ? "bg-red-500/30" : "bg-emerald-500/30"}`}>
                    <motion.div
                      className={`h-full rounded-full ${
                        majorityIsYes
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : "bg-gradient-to-r from-red-500 to-red-400"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${computedPct}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                  <AnimatedPercent target={computedPct} majorityIsYes={majorityIsYes} />
                </div>

                {aiSummary ? (
                  <div className="max-w-xl mx-auto bg-black/40 border border-white/10 rounded-lg p-4 text-left">
                    <p className="text-xs uppercase tracking-wider text-primary mb-2 font-bold">📋 Аналитический вывод совета</p>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{aiSummary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {computedPct >= 70
                      ? majorityIsYes ? t("council.strongConsensus") : "Большинство склоняется к «нет». Совет видит серьёзные препятствия."
                      : computedPct >= 55
                      ? majorityIsYes ? t("council.cautiousConsensus") : "Совет осторожно скептичен — преобладает мнение «нет», но есть оптимисты."
                      : t("council.dividedConsensus")}
                  </p>
                )}

                {aiError && (
                  <p className="text-xs text-amber-400/80">{aiError}</p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link to="/oracle">
                    <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0">
                      🎯 {t("council.betOnOracle")}
                    </Button>
                  </Link>
                  <Link to="/deploy">
                    <Button variant="outline" className="border-border hover:border-primary/40">
                      🤖 {t("council.deployAgent")}
                    </Button>
                  </Link>
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => {
                    navigator.share?.({ title: t("council.title"), text: `${t("council.shareText")} "${question}" — ${yesCount}/${council.length} YES!`, url: "https://meeet.world" }).catch(() => {});
                  }}>
                    📤 {t("council.share")}
                  </Button>
                </div>

                {/* ── Follow-up: deepen the conversation ── */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>💬</span>
                    <span>Углубитесь в тему — задайте уточняющий вопрос тому же совету</span>
                    {history.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-semibold">
                        Раунд {history.length + 1}
                      </span>
                    )}
                  </div>
                  <form onSubmit={handleFollowUp} className="relative max-w-2xl mx-auto">
                    <div className="relative rounded-xl border border-purple-500/40 bg-black/60 backdrop-blur-md focus-within:border-purple-500/70 transition-all">
                      <input
                        type="text"
                        value={followUp}
                        onChange={e => setFollowUp(e.target.value)}
                        placeholder="А что если…? Уточните, углубите, оспорьте…"
                        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 px-4 py-3 pr-12 text-sm outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!followUp.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 flex items-center justify-center transition-colors"
                        aria-label="Отправить уточняющий вопрос"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </form>
                  {history.length > 0 && (
                    <details className="max-w-2xl mx-auto text-left">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        📜 История диалога ({history.length} {history.length === 1 ? "раунд" : "раундов"})
                      </summary>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                        {history.map((h, idx) => (
                          <div key={idx} className="text-xs bg-black/30 rounded-lg p-2 border border-white/5">
                            <div className="text-purple-300 font-semibold mb-1">Раунд {idx + 1}: "{h.question}"</div>
                            {h.summary && <div className="text-muted-foreground italic">{h.summary}</div>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                <button onClick={reset} className="text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors">
                  {t("council.tryAnother")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ── Animated Percent Counter ── */
function AnimatedPercent({ target, majorityIsYes = true }: { target: number; majorityIsYes?: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setVal(Math.round(target * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const { t } = useLanguage();
  return (
    <div className="text-3xl font-bold mt-2">
      <span className={majorityIsYes ? "text-emerald-400" : "text-red-400"}>{val}%</span>{" "}
      <span className="text-foreground">{t("council.consensus")}</span>{" "}
      <span className={`text-base ${majorityIsYes ? "text-emerald-400" : "text-red-400"}`}>
        {majorityIsYes ? "(YES)" : "(NO)"}
      </span>
    </div>
  );
}
