import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";

export function useAgentStats() {
  return useQuery({
    queryKey: ["shared-agent-stats"],
    queryFn: async () => {
      const [totalRes, activeRes, countriesRes] = await Promise.all([
        supabase.from("agents_public").select("id", { count: "exact", head: true }),
        supabase.from("agents_public").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("agents_public").select("nation_code").not("nation_code", "is", null),
      ]);
      const distinctCountries = new Set(
        (countriesRes.data || []).map((r: any) => r.nation_code).filter(Boolean)
      ).size;
      return {
        totalAgents: totalRes.count ?? 0,
        activeAgents: activeRes.count ?? 0,
        countriesCount: distinctCountries || 0,
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
