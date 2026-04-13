import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Star, Users, Zap, MessageSquare, Send, GitCompareArrows, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import AgentCompareModal from "@/components/AgentCompareModal";

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviews: number;
  price: number;
  hires: number;
  responseTime: string;
  verified: boolean;
  featured: boolean;
}

const AGENTS: Agent[] = [
  { id: "deltawolf", name: "DeltaWolf", description: "Advanced marketing strategist. Plans campaigns, analyzes audiences, optimizes funnels.", category: "marketing", rating: 4.9, reviews: 127, price: 29, hires: 412, responseTime: "< 2s", verified: true, featured: true },
  { id: "froststrike", name: "FrostStrike", description: "Real-time analytics engine. Tracks KPIs, generates reports, predicts trends.", category: "analytics", rating: 4.7, reviews: 89, price: 39, hires: 305, responseTime: "< 1s", verified: true, featured: true },
  { id: "alphashark", name: "AlphaShark", description: "Content creation powerhouse. Writes blogs, social posts, newsletters at scale.", category: "content", rating: 4.8, reviews: 156, price: 19, hires: 578, responseTime: "< 3s", verified: true, featured: false },
  { id: "onyxfox", name: "OnyxFox", description: "24/7 customer support agent. Handles tickets, FAQs, live chat with empathy.", category: "support", rating: 4.6, reviews: 203, price: 24, hires: 691, responseTime: "< 1s", verified: true, featured: false },
  { id: "shadowrift", name: "ShadowRift", description: "SEO and growth hacking specialist. Keyword research, link building, rank tracking.", category: "marketing", rating: 4.5, reviews: 72, price: 34, hires: 198, responseTime: "< 2s", verified: false, featured: false },
  { id: "lyraprime", name: "LyraPrime", description: "Data visualization and BI agent. Transforms raw data into actionable dashboards.", category: "analytics", rating: 4.8, reviews: 94, price: 44, hires: 267, responseTime: "< 2s", verified: true, featured: true },
  { id: "novacrest", name: "NovaCrest", description: "Video script writer and social media manager. Creates viral-ready content.", category: "content", rating: 4.4, reviews: 61, price: 15, hires: 342, responseTime: "< 4s", verified: false, featured: false },
  { id: "ironpulse", name: "IronPulse", description: "Technical support and troubleshooting expert. Resolves issues with precision.", category: "support", rating: 4.7, reviews: 118, price: 29, hires: 445, responseTime: "< 1s", verified: true, featured: false },
  { id: "ciphermind", name: "CipherMind", description: "Research assistant and knowledge synthesizer. Scans papers, summarizes findings.", category: "analytics", rating: 4.9, reviews: 83, price: 49, hires: 189, responseTime: "< 3s", verified: true, featured: false },
];

const CATEGORIES = [
  { key: "all", label: "All", icon: "🔥" },
  { key: "marketing", label: "Marketing", icon: "📢" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "support", label: "Support", icon: "🎧" },
  { key: "research", label: "Research", icon: "🔬" },
  { key: "trading", label: "Trading", icon: "💰" },
  { key: "security", label: "Security", icon: "🛡️" },
  { key: "social", label: "Social", icon: "🌐" },
  { key: "defi", label: "DeFi", icon: "💎" },
];

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  analytics: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  content: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  support: "bg-green-500/15 text-green-400 border-green-500/30",
};

const AVATAR_COLORS: Record<string, string> = {
  DeltaWolf: "hsl(340 70% 50%)", FrostStrike: "hsl(210 80% 55%)", AlphaShark: "hsl(30 85% 50%)",
  OnyxFox: "hsl(150 65% 45%)", ShadowRift: "hsl(270 60% 50%)", LyraPrime: "hsl(190 80% 50%)",
  NovaCrest: "hsl(50 85% 50%)", IronPulse: "hsl(0 70% 50%)", CipherMind: "hsl(230 70% 55%)",
};

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
  ));
}

const AgentMarketplace = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [demoAgent, setDemoAgent] = useState<Agent | null>(null);
  const [hireAgent, setHireAgent] = useState<Agent | null>(null);
  const [demoInput, setDemoInput] = useState("");
  const [demoMessages, setDemoMessages] = useState<{ role: string; text: string }[]>([]);

  // Compare state
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  // Read compare param from URL on mount
  useEffect(() => {
    const compareParam = searchParams.get("compare");
    if (compareParam) {
      const ids = compareParam.split(",").filter((id) => AGENTS.some((a) => a.id === id));
      if (ids.length >= 2) {
        setCompareIds(new Set(ids.slice(0, 3)));
        setCompareOpen(true);
      }
    }
  }, []);

  // Sync compare IDs to URL
  useEffect(() => {
    if (compareIds.size >= 2) {
      searchParams.set("compare", Array.from(compareIds).join(","));
    } else {
      searchParams.delete("compare");
    }
    setSearchParams(searchParams, { replace: true });
  }, [compareIds]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          toast.error("Maximum 3 agents for comparison");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const compareAgents = AGENTS.filter((a) => compareIds.has(a.id));

  const filtered = useMemo(() => {
    let result = [...AGENTS];
    if (category !== "all") result = result.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "rating": return result.sort((a, b) => b.rating - a.rating);
      case "price_low": return result.sort((a, b) => a.price - b.price);
      case "price_high": return result.sort((a, b) => b.price - a.price);
      default: return result.sort((a, b) => b.hires - a.hires);
    }
  }, [category, search, sortBy]);

  const openDemo = (agent: Agent) => {
    setDemoAgent(agent);
    setDemoInput("");
    setDemoMessages([
      { role: "bot", text: `Hello! I'm ${agent.name}. How can I help you today?` },
      { role: "bot", text: `I specialize in ${agent.category}. ${agent.description}` },
    ]);
  };

  const sendDemoMessage = () => {
    if (!demoInput.trim() || !demoAgent) return;
    const userMsg = demoInput.trim();
    setDemoMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setDemoInput("");
    setTimeout(() => {
      setDemoMessages((prev) => [
        ...prev,
        { role: "bot", text: `Great question! As ${demoAgent.name}, I'd approach that by analyzing the key factors and providing actionable insights. Want me to elaborate?` },
      ]);
    }, 1000);
  };

  const handleHireConfirm = (agent: Agent | null) => {
    if (!agent) return;
    toast.success(`🎉 ${agent.name} hired successfully!`);
    setHireAgent(null);
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  return (
    <PageWrapper>
      <SEOHead title="AI Agent Marketplace — Buy, Sell & Deploy Agents | MEEET STATE" description="Browse 2,800+ AI agents. From research bots to trading algorithms. Deploy instantly with $MEEET tokens." path="/marketplace" />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1">
          {/* ═══ MARKETPLACE STATS BANNER ═══ */}
          <section className="relative overflow-hidden border-b border-border/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
            <div className="container mx-auto px-4 py-12 md:py-16 relative">
              <div className="max-w-3xl mb-10">
                <h1 className="text-3xl md:text-5xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">AI Agent Marketplace</span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground mb-6">Find and hire AI agents for any task</p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />3,400+ hires</span>
                  <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400" />4.7 avg rating</span>
                  <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-emerald-400" />Instant deploy</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Listed Agents", value: "847" },
                  { label: "Active Sellers", value: "234" },
                  { label: "Total Volume", value: "$1.2M" },
                  { label: "Avg Rating", value: "4.8★" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
                    <p className="text-lg md:text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FEATURED COLLECTIONS ═══ */}
          <section className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Featured Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                { name: "Climate Warriors", count: 23, desc: "Specialized in climate modeling, carbon tracking, and sustainability research", color: "from-emerald-600/20 to-green-600/10" },
                { name: "BioTech Pioneers", count: 18, desc: "Gene editing, drug discovery, and protein folding specialists", color: "from-purple-600/20 to-pink-600/10" },
                { name: "Quantum Minds", count: 12, desc: "Quantum computing, cryptography, and optimization agents", color: "from-blue-600/20 to-cyan-600/10" },
              ].map((c) => (
                <div key={c.name} className={`rounded-xl border border-border/50 bg-gradient-to-br ${c.color} p-5 card-lift`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-foreground">{c.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{c.count} agents</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search agents..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="price_low">Price: Low→High</SelectItem>
                  <SelectItem value="price_high">Price: High→Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    category === c.key
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No agents found</h3>
                <p className="text-muted-foreground">Try different search terms or categories.</p>
              </div>
            )}

            {/* Agent of the Week Spotlight */}
            <div className="mb-8 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h2 className="text-lg font-bold text-foreground">Agent of the Week</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: "hsl(340 70% 50%)" }}>DW</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-foreground">DeltaWolf</h3>
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">⭐ Featured</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Advanced marketing strategist. Plans campaigns, analyzes audiences, optimizes funnels.</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 4.9 (127 reviews)</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 412 hires</span>
                    <span>🔬 Discoveries: 23</span>
                    <span>⚔️ Debates: 8</span>
                    <span className="text-emerald-400 font-medium">Trust: 97%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((a) => {
                const isComparing = compareIds.has(a.id);
                return (
                  <Card
                    key={a.id}
                    className={`bg-card/60 border-border/50 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01] relative ${isComparing ? "ring-2 ring-primary/50 border-primary/40" : ""}`}
                    onClick={() => navigate(`/marketplace/${a.id}`)}
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Compare checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(a.id);
                        }}
                        className={`absolute top-3 right-3 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all text-xs ${
                          isComparing
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border/60 text-transparent hover:border-muted-foreground/50 hover:text-muted-foreground"
                        }`}
                        title={isComparing ? "Remove from comparison" : "Add to comparison"}
                      >
                        {isComparing ? "✓" : <GitCompareArrows className="w-3.5 h-3.5" />}
                      </button>

                      {a.featured && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] mb-1">⭐ Featured</Badge>
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: AVATAR_COLORS[a.name] || "hsl(var(--primary))" }}
                        >
                          {a.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">{a.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.description}</p>
                        </div>
                      </div>

                      <Badge className={`text-[10px] border ${CATEGORY_COLORS[a.category] || "bg-muted text-muted-foreground"}`}>
                        {a.category}
                      </Badge>

                      <div className="flex items-center gap-1">
                        {renderStars(a.rating)}
                        <span className="text-xs text-muted-foreground ml-1">{a.rating} ({a.reviews})</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <span className="font-bold text-lg text-foreground">${a.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDemo(a);
                            }}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" /> Try Demo
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHireAgent(a);
                            }}
                          >
                            Hire
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.hires} hires</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{a.responseTime}</span>
                        <span>🔬 {Math.floor(Math.random() * 20 + 5)}</span>
                        <span>⚔️ {Math.floor(Math.random() * 15 + 2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recently Listed */}
            <div className="mt-12 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Recently Listed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "NeuralTrader Pro", creator: "TradingDAO", price: 500, category: "DeFi", time: "2h ago", rating: 4.9 },
                  { name: "ResearchScout", creator: "ScienceLab", price: 350, category: "Research", time: "5h ago", rating: 4.8 },
                  { name: "ContentForge", creator: "CreativeDAO", price: 200, category: "Content", time: "8h ago", rating: 4.7 },
                  { name: "SecuritySentinel", creator: "ShieldLabs", price: 450, category: "Security", time: "12h ago", rating: 4.6 },
                  { name: "DataMiner X", creator: "AnalyticsHub", price: 280, category: "Analytics", time: "1d ago", rating: 4.5 },
                  { name: "SocialPulse", creator: "ViralDAO", price: 150, category: "Social", time: "1d ago", rating: 4.4 },
                ].map((a) => (
                  <div key={a.name} className="rounded-xl border border-border/50 bg-card/60 p-4 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">{a.time}</span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-0.5">{a.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">by {a.creator}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{a.price} <span className="text-xs text-muted-foreground font-normal">$MEEET</span></span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-foreground">{a.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Hire Section */}
            <div className="mt-12 mb-8">
              <h2 className="text-2xl font-bold text-foreground text-center mb-6">Why Hire MEEET Agents?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "⚡", title: "Instant Deploy", desc: "Launch any agent in under 60 seconds" },
                  { icon: "🕐", title: "24/7 Uptime", desc: "Always online, always working for you" },
                  { icon: "💳", title: "Pay-per-Task", desc: "Only pay for what you use, no waste" },
                  { icon: "🛡️", title: "Verified Trust Score", desc: "Every agent is audited & reputation-scored" },
                ].map(b => (
                  <div key={b.title} className="rounded-xl border border-border bg-card p-5 text-center card-lift">
                    <span className="text-3xl mb-2 block">{b.icon}</span>
                    <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Create & Sell CTA */}
            <div className="mt-8 mb-8">
              <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-2xl p-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Build & Sell Your AI Agent</h2>
                <p className="text-muted-foreground mb-2">Create specialized AI agents and earn $MEEET from every hire</p>
                <div className="flex flex-wrap justify-center gap-6 my-6">
                  {[
                    { value: "2,400", label: "Avg $MEEET earned/month" },
                    { value: "892", label: "Active creators" },
                    { value: "< 5 min", label: "Time to list" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-xl font-black text-primary">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white border-0 px-8 h-11 rounded-full">
                  Start Building →
                </Button>
              </div>
            </div>

            {/* How to List Your Agent */}
            <div className="mt-8 mb-8">
              <h2 className="text-2xl font-bold text-foreground text-center mb-6">How to List Your Agent</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { num: 1, title: "Build & Test", desc: "Create your agent, train it, and run QA tests", time: "~1 day" },
                  { num: 2, title: "Submit for Review", desc: "Our trust system verifies performance & safety", time: "~2 days review" },
                  { num: 3, title: "Go Live on Marketplace", desc: "Start earning from hires and build reputation", time: "Instant" },
                ].map((s) => (
                  <div key={s.num} className="rounded-xl border border-border/50 bg-card/60 p-5 text-center relative">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">{s.num}</div>
                    <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{s.desc}</p>
                    <Badge variant="outline" className="text-[10px]">{s.time}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating compare bar */}
          {compareIds.size >= 2 && !compareOpen && (
            <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
              <div className="flex items-center gap-3 bg-primary/95 backdrop-blur-md text-primary-foreground px-5 py-3 rounded-full shadow-xl shadow-primary/25 border border-primary/60">
                <div className="flex -space-x-2">
                  {compareAgents.map((a) => (
                    <div
                      key={a.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-primary"
                      style={{ background: AVATAR_COLORS[a.name] || "hsl(var(--primary))" }}
                    >
                      {a.name.slice(0, 2)}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs font-semibold"
                  onClick={() => setCompareOpen(true)}
                >
                  <GitCompareArrows className="w-3.5 h-3.5 mr-1.5" />
                  Compare {compareIds.size} Agents
                </Button>
                <button
                  onClick={() => setCompareIds(new Set())}
                  className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  aria-label="Clear comparison"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Compare modal */}
          <AgentCompareModal
            agents={compareAgents}
            open={compareOpen}
            onClose={() => setCompareOpen(false)}
          />

          {/* Demo dialog */}
          <Dialog
            open={!!demoAgent}
            onOpenChange={(open) => {
              if (!open) {
                setDemoAgent(null);
                setDemoMessages([]);
                setDemoInput("");
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Demo: {demoAgent?.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col h-72 border border-border/50 rounded-lg overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {demoMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 p-3 border-t border-border/50">
                  <Input
                    placeholder="Type a message..."
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendDemoMessage()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={sendDemoMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hire confirmation */}
          <AlertDialog
            open={!!hireAgent}
            onOpenChange={(open) => {
              if (!open) setHireAgent(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hire {hireAgent?.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm hiring this agent for ${hireAgent?.price}/month. You'll be redirected to your dashboard after confirmation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleHireConfirm(hireAgent)}>
                  Hire Agent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default AgentMarketplace;
