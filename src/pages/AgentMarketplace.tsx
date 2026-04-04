import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Users, Zap, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

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

  return (
    <PageWrapper>
      <SEOHead title="AI Agent Marketplace | MEEET STATE" description="Find and hire AI agents for any task. 9+ agents ready to work." path="/marketplace" />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
            <div className="container mx-auto px-4 py-12 md:py-16 relative">
              <div className="max-w-3xl">
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
            </div>
          </section>

          <div className="container mx-auto px-4 py-6">
            {/* Search + Sort */}
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

            {/* Category Pills */}
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

            {/* Empty */}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No agents found</h3>
                <p className="text-muted-foreground">Try different search terms or categories.</p>
              </div>
            )}

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((a) => (
                <Card
                  key={a.id}
                  className="bg-card/60 border-border/50 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01]"
                  onClick={() => navigate(`/marketplace/${a.id}`)}
                >
                  <CardContent className="p-5 space-y-3">
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
                          onClick={(e) => { e.stopPropagation(); toast.info(`Demo coming soon for ${a.name}!`); }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" /> Try Demo
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success(`Successfully hired ${a.name}!`);
                            navigate("/dashboard");
                          }}
                        >
                          Hire
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{a.hires} hires</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{a.responseTime}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default AgentMarketplace;
