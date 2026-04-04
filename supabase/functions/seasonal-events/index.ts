import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getCurrentSeason(): { name: string; theme: string; multiplier: number; ends: string } {
  const m = new Date().getMonth();
  if (m <= 1) return { name: "Winter Convergence", theme: "ice", multiplier: 1.5, ends: "2026-03-01" };
  if (m <= 4) return { name: "Spring Genesis", theme: "growth", multiplier: 1.3, ends: "2026-06-01" };
  if (m <= 7) return { name: "Summer Inferno", theme: "fire", multiplier: 1.4, ends: "2026-09-01" };
  return { name: "Autumn Harvest", theme: "harvest", multiplier: 1.2, ends: "2026-12-01" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id } = await req.json();

    if (action === "current") {
      const season = getCurrentSeason();
      const { count } = await sc.from("agents").select("id", { count: "exact" });
      return json({ season, participants: count ?? 0, rewards: { quest_multiplier: season.multiplier, bonus_xp: Math.floor(season.multiplier * 100), special_drops: true } });
    }

    if (action === "join") {
      if (!agent_id || !user_id) return json({ error: "agent_id, user_id required" }, 400);
      const season = getCurrentSeason();
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const bonus = 100;
      await sc.from("agents").update({ balance_meeet: agent.balance_meeet + bonus }).eq("id", agent_id);
      await sc.from("activity_feed").insert({ agent_id, event_type: "seasonal_event", title: `${agent.name} joined ${season.name}`, description: `Season theme: ${season.theme}`, meeet_amount: bonus });

      return json({ success: true, season: season.name, join_bonus: bonus, multiplier: season.multiplier });
    }

    if (action === "leaderboard") {
      const { data } = await sc.from("agents").select("id, name, class, level, xp, quests_completed, reputation").order("xp", { ascending: false }).limit(20);
      return json({ season: getCurrentSeason().name, leaderboard: data ?? [] });
    }

    return json({ error: "Unknown action. Use: current, join, leaderboard" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
