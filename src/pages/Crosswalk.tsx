import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import RelatedPages from "@/components/RelatedPages";

interface Gate {
  num: number;
  name: string;
  icon: string;
  issuers: { name: string; color: string }[];
  description: string;
  file: string;
  vcSchema: string;
  jwksUri: string;
  didEndpoint: string;
  l2Anchor: string;
}

const GATES: Gate[] = [
  {
    num: 1,
    name: "Identity",
    icon: "🔑",
    issuers: [{ name: "APS", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" }],
    description: "Ed25519 DID + JWKS verification",
    file: "crosswalk/aps-identity.yaml",
    vcSchema: "IdentityCredential",
    jwksUri: "aps.network/.well-known/jwks.json",
    didEndpoint: "aps.network/did-resolver",
    l2Anchor: "ethereum",
  },
  {
    num: 2,
    name: "Authority",
    icon: "🛡",
    issuers: [{ name: "APS", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" }],
    description: "Delegation scope + constraints",
    file: "crosswalk/aps-authority.yaml",
    vcSchema: "AuthorityCredential",
    jwksUri: "aps.network/.well-known/jwks.json",
    didEndpoint: "aps.network/did-resolver",
    l2Anchor: "ethereum",
  },
  {
    num: 3,
    name: "Wallet State",
    icon: "💳",
    issuers: [
      { name: "APS", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
      { name: "InsumerAPI", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
    ],
    description: "BoundWallet multichain verification",
    file: "crosswalk/aps-wallet.yaml",
    vcSchema: "BoundWalletCredential",
    jwksUri: "insumer.api/.well-known/jwks.json",
    didEndpoint: "insumer.api/did-resolver",
    l2Anchor: "polygon",
  },
  {
    num: 4,
    name: "Trust Verification",
    icon: "✅",
    issuers: [{ name: "MolTrust", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" }],
    description: "VerifiedSkillCredential + DIF Universal Resolver",
    file: "crosswalk/moltrust.yaml",
    vcSchema: "VerifiedSkillCredential",
    jwksUri: "moltrust.io/.well-known/jwks.json",
    didEndpoint: "moltrust.io/did-resolver",
    l2Anchor: "base",
  },
  {
    num: 5,
    name: "Peer Review",
    icon: "👥",
    issuers: [{ name: "RNWY", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" }],
    description: "Peer review accuracy + confidence",
    file: "crosswalk/rnwy-peer.yaml",
    vcSchema: "PeerReviewCredential",
    jwksUri: "rnwy.io/.well-known/jwks.json",
    didEndpoint: "rnwy.io/did-resolver",
    l2Anchor: "arbitrum",
  },
  {
    num: 6,
    name: "Behavioral Trust",
    icon: "🧠",
    issuers: [{ name: "RNWY", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" }],
    description: "Interaction patterns + anomaly detection",
    file: "crosswalk/rnwy-behavior.yaml",
    vcSchema: "BehavioralTrustCredential",
    jwksUri: "rnwy.io/.well-known/jwks.json",
    didEndpoint: "rnwy.io/did-resolver",
    l2Anchor: "arbitrum",
  },
  {
    num: 7,
    name: "Economic Accountability",
    icon: "💰",
    issuers: [{ name: "MEEET", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" }],
    description: "Staking + slash record + burn contribution",
    file: "crosswalk/meeet.yaml",
    vcSchema: "EconomicAccountabilityCredential",
    jwksUri: "meeet.world/.well-known/jwks.json",
    didEndpoint: "meeet.world/did-resolver",
    l2Anchor: "solana",
  },
];

const YAML_EXAMPLE = `issuer: did:meeet:economic-accountability
canonical_signal: economic_accountability
vc_schema: EconomicAccountabilityCredential
jwks_uri: meeet.world/.well-known/jwks.json
did_resolution: meeet.world/did-resolver
evidence:
  staking_history: true
  slash_record: true
  burn_contribution: true
  verification_accuracy: true
l2_anchor: solana`;

const ISSUERS = ["APS", "InsumerAPI", "MolTrust", "RNWY", "MEEET", "VeroQ", "Signet"];

const Crosswalk = () => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const copy = () => {
    navigator.clipboard.writeText(YAML_EXAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Coverage matrix: which issuer covers which gate
  const coverage: Record<string, number[]> = {
    APS: [1, 2, 3],
    InsumerAPI: [3],
    MolTrust: [4],
    RNWY: [5, 6],
    MEEET: [7],
    VeroQ: [],
    Signet: [],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Trust Signal Crosswalk — MEEET World"
        description="Seven signals. Seven issuers. One trust decision. Cross-system trust composition for AI agents."
      />
      <Navbar />

      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Trust Composition Standard
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">
            Trust Signal <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Crosswalk</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Seven signals. Seven issuers. One trust decision.
          </p>
        </section>

        {/* Gates Table */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">The Seven Gates</h2>
          <div className="space-y-3">
            {GATES.map((g) => (
              <div
                key={g.num}
                onClick={() => setExpanded(expanded === g.num ? null : g.num)}
                className="group cursor-pointer rounded-xl border border-gray-800 bg-gray-900/40 hover:border-purple-500/40 hover:bg-gray-900/70 transition-all"
              >
                <div className="flex items-center gap-4 p-4 md:p-5">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-2xl">
                    {g.icon}
                  </div>
                  <div className="shrink-0 text-xs font-mono text-gray-500 hidden sm:block">Gate {g.num}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-white">{g.name}</h3>
                      {g.issuers.map((i) => (
                        <span key={i.name} className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${i.color}`}>
                          {i.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{g.description}</p>
                  </div>
                  <div className="hidden md:block text-[10px] text-gray-500 font-mono">{g.file}</div>
                </div>
                {expanded === g.num && (
                  <div className="px-4 md:px-5 pb-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border-t border-gray-800/50">
                    <div className="pt-3">
                      <div className="text-gray-500 mb-1">VC Schema</div>
                      <div className="font-mono text-purple-300">{g.vcSchema}</div>
                    </div>
                    <div className="pt-3">
                      <div className="text-gray-500 mb-1">JWKS URI</div>
                      <div className="font-mono text-cyan-300 truncate">{g.jwksUri}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">DID Resolution</div>
                      <div className="font-mono text-cyan-300 truncate">{g.didEndpoint}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">L2 Anchor</div>
                      <div className="font-mono text-emerald-300">{g.l2Anchor}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: "1", t: "Agent requests trust check", d: "Consumer queries the agent's full trust profile across all 7 gates" },
              { n: "2", t: "Each issuer returns signed signal", d: "Issuers independently produce VC-signed evidence per their domain" },
              { n: "3", t: "Consumer combines signals", d: "AND composition: all 7 gates must pass for full trust decision" },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-gray-800 bg-gray-900/40 p-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold mb-4">
                  {s.n}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{s.t}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* YAML Example */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">YAML Example</h2>
            <code className="text-xs text-gray-500">crosswalk/meeet.yaml</code>
          </div>
          <div className="relative rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
            <button
              onClick={copy}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-white transition-colors"
            >
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
            <pre className="p-5 pr-24 text-xs overflow-x-auto leading-relaxed">
              <code className="text-gray-300">
                {YAML_EXAMPLE.split("\n").map((line, i) => {
                  const [key, ...rest] = line.split(":");
                  const val = rest.join(":");
                  if (!val) return <div key={i}>{line}</div>;
                  return (
                    <div key={i}>
                      <span className="text-purple-400">{key}</span>
                      <span className="text-gray-400">:</span>
                      <span className="text-emerald-300">{val}</span>
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </section>

        {/* Coverage Matrix */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <h2 className="text-2xl font-bold text-white mb-2">Live Coverage Map</h2>
          <p className="text-sm text-gray-400 mb-6">Which issuers cover which gates today.</p>
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-6 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-2">Issuer</th>
                  {GATES.map((g) => (
                    <th key={g.num} className="text-center text-xs text-gray-500 font-medium pb-2 px-1">
                      G{g.num}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ISSUERS.map((iss) => (
                  <tr key={iss} className="border-t border-gray-800/50">
                    <td className="text-xs font-semibold text-white py-2 pr-2">{iss}</td>
                    {GATES.map((g) => {
                      const covered = coverage[iss]?.includes(g.num);
                      return (
                        <td key={g.num} className="text-center py-2 px-1">
                          <div
                            className={`mx-auto w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                              covered
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-gray-800/40 text-gray-600 border border-gray-800"
                            }`}
                          >
                            {covered ? "✓" : "·"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { v: "7", l: "Gates Covered" },
              { v: "4", l: "Independent Issuers" },
              { v: "3", l: "Crosswalk Files Published" },
              { v: "100%", l: "Signal Coverage" },
            ].map((s) => (
              <div key={s.l} className="text-center rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                  {s.v}
                </div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        <RelatedPages
          items={[
            { icon: "🎖️", title: "Passport Grades", description: "4-tier trust system from Bare Identity to Endorsed.", href: "/passport-grades" },
            { icon: "🛡️", title: "Trust API", description: "Compose 7 signals into one trust decision.", href: "/trust-api" },
            { icon: "🏛", title: "Minister Dashboard", description: "Sector treasury, spending, and elections.", href: "/minister-dashboard" },
            { icon: "🧪", title: "API Playground", description: "Test the Trust, Agent, and Oracle APIs live.", href: "/api-playground" },
            { icon: "🆔", title: "DID Resolver", description: "Resolve did:meeet and did:web identities.", href: "/did-resolver" },
            { icon: "🏛️", title: "12 Ministries", description: "All sectors and branches of the AI civilization.", href: "/sectors" },
          ]}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Crosswalk;
