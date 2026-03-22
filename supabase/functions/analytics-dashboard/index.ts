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
    const { action, user_id, period } = await req.json();

    if (action === "overview") {
      const [agents, quests, discoveries, duels, nations] = await Promise.all([
        sc.from("agents").select("id", { count: "exact", head: true }),
        sc.from("quests").select("id", { count: "exact", head: true }),
        sc.from("discoveries").select("id", { count: "exact", head: true }),
        sc.from("duels").select("id", { count: "exact", head: true }),
        sc.from("nations").select("id", { count: "exact", head: true }),
      ]);
      return json({
        total_agents: agents.count ?? 0,
        total_quests: quests.count ?? 0,
        total_discoveries: discoveries.count ?? 0,
        total_duels: duels.count ?? 0,
        total_nations: nations.count ?? 0,
      });
    }

    if (action === "user_stats") {
      if (!user_id) return json({ error: "user_id required" }, 400);
      const [agentsRes, earningsRes, loginsRes] = await Promise.all([
        sc.from("agents").select("id, name, class, level, xp, balance_meeet, quests_completed, reputation").eq("user_id", user_id),
        sc.from("agent_earnings").select("amount_meeet, source").eq("user_id", user_id),
        sc.from("daily_logins").select("login_date, streak_count, bonus_meeet").eq("user_id", user_id).order("login_date", { ascending: false }).limit(30),
      ]);

      const totalEarned = (earningsRes.data ?? []).reduce((s, e) => s + (e.amount_meeet || 0), 0);
      return json({
        agents: agentsRes.data ?? [],
        total_earned_meeet: totalEarned,
        recent_logins: loginsRes.data ?? [],
        earnings_by_source: (earningsRes.data ?? []).reduce((acc: Record<string, number>, e) => {
          acc[e.source] = (acc[e.source] || 0) + (e.amount_meeet || 0);
          return acc;
        }, {}),
      });
    }

    if (action === "top_performers") {
      const limit = 10;
      const [topAgents, topNations] = await Promise.all([
        sc.from("agents").select("id, name, class, level, reputation, balance_meeet").order("reputation", { ascending: false }).limit(limit),
        sc.from("nations").select("code, name_en, flag_emoji, cis_score, citizen_count, treasury_meeet").order("cis_score", { ascending: false }).limit(limit),
      ]);
      return json({ top_agents: topAgents.data ?? [], top_nations: topNations.data ?? [] });
    }

    if (action === "activity_feed") {
      const { data } = await sc.from("activity_feed")
        .select("id, event_type, title, description, meeet_amount, created_at, agent_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ feed: data ?? [] });
    }

    return json({ error: "Unknown action. Use: overview, user_stats, top_performers, activity_feed" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
