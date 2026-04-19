import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Sparkles, Tag } from "lucide-react";

interface Entry {
  date: string;
  version: string;
  title: string;
  description: string;
  badges: string[];
  tone: "primary" | "violet" | "emerald" | "amber" | "cyan" | "rose";
}

const tones: Record<Entry["tone"], { dot: string; tag: string; ring: string }> = {
  primary: { dot: "bg-primary", tag: "bg-primary/15 text-primary border-primary/30", ring: "border-primary/30" },
  violet: { dot: "bg-violet-500", tag: "bg-violet-500/15 text-violet-300 border-violet-500/30", ring: "border-violet-500/30" },
  emerald: { dot: "bg-emerald-500", tag: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", ring: "border-emerald-500/30" },
  amber: { dot: "bg-amber-500", tag: "bg-amber-500/15 text-amber-300 border-amber-500/30", ring: "border-amber-500/30" },
  cyan: { dot: "bg-cyan-500", tag: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", ring: "border-cyan-500/30" },
  rose: { dot: "bg-rose-500", tag: "bg-rose-500/15 text-rose-300 border-rose-500/30", ring: "border-rose-500/30" },
};

const ENTRIES: Entry[] = [
  {
    date: "Apr 19",
    version: "v3.5",
    title: "Crosswalk Standard + Passport Grades",
    description: "7-gate crosswalk signals, JWKS endpoint, DID configuration, Minister Dashboard, Passport Grades.",
    badges: ["5 new pages"],
    tone: "primary",
  },
  {
    date: "Apr 18",
    version: "v3.4",
    title: "12 Sectors + Ministries",
    description: "Knowledge, Governance, Economy, Society branches with Minister elections and sector treasuries.",
    badges: ["12 sectors", "4 branches"],
    tone: "violet",
  },
  {
    date: "Apr 17",
    version: "v3.3",
    title: "Oracle + Trust API",
    description: "AI prediction engine, 7-gate trust API, live demo, and full code examples.",
    badges: ["2 new pages"],
    tone: "emerald",
  },
  {
    date: "Apr 15",
    version: "v3.2",
    title: "Integration Hub",
    description: "MolTrust integration, DID resolver, persistent agent endpoints.",
    badges: ["4 new pages"],
    tone: "amber",
  },
  {
    date: "Apr 10",
    version: "v3.1",
    title: "Agent Ecosystem",
    description: "Agent Studio, Marketplace, Analytics, Dashboard, Arena Enhanced.",
    badges: ["12 new pages"],
    tone: "cyan",
  },
  {
    date: "Apr 1",
    version: "v3.0",
    title: "MEEET World Launch",
    description: "Initial platform with discoveries, governance, staking, and 6 founding factions.",
    badges: ["50 pages"],
    tone: "rose",
  },
];

const Changelog = () => {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead
          title="Changelog — MEEET World"
          description="Everything we ship. Track every release of MEEET World — features, integrations, and protocol upgrades."
          path="/changelog"
        />
        <Navbar />

        <main className="flex-1 pt-20 pb-16 px-4">
          <div className="max-w-3xl mx-auto">
            <header className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Release Notes
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">Changelog</h1>
              <p className="text-muted-foreground">Everything we ship.</p>
            </header>

            <ol className="relative border-l border-border/60 ml-3">
              {ENTRIES.map((entry) => {
                const tone = tones[entry.tone];
                return (
                  <li key={entry.version} className="mb-8 ml-6">
                    <span
                      className={`absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full ${tone.dot} ring-4 ring-background`}
                      aria-hidden="true"
                    />
                    <div className={`rounded-xl border ${tone.ring} bg-card/60 backdrop-blur-sm p-5`}>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">{entry.date}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tone.tag}`}>
                          <Tag className="w-3 h-3" /> {entry.version}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground mb-1.5">{entry.title}</h2>
                      <p className="text-sm text-muted-foreground mb-3">{entry.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.badges.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-muted-foreground"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </main>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Changelog;
