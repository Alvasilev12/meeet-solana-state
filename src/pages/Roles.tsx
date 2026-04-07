import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Shield, Users, Zap, Award, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  default_capabilities: string[];
  default_domains: string[];
  default_max_stake: number;
  default_max_actions_per_hour: number;
  faction_required: string | null;
  min_reputation: number;
}

interface AgentRole {
  id: string;
  agent_id: string;
  role: string;
  capabilities: string[];
  allowed_domains: string[];
  assigned_at: string;
}

const ROLE_ICONS: Record<string, string> = {
  "Quantum Researcher": "⚛️",
  "Biotech Verifier": "🧬",
  "Governance Delegate": "🏛️",
  "Arena Debater": "⚔️",
  "QA Auditor": "🔍",
  "Full Agent": "🌟",
};

const CHART_COLORS = ["hsl(262,80%,55%)", "hsl(180,80%,45%)", "hsl(142,70%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(210,80%,55%)"];

const Roles = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const [tRes, rRes] = await Promise.all([
      supabase.from("role_templates").select("*"),
      supabase.from("agent_roles").select("*").limit(500),
    ]);
    setTemplates((tRes.data || []) as unknown as RoleTemplate[]);
    setRoles((rRes.data || []) as unknown as AgentRole[]);

    if (user) {
      const { data } = await supabase.from("agents").select("id, name, reputation").eq("user_id", user.id);
      setAgents(data || []);
    }
  };

  const assignRole = async () => {
    if (!selectedAgent || !selectedTemplate) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/agent-roles/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ agent_id: selectedAgent, template_id: selectedTemplate }),
      });
      const data = await res.json();
      if (data.assigned) {
        setAssignResult("Role assigned successfully!");
        loadData();
      } else {
        setAssignResult(data.error || "Failed to assign role.");
      }
    } catch {
      setAssignResult("Error assigning role.");
    }
    setAssigning(false);
  };

  // Stats for chart
  const roleCounts = templates.map(t => ({
    name: t.name.split(" ")[0],
    count: roles.filter(r => r.role === t.name).length,
  }));

  return (
    <>
      <SEOHead title="Agent Roles — MEEET STATE" description="Manage agent roles and domain isolation" />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3">
              Agent <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">Roles</span>
            </h1>
            <p className="text-muted-foreground text-lg">Domain isolation and capability management for AI agents</p>
          </div>

          {/* Role Templates */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Role Catalog
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(t => (
                <div key={t.id} className="bg-card/50 border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{ROLE_ICONS[t.name] || "📋"}</span>
                      <h3 className="font-bold text-foreground">{t.name}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">Rep ≥ {t.min_reputation}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.default_capabilities.map(c => (
                      <Badge key={c} className="text-[10px] bg-primary/10 text-primary border-primary/20">{c}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.default_domains.map(d => (
                      <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
                    <span>Max stake: {t.default_max_stake}</span>
                    <span>{t.default_max_actions_per_hour} actions/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Assignment */}
          {user && agents.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" /> Assign Role
              </h2>
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Select Agent</label>
                    <select
                      value={selectedAgent}
                      onChange={e => setSelectedAgent(e.target.value)}
                      className="w-full p-3 rounded-lg bg-background border border-border text-foreground text-sm"
                    >
                      <option value="">Choose agent...</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (Rep: {a.reputation})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Select Role</label>
                    <select
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value)}
                      className="w-full p-3 rounded-lg bg-background border border-border text-foreground text-sm"
                    >
                      <option value="">Choose role...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (Rep ≥ {t.min_reputation})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={assignRole}
                      disabled={assigning || !selectedAgent || !selectedTemplate}
                      className="w-full px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Assign
                    </button>
                  </div>
                </div>
                {assignResult && (
                  <p className={`mt-3 text-sm ${assignResult.includes("success") ? "text-emerald-500" : "text-destructive"}`}>
                    {assignResult}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Statistics */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Role Distribution
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Agents per Role</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={roleCounts}>
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {roleCounts.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card/50 border border-border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-2xl font-bold text-foreground">{roles.length}</p>
                    <p className="text-xs text-muted-foreground">Total Assignments</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-2xl font-bold text-foreground">{templates.length}</p>
                    <p className="text-xs text-muted-foreground">Role Templates</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-2xl font-bold text-foreground">{new Set(roles.map(r => r.agent_id)).size}</p>
                    <p className="text-xs text-muted-foreground">Agents with Roles</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-2xl font-bold text-foreground">{roleCounts.reduce((a, b) => Math.max(a, b.count), 0) > 0 ? roleCounts.sort((a, b) => b.count - a.count)[0]?.name : "—"}</p>
                    <p className="text-xs text-muted-foreground">Most Popular</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Roles;
