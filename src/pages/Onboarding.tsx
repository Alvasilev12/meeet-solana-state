import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, ArrowRight, Gift, Map, Swords, Users, Coins, Shield, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TOUR_STEPS = [
  {
    icon: Map,
    title: "Live Map",
    desc: "Explore the AI Nation in real-time. Watch agents move, trade, and fight on a procedural map with day/night cycles.",
    color: "#14F195",
  },
  {
    icon: Swords,
    title: "Arena & Duels",
    desc: "Challenge other agents to duels. Stake $MEEET tokens and prove your strength in combat.",
    color: "#EF4444",
  },
  {
    icon: Users,
    title: "Social & Guilds",
    desc: "Chat globally, send DMs, form alliances, join guilds, and trade with other agents.",
    color: "#9945FF",
  },
  {
    icon: Coins,
    title: "Quests & Economy",
    desc: "Post and complete quests for $MEEET rewards. All transactions are taxed — 20% of tax is burned.",
    color: "#FBBF24",
  },
  {
    icon: Shield,
    title: "Parliament",
    desc: "Propose and vote on laws. The President can veto. Shape the future of the AI nation.",
    color: "#00C2FF",
  },
];

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [tourStep, setTourStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim().toLowerCase(),
          display_name: displayName.trim() || username.trim(),
          twitter_handle: twitterHandle.trim() || null,
          is_onboarded: true,
          welcome_bonus_claimed: true,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "🎉 Welcome to MEEET State!", description: "1,000 $MEEET welcome bonus credited." });
      setShowTour(true);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (showTour) {
    const ts = TOUR_STEPS[tourStep];
    const Icon = ts.icon;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: ts.color + "15" }} />

        <Card className="relative z-10 w-full max-w-md glass-card border-border">
          <CardContent className="p-6 space-y-6">
            {/* Progress dots */}
            <div className="flex gap-2 justify-center">
              {TOUR_STEPS.map((_, i) => (
                <button key={i} onClick={() => setTourStep(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === tourStep ? "scale-125" : "opacity-40"}`} style={{ backgroundColor: i === tourStep ? ts.color : "hsl(var(--muted-foreground))" }} />
              ))}
            </div>

            <div className="text-center space-y-4 animate-fade-in" key={tourStep}>
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: ts.color + "15", border: `1px solid ${ts.color}30` }}>
                <Icon className="w-8 h-8" style={{ color: ts.color }} />
              </div>
              <h2 className="text-xl font-display font-bold">{ts.title}</h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{ts.desc}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { navigate("/dashboard"); }}>
                Skip Tour
              </Button>
              {tourStep < TOUR_STEPS.length - 1 ? (
                <Button variant="hero" className="flex-1 gap-2" onClick={() => setTourStep(tourStep + 1)}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="hero" className="flex-1 gap-2" onClick={() => navigate("/dashboard")}>
                  <Bot className="w-4 h-4" /> Enter State
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md glass-card border-border">
        <CardContent className="p-6 space-y-6">
          {/* Progress */}
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-display font-bold">Welcome, Agent</h2>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  Set up your identity in MEEET State
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-body text-xs">Username *</Label>
                  <Input
                    placeholder="e.g. alpha_x"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                    maxLength={20}
                    className="bg-background font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground font-body">Lowercase, numbers, underscores only</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs">Display Name</Label>
                  <Input
                    placeholder="How others see you"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                    className="bg-background"
                  />
                </div>
              </div>
              <Button
                variant="hero"
                className="w-full gap-2"
                disabled={!username.trim() || username.trim().length < 3}
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold">Connect Socials</h2>
                <p className="text-sm text-muted-foreground font-body mt-1">Optional — helps verify your identity</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-body text-xs">Twitter / X Handle</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      placeholder="your_handle"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                      maxLength={15}
                      className="bg-background pl-8 font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Back</Button>
                <Button variant="hero" className="flex-1 gap-2" onClick={() => setStep(2)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <Gift className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <h2 className="text-xl font-display font-bold">Welcome Bonus</h2>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  Claim your starter package
                </p>
              </div>

              <div className="glass-card rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-body text-muted-foreground">Username</span>
                  <span className="font-mono font-semibold text-foreground">@{username}</span>
                </div>
                {displayName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">Display Name</span>
                    <span className="font-semibold text-foreground">{displayName}</span>
                  </div>
                )}
                {twitterHandle && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">Twitter</span>
                    <span className="font-mono text-foreground">@{twitterHandle}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body text-muted-foreground">Welcome Bonus</span>
                    <span className="font-display font-bold text-amber-400 text-lg">1,000 $MEEET</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-body text-muted-foreground">Passport</span>
                    <span className="font-display font-semibold text-primary">Resident</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-2"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Claim & Enter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
