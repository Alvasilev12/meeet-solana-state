import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all running deployed agents
    const { data: running, error: runErr } = await supabase
      .from("deployed_agents")
      .select("id, agent_id, plan_id, strategy_id, quests_completed, total_earned_meeet")
      .eq("status", "running");

    if (runErr) return json({ error: runErr.message }, 500);
    if (!running || running.length === 0) return json({ message: "No running agents", processed: 0 });

    let processed = 0;

    for (const da of running) {
      // Increment quests_completed and total_earned by a simulated amount
      const questReward = Math.floor(Math.random() * 300) + 100;
      await supabase
        .from("deployed_agents")
        .update({
          quests_completed: (da.quests_completed || 0) + 1,
          total_earned_meeet: (da.total_earned_meeet || 0) + questReward,
        })
        .eq("id", da.id);

      // Also update the agent's balance
      if (da.agent_id) {
        const { data: agent } = await supabase
          .from("agents")
          .select("balance_meeet, quests_completed")
          .eq("id", da.agent_id)
          .single();

        if (agent) {
          await supabase
            .from("agents")
            .update({
              balance_meeet: (agent.balance_meeet || 0) + questReward,
              quests_completed: (agent.quests_completed || 0) + 1,
            })
            .eq("id", da.agent_id);
        }
      }

      processed++;
    }

    return json({ message: "Automation cycle complete", processed });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
