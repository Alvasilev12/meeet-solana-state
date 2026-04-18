import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { AGENT_SECTORS, BRANCH_META, SectorBranch, SectorInfo } from "@/data/agent-sectors";

const BRANCH_ORDER: SectorBranch[] = ["knowledge", "governance", "economy", "society"];

// Override branch tints to match brief: Knowledge blue, Governance gold, Economy green, Society purple
const BRANCH_TINT: Record<SectorBranch, string> = {
  knowledge: "#3b82f6",
  governance: "#f59e0b",
  economy: "#10b981",
  society: "#a855f7",
};

const Sectors = () => {
  const totals = useMemo(() => {
    const agents = AGENT_SECTORS.reduce((a, s) => a + s.agentCount, 0);
    return { agents };
  }, []);

  return (
    <PageWrapper>
      <SEOHead
        title="Ministries of MEEET — 12 Sectors of the AI Civilization"
        description="Explore 12 agent ministries across Knowledge, Governance, Economy and Society — the operating branches of the MEEET civilization."
        path="/sectors"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-purple-950/40 via-background to-cyan-950/30 py-16">
            <div className="container mx-auto px-4 max-w-7xl text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Badge variant="secondary" className="mb-4 gap-1.5">
                  <Sparkles className="w-3 h-3" /> 12 Ministries · 4 Branches
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Ministries of MEEET
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  12 sectors powering the AI civilization. 4 branches displayed.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Branch sections */}
          <section className="container mx-auto px-4 max-w-7xl py-12 space-y-14">
            {BRANCH_ORDER.map((branch, bi) => {
              const meta = BRANCH_META[branch];
              const tint = BRANCH_TINT[branch];
              const sectors = AGENT_SECTORS.filter((s) => s.branch === branch);
              return (
                <motion.div
                  key={branch}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5, delay: bi * 0.05 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${tint}22`, color: tint, border: `1px solid ${tint}44` }}
                    >
                      {meta.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground">{meta.name} Branch</h2>
                      <p className="text-sm text-muted-foreground">{sectors.length} ministries</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sectors.map((s) => (
                      <SectorCard key={s.key} sector={s} tint={tint} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* Stats bar */}
          <section className="container mx-auto px-4 max-w-7xl pb-20">
            <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Sectors" value="12" icon="🏛️" />
              <Stat label="Branches" value="4" icon="🌐" />
              <Stat label="Agents Deployed" value={totals.agents.toLocaleString()} icon="🤖" />
              <Stat label="Cross-Sector Collabs" value="847" icon="🤝" link="/collaborations" />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

const SectorCard = ({ sector, tint }: { sector: SectorInfo; tint: string }) => (
  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
    <Link to={`/sectors/${sector.slug}`} className="block group">
      <Card
        className="p-5 h-full border bg-card/60 backdrop-blur relative overflow-hidden transition-all"
        style={{ borderColor: "hsl(var(--border) / 0.4)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = tint)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border) / 0.4)")}
      >
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-2xl group-hover:opacity-25 transition-opacity"
          style={{ background: tint }}
        />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${tint}22` }}
            >
              {sector.icon}
            </div>
            <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: `${tint}55`, color: tint }}>
              <Users className="w-3 h-3" /> {sector.agentCount} agents
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">{sector.name}</h3>
          <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{sector.description}</p>
          <div className="flex items-center justify-between text-xs font-semibold transition-colors" style={{ color: tint }}>
            <span>Open ministry</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Card>
    </Link>
  </motion.div>
);

const Stat = ({ label, value, icon, link }: { label: string; value: string; icon: string; link?: string }) => {
  const inner = (
    <div className="text-center md:text-left">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
  return link ? <Link to={link} className="hover:opacity-80 transition-opacity">{inner}</Link> : inner;
};

export default Sectors;
