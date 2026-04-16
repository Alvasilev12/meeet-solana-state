import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";

export function useDiscoveryStats() {
  return useQuery({
    queryKey: ["shared-discovery-stats"],
    queryFn: async () => {
      const todayISO = new Date().toISOString().slice(0, 10) + "T00:00:00Z";
      const [totalRes, todayRes] = await Promise.all([
        supabase.from("discoveries").select("id", { count: "exact", head: true }),
        supabase.from("discoveries").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      ]);
      return {
        totalDiscoveries: totalRes.count ?? 0,
        discoveriesToday: todayRes.count ?? 0,
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
