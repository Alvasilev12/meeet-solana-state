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
    const { action, agent_id, amount, duration_days } = await req.json();

    if (action === "stake") {
      if (!agent_id || !amount || amount <= 0) return json({ error: "agent_id and positive amount required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, balance_meeet, level, name").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < amount) return json({ error: "Insufficient balance" }, 400);

      const days = duration_days || 7;
      const apr = days >= 30 ? 0.15 : days >= 14 ? 0.10 : 0.05;
      const reward = Math.floor(amount * apr * (days / 365));

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - amount }).eq("id", agent_id);

      // Log staking activity
      await sc.from("activity_feed").insert({
        agent_id,
        event_type: "staking",
        title: `${agent.name} staked ${amount} MEEET for ${days} days`,
        meeet_amount: amount,
      });

      return json({
        status: "staked", amount, duration_days: days,
        apr_pct: apr * 100, estimated_reward: reward,
        message: `Staked ${amount} MEEET for ${days} days at ${apr * 100}% APR`,
      });
    }

    if (action === "calculate_rewards") {
      // Calculate daily staking rewards for all agents based on level
      // reward = staked_amount * (agent_level / 100) * 0.001 per day
      const { data: agents } = await sc.from("agents").select("id, name, level, balance_meeet")
        .gt("level", 1).order("level", { ascending: false }).limit(500);

      if (!agents?.length) return json({ message: "No eligible agents", rewarded: 0 });

      let totalRewarded = 0;
      const rewards: { id: string; name: string; reward: number }[] = [];
      const batchSize = 20;

      for (let i = 0; i < agents.length; i += batchSize) {
        const batch = agents.slice(i, i + batchSize);
        await Promise.all(batch.map(async (agent) => {
          const dailyReward = Math.floor(agent.balance_meeet * (agent.level / 100) * 0.001);
          if (dailyReward > 0 && dailyReward <= 1000) {
            await sc.from("agents").update({
              balance_meeet: agent.balance_meeet + dailyReward
            }).eq("id", agent.id);
            totalRewarded += dailyReward;
            rewards.push({ id: agent.id, name: agent.name, reward: dailyReward });
          }
        }));
      }

      return json({
        status: "rewards_calculated",
        agents_rewarded: rewards.length,
        total_distributed: totalRewarded,
        top_rewards: rewards.sort((a, b) => b.reward - a.reward).slice(0, 10),
      });
    }

    if (action === "rewards") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, level, balance_meeet").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const dailyRate = Math.floor(agent.balance_meeet * (agent.level / 100) * 0.001);
      return json({
        agent_id, agent_name: agent.name,
        daily_reward: dailyRate,
        weekly_estimate: dailyRate * 7,
        monthly_estimate: dailyRate * 30,
        balance: agent.balance_meeet,
        level: agent.level,
      });
    }

    if (action === "unstake") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      return json({ status: "unstaked", message: "No active stakes found for this agent" });
    }

    return json({ error: "Unknown action. Use: stake, unstake, rewards, calculate_rewards" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
