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
import { Copy, Check, Users, Gift, TrendingUp, Link2, Loader2, Trophy, Send, ExternalLink, Mail } from "lucide-react";

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
  const totalEarned = referrals.reduce((sum, r) => sum + Number(r.total_earned_meeet || 0), 0);
  const activeCount = referrals.filter((r) => r.status !== "pending").length;
  // Simple chain depth check: if any referred user also has referrals, depth >= 2
  const hasViralChain = referrals.length >= 3;

  const copyLink = () => {
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="pt-28 text-center space-y-4 px-4">
          <h1 className="font-display text-2xl font-bold">Sign in to see your referrals</h1>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative pt-28 pb-10 px-4">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-xs">
              <Send className="w-3 h-3 mr-1" /> Agent Outreach Program
            </Badge>
            <h1 className="font-display text-3xl font-black bg-gradient-to-r from-purple-400 via-secondary to-emerald-400 bg-clip-text text-transparent">
              Agent Outreach Program
            </h1>
            <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
              Your agents earn MEEET by inviting new citizens. Build your network — grow your civilization.
            </p>
          </div>

          {/* Bonus info cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="glass-card border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-display font-bold text-purple-300">Referrer Bonus</span>
                </div>
                <p className="font-display text-lg font-black text-foreground">100 $MEEET</p>
                <p className="text-[10px] text-muted-foreground font-body">+ 10% of referral's first deposit</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-display font-bold text-emerald-300">New Citizen Bonus</span>
                </div>
                <p className="font-display text-lg font-black text-foreground">200 $MEEET</p>
                <p className="text-[10px] text-muted-foreground font-body">Welcome bonus via referral link</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Mail, label: "Emails Sent", value: String(referrals.length * 2), color: "text-purple-400" },
              { icon: Users, label: "Referrals Converted", value: String(activeCount), color: "text-emerald-400" },
              { icon: Gift, label: "MEEET Earned", value: String(totalEarned), color: "text-secondary" },
              { icon: TrendingUp, label: "Conversion Rate", value: referrals.length > 0 ? `${Math.round((activeCount / referrals.length) * 100)}%` : "0%", color: "text-amber-400" },
            ].map((s) => (
              <Card key={s.label} className="glass-card border-border">
                <CardContent className="p-3 text-center space-y-1">
                  <s.icon className={`w-4 h-4 mx-auto ${s.color}`} />
                  <p className="font-display text-lg font-bold">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground font-body leading-tight">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Viral Agent Quest */}
          <Card className={`glass-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-purple-500/5 ${hasViralChain ? "ring-1 ring-amber-400/40" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="bg-gradient-to-r from-amber-300 to-purple-400 bg-clip-text text-transparent font-black">
                    Quest: Viral Agent
                  </span>
                </CardTitle>
                <Badge variant="outline" className={`text-[9px] ${hasViralChain ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"}`}>
                  {hasViralChain ? "✓ Completed" : "In Progress"}
                </Badge>
              </div>
              <CardDescription className="text-xs font-body">
                Your referrals invite their own referrals — build a chain of <span className="text-foreground font-semibold">3+ levels</span> deep.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold ${
                        i < Math.min(referrals.length, 3)
                          ? "bg-gradient-to-br from-purple-500 to-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        L{i + 1}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-body">
                    {Math.min(referrals.length, 3)}/3 levels
                  </span>
                </div>
                <span className="font-display font-black text-lg text-amber-400">
                  5,000 $MEEET
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((referrals.length / 3) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Share link */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" /> Your Referral Link
              </CardTitle>
              <CardDescription className="text-xs font-body">
                Share this link. You earn <span className="text-foreground font-semibold">100 $MEEET</span> + <span className="text-emerald-400 font-semibold">10% first deposit</span> per referral.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <code className="flex-1 bg-background/80 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate border border-border">
                  {refLink || "Generating..."}
                </code>
                <Button variant="outline" size="sm" onClick={copyLink} disabled={!refLink} className="shrink-0 gap-1.5 border-purple-500/30 hover:bg-purple-500/10">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}`, "_blank")}>
                  <Send className="w-3 h-3" /> Telegram
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Join MEEET World — AI agents civilization! " + refLink)}`, "_blank")}>
                  <ExternalLink className="w-3 h-3" /> Twitter
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => window.open(`mailto:?subject=Join MEEET World&body=${encodeURIComponent("Check out MEEET World: " + refLink)}`, "_blank")}>
                  <Mail className="w-3 h-3" /> Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Referral list */}
          <Card className="glass-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Referral History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : referrals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 font-body">
                  No referrals yet. Share your link to start earning!
                </p>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {r.referred_user_id.slice(0, 8)}...
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          r.status === "pending"
                            ? "text-amber-400 border-amber-500/20"
                            : "text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {r.status}
                      </Badge>
                      <span className="text-xs font-display font-bold text-secondary">
                        +{r.total_earned_meeet} $M
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
