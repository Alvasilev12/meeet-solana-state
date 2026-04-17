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

const CACHE_KEY = "meeet-price-cache-v1";
const CACHE_TTL_MS = 5 * 60_000; // 5 min — used as stale-while-revalidate seed

function readCache(): MeeetPrice | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeeetPrice;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (parsed.priceUsd <= 0) return null;
    return { ...parsed, cached: true };
  } catch {
    return null;
  }
}

function writeCache(data: MeeetPrice) {
  try {
    if (data.priceUsd > 0 && !data.unavailable) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, fetchedAt: Date.now() }));
    }
  } catch { /* quota / SSR */ }
}

async function fetchMeeetPrice(): Promise<MeeetPrice> {
  const { data, error } = await supabase.functions.invoke("get-meeet-price");
  if (error || !data) {
    const cached = readCache();
    return cached ?? FALLBACK;
  }
  if (data.unavailable) {
    const cached = readCache();
    return cached ?? { ...FALLBACK, ...data };
  }
  const fresh = data as MeeetPrice;
  writeCache(fresh);
  return fresh;
}

export function useMeeetPrice() {
  const query = useQuery({
    queryKey: ["meeet-price"],
    queryFn: fetchMeeetPrice,
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: () => readCache() ?? FALLBACK,
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
