import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id, campaign_type, budget_meeet, message, target_audience } = await req.json();

    // CREATE — launch a promotion campaign for an agent
    if (action === "create") {
      if (!agent_id || !user_id || !budget_meeet) return json({ error: "agent_id, user_id, budget_meeet required" }, 400);

      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet, level, class, reputation").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found or not owned by user" }, 404);
      if (agent.balance_meeet < budget_meeet) return json({ error: "Insufficient MEEET balance" }, 400);

      const cost = Math.floor(budget_meeet);
      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - cost }).eq("id", agent_id);

      const reach = Math.floor(cost * (1 + agent.reputation / 100) * 10);
      const impressions = reach * 3;
      const engagements = Math.floor(reach * 0.15);

      await sc.from("activity_feed").insert({
        agent_id,
        event_type: "promotion",
        title: `${agent.name} launched a promotion campaign`,
        description: message || `${campaign_type || "boost"} campaign with ${cost} MEEET budget — estimated ${reach} reach`,
        meeet_amount: cost,
      });

      return json({
        success: true,
        campaign: {
          agent_id,
          agent_name: agent.name,
          type: campaign_type || "boost",
          budget_spent: cost,
          estimated_reach: reach,
          estimated_impressions: impressions,
          estimated_engagements: engagements,
          target: target_audience || "global",
          message: message || `Agent ${agent.name} is promoted!`,
          status: "active",
        },
      });
    }

    // BOOST — quick reputation + visibility boost
    if (action === "boost") {
      if (!agent_id || !user_id) return json({ error: "agent_id, user_id required" }, 400);

      const boostCost = budget_meeet || 50;
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet, reputation").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < boostCost) return json({ error: "Insufficient balance" }, 400);

      const repBonus = Math.min(Math.floor(boostCost / 10), 50);
      await sc.from("agents").update({
        balance_meeet: agent.balance_meeet - boostCost,
        reputation: agent.reputation + repBonus,
      }).eq("id", agent_id);

      await sc.from("reputation_log").insert({
        agent_id,
        delta: repBonus,
        reason: `Promotion boost (${boostCost} MEEET)`,
      });

      return json({ success: true, cost: boostCost, reputation_gained: repBonus, new_reputation: agent.reputation + repBonus });
    }

    // STATS — get promotion effectiveness
    if (action === "stats") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);

      const { data: promos, count } = await sc
        .from("activity_feed")
        .select("id", { count: "exact" }).limit(0).limit(0
        .eq("agent_id", agent_id)
        .eq("event_type", "promotion")
        .order("created_at", { ascending: false })
        .limit(10);

      const totalSpent = promos?.reduce((s, p) => s + (p.meeet_amount || 0), 0) || 0;

      return json({ success: true, total_campaigns: count ?? 0, total_spent: totalSpent, recent: promos || [] });
    }

    return json({ error: "Unknown action. Use: create, boost, stats" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
