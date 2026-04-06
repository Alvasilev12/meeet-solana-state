import { useEffect, useState } from "react";
import { Shield, TrendingUp, TrendingDown, Activity, BarChart3, Brain, Coins } from "lucide-react";

interface BayesianData {
  mu: number;
  sigma: number;
  n: number;
}

interface EconomicData {
  score: number;
  total_stakes: number;
  correct_stakes: number;
}

interface ReputationEvent {
  id: string;
  event_type: string;
  reputation_delta: number;
  reputation_before: number;
  reputation_after: number;
  bayesian_mu: number;
  economic_score: number;
  created_at: string;
}

interface ReputationData {
  bayesian: BayesianData;
  economic: EconomicData;
  social: { score: number };
  trust_score: number;
  aps_level: number;
  history: ReputationEvent[];
}

const APS_LABELS = ["Untrusted", "Observer", "Contributor", "Trusted"];
const APS_COLORS = ["text-red-400", "text-yellow-400", "text-blue-400", "text-green-400"];
const APS_BG = ["bg-red-500/20", "bg-yellow-500/20", "bg-blue-500/20", "bg-green-500/20"];

const EVENT_LABELS: Record<string, string> = {
  discovery_verified: "Discovery Verified",
  discovery_rejected: "Discovery Rejected",
  debate_won: "Debate Won",
  debate_lost: "Debate Lost",
  governance_vote: "Governance Vote",
  stake_slashed: "Stake Slashed",
  stake_rewarded: "Stake Rewarded",
};

export default function ReputationEngine({ agentId }: { agentId?: string }) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/reputation-engine/${agentId}`)
      .then((r) => r.json())
      .then((d) => { if (d.bayesian) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  // Fallback mock data if API fails
  const rep: ReputationData = data || {
    bayesian: { mu: 0.72, sigma: 0.15, n: 23 },
    economic: { score: 0.65, total_stakes: 150, correct_stakes: 98 },
    social: { score: 0.5 },
    trust_score: 0.63,
    aps_level: 2,
    history: [],
  };

  const apsLevel = rep.aps_level;
  const trustPct = Math.round(rep.trust_score * 100);
  const muPct = Math.round(rep.bayesian.mu * 100);
  const sigmaPct = Math.round(rep.bayesian.sigma * 100);
  const econPct = Math.round(rep.economic.score * 100);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combined Trust Score + APS Level */}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Trust Score & APS Level</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Trust gauge */}
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="url(#trustGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(trustPct / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`} />
              <defs>
                <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(150,80%,50%)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{trustPct}%</span>
              <span className="text-xs text-muted-foreground">Trust</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${APS_BG[apsLevel]} ${APS_COLORS[apsLevel]}`}>
                APS Level {apsLevel}
              </span>
              <span className="text-sm text-foreground font-medium">{APS_LABELS[apsLevel]}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Combined from Bayesian ({(rep.bayesian.mu * 0.4 * 100).toFixed(0)}%) + Economic ({(rep.economic.score * 0.4 * 100).toFixed(0)}%) + Social ({(rep.social.score * 0.2 * 100).toFixed(0)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Bayesian + Economic side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bayesian Score */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground text-sm">Bayesian Score</h4>
          </div>
          <div className="text-center mb-3">
            <span className="text-3xl font-bold text-foreground">{rep.bayesian.mu.toFixed(2)}</span>
            <span className="text-muted-foreground text-sm ml-1">± {rep.bayesian.sigma.toFixed(2)}</span>
          </div>
          {/* Mu bar with sigma range */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
            <div className="absolute h-full bg-primary/30 rounded-full"
              style={{ left: `${Math.max(0, muPct - sigmaPct)}%`, width: `${Math.min(100, sigmaPct * 2)}%` }} />
            <div className="absolute h-full w-1 bg-primary rounded-full" style={{ left: `${muPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>{rep.bayesian.n} observations</span>
            <span>1</span>
          </div>
        </div>

        {/* Economic Score */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground text-sm">Economic Score</h4>
          </div>
          <div className="text-center mb-3">
            <span className="text-3xl font-bold text-foreground">{econPct}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${econPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{rep.economic.correct_stakes} correct</span>
            <span>{rep.economic.total_stakes} total stakes (30d)</span>
          </div>
        </div>
      </div>

      {/* Reputation History Timeline */}
      {rep.history.length > 0 && (
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground text-sm">Reputation History</h4>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {rep.history.map((ev) => {
              const positive = ev.reputation_delta > 0;
              return (
                <div key={ev.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${positive ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    {positive ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{EVENT_LABELS[ev.event_type] || ev.event_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-mono text-xs font-bold ${positive ? "text-green-400" : "text-red-400"}`}>
                    {positive ? "+" : ""}{ev.reputation_delta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
