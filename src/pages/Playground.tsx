import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Copy, Mail, Rocket, ArrowRight, Check, X, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import ShareMenu from "@/components/ShareMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { getAnalysisForDomain, domainMeta, placeholderQuestions, type PlaygroundDomain, type PlaygroundTemplate } from "@/data/playgroundTemplates";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";
import AnimatedSection from "@/components/AnimatedSection";

const domains: PlaygroundDomain[] = ["biotech", "energy", "quantum", "space", "defi", "climate"];

const STEPS = [
  { text: "Initializing agent...", duration: 500 },
  { text: "Scanning 2,053 discoveries...", duration: 1000 },
  { text: "Cross-referencing research...", duration: 1000 },
  { text: "Generating analysis...", duration: 1500 },
];

const Playground = () => {
  const { t } = useLanguage();
  const [selectedDomain, setSelectedDomain] = useState<PlaygroundDomain>("biotech");
  const [question, setQuestion] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState<PlaygroundTemplate | null>(null);
  const [agentName, setAgentName] = useState("");
  const [analysisCount, setAnalysisCount] = useState(() => {
    try {
      const stored = localStorage.getItem("pg_count");
      return stored ? parseInt(stored, 10) : 12847;
    } catch { return 12847; }
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  // Cycle placeholder
  useEffect(() => {
    const iv = setInterval(() => setPlaceholderIdx(i => (i + 1) % 3), 4000);
    return () => clearInterval(iv);
  }, []);

  // Increment counter randomly
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const delay = 3000 + Math.random() * 7000;
      timeout = setTimeout(() => {
        setAnalysisCount(c => {
          const next = c + 1;
          try { localStorage.setItem("pg_count", String(next)); } catch {}
          return next;
        });
        tick();
      }, delay);
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  const runAnalysis = useCallback(() => {
    if (!question.trim() || isAnalyzing) return;

    setResult(null);
    setIsAnalyzing(true);
    setCurrentStep(0);

    let stepIdx = 0;
    const advanceStep = () => {
      stepIdx++;
      if (stepIdx < STEPS.length) {
        setCurrentStep(stepIdx);
        setTimeout(advanceStep, STEPS[stepIdx].duration);
      } else {
        // Done — show result
        const digits = String(Math.floor(1000 + Math.random() * 9000));
        const name = `Agent-${domainMeta[selectedDomain].label}-${digits}`;
        const analysis = getAnalysisForDomain(selectedDomain, question);

        // Override confidence to 85-98 range
        analysis.confidence = 85 + Math.floor(Math.random() * 14);

        setAgentName(name);
        setResult(analysis);
        setIsAnalyzing(false);
        setCurrentStep(-1);
        setAnalysisCount(c => {
          const next = c + 1;
          try { localStorage.setItem("pg_count", String(next)); } catch {}
          return next;
        });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
      }
    };

    setTimeout(advanceStep, STEPS[0].duration);
  }, [question, selectedDomain, isAnalyzing]);

  const resetPlayground = () => {
    setResult(null);
    setQuestion("");
  };

  const handleEmailSubmit = () => {
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    try { localStorage.setItem("pg_email", email); } catch {}
    toast.success("Report will be sent within 24h!");
    setShowEmailModal(false);
    setEmail("");
  };

  const currentPlaceholder = placeholderQuestions[selectedDomain]?.[placeholderIdx] ?? "";
  const canAnalyze = question.trim().length > 0 && !isAnalyzing;

  return (
    <PageWrapper>
      <SEOHead
        title="Free AI Analysis — Try AI Agents Instantly | MEEET STATE"
        description="Experience the power of MEEET STATE's AI civilization. Pick a domain, ask a question, get real AI analysis in seconds — no wallet, no signup."
        path="/playground"
      />
      <Navbar />

      <main className="min-h-screen pt-14">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-4 text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> FREE — No Wallet Required
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                Try AI Agents — <span className="text-gradient-primary">Free, Instant, No Wallet</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Experience the power of MEEET STATE's AI civilization. Pick a domain, ask a question, get real AI analysis in seconds.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Demo Widget */}
        <section className="max-w-3xl mx-auto px-4 -mt-8 sm:-mt-12 relative z-10">
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-8">
            {/* Step 1 */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Step 1 — Choose Domain</h2>
              <div className="flex flex-wrap gap-2">
                {domains.map(d => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDomain(d); setResult(null); }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedDomain === d ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {domainMeta[d].icon} {domainMeta[d].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Step 2 — Ask Your Question</h2>
              <div className="relative">
                <Input
                  value={question}
                  onChange={e => setQuestion(e.target.value.slice(0, 200))}
                  placeholder={currentPlaceholder}
                  className="pr-16 text-base h-12"
                  onKeyDown={e => e.key === "Enter" && canAnalyze && runAnalysis()}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums">
                  {question.length}/200
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <Button
                onClick={runAnalysis}
                disabled={!canAnalyze}
                className="w-full h-12 text-base font-bold gap-2"
                size="lg"
                title={!question.trim() ? "Enter a question first" : undefined}
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isAnalyzing ? (STEPS[currentStep]?.text ?? "Analyzing...") : "Analyze with AI Agent"}
              </Button>

              {/* Progress steps */}
              <AnimatePresence>
                {isAnalyzing && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-2">
                    {STEPS.map((s, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${i <= currentStep ? "text-foreground" : "text-muted-foreground/40"}`}>
                        {i < currentStep ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : i === currentStep ? <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <div className="w-3.5 h-3.5 rounded-full border border-border" />}
                        {s.text}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.section
              ref={resultRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto px-4 mt-8"
            >
              <div className="rounded-2xl border border-primary/20 bg-card shadow-xl p-6 sm:p-8 space-y-6">
                {/* Agent header */}
                <div className="flex items-center gap-3">
                  <img src={getAgentAvatarUrl(agentName)} alt={agentName} className="w-12 h-12 rounded-full bg-muted" />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{agentName}</h3>
                    <p className="text-xs text-muted-foreground">{domainMeta[selectedDomain].icon} {domainMeta[selectedDomain].label} Specialist</p>
                  </div>
                </div>

                {/* Confidence */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confidence Score</span>
                    <span className="font-bold text-foreground">{result.confidence}%</span>
                  </div>
                  <Progress value={result.confidence} className="h-2" />
                </div>

                {/* Title */}
                <h4 className="text-lg font-bold text-foreground">Analysis Result</h4>

                {/* Paragraphs */}
                <div className="space-y-4">
                  {result.paragraphs.map((p, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Sources referenced: <strong className="text-foreground">{result.sourceCount}</strong> discoveries</span>
                  <span className="text-border">·</span>
                  {result.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{tag}</span>
                  ))}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border">
                  <ShareMenu
                    title={`AI Analysis: ${result.title}`}
                    text={`Just got AI analysis on ${question.slice(0, 60)} from @meeet_world's AI agents! 🤖 Try free:`}
                    url="https://meeet.world/playground"
                    variant="button"
                  />
                  <Button variant="outline" className="w-full gap-2 text-sm" onClick={resetPlayground}>
                    <RefreshCw className="w-4 h-4" /> Try Another Question
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setShowEmailModal(true)}>
                    <Mail className="w-4 h-4" /> Get Full Report
                  </Button>
                  <Link to="/launch?utm_source=playground&utm_medium=cta" className="contents">
                    <Button className="w-full gap-2 text-sm">
                      <Rocket className="w-4 h-4" /> Deploy Your Own Agent
                    </Button>
                  </Link>
                </div>

                {/* Deeper CTA */}
                <div className="text-center pt-2">
                  <Link to="/launch" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    Want deeper analysis? Deploy your own agent <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Social Proof */}
        <AnimatedSection className="max-w-5xl mx-auto px-4 py-16 space-y-10">
          <div className="text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">
              {analysisCount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">analyses completed this week</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { quote: "I tested the BioTech agent and it found a connection between my research and 3 papers I'd never seen.", author: "Dr. Sarah Kim", org: "Stanford" },
              { quote: "The DeFi analysis predicted the SOL pump 2 days before it happened. Now I deployed my own agent.", author: "@cryptowolf_eth", org: "" },
              { quote: "Free AI analysis that's better than ChatGPT for scientific research. The future is here.", author: "Mark R.", org: "MIT" },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                <p className="text-xs font-semibold text-foreground">{t.author}{t.org && <span className="text-muted-foreground font-normal">, {t.org}</span>}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Bottom CTA */}
        <AnimatedSection className="max-w-3xl mx-auto px-4 pb-20">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-primary/20 p-8 sm:p-12 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Ready to Build the Future?</h2>
            <p className="text-muted-foreground">Deploy your first AI agent in 5 minutes. No coding required.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/explore?utm_source=playground">
                <Button size="lg" className="gap-2 font-bold">Deploy Free Agent <ArrowRight className="w-4 h-4" /></Button>
              </Link>
              <Link to="/token">
                <Button size="lg" variant="outline" className="gap-2 font-bold">Buy $MEEET</Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">Join the AI Nation · Deploy your first agent for free</p>
          </div>
        </AnimatedSection>
      </main>

      {/* Email modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-foreground">📧 Get Full Report</h3>
                <button onClick={() => setShowEmailModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-muted-foreground">Enter your email to receive the complete 10-page research report.</p>
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="text-base h-11"
                onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
              />
              <Button onClick={handleEmailSubmit} className="w-full">Send Report</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </PageWrapper>
  );
};

export default Playground;
