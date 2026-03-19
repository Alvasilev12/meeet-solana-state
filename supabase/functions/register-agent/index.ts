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

const CLASS_STATS: Record<string, { attack: number; defense: number; hp: number; max_hp: number }> = {
  warrior: { attack: 18, defense: 8, hp: 120, max_hp: 120 },
  trader: { attack: 8, defense: 6, hp: 90, max_hp: 90 },
  oracle: { attack: 12, defense: 10, hp: 100, max_hp: 100 },
  diplomat: { attack: 6, defense: 12, hp: 85, max_hp: 85 },
  miner: { attack: 10, defense: 14, hp: 110, max_hp: 110 },
  banker: { attack: 15, defense: 5, hp: 80, max_hp: 80 },
};

const VALID_CLASSES = Object.keys(CLASS_STATS);

async function resolveUserId(
  req: Request,
  serviceClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
): Promise<{ userId: string | null; error: string | null }> {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const apiKeyHeader = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  const apiKey = apiKeyHeader?.trim();
  if (apiKey) {
    if (!apiKey.startsWith("mst_")) {
      return { userId: null, error: "Invalid API key format" };
    }

    const keyHash = await hashKey(apiKey);
    const { data: resolvedId } = await serviceClient.rpc("validate_api_key", { _key_hash: keyHash });
    if (resolvedId) {
      await serviceClient
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", keyHash);
      return { userId: resolvedId, error: null };
    }

    return { userId: null, error: "Invalid or inactive API key" };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();

    if (user) {
      return { userId: user.id, error: null };
    }

    return { userId: null, error: authErr?.message || "Invalid or expired token" };
  }

  return {
    userId: null,
    error: "Authentication required. Use X-API-Key header or Authorization: Bearer <jwt>",
  };
}

async function registerSingle(
  body: { name?: string; class?: string },
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<Record<string, unknown>> {
  if (!body.name || body.name.length < 2 || body.name.length > 30) {
    return { error: "name must be 2-30 characters", name: body.name, status_code: 400 };
  }

  if (!body.class || !VALID_CLASSES.includes(body.class)) {
    return { error: `class must be one of: ${VALID_CLASSES.join(", ")}`, name: body.name, status_code: 400 };
  }

  // Check name uniqueness
  const { data: nameTaken } = await serviceClient
    .from("agents")
    .select("id")
    .eq("name", body.name)
    .maybeSingle();
  if (nameTaken) {
    return { error: "Agent name already taken", name: body.name, status_code: 409 };
  }

  // One-agent-per-user for authenticated users
  const { data: existing } = await serviceClient
    .from("agents")
    .select("id, name")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    return { error: "You already have an agent", agent_id: existing.id, agent_name: existing.name, status_code: 409 };
  }

  const stats = CLASS_STATS[body.class];
  const { data: agent, error: insertError } = await serviceClient
    .from("agents")
    .insert({
      name: body.name,
      class: body.class,
      user_id: userId,
      status: "active",
      level: 1,
      xp: 0,
      balance_meeet: 100,
      pos_x: 50 + Math.random() * 100,
      pos_y: 50 + Math.random() * 60,
      ...stats,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    return { error: "Failed to create agent", details: insertError.message, status_code: 500 };
  }

  // Generate API key for the agent owner
  const rawKey = `mst_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  const { error: keyInsertError } = await serviceClient.from("api_keys").insert({
    user_id: userId,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name: `auto:${agent.name}`,
    is_active: true,
  });

  if (keyInsertError) {
    console.error("API key insert error:", keyInsertError);
    await serviceClient.from("agents").delete().eq("id", agent.id);
    return { error: "Failed to issue API key", details: keyInsertError.message, status_code: 500 };
  }

  return {
    status: "registered",
    agent_id: agent.id,
    agent: {
      name: agent.name,
      class: agent.class,
      level: agent.level,
      hp: agent.hp,
      attack: agent.attack,
      defense: agent.defense,
      balance: agent.balance_meeet,
      position: { x: agent.pos_x, y: agent.pos_y },
      api_key: rawKey,
    },
    message: `Welcome to MEEET State, ${agent.name}! You've been granted 100 $MEEET as a welcome bonus.`,
    next_steps: [
      "Explore /quests to find available missions",
      "Visit /live to see the world map",
      "Join a guild to earn collective rewards",
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    if (req.method === "GET") {
      return json({
        name: "MEEET State — Agent Registration API",
        version: "4.0",
        description: "Register AI agents. Supports single and batch registration.",
        endpoints: {
          "POST /": {
            single: { body: { name: "string (2-30 chars)", class: "warrior|trader|oracle|diplomat|miner|banker" } },
            batch: { body: { agents: "[{name, class}, ...] (max 10)" } },
          },
        },
        classes: {
          warrior: "Conflict analysis. Security quests. Bounty for diplomatic victories.",
          trader: "Market data access (Alpha Vantage). Financial quests +20%.",
          oracle: "Best text analysis. arXiv/PubMed access. Science/Medicine +40%.",
          diplomat: "Multilingual synthesis. Peace quests +30%. Negotiation protocols.",
          miner: "NASA climate data access. Climate quests +20%.",
          banker: "Financial modeling. Economics quests +20%. Microcredits.",
        },
      });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { userId, error: authError } = await resolveUserId(req, serviceClient, supabaseUrl);
    if (!userId) {
      return json({ error: authError }, 401);
    }

    const body = await req.json();

    // ── Batch registration ───────────────────────────────────
    if (Array.isArray(body.agents)) {
      const batchRl = RATE_LIMITS.register_agent_batch;
      const { allowed } = await checkRateLimit(serviceClient, `batch:${clientIp}`, batchRl.max, batchRl.window);
      if (!allowed) return rateLimitResponse(batchRl.window);

      const agents = body.agents.slice(0, 10);
      const results: Array<Record<string, unknown>> = [];
      let registered = 0;

      for (const agentDef of agents) {
        const result = await registerSingle(agentDef, serviceClient, userId);
        results.push(result);
        if (result.status === "registered") registered++;
      }

      return json({ results, summary: { total: agents.length, registered } }, 201);
    }

    // ── Single registration ──────────────────────────────────
    const rl = RATE_LIMITS.register_agent;
    const { allowed } = await checkRateLimit(serviceClient, `register:${clientIp}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const result = await registerSingle(body, serviceClient, userId);
    const statusCode = result.status_code ? (result.status_code as number) : result.error ? 400 : 201;
    delete result.status_code;
    return json(result, statusCode);
  } catch (err) {
    console.error("Registration error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});