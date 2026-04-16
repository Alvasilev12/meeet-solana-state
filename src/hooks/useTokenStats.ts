import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useMeeetPrice } from "@/hooks/useMeeetPrice";

export function useTokenStats() {
  const { price, isLoading: priceLoading, isUnavailable } = useMeeetPrice();

  const { data, isLoading: statsLoading } = useQuery({
    queryKey: ["shared-token-stats"],
    queryFn: async () => {
      const [burnRes, stakeRes, circulatingRes] = await Promise.all([
        supabase.from("burn_log").select("amount"),
        supabase.from("agent_stakes").select("amount_meeet").eq("status", "active"),
        supabase.from("agents_public").select("balance_meeet"),
      ]);
      const totalBurned = (burnRes.data || []).reduce(
        (s, r: any) => s + Math.abs(Number(r.amount || 0)),
        0
      );
      const totalStaked = (stakeRes.data || []).reduce(
        (s, r: any) => s + Number(r.amount_meeet || 0),
        0
      );
      const circulatingSupply = (circulatingRes.data || []).reduce(
        (s, r: any) => s + Number(r.balance_meeet || 0),
        0
      );
      return { totalBurned, totalStaked, circulatingSupply };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return {
    price,
    priceLoading,
    isUnavailable,
    totalBurned: data?.totalBurned ?? 0,
    totalStaked: data?.totalStaked ?? 0,
    circulatingSupply: data?.circulatingSupply ?? 0,
    marketCap: price.marketCap,
    isLoading: priceLoading || statsLoading,
  };
}
