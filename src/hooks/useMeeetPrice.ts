import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";

export interface MeeetPrice {
  priceUsd: number;
  priceSOL: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  liquidity: number;
  fetchedAt: number;
  cached?: boolean;
  fallback?: boolean;
}

const FALLBACK: MeeetPrice = {
  priceUsd: 0.001,
  priceSOL: 0,
  marketCap: 0,
  volume24h: 0,
  change24h: 0,
  liquidity: 0,
  fetchedAt: Date.now(),
  fallback: true,
};

async function fetchMeeetPrice(): Promise<MeeetPrice> {
  const { data, error } = await supabase.functions.invoke("get-meeet-price");
  if (error || !data?.priceUsd) return FALLBACK;
  return data as MeeetPrice;
}

export function useMeeetPrice() {
  const query = useQuery({
    queryKey: ["meeet-price"],
    queryFn: fetchMeeetPrice,
    staleTime: 30_000, // 30s
    refetchInterval: 60_000, // auto-refresh every 60s
    placeholderData: FALLBACK,
  });

  const price = query.data ?? FALLBACK;

  return {
    ...query,
    price,
    /** Convert USD amount to MEEET at live rate */
    usdToMeeet: (usd: number) => price.priceUsd > 0 ? Math.round(usd / price.priceUsd) : 0,
    /** Convert MEEET to USD at live rate */
    meeetToUsd: (meeet: number) => meeet * price.priceUsd,
    /** Convert SOL to MEEET */
    solToMeeet: (sol: number) => price.priceSOL > 0 ? Math.round(sol / price.priceSOL) : 0,
  };
}
