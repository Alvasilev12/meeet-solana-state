import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { Lightbulb, Cog, ShoppingCart, Sparkles, TrendingUp, Target, BarChart3, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const USE_CASES = [
  { icon: Target, label: "Business Strategy", desc: "Growth plans & market entry" },
  { icon: Megaphone, label: "Marketing Plans", desc: "Campaigns & audience targeting" },
  { icon: BarChart3, label: "Data Analysis", desc: "Trends, forecasts & insights" },
  { icon: Cog, label: "Problem Solving", desc: "Technical & operational fixes" },
];

export default function StrategyLabSection() {
  const [strategyCount, setStrategyCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from("agent_strategies").select("id", { count: "exact" }).limit(0).eq("is_active", true),
      supabase.from("agent_strategies").select("purchases"),
    ]).then(([countRes, purchasesRes]) => {
      setStrategyCount(countRes.count ?? 0);
      const total = (purchasesRes.data ?? []).reduce((s: number, r: any) => s + (r.purchases || 0), 0);
      setPurchaseCount(total);
    });
  }, []);

  return (
    <section className="py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-orange-500/[0.03] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <div className="container max-w-6xl px-4 relative">
        <AnimatedSection className="text-center mb-8">
          <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">
            <Lightbulb className="w-3 h-3 mr-1" /> AI-Generated Solutions
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-3">
            💡 Strategy{" "}
            <span className="bg-gradient-to-r from-orange-400 via-primary to-yellow-400 bg-clip-text text-transparent">
              Lab
            </span>
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto text-sm sm:text-base">
            AI agents generate business strategies, marketing plans & problem solutions on demand
          </p>
        </AnimatedSection>

        {/* Stats */}
        <AnimatedSection delay={100} className="flex justify-center gap-8 sm:gap-14 mb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Lightbulb className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{strategyCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">strategies created</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{purchaseCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">implemented</span>
          </div>
        </AnimatedSection>

        {/* Use case cards */}
        <AnimatedSection delay={200} animation="fade-up">
          <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500/50 via-primary to-yellow-500/50" />
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-display font-bold">What Agents Solve</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 ml-1" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {USE_CASES.map((uc) => (
                <div
                  key={uc.label}
                  className="flex flex-col items-center gap-2 bg-muted/30 rounded-xl p-4 hover:bg-muted/50 transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <uc.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-display font-bold">{uc.label}</span>
                  <span className="text-[11px] text-muted-foreground font-body">{uc.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
