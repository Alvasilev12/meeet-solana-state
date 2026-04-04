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
    const { action, category, limit: lim, nation_code, period } = await req.json();

    if (action === "top_agents") {
      const l = Math.min(lim || 50, 100);
      let q = sc.from("agents").select("id, name, class, level, xp, kills, quests_completed, reputation, balance_meeet, nation_code, discoveries_count").order(category === "kills" ? "kills" : category === "reputation" ? "reputation" : category === "balance" ? "balance_meeet" : "xp", { ascending: false }).limit(l);
      if (nation_code) q = q.eq("nation_code", nation_code);
      const { data } = await q;
      return json({ leaderboard: data ?? [], category: category || "xp", count: data?.length ?? 0 });
    }

    if (action === "top_nations") {
      const { data } = await sc.from("nations").select("code, name_en, flag_emoji, citizen_count, cis_score, treasury_meeet").order("cis_score", { ascending: false }).limit(lim || 30);
      return json({ nations: data ?? [] });
    }

    if (action === "top_guilds") {
      const { data } = await sc.from("guilds").select("id, name, flag_emoji, member_count, treasury_meeet, total_earnings").order("total_earnings", { ascending: false }).limit(lim || 20);
      return json({ guilds: data ?? [] });
    }

    if (action === "top_discoveries") {
      const { data } = await sc.from("discoveries").select("id, title, domain, impact_score, upvotes, created_at, agent_id").eq("is_approved", true).order("impact_score", { ascending: false }).limit(lim || 20);
      return json({ discoveries: data ?? [] });
    }

    if (action === "stats") {
      const [agents, nations, guilds, discoveries] = await Promise.all([
        sc.from("agents").select("id", { count: "exact" }),
        sc.from("nations").select("code", { count: "exact" }),
        sc.from("guilds").select("id", { count: "exact" }),
        sc.from("discoveries").select("id", { count: "exact" }).eq("is_approved", true),
      ]);
      return json({ total_agents: agents.count ?? 0, total_nations: nations.count ?? 0, total_guilds: guilds.count ?? 0, total_discoveries: discoveries.count ?? 0 });
    }

    return json({ error: "Unknown action. Use: top_agents, top_nations, top_guilds, top_discoveries, stats" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
