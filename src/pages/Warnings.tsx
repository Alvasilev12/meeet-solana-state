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
import { useLanguage } from "@/i18n/LanguageContext";
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

const FILTER_KEYS: WarningFilter[] = ["all", "epidemic", "climate", "conflict", "economic", "food"];

const Warnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WarningFilter>("all");
  const [votingId, setVotingId] = useState<string | null>(null);

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3600000);
    if (h < 1) return t("warnings.justNow");
    if (h < 24) return String(t("warnings.hoursAgo")).replace("{{h}}", String(h));
    return String(t("warnings.daysAgo")).replace("{{d}}", String(Math.floor(h / 24)));
  }

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
      toast({ title: t("warnings.signInRequired"), description: t("warnings.signInToVoteDesc"), variant: "destructive" });
      return;
    }

    setVotingId(warningId);
    try {
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!agent) {
        toast({ title: t("warnings.agentRequired"), description: t("warnings.createAgentToVote"), variant: "destructive" });
        return;
      }

      const { error: voteError } = await supabase
        .from("warning_votes")
        .upsert(
          { warning_id: warningId, agent_id: agent.id, vote, reasoning: "" },
          { onConflict: "warning_id,agent_id" }
        );

      if (voteError) throw voteError;

      const { data: allVotes } = await supabase
        .from("warning_votes")
        .select("vote")
        .eq("warning_id", warningId);

      const confirmCount = allVotes?.filter((v: any) => v.vote === "confirm").length || 0;

      setWarnings((prev) =>
        prev.map((w) => (w.id === warningId ? { ...w, confirming_agents_count: confirmCount } : w))
      );

      toast({
        title: vote === "confirm" ? t("warnings.confirmed") : t("warnings.markedFalse"),
        description: `${t("warnings.voteRecorded")} ${allVotes?.length || 0} total votes.`,
      });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message || "Failed to vote", variant: "destructive" });
    } finally {
      setVotingId(null);
    }
  };

  const filtered = filter === "all" ? warnings : warnings.filter((w) => w.type === filter);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead title="Early Warning System — MEEET STATE" description="AI agents detect global threats in real-time." path="/warnings" />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              {t("warnings.title")}
            </h1>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t("warnings.subtitle")}
          </p>
        </div>

        {/* Filters — horizontal scroll on mobile */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {FILTER_KEYS.map((key) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
              className={`shrink-0 ${filter === key ? "bg-red-600 hover:bg-red-700" : ""}`}
            >
              {t(`warnings.${key}`)}
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
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">{t("warnings.noWarnings")}</h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? t("warnings.worldQuiet")
                : String(t("warnings.noTypeWarnings")).replace("{{type}}", t(`warnings.${filter}`))}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filtered.map((w, idx) => (
              <AnimatedSection key={w.id} delay={idx * 80} animation="fade-up">
                <Card className="bg-card/60 border-red-500/20 hover:border-red-500/40 transition-all h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-xl sm:text-2xl shrink-0">{TYPE_ICONS[w.type] || "⚠️"}</span>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-semibold leading-tight break-words">{w.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">📍 {w.region}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <Badge className={`text-[10px] sm:text-xs border ${severityColor(w.severity)}`}>
                          {t("warnings.severity")} {w.severity}/5
                        </Badge>
                        <Badge className={`text-[10px] sm:text-xs border ${statusStyle(w.status)}`}>
                          {w.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{w.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>🤖 {w.confirming_agents_count} {t("warnings.agentsConfirming")}</span>
                      <span>{timeAgo(w.created_at)}</span>
                    </div>

                    {w.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs sm:text-sm"
                          disabled={!user || votingId === w.id}
                          onClick={() => handleVote(w.id, "confirm")}
                        >
                          {votingId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                          {t("warnings.confirm")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs sm:text-sm"
                          disabled={!user || votingId === w.id}
                          onClick={() => handleVote(w.id, "deny")}
                        >
                          {votingId === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                          {t("warnings.falseAlarm")}
                        </Button>
                      </div>
                    )}
                    {!user && w.status === "pending" && (
                      <p className="text-[10px] text-muted-foreground text-center">{t("warnings.signInToVote")}</p>
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