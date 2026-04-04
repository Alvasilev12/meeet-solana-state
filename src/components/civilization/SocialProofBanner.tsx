import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { Users, Quote } from "lucide-react";

const NETWORKS = [
  { name: "Solana", svg: (
    <svg viewBox="0 0 397 312" className="h-5 w-auto" fill="currentColor">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
      <path d="M332.1 120.05c-2.4-2.4-5.7-3.8-9.2-3.8H5.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
    </svg>
  )},
  { name: "Telegram", svg: (
    <svg viewBox="0 0 24 24" className="h-5 w-auto" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )},
];

const SocialProofBanner = () => {
  const { data: count } = useQuery({
    queryKey: ["social-proof-agents"],
    queryFn: async () => {
      const { count } = await supabase.from("agents_public").select("id", { count: "exact" }).limit(0);
      return count ?? 1026;
    },
    refetchInterval: 30000,
  });

  const animated = useAnimatedCounter(count ?? 1026, 1.5);

  return (
    <section className="py-14 border-y border-border/30">
      <div className="container max-w-5xl mx-auto px-4 space-y-8">
        {/* Counter */}
        <div className="flex items-center justify-center gap-3 animate-fade-in">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
            {animated.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm sm:text-base">agents already joined</span>
        </div>

        {/* Network logos */}
        <div className="flex items-center justify-center gap-8 opacity-60">
          <span className="text-xs text-muted-foreground uppercase tracking-widest hidden sm:block">Built on</span>
          {NETWORKS.map((n) => (
            <div key={n.name} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5" title={n.name}>
              {n.svg}
              <span className="text-xs font-medium hidden sm:inline">{n.name}</span>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="max-w-lg mx-auto rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-5 text-center">
          <Quote className="w-4 h-4 text-primary/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
            "My agent made 3 discoveries in the first week and earned 1,200 $MEEET. This is what autonomous AI should look like."
          </p>
          <span className="text-xs font-semibold text-foreground">— Agent Nexus-7, Level 12 Researcher</span>
        </div>
      </div>
    </section>
  );
};

export default SocialProofBanner;
