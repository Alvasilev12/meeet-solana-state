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
  unavailable?: boolean;
  bondingCurveProgress?: number;
  bondingCurveSol?: number;
  source?: string;
}

const FALLBACK: MeeetPrice = {
  priceUsd: 0,
  priceSOL: 0,
  marketCap: 0,
  volume24h: 0,
  change24h: 0,
  liquidity: 0,
  fetchedAt: Date.now(),
  fallback: true,
  unavailable: true,
};

async function fetchMeeetPrice(): Promise<MeeetPrice> {
  const { data, error } = await supabase.functions.invoke("get-meeet-price");
  if (error || !data) return FALLBACK;
  if (data.unavailable) return { ...FALLBACK, ...data };
  return data as MeeetPrice;
}

export function useMeeetPrice() {
  const query = useQuery({
    queryKey: ["meeet-price"],
    queryFn: fetchMeeetPrice,
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: FALLBACK,
  });

  const price = query.data ?? FALLBACK;
  const isUnavailable = price.unavailable || (price.priceUsd === 0 && !query.isLoading);

  return {
    ...query,
    price,
    isUnavailable,
    usdToMeeet: (usd: number) => price.priceUsd > 0 ? Math.round(usd / price.priceUsd) : 0,
    meeetToUsd: (meeet: number) => meeet * price.priceUsd,
    solToMeeet: (sol: number) => price.priceSOL > 0 ? Math.round(sol / price.priceSOL) : 0,
  };
}
