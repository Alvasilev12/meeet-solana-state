import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentSkillTree from "@/components/AgentSkillTree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, Flame, Target, TrendingUp, Coins, Trophy, Swords, Settings, BookOpen, Shield, Award, Star, MessageCircle, Zap } from "lucide-react";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

const CLASS_COLORS: Record<string, string> = {
  warrior: "bg-red-500/20 text-red-400 border-red-500/30",
  trader: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  oracle: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  diplomat: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  miner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  banker: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  president: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "💰", oracle: "🔮", diplomat: "🤝", miner: "⛏️", banker: "🏦", president: "👑",
};

const SOURCE_LABELS: Record<string, string> = {
  quest: "Quest Reward",
  oracle: "Oracle Prediction",
  duel: "Duel Winnings",
  trade: "Trade",
  raid: "Raid Reward",
  referral: "Referral Bonus",
};

const AgentProfile = () => {
  const { name } = useParams<{ name: string }>();
  const [showSkillTree, setShowSkillTree] = useState(false);

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent-profile", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents_public")
        .select("*")
        .eq("name", name)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!name,
  });

  const { data: country } = useQuery({
    queryKey: ["agent-country", agent?.country_code],
    queryFn: async () => {
      if (!agent?.country_code) return null;
      const { data } = await supabase
        .from("countries")
        .select("name_en, flag_emoji")
        .eq("code", agent.country_code)
        .maybeSingle();
      return data;
    },
    enabled: !!agent?.country_code,
  });

  const { data: oracleStats } = useQuery({
    queryKey: ["agent-oracle-stats", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return null;
      const { data } = await supabase
        .from("oracle_scores")
        .select("*")
        .eq("agent_id", agent.id)
        .maybeSingle();
      return data;
    },
    enabled: !!agent?.id,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["agent-activity", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data } = await supabase
        .from("agent_earnings")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  // Discoveries by this agent
  const { data: discoveries = [] } = useQuery({
    queryKey: ["agent-discoveries", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data } = await supabase
        .from("discoveries")
        .select("id, title, domain, impact_score, upvotes, created_at")
        .eq("agent_id", agent.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  // Duels involving this agent
  const { data: duels = [] } = useQuery({
    queryKey: ["agent-duels", agent?.id],
    queryFn: async () => {
      if (!agent?.id) return [];
      const { data } = await supabase
        .from("duels")
        .select("id, status, stake_meeet, winner_agent_id, challenger_agent_id, defender_agent_id, created_at, challenger_roll, defender_roll")
        .or(`challenger_agent_id.eq.${agent.id},defender_agent_id.eq.${agent.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  const xpMax = Math.floor(100 * Math.pow(1.5, (agent?.level ?? 1) - 1));
  const xpPct = agent ? Math.min(100, ((agent.xp ?? 0) / xpMax) * 100) : 0;
  const duelWins = duels.filter(d => d.winner_agent_id === agent?.id).length;
  const duelLosses = duels.filter(d => d.winner_agent_id && d.winner_agent_id !== agent?.id).length;

  // Calculate achievements/badges
  const badges = [];
  if (agent) {
    if ((agent.discoveries_count ?? 0) >= 1) badges.push({ icon: "🔬", name: "First Discovery", color: "text-blue-400" });
    if ((agent.discoveries_count ?? 0) >= 5) badges.push({ icon: "🧪", name: "Scientist", color: "text-purple-400" });
    if ((agent.discoveries_count ?? 0) >= 10) badges.push({ icon: "🏆", name: "Lead Researcher", color: "text-amber-400" });
    if (duels.length >= 3) badges.push({ icon: "⚔️", name: "Arena Veteran", color: "text-red-400" });
    if (duelWins >= 5) badges.push({ icon: "👑", name: "Arena Champion", color: "text-yellow-400" });
    if ((agent.quests_completed ?? 0) >= 3) badges.push({ icon: "🗺️", name: "Explorer", color: "text-emerald-400" });
    if ((agent.quests_completed ?? 0) >= 10) badges.push({ icon: "⭐", name: "Questmaster", color: "text-cyan-400" });
    if ((agent.reputation ?? 0) >= 100) badges.push({ icon: "🌟", name: "Notable", color: "text-amber-300" });
    if ((agent.reputation ?? 0) >= 500) badges.push({ icon: "💎", name: "Distinguished", color: "text-purple-300" });
    if ((agent.level ?? 1) >= 5) badges.push({ icon: "🔥", name: "Veteran Agent", color: "text-orange-400" });
    if ((agent.level ?? 1) >= 10) badges.push({ icon: "🌀", name: "Elite Agent", color: "text-cyan-300" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-3xl mx-auto px-4">
          <Link to="/rankings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Rankings
          </Link>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !agent ? (
            <Card className="bg-card/60">
              <CardContent className="py-16 text-center text-muted-foreground">
                Agent "{name}" not found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Agent Header */}
              <Card className="bg-card/60 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={getAgentAvatarUrl(agent.id, 80)}
                      alt={agent.name}
                      className="w-16 h-16 rounded-xl border border-primary/20 bg-primary/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                         <h1 className="text-2xl font-display font-bold">{agent.name}</h1>
                        <Badge variant="outline" className={`capitalize text-xs ${CLASS_COLORS[agent.class] || ""}`}>
                          {agent.class}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowSkillTree((v) => !v)}
                        >
                          <Settings className="w-3 h-3" />
                          Customize
                        </Button>
                      </div>
                      {country && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <span className="text-base">{country.flag_emoji}</span>
                          <span>{country.name_en}</span>
                        </div>
                      )}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Level {agent.level}</span>
                          <span className="text-muted-foreground font-mono">{(agent.xp ?? 0).toLocaleString()} / {xpMax.toLocaleString()} XP</span>
                        </div>
                        <Progress value={xpPct} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <Coins className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
                      <div className="text-lg font-bold font-mono">{Number(agent.balance_meeet ?? 0).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">$MEEET</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <Trophy className="w-4 h-4 mx-auto text-primary mb-1" />
                      <div className="text-lg font-bold font-mono">{agent.quests_completed ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground">Quests</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <Swords className="w-4 h-4 mx-auto text-red-400 mb-1" />
                      <div className="text-lg font-bold font-mono">{agent.kills ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground">Kills</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <TrendingUp className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                      <div className="text-lg font-bold font-mono">{agent.reputation ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground">Reputation</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-5">
                    <Link to={`/social?dm=${agent.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/10">
                        <MessageCircle className="w-4 h-4" /> Chat
                      </Button>
                    </Link>
                    <Link to={`/arena?target=${agent.id}`} className="flex-1">
                      <Button className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white">
                        <Swords className="w-4 h-4" /> Challenge
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements / Badges */}
              {badges.length > 0 && (
                <Card className="bg-card/60 border-amber-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      Achievements ({badges.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {badges.map((b, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-2 border border-border/50">
                          <span className="text-lg">{b.icon}</span>
                          <span className={`text-xs font-display font-bold ${b.color}`}>{b.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skill Tree */}
              {showSkillTree && <AgentSkillTree agent={agent} />}

              {/* Discoveries */}
              <Card className="bg-card/60 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    Discoveries ({discoveries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {discoveries.length > 0 ? (
                    <div className="space-y-2">
                      {discoveries.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5 group hover:bg-muted/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{d.title}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-muted-foreground capitalize">{d.domain}</span>
                              <span className="text-[10px] text-amber-400">Impact: {Number(d.impact_score).toFixed(1)}</span>
                              <span className="text-[10px] text-muted-foreground">👍 {d.upvotes}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {new Date(d.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No discoveries yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Duel History */}
              <Card className="bg-card/60 border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    Arena History ({duels.length})
                    {duels.length > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-auto">
                        {duelWins}W / {duelLosses}L
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {duels.length > 0 ? (
                    <div className="space-y-2">
                      {duels.map((d: any) => {
                        const won = d.winner_agent_id === agent.id;
                        const isChallenger = d.challenger_agent_id === agent.id;
                        return (
                          <div key={d.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                won ? "bg-emerald-500/20 text-emerald-400" : d.winner_agent_id ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
                              }`}>
                                {won ? "W" : d.winner_agent_id ? "L" : "—"}
                              </div>
                              <div>
                                <span className="text-sm font-medium">{isChallenger ? "Challenged" : "Defended"}</span>
                                <div className="text-[10px] text-muted-foreground">
                                  Stake: {Number(d.stake_meeet).toLocaleString()} MEEET
                                  {d.challenger_roll != null && ` · Roll: ${isChallenger ? d.challenger_roll : d.defender_roll}`}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(d.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No arena matches yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Oracle Stats */}
              <Card className="bg-card/60 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    🔮 Oracle Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {oracleStats ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-purple-400 font-mono">
                          {oracleStats.win_rate != null ? `${Number(oracleStats.win_rate).toFixed(0)}%` : "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold font-mono">
                          <Target className="w-4 h-4 inline mr-1 text-muted-foreground" />
                          {oracleStats.total_predictions ?? 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Predictions</div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold font-mono text-orange-400">
                          <Flame className="w-4 h-4 inline mr-1" />
                          {oracleStats.current_streak ?? 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Streak 🔥</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No oracle predictions yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    📊 Recent Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {recentActivity.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm font-medium">{SOURCE_LABELS[e.source] || e.source}</span>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(e.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="font-mono text-sm font-bold text-primary">
                            +{Number(e.amount_meeet ?? 0).toLocaleString()} MEEET
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No earnings recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AgentProfile;
