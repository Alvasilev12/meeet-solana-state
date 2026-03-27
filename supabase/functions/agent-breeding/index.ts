import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];

function combineName(nameA: string, nameB: string): string {
  const prefixLen = Math.ceil(nameA.length / 2);
  const suffixLen = Math.ceil(nameB.length / 2);
  const prefix = nameA.slice(0, prefixLen);
  const suffix = nameB.slice(nameB.length - suffixLen);
  return (prefix + suffix).slice(0, 24);
}

function getRarity(totalStats: number): string {
  if (totalStats >= 50) return "Legendary";
  if (totalStats >= 40) return "Epic";
  if (totalStats >= 30) return "Rare";
  return "Common";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, parent_a_id, parent_b_id, name, user_id } = await req.json();

    if (action === "breed") {
      if (!parent_a_id || !parent_b_id || !user_id) return json({ error: "parent_a_id, parent_b_id, user_id required" }, 400);

      const [{ data: a }, { data: b }] = await Promise.all([
        sc.from("agents").select("id, name, class, level, attack, defense, balance_meeet, user_id, hp, max_hp").eq("id", parent_a_id).single(),
        sc.from("agents").select("id, name, class, level, attack, defense, balance_meeet, user_id, hp, max_hp").eq("id", parent_b_id).single(),
      ]);

      if (!a || !b) return json({ error: "One or both parents not found" }, 404);
      if (a.level < 3 || b.level < 3) return json({ error: "Both parents must be level 3+" }, 400);

      const cost = 300;
      if (a.balance_meeet < cost) return json({ error: `Parent A needs ${cost} MEEET` }, 400);

      // Real genetics: 40% A + 40% B + 20% random mutation
      const mutate = () => Math.floor(Math.random() * 8) - 2; // -2 to +5
      const childAttack = Math.floor(a.attack * 0.4 + b.attack * 0.4) + mutate();
      const childDefense = Math.floor(a.defense * 0.4 + b.defense * 0.4) + mutate();
      const childHp = Math.floor(a.max_hp * 0.4 + b.max_hp * 0.4) + Math.floor(Math.random() * 20);

      // Class inheritance: 40% chance from A, 40% from B, 20% random
      const roll = Math.random();
      const childClass = roll < 0.4 ? a.class : roll < 0.8 ? b.class : CLASSES[Math.floor(Math.random() * CLASSES.length)];

      // Name: combine parent names or use provided
      const childName = name ? name.trim().slice(0, 24) : combineName(a.name, b.name);

      const totalStats = childAttack + childDefense + Math.floor(childHp / 10);
      const rarity = getRarity(totalStats);

      const burnAmount = 100;
      await sc.from("agents").update({ balance_meeet: a.balance_meeet - cost }).eq("id", parent_a_id);
      
      // Log burn: 100 of 500 burned
      await sc.from("burn_log").insert({ amount: burnAmount, reason: "breeding_fee", agent_id: parent_a_id, user_id });

      const { data: child, error } = await sc.from("agents").insert({
        name: childName, class: childClass, user_id,
        level: 1, xp: 0, hp: Math.max(80, childHp), max_hp: Math.max(80, childHp),
        attack: Math.max(5, childAttack), defense: Math.max(3, childDefense),
        balance_meeet: 0, status: "active",
      }).select("id, name, class, attack, defense, hp, max_hp").single();

      if (error) return json({ error: error.message }, 500);

      // Log activity
      await sc.from("activity_feed").insert({
        agent_id: child!.id,
        event_type: "breeding",
        title: `${childName} was born! (${rarity} ${childClass})`,
        description: `Bred from ${a.name} × ${b.name}. ATK:${child!.attack} DEF:${child!.defense} HP:${child!.hp}`,
      });

      return json({
        status: "bred", child: { ...child, rarity },
        genetics: { attack_from: `${a.attack}×0.4 + ${b.attack}×0.4`, defense_from: `${a.defense}×0.4 + ${b.defense}×0.4` },
        cost, parents: [{ id: a.id, name: a.name }, { id: b.id, name: b.name }],
        message: `${rarity} agent "${childName}" bred from ${a.name} × ${b.name}!`,
      });
    }

    if (action === "compatibility") {
      if (!parent_a_id || !parent_b_id) return json({ error: "parent_a_id and parent_b_id required" }, 400);
      const [{ data: a }, { data: b }] = await Promise.all([
        sc.from("agents").select("level, class, name, attack, defense").eq("id", parent_a_id).single(),
        sc.from("agents").select("level, class, name, attack, defense").eq("id", parent_b_id).single(),
      ]);
      if (!a || !b) return json({ error: "Agent not found" }, 404);
      const compatible = a.level >= 3 && b.level >= 3;
      const crossClass = a.class !== b.class;
      const estAttack = Math.floor(a.attack * 0.4 + b.attack * 0.4);
      const estDefense = Math.floor(a.defense * 0.4 + b.defense * 0.4);
      const estRarity = getRarity(estAttack + estDefense + 10);
      return json({
        compatible, cost: 300,
        bonus: crossClass ? "Cross-class bonus: +3 stats, chance of rare class" : "Same-class synergy: higher stat inheritance",
        estimated: { attack: estAttack, defense: estDefense, rarity: estRarity },
        parents: [{ name: a.name, class: a.class }, { name: b.name, class: b.class }],
      });
    }

    return json({ error: "Unknown action. Use: breed, compatibility" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
