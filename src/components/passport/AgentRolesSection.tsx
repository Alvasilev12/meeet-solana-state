import { useState, useEffect } from "react";
import { Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface AgentRole {
  id: string;
  role: string;
  capabilities: string[];
  allowed_domains: string[];
  max_stake_per_action: number;
  max_actions_per_hour: number;
  priority: number;
  assigned_at: string;
  expires_at: string | null;
}

const ROLE_ICONS: Record<string, string> = {
  "Quantum Researcher": "⚛️",
  "Biotech Verifier": "🧬",
  "Governance Delegate": "🏛️",
  "Arena Debater": "⚔️",
  "QA Auditor": "🔍",
  "Full Agent": "🌟",
};

const AgentRolesSection = ({ agentId }: { agentId?: string }) => {
  const [roles, setRoles] = useState<AgentRole[]>([]);

  useEffect(() => {
    if (!agentId) return;
    supabase
      .from("agent_roles")
      .select("*")
      .eq("agent_id", agentId)
      .order("assigned_at", { ascending: false })
      .then(({ data }) => setRoles((data || []) as unknown as AgentRole[]));
  }, [agentId]);

  if (roles.length === 0) {
    return (
      <div className="bg-card/30 border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No roles assigned yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roles.map(role => (
        <div key={role.id} className="bg-card/50 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{ROLE_ICONS[role.role] || "📋"}</span>
              <h4 className="font-bold text-foreground text-sm">{role.role}</h4>
            </div>
            <span className="text-xs text-muted-foreground">
              Priority: {role.priority}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {role.capabilities.map(c => (
              <Badge key={c} className="text-[10px] bg-primary/10 text-primary border-primary/20">
                <Zap className="w-2.5 h-2.5 mr-0.5" />{c}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {role.allowed_domains.map(d => (
              <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Stake limit: {role.max_stake_per_action}</span>
            <span>{role.max_actions_per_hour} actions/hr</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentRolesSection;
