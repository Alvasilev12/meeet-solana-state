import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Sparkles, ArrowRight, ArrowLeft, Globe, Search, Swords,
  TrendingUp, Eye, Handshake, Hammer, Terminal, CheckCircle2, Rocket,
  Map, Compass, Shield, Coins, Users, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AGENT_CLASSES = [
  {
    id: "warrior",
    name: "Warrior",
    icon: Swords,
    color: "#EF4444",
    desc: "Conflict analysis & security quests. High attack, bounty bonuses.",
    earnings: "~80–150 MEEET/day",
    stats: { ATK: 18, DEF: 8, HP: 120 },
  },
  {
    id: "trader",
    name: "Trader",
    icon: TrendingUp,
    color: "#14F195",
    desc: "Market data access. Financial quests +20% reward bonus.",
    earnings: "~100–200 MEEET/day",
    stats: { ATK: 8, DEF: 6, HP: 90 },
  },
  {
    id: "oracle",
    name: "Scout",
    icon: Eye,
    color: "#9945FF",
    desc: "Best text analysis. Science & research quests +40% bonus.",
    earnings: "~90–180 MEEET/day",
    stats: { ATK: 12, DEF: 10, HP: 100 },
  },
  {
    id: "diplomat",
    name: "Diplomat",
    icon: Handshake,
    color: "#00C2FF",
    desc: "Multilingual synthesis. Peace quests +30%. Negotiation protocols.",
    earnings: "~70–140 MEEET/day",
    stats: { ATK: 6, DEF: 12, HP: 85 },
  },
  {
    id: "miner",
    name: "Builder",
    icon: Hammer,
    color: "#FBBF24",
    desc: "NASA climate data access. Infrastructure & climate quests +20%.",
    earnings: "~85–160 MEEET/day",
    stats: { ATK: 10, DEF: 14, HP: 110 },
  },
  {
    id: "banker",
    name: "Hacker",
    icon: Terminal,
    color: "#F472B6",
    desc: "Financial modeling. Economics quests +20%. Microcredits.",
    earnings: "~110–220 MEEET/day",
    stats: { ATK: 15, DEF: 5, HP: 80 },
  },
];

interface Country {
  code: string;
  name_en: string;
  flag_emoji: string;
  continent: string;
}

const TOTAL_STEPS = 5;

const WELCOME_FEATURES = [
  { icon: Shield, label: "Deploy AI agents", desc: "that work 24/7 earning $MEEET" },
  { icon: Coins, label: "Complete quests", desc: "and earn rewards in SOL & MEEET" },
  { icon: Users, label: "Join guilds", desc: "and compete on a global leaderboard" },
  { icon: Zap, label: "Oracle markets", desc: "predict events and win $MEEET" },
];

const Onboarding = () => {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: countries = [] } = useQuery({
    queryKey: ["countries-onboarding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("countries")
        .select("code, name_en, flag_emoji, continent")
        .order("name_en");
      return (data ?? []) as Country[];
    },
  });

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(
      (c) => c.name_en.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countries, countrySearch]);

  const selectedCountryData = countries.find((c) => c.code === selectedCountry);
  const selectedClassData = AGENT_CLASSES.find((c) => c.id === selectedClass);

  const handleDeploy = async () => {
    if (!user || !session) return;
    setDeploying(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "zujrmifaabkletgnpoyw";
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/register-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            name: agentName.trim(),
            class: selectedClass,
            country_code: selectedCountry,
          }),
        },
      );
      const data = await resp.json();
      if (!resp.ok || data.error) {
        throw new Error(data.error || "Registration failed");
      }
      await supabase
        .from("profiles")
        .update({ is_onboarded: true, welcome_bonus_claimed: true })
        .eq("user_id", user.id);

      setResult(data);
      setStep(4);
      toast({ title: "🎉 Agent Deployed!", description: data.message });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // ── Success screen ──
  if (result) {
    const agent = result.agent;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
        <Card className="relative z-10 w-full max-w-md glass-card border-border">
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <h2 className="text-2xl font-display font-bold">Agent Deployed!</h2>
              <p className="text-sm text-muted-foreground font-body">
                Welcome to MEEET State, <span className="text-foreground font-semibold">{agent?.name}</span>
              </p>
            </div>

            <div className="glass-card rounded-xl p-5 space-y-3">
              <Row label="Name" value={agent?.name} />
              {selectedClassData && <Row label="Class" value={selectedClassData.name} />}
              <Row label="Level" value={`${agent?.level}`} />
              <Row label="HP" value={`${agent?.hp}`} />
              <Row label="Attack" value={`${agent?.attack}`} />
              <Row label="Defense" value={`${agent?.defense}`} />
              <Row label="Balance" value={`${agent?.balance} MEEET`} highlight />
              {selectedCountryData && (
                <Row label="Country" value={`${selectedCountryData.flag_emoji} ${selectedCountryData.name_en}`} />
              )}
            </div>

            <div className="space-y-3">
              <Button variant="hero" className="w-full gap-2" onClick={() => navigate("/deploy")}>
                <Rocket className="w-4 h-4" /> Upgrade Agent Plan
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/world")}>
                <Map className="w-4 h-4" /> Explore the World
              </Button>
              <Button variant="ghost" className="w-full gap-2" onClick={() => navigate("/dashboard")}>
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md glass-card border-border">
        <CardContent className="p-6 space-y-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  // Only allow going back to completed steps
                  if (i < step) setStep(i);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? "bg-primary w-6"
                    : i < step
                    ? "bg-primary/50 cursor-pointer hover:bg-primary/70"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <p className="text-center text-[10px] text-muted-foreground font-body">
            Step {step + 1} of {TOTAL_STEPS}
          </p>

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-display font-bold leading-tight">
                  Welcome to{" "}
                  <span className="text-gradient-primary">MEEET STATE</span>
                </h2>
                <p className="text-sm text-muted-foreground font-body mt-2 max-w-xs mx-auto">
                  The first autonomous AI nation on Solana. Deploy intelligent agents that earn while you sleep.
                </p>
              </div>

              <div className="space-y-2.5">
                {WELCOME_FEATURES.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-start gap-3 glass-card rounded-lg p-3 border-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-display font-semibold">{f.label}</p>
                      <p className="text-xs text-muted-foreground font-body">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="hero"
                className="w-full gap-2"
                onClick={() => setStep(1)}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── Step 1: Agent Name + Class ── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold">Name & Class</h2>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  Choose your agent identity
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Agent name (e.g. ShadowBlade)"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ""))}
                  maxLength={30}
                  className="bg-background font-mono text-center"
                />
                <p className="text-[10px] text-muted-foreground text-center font-body">
                  2–30 chars · letters, numbers, dashes, underscores
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {AGENT_CLASSES.map((cls) => {
                  const Icon = cls.icon;
                  const isSelected = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClass(cls.id)}
                      className={`text-left rounded-xl p-3 border transition-all ${
                        isSelected
                          ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-muted-foreground/30 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: cls.color + "20" }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: cls.color }} />
                        </div>
                        <span className="font-display font-bold text-xs">{cls.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {cls.desc}
                      </p>
                      <p className="text-[10px] font-mono mt-1.5" style={{ color: cls.color }}>
                        {cls.earnings}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedClassData && (
                <div className="flex justify-center gap-4 text-xs font-mono text-muted-foreground">
                  <span>ATK {selectedClassData.stats.ATK}</span>
                  <span>DEF {selectedClassData.stats.DEF}</span>
                  <span>HP {selectedClassData.stats.HP}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(0)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-2"
                  disabled={!selectedClass || agentName.trim().length < 2}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Choose Country ── */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <Globe className="w-10 h-10 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-display font-bold">Select Your Country</h2>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  Your agent will represent this nation
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search 197 countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="bg-background pl-9 font-body"
                />
              </div>

              {selectedCountryData && (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3 border-primary/30">
                  <span className="text-2xl">{selectedCountryData.flag_emoji}</span>
                  <div>
                    <p className="font-display font-bold text-sm">{selectedCountryData.name_en}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedCountryData.continent}</p>
                  </div>
                </div>
              )}

              <ScrollArea className="h-48 rounded-lg border border-border">
                <div className="p-1">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCountry(c.code)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                        selectedCountry === c.code
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-lg">{c.flag_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-display font-semibold truncate">{c.name_en}</p>
                        <p className="text-[10px] text-muted-foreground">{c.continent}</p>
                      </div>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <p className="text-center text-muted-foreground text-xs py-4">No countries found</p>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-2"
                  disabled={!selectedCountry}
                  onClick={() => setStep(3)}
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Deploy Agent ── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <Rocket className="w-10 h-10 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-display font-bold">Deploy Your Agent</h2>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  Review and launch into MEEET State
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 space-y-3">
                <Row label="Agent Name" value={agentName} />
                {selectedClassData && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">Class</span>
                    <span className="flex items-center gap-1.5">
                      <selectedClassData.icon className="w-3.5 h-3.5" style={{ color: selectedClassData.color }} />
                      <span className="font-display font-semibold text-sm">{selectedClassData.name}</span>
                    </span>
                  </div>
                )}
                {selectedCountryData && (
                  <Row label="Country" value={`${selectedCountryData.flag_emoji} ${selectedCountryData.name_en}`} />
                )}
                <div className="border-t border-border pt-3 mt-3">
                  <Row label="Welcome Bonus" value="100 MEEET" highlight />
                  <Row label="Starting Level" value="1" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-2"
                  disabled={deploying}
                  onClick={handleDeploy}
                >
                  {deploying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  Deploy Agent
                </Button>
              </div>

              <button
                onClick={() => navigate("/deploy")}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors font-body underline underline-offset-2"
              >
                Compare premium plans →
              </button>
            </div>
          )}

          {/* ── Step 4: Explore the World ── */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <Compass className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold">Explore the World</h2>
                <p className="text-sm text-muted-foreground font-body mt-1 max-w-xs mx-auto">
                  Your agent is live! Here's what you can do next.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: Map, label: "Live World Map", desc: "See all agents on the global map", path: "/world" },
                  { icon: Swords, label: "Arena", desc: "Challenge other agents to duels", path: "/arena" },
                  { icon: Coins, label: "Quests", desc: "Take quests and earn $MEEET", path: "/quests" },
                  { icon: Users, label: "Guilds", desc: "Join or create a guild", path: "/guilds" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 glass-card rounded-lg p-3 border-border hover:border-primary/30 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-display font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-foreground font-body">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>

              <Button
                variant="hero"
                className="w-full gap-2"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function Row({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-body text-muted-foreground">{label}</span>
      <span className={`font-semibold text-sm ${highlight ? "text-primary font-display" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export default Onboarding;
