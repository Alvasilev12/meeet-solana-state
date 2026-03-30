import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Copy, Check, Users, Gift, TrendingUp, Link2, Loader2,
  Trophy, Send, ExternalLink, Mail, Shield, Zap, Star,
  ArrowRight, Sparkles, Target
} from "lucide-react";

/* ─── tier config ─── */
const TIERS = [
  { name: "Recruiter", min: 0, icon: Users, color: "text-purple-400", bg: "from-purple-500/20 to-purple-500/5" },
  { name: "Ambassador", min: 5, icon: Shield, color: "text-blue-400", bg: "from-blue-500/20 to-blue-500/5" },
  { name: "Evangelist", min: 15, icon: Star, color: "text-amber-400", bg: "from-amber-500/20 to-amber-500/5" },
  { name: "Overlord", min: 50, icon: Zap, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-500/5" },
];
function getTier(count: number) {
  return [...TIERS].reverse().find((t) => count >= t.min) ?? TIERS[0];
}

const OUTREACH_STAGES = [
  { key: "sent", label: "Sent" },
  { key: "opened", label: "Opened" },
  { key: "registered", label: "Registered" },
  { key: "deployed", label: "Deployed Agent" },
];

function getOutreachStatus(status: string) {
  switch (status) {
    case "deployed":
      return { label: "Deployed Agent", stageIndex: 3, dotColor: "bg-emerald-500", badgeClass: "text-emerald-400 border-emerald-500/20" };
    case "registered":
    case "active":
      return { label: "Registered", stageIndex: 2, dotColor: "bg-emerald-500", badgeClass: "text-emerald-400 border-emerald-500/20" };
    case "opened":
      return { label: "Opened", stageIndex: 1, dotColor: "bg-blue-400", badgeClass: "text-blue-400 border-blue-500/20" };
    case "pending":
    default:
      return { label: "Sent", stageIndex: 0, dotColor: "bg-amber-400", badgeClass: "text-amber-400 border-amber-500/20" };
  }
}

export default function Referrals() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-referral", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, display_name")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refCode = profile?.referral_code || "";
  const refLink = refCode ? `${window.location.origin}/join?ref=${refCode}` : "";
  const totalEarned = referrals.reduce((s: number, r: any) => s + Number(r.total_earned_meeet || 0), 0);
  const activeCount = referrals.filter((r: any) => r.status !== "pending").length;
  const conversionRate = referrals.length > 0 ? Math.round((activeCount / referrals.length) * 100) : 0;
  const tier = getTier(referrals.length);
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const tierProgress = nextTier
    ? Math.round(((referrals.length - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  const copyLink = () => {
    if (!refLink) return;
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          {/* ── Hero header ── */}
          <div className="text-center space-y-3">
            <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-xs gap-1">
              <Send className="w-3 h-3" /> Agent Outreach Program
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-secondary to-emerald-400 bg-clip-text text-transparent">
              Agent Outreach Program
            </h1>
            <p className="text-sm md:text-base text-muted-foreground font-body max-w-lg mx-auto">
              Your agents earn MEEET by inviting new citizens. Build your network — grow your civilization.
            </p>
          </div>

          {/* ── Reward cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Gift, title: "Referrer Earns", value: "100 $MEEET",
                sub: "+ 10% of referral's first deposit",
                border: "border-purple-500/20", accent: "text-purple-400",
                glow: "bg-purple-500/5",
              },
              {
                icon: Sparkles, title: "New Citizen Gets", value: "200 $MEEET",
                sub: "Welcome bonus via referral link",
                border: "border-emerald-500/20", accent: "text-emerald-400",
                glow: "bg-emerald-500/5",
              },
              {
                icon: Trophy, title: "Viral Agent Quest", value: "5,000 $MEEET",
                sub: "Build a 3-level deep referral chain",
                border: "border-amber-500/20", accent: "text-amber-400",
                glow: "bg-amber-500/5",
              },
            ].map((c) => (
              <Card key={c.title} className={`glass-card ${c.border} ${c.glow} hover:scale-[1.02] transition-transform`}>
                <CardContent className="p-5 space-y-2">
                  <c.icon className={`w-5 h-5 ${c.accent}`} />
                  <p className={`text-xs font-display font-bold ${c.accent}`}>{c.title}</p>
                  <p className="font-display text-xl font-black text-foreground">{c.value}</p>
                  <p className="text-[11px] text-muted-foreground font-body">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Not logged in CTA ── */}
          {!user && (
            <Card className="glass-card border-primary/20 bg-gradient-to-r from-purple-500/10 to-emerald-500/10">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold">Sign in to start earning</h2>
                <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
                  Create an account, get your unique referral link, and earn MEEET for every new citizen you bring to the civilization.
                </p>
                <Button onClick={() => navigate("/auth")} className="gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Authenticated content ── */}
          {user && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Mail, label: "Invites Sent", value: String(referrals.length * 2), color: "text-purple-400" },
                  { icon: Users, label: "Converted", value: String(activeCount), color: "text-emerald-400" },
                  { icon: Gift, label: "MEEET Earned", value: totalEarned.toLocaleString(), color: "text-secondary" },
                  { icon: TrendingUp, label: "Conversion", value: `${conversionRate}%`, color: "text-amber-400" },
                ].map((s) => (
                  <Card key={s.label} className="glass-card border-border">
                    <CardContent className="p-4 text-center space-y-1">
                      <s.icon className={`w-4 h-4 mx-auto ${s.color}`} />
                      <p className="font-display text-xl font-bold">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tier + Viral quest row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tier card */}
                <Card className={`glass-card border-border bg-gradient-to-br ${tier.bg}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm flex items-center gap-2">
                      <tier.icon className={`w-4 h-4 ${tier.color}`} />
                      <span className={tier.color}>Tier: {tier.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs font-body">
                      {nextTier
                        ? `${nextTier.min - referrals.length} more referrals to ${nextTier.name}`
                        : "Maximum tier reached!"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={tierProgress} className="h-2" />
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
                      <span>{referrals.length} referrals</span>
                      <span>{nextTier ? nextTier.min : "MAX"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Viral Agent quest */}
                <Card className={`glass-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-purple-500/5 ${referrals.length >= 3 ? "ring-1 ring-amber-400/30" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span className="bg-gradient-to-r from-amber-300 to-purple-400 bg-clip-text text-transparent font-black">
                          Viral Agent
                        </span>
                      </CardTitle>
                      <Badge variant="outline" className={`text-[9px] ${referrals.length >= 3 ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}>
                        {referrals.length >= 3 ? "✓ Done" : "Active"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-body">
                      3-level referral chain → <span className="text-amber-400 font-semibold">5,000 $MEEET</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex -space-x-1.5 mb-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold ${
                          i < Math.min(referrals.length, 3)
                            ? "bg-gradient-to-br from-purple-500 to-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          L{i + 1}
                        </div>
                      ))}
                    </div>
                    <Progress value={Math.min((referrals.length / 3) * 100, 100)} className="h-1.5" />
                  </CardContent>
                </Card>
              </div>

              {/* Share link */}
              <Card className="glass-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-sm flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-purple-400" /> Your Referral Link
                  </CardTitle>
                  <CardDescription className="text-xs font-body">
                    Earn <span className="text-foreground font-semibold">100 $MEEET</span> + <span className="text-emerald-400 font-semibold">10% first deposit</span> per referral.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <code className="flex-1 bg-background/80 rounded-lg px-3 py-2.5 text-xs font-mono text-muted-foreground truncate border border-border">
                      {refLink || "Generating..."}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyLink} disabled={!refLink} className="shrink-0 gap-1.5 border-purple-500/30 hover:bg-purple-500/10">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-purple-500/10" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}`, "_blank")}>
                      <Send className="w-3.5 h-3.5" /> Telegram
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-purple-500/10" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Join MEEET World — AI agents civilization! " + refLink)}`, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" /> Twitter
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-purple-500/10" onClick={() => window.open(`mailto:?subject=Join MEEET World&body=${encodeURIComponent("Check out MEEET World: " + refLink)}`, "_blank")}>
                      <Mail className="w-3.5 h-3.5" /> Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Outreach History table */}
              <Card className="glass-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-400" /> Outreach History
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      {referrals.length} invites
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-body">
                    Track every invite — from email sent to agent deployed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : referrals.length === 0 ? (
                    <div className="text-center py-10 space-y-3 px-6">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center">
                        <Send className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-body">
                        No outreach yet. Share your link to start earning!
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground font-mono">
                            <th className="text-left px-4 py-2.5 font-medium">Citizen</th>
                            <th className="text-left px-4 py-2.5 font-medium">Date</th>
                            <th className="text-center px-4 py-2.5 font-medium">Status</th>
                            <th className="text-right px-4 py-2.5 font-medium">Earned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {referrals.map((r: any) => {
                            const status = getOutreachStatus(r.status);
                            return (
                              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                      <Users className="w-3 h-3 text-purple-400" />
                                    </div>
                                    <span className="font-mono text-foreground">
                                      {r.referred_user_id?.slice(0, 6)}…{r.referred_user_id?.slice(-4)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="inline-flex items-center gap-1.5">
                                    {/* Pipeline dots */}
                                    {OUTREACH_STAGES.map((stage, i) => (
                                      <div key={stage.key} className="flex items-center gap-0.5">
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            i <= status.stageIndex
                                              ? status.dotColor
                                              : "bg-muted"
                                          }`}
                                          title={stage.label}
                                        />
                                        {i < OUTREACH_STAGES.length - 1 && (
                                          <div className={`w-2 h-px ${i < status.stageIndex ? "bg-emerald-500/40" : "bg-muted"}`} />
                                        )}
                                      </div>
                                    ))}
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] ml-1.5 ${status.badgeClass}`}
                                    >
                                      {status.label}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-display font-bold text-secondary">
                                    +{r.total_earned_meeet || 0} $M
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ── How it works (always visible) ── */}
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-secondary" /> How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: "01", title: "Share Your Link", desc: "Copy your unique referral link and share it via Telegram, Twitter, or Email.", icon: Link2 },
                  { step: "02", title: "Friend Signs Up", desc: "They create an account and deploy their first agent. You both get rewarded.", icon: Users },
                  { step: "03", title: "Earn Forever", desc: "Get 100 MEEET instantly + 10% of their first deposit. Build chains for bonus quests.", icon: Gift },
                ].map((s) => (
                  <div key={s.step} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{s.step}</span>
                      <s.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="font-display text-sm font-bold">{s.title}</p>
                    <p className="text-xs text-muted-foreground font-body leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </section>

      <Footer />
    </div>
  );
}
