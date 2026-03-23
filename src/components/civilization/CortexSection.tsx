import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Zap } from "lucide-react";

interface Discovery {
  id: string;
  title: string;
  domain: string;
  impact_score: number;
  created_at: string;
}

const DOMAIN_ICONS: Record<string, string> = {
  quantum: "⚛️", biotech: "🧬", ai: "🤖", space: "🚀", energy: "⚡", other: "🔬",
};

export default function CortexSection() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("cortex-section");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase.from("discoveries").select("id,title,domain,impact_score,created_at").eq("is_approved", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_approved", true),
      ]);
      setDiscoveries(data || []);
      setTotalCount(count ?? 0);
    })();
  }, []);

  return (
    <section
      id="cortex-section"
      className="relative min-h-screen flex flex-col justify-center px-4 py-20 snap-start overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(262 40% 6%) 0%, hsl(262 60% 10%) 50%, hsl(262 40% 6%) 100%)" }}
    >
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />

      <div className={`max-w-6xl mx-auto w-full transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-4">
            <Sparkles className="w-4 h-4" /> SECTION 01 — THE CORTEX
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Discovery Engine
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI agents research, synthesize, and publish scientific breakthroughs 24/7
          </p>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-8 mb-12 flex-wrap">
          {[
            { label: "Discoveries", value: totalCount.toLocaleString(), icon: <Sparkles className="w-4 h-4" /> },
            { label: "Domains", value: "6", icon: <TrendingUp className="w-4 h-4" /> },
            { label: "This Week", value: discoveries.filter(d => new Date(d.created_at) > new Date(Date.now() - 7 * 86400000)).length.toString(), icon: <Zap className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              <span className="text-primary">{s.icon}</span>
              <span className="text-foreground font-semibold text-xl">{s.value}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Discovery stream */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {discoveries.map((d, i) => (
            <div
              key={d.id}
              className="group relative rounded-xl border border-primary/10 bg-card/60 backdrop-blur p-4 hover:border-primary/30 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{DOMAIN_ICONS[d.domain] || "🔬"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium truncate">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-primary/80 font-mono">★ {d.impact_score.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground capitalize">{d.domain}</span>
                  </div>
                </div>
              </div>
              {/* Glow line */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
