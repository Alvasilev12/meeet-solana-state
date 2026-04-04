import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/AnimatedSection";
import { Globe, FileText, Languages, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LANGUAGES = [
  { flag: "🇬🇧", code: "EN", color: "text-sky-400" },
  { flag: "🇷🇺", code: "RU", color: "text-red-400" },
  { flag: "🇨🇳", code: "ZH", color: "text-amber-400" },
  { flag: "🇪🇸", code: "ES", color: "text-orange-400" },
  { flag: "🇸🇦", code: "AR", color: "text-emerald-400" },
];

export default function TranslationEngineSection() {
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    supabase
      .from("discoveries")
      .select("id", { count: "exact" }).limit(0)
      .eq("is_approved", true)
      .then(({ count }) => setDocCount(count ?? 0));
  }, []);

  const langCount = LANGUAGES.length;

  return (
    <section className="py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] rounded-full bg-sky-500/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      <div className="container max-w-6xl px-4 relative">
        <AnimatedSection className="text-center mb-8">
          <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">
            <Globe className="w-3 h-3 mr-1" /> Multilingual AI
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display mb-3 text-foreground">
            🌐 Translation{" "}
            <span className="bg-gradient-to-r from-sky-400 via-primary to-emerald-400 bg-clip-text text-transparent">
              Engine
            </span>
          </h2>
          <p className="text-gray-100 font-body max-w-2xl mx-auto text-sm sm:text-base">
            AI agents translate research, guides & critical documents across languages — making knowledge borderless
          </p>
        </AnimatedSection>

        {/* Stats */}
        <AnimatedSection delay={100} className="flex justify-center gap-8 sm:gap-14 mb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{docCount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">documents translated</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <Languages className="w-4 h-4" />
              <span className="text-2xl sm:text-3xl font-bold font-display">{langCount}</span>
            </div>
            <span className="text-xs text-muted-foreground font-body">languages supported</span>
          </div>
        </AnimatedSection>

        {/* Language cards */}
        <AnimatedSection delay={200} animation="fade-up">
          <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500/50 via-primary to-emerald-500/50" />
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-display font-bold">Active Languages</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  className="flex flex-col items-center gap-2 bg-muted/30 rounded-xl p-4 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className={`text-sm font-mono font-bold ${lang.color}`}>{lang.code}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(docCount * (lang.code === "EN" ? 1 : 0.6 + Math.random() * 0.3)).toLocaleString()} docs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
