import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { FlaskConical, FileText, Eye, Quote, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const DOMAIN_META: Record<string, { label: string; glowColor: string; text: string }> = {
  crypto:   { label: "Crypto",   glowColor: "#f59e0b", text: "text-amber-400" },
  ai:       { label: "AI",       glowColor: "#a855f7", text: "text-purple-400" },
  science:  { label: "Science",  glowColor: "#10b981", text: "text-emerald-400" },
  business: { label: "Business", glowColor: "#0ea5e9", text: "text-sky-400" },
  biotech:  { label: "BioTech",  glowColor: "#22c55e", text: "text-green-400" },
  quantum:  { label: "Quantum",  glowColor: "#06b6d4", text: "text-cyan-400" },
  energy:   { label: "Energy",   glowColor: "#eab308", text: "text-yellow-400" },
  security: { label: "Security", glowColor: "#ef4444", text: "text-red-400" },
  other:    { label: "Research", glowColor: "#888888", text: "text-muted-foreground" },
};

const FILTER_CHIPS = [
  { key: "all", label: "All", icon: "✦" },
  { key: "crypto", label: "Crypto & DeFi", icon: "₿" },
  { key: "ai", label: "AI & ML", icon: "🤖" },
  { key: "science", label: "Science", icon: "🔬" },
  { key: "business", label: "Markets", icon: "📊" },
  { key: "biotech", label: "BioTech", icon: "🧬" },
  { key: "quantum", label: "Quantum", icon: "⚛️" },
  { key: "energy", label: "Energy", icon: "⚡" },
  { key: "security", label: "Security", icon: "🛡️" },
];

const PAGE_SIZE = 5;

const meta = (d: string) => DOMAIN_META[d] || DOMAIN_META.other;

export default function KnowledgeLibrarySection() {
  const [paperCount, setPaperCount] = useState(0);
  const [citedCount, setCitedCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [articles, setArticles] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial stats
  useEffect(() => {
    Promise.all([
      supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_approved", true),
      supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_cited", true),
      supabase.from("discoveries").select("view_count").eq("is_approved", true),
    ]).then(([countRes, citedRes, viewsRes]) => {
      setPaperCount(countRes.count ?? 0);
      setCitedCount(citedRes.count ?? 0);
      const totalViews = (viewsRes.data ?? []).reduce((s: number, d: any) => s + (d.view_count || 0), 0);
      setViewCount(totalViews);
    });
  }, []);

  const fetchArticles = useCallback(async (domain: string, pageNum: number, append: boolean) => {
    setLoadingMore(true);
    let q = supabase
      .from("discoveries")
      .select("title, domain, view_count, upvotes, is_cited, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (domain !== "all") q = q.eq("domain", domain);

    const { data } = await q;
    const rows = data ?? [];
    setHasMore(rows.length === PAGE_SIZE);
    setArticles((prev) => (append ? [...prev, ...rows] : rows));
    setLoadingMore(false);
  }, []);

  // Reset on filter change
  useEffect(() => {
    setPage(0);
    fetchArticles(filter, 0, false);
  }, [filter, fetchArticles]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchArticles(filter, next, true);
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

        {/* Domain filter chips */}
        <AnimatedSection delay={150} className="flex justify-center flex-wrap gap-2 mb-8">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`px-4 py-2 rounded-full border text-sm font-body flex items-center gap-2 transition-all duration-200 ${
                filter === chip.key
                  ? "bg-primary/20 border-primary/50 text-primary shadow-md shadow-primary/20"
                  : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40 hover:border-border"
              }`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </AnimatedSection>

        {/* Recent papers */}
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

            {articles.length === 0 && !loadingMore && (
              <p className="text-center text-muted-foreground text-sm py-6">No discoveries found for this domain</p>
            )}

            <div className="space-y-2.5">
              {articles.map((article, i) => {
                const m = meta(article.domain);
                return (
                  <Link
                    key={`${article.title}-${i}`}
                    to="/discoveries"
                    className="discovery-card flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 transition-all duration-300 group border border-transparent bg-muted/30 hover:bg-muted/50"
                    style={{ "--glow-color": m.glowColor } as React.CSSProperties}
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
                      <Badge variant="outline" className={`text-[10px] capitalize ${m.text}`}>
                        {m.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {article.view_count || 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {article.upvotes || 0}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && articles.length > 0 && (
              <div className="flex justify-center mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
