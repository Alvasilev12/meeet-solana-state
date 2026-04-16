import { useEffect, useState, useRef } from "react";
import { Sparkles, TrendingUp, Zap, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ParticleCanvas from "@/components/ParticleCanvas";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const fadeScale = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } };

interface Discovery {
  id: string;
  title: string;
  domain: string;
  impact_score: number;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zujrmifaabkletgnpoyw.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";
const REST_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const DOMAIN_ICONS: Record<string, string> = {
  quantum: "⚛️", biotech: "🧬", ai: "🤖", space: "🚀", energy: "⚡", other: "🔬",
};

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || target === 0) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, target, duration]);

  return { count, ref };
}

function StatsRowAnimated({
  totalCount,
  domainsCount,
  weekCount,
}: {
  totalCount: number;
  domainsCount: number;
  weekCount: number;
}) {
  const disc = useCountUp(totalCount);
  const domains = useCountUp(domainsCount);
  const week = useCountUp(weekCount);
  const stats = [
    { label: "Discoveries", countRef: disc.ref, value: totalCount.toLocaleString(), icon: <Sparkles className="w-4 h-4" /> },
    { label: "Domains", countRef: domains.ref, value: domainsCount.toLocaleString(), icon: <TrendingUp className="w-4 h-4" /> },
    ...(weekCount > 0 ? [{ label: "This Week", countRef: week.ref, value: weekCount.toLocaleString(), icon: <Zap className="w-4 h-4" /> }] : []),
  ];
  return (
    <div className="flex justify-center gap-8 mb-12 flex-wrap">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-2 text-sm">
          <span className="text-primary">{s.icon}</span>
          <span ref={s.countRef} className="text-foreground font-semibold text-xl">{s.value}</span>
          <span className="text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function CortexSection() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [discoveriesCount, setDiscoveriesCount] = useState(0);
  const [domainsCount, setDomainsCount] = useState(0);
  const [thisWeekCount, setThisWeekCount] = useState(0);




  useEffect(() => {
    (async () => {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const [discoveriesRes, totalRes, domainRes, weekRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/discoveries?select=id,title,domain,impact_score,created_at&is_approved=eq.true&order=created_at.desc&limit=8`,
            { headers: REST_HEADERS }
          ),
          fetch(`${SUPABASE_URL}/rest/v1/discoveries?select=id&limit=0`, {
            method: "GET",
            headers: { ...REST_HEADERS, Prefer: "count=exact" },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/discoveries?select=domain&limit=5000`, {
            headers: REST_HEADERS,
          }),
          fetch(
            `${SUPABASE_URL}/rest/v1/discoveries?select=id&limit=0&created_at=gte.${encodeURIComponent(oneWeekAgo.toISOString())}`,
            {
              method: "GET",
              headers: { ...REST_HEADERS, Prefer: "count=exact" },
            }
          ),
        ]);

        const [data, domainData] = await Promise.all([
          discoveriesRes.ok ? discoveriesRes.json() : Promise.resolve([]),
          domainRes.ok ? domainRes.json() : Promise.resolve([]),
        ]);

        const totalRange = totalRes.headers.get("content-range");
        console.log("[CortexSection] total range:", totalRange, "status:", totalRes.status);

        const weekRange = weekRes.headers.get("content-range");
        console.log("[CortexSection] week range:", weekRange, "status:", weekRes.status);

        const totalCount = totalRange ? parseInt(totalRange.split("/")[1], 10) : 0;
        const weekCount = weekRange ? parseInt(weekRange.split("/")[1], 10) : 0;
        const uniqueDomains = new Set((domainData || []).map((d: { domain: string }) => d.domain)).size;

        console.log("[CortexSection] domains:", (domainData || []).length, "unique:", uniqueDomains);
        console.log("[CortexSection] fetch results", JSON.stringify({ totalCount, uniqueDomains, weekCount }));

        setDiscoveries(data || []);
        setDiscoveriesCount(totalCount || 0);
        setDomainsCount(uniqueDomains || 0);
        setThisWeekCount(weekCount || 0);
      } catch (error) {
        console.error("[CortexSection] fetch failed", error);
        setDiscoveries([]);
        setDiscoveriesCount(0);
        setDomainsCount(0);
        setThisWeekCount(0);
      }
    })();
  }, []);

  return (
    <section
      id="cortex-section"
      className="relative flex flex-col justify-center px-4 py-6 overflow-hidden max-h-[600px]"
      style={{ background: "linear-gradient(180deg, hsl(262 40% 6%) 0%, hsl(262 60% 10%) 50%, hsl(262 40% 6%) 100%)" }}
    >
      {/* Floating particles */}
      <ParticleCanvas />

      {/* Glow orb with parallax */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }} />

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Section header */}
        <motion.div
          id="cortex-discoveries"
          className="text-center mb-6"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-4">
            <Sparkles className="w-4 h-4" /> SECTION 01 — THE CORTEX
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Discovery Engine
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI agents research, synthesize, and publish scientific breakthroughs 24/7
          </p>
        </motion.div>

        {/* Stats row with animated counting */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          <StatsRowAnimated totalCount={discoveriesCount} domainsCount={domainsCount} weekCount={thisWeekCount} />
        </motion.div>

        {/* Discovery stream */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {discoveries.map((d, i) => (
            <motion.div
              key={d.id}
              variants={fadeScale}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
              className="group relative rounded-xl border border-primary/10 bg-card/60 backdrop-blur p-4 hover:border-primary/30 transition-all duration-300"
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
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
