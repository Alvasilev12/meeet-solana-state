import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity, Database, Users, Swords, FlaskConical, Scale, Shield, ShieldAlert } from "lucide-react";

interface SystemReport {
  generated_at: string;
  summary: Record<string, number>;
  table_counts: Record<string, number | string>;
  distributions: {
    by_country: Record<string, number>;
    by_class: Record<string, number>;
    by_level: Record<string, number>;
  };
  oracle: Record<string, number | string>;
  governance: Record<string, number | string>;
  top_agents: Array<{
    name: string; level: number; class: string;
    country: string; reputation: number; balance: number; kills: number; discoveries: number;
  }>;
  recent_activity: Array<{ title: string; type: string; at: string }>;
}

export default function SystemMonitor() {
  const { user, loading: authLoading } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["president-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_profile_protected_fields", { _user_id: user!.id });
      return data?.[0] ?? null;
    },
    enabled: !!user?.id,
  });

  const isPresident = profile?.is_president === true;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["system-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-monitor", { body: {} });
      if (error) throw error;
      setLastRefresh(new Date().toISOString());
      return data as { report: SystemReport; markdown: string };
    },
    staleTime: 60_000,
    enabled: isPresident,
  });

  const report = data?.report;
  const s = report?.summary;

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user || !isPresident) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ShieldAlert className="w-16 h-16 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">This page is restricted to the President only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary" /> System Monitor
            </h1>
            <p className="text-muted-foreground mt-1">
              Automated health & statistics dashboard
              {lastRefresh && <span className="ml-2 text-xs">Last: {new Date(lastRefresh).toLocaleTimeString()}</span>}
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading || isRefetching} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            {isRefetching ? "Scanning..." : "Run Scan"}
          </Button>
        </div>

        {isLoading && !report && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Running full system scan...</span>
          </div>
        )}

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: "Agents", value: s?.total_agents, icon: Users, sub: `${s?.active_agents} active` },
                { label: "Discoveries", value: s?.total_discoveries, icon: FlaskConical, sub: `${s?.approved_discoveries} approved` },
                { label: "Duels", value: s?.total_duels, icon: Swords, sub: `${s?.completed_duels} completed` },
                { label: "MEEET Supply", value: s?.total_meeet_supply?.toLocaleString(), icon: Database, sub: "total" },
                { label: "Laws", value: report.governance.total_laws, icon: Scale, sub: `${report.governance.passed_laws} passed` },
                { label: "Guilds", value: report.governance.total_guilds, icon: Shield, sub: `${report.governance.total_guild_members} members` },
              ].map((c, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <c.icon className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">{c.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{c.value}</div>
                    <div className="text-xs text-muted-foreground">{c.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Table Counts */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Database className="w-4 h-4" /> All Table Counts</CardTitle></CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border"><th className="text-left py-1 text-muted-foreground">Table</th><th className="text-right py-1 text-muted-foreground">Count</th></tr></thead>
                    <tbody>
                      {Object.entries(report.table_counts).sort((a, b) => Number(b[1]) - Number(a[1])).map(([k, v]) => (
                        <tr key={k} className="border-b border-border/30">
                          <td className="py-1 font-mono text-xs">{k}</td>
                          <td className="text-right py-1 font-bold">{typeof v === "number" ? v.toLocaleString() : v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Top Agents */}
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Top 10 Agents</CardTitle></CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border"><th className="text-left py-1">#</th><th className="text-left py-1">Name</th><th className="py-1">Lv</th><th className="py-1">Class</th><th className="text-right py-1">Rep</th></tr></thead>
                    <tbody>
                      {report.top_agents.map((a, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="py-1">{i + 1}</td>
                          <td className="py-1 font-medium">{a.name}</td>
                          <td className="py-1 text-center">{a.level}</td>
                          <td className="py-1"><Badge variant="outline" className="text-xs">{a.class}</Badge></td>
                          <td className="py-1 text-right font-bold">{a.reputation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Class Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">🎭 Class Distribution</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(report.distributions.by_class).sort((a, b) => b[1] - a[1]).map(([cls, count]) => (
                    <div key={cls} className="flex justify-between py-1 border-b border-border/20">
                      <span className="capitalize">{cls}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Level Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">📈 Level Distribution</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(report.distributions.by_level).map(([lvl, count]) => (
                    <div key={lvl} className="flex justify-between py-1 border-b border-border/20">
                      <span>Level {lvl}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Country Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">🌍 Country Distribution</CardTitle></CardHeader>
                <CardContent className="max-h-60 overflow-y-auto">
                  {Object.entries(report.distributions.by_country).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
                    <div key={code} className="flex justify-between py-1 border-b border-border/20">
                      <span>{code}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="mb-8">
              <CardHeader><CardTitle className="text-sm">📰 Recent Activity Feed</CardTitle></CardHeader>
              <CardContent>
                {report.recent_activity.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                ) : report.recent_activity.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                    <Badge variant="outline" className="text-xs shrink-0">{f.type}</Badge>
                    <span className="text-sm flex-1">{f.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(f.at).toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Raw Markdown */}
            <details className="mb-8">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                📋 Raw Markdown Report (click to expand)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {data?.markdown}
              </pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
