import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TokenStats {
  totalStaked: number;
  totalBurned: number;
}

export function useTokenStats() {
  return useQuery<TokenStats>({
    queryKey: ["token-stats"],
    queryFn: async () => {
      const [stakesRes, burnRes] = await Promise.all([
        supabase.from("agent_stakes").select("amount_meeet").eq("status", "active"),
        supabase.from("burn_log").select("amount"),
      ]);

      const totalStaked = (stakesRes.data ?? []).reduce((s, r) => s + Math.abs(Number(r.amount_meeet || 0)), 0);
      const totalBurned = (burnRes.data ?? []).reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);

      return { totalStaked, totalBurned };
    },
    staleTime: 60000,
  });
}
