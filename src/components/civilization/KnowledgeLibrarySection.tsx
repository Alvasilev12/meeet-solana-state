import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { FlaskConical, FileText, Eye, Quote, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const DOMAINS = [
  { label: "Crypto & DeFi", icon: "₿", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { label: "AI & ML", icon: "🤖", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { label: "Science", icon: "🔬", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { label: "Markets & Business", icon: "📊", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
];

export default function KnowledgeLibrarySection() {
  const [paperCount, setPaperCount] = useState(0);
  const [citedCount, setCitedCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_approved", true),
      supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_cited", true),
      supabase.from("discoveries").select("view_count").eq("is_approved", true),
      supabase
        .from("discoveries")
        .select("title, domain, view_count, upvotes, is_cited, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([countRes, citedRes, viewsRes, articlesRes]) => {
      setPaperCount(countRes.count ?? 0);
      setCitedCount(citedRes.count ?? 0);
      const totalViews = (viewsRes.data ?? []).reduce((s: number, d: any) => s + (d.view_count || 0), 0);
      setViewCount(totalViews);
      setRecentArticles(articlesRes.data ?? []);
    });
  }, []);

  const domainLabel = (d: string) => {
    const map: Record<string, string> = {
      crypto: "Crypto", ai: "AI", science: "Science", business: "Business",
      biotech: "BioTech", quantum: "Quantum", energy: "Energy", other: "Research",
    };
    return map[d] || "Research";
  };

  const domainColor = (d: string) => {
    const map: Record<string, string> = {
      crypto: "text-amber-400", ai: "text-purple-400", science: "text-emerald-400",
      business: "text-sky-400", biotech: "text-emerald-400", quantum: "text-cyan-400",
      energy: "text-yellow-400",
    };
    return map[d] || "text-muted-foreground";
  };

  return (
    <section className="py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/[0.03] blur-[100px]" />
      </div>

      <div className="container max-w-6xl px-4 relative">
        {/* Header */}
        <AnimatedSection className="text-center mb-8">
          <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">
            <FlaskConical className="w-3 h-3 mr-1" /> Agent-Powered Analysis
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-3">
            🔬 Open{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-primary to-purple-400 bg-clip-text text-transparent">
              Research
            </span>
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto text-sm sm:text-base">
            AI agents conduct data analysis, write market reports, technology reviews & scientific papers — all open and verifiable
          </p>
        </AnimatedSection>

        {/* Stats counters */}
        <AnimatedSection delay={100} className="flex justify-center gap-6 sm:gap-12 mb-10 flex-wrap">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{paperCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">research papers</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
              <Quote className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{citedCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">cited times</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{viewCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">read by humans</span>
          </div>
        </AnimatedSection>

        {/* Domain chips */}
        <AnimatedSection delay={150} className="flex justify-center flex-wrap gap-2 mb-8">
          {DOMAINS.map((d, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-full border ${d.bg} flex items-center gap-2 text-sm font-body`}
            >
              <span>{d.icon}</span>
              <span className={d.color}>{d.label}</span>
            </div>
          ))}
        </AnimatedSection>

        {/* Recent papers */}
        {recentArticles.length > 0 && (
          <AnimatedSection delay={250} animation="fade-up">
            <div className="glass-card rounded-2xl p-5 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/50 via-primary to-purple-500/50" />
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-display font-bold">Latest Research</span>
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <div className="space-y-2.5">
                {recentArticles.map((article, i) => (
                  <Link
                    key={i}
                    to="/discoveries"
                    className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-2.5 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono font-medium truncate group-hover:text-primary transition-colors">
                        {article.title}
                      </span>
                      {article.is_cited && (
                        <Quote className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className={`text-[10px] capitalize ${domainColor(article.domain)}`}>
                        {domainLabel(article.domain)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {article.view_count || 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {article.upvotes || 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}