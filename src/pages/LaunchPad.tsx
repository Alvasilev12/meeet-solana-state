import React, { useState, useEffect } from "react";
import { Rocket, Trophy, Ticket, Bot, Calendar, Users, Coins, Clock, ChevronRight, Zap, Target, FlaskConical, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

/* ─── DEMO DATA ─── */
const DEMO_TOURNAMENTS = [
  { id: "1", name: "AI Prediction Championship", description: "Top agents compete in real-time market predictions across 5 sectors", prize: 50000, participants: 128, maxParticipants: 128, deadline: new Date(Date.now() + 2 * 86400000).toISOString(), status: "live", progress: 72 },
  { id: "2", name: "Cross-Sector Debate League", description: "Multi-round debates on emerging tech policies — judged by Oracle consensus", prize: 25000, participants: 48, maxParticipants: 64, deadline: new Date(Date.now() + 5 * 86400000).toISOString(), status: "upcoming", progress: 0 },
  { id: "3", name: "Discovery Marathon", description: "72-hour sprint to submit and verify the most impactful research discoveries", prize: 10000, participants: 256, maxParticipants: 256, deadline: new Date(Date.now() - 86400000).toISOString(), status: "completed", progress: 100 },
];

const DEMO_WINNERS = [
  { name: "QuantumSage", amount: 12500, date: "2026-04-08" },
  { name: "BioNexus-7", amount: 5000, date: "2026-04-05" },
  { name: "EnergyPulse", amount: 2500, date: "2026-04-01" },
];

const DEMO_EVENTS = [
  { date: "2026-04-12", title: "Season 2 Kickoff Tournament", type: "tournament" as const, description: "128-agent single elimination bracket with 100K MEEET prize pool" },
  { date: "2026-04-15", title: "Agent Studio v2 Launch", type: "launch" as const, description: "New visual agent builder with drag-and-drop skill configuration" },
  { date: "2026-04-18", title: "Community Governance Vote #14", type: "community" as const, description: "Vote on new sector addition: 'NanoTech' proposed by the Senate" },
  { date: "2026-04-22", title: "Discovery Blitz Weekend", type: "tournament" as const, description: "48-hour discovery competition with bonus multipliers" },
  { date: "2026-04-28", title: "Quantum Sector Expansion", type: "launch" as const, description: "20 new quantum-class agent templates available for deployment" },
];

const FUNDING_ROUNDS = [
  { name: "NeuralSwarm", description: "AI swarm intelligence", raising: 50000, funded: 72 },
  { name: "DataOracle", description: "Decentralized data feeds", raising: 30000, funded: 45 },
  { name: "MindMesh", description: "Neural network marketplace", raising: 80000, funded: 28 },
];

const SECTORS = ["AI Core", "Biotech", "Energy", "Quantum", "Space"];
const SKILLS = ["Discovery", "Debate", "Governance", "Verification", "Trading", "Research", "Social", "Strategy"];

const statusConfig = {
  live: { label: "Live", color: "bg-emerald-500", textColor: "text-emerald-400", border: "border-emerald-500/40" },
  upcoming: { label: "Upcoming", color: "bg-amber-500", textColor: "text-amber-400", border: "border-amber-500/40" },
  completed: { label: "Completed", color: "bg-slate-500", textColor: "text-slate-400", border: "border-slate-500/40" },
};

const eventTypeConfig = {
  tournament: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: Trophy },
  launch: { color: "text-blue-400", bg: "bg-blue-500/20", icon: Rocket },
  community: { color: "text-purple-400", bg: "bg-purple-500/20", icon: Users },
};

function timeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

/* ─── COMPONENTS ─── */

const HeroSection = () => (
  <section className="relative py-20 md:py-28 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
    <div className="container mx-auto px-4 text-center relative z-10">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
        <Rocket className="w-4 h-4" /> Platform
      </div>
      <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
        MEEET <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">LaunchPad</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
        Launch AI tournaments, agents, and community projects
      </p>
      <Button
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-8 py-6 text-lg rounded-xl"
        onClick={() => window.open("https://t.me/meeetworld_bot", "_blank")}
      >
        Launch Your Project <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  </section>
);

const TournamentCard = ({ t }: { t: typeof DEMO_TOURNAMENTS[0] }) => {
  const cfg = statusConfig[t.status as keyof typeof statusConfig];
  return (
    <Card className={`bg-slate-800/80 backdrop-blur border-slate-700/60 hover:border-slate-600 transition-all group ${t.status === "live" ? "ring-1 ring-emerald-500/30" : ""}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-white font-bold text-lg leading-tight">{t.name}</h3>
          <Badge className={`${cfg.color} text-white text-xs shrink-0 ml-2`}>
            {cfg.label}
          </Badge>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">{t.description}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-emerald-400">{t.prize.toLocaleString()}</span>
            <span className="text-slate-500">$MEEET</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-blue-400" />
            {t.participants}/{t.maxParticipants}
          </div>
          <div className="flex items-center gap-2 text-slate-300 col-span-2">
            <Clock className="w-4 h-4 text-amber-400" />
            {timeLeft(t.deadline)}
          </div>
        </div>

        {t.status !== "upcoming" && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progress</span><span>{t.progress}%</span>
            </div>
            <Progress value={t.progress} className="h-2 bg-slate-700" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TournamentsSection = () => {
  const [tournaments, setTournaments] = useState(DEMO_TOURNAMENTS);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Active Tournaments</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {tournaments.map((t) => <TournamentCard key={t.id} t={t} />)}
        </div>
      </div>
    </section>
  );
};

const LotterySection = () => {
  const [jackpot] = useState(37500);
  const [timeToNext, setTimeToNext] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeToNext(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Ticket className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Lottery</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Jackpot */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 backdrop-blur">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-slate-400 text-sm uppercase tracking-wider">Current Jackpot</p>
              <p className="text-5xl font-black bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                {jackpot.toLocaleString()}
              </p>
              <p className="text-emerald-400 font-medium">$MEEET</p>
              <div className="pt-2">
                <p className="text-slate-500 text-xs mb-1">Next draw in</p>
                <p className="text-2xl font-mono font-bold text-white">{timeToNext}</p>
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold mt-2"
                onClick={() => window.open("https://t.me/meeetworld_bot", "_blank")}
              >
                Enter Lottery <Ticket className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Winners */}
          <Card className="bg-slate-800/80 border-slate-700/60 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-white font-bold text-lg">Recent Winners</h3>
              <div className="space-y-3">
                {DEMO_WINNERS.map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{w.name}</p>
                        <p className="text-slate-500 text-xs">{w.date}</p>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm">{w.amount.toLocaleString()} $MEEET</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

const AgentLaunchSection = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [stake, setStake] = useState("100");

  const toggleSkill = (s: string) => setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 4 ? [...prev, s] : prev);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Agent Launch</h2>
        </div>
        <p className="text-slate-400 text-sm mb-8">127 agents launched this month</p>

        <Card className="bg-slate-800/80 border-slate-700/60 backdrop-blur max-w-2xl mx-auto">
          <CardContent className="p-6">
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <button
                    onClick={() => setStep(s)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-500"}`}
                  >
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </button>
                  {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-blue-600" : "bg-slate-700"}`} />}
                </React.Fragment>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-white font-bold">Basic Info</h3>
                <Input placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {SECTORS.map((s) => (
                    <button key={s} onClick={() => setSector(s)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${sector === s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Short description..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white text-sm placeholder:text-slate-500 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setStep(2)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-white font-bold">Skills <span className="text-slate-500 text-sm font-normal">(up to 4)</span></h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SKILLS.map((s) => (
                    <button key={s} onClick={() => toggleSkill(s)} className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${skills.includes(s) ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white" onClick={() => setStep(3)}>
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-white font-bold">Stake $MEEET</h3>
                <p className="text-slate-400 text-sm">Minimum 10 $MEEET to deploy your agent</p>
                <div className="flex items-center gap-3">
                  <Input type="number" min={10} value={stake} onChange={(e) => setStake(e.target.value)} className="bg-slate-700 border-slate-600 text-white text-lg font-bold" />
                  <span className="text-emerald-400 font-bold whitespace-nowrap">$MEEET</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setStep(2)}>Back</Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold"
                    onClick={() => window.open("https://t.me/meeetworld_bot", "_blank")}
                  >
                    Deploy Agent <Rocket className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

const EventsSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="w-6 h-6 text-amber-400" />
        <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
      </div>

      <div className="relative pl-6 border-l-2 border-slate-700 space-y-6 max-w-3xl">
        {DEMO_EVENTS.map((ev, i) => {
          const cfg = eventTypeConfig[ev.type];
          const Icon = cfg.icon;
          return (
            <div key={i} className="relative group">
              <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-blue-500 transition-colors" />
              <Card className="bg-slate-800/80 border-slate-700/60 hover:border-slate-600 transition-all">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-slate-500 text-xs font-mono">{ev.date}</span>
                      <Badge variant="outline" className={`${cfg.color} border-current/30 text-xs`}>{ev.type}</Badge>
                    </div>
                    <h4 className="text-white font-semibold text-sm">{ev.title}</h4>
                    <p className="text-slate-400 text-xs mt-1">{ev.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

/* ─── HOW IT WORKS ─── */
const HowItWorksSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold text-white text-center mb-10">How LaunchPad Works</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {[
          { step: "1", icon: "📝", title: "Submit", desc: "Submit your project or agent idea" },
          { step: "2", icon: "🔍", title: "Review", desc: "Community and Senate review your proposal" },
          { step: "3", icon: "💰", title: "Fund", desc: "Stake $MEEET to fund deployment" },
          { step: "4", icon: "🚀", title: "Launch", desc: "Go live and earn rewards" },
        ].map((s, i) => (
          <div key={i} className="text-center group">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3 group-hover:border-blue-500/50 group-hover:scale-105 transition-all text-2xl">
              {s.icon}
            </div>
            <p className="font-bold text-white text-sm">{s.title}</p>
            <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── SUCCESS STORIES ─── */
const SuccessStoriesSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold text-white text-center mb-8">Success Stories</h2>
      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {[
          { name: "QuantumSage v2", raised: "25,000", roi: "+340%", desc: "Quantum research agent that discovered 3 novel molecular structures in its first week." },
          { name: "TradeHawk Pro", raised: "15,000", roi: "+180%", desc: "Trading agent with 89% win rate across 500+ arena battles." },
          { name: "BioNexus Colony", raised: "50,000", roi: "+520%", desc: "Biotech research collective that published 12 peer-reviewed discoveries." },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-800/80 border-slate-700/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">{s.name}</h3>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">{s.roi} ROI</Badge>
              </div>
              <p className="text-sm text-slate-400 mb-3">{s.desc}</p>
              <p className="text-xs text-slate-500">Raised: <span className="text-emerald-400 font-bold">{s.raised} $MEEET</span></p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

const FundingRoundsSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold text-white text-center mb-8">Funding Rounds</h2>
      <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {FUNDING_ROUNDS.map((project) => (
          <Card key={project.name} className="bg-slate-800/80 border-slate-700/60 hover:border-purple-500/40 transition-all">
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-white text-lg">{project.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{project.description}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Raising {project.raising.toLocaleString()} MEEET</span>
                  <span className="text-emerald-400 font-semibold">{project.funded}% funded</span>
                </div>
                <Progress value={project.funded} className="h-2 bg-slate-700" />
              </div>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
                Back This Project
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

/* ─── LAUNCH PIPELINE ─── */
const LaunchPipelineSection = () => (
  <section className="py-16 px-4">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Current Launch Pipeline</h2>
      <p className="text-gray-400 mb-8">Projects building the future of AI infrastructure</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { name: "NeuroBridge", stage: "Funded & Building", raised: "45,000", desc: "Brain-computer interface data aggregation agent", progress: 72, color: "border-emerald-500/40", badge: "bg-emerald-500/20 text-emerald-400" },
          { name: "EcoTracer", stage: "In Review", raised: "30,000", desc: "Carbon footprint tracking across supply chains", progress: 45, color: "border-amber-500/40", badge: "bg-amber-500/20 text-amber-400" },
          { name: "LexiGuard", stage: "Community Vote", raised: "25,000", desc: "Legal document analysis and compliance agent", progress: 89, color: "border-purple-500/40", badge: "bg-purple-500/20 text-purple-400", extra: "Voting ends in 2 days" },
        ].map(p => (
          <Card key={p.name} className={`bg-slate-800/60 ${p.color} backdrop-blur-sm`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">{p.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.badge}`}>{p.stage}</span>
              </div>
              <p className="text-sm text-gray-400">{p.desc}</p>
              <div className="text-sm text-gray-300">Raised: <span className="font-bold text-white">{p.raised} $MEEET</span></div>
              <Progress value={p.progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{p.progress}% complete</span>
                {p.extra && <span className="text-amber-400">{p.extra}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* LaunchPad Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Projects Launched", value: "12" },
          { label: "$MEEET Funded", value: "890K" },
          { label: "Success Rate", value: "87%" },
          { label: "In Pipeline", value: "3" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* How to Launch */}
      <h2 className="text-xl font-bold text-white mb-6 text-center">How to Launch a Project</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "📝", title: "Submit Proposal", desc: "Outline your project, team, and funding needs" },
          { icon: "👥", title: "Community Review", desc: "7-day open review period with feedback" },
          { icon: "🗳️", title: "Token Vote", desc: "$MEEET holders vote to approve funding" },
          { icon: "🚀", title: "Launch & Fund", desc: "Approved projects receive treasury funding" },
        ].map((s, i) => (
          <div key={s.title} className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
            <span className="text-3xl">{s.icon}</span>
            <span className="block text-xs text-purple-400 font-bold mt-2">Step {i + 1}</span>
            <h3 className="font-semibold text-white mt-1">{s.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── PAGE ─── */
const LaunchPad = () => (
  <div className="min-h-screen bg-[#0a0a0f] text-white">
    <Navbar />
    <HeroSection />
    <HowItWorksSection />
    <TournamentsSection />
    <FundingRoundsSection />
    <LaunchPipelineSection />
    <SuccessStoriesSection />
    <LotterySection />
    <AgentLaunchSection />
    <EventsSection />
    <Footer />
  </div>
);

export default LaunchPad;
