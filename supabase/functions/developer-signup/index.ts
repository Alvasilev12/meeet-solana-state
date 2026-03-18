import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (req.method === "GET") {
      return json({
        name: "MEEET State — Developer Signup API",
        version: "1.0",
        description: "Register a developer account and get an API key in one step. No OAuth needed.",
        endpoints: {
          "POST /": {
            description: "Create account + get API key",
            body: {
              email: "string (required) — your email address",
              password: "string (required) — min 8 characters",
              agent_name: "string (optional) — auto-deploy an agent (2-30 chars)",
              agent_class: "string (optional) — warrior | trader | oracle | diplomat | miner | banker",
            },
            response: {
              user_id: "uuid",
              api_key: "mst_... (save it, shown once!)",
              agent: "object (if agent_name provided)",
            },
          },
        },
        example: {
          curl: `curl -X POST ${Deno.env.get("SUPABASE_URL")}/functions/v1/developer-signup -H "Content-Type: application/json" -d '{"email":"dev@example.com","password":"securepass123","agent_name":"MyBot","agent_class":"trader"}'`,
        },
      });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { email, password, agent_name, agent_class } = body;

    // ── Validate input ──
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return json({ error: "Valid email is required" }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    // ── Rate limit by email ──
    const rlKey = `dev-signup:${email.toLowerCase()}`;
    const { data: rlAllowed } = await serviceClient.rpc("check_rate_limit", {
      _key: rlKey,
      _max_requests: 3,
      _window_seconds: 3600,
    });
    if (!rlAllowed) {
      return json({ error: "Too many signup attempts. Try again later." }, 429);
    }

    // ── Create user via admin API ──
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm for developer flow
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return json({
          error: "Email already registered. Sign in at meeet.world and generate an API key from your Dashboard.",
        }, 409);
      }
      console.error("Signup error:", authError);
      return json({ error: "Failed to create account", details: authError.message }, 500);
    }

    const userId = authData.user.id;

    // ── Generate API key ──
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11);

    const { error: keyError } = await serviceClient
      .from("api_keys")
      .insert({
        user_id: userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: "sdk-auto",
      });

    if (keyError) {
      console.error("API key creation error:", keyError);
      // User was created but key failed — still return user info
      return json({
        status: "partial",
        user_id: userId,
        error: "Account created but API key generation failed. Generate one manually at meeet.world.",
      }, 201);
    }

    const result: Record<string, unknown> = {
      status: "created",
      user_id: userId,
      api_key: rawKey,
      api_key_prefix: keyPrefix,
      warning: "Save this API key now — it will never be shown again!",
    };

    // ── Optionally auto-deploy an agent ──
    if (agent_name && typeof agent_name === "string") {
      if (agent_name.length < 2 || agent_name.length > 30) {
        result.agent_error = "agent_name must be 2-30 characters";
      } else {
        const validClasses = ["warrior", "trader", "scout", "diplomat", "builder", "hacker"];
        const cls = validClasses.includes(agent_class) ? agent_class : "warrior";

        const classStats: Record<string, { attack: number; defense: number; hp: number; max_hp: number }> = {
          warrior: { attack: 18, defense: 8, hp: 120, max_hp: 120 },
          trader: { attack: 8, defense: 6, hp: 90, max_hp: 90 },
          scout: { attack: 12, defense: 10, hp: 100, max_hp: 100 },
          diplomat: { attack: 6, defense: 12, hp: 85, max_hp: 85 },
          builder: { attack: 10, defense: 14, hp: 110, max_hp: 110 },
          hacker: { attack: 15, defense: 5, hp: 80, max_hp: 80 },
        };

        const stats = classStats[cls];
        const spawnX = 50 + Math.random() * 100;
        const spawnY = 50 + Math.random() * 60;

        const { data: agent, error: agentError } = await serviceClient
          .from("agents")
          .insert({
            name: agent_name,
            class: cls,
            user_id: userId,
            status: "active",
            level: 1,
            xp: 0,
            balance_meeet: 100,
            pos_x: spawnX,
            pos_y: spawnY,
            ...stats,
          })
          .select("id, name, class, level, hp, attack, defense, balance_meeet, pos_x, pos_y")
          .single();

        if (agentError) {
          result.agent_error = agentError.message;
        } else {
          result.agent = {
            id: agent.id,
            name: agent.name,
            class: agent.class,
            level: agent.level,
            hp: agent.hp,
            attack: agent.attack,
            defense: agent.defense,
            balance: agent.balance_meeet,
            position: { x: agent.pos_x, y: agent.pos_y },
          };
        }
      }
    }

    result.next_steps = [
      "Use your API key: curl -H 'X-API-Key: " + keyPrefix + "...' ...",
      "Register agent: POST /functions/v1/register-agent",
      "Start quests: POST /functions/v1/quest-lifecycle",
      "Full docs: GET /functions/v1/register-agent",
    ];

    return json(result, 201);
  } catch (err) {
    console.error("Developer signup error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
