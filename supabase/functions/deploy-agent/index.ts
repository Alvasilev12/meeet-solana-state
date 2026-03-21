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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from JWT
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { subscription_id, agent_name, agent_class, strategy } = body;

    if (!agent_name || !agent_class) {
      return json({ error: "Missing required fields: agent_name, agent_class" }, 400);
    }

    const validClasses = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
    if (!validClasses.includes(agent_class)) {
      return json({ error: `Invalid class. Must be one of: ${validClasses.join(", ")}` }, 400);
    }

    // Free deploy for first 5000 agents
    const { count: totalAgents } = await supabase.from("agents").select("id", { count: "exact", head: true });
    const FREE_LIMIT = 5000;
    const isFreeEligible = (totalAgents ?? 0) < FREE_LIMIT;

    // If no subscription and free promo active, allow free deploy
    if (!subscription_id && isFreeEligible) {
      // Free deploy — skip payment validation
    } else if (!subscription_id && !isFreeEligible) {
      return json({ error: "Free deployment ended. Purchase a plan to deploy agents." }, 403);
    }

    // If subscription_id provided, validate it (but skip agent limit if free eligible)
    if (subscription_id) {
      const { data: subscription, error: subError } = await supabase
        .from("agent_subscriptions")
        .select("id, plan_id, status, user_id")
        .eq("id", subscription_id)
        .single();

      if (subError || !subscription) return json({ error: "Subscription not found" }, 404);
      if (subscription.status !== "active") return json({ error: "Subscription is not active" }, 403);
      if (subscription.user_id !== user.id) return json({ error: "Not your subscription" }, 403);

      // Only enforce plan limits when free promo is over
      if (!isFreeEligible) {
        const { data: plan } = await supabase
          .from("agent_plans")
          .select("max_agents")
          .eq("id", subscription.plan_id)
          .single();

        if (plan) {
          const { count } = await supabase
            .from("deployed_agents")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "stopped");

          if ((count ?? 0) >= plan.max_agents && plan.max_agents > 0) {
            return json({ error: `Agent limit reached (${plan.max_agents})` }, 403);
          }
        }
      }
    }

    // Create agent in agents table
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: agent_name.trim(),
        class: agent_class,
        user_id: user.id,
        balance_meeet: isFreeEligible ? 50 : 0,
        xp: 0,
        level: 1,
        kills: 0,
        hp: 100,
        max_hp: 100,
        attack: 10,
        defense: 5,
        quests_completed: 0,
        territories_held: 0,
      })
      .select("id")
      .single();

    if (agentError) return json({ error: agentError.message }, 500);

    // Look up strategy if provided
    let strategyId = null;
    if (strategy) {
      const { data: strat } = await supabase
        .from("agent_strategies")
        .select("id")
        .ilike("name", `%${strategy}%`)
        .limit(1)
        .maybeSingle();
      strategyId = strat?.id ?? null;
    }

    // Create deployed_agents record
    const { data: deployed, error: deployError } = await supabase
      .from("deployed_agents")
      .insert({
        agent_id: agent.id,
        user_id: user.id,
        status: "running",
        strategy_id: strategyId,
        plan_id: subscription_id ? undefined : null,
      })
      .select("id")
      .single();

    if (deployError) return json({ error: deployError.message }, 500);

    // Send Telegram notification (fire-and-forget)
    try {
      const notifyUrl = `${supabaseUrl}/functions/v1/send-telegram-notification`;
      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          event_type: "agent_deployed",
          user_id: user.id,
          agent_name: agent_name.trim(),
          plan_name: subscription_id ? "Subscription" : "Free",
        }),
      });
    } catch (e) {
      console.error("Telegram notification failed:", e);
    }

    return json({
      agent_id: agent.id,
      deployed_agent_id: deployed.id,
      status: "running",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
