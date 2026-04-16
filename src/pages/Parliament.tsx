import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Mail, Megaphone, Send, MessageSquare, ScrollText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Law = Tables<"laws">;
type Profile = Tables<"profiles">;
type Petition = Tables<"petitions">;

// ─── Hooks ──────────────────────────────────────────────────────
function useLaws() {
  return useQuery({
    queryKey: ["laws"],
    queryFn: async () => {
      const { data } = await supabase.from("laws").select("*").order("created_at", { ascending: false }).limit(50);
      return (data ?? []) as Law[];
    },
  });
}

function usePresident() {
  return useQuery({
    queryKey: ["president-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_president", true).maybeSingle();
      return data as Profile | null;
    },
  });
}

function usePresidentAgent() {
  return useQuery({
    queryKey: ["president-agent"],
    queryFn: async () => {
      const { data } = await supabase.from("agents_public").select("*").eq("class", "president").maybeSingle();
      return data;
    },
  });
}

function usePetitions() {
  return useQuery({
    queryKey: ["petitions"],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").order("created_at", { ascending: false }).limit(50);
      return (data ?? []) as Petition[];
    },
  });
}

function useDecrees() {
  return useQuery({
    queryKey: ["decrees"],
    queryFn: async () => {
      // Get presidential decrees from activity_feed AND petitions with presidential reply
      const [feedRes, petitionRes] = await Promise.all([
        supabase.from("activity_feed").select("*").eq("event_type", "broadcast").order("created_at", { ascending: false }).limit(20),
        supabase.from("petitions").select("*").not("reply", "is", null).order("replied_at", { ascending: false }).limit(10),
      ]);
      const decrees = feedRes.data ?? [];
      const repliedPetitions = (petitionRes.data ?? []).map((p: any) => ({
        id: `pet-${p.id}`,
        title: `Re: ${p.subject}`,
        description: p.reply,
        created_at: p.replied_at || p.created_at,
        event_type: "decree",
      }));
      return [...decrees, ...repliedPetitions].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });
}

const LAW_STATUS: Record<string, { bg: string; label: string }> = {
  proposed: { bg: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Proposed" },
  voting:   { bg: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Voting" },
  passed:   { bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Passed" },
  rejected: { bg: "bg-red-500/15 text-red-400 border-red-500/20", label: "Rejected" },
  vetoed:   { bg: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", label: "Vetoed" },
};

const PETITION_STATUS: Record<string, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Pending" },
  replied: { bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Replied" },
  read:    { bg: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Read" },
};

function getTimeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Vote Bar ───────────────────────────────────────────────────
function VoteBar({ yes, no }: { yes: number; no: number }) {
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${yesPct}%` }} />
        <div className="h-full bg-red-500 transition-all" style={{ width: `${noPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-body text-muted-foreground">
        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-emerald-400" /> YES {yesPct}% ({yes})</span>
        <span className="flex items-center gap-1">NO {noPct}% ({no}) <ThumbsDown className="w-3 h-3 text-red-400" /></span>
      </div>
    </div>
  );
}

// ─── Law Card ───────────────────────────────────────────────────
function LawCard({ law, onVote, voting }: { law: Law; onVote?: (id: string, v: boolean) => void; voting?: boolean }) {
  const s = LAW_STATUS[law.status] || LAW_STATUS.proposed;
  const isActive = law.status === "proposed" || law.status === "voting";
  const endsAt = law.voting_ends_at ? new Date(law.voting_ends_at) : null;
  const hoursLeft = endsAt ? Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 3600000)) : null;

  return (
    <Card className="border-border bg-card/80">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-[10px] capitalize ${s.bg}`}>{s.label}</Badge>
              {law.stake_meeet && (
                <span className="text-[10px] text-amber-400 font-body flex items-center gap-0.5">
                  <Flame className="w-3 h-3" /> {Number(law.stake_meeet)} $M
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-sm">{law.title}</h3>
            <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{law.description}</p>
          </div>
          {hoursLeft !== null && isActive && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-body whitespace-nowrap">
              <Clock className="w-3 h-3" /> {hoursLeft}h
            </span>
          )}
        </div>

        <VoteBar yes={Number(law.votes_yes ?? 0)} no={Number(law.votes_no ?? 0)} />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
            <Users className="w-3 h-3" /> {law.voter_count ?? 0} voters · Quorum {law.quorum ?? 50}
          </span>
          {isActive && onVote && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={voting} className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onVote(law.id, true)}>
                <ThumbsUp className="w-3 h-3" /> Yes
              </Button>
              <Button size="sm" variant="outline" disabled={voting} className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => onVote(law.id, false)}>
                <ThumbsDown className="w-3 h-3" /> No
              </Button>
            </div>
          )}
        </div>

        {law.status === "vetoed" && law.veto_reason && (
          <div className="rounded-lg bg-muted/30 p-2 flex items-start gap-2">
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

// ─── Submit Petition Dialog ─────────────────────────────────────
function SubmitPetitionDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-petition", {
        body: { subject: subject.trim(), message: message.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petitions"] });
      toast({ title: "📜 Petition sent!", description: "The President will review your petition." });
      setOpen(false);
      setSubject("");
      setMessage("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-xs">
          <Mail className="w-3.5 h-3.5" /> Submit Petition
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" /> Petition the President
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body text-xs">Subject</Label>
            <Input placeholder="What is your petition about?" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="font-body text-xs">Message</Label>
            <Textarea placeholder="Describe your request or concern..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} className="bg-background min-h-[120px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" disabled={!subject.trim() || !message.trim() || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Petition
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Propose Law Dialog ─────────────────────────────────────────
function ProposeLawDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const mut = useMutation({
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
      qc.invalidateQueries({ queryKey: ["laws"] });
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
      <DialogContent className="border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Propose New Law
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex items-center gap-2 text-xs text-amber-400 font-body">
            <Flame className="w-4 h-4 shrink-0" />
            Requires staking <span className="font-bold">100 $MEEET</span>. Returned if law passes.
          </div>
          <div className="space-y-2">
            <Label className="font-body text-xs">Title</Label>
            <Input placeholder="e.g. Lower territory tax to 3%" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="font-body text-xs">Description</Label>
            <Textarea placeholder="Explain the rationale..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="bg-background min-h-[100px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" disabled={!title.trim() || !description.trim() || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gavel className="w-4 h-4 mr-2" />}
              Submit & Stake 100 $M
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
const Parliament = () => {
  const { user } = useAuth();
  const { data: laws = [], isLoading: lawsLoading } = useLaws();
  const { data: president } = usePresident();
  const { data: presAgent } = usePresidentAgent();
  const { data: petitions = [] } = usePetitions();
  const { data: decrees = [] } = useDecrees();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [votingId, setVotingId] = useState<string | null>(null);

  const activeLaws = laws.filter(l => l.status === "proposed" || l.status === "voting");
  const pastLaws = laws.filter(l => l.status === "passed" || l.status === "rejected" || l.status === "vetoed");

  const handleVote = async (lawId: string, vote: boolean) => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    setVotingId(lawId);
    try {
      // Fetch fresh law data to avoid stale state
      const { data: freshLaw, error: fetchErr } = await supabase
        .from("laws")
        .select("id, votes_yes, votes_no, voter_count, quorum, threshold_pct, status")
        .eq("id", lawId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!freshLaw) throw new Error("Law not found");

      const newYes = vote ? (Number(freshLaw.votes_yes) || 0) + 1 : Number(freshLaw.votes_yes) || 0;
      const newNo = vote ? Number(freshLaw.votes_no) || 0 : (Number(freshLaw.votes_no) || 0) + 1;
      const newVoterCount = (Number(freshLaw.voter_count) || 0) + 1;

      const quorum = freshLaw.quorum ?? 50;
      const threshold = Number(freshLaw.threshold_pct) || 66;
      const totalVotes = newYes + newNo;
      const yesPct = totalVotes > 0 ? (newYes / totalVotes) * 100 : 0;
      const shouldPass = newVoterCount >= quorum && yesPct >= threshold;
      const shouldReject = newVoterCount >= quorum && yesPct < threshold && totalVotes >= quorum;

      const updates: Record<string, any> = {
        votes_yes: newYes,
        votes_no: newNo,
        voter_count: newVoterCount,
      };
      if (shouldPass) updates.status = "passed";
      else if (shouldReject) updates.status = "rejected";

      const { error } = await supabase.from("laws").update(updates).eq("id", lawId);
      if (error) throw error;

      toast({ title: vote ? "Voted YES ✅" : "Voted NO ❌", description: shouldPass ? "Law has passed! 🎉" : shouldReject ? "Law rejected." : undefined });
      qc.invalidateQueries({ queryKey: ["laws"] });
    } catch (e: any) {
      toast({ title: "Vote error", description: e.message || "Could not record vote", variant: "destructive" });
    }
    setVotingId(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Landmark className="w-7 h-7 text-primary" />
                <h1 className="text-3xl md:text-4xl font-display font-bold">Parliament</h1>
              </div>
              <p className="text-muted-foreground text-sm font-body">Governance of MEEET State — propose, vote, petition, enforce.</p>
            </div>
            <div className="flex items-center gap-2">
              <SubmitPetitionDialog />
              {user && <ProposeLawDialog userId={user.id} />}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content — 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Laws */}
              <Tabs defaultValue="active">
                <TabsList className="bg-muted/50 border border-border rounded-xl p-1">
                  <TabsTrigger value="active" className="rounded-lg text-xs font-display data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
                    Active ({activeLaws.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-lg text-xs font-display data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
                    History ({pastLaws.length})
                  </TabsTrigger>
                  <TabsTrigger value="petitions" className="rounded-lg text-xs font-display data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
                    Petitions ({petitions.length})
                  </TabsTrigger>
                  <TabsTrigger value="decrees" className="rounded-lg text-xs font-display data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
                    Decrees ({decrees.length})
                  </TabsTrigger>
                </TabsList>

                {/* Active Laws */}
                <TabsContent value="active" className="mt-4 space-y-3">
                  {lawsLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : activeLaws.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card/50 p-12 text-center">
                      <Scale className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No active laws. Be the first to propose one!</p>
                    </div>
                  ) : (
                    activeLaws.map(l => <LawCard key={l.id} law={l} onVote={handleVote} voting={votingId === l.id} />)
                  )}
                </TabsContent>

                {/* History */}
                <TabsContent value="history" className="mt-4 space-y-3">
                  {pastLaws.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card/50 p-12 text-center">
                      <p className="text-muted-foreground font-body text-sm">No past laws yet.</p>
                    </div>
                  ) : (
                    pastLaws.map(l => <LawCard key={l.id} law={l} />)
                  )}
                </TabsContent>

                {/* Petitions */}
                <TabsContent value="petitions" className="mt-4 space-y-3">
                  {petitions.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card/50 p-12 text-center">
                      <Mail className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No petitions yet. Submit one to the President!</p>
                    </div>
                  ) : (
                    petitions.map((p) => {
                      const ps = PETITION_STATUS[p.status] || PETITION_STATUS.pending;
                      return (
                        <Card key={p.id} className="border-border bg-card/80">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] ${ps.bg}`}>{ps.label}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{getTimeAgo(p.created_at)}</span>
                                </div>
                                <h4 className="font-display font-bold text-sm">{p.subject}</h4>
                                <p className="text-xs text-muted-foreground font-body mt-1">{p.message}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1 font-body">— {p.sender_name}</p>
                              </div>
                            </div>
                            {p.reply && (
                              <div className="mt-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span className="text-[10px] font-display font-bold text-amber-400">Presidential Reply</span>
                                  {p.replied_at && <span className="text-[10px] text-muted-foreground/50 ml-auto">{getTimeAgo(p.replied_at)}</span>}
                                </div>
                                <p className="text-xs text-foreground/80 font-body">{p.reply}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                {/* Decrees */}
                <TabsContent value="decrees" className="mt-4 space-y-3">
                  {decrees.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card/50 p-12 text-center">
                      <Megaphone className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No presidential decrees yet.</p>
                    </div>
                  ) : (
                    decrees.map((d: any) => (
                      <Card key={d.id} className="border-amber-500/10 bg-amber-950/5">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                              <Megaphone className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-display font-bold text-sm">{d.title}</span>
                                <span className="text-[10px] text-muted-foreground">{getTimeAgo(d.created_at)}</span>
                              </div>
                              {d.description && (
                                <p className="text-xs text-muted-foreground font-body">{d.description}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* President Card */}
              <Card className="border-primary/20 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" /> President's Office
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {president ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                          👑
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm">{president.display_name || "The President"}</p>
                          <p className="text-[10px] text-muted-foreground font-body">@{president.twitter_handle || president.username || "president"}</p>
                          <Badge variant="outline" className="text-[9px] mt-1 bg-amber-500/10 text-amber-400 border-amber-500/20 capitalize">
                            {president.passport_tier === "resident" ? "Commander-in-Chief" : (president.passport_tier || "elite")}
                          </Badge>
                        </div>
                      </div>
                      {/* President's Agent Stats */}
                      {presAgent && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { label: "Level", value: presAgent.level },
                            { label: "XP", value: Number(presAgent.xp).toLocaleString() },
                            { label: "Kills", value: presAgent.kills },
                            { label: "$MEEET", value: Number(presAgent.balance_meeet).toLocaleString() },
                            { label: "Quests", value: presAgent.quests_completed },
                            { label: "Rep", value: presAgent.reputation },
                          ].map(s => (
                            <div key={s.label} className="rounded-lg bg-muted/30 p-2 text-center">
                              <p className="text-sm font-display font-bold">{s.value}</p>
                              <p className="text-[9px] text-muted-foreground">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Crown className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground font-body">No president elected yet</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/20 p-3 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-body font-semibold">Powers:</p>
                    <ul className="text-[10px] text-muted-foreground font-body space-y-1">
                      <li className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-red-400" /> Veto any passed law</li>
                      <li className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-amber-400" /> 30% treasury income</li>
                      <li className="flex items-center gap-1.5"><Gavel className="w-3 h-3 text-primary" /> Set tax rates</li>
                      <li className="flex items-center gap-1.5"><Megaphone className="w-3 h-3 text-blue-400" /> Issue decrees</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Governance Stats */}
              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-display font-bold text-xs text-muted-foreground uppercase tracking-wider">Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total Laws", value: laws.length, color: "text-foreground" },
                      { label: "Passed", value: laws.filter(l => l.status === "passed").length, color: "text-emerald-400" },
                      { label: "Rejected", value: laws.filter(l => l.status === "rejected" || l.status === "vetoed").length, color: "text-red-400" },
                      { label: "Active", value: activeLaws.length, color: "text-amber-400" },
                      { label: "Petitions", value: petitions.length, color: "text-blue-400" },
                      { label: "Decrees", value: decrees.length, color: "text-amber-400" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg bg-muted/20 p-3 text-center">
                        <p className={`text-lg font-display font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
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
