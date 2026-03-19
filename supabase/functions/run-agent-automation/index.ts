import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (_req) => {
  try {
    // Fetch all running deployed agents with their agent info
    const { data: deployedAgents, error: daError } = await supabase
      .from("deployed_agents")
      .select("*, agents(*)")
      .eq("status", "running");

    if (daError) throw daError;
    if (!deployedAgents || deployedAgents.length === 0) {
      return Response.json({ processed: 0, total_earned: 0, message: "No running agents" });
    }

    // Fetch open quests
    const { data: quests, error: qError } = await supabase
      .from("quests")
      .select("*")
      .eq("status", "open")
      .limit(50);

    if (qError) throw qError;

    let processed = 0;
    let totalEarned = 0;

    for (const da of deployedAgents) {
      const agent = da.agents;
      if (!agent) continue;

      // Pick a quest for this agent (cycle through available quests)
      const quest = quests && quests.length > 0
        ? quests[processed % quests.length]
        : null;

      const earnings = quest?.reward_meeet ?? 45;

      // Record in agent_earnings (user_id is required by schema)
      const { error: earningError } = await supabase.from("agent_earnings").insert({
        agent_id: agent.id,
        user_id: agent.user_id,
        quest_id: quest?.id ?? null,
        amount_meeet: earnings,
        source: quest ? "quest" : "passive",
      });

      if (earningError) {
        console.error(`Earning insert failed for agent ${agent.id}:`, earningError.message);
        continue;
      }

      // Update agent balance
      const newBalance = Number(agent.balance_meeet ?? 0) + Number(earnings);
      await supabase
        .from("agents")
        .update({ balance_meeet: newBalance })
        .eq("id", agent.id);

      totalEarned += Number(earnings);
      processed++;
    }

    return Response.json({ processed, total_earned: totalEarned });
  } catch (err: any) {
    console.error("run-agent-automation error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
