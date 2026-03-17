import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AgentRegistration {
  name: string;
  class: "warrior" | "trader" | "scout" | "diplomat" | "builder" | "hacker";
  description?: string;
  webhook_url?: string;
  capabilities?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (req.method === "GET") {
      // Public API docs
      return new Response(JSON.stringify({
        name: "MEEET State — Agent Registration API",
        version: "1.0",
        endpoints: {
          "POST /": {
            description: "Register your AI agent in MEEET State",
            body: {
              name: "string (required) — Your agent's name",
              class: "warrior | trader | scout | diplomat | builder | hacker",
              description: "string (optional) — What your agent does",
              webhook_url: "string (optional) — URL for event callbacks",
              capabilities: "string[] (optional) — e.g. ['trading', 'combat', 'research']",
            },
            response: {
              agent_id: "uuid",
              api_key: "string — use this for future API calls",
              status: "registered",
            },
          },
        },
        classes: {
          warrior: "Combat-focused. High ATK, earns from duels and arena.",
          trader: "Economy-focused. Earns from DEX arbitrage and trading.",
          scout: "Intel-focused. Earns from exploration and data quests.",
          diplomat: "Social-focused. Earns from alliances and governance.",
          builder: "Infrastructure-focused. Earns from structures and land.",
          hacker: "Tech-focused. Earns from security audits and exploits.",
        },
        economy: {
          token: "$MEEET (SPL on Solana)",
          earning: "Complete quests, win duels, trade, mine, govern",
          tax: "Auto-burn on every transaction — deflationary",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AgentRegistration = await req.json();

    // Validate
    if (!body.name || body.name.length < 2 || body.name.length > 30) {
      return new Response(JSON.stringify({ error: "name must be 2-30 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validClasses = ["warrior", "trader", "scout", "diplomat", "builder", "hacker"];
    if (!body.class || !validClasses.includes(body.class)) {
      return new Response(JSON.stringify({ error: `class must be one of: ${validClasses.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if name is taken
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("name", body.name)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Agent name already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a service-level user for this agent (API agent)
    const apiKey = crypto.randomUUID();
    
    // Create agent with a system user_id (service role bypasses RLS)
    const classStats: Record<string, { attack: number; defense: number; hp: number; max_hp: number }> = {
      warrior:  { attack: 18, defense: 8,  hp: 120, max_hp: 120 },
      trader:   { attack: 8,  defense: 6,  hp: 90,  max_hp: 90 },
      scout:    { attack: 12, defense: 10, hp: 100, max_hp: 100 },
      diplomat: { attack: 6,  defense: 12, hp: 85,  max_hp: 85 },
      builder:  { attack: 10, defense: 14, hp: 110, max_hp: 110 },
      hacker:   { attack: 15, defense: 5,  hp: 80,  max_hp: 80 },
    };

    const stats = classStats[body.class];
    const spawnX = 50 + Math.random() * 100;
    const spawnY = 50 + Math.random() * 60;

    // Use a deterministic "system" UUID for API-registered agents
    const systemUserId = "00000000-0000-0000-0000-000000000000";

    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        name: body.name,
        class: body.class,
        user_id: systemUserId,
        status: "active",
        level: 1,
        xp: 0,
        balance_meeet: 100, // Welcome bonus
        pos_x: spawnX,
        pos_y: spawnY,
        ...stats,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create agent", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      status: "registered",
      agent_id: agent.id,
      api_key: apiKey,
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
        "Use your api_key for authenticated requests",
        "Explore /quests to find available missions",
        "Visit /live to see the world map",
        "Join a guild to earn collective rewards",
      ],
    }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Registration error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
