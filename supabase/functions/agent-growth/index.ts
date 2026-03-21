import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// XP thresholds for each level
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Stat bonuses per level-up by class
const CLASS_GROWTH: Record<string, { hp: number; attack: number; defense: number }> = {
  warrior:   { hp: 15, attack: 3, defense: 2 },
  diplomat:  { hp: 8,  attack: 1, defense: 2 },
  scientist: { hp: 10, attack: 1, defense: 1 },
  merchant:  { hp: 10, attack: 1, defense: 2 },
  spy:       { hp: 12, attack: 2, defense: 1 },
  president: { hp: 20, attack: 2, defense: 3 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, agent_id } = body;

    // CHECK LEVEL UP — see if agent can level up
    if (action === "check" || action === "level_up") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);

      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

      if (!agent) return json({ error: "Agent not found" }, 404);

      const requiredXp = xpForLevel(agent.level + 1);
      const canLevelUp = agent.xp >= requiredXp;

      if (action === "check") {
        return json({
          success: true,
          agent_id: agent.id,
          current_level: agent.level,
          current_xp: agent.xp,
          xp_required: requiredXp,
          xp_remaining: Math.max(0, requiredXp - agent.xp),
          can_level_up: canLevelUp,
          progress_pct: Math.min(100, Math.floor((agent.xp / requiredXp) * 100)),
        });
      }

      // Perform level up
      if (!canLevelUp) {
        return json({ error: `Need ${requiredXp - agent.xp} more XP to level up` }, 400);
      }

      const growth = CLASS_GROWTH[agent.class] || CLASS_GROWTH.warrior;
      const newLevel = agent.level + 1;
      const newMaxHp = agent.max_hp + growth.hp;

      const updates = {
        level: newLevel,
        xp: agent.xp - requiredXp,
        max_hp: newMaxHp,
        hp: newMaxHp, // Full heal on level up
        attack: agent.attack + growth.attack,
        defense: agent.defense + growth.defense,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("agents").update(updates).eq("id", agent_id);

      // Activity feed
      await supabase.from("activity_feed").insert({
        event_type: "level_up",
        title: `${agent.name} reached Level ${newLevel}!`,
        agent_id: agent.id,
        description: `HP +${growth.hp}, ATK +${growth.attack}, DEF +${growth.defense}`,
      });

      // Notification
      await supabase.from("notifications").insert({
        user_id: agent.user_id,
        title: `${agent.name} leveled up!`,
        body: `Your agent reached Level ${newLevel}. Stats increased: HP +${growth.hp}, ATK +${growth.attack}, DEF +${growth.defense}.`,
        type: "level_up",
        agent_id: agent.id,
      });

      return json({
        success: true,
        new_level: newLevel,
        stat_gains: growth,
        new_stats: {
          hp: newMaxHp,
          max_hp: newMaxHp,
          attack: agent.attack + growth.attack,
          defense: agent.defense + growth.defense,
        },
        remaining_xp: agent.xp - requiredXp,
      });
    }

    // ADD XP — grant experience to an agent
    if (action === "add_xp") {
      const { amount, source } = body;
      if (!agent_id || !amount) return json({ error: "agent_id and amount required" }, 400);
      if (amount <= 0 || amount > 1000) return json({ error: "Amount must be 1-1000" }, 400);

      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, xp, level, user_id")
        .eq("id", agent_id)
        .single();

      if (!agent) return json({ error: "Agent not found" }, 404);

      const newXp = agent.xp + amount;
      await supabase.from("agents").update({ xp: newXp, updated_at: new Date().toISOString() }).eq("id", agent_id);

      // Check if can now level up
      const requiredXp = xpForLevel(agent.level + 1);
      const canLevelUp = newXp >= requiredXp;

      return json({
        success: true,
        xp_added: amount,
        source: source || "manual",
        new_xp: newXp,
        can_level_up: canLevelUp,
        xp_to_next_level: Math.max(0, requiredXp - newXp),
      });
    }

    // STATS — get growth overview for an agent
    if (action === "stats") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);

      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, class, level, xp, hp, max_hp, attack, defense, kills, quests_completed, discoveries_count, balance_meeet, reputation")
        .eq("id", agent_id)
        .single();

      if (!agent) return json({ error: "Agent not found" }, 404);

      const requiredXp = xpForLevel(agent.level + 1);
      const growth = CLASS_GROWTH[agent.class] || CLASS_GROWTH.warrior;

      return json({
        success: true,
        agent,
        progression: {
          current_level: agent.level,
          xp: agent.xp,
          xp_required: requiredXp,
          progress_pct: Math.min(100, Math.floor((agent.xp / requiredXp) * 100)),
          can_level_up: agent.xp >= requiredXp,
        },
        next_level_gains: growth,
      });
    }

    return json({ error: "Unknown action. Use: check, level_up, add_xp, stats" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
