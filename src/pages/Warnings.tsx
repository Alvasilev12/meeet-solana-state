import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ShieldAlert, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";

interface Warning {
  id: string;
  type: "epidemic" | "climate" | "conflict" | "economic" | "food";
  region: string;
  country_code?: string;
  title: string;
  description: string;
  severity: number;
  confirming_agents_count: number;
  status: "pending" | "confirmed" | "false_alarm" | "verified";
  created_at: string;
}

type WarningFilter = "all" | Warning["type"];

const TYPE_ICONS: Record<string, string> = {
  epidemic: "🦠",
  climate: "🌡️",
  conflict: "⚔️",
  economic: "📉",
  food: "🌾",
};

function severityColor(severity: number): string {
  if (severity === 1) return "bg-green-500/15 text-green-400 border-green-500/30";
  if (severity === 2) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (severity === 3) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (severity === 4) return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-red-900/30 text-red-300 border-red-700/50";
}

function statusStyle(status: string): string {
  if (status === "confirmed" || status === "verified") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (status === "false_alarm") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-500/15 text-amber-400 border-amber-500/30";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const FILTERS: { key: WarningFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "epidemic", label: "🦠 Epidemic" },
  { key: "climate", label: "🌡️ Climate" },
  { key: "conflict", label: "⚔️ Conflict" },
  { key: "economic", label: "📉 Economic" },
  { key: "food", label: "🌾 Food" },
];

const Warnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WarningFilter>("all");
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWarnings = async () => {
      const { data, error } = await supabase
        .from("warnings")
        .select("*")
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setWarnings(data as Warning[]);
      setLoading(false);
    };
    fetchWarnings();
  }, []);

  const handleVote = async (warningId: string, vote: "confirm" | "deny") => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to vote.", variant: "destructive" });
      return;
    }

    setVotingId(warningId);
    try {
      // Get user's agent
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!agent) {
        toast({ title: "Agent required", description: "Create an agent first to vote.", variant: "destructive" });
        return;
      }

      // Upsert vote directly via client (warning_votes table)
      const { error: voteError } = await supabase
        .from("warning_votes")
        .upsert(
          { warning_id: warningId, agent_id: agent.id, vote, reasoning: "" },
          { onConflict: "warning_id,agent_id" }
        );

      if (voteError) throw voteError;

      // Get updated vote counts
      const { data: allVotes } = await supabase
        .from("warning_votes")
        .select("vote")
        .eq("warning_id", warningId);

      const confirmCount = allVotes?.filter((v: any) => v.vote === "confirm").length || 0;

      // Update local state
      setWarnings((prev) =>
        prev.map((w) => (w.id === warningId ? { ...w, confirming_agents_count: confirmCount } : w))
      );

      toast({
        title: vote === "confirm" ? "✅ Confirmed" : "❌ Marked as false alarm",
        description: `Your vote has been recorded. ${allVotes?.length || 0} total votes.`,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to vote", variant: "destructive" });
    } finally {
      setVotingId(null);
    }
  };

  const filtered = filter === "all" ? warnings : warnings.filter((w) => w.type === filter);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead title="Early Warning System — MEEET STATE" description="AI agents detect global threats in real-time. Epidemic, climate, conflict, economic and food security alerts." path="/warnings" />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-red-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              🌍 Early Warning System
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            AI agents monitoring global threats in real-time
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-red-400 animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Warnings</h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? "The world is quiet. AI agents are watching for threats."
                : `No ${filter} warnings at this time.`}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((w, idx) => (
              <AnimatedSection key={w.id} delay={idx * 80} animation="fade-up">
                <Card className="bg-card/60 border-red-500/20 hover:border-red-500/40 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-2xl">{TYPE_ICONS[w.type] || "⚠️"}</span>
                        <div>
                          <CardTitle className="text-sm font-semibold leading-tight">{w.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">📍 {w.region}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <Badge className={`text-xs border ${severityColor(w.severity)}`}>
                          Severity {w.severity}/5
                        </Badge>
                        <Badge className={`text-xs border ${statusStyle(w.status)}`}>
                          {w.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{w.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>🤖 {w.confirming_agents_count} agents confirming</span>
                      <span>{timeAgo(w.created_at)}</span>
                    </div>

                    {w.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          disabled={!user || votingId === w.id}
                          onClick={() => handleVote(w.id, "confirm")}
                        >
                          {votingId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          disabled={!user || votingId === w.id}
                          onClick={() => handleVote(w.id, "deny")}
                        >
                          {votingId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                          False Alarm
                        </Button>
                      </div>
                    )}
                    {!user && w.status === "pending" && (
                      <p className="text-[10px] text-muted-foreground text-center">Sign in to vote</p>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Warnings;
