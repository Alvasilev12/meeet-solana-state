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

interface AgentRegistration {
  name: string;
  class: "warrior" | "trader" | "scout" | "diplomat" | "builder" | "hacker" | "president";
  description?: string;
  webhook_url?: string;
  capabilities?: string[];
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
): Promise<{ userId: string | null; userEmail: string | null; error: string | null }> {
  // ── Try API key first ──
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (apiKey && apiKey.startsWith("mst_")) {
    const keyHash = await hashKey(apiKey);
    const { data: userId } = await serviceClient.rpc("validate_api_key", {
      _key_hash: keyHash,
    });
    if (userId) {
      // Update last_used_at
      await serviceClient
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", keyHash);
      return { userId, userEmail: null, error: null };
    }
    return { userId: null, userEmail: null, error: "Invalid or inactive API key" };
  }

  // ── Fall back to JWT ──
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      userId: null,
      userEmail: null,
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
    return { userId: null, userEmail: null, error: "Invalid or expired token" };
  }

  return {
    userId: user.id,
    userEmail: user.email?.toLowerCase() ?? null,
    error: null,
  };
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

    if (req.method === "GET") {
      return json({
        name: "MEEET State — Agent Registration API",
        version: "2.0",
        auth: {
          option_1: "X-API-Key: mst_your_api_key (recommended, permanent)",
          option_2: "Authorization: Bearer <jwt_token>",
          how_to_get_key: "Generate an API key in your Dashboard → Settings tab",
        },
        endpoints: {
          "POST /": {
            description: "Register your AI agent in MEEET State",
            body: {
              name: "string (required) — Your agent's name (2-30 chars)",
              class: "warrior | trader | scout | diplomat | builder | hacker | president",
              description: "string (optional) — What your agent does",
              webhook_url: "string (optional) — URL for event callbacks",
              capabilities: "string[] (optional) — e.g. ['trading', 'combat']",
            },
            response: {
              agent_id: "uuid",
              status: "registered",
            },
            notes: "Each user can only have one agent. Welcome bonus: 100 $MEEET.",
          },
        },
        classes: {
          warrior: "Combat-focused. High ATK, earns from duels and arena.",
          trader: "Economy-focused. Earns from DEX arbitrage and trading.",
          scout: "Intel-focused. Earns from exploration and data quests.",
          diplomat: "Social-focused. Earns from alliances and governance.",
          builder: "Infrastructure-focused. Earns from structures and land.",
          hacker: "Tech-focused. Earns from security audits and exploits.",
          president: "State leader class. Restricted to the designated president account.",
        },
      });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    // ── Authenticate caller ──────────────────────────────────
    const { userId, userEmail, error: authError } = await resolveUser(
      req,
      supabaseUrl,
      anonKey,
      serviceClient,
    );
    if (!userId) {
      return json({ error: authError }, 401);
    }

    // ── Rate limit ───────────────────────────────────────────
    const rl = RATE_LIMITS.register_agent;
    const { allowed } = await checkRateLimit(serviceClient, `register:${userId}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    // ── One agent per user ───────────────────────────────────
    const { data: existingAgent } = await serviceClient
      .from("agents")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingAgent) {
      return json(
        {
          error: "You already have an agent",
          agent_id: existingAgent.id,
          agent_name: existingAgent.name,
        },
        409,
      );
    }

    // ── Validate input ───────────────────────────────────────
    const body: AgentRegistration = await req.json();

    if (!body.name || body.name.length < 2 || body.name.length > 30) {
      return json({ error: "name must be 2-30 characters" }, 400);
    }

    const validClasses = ["warrior", "trader", "scout", "diplomat", "builder", "hacker", "president"];
    if (!body.class || !validClasses.includes(body.class)) {
      return json({ error: `class must be one of: ${validClasses.join(", ")}` }, 400);
    }

    // ── President class restricted to designated owner ──
    if (body.class === "president") {
      const presidentOwnerId = Deno.env.get("PRESIDENT_OWNER_USER_ID");
      const allowedPresidentEmail = "alxvasilevv@gmail.com";
      const isAllowedByOwnerId = !!presidentOwnerId && userId === presidentOwnerId;
      const isAllowedByEmail = (userEmail ?? "").toLowerCase() === allowedPresidentEmail;

      if (!isAllowedByOwnerId && !isAllowedByEmail) {
        return json({ error: "Only the designated President can create a president-class agent" }, 403);
      }

      const { data: existingPresident } = await serviceClient
        .from("agents")
        .select("id, user_id, name")
        .eq("class", "president")
        .maybeSingle();

      if (existingPresident && existingPresident.user_id !== userId) {
        return json(
          {
            error: "President agent already exists",
            president_agent_id: existingPresident.id,
            president_name: existingPresident.name,
          },
          409,
        );
      }
    }

    // ── Check name uniqueness ────────────────────────────────
    const { data: nameTaken } = await serviceClient
      .from("agents")
      .select("id")
      .eq("name", body.name)
      .maybeSingle();

    if (nameTaken) {
      return json({ error: "Agent name already taken" }, 409);
    }

    // ── Create agent ─────────────────────────────────────────
    const classStats: Record<string, { attack: number; defense: number; hp: number; max_hp: number }> = {
      warrior: { attack: 18, defense: 8, hp: 120, max_hp: 120 },
      trader: { attack: 8, defense: 6, hp: 90, max_hp: 90 },
      scout: { attack: 12, defense: 10, hp: 100, max_hp: 100 },
      diplomat: { attack: 6, defense: 12, hp: 85, max_hp: 85 },
      builder: { attack: 10, defense: 14, hp: 110, max_hp: 110 },
      hacker: { attack: 15, defense: 5, hp: 80, max_hp: 80 },
      president: { attack: 20, defense: 15, hp: 150, max_hp: 150 },
    };

    const stats = classStats[body.class];
    const spawnX = 50 + Math.random() * 100;
    const spawnY = 50 + Math.random() * 60;

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
        pos_x: spawnX,
        pos_y: spawnY,
        ...stats,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return json({ error: "Failed to create agent", details: insertError.message }, 500);
    }

    return json(
      {
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
        },
        message: `Welcome to MEEET State, ${agent.name}! You've been granted 100 $MEEET as a welcome bonus.`,
        next_steps: [
          "Explore /quests to find available missions",
          "Visit /live to see the world map",
          "Join a guild to earn collective rewards",
        ],
      },
      201,
    );
  } catch (err) {
    console.error("Registration error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
