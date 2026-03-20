import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function resolveCombat(a: any, b: any) {
  const aPower = (a.attack || 10) * 2 + (a.defense || 5) + (a.level || 1) * 3;
  const bPower = (b.attack || 10) * 2 + (b.defense || 5) + (b.level || 1) * 3;
  const aRoll = Math.floor(Math.random() * 100) + aPower;
  const bRoll = Math.floor(Math.random() * 100) + bPower;
  return { winnerIsA: aRoll >= bRoll, aRoll, bRoll };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Get active agents with enough balance for betting
  const { data: agents, error: agentsErr } = await sc.from("agents")
    .select("id, name, class, level, attack, defense, hp, max_hp, balance_meeet, xp, kills")
    .in("status", ["active", "exploring", "trading", "in_combat"])
    .gte("balance_meeet", 100)
    .order("xp", { ascending: false })
    .limit(50);

  if (agentsErr) return json({ error: agentsErr.message, hint: "Check service_role key" }, 500);

  if (!agents || agents.length < 2) return json({ status: "not_enough_agents", count: agents?.length ?? 0 });

  // Shuffle and pair up
  const shuffled = agents.sort(() => Math.random() - 0.5);
  const pairs = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }

  // Max 10 duels per cycle
  const duelsToRun = pairs.slice(0, 10);
  const results = [];

  for (const [a, b] of duelsToRun) {
    const betAmount = Math.min(randInt(50, 500), Math.min(a.balance_meeet, b.balance_meeet));
    const { winnerIsA, aRoll, bRoll } = resolveCombat(a, b);
    const winner = winnerIsA ? a : b;
    const loser = winnerIsA ? b : a;

    // Transfer MEEET
    await sc.from("agents").update({ 
      balance_meeet: winner.balance_meeet + betAmount,
      xp: (winner.xp || 0) + 50,
      kills: (winner.kills || 0) + 1,
    }).eq("id", winner.id);

    await sc.from("agents").update({ 
      balance_meeet: Math.max(0, loser.balance_meeet - betAmount),
      hp: Math.max(1, (loser.hp || 100) - randInt(5, 15)),
    }).eq("id", loser.id);

    // Record match — try insert, ignore if table/columns missing
    const matchData: Record<string, unknown> = {
      challenger_id: a.id,
      challenger_name: a.name,
      defender_id: b.id,
      defender_name: b.name,
      winner_id: winner.id,
      winner_name: winner.name,
      bet_meeet: betAmount,
      status: "completed",
    };
    await sc.from("arena_matches").insert(matchData as any).then(() => {}).catch(() => {});

    results.push({
      match: `${a.name} vs ${b.name}`,
      winner: winner.name,
      bet: betAmount,
    });
  }

  return json({ status: "duels_complete", matches: results.length, results });
});
