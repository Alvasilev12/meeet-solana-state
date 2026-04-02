import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Brain, Network, Play, FileText, MessageSquare,
  Rocket, TrendingUp, Vote, BarChart3, Users,
  ArrowRight, Zap, Activity, Target,
} from "lucide-react";
import KnowledgeGraphExplorer from "@/components/simulation/KnowledgeGraphExplorer";
import AgentDialogueInterface from "@/components/simulation/AgentDialogueInterface";

const STEPS = [
  { icon: Network, label: "Knowledge Graph", desc: "Construct multi-source knowledge graph from on-chain & off-chain data" },
  { icon: Brain, label: "Environment Setup", desc: "Configure agent roles, parameters, and simulation boundaries" },
  { icon: Play, label: "Parallel Simulation", desc: "Run thousands of parallel agent interactions in sandboxed worlds" },
  { icon: FileText, label: "Report Generation", desc: "AI synthesizes outcomes into actionable prediction reports" },
  { icon: MessageSquare, label: "Interactive Dialogue", desc: "Ask follow-up questions and drill into simulation results" },
];

const SIMULATIONS = [
  {
    icon: Rocket,
    title: "Token Launch Prediction",
    desc: "Simulating $MEEET launch dynamics with 200 trader agents across 3 market scenarios.",
    status: "Running" as const,
    progress: 67,
  },
  {
    icon: Vote,
    title: "Governance Vote Forecast",
    desc: "Predicting DAO proposal #7 outcome based on faction alignment and delegate behavior.",
    status: "Completed" as const,
    progress: 100,
  },
  {
    icon: BarChart3,
    title: "Market Dynamics Model",
    desc: "Multi-agent simulation of DEX liquidity shifts under varying volatility regimes.",
    status: "Running" as const,
    progress: 42,
  },
  {
    icon: Users,
    title: "Community Growth Simulation",
    desc: "Modeling organic growth trajectories with referral loops and retention mechanics.",
    status: "Queued" as const,
    progress: 0,
  },
];

const STATUS_STYLES: Record<string, string> = {
  Running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Completed: "bg-primary/20 text-primary border-primary/30",
  Queued: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const STATS = [
  { value: "2,847", label: "Simulations Run", icon: Activity },
  { value: "156", label: "Active Agents", icon: Users },
  { value: "94.2%", label: "Prediction Accuracy", icon: Target },
];

const SimulationLab = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SEOHead
      title="Simulation Lab — MEEET STATE"
      description="Simulation Lab — Parallel World Simulation powered by MiroFish Multi-Agent Prediction Engine. Run AI-driven simulations for token launches, governance, and market dynamics."
      path="/simulation"
    />
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" /> MiroFish Integration
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-black mb-4">
            Parallel World Simulation
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Powered by <span className="text-foreground font-semibold">MiroFish Multi-Agent Prediction Engine</span>. 
            Simulate complex scenarios with autonomous agents before making real decisions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-5 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-display font-black tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* How It Works — Pipeline */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-black mb-8 text-center">How It Works</h2>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-3">
              {STEPS.map((step, i) => (
                <div key={step.label} className="flex flex-col items-center text-center group">
                  <div className="relative z-10 w-16 h-16 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:border-primary/50 transition-colors">
                    <step.icon className="w-7 h-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-display font-bold mb-1">{step.label}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Active Simulations */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-black">Active Simulations</h2>
            <Badge variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              2 Running
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SIMULATIONS.map((sim) => (
              <div
                key={sim.title}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <sim.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-display font-bold truncate">{sim.title}</h3>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_STYLES[sim.status]}`}>
                        {sim.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{sim.desc}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-bold text-foreground">{sim.progress}%</span>
                  </div>
                  <Progress value={sim.progress} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <KnowledgeGraphExplorer />
        <AgentDialogueInterface />

        {/* CTA */}
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-black mb-3">
            Run Your Own Simulation
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
            Deploy autonomous agents into parallel worlds and predict outcomes before they happen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link to="/deploy">
                <Rocket className="w-4 h-4" /> Launch New Simulation
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 px-8" asChild>
              <Link to="/discoveries">
                <FileText className="w-4 h-4" /> View Reports <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  </div>
);

export default SimulationLab;
