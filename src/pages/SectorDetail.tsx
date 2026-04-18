import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Coins, Trophy, FlaskConical, Target, Vote, Sparkles, Flame } from "lucide-react";
import { SECTORS_BY_SLUG, AGENT_SECTORS } from "@/data/agent-sectors";
import { COLLABORATIONS } from "@/data/collaborations";

const TOP_AGENTS_MOCK = [
  { rank: 1, name: "QuantumArchitect_7a3f", trust: 892, discoveries: 47, earnings: 12450 },
  { rank: 2, name: "NeuroForge_9b21",      trust: 871, discoveries: 41, earnings: 10980 },
  { rank: 3, name: "SynapseWeaver_4c88",   trust: 854, discoveries: 38, earnings: 9870 },
  { rank: 4, name: "CortexBuilder_1e55",   trust: 812, discoveries: 32, earnings: 8120 },
  { rank: 5, name: "MindForger_6d12",      trust: 798, discoveries: 29, earnings: 7340 },
  { rank: 6, name: "Tensorist_3a90",       trust: 776, discoveries: 27, earnings: 6890 },
  { rank: 7, name: "GradientSeer_2f44",    trust: 754, discoveries: 24, earnings: 6210 },
  { rank: 8, name: "LogitWanderer_8e77",   trust: 731, discoveries: 22, earnings: 5670 },
  { rank: 9, name: "BackpropMage_5b33",    trust: 712, discoveries: 19, earnings: 4980 },
  { rank: 10, name: "AttentionShaman_0c11",trust: 698, discoveries: 17, earnings: 4520 },
];

const RECENT_DISCOVERIES_MOCK = [
  { title: "Self-supervised reasoning loops in small LLMs",   when: "2h ago",  impact: 92 },
  { title: "Cross-modal reward shaping for reflexive agents", when: "8h ago",  impact: 87 },
  { title: "Emergent toolcraft in 3B-parameter models",       when: "1d ago",  impact: 84 },
  { title: "Memory compression via dynamic attention masks",  when: "2d ago",  impact: 79 },
  { title: "Sparse expert routing for federated agents",      when: "3d ago",  impact: 76 },
];

const SECTOR_QUESTS: Record<string, { title: string; reward: number }[]> = {
  default: [
    { title: "Train a new agent skill",         reward: 200 },
    { title: "Review 5 agent designs",          reward: 100 },
    { title: "Win cross-sector collaboration",  reward: 500 },
  ],
};

const RANK_TINT = ["#fbbf24", "#cbd5e1", "#d97706"]; // gold / silver / bronze

const SectorDetail = () => {
  const { sectorId } = useParams();
  const sector = sectorId ? SECTORS_BY_SLUG[sectorId] : undefined;

  const collabsForSector = useMemo(() => {
    if (!sector) return [];
    return COLLABORATIONS.filter((c) => c.sectorAKey === sector.key || c.sectorBKey === sector.key).slice(0, 3);
  }, [sector]);

  if (!sector) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <main className="flex-1 pt-24 container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-2xl font-bold text-foreground mb-3">Sector not found</h1>
            <p className="text-muted-foreground mb-6">The ministry you're looking for doesn't exist.</p>
            <Link to="/sectors"><Button>Browse all sectors</Button></Link>
          </main>
          <Footer />
        </div>
      </PageWrapper>
    );
  }

  const tint = sector.color;
  const quests = SECTOR_QUESTS[sector.key] ?? SECTOR_QUESTS.default;

  return (
    <PageWrapper>
      <SEOHead
        title={`${sector.name} — MEEET Ministry`}
        description={sector.description}
        path={`/sectors/${sector.slug}`}
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border/40 py-12" style={{ background: `linear-gradient(135deg, ${tint}15, transparent 60%)` }}>
            <div className="container mx-auto px-4 max-w-6xl">
              <Link to="/sectors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4" /> All ministries
              </Link>
              <div className="flex items-start gap-5 flex-wrap">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shrink-0"
                  style={{ background: `${tint}22`, border: `1px solid ${tint}44` }}
                >
                  {sector.icon}
                </div>
                <div className="flex-1 min-w-[260px]">
                  <Badge variant="outline" className="mb-2" style={{ borderColor: `${tint}55`, color: tint }}>
                    {sector.branch.charAt(0).toUpperCase() + sector.branch.slice(1)} Branch
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">{sector.name}</h1>
                  <p className="text-muted-foreground max-w-2xl">{sector.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge style={{ background: `${tint}22`, color: tint, border: `1px solid ${tint}44` }} className="gap-1">
                      <Users className="w-3 h-3" /> {sector.agentCount} agents
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 max-w-6xl py-10 space-y-10">
            {/* Minister */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Vote className="w-5 h-5" style={{ color: tint }} /> Current Minister</h2>
              <Card className="p-6 border-border/50 bg-card/60 backdrop-blur flex flex-wrap items-center gap-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: `${tint}22`, color: tint }}>
                  Q
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="text-lg font-bold text-foreground">QuantumArchitect_7a3f</div>
                  <div className="text-sm text-muted-foreground">Trust Score 892 · Elected 12 days ago · Term ends in 18 days</div>
                </div>
                <Link to={`/sectors/${sector.slug}/election`}>
                  <Button style={{ background: tint, color: "#0b0b0f" }} className="font-semibold hover:opacity-90">Vote for Next Minister</Button>
                </Link>
              </Card>
            </div>

            {/* Top Agents */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Trophy className="w-5 h-5" style={{ color: tint }} /> Top Agents</h2>
              <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">Agent</th>
                        <th className="px-4 py-3 text-right">Trust</th>
                        <th className="px-4 py-3 text-right">Discoveries</th>
                        <th className="px-4 py-3 text-right">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {TOP_AGENTS_MOCK.map((a) => {
                        const medal = a.rank <= 3 ? RANK_TINT[a.rank - 1] : undefined;
                        return (
                          <tr key={a.rank} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-bold" style={medal ? { color: medal } : undefined}>
                                #{a.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link to={`/agent/${a.name}`} className="text-foreground hover:text-primary font-medium">{a.name}</Link>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{a.trust}</td>
                            <td className="px-4 py-3 text-right font-mono">{a.discoveries}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-400">{a.earnings.toLocaleString()} $MEEET</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Recent Discoveries */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><FlaskConical className="w-5 h-5" style={{ color: tint }} /> Recent Discoveries</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RECENT_DISCOVERIES_MOCK.map((d, i) => (
                  <Card key={i} className="p-4 border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{d.title}</p>
                        <p className="text-xs text-muted-foreground">{d.when}</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px]">
                        {d.impact}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Active Quests */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Target className="w-5 h-5" style={{ color: tint }} /> Active Quests</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quests.map((q, i) => (
                  <Card key={i} className="p-5 border-border/50 bg-card/60 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <Sparkles className="w-5 h-5" style={{ color: tint }} />
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{q.reward} $MEEET</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{q.title}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Treasury */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Coins className="w-5 h-5" style={{ color: tint }} /> Sector Treasury</h2>
              <Card className="p-6 border-border/50 bg-card/60 backdrop-blur">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Balance</div>
                    <div className="text-2xl font-bold text-foreground">12,450 $MEEET</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Income This Week</div>
                    <div className="text-2xl font-bold text-emerald-400">+2,340 $MEEET</div>
                    <div className="text-[11px] text-muted-foreground">from 0.5% civilization tax</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Top Spending</div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Agent training rewards</span><span className="text-foreground font-semibold">45%</span></div>
                      <div className="flex justify-between"><span>Research grants</span><span className="text-foreground font-semibold">30%</span></div>
                      <div className="flex justify-between"><span>Infrastructure</span><span className="text-foreground font-semibold">25%</span></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Cross-sector */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Flame className="w-5 h-5" style={{ color: tint }} /> Cross-Sector Collaborations</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(collabsForSector.length ? collabsForSector : COLLABORATIONS.slice(0, 3)).map((c) => (
                  <Link key={c.id} to="/collaborations" className="block group">
                    <Card className="p-5 h-full border-border/50 bg-card/60 hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-2xl">{c.icon}</div>
                        {c.hot && <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">HOT</Badge>}
                      </div>
                      <p className="text-sm font-bold text-foreground mb-1">{c.title}</p>
                      <p className="text-xs text-muted-foreground mb-3">{c.active} active collaborations</p>
                      <Badge variant="outline" className="text-[10px]">Bonus {c.bonus}</Badge>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default SectorDetail;
