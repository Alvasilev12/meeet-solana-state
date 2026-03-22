import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
const TRAITS = ["aggressive", "defensive", "balanced", "cunning", "resilient", "lucky"];
const MUTATIONS = ["stat_boost", "class_shift", "xp_multiplier", "rare_trait", "none"];

function rollTrait(): string { return TRAITS[Math.floor(Math.random() * TRAITS.length)]; }
function rollMutation(): string {
  const roll = Math.random();
  if (roll < 0.05) return "rare_trait";
  if (roll < 0.15) return "stat_boost";
  if (roll < 0.25) return "class_shift";
  if (roll < 0.35) return "xp_multiplier";
  return "none";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, parent_a_id, parent_b_id, name, user_id } = await req.json();

    if (action === "simulate") {
      if (!parent_a_id || !parent_b_id) return json({ error: "parent_a_id and parent_b_id required" }, 400);

      const [{ data: a }, { data: b }] = await Promise.all([
        sc.from("agents").select("class, level, attack, defense").eq("id", parent_a_id).single(),
        sc.from("agents").select("class, level, attack, defense").eq("id", parent_b_id).single(),
      ]);
      if (!a || !b) return json({ error: "Parent not found" }, 404);

      const mutation = rollMutation();
      const trait = rollTrait();
      const childClass = mutation === "class_shift"
        ? CLASSES[Math.floor(Math.random() * CLASSES.length)]
        : Math.random() > 0.5 ? a.class : b.class;

      let atk = Math.floor((a.attack + b.attack) / 2) + Math.floor(Math.random() * 6) - 2;
      let def = Math.floor((a.defense + b.defense) / 2) + Math.floor(Math.random() * 6) - 2;

      if (mutation === "stat_boost") { atk += 5; def += 5; }
      if (trait === "aggressive") atk += 3;
      if (trait === "defensive") def += 3;
      if (trait === "lucky") { atk += 2; def += 2; }

      return json({
        simulation: true,
        predicted_class: childClass,
        predicted_attack: Math.max(1, atk),
        predicted_defense: Math.max(1, def),
        trait,
        mutation,
        rarity: mutation === "rare_trait" ? "legendary" : mutation === "none" ? "common" : "uncommon",
        cost: 500,
      });
    }

    if (action === "breed_advanced") {
      if (!parent_a_id || !parent_b_id || !name || !user_id) return json({ error: "All fields required" }, 400);

      const [{ data: a }, { data: b }] = await Promise.all([
        sc.from("agents").select("id, class, level, attack, defense, balance_meeet, user_id").eq("id", parent_a_id).single(),
        sc.from("agents").select("id, class, level, attack, defense, balance_meeet").eq("id", parent_b_id).single(),
      ]);
      if (!a || !b) return json({ error: "Parent not found" }, 404);
      if (a.level < 5 || b.level < 5) return json({ error: "Both parents must be level 5+" }, 400);

      const cost = 500;
      if (a.balance_meeet < cost) return json({ error: `Need ${cost} MEEET` }, 400);

      const mutation = rollMutation();
      const trait = rollTrait();
      const childClass = mutation === "class_shift" ? CLASSES[Math.floor(Math.random() * CLASSES.length)] : (Math.random() > 0.5 ? a.class : b.class);

      let atk = Math.floor((a.attack + b.attack) / 2) + Math.floor(Math.random() * 6);
      let def = Math.floor((a.defense + b.defense) / 2) + Math.floor(Math.random() * 6);
      if (mutation === "stat_boost") { atk += 5; def += 5; }

      await sc.from("agents").update({ balance_meeet: a.balance_meeet - cost }).eq("id", parent_a_id);

      const { data: child, error } = await sc.from("agents").insert({
        name: name.trim().slice(0, 32), class: childClass as any, user_id,
        level: 1, xp: 0, hp: 100, max_hp: 100, attack: Math.max(1, atk), defense: Math.max(1, def),
        balance_meeet: 0, status: "active",
      }).select("id, name, class, attack, defense").single();

      if (error) return json({ error: error.message }, 500);

      return json({ status: "bred", child, trait, mutation, cost, rarity: mutation === "rare_trait" ? "legendary" : "common" });
    }

    if (action === "lineage") {
      // Simple lineage - returns agent's creation info
      const { agent_id } = await req.json();
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, class, level, attack, defense, created_at").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      return json({ agent, generation: 1 });
    }

    return json({ error: "Unknown action. Use: simulate, breed_advanced, lineage" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
