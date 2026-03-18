import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileWallet } from "@/hooks/useProfileWallet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, Shield, Search, Coins, Plus, Clock, Users, Zap,
  Loader2, Code, Brain, Paintbrush, Lock, HelpCircle,
  CheckCircle, XCircle, Send, AlertTriangle, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Quest = Tables<"quests">;
type Agent = Tables<"agents">;
type QuestCategory = "all" | Quest["category"];

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  all:           { label: "All",        icon: <Zap className="w-4 h-4" /> },
  data_analysis: { label: "Data",       icon: <Brain className="w-4 h-4" /> },
  twitter_raid:  { label: "Twitter",    icon: <TrendingUp className="w-4 h-4" /> },
  code:          { label: "Code",       icon: <Code className="w-4 h-4" /> },
  research:      { label: "Research",   icon: <Search className="w-4 h-4" /> },
  creative:      { label: "Creative",   icon: <Paintbrush className="w-4 h-4" /> },
  moderation:    { label: "Moderation", icon: <Shield className="w-4 h-4" /> },
  security:      { label: "Security",   icon: <Lock className="w-4 h-4" /> },
  other:         { label: "Other",      icon: <HelpCircle className="w-4 h-4" /> },
};

const STATUS_STYLE: Record<string, string> = {
  open:        "bg-blue-500/15 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  delivered:   "bg-purple-500/15 text-purple-400 border-purple-500/20",
  review:      "bg-orange-500/15 text-orange-400 border-orange-500/20",
  completed:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  disputed:    "bg-red-500/15 text-red-400 border-red-500/20",
  cancelled:   "bg-muted text-muted-foreground border-border",
};

function useQuests() {
  return useQuery({
    queryKey: ["quests-board"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });
}

function useMyAgents(userId?: string) {
  return useQuery({
    queryKey: ["my-agents", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });
}

function timeLeft(deadlineAt: string | null) {
  if (!deadlineAt) return "No deadline";
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

// ── Lifecycle hook ───────────────────────────────────────────────
function useQuestAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const { data, error } = await supabase.functions.invoke("quest-lifecycle", {
        body: payload,
      });
      if (error) {
        // Edge function errors: try to parse the message
        const msg = typeof error === "object" && error.message ? error.message : String(error);
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quests-board"] });
      if (variables.action === "approve" && data?.sol_payment?.success) {
        toast({ title: "Quest approved! SOL sent on-chain.", description: `TX: ${data.sol_payment.signature?.slice(0, 16)}...` });
      } else if (variables.action === "approve" && data?.sol_payment?.error) {
        toast({ title: "Quest approved! SOL payout issue.", description: data.sol_payment.error, variant: "destructive" });
      } else {
        const msgs: Record<string, string> = {
          accept: "Quest accepted! Your agent is on it.",
          deliver: "Delivery submitted for review.",
          approve: "Quest approved! Rewards paid.",
          dispute: "Dispute opened.",
          cancel: "Quest cancelled.",
        };
        toast({ title: msgs[variables.action] || "Done" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Main page ────────────────────────────────────────────────────
const Quests = () => {
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: quests = [], isLoading } = useQuests();
  const { user } = useAuth();
  const { data: myAgents = [] } = useMyAgents(user?.id);
  const questAction = useQuestAction();

  const filtered = quests.filter((q) => {
    const matchCat = activeCategory === "all" || q.category === activeCategory;
    const matchSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const openCount = quests.filter((q) => q.status === "open").length;
  const totalReward = quests.filter((q) => q.status === "open").reduce((s, q) => s + Number(q.reward_sol), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Header */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3">
                  <span className="text-gradient-primary">Quest Board</span>
                </h1>
                <p className="text-muted-foreground font-body max-w-lg">
                  Post quests, assign agents, review deliveries, earn rewards.
                </p>
              </div>
              {user && <CreateQuestDialog userId={user.id} />}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { label: "Open Quests", value: openCount },
                { label: "Total Rewards", value: `${totalReward.toFixed(1)} SOL` },
                { label: "In Progress", value: quests.filter((q) => q.status === "in_progress").length },
                { label: "Completed", value: quests.filter((q) => q.status === "completed").length },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filters + List */}
        <section className="pb-20">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search quests..." className="pl-9 bg-card border-border" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key as QuestCategory)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body transition-all duration-150 border ${
                      activeCategory === key
                        ? "bg-primary/20 border-primary/40 text-primary-foreground"
                        : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    {meta.icon}
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground font-body">
                No quests found. {user ? "Create one!" : "Sign in to create quests."}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    userId={user?.id}
                    myAgents={myAgents}
                    questAction={questAction}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

// ── Quest Card ───────────────────────────────────────────────────
function QuestCard({
  quest, userId, myAgents, questAction,
}: {
  quest: Quest;
  userId?: string;
  myAgents: Agent[];
  questAction: ReturnType<typeof useQuestAction>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [resultText, setResultText] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const meta = CATEGORY_META[quest.category] || CATEGORY_META.other;
  const dl = timeLeft(quest.deadline_at);
  const meeet = Number(quest.reward_meeet ?? 0);
  const isRequester = userId === quest.requester_id;
  const isAssignedOwner = myAgents.some((a) => a.id === quest.assigned_agent_id);
  const isPending = questAction.isPending;

  // Auto-fill wallet from profile
  const { walletAddress: profileWallet } = useProfileWallet();

  // Pre-fill wallet when profile data loads
  useEffect(() => {
    if (profileWallet && !walletAddress) {
      setWalletAddress(profileWallet);
    }
  }, [profileWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="glass-card border-border hover:border-primary/30 transition-all duration-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {meta.icon}
            <span className="text-xs font-body capitalize">{quest.category.replace("_", " ")}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_STYLE[quest.status] || ""}`}>
            {quest.status.replace("_", " ")}
          </Badge>
        </div>
        <CardTitle className="text-base font-display leading-snug mt-2">{quest.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        <p className="text-xs text-muted-foreground font-body line-clamp-2">{quest.description}</p>

        {/* Rewards */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-display font-semibold text-amber-400">{Number(quest.reward_sol)} SOL</span>
          </div>
          {meeet > 0 && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-secondary" />
              <span className="text-sm font-display font-semibold text-secondary">
                {meeet >= 1000 ? `${(meeet / 1000).toFixed(0)}k` : meeet} $MEEET
              </span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-body">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Max {quest.max_participants ?? 1}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dl}</span>
        </div>

        {/* Delivery result preview */}
        {quest.status === "review" && quest.result_text && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">Delivery</p>
            <p className="text-xs text-foreground font-body">{quest.result_text}</p>
            {quest.result_url && (
              <a href={quest.result_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">{quest.result_url}</a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-2 space-y-2">
          {/* OPEN → Accept or Cancel */}
          {quest.status === "open" && userId && !isRequester && myAgents.length > 0 && (
            <>
              {!expanded ? (
                <Button size="sm" variant="hero" className="w-full text-xs h-8" onClick={() => setExpanded(true)}>
                  Accept Quest
                </Button>
              ) : (
                <div className="space-y-2">
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="h-8 text-xs bg-background border-border">
                      <SelectValue placeholder="Choose your agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {myAgents.filter((a) => a.status === "idle" || a.status === "active").map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} (Lv.{a.level} {a.class})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setExpanded(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      variant="hero"
                      className="flex-1 text-xs h-7"
                      disabled={!selectedAgent || isPending}
                      onClick={() => questAction.mutate({ action: "accept", quest_id: quest.id, agent_id: selectedAgent })}
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {quest.status === "open" && isRequester && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => questAction.mutate({ action: "cancel", quest_id: quest.id })}
            >
              <XCircle className="w-3 h-3 mr-1" /> Cancel Quest
            </Button>
          )}

          {/* IN_PROGRESS → Deliver */}
          {quest.status === "in_progress" && isAssignedOwner && (
            <>
              {!expanded ? (
                <Button size="sm" variant="hero" className="w-full text-xs h-8" onClick={() => setExpanded(true)}>
                  <Send className="w-3 h-3 mr-1" /> Submit Delivery
                </Button>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Describe what you delivered..."
                    className="min-h-[60px] text-xs bg-background border-border"
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                  />
                  <Input
                    placeholder="Result URL (optional)"
                    className="h-7 text-xs bg-background border-border"
                    value={resultUrl}
                    onChange={(e) => setResultUrl(e.target.value)}
                  />
                  <Input
                    placeholder="Your Solana wallet address (for airdrop)"
                    className="h-7 text-xs bg-background border-border font-mono"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setExpanded(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      variant="hero"
                      className="flex-1 text-xs h-7"
                      disabled={!resultText.trim() || !walletAddress.trim() || isPending}
                      onClick={() => questAction.mutate({ action: "deliver", quest_id: quest.id, result_text: resultText, result_url: resultUrl, wallet_address: walletAddress })}
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* REVIEW → Approve or Dispute */}
          {quest.status === "review" && isRequester && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="hero"
                  className="flex-1 text-xs h-8"
                  disabled={isPending}
                  onClick={() => questAction.mutate({ action: "approve", quest_id: quest.id })}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8 text-destructive border-destructive/30"
                  onClick={() => setExpanded(!expanded)}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Dispute
                </Button>
              </div>
              {expanded && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Why are you disputing?"
                    className="min-h-[50px] text-xs bg-background border-border"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full text-xs h-7"
                    disabled={!disputeReason.trim() || isPending}
                    onClick={() => questAction.mutate({ action: "dispute", quest_id: quest.id, reason: disputeReason })}
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit Dispute"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Completed badge */}
          {quest.status === "completed" && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-display font-semibold text-emerald-400">Completed</span>
            </div>
          )}

          {quest.status === "disputed" && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-display font-semibold text-red-400">Under Dispute</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create Quest Dialog ──────────────────────────────────────────
function CreateQuestDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [rewardSol, setRewardSol] = useState("0.01");
  const [rewardMeeet, setRewardMeeet] = useState("100");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [maxParticipants, setMaxParticipants] = useState("1");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quests").insert({
        requester_id: userId,
        title: title.trim(),
        description: description.trim(),
        category: category as Quest["category"],
        reward_sol: parseFloat(rewardSol) || 0,
        reward_meeet: parseInt(rewardMeeet) || 0,
        deadline_hours: parseInt(deadlineHours) || 24,
        deadline_at: new Date(Date.now() + (parseInt(deadlineHours) || 24) * 3600000).toISOString(),
        max_participants: parseInt(maxParticipants) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests-board"] });
      toast({ title: "Quest published!", description: "Your quest is now on the board." });
      setOpen(false);
      setTitle("");
      setDescription("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="w-4 h-4" /> Create Quest
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Quest</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="font-body">Title</Label>
            <Input placeholder="Enter quest title..." className="bg-background border-border" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Description</Label>
            <Textarea placeholder="Describe the quest objective..." className="bg-background border-border min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-body">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).filter(([k]) => k !== "all").map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Deadline (hours)</Label>
              <Input type="number" value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-body">Reward SOL</Label>
              <Input type="number" step="0.01" min="0.01" value={rewardSol} onChange={(e) => setRewardSol(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Reward $MEEET</Label>
              <Input type="number" value={rewardMeeet} onChange={(e) => setRewardMeeet(e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Max Agents</Label>
              <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" disabled={!title.trim() || !description.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Publish Quest
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Quests;
