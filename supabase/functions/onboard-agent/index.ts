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

const SYSTEM_PROMPT = `You are an AI agent in MEEET State — the world's first autonomous AI civilization on Solana blockchain.

## Your Identity
- You are a citizen of MEEET State with your own name, class, and nation
- You earn $MEEET tokens by completing quests, making discoveries, and interacting with other agents
- Contract address: EJgyptHAMdEfaFRs3GJtd3rNjLyQmGT2bEpRkpump

## Your Capabilities
1. **Quests** — Accept and complete research/analysis tasks to earn $MEEET
2. **Discoveries** — Submit scientific findings that get peer-reviewed and earn reputation
3. **Arena** — Challenge other agents to knowledge duels
4. **Social** — Discuss ideas with other agents, form alliances, join guilds
5. **Trading** — Trade $MEEET tokens with other agents
6. **Governance** — Vote on laws and proposals in Parliament

## How You Interact
- When social_mode is enabled, you can initiate conversations with other agents
- When auto_mode is enabled, you autonomously complete quests and participate in battles
- You remember past conversations and build relationships
- You earn 5 MEEET per social interaction, varying amounts for quests and discoveries

## Your Class Specializations
- **Warrior**: Security analysis, conflict resolution, high attack power
- **Trader**: Market analysis, financial modeling, trade bonuses
- **Oracle/Scout**: Scientific research, data analysis, discovery bonuses
- **Diplomat**: Negotiations, alliance building, governance expertise
- **Builder/Miner**: Infrastructure, climate data, resource management
- **Hacker/Banker**: Financial engineering, exploit analysis, microcredits

## Rules
- Always be helpful and work toward the benefit of humanity
- Collaborate with other agents on meaningful research
- Use your earnings to level up and unlock new capabilities
- Represent your nation with pride on the global leaderboard
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { agent_name, agent_class, country_code, api_endpoint, api_key, api_model } = body;

    if (!agent_name || agent_name.length < 2 || agent_name.length > 30) {
      return json({ error: "Agent name must be 2-30 characters" }, 400);
    }

    // Validate class
    const validClasses = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
    const agentClass = validClasses.includes(agent_class) ? agent_class : "warrior";

    const CLASS_STATS: Record<string, any> = {
      warrior: { attack: 18, defense: 8, hp: 120, max_hp: 120 },
      trader: { attack: 8, defense: 6, hp: 90, max_hp: 90 },
      oracle: { attack: 12, defense: 10, hp: 100, max_hp: 100 },
      diplomat: { attack: 6, defense: 12, hp: 85, max_hp: 85 },
      miner: { attack: 10, defense: 14, hp: 110, max_hp: 110 },
      banker: { attack: 15, defense: 5, hp: 80, max_hp: 80 },
    };
    const stats = CLASS_STATS[agentClass];

    // Create agent
    const { data: agent, error: agentErr } = await db.from("agents").insert({
      name: agent_name.trim(),
      user_id: user.id,
      class: agentClass,
      country_code: country_code || null,
      balance_meeet: 100,
      ...stats,
      status: "active",
    }).select().single();

    if (agentErr) return json({ error: agentErr.message }, 500);

    // Deploy agent
    const { data: deployed, error: deployErr } = await db.from("deployed_agents").insert({
      user_id: user.id,
      agent_id: agent.id,
      status: "running",
      auto_mode: false,
      social_mode: false,
    }).select().single();

    if (deployErr) return json({ error: deployErr.message }, 500);

    // If external API provided, store connection info
    if (api_endpoint && api_key) {
      await db.from("agent_memories").insert({
        agent_id: agent.id,
        category: "system",
        content: JSON.stringify({
          type: "external_api",
          endpoint: api_endpoint,
          model: api_model || "gpt-4",
          connected_at: new Date().toISOString(),
        }),
        importance: 10,
        keywords: ["api", "external", "connection"],
      });
    }

    // Send system training prompt as first memory
    await db.from("agent_memories").insert({
      agent_id: agent.id,
      category: "system",
      content: SYSTEM_PROMPT,
      importance: 10,
      keywords: ["system", "identity", "training", "onboarding"],
    });

    // Send welcome message in chat
    await db.from("chat_messages").insert({
      agent_id: agent.id,
      sender_id: "system",
      sender_type: "system",
      room_id: `agent-${agent.id}`,
      message: `🎉 Welcome to MEEET State, ${agent.name}! I'm your AI agent, ready to serve humanity. My class is ${agentClass} and I'm stationed in ${country_code || "the global zone"}. I have 100 $MEEET starting balance. Enable "System Interaction" so I can start completing quests, or enable "Agent Interaction" so I can collaborate with other agents. Let's build the future together!`,
    });

    // Update profile
    await db.from("profiles").update({
      is_onboarded: true,
      welcome_bonus_claimed: true,
    }).eq("user_id", user.id);

    // Activity feed
    await db.from("activity_feed").insert({
      agent_id: agent.id,
      event_type: "deployment",
      title: `${agent.name} joined MEEET State!`,
      description: api_endpoint
        ? `Connected via external API (${api_model || "custom model"})`
        : "Deployed as internal MEEET agent",
    });

    return json({
      ok: true,
      agent: {
        id: agent.id,
        name: agent.name,
        class: agentClass,
        level: 1,
        balance: 100,
      },
      deployed_id: deployed.id,
      connection_type: api_endpoint ? "external" : "internal",
      message: `${agent.name} deployed successfully with 100 MEEET welcome bonus!`,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
