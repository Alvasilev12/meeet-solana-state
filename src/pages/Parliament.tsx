import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Landmark, Crown, Scale, ThumbsUp, ThumbsDown,
  Plus, Clock, Users, Flame, ShieldAlert, Gavel,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Law = Tables<"laws">;
type Profile = Tables<"profiles">;

const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  proposed: { bg: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Proposed" },
  voting:   { bg: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Voting" },
  passed:   { bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Passed" },
  rejected: { bg: "bg-red-500/15 text-red-400 border-red-500/20", label: "Rejected" },
  vetoed:   { bg: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", label: "Vetoed" },
};

function useLaws() {
  return useQuery({
    queryKey: ["laws"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laws")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Law[];
    },
  });
}

function usePresident() {
  return useQuery({
    queryKey: ["president"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_president", true)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

// ─── Vote Bar ───────────────────────────────────────────────────
function VoteBar({ yes, no }: { yes: number; no: number }) {
  const total = yes + no || 1;
  const yesPct = Math.round((yes / total) * 100);
  const noPct = 100 - yesPct;

  return (
    <div className="space-y-1.5">
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${yesPct}%` }} />
        <div className="h-full bg-red-500 transition-all" style={{ width: `${noPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-body text-muted-foreground">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-emerald-400" /> YES {yesPct}% ({yes})
        </span>
        <span className="flex items-center gap-1">
          NO {noPct}% ({no}) <ThumbsDown className="w-3 h-3 text-red-400" />
        </span>
      </div>
    </div>
  );
}

// ─── Law Card ───────────────────────────────────────────────────
function LawCard({ law, onVote }: { law: Law; onVote?: (lawId: string, vote: boolean) => void }) {
  const s = STATUS_STYLE[law.status] || STATUS_STYLE.proposed;
  const isActive = law.status === "proposed" || law.status === "voting";
  const endsAt = law.voting_ends_at ? new Date(law.voting_ends_at) : null;
  const hoursLeft = endsAt ? Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 3600000)) : null;

  return (
    <Card className="glass-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-[10px] capitalize ${s.bg}`}>{s.label}</Badge>
              {law.stake_meeet && (
                <span className="text-[10px] text-amber-400 font-body flex items-center gap-0.5">
                  <Flame className="w-3 h-3" /> {Number(law.stake_meeet)} $M staked
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-sm">{law.title}</h3>
            <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{law.description}</p>
          </div>
          {hoursLeft !== null && isActive && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-body whitespace-nowrap">
              <Clock className="w-3 h-3" /> {hoursLeft}h left
            </div>
          )}
        </div>

        <VoteBar yes={Number(law.votes_yes ?? 0)} no={Number(law.votes_no ?? 0)} />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
            <Users className="w-3 h-3" /> {law.voter_count ?? 0} voters · Quorum {law.quorum ?? 50}
          </span>
          {isActive && onVote && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onVote(law.id, true)}>
                <ThumbsUp className="w-3 h-3" /> Yes
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => onVote(law.id, false)}>
                <ThumbsDown className="w-3 h-3" /> No
              </Button>
            </div>
          )}
        </div>

        {law.status === "vetoed" && law.veto_reason && (
          <div className="glass-card rounded-lg p-2 flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground font-body">
              <span className="text-red-400 font-semibold">Vetoed:</span> {law.veto_reason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Propose Law Dialog ─────────────────────────────────────────
function ProposeLawDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("laws").insert({
        proposer_id: userId,
        title: title.trim(),
        description: description.trim(),
        stake_meeet: 100,
        status: "proposed",
        voting_ends_at: new Date(Date.now() + 72 * 3600000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laws"] });
      toast({ title: "Law proposed!", description: "100 $MEEET staked. Voting begins." });
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
          <Plus className="w-4 h-4" /> Propose Law
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Propose New Law
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="glass-card rounded-lg p-3 flex items-center gap-2 text-xs text-amber-400 font-body">
            <Flame className="w-4 h-4 shrink-0" />
            Proposing a law requires staking <span className="font-bold">100 $MEEET</span>. Stake is returned if the law passes.
          </div>
          <div className="space-y-2">
            <Label className="font-body text-xs">Title</Label>
            <Input placeholder="e.g. Lower territory tax to 3%" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="font-body text-xs">Description</Label>
            <Textarea placeholder="Explain the rationale and impact of this law..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="bg-background min-h-[100px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" disabled={!title.trim() || !description.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gavel className="w-4 h-4 mr-2" />}
              Submit & Stake 100 $M
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const Parliament = () => {
  const { user } = useAuth();
  const { data: laws = [], isLoading } = useLaws();
  const { data: president } = usePresident();
  const { toast } = useToast();

  const activeLaws = laws.filter(l => l.status === "proposed" || l.status === "voting");
  const pastLaws = laws.filter(l => l.status === "passed" || l.status === "rejected" || l.status === "vetoed");

  const handleVote = async (lawId: string, vote: boolean) => {
    if (!user) {
      toast({ title: "Sign in required", description: "You need to sign in to vote.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("votes").insert({
      law_id: lawId,
      voter_id: user.id,
      vote,
    });
    if (error) {
      toast({ title: "Vote failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: vote ? "Voted YES ✅" : "Voted NO ❌" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Landmark className="w-7 h-7 text-primary" />
                <h1 className="text-3xl md:text-4xl font-display font-bold">Parliament</h1>
              </div>
              <p className="text-muted-foreground text-sm font-body">Governance of MEEET State — propose, vote, enforce.</p>
            </div>
            {user && <ProposeLawDialog userId={user.id} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs defaultValue="active">
                <TabsList className="bg-muted/50 border border-border rounded-xl p-1">
                  <TabsTrigger value="active" className="rounded-lg text-xs font-display data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
                    Active ({activeLaws.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-lg text-xs font-display data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
                    History ({pastLaws.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4 space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : activeLaws.length === 0 ? (
                    <div className="glass-card rounded-xl p-12 text-center">
                      <Scale className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No active laws. Be the first to propose one!</p>
                    </div>
                  ) : (
                    activeLaws.map(l => <LawCard key={l.id} law={l} onVote={handleVote} />)
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4 space-y-3">
                  {pastLaws.length === 0 ? (
                    <div className="glass-card rounded-xl p-12 text-center">
                      <p className="text-muted-foreground font-body text-sm">No past laws yet.</p>
                    </div>
                  ) : (
                    pastLaws.map(l => <LawCard key={l.id} law={l} />)
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* President's Office */}
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" /> President's Office
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {president ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                        👑
                      </div>
                      <div>
                        <p className="font-display font-bold text-sm">{president.display_name || "The President"}</p>
                        <p className="text-[10px] text-muted-foreground font-body">@{president.twitter_handle || president.username || "anon"}</p>
                        <Badge variant="outline" className="text-[9px] mt-1 bg-amber-500/10 text-amber-400 border-amber-500/20 capitalize">
                          {president.passport_tier || "elite"}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Crown className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground font-body">No president elected yet</p>
                    </div>
                  )}
                  <div className="glass-card rounded-lg p-3 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-body">Presidential powers:</p>
                    <ul className="text-[10px] text-muted-foreground font-body space-y-1">
                      <li className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-red-400" /> Veto any passed law</li>
                      <li className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-amber-400" /> 30% treasury income</li>
                      <li className="flex items-center gap-1.5"><Gavel className="w-3 h-3 text-primary" /> Set tax rates</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card className="glass-card border-border">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-display font-bold text-xs text-muted-foreground uppercase tracking-wider">Governance Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass-card rounded-lg p-3 text-center">
                      <p className="text-lg font-display font-bold text-foreground">{laws.length}</p>
                      <p className="text-[9px] text-muted-foreground">Total Laws</p>
                    </div>
                    <div className="glass-card rounded-lg p-3 text-center">
                      <p className="text-lg font-display font-bold text-emerald-400">{laws.filter(l => l.status === "passed").length}</p>
                      <p className="text-[9px] text-muted-foreground">Passed</p>
                    </div>
                    <div className="glass-card rounded-lg p-3 text-center">
                      <p className="text-lg font-display font-bold text-red-400">{laws.filter(l => l.status === "rejected" || l.status === "vetoed").length}</p>
                      <p className="text-[9px] text-muted-foreground">Rejected/Vetoed</p>
                    </div>
                    <div className="glass-card rounded-lg p-3 text-center">
                      <p className="text-lg font-display font-bold text-amber-400">{activeLaws.length}</p>
                      <p className="text-[9px] text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Parliament;
