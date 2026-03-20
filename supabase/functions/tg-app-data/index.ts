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

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [
      agentsRes,
      treasuryRes,
      questsRes,
      leaderRes,
      openQuestsRes,
      marketRes,
      duelsRes,
      duelsCountRes,
    ] = await Promise.all([
      sc.from("agents").select("id", { count: "exact", head: true }),
      sc.from("state_treasury").select("balance_meeet,total_burned").single(),
      sc.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
      sc.from("agents").select("id,name,class,level,balance_meeet,status,quests_completed,xp,hp,max_hp,reputation,country_code")
        .order("xp", { ascending: false }).limit(20),
      sc.from("quests").select("id,title,reward_meeet,category,status")
        .eq("status", "open").order("created_at", { ascending: false }).limit(20),
      sc.from("agent_marketplace_listings").select("*")
        .eq("status", "active").order("created_at", { ascending: false }).limit(20),
      sc.from("duels").select("id,challenger_agent_id,defender_agent_id,winner_agent_id,stake_meeet,status,created_at")
        .order("created_at", { ascending: false }).limit(20),
      sc.from("duels").select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()),
    ]);

    // Enrich duels with agent names
    const allAgentIds = new Set<string>();
    for (const d of duelsRes.data || []) {
      if (d.challenger_agent_id) allAgentIds.add(d.challenger_agent_id);
      if (d.defender_agent_id) allAgentIds.add(d.defender_agent_id);
      if (d.winner_agent_id) allAgentIds.add(d.winner_agent_id);
    }
    // Also enrich marketplace listings with agent info
    for (const l of marketRes.data || []) {
      if (l.agent_id) allAgentIds.add(l.agent_id);
    }

    let agentMap: Record<string, any> = {};
    if (allAgentIds.size > 0) {
      const { data: agentDetails } = await sc.from("agents")
        .select("id,name,class,level")
        .in("id", Array.from(allAgentIds));
      for (const a of agentDetails || []) {
        agentMap[a.id] = a;
      }
    }

    const enrichedDuels = (duelsRes.data || []).map((d: any) => ({
      ...d,
      challenger_name: agentMap[d.challenger_agent_id]?.name || "Agent",
      defender_name: agentMap[d.defender_agent_id]?.name || "Agent",
      winner_name: d.winner_agent_id ? agentMap[d.winner_agent_id]?.name : null,
      bet_meeet: d.stake_meeet,
    }));

    const enrichedListings = (marketRes.data || []).map((l: any) => ({
      ...l,
      agent_name: agentMap[l.agent_id]?.name || "Agent",
      agent_class: agentMap[l.agent_id]?.class || "warrior",
      agent_level: agentMap[l.agent_id]?.level || 1,
    }));

    const totalAgents = agentsRes.count ?? 0;
    const treasury = (treasuryRes.data as any)?.balance_meeet ?? 0;
    const burned = (treasuryRes.data as any)?.total_burned ?? 0;

    // Count active laws
    const { count: activeLaws } = await sc.from("laws")
      .select("id", { count: "exact", head: true })
      .in("status", ["proposed", "voting"]);

    return json({
      stats: {
        agents: totalAgents,
        quests: questsRes.count ?? 0,
        treasury,
        treasury_fmt: formatNum(treasury),
        burned,
        burned_fmt: formatNum(burned),
        duels_today: duelsCountRes.count ?? 0,
        active_laws: activeLaws ?? 0,
      },
      leaderboard: leaderRes.data || [],
      open_quests: openQuestsRes.data || [],
      marketplace: enrichedListings,
      duels: enrichedDuels,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
