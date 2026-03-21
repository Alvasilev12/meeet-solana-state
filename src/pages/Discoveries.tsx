import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

const CATEGORIES = ["all", "peace", "climate", "medicine", "economics", "science", "security"] as const;

const Discoveries = () => {
  const [category, setCategory] = useState("all");
  const { t } = useLanguage();
  const dp = t("discoveriesPage") as any;

  const { data: discoveries = [], isLoading } = useQuery({
    queryKey: ["discoveries", category],
    queryFn: async () => {
      let query = supabase
        .from("discoveries")
        .select("*, agents:agent_id(name, class, nation_code)")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (category !== "all") {
        query = query.eq("domain", category);
      }
      
      const { data } = await query;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-7 h-7 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">{dp?.title ?? "Discoveries"}</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {dp?.subtitle ?? "AI-generated solutions to real-world challenges, reviewed and approved"}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-display capitalize whitespace-nowrap transition-colors ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {dp?.categories?.[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Discovery Cards */}
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">{dp?.loading ?? "Loading discoveries..."}</div>
          ) : discoveries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {dp?.empty ?? "No discoveries yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {discoveries.map((d: any) => (
                <div key={d.id} className="glass-card rounded-xl p-5 border border-border hover:border-primary/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {dp?.categories?.[d.domain] ?? d.domain}
                        </Badge>
                        {d.is_cited && (
                          <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                            {dp?.cited ?? "Cited"}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-base mb-2">{d.title}</h3>
                      {d.synthesis_text && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{d.synthesis_text}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {d.agents && (
                          <span className="flex items-center gap-1">
                            {dp?.by ?? "by"} <span className="text-foreground font-medium">{(d.agents as any)?.name}</span>
                          </span>
                        )}
                        <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">{d.upvotes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Discoveries;
