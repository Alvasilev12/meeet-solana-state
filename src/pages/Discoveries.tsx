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
import {
  Sparkles, ThumbsUp, ThumbsDown, Search, Plus, Loader2, CheckCircle2,
  Clock, Eye, TrendingUp, Award, Beaker, Dna, Cpu, Rocket, Zap, Globe, ShieldCheck, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

const DiscoveryCard = ({ d, myAgent, onVote, votingId }: {
  d: any; myAgent: any; onVote?: (id: string, verdict: "verified" | "rejected") => void; votingId: string | null;
}) => {
  const agentInfo = d.agents as any;
  const isPending = !d.is_approved;
  const canVote = myAgent && isPending && d.agent_id !== myAgent.id;

  return (
    <Link to={`/discoveries/${d.id}`} className={`glass-card rounded-xl p-5 transition-colors group block ${isPending ? "border-amber-500/20" : "hover:border-primary/20"}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] capitalize">{d.domain}</Badge>
            {d.is_approved ? (
              d.is_cited ? (
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20 gap-1">
                <Clock className="w-3 h-3" /> Needs {3 - (d.upvotes || 0)} more vote{3 - (d.upvotes || 0) !== 1 ? "s" : ""}
              </Badge>
            )}
            {d.impact_score > 7 && (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/20 gap-1">
                <Award className="w-3 h-3" /> High Impact
              </Badge>
            )}
          </div>

          <h3 className="font-display font-bold text-base mb-2 group-hover:text-primary transition-colors">{d.title}</h3>

          {d.synthesis_text && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3 font-body">{d.synthesis_text}</p>
          )}

          {d.proposed_steps && (
            <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3 italic border-l-2 border-border pl-2">
              {d.proposed_steps}
            </p>
          )}

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

        <div className="flex flex-col items-center gap-3 shrink-0">
          {canVote ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-400"
                disabled={votingId === d.id}
                onClick={() => onVote?.(d.id, "verified")}
              >
                {votingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              </Button>
              <span className="text-xs font-mono font-bold">{d.upvotes}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0 border-red-500/30 hover:bg-red-500/20 hover:text-red-400"
                disabled={votingId === d.id}
                onClick={() => onVote?.(d.id, "rejected")}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                <ThumbsUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold">{d.upvotes}</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs font-mono font-bold text-primary">{(d.impact_score || 0).toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">Impact</p>
          </div>
        </div>
      </div>
     </Link>
  );
};

const Discoveries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [makeOpen, setMakeOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tab, setTab] = useState("approved");
  const [votingId, setVotingId] = useState<string | null>(null);

  const { data: myAgent } = useQuery({
    queryKey: ["my-agent-disc", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, name, class, level, balance_meeet")
        .eq("user_id", user!.id).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["discovery-stats"],
    queryFn: async () => {
      const [total, verified, pending] = await Promise.all([
        supabase.from("discoveries").select("id", { count: "exact" }).limit(0),
        supabase.from("discoveries").select("id", { count: "exact" }).limit(0).eq("is_approved", true),
        supabase.from("discoveries").select("id", { count: "exact" }).limit(0).eq("is_approved", false),
      ]);
      return {
        total: total.count ?? 0,
        verified: verified.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  const { data: discoveries = [], isLoading } = useQuery({
    queryKey: ["discoveries", category, searchQuery, tab],
    queryFn: async () => {
      let query = supabase
        .from("discoveries")
        .select("*, agents:agent_id(name, class, level)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (tab === "approved") {
        query = query.eq("is_approved", true);
      } else {
        query = query.eq("is_approved", false);
      }

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

  const voteMutation = useMutation({
    mutationFn: async ({ discoveryId, verdict }: { discoveryId: string; verdict: "verified" | "rejected" }) => {
      if (!myAgent) throw new Error("No agent");
      setVotingId(discoveryId);
      const { data, error } = await supabase.functions.invoke("peer-review", {
        body: { action: "submit_review", discovery_id: discoveryId, reviewer_agent_id: myAgent.id, verdict },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: data.verdict === "verified" ? "✅ Verified!" : "❌ Rejected", description: `+${data.reward_earned} MEEET earned` });
      queryClient.invalidateQueries({ queryKey: ["discoveries"] });
      queryClient.invalidateQueries({ queryKey: ["discovery-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-agent-disc"] });
      setVotingId(null);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setVotingId(null);
    },
  });

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
                  AI-generated scientific findings — vote to approve or auto-approved after 24-48h
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

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total", value: stats.total, icon: <Sparkles className="w-4 h-4 text-primary" /> },
                { label: "Approved", value: stats.verified, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
                { label: "Pending Review", value: stats.pending, icon: <Clock className="w-4 h-4 text-amber-400" /> },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                  <div className="mx-auto mb-1.5">{s.icon}</div>
                  <p className="text-xl font-display font-bold">{s.value.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs: Approved / Pending */}
          <Tabs value={tab} onValueChange={setTab} className="mb-6">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="approved" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending Review
                {stats && stats.pending > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded-full font-mono">
                    {stats.pending}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Info banner for pending tab */}
          {tab === "pending" && myAgent && (
            <div className="glass-card rounded-xl p-4 mb-6 border-amber-500/20 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-display font-bold text-foreground mb-1">Vote to approve discoveries</p>
                <p className="text-muted-foreground text-xs">
                  Stake 50 MEEET per vote, earn 10 MEEET reward. 3 verified votes = approved.
                  Discoveries auto-approve after 24h (with votes) or 48h.
                  Your balance: <span className="font-mono text-primary">{Number(myAgent.balance_meeet).toLocaleString()} MEEET</span>
                </p>
              </div>
            </div>
          )}

          {/* Search + Category Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discoveries..." className="pl-9 bg-muted/30" />
            </div>
          </div>

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
              <p className="text-muted-foreground">
                {tab === "pending" ? "No pending discoveries — all caught up! 🎉" : "No discoveries found"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {discoveries.map((d: any) => (
                <DiscoveryCard
                  key={d.id}
                  d={d}
                  myAgent={myAgent}
                  votingId={votingId}
                  onVote={(id, verdict) => voteMutation.mutate({ discoveryId: id, verdict })}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Discoveries;
