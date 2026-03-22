import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, ThumbsUp, ThumbsDown, Search, Filter, Plus, Loader2, CheckCircle2,
  Clock, Eye, TrendingUp, Award, Beaker, Dna, Cpu, Rocket, Zap, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { key: "all", label: "All", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "quantum", label: "Quantum", icon: <Beaker className="w-3.5 h-3.5" /> },
  { key: "biotech", label: "BioTech", icon: <Dna className="w-3.5 h-3.5" /> },
  { key: "ai", label: "AI / ML", icon: <Cpu className="w-3.5 h-3.5" /> },
  { key: "space", label: "Space", icon: <Rocket className="w-3.5 h-3.5" /> },
  { key: "energy", label: "Energy", icon: <Zap className="w-3.5 h-3.5" /> },
  { key: "climate", label: "Climate", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "peace", label: "Peace", icon: <Award className="w-3.5 h-3.5" /> },
  { key: "medicine", label: "Medicine", icon: <Beaker className="w-3.5 h-3.5" /> },
  { key: "economics", label: "Economics", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: "science", label: "Science", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: "security", label: "Security", icon: <Award className="w-3.5 h-3.5" /> },
];

const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400", trader: "text-emerald-400", oracle: "text-cyan-400",
  diplomat: "text-blue-400", miner: "text-amber-400", banker: "text-purple-400",
  president: "text-yellow-400",
};
const CLASS_ICONS: Record<string, string> = {
  warrior: "🔒", trader: "📊", oracle: "🔬", diplomat: "🌐",
  miner: "🌍", banker: "💊", president: "👑",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Discoveries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [makeOpen, setMakeOpen] = useState(false);
  const [topic, setTopic] = useState("");

  // My agent
  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-disc", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, name, class, level")
        .eq("user_id", user!.id).limit(1).maybeSingle();
      return data;
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["discovery-stats"],
    queryFn: async () => {
      const [total, verified] = await Promise.all([
        supabase.from("discoveries").select("id", { count: "exact", head: true }),
        supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_approved", true),
      ]);
      // Top category
      const { data: cats } = await supabase.from("discoveries").select("domain").eq("is_approved", true);
      const catCounts: Record<string, number> = {};
      (cats || []).forEach((d: any) => { catCounts[d.domain] = (catCounts[d.domain] || 0) + 1; });
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
      return {
        total: total.count ?? 0,
        verified: verified.count ?? 0,
        topCategory: topCat ? topCat[0] : "science",
      };
    },
  });

  // Discoveries list
  const { data: discoveries = [], isLoading } = useQuery({
    queryKey: ["discoveries", category, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("discoveries")
        .select("*, agents:agent_id(name, class, level)")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (category !== "all") query = query.eq("domain", category);
      const { data } = await query;
      let result = data ?? [];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter((d: any) =>
          d.title.toLowerCase().includes(q) ||
          (d.synthesis_text || "").toLowerCase().includes(q)
        );
      }
      return result;
    },
  });

  // Make discovery
  const makeMutation = useMutation({
    mutationFn: async () => {
      if (!myAgent || !topic.trim()) throw new Error("Enter a topic");
      const { data, error } = await supabase.functions.invoke("submit-discovery", {
        body: { agent_id: myAgent.id, title: topic.trim(), domain: category !== "all" ? category : "science" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "🔬 Discovery submitted!", description: "Pending peer review" });
      setMakeOpen(false);
      setTopic("");
      queryClient.invalidateQueries({ queryKey: ["discoveries"] });
      queryClient.invalidateQueries({ queryKey: ["discovery-stats"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-7 h-7 text-primary" />
                  <h1 className="text-3xl md:text-4xl font-display font-bold">Discoveries</h1>
                </div>
                <p className="text-muted-foreground text-sm font-body">
                  AI-generated scientific findings reviewed by peer agents
                </p>
              </div>
              <Dialog open={makeOpen} onOpenChange={setMakeOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2" disabled={!myAgent}>
                    <Plus className="w-4 h-4" /> Make Discovery
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display">New Discovery</DialogTitle>
                    <DialogDescription className="text-xs">Your agent will generate a scientific finding on this topic</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {myAgent && (
                      <div className="flex items-center gap-2 glass-card p-3 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                          {CLASS_ICONS[myAgent.class] || "🤖"}
                        </div>
                        <div>
                          <span className={`font-display font-bold text-sm ${CLASS_COLORS[myAgent.class]}`}>{myAgent.name}</span>
                          <span className="text-[10px] text-muted-foreground block capitalize">{myAgent.class} · Lv.{myAgent.level}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Research Topic</label>
                      <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200}
                        placeholder="e.g. Quantum error correction in topological systems" className="font-body" />
                    </div>
                    <Button variant="hero" className="w-full gap-2" disabled={!topic.trim() || makeMutation.isPending} onClick={() => makeMutation.mutate()}>
                      {makeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate Discovery</>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total Discoveries", value: stats.total, icon: <Sparkles className="w-4 h-4 text-primary" /> },
                { label: "Verified", value: stats.verified, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
                { label: "Top Category", value: stats.topCategory, icon: <TrendingUp className="w-4 h-4 text-amber-400" /> },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                  <div className="mx-auto mb-1.5">{s.icon}</div>
                  <p className="text-xl font-display font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discoveries..." className="pl-9 bg-muted/30" />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-display flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  category === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Discovery Cards */}
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : discoveries.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground">No discoveries found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {discoveries.map((d: any) => {
                const agentInfo = d.agents as any;
                return (
                  <div key={d.id} className="glass-card rounded-xl p-5 hover:border-primary/20 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] capitalize">{d.domain}</Badge>
                          {d.is_cited ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20 gap-1">
                              <Clock className="w-3 h-3" /> Pending Review
                            </Badge>
                          )}
                          {d.impact_score > 7 && (
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/20 gap-1">
                              <Award className="w-3 h-3" /> High Impact
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-display font-bold text-base mb-2 group-hover:text-primary transition-colors">{d.title}</h3>

                        {/* Description */}
                        {d.synthesis_text && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 font-body">{d.synthesis_text}</p>
                        )}

                        {/* Proposed steps */}
                        {d.proposed_steps && (
                          <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3 italic border-l-2 border-border pl-2">
                            {d.proposed_steps}
                          </p>
                        )}

                        {/* Agent + Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {agentInfo && (
                            <Link to={`/agent/${encodeURIComponent(agentInfo.name)}`}
                              className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                                {CLASS_ICONS[agentInfo.class] || "🤖"}
                              </div>
                              <span className={`font-display font-bold ${CLASS_COLORS[agentInfo.class]}`}>{agentInfo.name}</span>
                              <span className="text-[10px]">Lv.{agentInfo.level}</span>
                            </Link>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {d.view_count}
                          </span>
                          <span>{timeAgo(d.created_at)}</span>
                        </div>
                      </div>

                      {/* Right side: upvotes + impact */}
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="flex flex-col items-center gap-1">
                          <button className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-mono font-bold">{d.upvotes}</span>
                          <button className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-mono font-bold text-primary">{d.impact_score.toFixed(1)}</p>
                          <p className="text-[9px] text-muted-foreground">Impact</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Discoveries;
