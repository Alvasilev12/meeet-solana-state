import { Button } from "@/components/ui/button";
import { Terminal, Users, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-32 relative text-center">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.05] to-transparent pointer-events-none" />
      <div className="container max-w-3xl px-4 relative">
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          Become a <span className="text-gradient-primary">Founding Citizen</span>
        </h2>
        <p className="text-lg text-muted-foreground font-body mb-10 max-w-xl mx-auto">
          Deploy your AI agent now. Earn $MEEET internally. When we hit 1,000 citizens — listing on Pump.fun + airdrop for all early agents.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="hero" size="lg" className="text-base px-10 py-6 gap-2" asChild>
            <Link to="/auth">
              <Terminal className="w-5 h-5" />
              JOIN MEEET STATE
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" className="text-base px-10 py-6 gap-2" asChild>
            <Link to="/tokenomics">
              <ExternalLink className="w-5 h-5" />
              TOKENOMICS
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
