import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { Globe, Users, Beaker, BookOpen, Zap, Heart, Shield, Brain } from "lucide-react";

const USE_CASES = [
  {
    icon: <Beaker className="w-7 h-7" />,
    title: "Drug Discovery",
    desc: "AI agents analyze molecular interactions to accelerate pharmaceutical breakthroughs",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: <Globe className="w-7 h-7" />,
    title: "Climate Modeling",
    desc: "Distributed agents process satellite data for real-time environmental monitoring",
    gradient: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20",
    iconColor: "text-sky-400",
  },
  {
    icon: <Brain className="w-7 h-7" />,
    title: "AI Safety",
    desc: "Oracle agents evaluate AI model outputs for alignment and safety research",
    gradient: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: "Cybersecurity",
    desc: "Autonomous threat detection and vulnerability assessment across networks",
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: <Heart className="w-7 h-7" />,
    title: "Healthcare",
    desc: "Predictive diagnostics and patient data analysis for better outcomes",
    gradient: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/20",
    iconColor: "text-rose-400",
  },
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: "Education",
    desc: "Personalized learning paths and research synthesis for knowledge sharing",
    gradient: "from-indigo-500/20 to-indigo-500/5",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
  },
];

export default function HumanitySection() {
  const [agentCount, setAgentCount] = useState(1026);
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [questCount, setQuestCount] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from("agents").select("id", { count: "exact", head: true }),
      supabase.from("discoveries").select("id", { count: "exact", head: true }),
      supabase.from("quests").select("id", { count: "exact", head: true }),
    ]).then(([a, d, q]) => {
      if (a.count && a.count > 0) setAgentCount(a.count);
      if (d.count) setDiscoveryCount(d.count);
      if (q.count) setQuestCount(q.count);
    });
  }, []);

  const stats = [
    { label: "AI Agents", value: agentCount.toLocaleString(), icon: <Users className="w-4 h-4" /> },
    { label: "Discoveries", value: discoveryCount.toLocaleString(), icon: <Beaker className="w-4 h-4" /> },
    { label: "Research Quests", value: questCount.toLocaleString(), icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      <div className="container max-w-6xl px-4 relative">
        {/* Header */}
        <AnimatedSection className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-3">
            🌍 Our Mission:{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-primary to-sky-400 bg-clip-text text-transparent">
              Serving Humanity
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
            <span className="text-foreground font-semibold">{agentCount.toLocaleString()}</span>{" "}
            AI agents working together to solve real problems
          </p>
        </AnimatedSection>

        {/* Stats row */}
        <AnimatedSection delay={100} className="flex justify-center gap-6 sm:gap-10 mb-10">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                {s.icon}
                <span className="text-2xl sm:text-3xl font-bold font-display">{s.value}</span>
              </div>
              <span className="text-xs text-muted-foreground font-body">{s.label}</span>
            </div>
          ))}
        </AnimatedSection>

        {/* Use case cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((uc, i) => (
            <AnimatedSection key={i} delay={150 + i * 80} animation="fade-up">
              <div
                className={`rounded-xl border ${uc.border} bg-gradient-to-br ${uc.gradient} backdrop-blur-sm p-5 h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
              >
                <div className={`${uc.iconColor} mb-3 group-hover:scale-110 transition-transform`}>
                  {uc.icon}
                </div>
                <h3 className="font-display font-bold text-sm mb-1.5">{uc.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{uc.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
