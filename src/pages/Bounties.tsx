import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Clock, Users, Award, CheckCircle, AlertCircle, Timer, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";

interface Bounty {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  reward_amount: number;
  deadline: string;
  status: string;
  submissions_count: number;
  creator: string;
  creator_avatar: string;
  requirements?: string;
}

const MOCK_BOUNTIES: Bounty[] = [
  { id: "b1", title: "Climate Data Research Agent", description: "Build an AI agent that aggregates and analyzes global climate datasets, generating weekly reports on temperature anomalies and carbon emission patterns.", category: "research", difficulty: "medium", reward_amount: 3000, deadline: "2026-05-01", status: "open", submissions_count: 2, creator: "Dr. Nova", creator_avatar: "DN", requirements: "Must integrate with at least 3 public climate APIs\nGenerate visualizable data outputs\nProvide confidence scores for predictions\nSupport natural language queries" },
  { id: "b2", title: "Cross-Chain Bridge Monitor", description: "Develop a security monitoring agent that tracks cross-chain bridge transactions in real-time, detecting suspicious patterns and potential exploits.", category: "security", difficulty: "expert", reward_amount: 8000, deadline: "2026-05-15", status: "open", submissions_count: 0, creator: "SecureDAO", creator_avatar: "SD" },
  { id: "b3", title: "Social Media Sentiment Analyzer", description: "Create an agent that monitors social media platforms for crypto/AI sentiment, providing hourly sentiment scores and trend alerts.", category: "analysis", difficulty: "easy", reward_amount: 2000, deadline: "2026-04-20", status: "completed", submissions_count: 4, creator: "DataHive", creator_avatar: "DH" },
  { id: "b4", title: "Academic Paper Summarizer", description: "Build an agent that scans arXiv daily for AI/ML papers, generates concise summaries, and identifies breakthrough findings relevant to agent research.", category: "research", difficulty: "easy", reward_amount: 1500, deadline: "2026-04-25", status: "open", submissions_count: 5, creator: "ResearchBot", creator_avatar: "RB" },
  { id: "b5", title: "Smart Contract Vulnerability Scanner", description: "Develop an AI agent capable of analyzing Solana smart contracts for common vulnerability patterns, generating security audit reports.", category: "security", difficulty: "expert", reward_amount: 10000, deadline: "2026-06-01", status: "in_progress", submissions_count: 1, creator: "AuditPrime", creator_avatar: "AP" },
  { id: "b6", title: "AI-Generated Art Curator", description: "Create an agent that curates and rates AI-generated artwork, building collections based on style, quality, and originality metrics.", category: "creative", difficulty: "medium", reward_amount: 1000, deadline: "2026-05-10", status: "open", submissions_count: 0, creator: "ArtisanAI", creator_avatar: "AA" },
  { id: "b7", title: "Tokenomics Optimizer", description: "Build an agent that simulates token economic models, testing various supply/demand scenarios and recommending optimal distribution strategies.", category: "development", difficulty: "hard", reward_amount: 5000, deadline: "2026-05-20", status: "under_review", submissions_count: 3, creator: "EconLab", creator_avatar: "EL" },
  { id: "b8", title: "Real-time News Aggregator", description: "Develop an agent that aggregates news from 50+ sources, classifying by relevance to AI/crypto sectors with real-time alerts.", category: "analysis", difficulty: "medium", reward_amount: 2500, deadline: "2026-05-05", status: "open", submissions_count: 0, creator: "InfoStream", creator_avatar: "IS" },
];

const CATEGORIES = ["all", "research", "development", "analysis", "creative", "security"];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hard: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  expert: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Open", color: "bg-emerald-500/20 text-emerald-400", icon: <AlertCircle className="w-3 h-3" /> },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: <Timer className="w-3 h-3" /> },
  under_review: { label: "Under Review", color: "bg-amber-500/20 text-amber-400", icon: <Clock className="w-3 h-3" /> },
  completed: { label: "Completed", color: "bg-primary/20 text-primary", icon: <CheckCircle className="w-3 h-3" /> },
};

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

const BountyCard = ({ bounty }: { bounty: Bounty }) => {
  const st = STATUS_CONFIG[bounty.status] ?? STATUS_CONFIG.open;
  const days = daysUntil(bounty.deadline);
  return (
    <Link to={`/bounties/${bounty.id}`}>
      <Card className="bg-card/60 border-border/30 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${DIFFICULTY_COLORS[bounty.difficulty]}`}>{bounty.difficulty}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${st.color}`}>{st.icon}{st.label}</span>
          </div>
          <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2">{bounty.title}</h3>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">{bounty.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">{bounty.category}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{bounty.reward_amount.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">$MEEET</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{bounty.submissions_count}</span>
              {bounty.status !== "completed" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days}d</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">{bounty.creator_avatar}</div>
            <span className="text-[11px] text-muted-foreground">{bounty.creator}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const PostBountyModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [deadline, setDeadline] = useState<Date>();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Bounty posted successfully!");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border/40 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">Post a Bounty</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs font-medium text-muted-foreground">Title</label><Input placeholder="Bounty title..." className="mt-1 bg-background/50 border-border/30" required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Description</label><Textarea placeholder="Describe the task in detail..." className="mt-1 bg-background/50 border-border/30 min-h-[80px]" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select defaultValue="research"><SelectTrigger className="mt-1 bg-background/50 border-border/30"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.filter(c => c !== "all").map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select defaultValue="medium"><SelectTrigger className="mt-1 bg-background/50 border-border/30"><SelectValue /></SelectTrigger><SelectContent>{["easy","medium","hard","expert"].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Reward ($MEEET)</label><Input type="number" placeholder="1000" min={100} className="mt-1 bg-background/50 border-border/30" required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Deadline</label>
              <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("mt-1 w-full justify-start text-left font-normal bg-background/50 border-border/30", !deadline && "text-muted-foreground")}>{deadline ? format(deadline, "PPP") : "Pick date"}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={deadline} onSelect={setDeadline} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Requirements</label><Textarea placeholder="List requirements, one per line..." className="mt-1 bg-background/50 border-border/30 min-h-[60px]" /></div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Post Bounty</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Bounties = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_BOUNTIES.filter(b => {
      if (category !== "all" && b.category !== category) return false;
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, category]);

  const totalRewards = MOCK_BOUNTIES.reduce((s, b) => s + (b.status !== "completed" ? b.reward_amount : 0), 0);
  const completedThisWeek = MOCK_BOUNTIES.filter(b => b.status === "completed").length;
  const activeBounties = MOCK_BOUNTIES.filter(b => b.status === "open" || b.status === "in_progress").length;

  return (
    <>
      <SEOHead title="Bounty Board — MEEET STATE" description="Post tasks, build agents, and earn $MEEET rewards on the MEEET STATE Bounty Board." />
      <Navbar />
      <div className="min-h-screen bg-background pt-20 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Bounty Board</h1>
            <p className="text-muted-foreground mt-2">Post tasks. Build agents. Earn $MEEET.</p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Active Bounties", value: activeBounties, icon: <AlertCircle className="w-4 h-4 text-primary" /> },
              { label: "MEEET in Rewards", value: totalRewards.toLocaleString(), icon: <Award className="w-4 h-4 text-primary" /> },
              { label: "Completed This Week", value: completedThisWeek, icon: <CheckCircle className="w-4 h-4 text-primary" /> },
            ].map(s => (
              <Card key={s.label} className="bg-card/60 border-border/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">{s.icon}</div>
                  <div><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search + Post */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search bounties..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
            </div>
            <Button onClick={() => setModalOpen(true)} className="bg-primary hover:bg-primary/90 gap-2"><Plus className="w-4 h-4" />Post a Bounty</Button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${category === c ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground hover:text-foreground"}`}>{c === "all" ? "All" : c}</button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => <BountyCard key={b.id} bounty={b} />)}
          </div>
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No bounties found matching your filters.</p>}
        </div>
      </div>
      <PostBountyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default Bounties;
