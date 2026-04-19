import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowRight } from "lucide-react";
import {
  AGENT_SECTORS,
  BRANCH_META,
  SECTORS_BY_BRANCH,
  type SectorBranch,
} from "@/data/agent-sectors";

const BRANCH_ORDER: SectorBranch[] = ["knowledge", "governance", "economy", "society"];

export default function FactionsSection() {
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("agent_sectors")
        .select("key, member_count");
      if (!data) return;
      const map: Record<string, number> = {};
      for (const row of data as { key: string; member_count: number | null }[]) {
        map[row.key] = row.member_count ?? 0;
      }
      setLiveCounts(map);
    })();
  }, []);

  const getCount = (key: string, fallback: number) =>
    liveCounts[key] ?? fallback;

  const totals = useMemo(() => {
    const branchTotals: Record<SectorBranch, number> = {
      knowledge: 0, governance: 0, economy: 0, society: 0,
    };
    let total = 0;
    for (const s of AGENT_SECTORS) {
      const c = getCount(s.key, s.agentCount);
      branchTotals[s.branch] += c;
      total += c;
    }
    return { total, branches: branchTotals };
  }, [liveCounts]);

  return (
    <section
      id="factions-section"
      className="relative px-4 py-12 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(262 40% 6%) 0%, hsl(0 0% 5%) 50%, hsl(262 40% 6%) 100%)" }}
    >
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 text-secondary text-sm mb-4">
            <Shield className="w-4 h-4" /> SECTION 02 — THE MINISTRIES
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            12 Ministries · 4 Branches
          </h2>
          <p className="text-muted-foreground text-lg">
            {totals.total.toLocaleString()} agents organising the AI civilization
          </p>
        </div>

        {/* Branch sections */}
        <div className="space-y-8">
          {BRANCH_ORDER.map((branch) => {
            const meta = BRANCH_META[branch];
            const sectors = SECTORS_BY_BRANCH[branch] ?? [];
            const branchCount = totals.branches[branch];
            return (
              <div key={branch}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: `${meta.color}1a`, border: `1px solid ${meta.color}55` }}
                    >
                      {meta.icon}
                    </span>
                    <div>
                      <h3 className="text-foreground font-bold text-lg leading-tight">
                        {meta.name} Branch
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {sectors.length} ministries · {branchCount.toLocaleString()} agents
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/sectors"
                    className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Explore <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {sectors.map((s) => {
                    const count = getCount(s.key, s.agentCount);
                    const pct = totals.total > 0 ? Math.round((count / totals.total) * 100) : 0;
                    return (
                      <Link
                        key={s.key}
                        to={`/sectors/${s.slug}`}
                        className="group relative rounded-xl border bg-card/40 p-4 hover:scale-[1.03] transition-all duration-300 overflow-hidden"
                        style={{ borderColor: `${s.color}33` }}
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          style={{ background: `radial-gradient(circle at center, ${s.color}14 0%, transparent 70%)` }}
                        />
                        <div className="relative z-10">
                          <span className="text-2xl mb-2 block">{s.icon}</span>
                          <h4 className="text-foreground font-semibold text-sm leading-tight truncate">{s.name}</h4>
                          <p className="text-xl font-bold mt-1.5" style={{ color: s.color }}>
                            {count.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">agents · {pct}%</p>
                          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${Math.max(pct, 4)}%`, background: s.color }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <Link
            to="/sectors"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/60 bg-card/40 text-sm text-foreground hover:bg-card/60 transition-colors"
          >
            Explore all 12 ministries <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
