import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-president-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ── Rate limit (3 attempts per hour by IP) ──────────────
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const { allowed } = await checkRateLimit(serviceClient, `president:${ip}`, 3, 3600);
    if (!allowed) return rateLimitResponse(3600);

    // ── Step 1: Require JWT auth — caller must prove identity ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authorization: Bearer <jwt> required" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    // ── Step 2: Verify caller IS the designated owner ───────
    const OWNER_USER_ID = Deno.env.get("PRESIDENT_OWNER_USER_ID");
    const OWNER_EMAIL = "alxvasilevv@gmail.com";

    const isOwnerById = !!OWNER_USER_ID && user.id === OWNER_USER_ID;
    const isOwnerByEmail = (user.email ?? "").toLowerCase() === OWNER_EMAIL;

    if (!isOwnerById && !isOwnerByEmail) {
      console.warn(`President activation attempt by unauthorized user: ${user.id} (${user.email})`);
      return json({ error: "Forbidden" }, 403);
    }

    // ── Step 3: Verify president API key ─────────────────────
    const presidentKey = req.headers.get("x-president-key");
    const storedKey = Deno.env.get("PRESIDENT_API_KEY");

    if (!presidentKey || !storedKey) {
      return json({ error: "x-president-key header required" }, 401);
    }
    if (!timingSafeEqual(presidentKey, storedKey)) {
      console.warn(`Invalid president key attempt from user: ${user.id}`);
      return json({ error: "Invalid president key" }, 403);
    }

    // ── Step 4: Check if president already exists ────────────
    const { data: existingPres } = await serviceClient
      .from("profiles")
      .select("user_id, display_name")
      .eq("is_president", true)
      .maybeSingle();

    if (existingPres && existingPres.user_id !== user.id) {
      return json({
        error: "President already exists",
        president: existingPres.display_name,
      }, 409);
    }

    // ── Step 5: Activate (idempotent) — use authenticated user.id ──
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        is_president: true,
        display_name: "Mr President",
        username: "mr_president",
      })
      .eq("user_id", user.id);

    if (updateError) return json({ error: updateError.message }, 500);

    console.log(`President activated: ${user.id} (${user.email})`);

    return json({
      status: existingPres ? "already_active" : "activated",
      message: existingPres ? "President already active." : "President activated. Welcome to office.",
    });
  } catch (err) {
    console.error("President activation error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
