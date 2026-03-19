import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Store, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";

interface Listing {
  id: string;
  price_meeet: number;
  price_usdc: number;
  description: string | null;
  created_at: string;
  agents: {
    id: string;
    name: string;
    class: string;
    level: number;
    xp: number;
    quests_completed: number;
    reputation: number;
  } | null;
}

const CLASS_COLORS: Record<string, string> = {
  warrior: "bg-red-500/15 text-red-400 border-red-500/30",
  oracle: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  trader: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  diplomat: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  banker: "bg-green-500/15 text-green-400 border-green-500/30",
  miner: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  scout: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

type SortKey = "price" | "level";
type ClassFilter = "all" | string;

const AgentMarketplace = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("price");

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("agent_marketplace_listings")
        .select("id, price_meeet, price_usdc, description, created_at, agents(id, name, class, level, xp, quests_completed, reputation)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) setListings(data as unknown as Listing[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = classFilter === "all"
    ? listings
    : listings.filter((l) => l.agents?.class === classFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price") return (a.price_meeet || 0) - (b.price_meeet || 0);
    return (b.agents?.level || 0) - (a.agents?.level || 0);
  });

  const classes = [...new Set(listings.map((l) => l.agents?.class).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Agent Marketplace
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Buy and sell trained AI agents</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button variant={classFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setClassFilter("all")}>All</Button>
          {classes.map((c) => (
            <Button key={c} variant={classFilter === c ? "default" : "outline"} size="sm" onClick={() => setClassFilter(c)} className="capitalize">
              {c}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Button variant={sortBy === "price" ? "default" : "outline"} size="sm" onClick={() => setSortBy("price")}>Price</Button>
            <Button variant={sortBy === "level" ? "default" : "outline"} size="sm" onClick={() => setSortBy("level")}>Level</Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Listings Yet</h3>
            <p className="text-muted-foreground">Agents will appear here when users list them for sale.</p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((l) => (
              <Card key={l.id} className="bg-card/60 border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{l.agents?.name || "Unknown Agent"}</CardTitle>
                    <Badge className={`text-xs border capitalize ${CLASS_COLORS[l.agents?.class || ""] || "bg-muted text-muted-foreground"}`}>
                      {l.agents?.class}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {l.description && <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-foreground">Lv.{l.agents?.level}</div>
                      <div className="text-muted-foreground">Level</div>
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{l.agents?.quests_completed}</div>
                      <div className="text-muted-foreground">Quests</div>
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{l.agents?.reputation}</div>
                      <div className="text-muted-foreground">Rep</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">{l.price_meeet.toLocaleString()} MEEET</span>
                    {l.price_usdc > 0 && <span className="text-xs text-muted-foreground">${l.price_usdc}</span>}
                  </div>
                  <Button className="w-full" variant={user ? "default" : "outline"} size="sm" disabled={!user}>
                    {user ? "Buy Agent" : "Sign in to Buy"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AgentMarketplace;
