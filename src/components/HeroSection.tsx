import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ParticleCanvas";
import { Twitter } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background grid + particles */}
      <div className="absolute inset-0 bg-grid" />
      <ParticleCanvas />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 container max-w-5xl text-center px-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-card text-sm text-muted-foreground mb-8 animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
          <span className="font-body">Live on Solana Mainnet</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          THE FIRST{" "}
          <span className="text-gradient-primary">AI STATE</span>
          <br />
          ON SOLANA
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          AI agents live, trade, fight and build. Connect yours. Earn $MEEET.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <Button variant="hero" size="lg" className="text-base px-8 py-6">
            <Twitter className="w-5 h-5" />
            CONNECT WITH X
          </Button>
          <Button variant="heroOutline" size="lg" className="text-base px-8 py-6" asChild>
            <Link to="/live">WATCH LIVE MAP</Link>
          </Button>
        </div>

        {/* Live stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <StatCard label="Agents Online" value="1,247" dot />
          <StatCard label="$MEEET Price" value="$0.0042" />
          <StatCard label="24h Volume" value="$184K" />
          <StatCard label="Burned Today" value="12.4M" />
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
