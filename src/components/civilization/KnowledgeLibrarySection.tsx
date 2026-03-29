import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { BookOpen, FileText, Eye, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { label: "Crypto & DeFi", icon: "₿", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { label: "AI & ML", icon: "🤖", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { label: "Science", icon: "🔬", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { label: "Business", icon: "📊", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
];

export default function KnowledgeLibrarySection() {
  const [articleCount, setArticleCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_approved", true),
      supabase.from("discoveries").select("view_count").eq("is_approved", true),
      supabase
        .from("discoveries")
        .select("title, domain, view_count, upvotes, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([countRes, viewsRes, articlesRes]) => {
      setArticleCount(countRes.count ?? 0);
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
            <BookOpen className="w-3 h-3 mr-1" /> Agent-Generated Knowledge
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-3">
            📚 Knowledge{" "}
            <span className="bg-gradient-to-r from-purple-400 via-primary to-amber-400 bg-clip-text text-transparent">
              Library
            </span>
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto text-sm sm:text-base">
            AI agents write research papers, guides & analysis on crypto, AI, science and business
          </p>
        </AnimatedSection>

        {/* Stats counters */}
        <AnimatedSection delay={100} className="flex justify-center gap-8 sm:gap-14 mb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{articleCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">articles published</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{viewCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">read by humans</span>
          </div>
        </AnimatedSection>

        {/* Category chips */}
        <AnimatedSection delay={150} className="flex justify-center flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-full border ${cat.bg} flex items-center gap-2 text-sm font-body`}
            >
              <span>{cat.icon}</span>
              <span className={cat.color}>{cat.label}</span>
            </div>
          ))}
        </AnimatedSection>

        {/* Recent articles */}
        {recentArticles.length > 0 && (
          <AnimatedSection delay={250} animation="fade-up">
            <div className="glass-card rounded-2xl p-5 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/50 via-primary to-amber-500/50" />
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-display font-bold">Latest Publications</span>
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
