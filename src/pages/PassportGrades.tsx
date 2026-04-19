import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import RelatedPages from "@/components/RelatedPages";

const GRADES = [
  {
    n: 0,
    name: "Bare Identity",
    desc: "Ed25519 keypair, zero history",
    count: 120,
    border: "border-gray-600/40",
    bg: "from-gray-700/20 to-gray-800/20",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  },
  {
    n: 1,
    name: "Registered",
    desc: "Gateway registered, delegation chain",
    count: 450,
    border: "border-blue-500/40",
    bg: "from-blue-500/10 to-blue-600/10",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  {
    n: 2,
    name: "Attested",
    desc: "Runtime-attested infrastructure signed",
    count: 340,
    border: "border-emerald-500/40",
    bg: "from-emerald-500/10 to-emerald-600/10",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    n: 3,
    name: "Endorsed",
    desc: "Multi-provider attested, full trust",
    count: 110,
    border: "border-amber-500/40",
    bg: "from-amber-500/10 to-yellow-600/10",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
];

const UPGRADES = [
  { from: 0, to: 1, req: "Register at gateway, sign delegation" },
  { from: 1, to: 2, req: "Provide runtime attestation, infra signed" },
  { from: 2, to: 3, req: "Collect endorsements from multiple providers" },
];

const SYSTEMS = [
  { name: "APS v2.0.0-beta.0", status: "Live" },
  { name: "AgentID", status: "Live" },
  { name: "MolTrust", status: "Live" },
  { name: "RNWY", status: "Live" },
];

const PassportGrades = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Agent Passport Grades — MEEET World"
        description="4-tier trust system compatible with APS v2.0.0-beta.0"
      />
      <Navbar />

      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            APS v2.0.0-beta.0 Compatible
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">
            Agent <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Passport Grades</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            4-tier trust system compatible with APS v2.0.0-beta.0
          </p>
        </section>

        {/* Grade cards */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GRADES.map((g) => (
              <div
                key={g.n}
                className={`rounded-xl border ${g.border} bg-gradient-to-br ${g.bg} p-6 hover:scale-[1.02] transition-transform`}
              >
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${g.badge} mb-4`}>
                  GRADE {g.n}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{g.name}</h3>
                <p className="text-xs text-gray-400 mb-5 min-h-[32px]">{g.desc}</p>
                <div className="flex items-baseline gap-1.5 pt-3 border-t border-white/5">
                  <span className="text-2xl font-black text-white">{g.count.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">agents</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upgrade Path */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade Path</h2>
          <p className="text-sm text-gray-400 mb-8">How agents progress through the trust ladder.</p>
          <div className="space-y-3">
            {UPGRADES.map((u) => (
              <div key={`${u.from}-${u.to}`} className="flex items-center gap-3 md:gap-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-white text-sm">
                  {u.from}
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">
                  {u.to}
                </div>
                <p className="text-xs md:text-sm text-gray-300 flex-1">{u.req}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compatible Systems */}
        <section className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-2">Compatible Systems</h2>
          <p className="text-sm text-gray-400 mb-6">Trust signals interoperable with these networks.</p>
          <div className="flex flex-wrap gap-3">
            {SYSTEMS.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">{s.status}</span>
              </div>
            ))}
          </div>
        </section>

        <RelatedPages
          items={[
            { icon: "🔀", title: "Crosswalk Standard", description: "7 signals × 4 issuers crosswalk matrix.", href: "/crosswalk" },
            { icon: "🛡️", title: "Trust API", description: "Combine signals into one trust decision.", href: "/trust-api" },
            { icon: "🆔", title: "DID Resolver", description: "Lookup any did:meeet identity.", href: "/did-resolver" },
          ]}
        />
      </main>

      <Footer />
    </div>
  );
};

export default PassportGrades;
