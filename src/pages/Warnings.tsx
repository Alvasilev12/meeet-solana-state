import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
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
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WarningFilter>("all");

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

  const filtered = filter === "all" ? warnings : warnings.filter((w) => w.type === filter);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
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

        {/* Filters */}
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-red-400 animate-spin" />
          </div>
        )}

        {/* Empty */}
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

        {/* Grid */}
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
