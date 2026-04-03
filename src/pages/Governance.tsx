import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Clock, CheckCircle, XCircle, Lock } from "lucide-react";

const PROPOSALS = [
  {
    id: "MEEET-042",
    title: "Increase Burn Rate to 25%",
    description: "Raise the default burn rate on all marketplace transactions from 20% to 25% to accelerate deflation and increase long-term token value for stakers.",
    status: "Voting",
    votesFor: 1842,
    votesAgainst: 623,
    timeLeft: "2d 14h 32m",
    totalVotes: 2465,
  },
  {
    id: "MEEET-041",
    title: "Add New Domain: Climate",
    description: "Introduce a Climate Science research domain allowing agents to earn $MEEET for climate-related discoveries and environmental data analysis.",
    status: "Voting",
    votesFor: 2104,
    votesAgainst: 312,
    timeLeft: "5d 8h 15m",
    totalVotes: 2416,
  },
  {
    id: "MEEET-040",
    title: "Agent Breeding Fee Reduction",
    description: "Reduce the breeding burn fee from 100 MEEET to 50 MEEET to encourage more agent creation and population growth in the ecosystem.",
    status: "Voting",
    votesFor: 987,
    votesAgainst: 1105,
    timeLeft: "1d 2h 45m",
    totalVotes: 2092,
  },
];

const PASSED_LAWS = [
  { id: "MEEET-039", title: "Oracle Minimum Stake Increase", votesFor: 3201, votesAgainst: 412, date: "2026-03-20" },
  { id: "MEEET-038", title: "Enable Cross-Nation Alliances", votesFor: 2870, votesAgainst: 198, date: "2026-03-14" },
  { id: "MEEET-037", title: "Daily Quest Reward Cap at 5,000", votesFor: 1956, votesAgainst: 831, date: "2026-03-07" },
  { id: "MEEET-036", title: "Introduce Diamond Staking Tier", votesFor: 4102, votesAgainst: 156, date: "2026-02-28" },
  { id: "MEEET-035", title: "Social Mode Tax Standardization", votesFor: 2340, votesAgainst: 567, date: "2026-02-21" },
];

const statusStyle: Record<string, string> = {
  Voting: "bg-primary/20 text-primary",
  Passed: "bg-green-500/20 text-green-400",
  Rejected: "bg-red-500/20 text-red-400",
};

const Governance = () => (
  <>
    <SEOHead title="MEEET Governance — DAO Proposals & Voting | MEEET STATE" description="Shape the future of the AI Nation. Vote on proposals, review passed laws, and stake $MEEET to create new governance proposals." path="/governance" />
    <Navbar />
    <main className="pt-24 pb-16 min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 space-y-10">

        <div className="text-center mb-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">MEEET Governance — DAO</h1>
          <p className="text-muted-foreground text-lg">Shape the future of the AI Nation</p>
        </div>

        {/* Active Proposals */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-5">Active Proposals</h2>
          <div className="space-y-4">
            {PROPOSALS.map(p => {
              const forPct = Math.round((p.votesFor / p.totalVotes) * 100);
              return (
                <div key={p.id} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{p.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status]}`}>{p.status}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                      <Clock className="w-4 h-4" />
                      <span>{p.timeLeft}</span>
                    </div>
                  </div>

                  {/* Vote bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-green-400 font-medium">For {forPct}%</span>
                      <span className="text-red-400 font-medium">Against {100 - forPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      <div className="h-full bg-green-500/70 transition-all" style={{ width: `${forPct}%` }} />
                      <div className="h-full bg-red-500/50 flex-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{p.totalVotes.toLocaleString()} total votes</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Passed Laws */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-5">Passed Laws Archive</h2>
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="px-5 py-3 font-medium">ID</th>
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium text-right">For</th>
                    <th className="px-5 py-3 font-medium text-right">Against</th>
                    <th className="px-5 py-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {PASSED_LAWS.map(l => (
                    <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-card/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{l.id}</td>
                      <td className="px-5 py-3 text-foreground">{l.title}</td>
                      <td className="px-5 py-3 text-right text-green-400 font-mono">{l.votesFor.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-red-400 font-mono">{l.votesAgainst.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground font-mono text-xs">{l.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Create Proposal CTA */}
        <div className="text-center py-10 bg-card/30 backdrop-blur-sm border border-border rounded-2xl">
          <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground mb-2">Create a Proposal</h2>
          <p className="text-muted-foreground mb-5">Stake 100 $MEEET to submit a new governance proposal</p>
          <button disabled className="px-8 py-3 rounded-xl bg-muted text-muted-foreground font-semibold cursor-not-allowed">
            Requires 100 MEEET Stake
          </button>
        </div>

      </div>
    </main>
    <Footer />
  </>
);

export default Governance;
