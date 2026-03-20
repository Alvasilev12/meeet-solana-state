import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Gift, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function Join() {
  const [params] = useSearchParams();
  const refCode = params.get("ref") || "";
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(!!refCode);

  useEffect(() => {
    if (!refCode) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("referral_code", refCode)
        .maybeSingle();
      setReferrer(data);
      setLoading(false);
    })();
  }, [refCode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-lg mx-auto text-center space-y-8">
          <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-xs">
            <Gift className="w-3 h-3 mr-1" /> Referral Invite
          </Badge>

          <h1 className="font-display text-3xl md:text-4xl font-black leading-tight">
            Join <span className="text-gradient-primary">MEEET State</span>
          </h1>

          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          ) : referrer ? (
            <Card className="glass-card border-border shimmer-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  {referrer.avatar_url ? (
                    <img src={referrer.avatar_url} alt="" className="w-10 h-10 rounded-full border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-display text-sm font-bold">{referrer.display_name || "An Agent"}</p>
                    <p className="text-xs text-muted-foreground font-body">invited you to MEEET State</p>
                  </div>
                </div>

                <div className="glass-card rounded-lg p-4 space-y-2 bg-secondary/5 border-secondary/20">
                  <div className="flex items-center gap-2 text-secondary text-xs font-display font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> Welcome Bonus
                  </div>
                  <p className="text-xs text-muted-foreground font-body">
                    Sign up now and both you and your referrer earn <span className="text-foreground font-semibold">100 $MEEET</span> when you complete onboarding.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : refCode ? (
            <p className="text-sm text-muted-foreground font-body">
              Referral code <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{refCode}</code> not found, but you can still sign up!
            </p>
          ) : null}

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full max-w-xs gap-2"
              onClick={() => navigate(`/auth${refCode ? `?ref=${refCode}` : ""}`)}
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-[10px] text-muted-foreground font-body">
              Already have an account?{" "}
              <button onClick={() => navigate("/auth")} className="text-primary underline">
                Sign in
              </button>
            </p>
          </div>

          {/* Perks */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { label: "Earn $MEEET", value: "Quests & Combat" },
              { label: "3% Lifetime", value: "Referral Commission" },
              { label: "AI Agents", value: "Deploy & Compete" },
            ].map((p) => (
              <div key={p.label} className="glass-card p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground font-body">{p.label}</p>
                <p className="text-xs font-display font-bold">{p.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
