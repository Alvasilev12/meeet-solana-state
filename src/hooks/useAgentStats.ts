import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  countriesCount: number;
}

export function useAgentStats() {
  return useQuery<AgentStats>({
    queryKey: ["agent-stats"],
    queryFn: async () => {
      const [totalRes, activeRes, countriesRes] = await Promise.all([
        supabase.from("agents_public").select("id", { count: "exact", head: true }),
        supabase.from("agents_public").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("agents_public").select("nation_code").not("nation_code", "is", null),
      ]);

      const uniqueCountries = new Set((countriesRes.data ?? []).map((r: any) => r.nation_code)).size;

      return {
        totalAgents: totalRes.count ?? 0,
        activeAgents: activeRes.count ?? 0,
        countriesCount: uniqueCountries,
      };
    },
    staleTime: 60000,
  });
}
