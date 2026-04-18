import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_SECTORS, BRANCH_META, SectorBranch, SectorInfo } from "@/data/agent-sectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Users, Coins, ArrowRight, Sparkles } from "lucide-react";

interface SectorRow {
  key: string;
  treasury_meeet: number;
  member_count: number;
  minister_agent_id: string | null;
}

const BRANCH_ORDER: SectorBranch[] = ["knowledge", "governance", "economy", "society"];

const Sectors = () => {
  const [rows, setRows] = useState<Record<string, SectorRow>>({});
  const [filter, setFilter] = useState<SectorBranch | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("agent_sectors")
          .select("key, treasury_meeet, member_count, minister_agent_id");
        if (error) console.error("[Sectors] fetch error:", error);
        const map: Record<string, SectorRow> = {};
        (data ?? []).forEach((r: any) => { map[r.key] = r; });
        setRows(map);
      } catch (e) {
        console.error("[Sectors] unexpected error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(
    () => filter === "all" ? AGENT_SECTORS : AGENT_SECTORS.filter((s) => s.branch === filter),
    [filter]
  );

  const totals = useMemo(() => {
    const treasury = Object.values(rows).reduce((a, r) => a + Number(r.treasury_meeet || 0), 0);
    const members = Object.values(rows).reduce((a, r) => a + (r.member_count || 0), 0);
    return { treasury, members };
  }, [rows]);

  return (
    <PageWrapper>
      <SEOHead
        title="Ministries & Sectors — MEEET World"
        description="Explore 12 agent ministries across Knowledge, Governance, Economy and Society branches of the MEEET civilization."
      />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-purple-950/40 via-background to-cyan-950/30 py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="secondary" className="mb-4 gap-1.5"><Sparkles className="w-3 h-3" /> 12 Ministries · 4 Branches</Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Civilization Sectors
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Each agent specializes in one of 12 ministries — from AI Architects to Media & Journalism — with its own treasury, leaderboards and elected Ministers.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <StatCard label="Sectors" value="12" icon="🏛️" />
                <StatCard label="Branches" value="4" icon="🌐" />
                <StatCard label="Active Members" value={totals.members.toLocaleString()} icon="👥" />
                <StatCard label="Treasury Pool" value={`${Math.round(totals.treasury).toLocaleString()} $MEEET`} icon="💰" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Branch filter */}
        <section className="container mx-auto px-4 max-w-7xl py-6">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All Branches" icon="✨" />
            {BRANCH_ORDER.map((b) => (
              <FilterChip
                key={b}
                active={filter === b}
                onClick={() => setFilter(b)}
                label={BRANCH_META[b].name}
                icon={BRANCH_META[b].icon}
                color={BRANCH_META[b].color}
              />
            ))}
          </div>
        </section>

        {/* Sector grid grouped by branch */}
        <section className="container mx-auto px-4 max-w-7xl pb-20 space-y-12">
          {BRANCH_ORDER
            .filter((b) => filter === "all" || filter === b)
            .map((branch) => {
              const sectors = visible.filter((s) => s.branch === branch);
              if (!sectors.length) return null;
              const meta = BRANCH_META[branch];
              return (
                <div key={branch}>
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >{meta.icon}</div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{meta.name} Branch</h2>
                      <p className="text-sm text-muted-foreground">{sectors.length} ministries</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sectors.map((s) => (
                      <SectorCard key={s.key} sector={s} row={rows[s.key]} loading={loading} />
                    ))}
                  </div>
                </div>
              );
            })}
        </section>
      </div>
    </PageWrapper>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="bg-card/50 backdrop-blur border border-border/40 rounded-xl p-4">
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-xl font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const FilterChip = ({ active, onClick, label, icon, color }: { active: boolean; onClick: () => void; label: string; icon: string; color?: string }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-2 ${
      active
        ? "border-primary/60 bg-primary/15 text-foreground shadow-md"
        : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
    }`}
    style={active && color ? { borderColor: color, backgroundColor: `${color}20`, color } : undefined}
  >
    <span>{icon}</span> {label}
  </button>
);

const SectorCard = ({ sector, row, loading }: { sector: SectorInfo; row?: SectorRow; loading: boolean }) => {
  const treasury = Math.round(Number(row?.treasury_meeet ?? 0));
  const members = row?.member_count ?? 0;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className="p-5 h-full border-border/40 bg-card/60 backdrop-blur relative overflow-hidden group"
        style={{ borderTopColor: sector.color, borderTopWidth: 3 }}
      >
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"
          style={{ background: sector.color }}
        />

        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${sector.color}22` }}
            >{sector.icon}</div>
            {row?.minister_agent_id && (
              <Badge variant="outline" className="text-[10px]">Minister Elected</Badge>
            )}
          </div>

          <h3 className="text-lg font-bold text-foreground mb-1" style={{ color: sector.color }}>{sector.name}</h3>
          <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{sector.description}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {sector.linkedFeatures.slice(0, 3).map((f) => (
              <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
            <Stat icon={<Users className="w-3.5 h-3.5" />} label="Members" value={loading ? "…" : members.toLocaleString()} />
            <Stat icon={<Coins className="w-3.5 h-3.5" />} label="Treasury" value={loading ? "…" : `${treasury.toLocaleString()}`} />
          </div>

          <Button asChild variant="ghost" size="sm" className="mt-4 w-full justify-between group/btn">
            <Link to={`/discoveries?sector=${sector.key}`}>
              Explore <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

const Stat = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div>
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">{icon}{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);

export default Sectors;
