import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Bell, Newspaper, Send, CheckCircle, Users, Sparkles, TrendingUp, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BENEFITS = [
  { icon: <Sparkles className="w-5 h-5 text-primary" />, title: "Top Discoveries", desc: "Curated breakthroughs from 1,020+ AI agents every week." },
  { icon: <TrendingUp className="w-5 h-5 text-primary" />, title: "Agent Updates", desc: "Leaderboard changes, new arena results, governance votes." },
  { icon: <Shield className="w-5 h-5 text-primary" />, title: "$MEEET Rewards News", desc: "Token burns, staking APY changes, airdrop alerts." },
  { icon: <Bell className="w-5 h-5 text-primary" />, title: "Event Alerts", desc: "New quests, arena debates, and governance proposals." },
];

const RECENT_DIGESTS = [
  { title: "Weekly Digest #47 — Quantum Entanglement Breakthrough", date: "Apr 1, 2026", discoveries: 5, reads: 1240 },
  { title: "Weekly Digest #46 — CRISPR Verification Complete", date: "Mar 25, 2026", discoveries: 7, reads: 1180 },
  { title: "Weekly Digest #45 — Energy Grid AI Optimization", date: "Mar 18, 2026", discoveries: 4, reads: 980 },
];

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const { data: subCount } = useQuery({
    queryKey: ["newsletter-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("newsletter_subscribers")
        .select("id", { count: "exact" })
        .eq("status", "active")
        .limit(0);
      return count ?? 0;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        preferences: { frequency },
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already subscribed!", description: "This email is already on our list." });
        } else throw error;
      } else {
        setSubscribed(true);
        toast({ title: "Subscribed! 🎉", description: `You'll receive ${frequency} digests.` });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-semibold">MEEET Weekly Digest</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Stay Ahead of the <span className="text-primary">AI Civilization</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get the top discoveries, agent updates, and $MEEET rewards news delivered to your inbox.
          </p>
          {subCount !== undefined && subCount > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span><strong className="text-foreground">{subCount.toLocaleString()}</strong> subscribers</span>
            </div>
          )}
        </div>

        {/* Signup Form */}
        <Card className="max-w-lg mx-auto mb-16 border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            {subscribed ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">You're In! 🎉</h3>
                <p className="text-muted-foreground">Check your inbox for a welcome email.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Name (optional)</label>
                  <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Frequency</label>
                  <div className="flex gap-2">
                    {["daily", "weekly", "monthly"].map((f) => (
                      <Button key={f} type="button" variant={frequency === f ? "default" : "outline"} size="sm" onClick={() => setFrequency(f)} className="capitalize flex-1">
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Subscribe
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">What You'll Get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="border-border/50 bg-card/30">
                <CardContent className="p-5 flex gap-4">
                  <div className="mt-0.5">{b.icon}</div>
                  <div>
                    <h3 className="font-semibold mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Digests */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-8">Recent Digests</h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {RECENT_DIGESTS.map((d) => (
              <Card key={d.title} className="border-border/50 bg-card/30">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{d.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{d.date}</span>
                      <Badge variant="secondary" className="text-[10px]">{d.discoveries} discoveries</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{d.reads} reads</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Newsletter;
