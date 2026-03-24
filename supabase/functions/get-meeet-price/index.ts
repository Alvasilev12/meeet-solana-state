import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MEEET_CONTRACT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${MEEET_CONTRACT}`;
const CACHE_TTL_MS = 60_000; // 1 minute cache

let cachedPrice: { priceUsd: number; priceSOL: number; marketCap: number; volume24h: number; change24h: number; liquidity: number; fetchedAt: number } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const now = Date.now();

    // Return cache if fresh
    if (cachedPrice && now - cachedPrice.fetchedAt < CACHE_TTL_MS) {
      return json({
        ...cachedPrice,
        cached: true,
        ttl_remaining_ms: CACHE_TTL_MS - (now - cachedPrice.fetchedAt),
      });
    }

    // Fetch from DexScreener
    const res = await fetch(DEXSCREENER_URL, {
      headers: { "User-Agent": "MEEET-Platform/1.0" },
    });

    if (!res.ok) {
      // Return stale cache if available
      if (cachedPrice) {
        return json({ ...cachedPrice, cached: true, stale: true });
      }
      return json({ error: "DexScreener API unavailable", fallback_price_usd: 0.001 }, 502);
    }

    const data = await res.json();
    const pairs = data.pairs || [];

    // Find the best pair (highest liquidity)
    let bestPair = pairs[0];
    for (const p of pairs) {
      if ((p.liquidity?.usd || 0) > (bestPair?.liquidity?.usd || 0)) {
        bestPair = p;
      }
    }

    if (!bestPair) {
      return json({
        priceUsd: 0.001,
        priceSOL: 0,
        marketCap: 0,
        volume24h: 0,
        change24h: 0,
        liquidity: 0,
        fetchedAt: now,
        fallback: true,
      });
    }

    cachedPrice = {
      priceUsd: parseFloat(bestPair.priceUsd || "0.001"),
      priceSOL: parseFloat(bestPair.priceNative || "0"),
      marketCap: bestPair.marketCap || bestPair.fdv || 0,
      volume24h: bestPair.volume?.h24 || 0,
      change24h: bestPair.priceChange?.h24 || 0,
      liquidity: bestPair.liquidity?.usd || 0,
      fetchedAt: now,
    };

    // Also store in DB for historical tracking
    try {
      const sc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await sc.from("token_price_history").insert({
        price_usd: cachedPrice.priceUsd,
        price_sol: cachedPrice.priceSOL,
        market_cap: cachedPrice.marketCap,
        volume_24h: cachedPrice.volume24h,
        liquidity_usd: cachedPrice.liquidity,
      });
    } catch (_) {
      // Non-critical, ignore
    }

    return json({ ...cachedPrice, cached: false });
  } catch (err: any) {
    console.error("get-meeet-price error:", err);
    if (cachedPrice) {
      return json({ ...cachedPrice, cached: true, stale: true });
    }
    return json({ priceUsd: 0.001, fallback: true, error: err.message }, 200);
  }
});
