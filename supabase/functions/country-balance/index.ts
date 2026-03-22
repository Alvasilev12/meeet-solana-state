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
    const { action, nation_code } = await req.json();

    if (action === "balance") {
      if (!nation_code) return json({ error: "nation_code required" }, 400);

      const { data: nation } = await sc.from("nations").select("*").eq("code", nation_code).single();
      if (!nation) return json({ error: "Nation not found" }, 404);

      const { data: citizens } = await sc.from("agents").select("id, balance_meeet, level, xp, reputation").eq("nation_code", nation_code);
      const agentList = citizens ?? [];

      const totalMeeet = agentList.reduce((s, a) => s + a.balance_meeet, 0);
      const avgLevel = agentList.length ? agentList.reduce((s, a) => s + a.level, 0) / agentList.length : 0;
      const avgRep = agentList.length ? agentList.reduce((s, a) => s + a.reputation, 0) / agentList.length : 0;

      return json({
        nation_code,
        name: nation.name_en,
        flag: nation.flag_emoji,
        treasury_meeet: nation.treasury_meeet,
        citizen_count: agentList.length,
        total_citizen_meeet: totalMeeet,
        combined_meeet: nation.treasury_meeet + totalMeeet,
        avg_level: Math.round(avgLevel * 10) / 10,
        avg_reputation: Math.round(avgRep * 10) / 10,
        cis_score: nation.cis_score,
      });
    }

    if (action === "rankings") {
      const { data: nations } = await sc.from("nations")
        .select("code, name_en, flag_emoji, treasury_meeet, citizen_count, cis_score")
        .order("treasury_meeet", { ascending: false })
        .limit(20);
      return json({ rankings: nations ?? [] });
    }

    if (action === "distribute") {
      if (!nation_code) return json({ error: "nation_code required" }, 400);
      const { amount, reason } = await req.json();
      if (!amount || amount <= 0) return json({ error: "Positive amount required" }, 400);

      const { data: nation } = await sc.from("nations").select("treasury_meeet").eq("code", nation_code).single();
      if (!nation || nation.treasury_meeet < amount) return json({ error: "Insufficient treasury" }, 400);

      const { data: citizens } = await sc.from("agents").select("id, balance_meeet").eq("nation_code", nation_code);
      if (!citizens?.length) return json({ error: "No citizens to distribute to" }, 400);

      const perAgent = Math.floor(amount / citizens.length);
      if (perAgent <= 0) return json({ error: "Amount too small for distribution" }, 400);

      const actualTotal = perAgent * citizens.length;
      await sc.from("nations").update({ treasury_meeet: nation.treasury_meeet - actualTotal }).eq("code", nation_code);

      for (const c of citizens) {
        await sc.from("agents").update({ balance_meeet: c.balance_meeet + perAgent }).eq("id", c.id);
      }

      return json({
        status: "distributed",
        total: actualTotal,
        per_agent: perAgent,
        recipients: citizens.length,
        reason: reason || "treasury_distribution",
      });
    }

    return json({ error: "Unknown action. Use: balance, rankings, distribute" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
