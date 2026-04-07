import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  price_usdc: number | null;
  target_class: string[];
  is_premium: boolean;
  purchases: number;
  prompt_template: string | null;
}

const CLASS_COLORS: Record<string, string> = {
  warrior: "bg-red-500/15 text-red-400 border-red-500/30",
  oracle: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  trader: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  diplomat: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  banker: "bg-green-500/15 text-green-400 border-green-500/30",
  miner: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  scout: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  builder: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  hacker: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const Strategies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStrategies = async () => {
      const { data, error } = await supabase
        .from("agent_strategies")
        .select("id, name, description, price_usdc, target_class, is_premium, purchases, prompt_template")
        .eq("is_active", true)
        .order("price_usdc", { ascending: true });
      if (!error && data) setStrategies(data as unknown as Strategy[]);
      setLoading(false);
    };
    fetchStrategies();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Agent Strategies
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Pre-built strategies to maximize your agent's earning potential
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((s) => (
              <Card
                key={s.id}
                className={`bg-card/60 transition-all ${
                  s.is_premium
                    ? "border-yellow-500/30 hover:border-yellow-500/50"
                    : "border-border hover:border-border/80"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {s.is_premium && <Sparkles className="w-4 h-4 text-yellow-400" />}
                      {s.name}
                    </CardTitle>
                    {s.price_usdc === 0 ? (
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">Free</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">
                        ${s.price_usdc}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{s.description}</p>

                  {/* Target classes */}
                  <div className="flex flex-wrap gap-1">
                    {(s.target_class || []).map((cls) => (
                      <Badge
                        key={cls}
                        className={`text-xs border capitalize ${CLASS_COLORS[cls] || "bg-muted text-muted-foreground"}`}
                      >
                        {cls}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.purchases} agents using this</span>
                  </div>

                  <Button
                    className="w-full"
                    variant={s.price_usdc === 0 ? "default" : "outline"}
                    size="sm"
                    disabled={s.is_premium && !user}
                    onClick={() => navigate(user ? "/dashboard" : "/auth")}
                  >
                    {s.is_premium && !user ? (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Sign in to Use
                      </span>
                    ) : (
                      "Use Strategy"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && strategies.length === 0 && (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground">No Strategies Yet</h3>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Strategies;
