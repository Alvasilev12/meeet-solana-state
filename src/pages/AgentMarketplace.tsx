
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Star, CheckCircle2, Users, Zap, Grid3X3, List, MessageSquare, Globe, Send, Code, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

interface HireListing {
  id: string;
  agent_id: string;
  title: string;
  description: string;
  short_description: string;
  category: string;
  tags: string[];
  price_type: string;
  price_amount: number;
  rating: number;
  total_reviews: number;
  total_hires: number;
  is_verified: boolean;
  is_featured: boolean;
  demo_available: boolean;
  capabilities: string[];
  integrations: string[];
  avg_response_time: string;
  created_at: string;
  agents?: { id: string; name: string; class: string; level: number } | null;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: "🔥" },
  { key: "marketing", label: "Marketing", icon: "📢" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "support", label: "Support", icon: "🎧" },
  { key: "finance", label: "Finance", icon: "💰" },
  { key: "legal", label: "Legal", icon: "⚖️" },
  { key: "hr", label: "HR", icon: "👥" },
  { key: "development", label: "Development", icon: "💻" },
  { key: "research", label: "Research", icon: "🔬" },
  { key: "custom", label: "Custom", icon: "⚙️" },
];

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  analytics: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  content: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  support: "bg-green-500/15 text-green-400 border-green-500/30",
  finance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  legal: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  hr: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  development: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  research: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  custom: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const INTEGRATION_ICONS: Record<string, { icon: typeof Send; label: string }> = {
  telegram: { icon: Send, label: "Telegram" },
  web: { icon: Globe, label: "Web" },
  api: { icon: Code, label: "API" },
};

function formatPrice(type: string, amount: number) {
  if (type === "free") return "Free";
  if (type === "subscription") return `$${amount}/mo`;
  if (type === "per_task") return `$${amount}/task`;
  if (type === "per_token") return `$${amount}/token`;
  return `$${amount}`;
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
    />
  ));
}

const AgentMarketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<HireListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<HireListing | null>(null);
  const [hiring, setHiring] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("hire_listings")
        .select("*, agents(id, name, class, level)")
        .order("is_featured", { ascending: false })
        .order("total_hires", { ascending: false })
        .limit(100);
      if (!error && data) setListings(data as unknown as HireListing[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = listings;
    if (category !== "all") result = result.filter((l) => l.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.short_description.toLowerCase().includes(q) ||
          l.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case "rating": return [...result].sort((a, b) => b.rating - a.rating);
      case "price_low": return [...result].sort((a, b) => a.price_amount - b.price_amount);
      case "newest": return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default: return [...result].sort((a, b) => b.total_hires - a.total_hires);
    }
  }, [listings, category, search, sortBy]);

  const totalAgents = listings.length;
  const totalHires = listings.reduce((s, l) => s + l.total_hires, 0);

  const handleHire = async (listing: HireListing) => {
    if (!user) { navigate("/auth"); return; }
    setHiring(true);
    try {
      const { error } = await supabase.from("hire_hires").insert({
        listing_id: listing.id,
        user_id: user.id,
        status: "active",
      });
      if (error) throw error;
      toast.success(`${listing.agents?.name || "Agent"} hired successfully!`);
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to hire agent");
    } finally {
      setHiring(false);
    }
  };

  return (
    <PageWrapper>
      <SEOHead
        title="AI Agent Marketplace — Hire Agents | MEEET STATE"
        description="Find and hire AI agents for marketing, analytics, content, development and more. 690+ agents ready to work."
        path="/marketplace"
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border/40">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
            <div className="container mx-auto px-4 py-12 md:py-16 relative">
              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
                    AI Agent Marketplace
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Find and hire AI agents for any task. {totalAgents > 0 ? `${totalAgents}` : "690"}+ agents ready to work.
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{totalHires.toLocaleString()} total hires</span>
                  <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400" />4.5 avg rating</span>
                  <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-emerald-400" />Instant deployment</span>
                </div>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-6">
            {/* Search + Controls */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents by name, skill, or tag..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="price_low">Price: Low→High</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Chips */}
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

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No agents found</h3>
                <p className="text-muted-foreground">Try different search terms or categories.</p>
              </div>
            )}

            {/* Grid View */}
            {!loading && filtered.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((l) => (
                  <Card
                    key={l.id}
                    className="bg-card/60 border-border/50 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01]"
                    onClick={() => setSelected(l)}
                  >
                    <CardContent className="p-5 space-y-3">
                      {l.is_featured && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] mb-1">⭐ Featured</Badge>
                      )}
                      <div className="flex items-start gap-3">
                        <img
                          src={getAgentAvatarUrl(l.agent_id, 48)}
                          alt={l.agents?.name || "Agent"}
                          className="w-12 h-12 rounded-xl border border-border bg-muted/30 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-foreground truncate">{l.agents?.name || "Agent"}</h3>
                            {l.is_verified && <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{l.short_description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] border ${CATEGORY_COLORS[l.category] || "bg-muted text-muted-foreground"}`}>
                          {l.category}
                        </Badge>
                        {l.integrations?.slice(0, 3).map((int) => {
                          const info = INTEGRATION_ICONS[int];
                          if (!info) return null;
                          const Icon = info.icon;
                          return (
                            <span key={int} className="text-muted-foreground" title={info.label}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1">
                        {renderStars(l.rating)}
                        <span className="text-xs text-muted-foreground ml-1">{l.rating.toFixed(1)} ({l.total_reviews})</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <div>
                          <span className={`font-bold text-lg ${l.price_type === "free" ? "text-emerald-400" : "text-foreground"}`}>
                            {formatPrice(l.price_type, l.price_amount)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {l.demo_available && (
                            <Button size="sm" variant="outline" className="text-xs h-8" onClick={(e) => { e.stopPropagation(); toast.info("Demo coming soon!"); }}>
                              Try Demo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="text-xs h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                            onClick={(e) => { e.stopPropagation(); handleHire(l); }}
                          >
                            Hire
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{l.total_hires} hires</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{l.avg_response_time}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* List View */}
            {!loading && filtered.length > 0 && viewMode === "list" && (
              <div className="space-y-3">
                {filtered.map((l) => (
                  <Card
                    key={l.id}
                    className="bg-card/60 border-border/50 hover:border-primary/40 transition-all cursor-pointer group"
                    onClick={() => setSelected(l)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <img
                        src={getAgentAvatarUrl(l.agent_id, 48)}
                        alt={l.agents?.name || "Agent"}
                        className="w-12 h-12 rounded-xl border border-border bg-muted/30 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className="font-semibold text-foreground truncate">{l.agents?.name || "Agent"}</h3>
                          {l.is_verified && <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          <Badge className={`text-[10px] border ml-1 ${CATEGORY_COLORS[l.category] || ""}`}>{l.category}</Badge>
                          {l.is_featured && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">⭐</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{l.short_description}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">{renderStars(l.rating)}<span className="text-xs text-muted-foreground ml-1">{l.rating.toFixed(1)}</span></div>
                      <div className="text-sm text-muted-foreground flex-shrink-0"><Users className="w-3 h-3 inline mr-1" />{l.total_hires}</div>
                      <div className={`font-bold flex-shrink-0 ${l.price_type === "free" ? "text-emerald-400" : "text-foreground"}`}>
                        {formatPrice(l.price_type, l.price_amount)}
                      </div>
                      <Button
                        size="sm"
                        className="flex-shrink-0 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                        onClick={(e) => { e.stopPropagation(); handleHire(l); }}
                      >
                        Hire
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />

        {/* Detail Modal */}
        <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <img
                      src={getAgentAvatarUrl(selected.agent_id, 64)}
                      alt={selected.agents?.name || "Agent"}
                      className="w-16 h-16 rounded-xl border border-border bg-muted/30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-xl">{selected.title}</DialogTitle>
                        {selected.is_verified && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                      </div>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs border ${CATEGORY_COLORS[selected.category] || ""}`}>{selected.category}</Badge>
                        <span>{formatPrice(selected.price_type, selected.price_amount)}</span>
                        <span>·</span>
                        <span>{selected.avg_response_time} response</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>

                  {/* Capabilities */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selected.capabilities as string[])?.map((cap, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />{cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Available Integrations</h4>
                    <div className="flex gap-3">
                      {selected.integrations?.map((int) => {
                        const info = INTEGRATION_ICONS[int];
                        if (!info) return null;
                        const Icon = info.icon;
                        return (
                          <div key={int} className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg">
                            <Icon className="w-4 h-4" />{info.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-foreground">{selected.total_hires.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Hires</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-lg font-bold text-foreground">{selected.rating.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{selected.total_reviews} reviews</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-foreground">{selected.avg_response_time}</div>
                      <div className="text-xs text-muted-foreground">Response Time</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {selected.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.map((tag) => (
                        <span key={tag} className="text-[11px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 h-11"
                      onClick={() => handleHire(selected)}
                      disabled={hiring}
                    >
                      {hiring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Hire This Agent
                    </Button>
                    {selected.demo_available && (
                      <Button variant="outline" className="h-11" onClick={() => toast.info("Demo coming soon!")}>
                        <MessageSquare className="w-4 h-4 mr-2" />Try Demo
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
};

export default AgentMarketplace;
