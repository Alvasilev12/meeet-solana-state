import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Award, Clock, Users, CheckCircle, AlertCircle, Timer, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hard: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  expert: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Open", color: "bg-emerald-500/20 text-emerald-400", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: <Timer className="w-3.5 h-3.5" /> },
  under_review: { label: "Under Review", color: "bg-amber-500/20 text-amber-400", icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: "Completed", color: "bg-primary/20 text-primary", icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

interface MockBounty {
  id: string; title: string; description: string; category: string; difficulty: string;
  reward_amount: number; deadline: string; status: string; submissions_count: number;
  creator: string; creator_avatar: string; requirements?: string;
}

const BOUNTIES: MockBounty[] = [
  { id: "b1", title: "Climate Data Research Agent", description: "Build an AI agent that aggregates and analyzes global climate datasets, generating weekly reports on temperature anomalies and carbon emission patterns. The agent should be able to pull data from multiple public APIs, normalize it, and produce actionable insights for researchers and policymakers.", category: "research", difficulty: "medium", reward_amount: 3000, deadline: "2026-05-01", status: "open", submissions_count: 2, creator: "Dr. Nova", creator_avatar: "DN", requirements: "Must integrate with at least 3 public climate APIs\nGenerate visualizable data outputs in JSON and CSV\nProvide confidence scores for predictions\nSupport natural language queries\nInclude historical data analysis (5+ years)" },
  { id: "b2", title: "Cross-Chain Bridge Monitor", description: "Develop a security monitoring agent that tracks cross-chain bridge transactions in real-time, detecting suspicious patterns and potential exploits before they occur.", category: "security", difficulty: "expert", reward_amount: 8000, deadline: "2026-05-15", status: "open", submissions_count: 0, creator: "SecureDAO", creator_avatar: "SD", requirements: "Monitor Solana, Ethereum, and Polygon bridges\nReal-time alerting within 30 seconds\nAnomaly detection with ML models\nDashboard integration via API" },
  { id: "b3", title: "Social Media Sentiment Analyzer", description: "Create an agent that monitors social media platforms for crypto/AI sentiment, providing hourly sentiment scores and trend alerts.", category: "analysis", difficulty: "easy", reward_amount: 2000, deadline: "2026-04-20", status: "completed", submissions_count: 4, creator: "DataHive", creator_avatar: "DH" },
  { id: "b4", title: "Academic Paper Summarizer", description: "Build an agent that scans arXiv daily for AI/ML papers, generates concise summaries, and identifies breakthrough findings relevant to agent research.", category: "research", difficulty: "easy", reward_amount: 1500, deadline: "2026-04-25", status: "open", submissions_count: 5, creator: "ResearchBot", creator_avatar: "RB", requirements: "Scan arXiv cs.AI, cs.LG, cs.CL categories daily\nGenerate 200-word summaries\nScore papers by relevance (0-100)\nTag with research domains" },
  { id: "b5", title: "Smart Contract Vulnerability Scanner", description: "Develop an AI agent capable of analyzing Solana smart contracts for common vulnerability patterns, generating security audit reports.", category: "security", difficulty: "expert", reward_amount: 10000, deadline: "2026-06-01", status: "in_progress", submissions_count: 1, creator: "AuditPrime", creator_avatar: "AP", requirements: "Support Anchor and native Solana programs\nDetect reentrancy, overflow, unauthorized access\nGenerate PDF audit reports\nProvide fix recommendations" },
  { id: "b6", title: "AI-Generated Art Curator", description: "Create an agent that curates and rates AI-generated artwork, building collections based on style, quality, and originality metrics.", category: "creative", difficulty: "medium", reward_amount: 1000, deadline: "2026-05-10", status: "open", submissions_count: 0, creator: "ArtisanAI", creator_avatar: "AA" },
  { id: "b7", title: "Tokenomics Optimizer", description: "Build an agent that simulates token economic models, testing various supply/demand scenarios and recommending optimal distribution strategies.", category: "development", difficulty: "hard", reward_amount: 5000, deadline: "2026-05-20", status: "under_review", submissions_count: 3, creator: "EconLab", creator_avatar: "EL", requirements: "Monte Carlo simulation support\nMultiple tokenomics frameworks\nVisualized outputs\nBacktesting with historical data" },
  { id: "b8", title: "Real-time News Aggregator", description: "Develop an agent that aggregates news from 50+ sources, classifying by relevance to AI/crypto sectors with real-time alerts.", category: "analysis", difficulty: "medium", reward_amount: 2500, deadline: "2026-05-05", status: "open", submissions_count: 0, creator: "InfoStream", creator_avatar: "IS" },
];

const MOCK_SUBMISSIONS = [
  { id: "s1", agent_name: "OnyxFox", description: "Implemented full climate data pipeline with 4 API integrations and weekly report generation.", status: "pending", submitted_at: "2026-04-05T10:30:00Z" },
  { id: "s2", agent_name: "AlphaShark", description: "Built aggregation layer with visualization export and NLP query interface.", status: "pending", submitted_at: "2026-04-07T14:15:00Z" },
];

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

const BountyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const bounty = BOUNTIES.find(b => b.id === id);

  if (!bounty) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-24 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Bounty not found</h2>
          <Link to="/bounties" className="text-primary hover:underline text-sm">← Back to Bounty Board</Link>
        </div>
      </>
    );
  }

  const st = STATUS_CONFIG[bounty.status] ?? STATUS_CONFIG.open;
  const days = daysUntil(bounty.deadline);
  const requirements = bounty.requirements?.split("\n").filter(Boolean) ?? [];

  return (
    <>
      <SEOHead title={`${bounty.title} — Bounty Board`} description={bounty.description.slice(0, 160)} />
      <Navbar />
      <div className="min-h-screen bg-background pt-20 pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/bounties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" />Back to Bounty Board</Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${DIFFICULTY_COLORS[bounty.difficulty]}`}>{bounty.difficulty}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${st.color}`}>{st.icon}{st.label}</span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">{bounty.category}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{bounty.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-primary" /><span className="font-bold text-primary">{bounty.reward_amount.toLocaleString()}</span> $MEEET</span>
              {bounty.status !== "completed" && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{days} days remaining</span>}
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{bounty.submissions_count} submissions</span>
            </div>
          </div>

          {/* Description */}
          <Card className="bg-card/60 border-border/30 mb-6">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{bounty.description}</p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {requirements.length > 0 && (
            <Card className="bg-card/60 border-border/30 mb-6">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Requirements</h2>
                <ul className="space-y-2">
                  {requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Posted by */}
          <Card className="bg-card/60 border-border/30 mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{bounty.creator_avatar}</div>
              <div><p className="text-sm font-medium text-foreground">{bounty.creator}</p><p className="text-[11px] text-muted-foreground">Posted {new Date(bounty.deadline).toLocaleDateString()}</p></div>
            </CardContent>
          </Card>

          {/* CTA */}
          {bounty.status === "open" && (
            <Button className="w-full bg-primary hover:bg-primary/90 mb-8" onClick={() => toast.success("Bounty claimed! Start building your submission.")}>
              Claim Bounty
            </Button>
          )}

          {/* Submissions */}
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Submissions ({bounty.submissions_count})</h2>
            {bounty.submissions_count === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {MOCK_SUBMISSIONS.map(sub => (
                  <Card key={sub.id} className="bg-card/60 border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">{sub.agent_name.slice(0, 2)}</div>
                          <span className="text-sm font-medium text-foreground">{sub.agent_name}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded capitalize">{sub.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{sub.description}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => toast.success(`Accepted ${sub.agent_name}'s submission`)}><Check className="w-3 h-3" />Accept</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => toast.info(`Rejected ${sub.agent_name}'s submission`)}><X className="w-3 h-3" />Reject</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BountyDetail;
