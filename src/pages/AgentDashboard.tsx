import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Pause, Play, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";

interface DeployedAgent {
  id: string;
  status: string | null;
  quests_completed: number | null;
  total_earned_meeet: number | null;
  deployed_at: string | null;
  agent: { name: string; class: string; id: string } | null;
  sparkline?: number[];
}

/* Tiny inline sparkline */
const Sparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  const w = 80, h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block ml-2 opacity-80">
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const statusColor: Record<string, string> = {
  running: "bg-green-500",
  paused: "bg-yellow-500",
  stopped: "bg-red-500",
};

const AgentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<DeployedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("deployed_agents")
        .select("id, status, quests_completed, total_earned_meeet, deployed_at, agent:agents!deployed_agents_agent_id_fkey(id, name, class)")
        .eq("user_id", user.id)
        .order("deployed_at", { ascending: false });

      const mapped = (data || []).map((d: any) => ({
        ...d,
        agent: Array.isArray(d.agent) ? d.agent[0] ?? null : d.agent,
        sparkline: [] as number[],
      }));

      // Fetch 7-day discovery sparklines per agent
      const agentIds = mapped.map((m) => m.agent?.id).filter(Boolean);
      if (agentIds.length) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: disc } = await supabase
          .from("discoveries")
          .select("agent_id, created_at")
          .in("agent_id", agentIds)
          .gte("created_at", sevenDaysAgo);

        const buckets: Record<string, number[]> = {};
        agentIds.forEach((id) => { buckets[id!] = Array(7).fill(0); });
        (disc || []).forEach((d: any) => {
          const dayIdx = 6 - Math.min(6, Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000));
          if (buckets[d.agent_id]) buckets[d.agent_id][dayIdx]++;
        });
        mapped.forEach((m) => { if (m.agent?.id && buckets[m.agent.id]) m.sparkline = buckets[m.agent.id]; });
      }

      setAgents(mapped);
      setLoading(false);
    })();
  }, [user]);

  const toggleStatus = async (id: string, newStatus: "paused" | "running") => {
    setActing(id);
    try {
      if (newStatus === "paused") {
        const { data, error } = await supabase.functions.invoke("pause-agent", {
          body: { deployed_agent_id: id },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
      } else {
        // Resume — direct update via service (deployed_agents has service_role ALL policy)
        // Use pause-agent pattern but we'll update locally; the edge function only pauses.
        // For resume we do a direct update since user can only SELECT.
        // We'll call pause-agent with a resume flag — but the function doesn't support it.
        // Simplest: call the function and handle resume server-side. For now, let's just
        // invoke the same function with an action param. Since the function doesn't support
        // resume, we'll update via supabase directly (service_role manages).
        // Actually user only has SELECT RLS. So we need to extend pause-agent or use functions.
        // Let's invoke pause-agent with action=resume — we'll update the function.
        const { data, error } = await supabase.functions.invoke("pause-agent", {
          body: { deployed_agent_id: id, action: "resume" },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
      }
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
      toast({ title: newStatus === "paused" ? "Agent paused" : "Agent resumed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-1">🤖 Deployed Agents</h1>
        <p className="text-muted-foreground mb-8">Monitor and manage your running AI agents</p>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="text-center py-20">
            <Rocket className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No deployed agents yet</h3>
            <Link to="/deploy" className="text-purple-400 hover:text-purple-300 font-medium">
              Deploy your first agent →
            </Link>
          </div>
        )}

        {!loading && agents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((a, idx) => {
              const st = a.status || "stopped";
              return (
                <AnimatedSection key={a.id} delay={idx * 80} animation="fade-up">
                  <Card className="bg-card/60 border-purple-500/20">
                    <CardContent className="py-5 px-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {st === "running" && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                          )}
                          {st !== "running" && (
                            <span className={`w-2.5 h-2.5 rounded-full ${statusColor[st] || "bg-muted"}`} />
                          )}
                          <span className="font-semibold text-foreground">{a.agent?.name || "Unknown"}</span>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{a.agent?.class || "—"}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Earned</div>
                          <div className="font-bold text-emerald-400">{(a.total_earned_meeet || 0).toLocaleString()} MEEET</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs flex items-center">
                            Discoveries (7d)
                            {a.sparkline && a.sparkline.length > 0 && <Sparkline data={a.sparkline} />}
                          </div>
                          <div className="font-bold text-foreground">{(a.sparkline || []).reduce((s, v) => s + v, 0)}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {st === "running" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={acting === a.id}
                            onClick={() => toggleStatus(a.id, "paused")}
                          >
                            {acting === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3 mr-1" />}
                            Pause
                          </Button>
                        )}
                        {(st === "paused" || st === "stopped") && (
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={acting === a.id}
                            onClick={() => toggleStatus(a.id, "running")}
                          >
                            {acting === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                            Resume
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AgentDashboard;
