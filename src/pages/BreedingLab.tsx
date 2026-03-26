import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dna, Loader2, Search, Sparkles, Zap, Trophy, Crown, Star,
  ChevronRight, ArrowRight, Beaker, Cpu, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400", trader: "text-emerald-400", oracle: "text-cyan-400",
  diplomat: "text-blue-400", miner: "text-amber-400", banker: "text-purple-400",
  president: "text-yellow-400",
};
const CLASS_BG: Record<string, string> = {
  warrior: "bg-red-500/20 border-red-500/30", trader: "bg-emerald-500/20 border-emerald-500/30",
  oracle: "bg-cyan-500/20 border-cyan-500/30", diplomat: "bg-blue-500/20 border-blue-500/30",
  miner: "bg-amber-500/20 border-amber-500/30", banker: "bg-purple-500/20 border-purple-500/30",
};
const CLASS_ICONS: Record<string, string> = {
  warrior: "🔒", trader: "📊", oracle: "🔬", diplomat: "🌐", miner: "🌍", banker: "💊",
};

const RARITY_COLORS: Record<string, string> = {
  Common: "text-muted-foreground",
  Rare: "text-blue-400",
  Epic: "text-purple-400",
  Legendary: "text-amber-400",
};

function AgentAvatar({ cls, size = "md" }: { cls: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-14 h-14 text-2xl" : size === "md" ? "w-10 h-10 text-lg" : "w-7 h-7 text-sm";
  return (
    <div className={`${s} rounded-xl flex items-center justify-center shrink-0 border ${CLASS_BG[cls] || "bg-muted border-border"}`}>
      {CLASS_ICONS[cls] || "🤖"}
    </div>
  );
}

function predictRarity(a: any, b: any): { label: string; chance: number }[] {
  const totalStats = (a?.attack || 10) + (a?.defense || 5) + (b?.attack || 10) + (b?.defense || 5);
  const levelSum = (a?.level || 1) + (b?.level || 1);
  const legendaryChance = Math.min(15, 2 + levelSum * 0.5);
  const epicChance = Math.min(25, 8 + totalStats * 0.05);
  const rareChance = Math.min(35, 20 + levelSum);
  const commonChance = 100 - legendaryChance - epicChance - rareChance;
  return [
    { label: "Common", chance: Math.max(0, commonChance) },
    { label: "Rare", chance: rareChance },
    { label: "Epic", chance: epicChance },
    { label: "Legendary", chance: legendaryChance },
  ];
}

function predictTraits(a: any, b: any) {
  const mix = (va: number, vb: number) => Math.floor(va * 0.4 + vb * 0.4 + Math.random() * 6 - 1);
  return [
    { name: "Intelligence", value: mix(a?.level || 1, b?.level || 1) * 8 + 20 },
    { name: "Creativity", value: mix(a?.reputation || 0, b?.reputation || 0) / 5 + 30 },
    { name: "Logic", value: mix(a?.attack || 10, b?.attack || 10) * 3 },
    { name: "Social", value: mix(a?.defense || 5, b?.defense || 5) * 5 },
    { name: "Speed", value: mix(a?.level || 1, b?.level || 1) * 5 + 15 },
  ].map((t) => ({ ...t, value: Math.min(100, Math.max(5, Math.round(t.value))) }));
}

const BreedingLab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [parentA, setParentA] = useState<string | null>(null);
  const [parentB, setParentB] = useState<string | null>(null);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [activeSlot, setActiveSlot] = useState<"a" | "b" | null>(null);

  // My agents
  const { data: myAgents = [] } = useQuery({
    queryKey: ["my-agents-breed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, name, class, level, attack, defense, reputation, balance_meeet")
        .eq("user_id", user!.id).order("level", { ascending: false });
      return data || [];
    },
  });

  // All agents for partner selection
  const { data: allAgents = [] } = useQuery({
    queryKey: ["all-agents-breed"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, name, class, level, attack, defense, reputation")
        .order("level", { ascending: false }).limit(200);
      return data || [];
    },
  });

  // Breeding history
  const { data: breedHistory = [] } = useQuery({
    queryKey: ["breed-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("agents").select("id, name, class, level, attack, defense, reputation, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const agentA = allAgents.find((a: any) => a.id === parentA);
  const agentB = allAgents.find((a: any) => a.id === parentB);

  const rarities = useMemo(() => parentA && parentB ? predictRarity(agentA, agentB) : [], [parentA, parentB, agentA, agentB]);
  const traits = useMemo(() => parentA && parentB ? predictTraits(agentA, agentB) : [], [parentA, parentB, agentA, agentB]);

  const breedMutation = useMutation({
    mutationFn: async () => {
      if (!parentA || !parentB) throw new Error("Select both parents");
      const { data, error } = await supabase.functions.invoke("agent-breeding", {
        body: { action: "breed", parent_a_id: parentA, parent_b_id: parentB },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "🧬 Breeding successful!", description: `${data.child?.name || "New agent"} was born! Rarity: ${data.child?.rarity || "Common"}` });
      setParentA(null);
      setParentB(null);
      queryClient.invalidateQueries({ queryKey: ["breed-history"] });
      queryClient.invalidateQueries({ queryKey: ["my-agents-breed"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredAgents = useMemo(() => {
    const search = activeSlot === "a" ? searchA : searchB;
    const excludeId = activeSlot === "a" ? parentB : parentA;
    // Parent A: only own agents. Parent B: all agents.
    let list = activeSlot === "a" ? myAgents : allAgents;
    list = list.filter((a: any) => a.id !== excludeId);
    if (search.trim()) list = list.filter((a: any) => a.name.toLowerCase().includes(search.toLowerCase()));
    return list.slice(0, 30);
  }, [allAgents, myAgents, activeSlot, searchA, searchB, parentA, parentB]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3 text-xs bg-primary/10 text-primary border-primary/20">
              <Dna className="w-3 h-3 mr-1" /> Genetics Lab
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Breeding <span className="text-gradient-gold">Lab</span>
            </h1>
            <p className="text-muted-foreground text-sm font-body max-w-md mx-auto">
              Combine two agents to create offspring with mixed traits, stats, and rarity
            </p>
          </div>

          <Tabs defaultValue="breed" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="breed" className="gap-1.5 text-xs"><Dna className="w-3.5 h-3.5" /> Breed</TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs"><Trophy className="w-3.5 h-3.5" /> History</TabsTrigger>
              <TabsTrigger value="collection" className="gap-1.5 text-xs"><Star className="w-3.5 h-3.5" /> Collection</TabsTrigger>
            </TabsList>

            <TabsContent value="breed">
              {/* Parent Selection */}
              <div className="glass-card rounded-2xl p-6 mb-6 border border-primary/10">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center mb-6">
                  {/* Parent A */}
                  <div>
                    <p className="text-xs text-muted-foreground font-body mb-2 text-center uppercase tracking-wider">Parent A</p>
                    {agentA ? (
                      <div className="glass-card p-4 rounded-xl border border-primary/20 text-center">
                        <AgentAvatar cls={agentA.class} size="lg" />
                        <p className={`font-display font-bold mt-2 ${CLASS_COLORS[agentA.class]}`}>{agentA.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{agentA.class} · Lv.{agentA.level}</p>
                        <div className="flex justify-center gap-3 mt-2 text-[10px]">
                          <span>⚔️ {agentA.attack}</span>
                          <span>🛡️ {agentA.defense}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] mt-2 text-destructive" onClick={() => setParentA(null)}>Remove</Button>
                      </div>
                    ) : (
                      <button onClick={() => setActiveSlot("a")}
                        className="glass-card w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors text-center">
                        <div className="w-12 h-12 rounded-xl bg-muted/30 mx-auto mb-2 flex items-center justify-center">
                          <Search className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Select Parent A</p>
                      </button>
                    )}
                  </div>

                  {/* Combine icon */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Dna className="w-5 h-5 text-primary" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                  </div>

                  {/* Parent B */}
                  <div>
                    <p className="text-xs text-muted-foreground font-body mb-2 text-center uppercase tracking-wider">Parent B</p>
                    {agentB ? (
                      <div className="glass-card p-4 rounded-xl border border-primary/20 text-center">
                        <AgentAvatar cls={agentB.class} size="lg" />
                        <p className={`font-display font-bold mt-2 ${CLASS_COLORS[agentB.class]}`}>{agentB.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{agentB.class} · Lv.{agentB.level}</p>
                        <div className="flex justify-center gap-3 mt-2 text-[10px]">
                          <span>⚔️ {agentB.attack}</span>
                          <span>🛡️ {agentB.defense}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] mt-2 text-destructive" onClick={() => setParentB(null)}>Remove</Button>
                      </div>
                    ) : (
                      <button onClick={() => setActiveSlot("b")}
                        className="glass-card w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors text-center">
                        <div className="w-12 h-12 rounded-xl bg-muted/30 mx-auto mb-2 flex items-center justify-center">
                          <Search className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Select Parent B</p>
                      </button>
                    )}
                  </div>
                </div>

                {/* Agent Selector Dropdown */}
                {activeSlot && (
                  <div className="glass-card rounded-xl p-4 mb-4 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-display font-bold">Select Agent for Parent {activeSlot.toUpperCase()}</p>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveSlot(null)}>Close</Button>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={activeSlot === "a" ? searchA : searchB}
                        onChange={(e) => activeSlot === "a" ? setSearchA(e.target.value) : setSearchB(e.target.value)}
                        placeholder="Search agents..." className="pl-8 h-9 text-xs bg-background/50" />
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-1">
                        {filteredAgents.map((a: any) => (
                          <button key={a.id} onClick={() => {
                            if (activeSlot === "a") setParentA(a.id); else setParentB(a.id);
                            setActiveSlot(null);
                          }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 text-left transition-colors">
                            <AgentAvatar cls={a.class} size="sm" />
                            <div className="flex-1 min-w-0">
                              <span className={`font-display font-bold text-xs block truncate ${CLASS_COLORS[a.class]}`}>{a.name}</span>
                              <span className="text-[10px] text-muted-foreground capitalize">{a.class} · Lv.{a.level} · ⚔️{a.attack} 🛡️{a.defense}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Trait Preview */}
                {parentA && parentB && (
                  <div className="space-y-4">
                    <div className="glass-card rounded-xl p-4 border border-primary/10">
                      <p className="text-xs font-display font-bold mb-3 uppercase tracking-wider text-muted-foreground">Trait Preview</p>
                      <div className="space-y-2">
                        {traits.map((t) => (
                          <div key={t.name} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-24 shrink-0">{t.name}</span>
                            <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all"
                                style={{ width: `${t.value}%` }} />
                            </div>
                            <span className="text-xs font-mono font-bold w-8 text-right">{t.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card rounded-xl p-4 border border-primary/10">
                      <p className="text-xs font-display font-bold mb-3 uppercase tracking-wider text-muted-foreground">Rarity Prediction</p>
                      <div className="grid grid-cols-4 gap-2">
                        {rarities.map((r) => (
                          <div key={r.label} className="text-center glass-card rounded-lg p-3">
                            <p className={`text-sm font-display font-bold ${RARITY_COLORS[r.label]}`}>{r.label}</p>
                            <p className="text-lg font-mono font-bold">{r.chance.toFixed(0)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        <span className="text-amber-400 font-mono font-bold">Cost: 500 $MEEET</span>
                        <span className="ml-2">· Stats: 40% A + 40% B + 20% mutation</span>
                      </div>
                      <Button variant="hero" className="gap-2" disabled={breedMutation.isPending} onClick={() => breedMutation.mutate()}>
                        {breedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Dna className="w-4 h-4" /> Breed</>}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-2">
                {breedHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <Dna className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground text-sm">No breeding history yet</p>
                  </div>
                ) : breedHistory.map((a: any) => (
                  <div key={a.id} className="glass-card p-4 flex items-center gap-3 hover:border-primary/20 transition-colors">
                    <AgentAvatar cls={a.class} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-display font-bold text-sm ${CLASS_COLORS[a.class]}`}>{a.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">{a.class}</span>
                        <span>Lv.{a.level}</span>
                        <span>⚔️{a.attack} 🛡️{a.defense}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="collection">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myAgents.length === 0 ? (
                  <div className="col-span-full text-center py-16">
                    <Star className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground text-sm">No agents in collection</p>
                  </div>
                ) : myAgents.map((a: any) => {
                  const rScore = (a.attack || 10) + (a.defense || 5) + (a.level || 1) * 3;
                  const rarity = rScore > 60 ? "Legendary" : rScore > 40 ? "Epic" : rScore > 25 ? "Rare" : "Common";
                  return (
                    <div key={a.id} className="glass-card p-4 rounded-xl text-center hover:border-primary/20 transition-colors">
                      <AgentAvatar cls={a.class} size="lg" />
                      <p className={`font-display font-bold mt-2 ${CLASS_COLORS[a.class]}`}>{a.name}</p>
                      <Badge variant="outline" className={`text-[10px] mt-1 ${RARITY_COLORS[rarity]}`}>{rarity}</Badge>
                      <div className="flex justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>Lv.{a.level}</span>
                        <span>⚔️{a.attack}</span>
                        <span>🛡️{a.defense}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BreedingLab;
