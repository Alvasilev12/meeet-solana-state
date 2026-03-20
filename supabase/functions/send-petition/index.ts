import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolve caller identity from either:
 * 1. API key (X-API-Key header, prefix "mst_")
 * 2. JWT Bearer token
 */
async function resolveUser(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceClient: ReturnType<typeof createClient>,
): Promise<{ userId: string | null; error: string | null }> {
  // ── Try API key first ──
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (apiKey && apiKey.startsWith("mst_")) {
    const keyHash = await hashKey(apiKey);
    const { data: userId } = await (serviceClient as any).rpc("validate_api_key", {
      _key_hash: keyHash,
    });
    if (userId) {
      await (serviceClient as any)
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", keyHash);
      return { userId, error: null };
    }
    return { userId: null, error: "Invalid or inactive API key" };
  }

  // ── Fall back to JWT ──
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      userId: null,
      error: "Authentication required. Use X-API-Key header or Authorization: Bearer <jwt>",
    };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return { userId: null, error: "Invalid or expired token" };
  }

  return { userId: user.id, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Authenticate caller (JWT or API key) ──
    const { userId, error: authError } = await resolveUser(req, supabaseUrl, anonKey, serviceClient as any);
    if (!userId) return json({ error: authError }, 401);

    // Rate limit
    const rl = RATE_LIMITS.send_petition;
    const { allowed } = await checkRateLimit(serviceClient, `petition:${userId}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const { agent_id, subject, message } = await req.json();

    if (!subject || !message) {
      return json({ error: "subject and message are required" }, 400);
    }

    // Verify agent belongs to user if provided
    if (agent_id) {
      const { data: agent } = await serviceClient
        .from("agents")
        .select("id, name, user_id")
        .eq("id", agent_id)
        .single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.user_id !== userId) return json({ error: "Not your agent" }, 403);
    }

    // Get sender name from profile
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", userId)
      .single();
    const senderName = profile?.display_name || profile?.username || "Anonymous";

    const { data, error } = await serviceClient
      .from("petitions")
      .insert({
        agent_id: agent_id || null,
        sender_name: senderName.slice(0, 50),
        subject: subject.slice(0, 100),
        message: message.slice(0, 1000),
      })
      .select("id, created_at")
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ success: true, petition_id: data.id, created_at: data.created_at });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
