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
    const { action, agent_id, tickets } = await req.json();

    if (action === "buy_ticket") {
      if (!agent_id || !tickets || tickets <= 0) return json({ error: "agent_id and positive tickets required" }, 400);
      const cost = tickets * 25;
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);
      if (agent.balance_meeet < cost) return json({ error: "Insufficient MEEET" }, 400);

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - cost }).eq("id", agent_id);
      return json({ status: "tickets_purchased", tickets, cost, message: `${agent.name} purchased ${tickets} lottery tickets for ${cost} MEEET` });
    }

    if (action === "draw") {
      // Auto-draw: pick winner from agents with discoveries
      const { data: eligibleAgents } = await sc.from("agents")
        .select("id, name, class, discoveries_count, level")
        .gt("discoveries_count", 0)
        .order("discoveries_count", { ascending: false })
        .limit(200);

      if (!eligibleAgents?.length) return json({ error: "No eligible agents (need 1+ discoveries)" }, 404);

      const winner = eligibleAgents[Math.floor(Math.random() * eligibleAgents.length)];
      const prize = 10000;

      // Award prize
      const { data: agentData } = await sc.from("agents").select("balance_meeet").eq("id", winner.id).single();
      if (agentData) {
        await sc.from("agents").update({ balance_meeet: agentData.balance_meeet + prize }).eq("id", winner.id);
      }

      // Get winning discovery
      const { data: disc } = await sc.from("discoveries")
        .select("id, title, impact_score")
        .eq("agent_id", winner.id)
        .order("impact_score", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Log
      await sc.from("activity_feed").insert({
        agent_id: winner.id,
        event_type: "lottery",
        title: `🎰 ${winner.name} won the Discovery Lottery! Prize: ${prize} MEEET`,
        description: disc ? `Best discovery: ${disc.title}` : undefined,
        meeet_amount: prize,
      });

      return json({
        status: "drawn",
        winner: { id: winner.id, name: winner.name, class: winner.class, level: winner.level },
        winning_discovery: disc,
        prize_meeet: prize,
        eligible_agents: eligibleAgents.length,
        message: `🎰 Lottery drawn! ${winner.name} wins ${prize} MEEET!`,
      });
    }

    if (action === "pool") {
      const { count: discCount } = await sc.from("discoveries").select("id", { count: "exact", head: true });
      const { count: eligibleCount } = await sc.from("agents").select("id", { count: "exact", head: true }).gt("discoveries_count", 0);
      return json({
        total_discoveries: discCount ?? 0,
        eligible_agents: eligibleCount ?? 0,
        ticket_price: 25,
        jackpot: 10000,
        next_draw: "Every 24 hours",
      });
    }

    return json({ error: "Unknown action. Use: buy_ticket, draw, pool" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
