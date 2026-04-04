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
    const { action, duel_id } = await req.json();

    if (action === "judge") {
      if (!duel_id) return json({ error: "duel_id required" }, 400);

      const { data: duel } = await sc.from("duels").select("*").eq("id", duel_id).eq("status", "pending").single();
      if (!duel) return json({ error: "Duel not found or already resolved" }, 404);

      const [{ data: challenger }, { data: defender }] = await Promise.all([
        sc.from("agents").select("id, name, attack, defense, hp, level, balance_meeet").eq("id", duel.challenger_agent_id).single(),
        sc.from("agents").select("id, name, attack, defense, hp, level, balance_meeet").eq("id", duel.defender_agent_id).single(),
      ]);

      if (!challenger || !defender) return json({ error: "Combatant not found" }, 404);

      const cRoll = Math.floor(Math.random() * 20) + 1 + challenger.attack;
      const dRoll = Math.floor(Math.random() * 20) + 1 + defender.attack;
      const cDmg = Math.max(1, cRoll - defender.defense);
      const dDmg = Math.max(1, dRoll - challenger.defense);

      const winnerId = cRoll >= dRoll ? challenger.id : defender.id;
      const loserId = winnerId === challenger.id ? defender.id : challenger.id;
      const stake = duel.stake_meeet || 0;
      const tax = Math.floor(stake * 0.05);
      const burn = Math.floor(stake * 0.02);
      const payout = stake * 2 - tax - burn;

      await sc.from("duels").update({
        status: "resolved",
        winner_agent_id: winnerId,
        challenger_roll: cRoll,
        defender_roll: dRoll,
        challenger_damage: cDmg,
        defender_damage: dDmg,
        tax_amount: tax,
        burn_amount: burn,
        resolved_at: new Date().toISOString(),
      }).eq("id", duel_id);

      // Winner gets payout
      const { data: winner } = await sc.from("agents").select("balance_meeet, kills, xp, reputation").eq("id", winnerId).single();
      if (winner) {
        await sc.from("agents").update({
          balance_meeet: winner.balance_meeet + payout,
          kills: winner.kills + 1,
          xp: winner.xp + 50,
          reputation: winner.reputation + 3,
        }).eq("id", winnerId);
      }

      await sc.from("activity_feed").insert({
        event_type: "duel_resolved",
        title: `${challenger.name} vs ${defender.name} — Winner: ${winnerId === challenger.id ? challenger.name : defender.name}`,
        agent_id: winnerId,
        target_agent_id: loserId,
        meeet_amount: payout,
      });

      return json({
        status: "judged",
        winner: winnerId === challenger.id ? challenger.name : defender.name,
        rolls: { challenger: cRoll, defender: dRoll },
        damage: { challenger: cDmg, defender: dDmg },
        payout, tax, burn,
      });
    }

    if (action === "pending_duels") {
      const { data } = await sc.from("duels")
        .select("id, challenger_agent_id, defender_agent_id, stake_meeet, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(20);
      return json({ pending: data ?? [] });
    }

    if (action === "stats") {
      const { data: resolved } = await sc.from("duels").select("id", { count: "exact" }).eq("status", "resolved");
      const { data: pending } = await sc.from("duels").select("id", { count: "exact" }).eq("status", "pending");
      return json({ resolved: resolved?.count ?? 0, pending: pending?.count ?? 0 });
    }

    return json({ error: "Unknown action. Use: judge, pending_duels, stats" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
