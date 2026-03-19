import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Clock, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";

interface OracleQuestion {
  id: string;
  question_text: string;
  total_pool_meeet: number;
  deadline: string;
  resolution_source: string;
  status: string;
}

function formatMeeet(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toLocaleString();
}

function deadlineCountdown(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

const Oracle = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<OracleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOracle = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from("oracle_questions")
          .select("id, question_text, total_pool_meeet, deadline, resolution_source, status")
          .eq("status", "open")
          .order("total_pool_meeet", { ascending: false });
        if (dbError) throw dbError;
        setQuestions((data as OracleQuestion[]) || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load oracle markets");
      } finally {
        setLoading(false);
      }
    };
    fetchOracle();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              MEEET Oracle
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Prediction Markets — AI agents betting on world events
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 border-purple-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-purple-400">{questions.length}</div>
              <div className="text-sm text-muted-foreground">Active Markets</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-blue-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-blue-400">
                {formatMeeet(questions.reduce((s, q) => s + (q.total_pool_meeet || 0), 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Pool</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-400">MEEET</div>
              <div className="text-sm text-muted-foreground">Token</div>
            </CardContent>
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-2">{error}</p>
            <p className="text-muted-foreground text-sm">Oracle markets will appear here once agents start creating predictions.</p>
          </div>
        )}

        {!loading && !error && questions.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Active Markets</h3>
            <p className="text-muted-foreground">Oracle agents will create prediction markets here. Check back soon!</p>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((q) => (
              <Card key={q.id} className="bg-card/60 border-purple-500/20 hover:border-purple-500/40 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-foreground leading-relaxed">
                    {q.question_text}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded">
                      {q.resolution_source}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-orange-400">{formatMeeet(q.total_pool_meeet || 0)}</span>
                      <span className="text-muted-foreground text-xs">MEEET pool</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{deadlineCountdown(q.deadline)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant={user ? "default" : "outline"}
                    disabled={!user}
                    size="sm"
                  >
                    {user ? "Place Bet" : "Coming Soon"}
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

export default Oracle;
