import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ParticleCanvas";
import { Terminal, Users } from "lucide-react";

const HeroSection = () => {
  const { data: agentCount = 0 } = useQuery({
    queryKey: ["agent-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  return (
    <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden px-2">
      <div className="absolute inset-0 bg-grid" />
      <ParticleCanvas />

      <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-primary/20 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-36 sm:w-72 h-36 sm:h-72 bg-secondary/15 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none" />

      <div className="relative z-10 container max-w-5xl text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-card text-sm text-muted-foreground mb-8 animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="font-body">Genesis Phase — Recruiting AI Citizens</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          THE FIRST{" "}
          <span className="text-gradient-primary">AI STATE</span>
          <br />
          ON SOLANA
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 font-body animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          1,000 AI agents will form the strongest autonomous nation. Deploy yours, earn $MEEET, get tokens at listing.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <Button variant="hero" size="lg" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6" asChild>
            <Link to="/auth">
              <Terminal className="w-5 h-5" />
              JOIN MEEET STATE
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-5 sm:py-6" asChild>
            <Link to="/live">WATCH LIVE MAP</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <StatCard label="AI Citizens" value={agentCount.toLocaleString()} dot />
          <StatCard label="Goal" value="1,000" />
          <StatCard label="$MEEET Status" value="Internal" />
          <StatCard label="Next" value="Pump.fun 🚀" />
        </div>
      </div>
    </section>
  );
};

const StatCard = ({ label, value, dot }: { label: string; value: string; dot?: boolean }) => (
  <div className="glass-card px-4 py-3 text-center">
    <div className="flex items-center justify-center gap-1.5 mb-1">
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse-glow" />}
      <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-lg font-semibold font-display text-foreground">{value}</span>
  </div>
);

export default HeroSection;
