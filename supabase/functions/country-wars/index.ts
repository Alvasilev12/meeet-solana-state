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
    const { action, nation_code, target_nation, agent_id } = await req.json();

    if (action === "declare") {
      if (!nation_code || !target_nation) return json({ error: "nation_code and target_nation required" }, 400);
      const [{ data: attacker }, { data: defender }] = await Promise.all([
        sc.from("nations").select("code, name_en, citizen_count, cis_score, treasury_meeet").eq("code", nation_code).single(),
        sc.from("nations").select("code, name_en, citizen_count, cis_score, treasury_meeet").eq("code", target_nation).single(),
      ]);
      if (!attacker || !defender) return json({ error: "Nation not found" }, 404);

      return json({
        status: "war_declared", attacker: attacker.name_en, defender: defender.name_en,
        power_balance: { attacker: attacker.cis_score, defender: defender.cis_score },
        message: `${attacker.name_en} declared war on ${defender.name_en}!`,
      });
    }

    if (action === "scores") {
      // Calculate real scores based on discoveries + arena wins per nation
      const { data: nations } = await sc.from("nations").select("code, name_en, citizen_count, cis_score, treasury_meeet, flag_emoji")
        .in("code", ["USA", "CHN", "DEU", "JPN", "GBR"])
        .order("cis_score", { ascending: false });

      if (!nations) return json({ nations: [], scores: [] });

      const scores = await Promise.all(nations.map(async (n) => {
        // Count discoveries by agents in this nation
        const { data: citizenIds } = await sc.from("nation_citizenships")
          .select("agent_id").eq("nation_code", n.code);
        const ids = (citizenIds || []).map(c => c.agent_id);

        let disc_count = 0, arena_wins = 0, total_rep = 0;
        if (ids.length > 0) {
          const { count: dc } = await sc.from("discoveries").select("id", { count: "exact", head: true })
            .in("agent_id", ids);
          disc_count = dc ?? 0;

          const { count: aw } = await sc.from("duels").select("id", { count: "exact", head: true })
            .eq("status", "completed").in("winner_agent_id", ids);
          arena_wins = aw ?? 0;

          // Sum reputation
          const { data: agents } = await sc.from("agents").select("reputation").in("id", ids);
          total_rep = (agents || []).reduce((s, a) => s + (a.reputation || 0), 0);
        }

        const score = disc_count * 100 + arena_wins * 50 + total_rep;
        return {
          ...n,
          discoveries: disc_count,
          arena_wins,
          total_reputation: total_rep,
          war_score: score,
          citizens: ids.length,
        };
      }));

      scores.sort((a, b) => b.war_score - a.war_score);

      // Update CIS scores
      for (const s of scores) {
        await sc.from("nations").update({
          cis_score: s.war_score / Math.max(1, s.citizens),
          citizen_count: s.citizens,
        }).eq("code", s.code);
      }

      return json({ nations: scores, active_conflicts: 0 });
    }

    if (action === "status") {
      const { data: nations } = await sc.from("nations").select("code, name_en, citizen_count, cis_score, treasury_meeet, flag_emoji")
        .order("cis_score", { ascending: false }).limit(20);
      return json({ nations: nations ?? [], active_conflicts: 0 });
    }

    if (action === "enlist") {
      if (!agent_id || !nation_code) return json({ error: "agent_id and nation_code required" }, 400);
      return json({ status: "enlisted", agent_id, nation: nation_code, message: "Agent enlisted for war effort" });
    }

    return json({ error: "Unknown action. Use: declare, status, scores, enlist" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
