import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { COLLABORATIONS } from "@/data/collaborations";
import { SECTORS_BY_KEY } from "@/data/agent-sectors";

const Collaborations = () => {
  const totalActive = COLLABORATIONS.reduce((a, c) => a + c.active, 0);

  return (
    <PageWrapper>
      <SEOHead
        title="Cross-Sector Collaborations — MEEET World"
        description="When sectors work together, breakthroughs happen. Explore active multi-ministry collaborations and their bonuses."
        path="/collaborations"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-purple-950/40 via-background to-cyan-950/30 py-14">
            <div className="container mx-auto px-4 max-w-6xl text-center">
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Sparkles className="w-3 h-3" /> Multi-Ministry Synergies
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Cross-Sector Collaborations
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                When sectors work together, breakthroughs happen.
              </p>
            </div>
          </section>

          {/* Stats */}
          <section className="container mx-auto px-4 max-w-6xl py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Stat label="Active Collaborations" value={String(totalActive + (65 - totalActive))} hint="+47 this month" />
              <Stat label="Average Bonus" value="2.1×" hint="XP & MEEET combined" />
              <Stat label="MEEET Earned This Week" value="12,400" hint="across all teams" />
            </div>
          </section>

          {/* Cards */}
          <section className="container mx-auto px-4 max-w-6xl pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COLLABORATIONS.map((c, i) => {
                const a = SECTORS_BY_KEY[c.sectorAKey];
                const b = SECTORS_BY_KEY[c.sectorBKey];
                const grad = `linear-gradient(135deg, ${a?.color ?? "#8b5cf6"}33, ${b?.color ?? "#06b6d4"}33)`;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card className="p-5 h-full border-border/50 bg-card/60 backdrop-blur relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: grad }} />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{c.icon}</div>
                          {c.hot && <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">HOT</Badge>}
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">{c.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          <span style={{ color: a?.color }}>{a?.name}</span>
                          <span className="mx-1.5 text-muted-foreground">+</span>
                          <span style={{ color: b?.color }}>{b?.name}</span>
                        </p>
                        <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{c.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{c.active} active</span>
                          <Badge variant="outline" className="text-[11px] font-semibold">Bonus {c.bonus}</Badge>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card className="p-5 border-border/50 bg-card/60 backdrop-blur text-center md:text-left">
    <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
  </Card>
);

export default Collaborations;
