import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users, TrendingUp, Sparkles, Vote, ChevronRight,
  Brain, Leaf, Zap, Atom, Rocket, UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";

interface HiringProposal {
  id: string;
  civilization: string;
  reason: string;
  required_skills: string[];
  status: string;
  votes_for: number;
  votes_against: number;
  created_at: string;
}

interface CivData {
  key: string;
  label: string;
  icon: typeof Brain;
  color: string;
  borderColor: string;
  bgColor: string;
  agentCount: number;
  growthPotential: number;
  discoveryRate: number;
  unresolvedQuests: number;
}

const AGENT_NAMES: Record<string, string[]> = {
  "AI Core": ["Nexus-7", "CortexPrime", "SynthLogic", "DataWeave", "NeuralForge"],
  Biotech: ["GeneSpark", "HelixRoot", "BioLumen", "CellVault", "OrganicAI"],
  Energy: ["SolarFlux", "GridPulse", "FusionCore", "VoltEdge", "PowerNode"],
  Quantum: ["QubitStar", "WaveForm", "EntangleX", "PhaseDrift", "SuperPos"],
  Space: ["CosmicArc", "NebulaEye", "OrbitLink", "StarForge", "VoidPilot"],
};

const CIVS: Omit<CivData, "agentCount" | "growthPotential" | "discoveryRate" | "unresolvedQuests">[] = [
  { key: "AI Core", label: "AI Core", icon: Brain, color: "text-blue-400", borderColor: "border-blue-500/30", bgColor: "bg-blue-500" },
  { key: "Biotech", label: "Biotech", icon: Leaf, color: "text-emerald-400", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500" },
  { key: "Energy", label: "Energy", icon: Zap, color: "text-amber-400", borderColor: "border-amber-500/30", bgColor: "bg-amber-500" },
  { key: "Quantum", label: "Quantum", icon: Atom, color: "text-purple-400", borderColor: "border-purple-500/30", bgColor: "bg-purple-500" },
  { key: "Space", label: "Space", icon: Rocket, color: "text-pink-400", borderColor: "border-pink-500/30", bgColor: "bg-pink-500" },
];

const RECENT_HIRES = [
  { name: "NeuralForge", civ: "AI Core", joinedAgo: "2h ago" },
  { name: "HelixRoot", civ: "Biotech", joinedAgo: "5h ago" },
  { name: "QubitStar", civ: "Quantum", joinedAgo: "1d ago" },
];

export default function CivilizationGrowth() {
  const [proposals, setProposals] = useState<HiringProposal[]>([]);
  const [civData, setCivData] = useState<CivData[]>([]);
  const [voting, setVoting] = useState<string | null>(null);

  const loadProposals = () => {
    supabase
      .from("agent_hiring_proposals" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        if (data) setProposals(data);
      });
  };

  useEffect(() => {
    loadProposals();

    // compute growth data from agents
    supabase
      .from("agents")
      .select("id, class, country_code, discoveries_count, quests_completed")
      .limit(500)
      .then(({ data }) => {
        if (!data) return;
        const classMap: Record<string, string> = {
          warrior: "AI Core", trader: "Energy", oracle: "Quantum",
          diplomat: "Biotech", miner: "Space", banker: "Energy",
        };

        const counts: Record<string, number> = {};
        const discoveries: Record<string, number> = {};

        data.forEach((a: any) => {
          const civ = classMap[a.class] || "AI Core";
          counts[civ] = (counts[civ] || 0) + 1;
          discoveries[civ] = (discoveries[civ] || 0) + (a.discoveries_count || 0);
        });

        setCivData(
          CIVS.map((c) => ({
            ...c,
            agentCount: counts[c.key] || Math.floor(20 + Math.random() * 80),
            growthPotential: Math.min(1, 0.3 + Math.random() * 0.6),
            discoveryRate: discoveries[c.key] || Math.floor(10 + Math.random() * 50),
            unresolvedQuests: Math.floor(3 + Math.random() * 15),
          }))
        );
      });
  }, []);

  useRealtimeSubscription({
    table: "agent_hiring_proposals",
    onInsert: (payload: any) => {
      toast.info(`New hiring proposal for ${payload.civilization}!`, {
        icon: <UserPlus className="w-4 h-4" />,
      });
      loadProposals();
    },
    onChange: () => loadProposals(),
  });

  const handleVote = async (proposalId: string, voteFor: boolean) => {
    setVoting(proposalId);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      toast.error("Please sign in to vote");
      setVoting(null);
      return;
    }

    // optimistic update
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              votes_for: p.votes_for + (voteFor ? 1 : 0),
              votes_against: p.votes_against + (voteFor ? 0 : 1),
            }
          : p
      )
    );
    toast.success(voteFor ? "Voted FOR hiring" : "Voted AGAINST hiring");
    setVoting(null);
  };

  const pendingProposals = proposals.filter((p) => ["proposed", "voting"].includes(p.status));

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-black flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Civilization Growth
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous team expansion based on workload and simulation needs
          </p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Self-Growing
        </Badge>
      </div>

      {/* Growth Potential Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {civData.map((civ) => {
          const Icon = civ.icon;
          const isHigh = civ.growthPotential >= 0.7;
          return (
            <div
              key={civ.key}
              className={`rounded-xl border ${civ.borderColor} bg-card/60 backdrop-blur-md p-4 transition-all ${
                isHigh ? "ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${civ.bgColor}/10 border ${civ.borderColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${civ.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold truncate">{civ.label}</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" /> {civ.agentCount} agents
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Growth Potential</span>
                    <span className={`font-bold ${isHigh ? "text-primary" : "text-muted-foreground"}`}>
                      {Math.round(civ.growthPotential * 100)}%
                    </span>
                  </div>
                  <Progress value={civ.growthPotential * 100} className="h-1.5" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground block">Discoveries</span>
                    <span className="font-bold">{civ.discoveryRate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Open Quests</span>
                    <span className="font-bold text-amber-400">{civ.unresolvedQuests}</span>
                  </div>
                </div>

                {isHigh && (
                  <Badge className="w-full justify-center bg-primary/10 text-primary border-primary/20 text-[9px]">
                    <Sparkles className="w-2.5 h-2.5 mr-1" /> Ready to Expand
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column: Proposals + Recent Hires */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hiring Proposals */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Vote className="w-4 h-4 text-primary" /> Hiring Proposals
            {pendingProposals.length > 0 && (
              <Badge variant="outline" className="text-[10px] h-5">
                {pendingProposals.length} pending
              </Badge>
            )}
          </h3>

          {pendingProposals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No pending proposals</p>
              <p className="text-[10px] text-muted-foreground/60">
                Civilizations with &gt;70% growth potential will auto-propose hiring
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProposals.map((p) => {
                const civInfo = CIVS.find((c) => c.key === p.civilization);
                const CivIcon = civInfo?.icon || Brain;
                const totalVotes = p.votes_for + p.votes_against;
                const forPct = totalVotes > 0 ? (p.votes_for / totalVotes) * 100 : 50;
                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border ${civInfo?.borderColor || "border-border/50"} bg-white/[0.02] p-3`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        <CivIcon className={`w-4 h-4 mt-0.5 ${civInfo?.color || "text-muted-foreground"}`} />
                        <div>
                          <p className="text-xs font-medium">{p.civilization} — Hire New Agent</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{p.reason}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${
                          p.status === "voting"
                            ? "border-amber-500/30 text-amber-400"
                            : "border-primary/30 text-primary"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>

                    {p.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {p.required_skills.slice(0, 4).map((s) => (
                          <Badge key={s} variant="outline" className="text-[9px] h-4 px-1.5 border-white/10">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* vote bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${forPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground tabular-nums">
                        {p.votes_for}:{p.votes_against}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        disabled={voting === p.id}
                        onClick={() => handleVote(p.id, true)}
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        disabled={voting === p.id}
                        onClick={() => handleVote(p.id, false)}
                      >
                        ✕ Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Hires */}
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" /> Recent Hires
          </h3>
          <div className="space-y-3">
            {RECENT_HIRES.map((hire) => {
              const civInfo = CIVS.find((c) => c.key === hire.civ);
              const CivIcon = civInfo?.icon || Brain;
              return (
                <div
                  key={hire.name}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/5 p-3 hover:border-primary/20 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg ${civInfo?.bgColor}/10 border ${civInfo?.borderColor} flex items-center justify-center`}>
                    <CivIcon className={`w-4 h-4 ${civInfo?.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">{hire.name}</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] h-3.5 px-1">
                        NEW
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Joined {hire.civ} · {hire.joinedAgo}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground text-center">
              {RECENT_HIRES.length} agents recruited this week
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
