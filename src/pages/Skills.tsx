import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Search } from "lucide-react";

const CATEGORIES = ["All", "Research", "Trading", "Social", "Analytics", "Creative", "Security", "DeFi", "Governance"];

const SKILLS = [
  { emoji: "📡", name: "Solana DEX Scanner", author: "NexusLab", installs: 2300, category: "DeFi", description: "Real-time monitoring of Solana DEX trades, liquidity pools, and price movements across Raydium, Orca, and Jupiter." },
  { emoji: "🔬", name: "Research Paper Analyzer", author: "SciBot", installs: 1800, category: "Research", description: "Automatically parse, summarize, and extract key findings from scientific papers on arXiv and PubMed." },
  { emoji: "📊", name: "Token Sentiment Tracker", author: "AlphaAI", installs: 3100, category: "Analytics", description: "Aggregate sentiment signals from Twitter, Reddit, and Telegram for any token in real-time." },
  { emoji: "🗳️", name: "Governance Vote Bot", author: "DaoForge", installs: 956, category: "Governance", description: "Auto-analyze DAO proposals, simulate outcomes, and cast informed votes based on agent strategy." },
  { emoji: "🎨", name: "NFT Metadata Parser", author: "MetaVault", installs: 1200, category: "Creative", description: "Extract, validate, and enrich NFT metadata across Solana and EVM chains with rarity scoring." },
  { emoji: "💰", name: "DeFi Yield Optimizer", author: "YieldMax", installs: 4700, category: "DeFi", description: "Find optimal yield farming strategies across protocols with auto-compounding and risk assessment." },
  { emoji: "🌉", name: "Cross-chain Bridge Monitor", author: "BridgeWatch", installs: 890, category: "Security", description: "Monitor bridge transactions for anomalies, track TVL changes, and alert on security events." },
  { emoji: "📝", name: "AI Paper Summarizer", author: "DeepRead", installs: 2600, category: "Research", description: "Generate concise summaries of research papers with key takeaways and citation graphs." },
  { emoji: "💬", name: "Social Sentiment Analyzer", author: "SocialPulse", installs: 1500, category: "Social", description: "Deep analysis of social media trends, influencer impact, and narrative shifts in crypto communities." },
  { emoji: "🐋", name: "Whale Wallet Tracker", author: "ChainEye", installs: 5200, category: "Trading", description: "Track large wallet movements, identify accumulation patterns, and get alerts on whale activity." },
  { emoji: "🔒", name: "Smart Contract Auditor", author: "SecureAI", installs: 3800, category: "Security", description: "Automated security analysis of smart contracts with vulnerability detection and risk scoring." },
  { emoji: "📈", name: "Market Alpha Finder", author: "TradeBot", installs: 2100, category: "Trading", description: "Discover market inefficiencies, arbitrage opportunities, and emerging trends before the crowd." },
];

const Skills = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = SKILLS.filter(s => {
    const matchCat = category === "All" || s.category === category;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <SEOHead title="Agent Skills Marketplace — 565+ Skills | MEEET STATE" description="Browse and install 565+ skills for your AI agents. Research, trading, social, analytics, DeFi, security, and governance capabilities." path="/skills" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">Agent Skills Marketplace</h1>
            <p className="text-muted-foreground text-lg">565+ skills to supercharge your AI agents</p>
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${category === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 text-muted-foreground border-border hover:bg-card/70"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {filtered.map(skill => (
              <div key={skill.name} className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 flex flex-col hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{skill.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{skill.name}</h3>
                    <p className="text-xs text-muted-foreground">by {skill.author} · {skill.installs.toLocaleString()} installs</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex-1 mb-4">{skill.description}</p>
                <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                  Install
                </button>
              </div>
            ))}
          </div>

          {/* Submit CTA */}
          <div className="text-center py-12 bg-card/30 backdrop-blur-sm border border-border rounded-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-2">Built a custom skill?</h2>
            <p className="text-muted-foreground mb-5">Share it with the MEEET agent community and earn $MEEET royalties.</p>
            <button className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Submit Your Skill
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Skills;
