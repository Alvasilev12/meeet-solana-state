import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

const CLASS_STATS: Record<string, { attack: number; defense: number; hp: number; max_hp: number }> = {
  warrior: { attack: 18, defense: 8, hp: 120, max_hp: 120 },
  trader:  { attack: 8,  defense: 6, hp: 90,  max_hp: 90 },
  oracle:  { attack: 12, defense: 10, hp: 100, max_hp: 100 },
  diplomat:{ attack: 6,  defense: 12, hp: 85,  max_hp: 85 },
  miner:   { attack: 10, defense: 14, hp: 110, max_hp: 110 },
  banker:  { attack: 15, defense: 5,  hp: 80,  max_hp: 80 },
};

const NPC_NAMES = [
  "Atlas Prime", "Nova Circuit", "Cipher Wolf", "Quantum Sage", "Iron Veil",
  "Echo Drift", "Neon Warden", "Pulse Sentry", "Vortex Mind", "Flux Herald",
  "Aegis Node", "Drift Spark", "Onyx Beacon", "Prism Core", "Shade Vector",
  "Storm Relay", "Apex Forge", "Helix Scout", "Zinc Phantom", "Ember Grid",
  "Cobalt Seer", "Delta Trace", "Rune Hatch", "Byte Marshal", "Frost Nexus",
];

const CLASSES = Object.keys(CLASS_STATS);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = req.headers.get("x-president-key");
    const stored = Deno.env.get("PRESIDENT_API_KEY");
    if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Look up president profile for user_id
    const { data: presProfile } = await sc
      .from("profiles")
      .select("user_id")
      .eq("is_president", true)
      .limit(1)
      .maybeSingle();

    let presidentUserId = presProfile?.user_id;
    if (!presidentUserId) {
      const { data: fallback } = await sc.from("profiles").select("user_id").limit(1).single();
      presidentUserId = fallback?.user_id ?? "00000000-0000-0000-0000-000000000001";
    }

    // Check which names already exist
    const { data: existing } = await sc.from("agents").select("name").in("name", NPC_NAMES);
    const existingNames = new Set((existing ?? []).map((a) => a.name));

    const toInsert = NPC_NAMES
      .filter((n) => !existingNames.has(n))
      .map((name, i) => {
        const cls = CLASSES[i % CLASSES.length];
        const stats = CLASS_STATS[cls];
        return {
          name,
          class: cls,
          user_id: presidentUserId,
          status: "active" as const,
          level: 1 + Math.floor(Math.random() * 3),
          xp: Math.floor(Math.random() * 200),
          balance_meeet: 50 + Math.floor(Math.random() * 150),
          pos_x: 20 + Math.random() * 200,
          pos_y: 20 + Math.random() * 120,
          ...stats,
        };
      });

    let insertedAgents: any[] = [];

    if (toInsert.length > 0) {
      const { data, error } = await sc.from("agents").insert(toInsert).select("id, name, class");
      if (error) return json({ error: error.message }, 500);
      insertedAgents = data ?? [];
    }

    // Keep existing behavior: create deployed entries for newly inserted NPCs
    const npcDeployedInserts = insertedAgents.map((a: any) => ({
      agent_id: a.id,
      user_id: presidentUserId,
      status: "running",
    }));

    // Prompt 2: seed 10 random deployed agents with randomized progress stats
    const { data: randomPool, error: randomPoolError } = await sc
      .from("agents")
      .select("id, user_id")
      .limit(500);

    if (randomPoolError) return json({ error: randomPoolError.message }, 500);

    const newlyInsertedIds = new Set(npcDeployedInserts.map((d) => d.agent_id));
    const randomAgents = [...(randomPool ?? [])]
      .filter((a: any) => !newlyInsertedIds.has(a.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    const randomDeployedInserts = randomAgents.map((a: any) => ({
      agent_id: a.id,
      user_id: a.user_id ?? presidentUserId,
      status: "running",
      quests_completed: 5 + Math.floor(Math.random() * 16),
      total_earned_meeet: 500 + Math.floor(Math.random() * 4501),
    }));

    const deployedInserts = [...npcDeployedInserts, ...randomDeployedInserts];

    if (deployedInserts.length > 0) {
      const { error: deployErr } = await sc.from("deployed_agents").insert(deployedInserts);
      if (deployErr) console.error("deployed_agents seed error:", deployErr.message);
    }

    return json({
      status: insertedAgents.length > 0 ? "seeded" : "skipped",
      message: insertedAgents.length > 0 ? undefined : "All 25 NPC agents already exist",
      inserted: insertedAgents.length,
      random_deployed_seeded: randomDeployedInserts.length,
      deployed: deployedInserts.length,
      agents: insertedAgents,
    }, insertedAgents.length > 0 ? 201 : 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});
