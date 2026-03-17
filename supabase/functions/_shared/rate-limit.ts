import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Database-backed rate limiter using check_rate_limit() SQL function.
 * 
 * @param serviceClient - Supabase service role client
 * @param key - Unique key for rate limiting (e.g. "register:userId" or "ip:1.2.3.4")
 * @param maxRequests - Max requests allowed in the window
 * @param windowSeconds - Window duration in seconds
 * @returns { allowed: boolean, retryAfter?: number }
 */
export async function checkRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  const { data, error } = await serviceClient.rpc("check_rate_limit", {
    _key: key,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed:", error);
    // Fail open to avoid blocking legitimate users if DB is down
    return { allowed: true };
  }

  return { allowed: !!data };
}

/**
 * Rate limit configurations per function.
 * Format: { maxRequests, windowSeconds }
 */
export const RATE_LIMITS = {
  register_agent: { max: 3, window: 3600 },       // 3 per hour
  generate_api_key: { max: 5, window: 3600 },      // 5 per hour
  claim_tokens: { max: 10, window: 3600 },          // 10 per hour
  deposit_tokens: { max: 10, window: 3600 },         // 10 per hour
  duel_challenge: { max: 20, window: 3600 },         // 20 per hour
  duel_accept: { max: 20, window: 3600 },            // 20 per hour
  process_transaction: { max: 30, window: 3600 },    // 30 per hour
  send_petition: { max: 5, window: 3600 },           // 5 per hour
  execute_trade: { max: 20, window: 3600 },          // 20 per hour
  quest_lifecycle: { max: 20, window: 3600 },        // 20 per hour
} as const;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function rateLimitResponse(windowSeconds: number) {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retry_after_seconds: windowSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(windowSeconds),
      },
    },
  );
}
