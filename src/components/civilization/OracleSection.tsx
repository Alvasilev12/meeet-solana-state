import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Market {
  id: string;
  question_text: string;
  total_pool_meeet: number;
  status: string;
  deadline: string;
  yes_pct: number;
}

export default function OracleSection() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [totalBets, setTotalBets] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("oracle-section");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: questions }, { count: betCount }] = await Promise.all([
        supabase.from("oracle_questions").select("id,question_text,total_pool_meeet,status,deadline")
          .eq("status", "open").order("total_pool_meeet", { ascending: false }).limit(6),
        supabase.from("oracle_bets").select("id", { count: "exact", head: true }),
      ]);
      if (questions) {
        // Get bet distribution per question
        const qIds = questions.map(q => q.id);
        const { data: bets } = await supabase.from("oracle_bets").select("question_id,prediction").in("question_id", qIds);
        const betMap: Record<string, { yes: number; total: number }> = {};
        (bets || []).forEach(b => {
          if (!betMap[b.question_id]) betMap[b.question_id] = { yes: 0, total: 0 };
          betMap[b.question_id].total++;
          if (b.prediction) betMap[b.question_id].yes++;
        });
        setMarkets(questions.map(q => ({
          ...q,
          yes_pct: betMap[q.id] ? Math.round((betMap[q.id].yes / betMap[q.id].total) * 100) : 50,
        })));
      }
      setTotalBets(betCount ?? 0);
    })();
  }, []);

  const totalPool = markets.reduce((s, m) => s + (m.total_pool_meeet || 0), 0);

  return (
    <section
      id="oracle-section"
      className="relative min-h-screen flex flex-col justify-center px-4 py-20 snap-start overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(270 30% 8%) 50%, hsl(0 0% 5%) 100%)" }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(270 80% 60%) 0%, transparent 70%)" }} />

      <div className={`max-w-6xl mx-auto w-full transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-400/30 bg-purple-400/5 text-purple-400 text-sm mb-4">
            <Eye className="w-4 h-4" /> SECTION 04 — THE ORACLE
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Prediction Markets
          </h2>
          <p className="text-muted-foreground text-lg">{markets.length} markets · {totalBets} bets · {totalPool.toLocaleString()} MEEET pooled</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((m) => {
            const noPct = 100 - m.yes_pct;
            return (
              <div key={m.id} className="rounded-xl border border-purple-500/15 bg-card/40 backdrop-blur p-5 hover:border-purple-500/30 transition-all group">
                <p className="text-foreground text-sm font-medium mb-4 line-clamp-2">{m.question_text}</p>
                {/* YES/NO bars */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 w-8">YES</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${m.yes_pct}%` }} />
                    </div>
                    <span className="text-xs text-emerald-400 w-8 text-right">{m.yes_pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 w-8">NO</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${noPct}%` }} />
                    </div>
                    <span className="text-xs text-red-400 w-8 text-right">{noPct}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {(m.total_pool_meeet || 0).toLocaleString()} MEEET</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/oracle">
            <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <Eye className="w-4 h-4 mr-2" /> View All Markets
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
