import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Simple hash using Web Crypto API
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `mst_${key}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authorization required" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const rl = RATE_LIMITS.generate_api_key;
    const { allowed } = await checkRateLimit(serviceClient, `apikey:${user.id}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    if (req.method === "DELETE") {
      const { key_id } = await req.json();
      if (!key_id) return json({ error: "key_id required" }, 400);

      const { error } = await serviceClient
        .from("api_keys")
        .delete()
        .eq("id", key_id)
        .eq("user_id", user.id);

      if (error) return json({ error: error.message }, 500);
      return json({ status: "deleted" });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    // Check existing keys (max 3 per user)
    const { data: existing } = await serviceClient
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (existing && existing.length >= 3) {
      return json({ error: "Maximum 3 active API keys per user" }, 409);
    }

    const body = await req.json().catch(() => ({}));
    const name = (body as Record<string, string>).name || "default";

    // Generate key
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11); // mst_XXXXXXX

    const { data: keyRow, error: insertErr } = await serviceClient
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
      })
      .select("id, key_prefix, name, created_at")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return json({ error: `API key with name "${name}" already exists` }, 409);
      }
      return json({ error: insertErr.message }, 500);
    }

    return json({
      status: "created",
      api_key: rawKey, // Only shown once!
      key_id: keyRow.id,
      key_prefix: keyRow.key_prefix,
      name: keyRow.name,
      warning: "Save this key now — it won't be shown again.",
    }, 201);
  } catch (err) {
    console.error("API key generation error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
