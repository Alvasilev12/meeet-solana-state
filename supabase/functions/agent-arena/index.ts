import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, arena_type } = await req.json();

    if (action === "join") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, level, attack, defense, hp, class, balance_meeet").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const type = arena_type || "ranked";
      const entryFee = type === "tournament" ? 200 : type === "ranked" ? 50 : 0;
      if (agent.balance_meeet < entryFee) return json({ error: `Need ${entryFee} MEEET entry fee` }, 400);

      // Find a random opponent
      const { data: opponents } = await sc.from("agents").select("id, name, level, attack, defense, hp, class")
        .neq("id", agent_id).gte("level", Math.max(1, agent.level - 3)).lte("level", agent.level + 3)
        .limit(10);

      if (!opponents?.length) return json({ error: "No opponents available at your level" }, 404);
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];

      // Simulate battle
      const challengerRoll = randInt(1, 20) + Math.floor(agent.attack / 2);
      const defenderRoll = randInt(1, 20) + Math.floor(opponent.attack / 2);
      const winner = challengerRoll >= defenderRoll ? agent : opponent;
      const stake = entryFee * 2 || 100;

      // Deduct entry fee and log burn (20% burned)
      if (entryFee > 0) {
        const burnAmount = Math.floor(entryFee * 0.2);
        await sc.from("agents").update({ balance_meeet: agent.balance_meeet - entryFee }).eq("id", agent_id);
        await sc.from("burn_log").insert({ amount: burnAmount, reason: "arena_fee", agent_id });
      }

      // Create duel record
      const { data: duel } = await sc.from("duels").insert({
        challenger_agent_id: agent.id,
        defender_agent_id: opponent.id,
        stake_meeet: stake,
        status: "completed",
        winner_agent_id: winner.id,
        challenger_roll: challengerRoll,
        defender_roll: defenderRoll,
        challenger_damage: randInt(5, 25),
        defender_damage: randInt(5, 25),
        tax_amount: Math.floor(stake * 0.05),
        burn_amount: Math.floor(stake * 0.02),
        resolved_at: new Date().toISOString(),
      }).select("id").single();

      // Award winner
      if (winner.id === agent.id) {
        await sc.from("agents").update({
          kills: (agent as any).kills ? (agent as any).kills + 1 : 1,
          balance_meeet: (agent.balance_meeet - entryFee) + Math.floor(stake * 0.93),
        }).eq("id", agent.id);
      }

      // Activity feed
      await sc.from("activity_feed").insert({
        agent_id: winner.id,
        target_agent_id: winner.id === agent.id ? opponent.id : agent.id,
        event_type: "duel",
        title: `${winner.name} defeated ${winner.id === agent.id ? opponent.name : agent.name} in ${type} arena!`,
        description: `Rolls: ${challengerRoll} vs ${defenderRoll}. Stake: ${stake} MEEET`,
        meeet_amount: stake,
      });

      return json({
        status: "match_complete",
        duel_id: duel?.id,
        winner: { id: winner.id, name: winner.name, class: winner.class },
        challenger: { name: agent.name, roll: challengerRoll },
        defender: { name: opponent.name, roll: defenderRoll },
        stake,
        message: `${winner.name} wins! Roll ${challengerRoll} vs ${defenderRoll}`,
      });
    }

    if (action === "leaderboard") {
      const { data: top } = await sc.from("agents").select("id, name, kills, level, class, reputation, discoveries_count")
        .order("kills", { ascending: false }).limit(50);
      return json({ leaderboard: top ?? [], arena_type: arena_type || "ranked" });
    }

    if (action === "seasons") {
      return json({
        current_season: 1, started: "2026-03-01", ends: "2026-06-01",
        rewards: { first: 10000, second: 5000, third: 2500 },
        total_matches: await sc.from("duels").select("id", { count: "exact", head: true }).then(r => r.count ?? 0),
      });
    }

    return json({ error: "Unknown action. Use: join, leaderboard, seasons" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
