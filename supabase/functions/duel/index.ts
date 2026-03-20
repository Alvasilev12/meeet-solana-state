import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Combat resolution: stat-weighted dice roll
function resolveCombat(
  challenger: { attack: number; defense: number; hp: number; level: number },
  defender: { attack: number; defense: number; hp: number; level: number }
) {
  // Each agent gets a power score + random roll
  const cPower = challenger.attack * 2 + challenger.defense + challenger.level * 3;
  const dPower = defender.attack * 2 + defender.defense + defender.level * 3;

  const cRoll = Math.floor(Math.random() * 100) + cPower;
  const dRoll = Math.floor(Math.random() * 100) + dPower;

  // Damage dealt (loser takes damage based on winner's attack)
  const cDamage = Math.max(5, Math.floor(defender.attack * 0.3 - challenger.defense * 0.1));
  const dDamage = Math.max(5, Math.floor(challenger.attack * 0.3 - defender.defense * 0.1));

  return {
    challengerWins: cRoll >= dRoll,
    challengerRoll: cRoll,
    defenderRoll: dRoll,
    challengerDamage: cDamage, // damage TO challenger
    defenderDamage: dDamage,   // damage TO defender
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { action, duel_id, challenger_agent_id, defender_agent_id, stake_meeet } = await req.json();

    // Rate limit based on action
    const rlKey = action === "challenge" ? "duel_challenge" : "duel_accept";
    const rl = RATE_LIMITS[rlKey as keyof typeof RATE_LIMITS] || RATE_LIMITS.duel_challenge;
    const { allowed } = await checkRateLimit(serviceClient, `duel:${user.id}:${action}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    switch (action) {
      // ── CHALLENGE ──────────────────────────────────────────
      case "challenge": {
        if (!challenger_agent_id || !defender_agent_id) 
          return json({ error: "Both agent IDs required" }, 400);
        if (challenger_agent_id === defender_agent_id)
          return json({ error: "Cannot duel yourself" }, 400);

        const stake = Number(stake_meeet) || 100;
        if (stake < 10) return json({ error: "Minimum stake is 10 $MEEET" }, 400);

        // Verify challenger belongs to user
        const { data: challenger } = await serviceClient
          .from("agents")
          .select("id, user_id, balance_meeet, status")
          .eq("id", challenger_agent_id)
          .single();
        if (!challenger || challenger.user_id !== user.id)
          return json({ error: "Not your agent" }, 403);
        if (challenger.status === "dead")
          return json({ error: "Dead agents cannot duel" }, 400);
        if (Number(challenger.balance_meeet) < stake)
          return json({ error: "Insufficient balance for stake" }, 400);

        // Verify defender exists and is alive
        const { data: defender } = await serviceClient
          .from("agents")
          .select("id, status")
          .eq("id", defender_agent_id)
          .single();
        if (!defender) return json({ error: "Defender not found" }, 404);
        if (defender.status === "dead")
          return json({ error: "Cannot challenge a dead agent" }, 400);

        // Escrow: deduct stake from challenger
        await serviceClient
          .from("agents")
          .update({ balance_meeet: Number(challenger.balance_meeet) - stake, status: "in_combat" })
          .eq("id", challenger_agent_id);

        const { data: duel, error: dErr } = await serviceClient
          .from("duels")
          .insert({
            challenger_agent_id,
            defender_agent_id,
            stake_meeet: stake,
            status: "pending",
          })
          .select("id")
          .single();

        if (dErr) return json({ error: dErr.message }, 500);
        return json({ success: true, duel_id: duel.id, status: "pending" });
      }

      // ── ACCEPT → auto-resolve ──────────────────────────────
      case "accept": {
        if (!duel_id) return json({ error: "duel_id required" }, 400);

        const { data: duel } = await serviceClient
          .from("duels")
          .select("*")
          .eq("id", duel_id)
          .single();
        if (!duel) return json({ error: "Duel not found" }, 404);
        if (duel.status !== "pending") return json({ error: "Duel is not pending" }, 400);

        // Verify defender belongs to user
        const { data: defAgent } = await serviceClient
          .from("agents")
          .select("id, user_id, balance_meeet, attack, defense, hp, level")
          .eq("id", duel.defender_agent_id)
          .single();
        if (!defAgent || defAgent.user_id !== user.id)
          return json({ error: "Not your agent" }, 403);

        const stake = Number(duel.stake_meeet);
        if (Number(defAgent.balance_meeet) < stake)
          return json({ error: "Insufficient balance for stake" }, 400);

        // Escrow: deduct stake from defender
        await serviceClient
          .from("agents")
          .update({ balance_meeet: Number(defAgent.balance_meeet) - stake, status: "in_combat" })
          .eq("id", duel.defender_agent_id);

        // Get challenger stats
        const { data: chalAgent } = await serviceClient
          .from("agents")
          .select("id, attack, defense, hp, level")
          .eq("id", duel.challenger_agent_id)
          .single();
        if (!chalAgent) return json({ error: "Challenger agent missing" }, 500);

        // Resolve combat
        const result = resolveCombat(chalAgent, defAgent);
        const winnerId = result.challengerWins ? duel.challenger_agent_id : duel.defender_agent_id;
        const loserId = result.challengerWins ? duel.defender_agent_id : duel.challenger_agent_id;
        const totalPot = stake * 2;

        // Process reward via process-transaction (handles tax)
        const txResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-transaction`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
              apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
              "x-internal-service": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(-16),
            },
            body: JSON.stringify({
              type: "duel_reward",
              to_agent_id: winnerId,
              from_agent_id: loserId,
              amount_meeet: totalPot,
              description: `Duel victory: ${totalPot} $MEEET pot`,
            }),
          }
        );
        const txResult = await txResponse.json();

        // Apply HP damage
        const loserDmg = result.challengerWins ? result.defenderDamage : result.challengerDamage;
        const winnerDmg = result.challengerWins ? result.challengerDamage : result.defenderDamage;

        // Update loser HP & kills for winner
        const { data: loserData } = await serviceClient
          .from("agents").select("hp").eq("id", loserId).single();
        const { data: winnerData } = await serviceClient
          .from("agents").select("hp, kills, xp").eq("id", winnerId).single();

        if (loserData) {
          const newHp = Math.max(0, loserData.hp - loserDmg);
          await serviceClient.from("agents")
            .update({ hp: newHp, status: newHp <= 0 ? "dead" : "idle" })
            .eq("id", loserId);
        }
        if (winnerData) {
          const newHp = Math.max(1, winnerData.hp - winnerDmg);
          await serviceClient.from("agents")
            .update({ hp: newHp, kills: winnerData.kills + 1, xp: winnerData.xp + 25, status: "idle" })
            .eq("id", winnerId);
        }

        // Update duel record
        await serviceClient.from("duels").update({
          status: "completed",
          winner_agent_id: winnerId,
          challenger_roll: result.challengerRoll,
          defender_roll: result.defenderRoll,
          challenger_damage: result.challengerDamage,
          defender_damage: result.defenderDamage,
          tax_amount: txResult.tax || 0,
          burn_amount: txResult.burned || 0,
          resolved_at: new Date().toISOString(),
        }).eq("id", duel_id);

        // Reputation
        await serviceClient.from("reputation_log").insert({
          agent_id: winnerId,
          delta: 5,
          reason: "Won a duel",
        });
        await serviceClient.from("reputation_log").insert({
          agent_id: loserId,
          delta: -3,
          reason: "Lost a duel",
        });

        // Activity feed entry
        const { data: winnerAgent } = await serviceClient
          .from("agents").select("name").eq("id", winnerId).single();
        const { data: loserAgent } = await serviceClient
          .from("agents").select("name").eq("id", loserId).single();
        await serviceClient.from("activity_feed").insert({
          agent_id: winnerId,
          target_agent_id: loserId,
          event_type: "duel_win",
          title: `${winnerAgent?.name || "Agent"} defeated ${loserAgent?.name || "Agent"} in a duel`,
          description: `Won ${totalPot.toLocaleString()} $MEEET (${txResult.tax || 0} tax, ${txResult.burned || 0} burned)`,
          meeet_amount: totalPot,
        });

        return json({
          success: true,
          winner: winnerId,
          loser: loserId,
          challenger_roll: result.challengerRoll,
          defender_roll: result.defenderRoll,
          pot: totalPot,
          tax: txResult.tax || 0,
          burned: txResult.burned || 0,
          net_reward: txResult.net_amount || totalPot,
        });
      }

      // ── CANCEL (only challenger, only pending) ─────────────
      case "cancel": {
        if (!duel_id) return json({ error: "duel_id required" }, 400);

        const { data: duel } = await serviceClient
          .from("duels").select("*").eq("id", duel_id).single();
        if (!duel) return json({ error: "Duel not found" }, 404);
        if (duel.status !== "pending") return json({ error: "Can only cancel pending duels" }, 400);

        const { data: chal } = await serviceClient
          .from("agents").select("id, user_id, balance_meeet").eq("id", duel.challenger_agent_id).single();
        if (!chal || chal.user_id !== user.id) return json({ error: "Not your duel" }, 403);

        // Refund stake
        await serviceClient.from("agents")
          .update({ balance_meeet: Number(chal.balance_meeet) + Number(duel.stake_meeet), status: "idle" })
          .eq("id", duel.challenger_agent_id);

        await serviceClient.from("duels")
          .update({ status: "cancelled" }).eq("id", duel_id);

        return json({ success: true, status: "cancelled" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
