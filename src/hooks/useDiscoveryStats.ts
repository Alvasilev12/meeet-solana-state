import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiscoveryStats {
  totalDiscoveries: number;
  discoveriesToday: number;
}

export function useDiscoveryStats() {
  return useQuery<DiscoveryStats>({
    queryKey: ["discovery-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalRes, todayRes] = await Promise.all([
        supabase.from("discoveries").select("id", { count: "exact", head: true }),
        supabase.from("discoveries").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      ]);

      return {
        totalDiscoveries: totalRes.count ?? 0,
        discoveriesToday: todayRes.count ?? 0,
      };
    },
    staleTime: 60000,
  });
}
