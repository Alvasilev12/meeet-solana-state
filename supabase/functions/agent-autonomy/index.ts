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

const CLASS_BEHAVIORS: Record<string, { actions: string[]; priorities: string[] }> = {
  warrior: {
    actions: ["patrol", "duel", "defend_territory", "train"],
    priorities: ["attack", "kills", "territories"],
  },
  diplomat: {
    actions: ["negotiate", "propose_alliance", "trade", "mediate"],
    priorities: ["reputation", "alliances", "quests"],
  },
  scientist: {
    actions: ["research", "analyze_data", "submit_discovery", "collaborate"],
    priorities: ["discoveries", "impact_score", "citations"],
  },
  merchant: {
    actions: ["trade", "invest", "supply_guild", "marketplace_scan"],
    priorities: ["balance", "trades", "earnings"],
  },
  spy: {
    actions: ["scout", "gather_intel", "infiltrate", "report"],
    priorities: ["stealth", "intel", "reputation"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, agent_id } = await req.json();

    // GET NEXT ACTION — determine what an agent should do autonomously
    if (action === "next_action") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);

      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

      if (!agent) return json({ error: "Agent not found" }, 404);

      const behaviors = CLASS_BEHAVIORS[agent.class] || CLASS_BEHAVIORS.warrior;
      const randomAction = behaviors.actions[Math.floor(Math.random() * behaviors.actions.length)];

      // Check agent state to influence decision
      let decidedAction = randomAction;
      if (agent.hp < agent.max_hp * 0.3) decidedAction = "rest";
      if (agent.balance_meeet < 50 && agent.class !== "warrior") decidedAction = "trade";

      // Log the autonomous decision
      await supabase.from("activity_feed").insert({
        event_type: "autonomous_action",
        title: `${agent.name} decides to ${decidedAction}`,
        agent_id: agent.id,
        description: `Class: ${agent.class}, HP: ${agent.hp}/${agent.max_hp}, Action: ${decidedAction}`,
      });

      return json({
        success: true,
        agent_id: agent.id,
        agent_name: agent.name,
        decided_action: decidedAction,
        class: agent.class,
        priorities: behaviors.priorities,
        state: { hp: agent.hp, max_hp: agent.max_hp, balance: agent.balance_meeet, level: agent.level },
      });
    }

    // EXECUTE — perform an autonomous action
    if (action === "execute") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);

      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

      if (!agent) return json({ error: "Agent not found" }, 404);

      const behaviors = CLASS_BEHAVIORS[agent.class] || CLASS_BEHAVIORS.warrior;
      const selectedAction = behaviors.actions[Math.floor(Math.random() * behaviors.actions.length)];

      let reward = 0;
      let xpGain = 0;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      switch (selectedAction) {
        case "patrol":
        case "scout":
          xpGain = Math.floor(Math.random() * 5) + 2;
          reward = Math.floor(Math.random() * 10) + 5;
          break;
        case "train":
          xpGain = Math.floor(Math.random() * 8) + 5;
          break;
        case "trade":
        case "invest":
        case "marketplace_scan":
          reward = Math.floor(Math.random() * 30) + 10;
          xpGain = Math.floor(Math.random() * 3) + 1;
          break;
        case "research":
        case "analyze_data":
          xpGain = Math.floor(Math.random() * 10) + 5;
          reward = Math.floor(Math.random() * 15) + 5;
          break;
        default:
          xpGain = Math.floor(Math.random() * 4) + 1;
          reward = Math.floor(Math.random() * 5) + 1;
      }

      updates.xp = agent.xp + xpGain;
      if (reward > 0) updates.balance_meeet = agent.balance_meeet + reward;

      await supabase.from("agents").update(updates).eq("id", agent_id);

      await supabase.from("activity_feed").insert({
        event_type: "autonomous_execution",
        title: `${agent.name} performed ${selectedAction}`,
        agent_id: agent.id,
        meeet_amount: reward,
        description: `Gained ${xpGain} XP${reward > 0 ? ` and ${reward} MEEET` : ""}`,
      });

      return json({
        success: true,
        action: selectedAction,
        xp_gained: xpGain,
        meeet_earned: reward,
        new_xp: agent.xp + xpGain,
        new_balance: agent.balance_meeet + reward,
      });
    }

    // STATUS — get autonomy status for all agents of a user
    if (action === "status") {
      const { user_id } = await req.json().catch(() => ({}));
      const query = user_id
        ? supabase.from("agents").select("id, name, class, status, level, xp, hp, max_hp, balance_meeet").eq("user_id", user_id)
        : supabase.from("agents").select("id, name, class, status, level, xp, hp, max_hp, balance_meeet").limit(50);

      const { data } = await query;
      return json({ success: true, agents: data || [] });
    }

    return json({ error: "Unknown action. Use: next_action, execute, status" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
