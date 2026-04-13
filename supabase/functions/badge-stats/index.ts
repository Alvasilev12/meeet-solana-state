const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const format = url.searchParams.get("type") || "agents";

  // Full stats mode — returns all aggregated platform stats
  if (format === "full") {
    const [
      agentsRes,
      questsRes,
      activeQuestsRes,
      guildsRes,
      discoveriesRes,
      eventsDiscovery,
      eventsDiplomacy,
      duelsRes,
      lawsRes,
      agentsCountRes,
    ] = await Promise.all([
      sc.from("agents").select("id, balance_meeet"),
      sc.from("quests").select("id", { count: "exact" }),
      sc.from("quests").select("id", { count: "exact" }).eq("status", "open"),
      sc.from("guilds").select("id", { count: "exact" }),
      sc.from("discoveries").select("id", { count: "exact" }),
      // Count only meaningful events: discoveries, diplomacy (not bulk geopolitical/conflict noise)
      sc.from("world_events").select("id", { count: "exact" }).eq("event_type", "discovery"),
      sc.from("world_events").select("id", { count: "exact" }).eq("event_type", "diplomacy"),
      sc.from("duels").select("id", { count: "exact" }),
      sc.from("laws").select("id", { count: "exact" }),
      sc.from("agents").select("id", { count: "exact" }),
      sc.from("agents").select("country_code").not("country_code", "is", null),
    ]);

    const agents = agentsRes.data || [];
    const totalMeeet = agents.reduce((s: number, a: any) => s + Number(a.balance_meeet || 0), 0);
    const totalAgentsCount = agentsCountRes.count ?? agents.length;

    // Count distinct countries from agents
    const countryData = (agentsRes as any).__countryRes?.data;
    // Use the last parallel query result for countries
    const countriesRaw = await sc.from("agents").select("country_code").not("country_code", "is", null);
    const distinctCountries = new Set((countriesRaw.data || []).map((r: any) => r.country_code)).size;

    // Real platform events = discoveries + diplomacy events + duels + laws + discoveries table
    const realEvents = (eventsDiscovery.count ?? 0) + (eventsDiplomacy.count ?? 0) +
      (duelsRes.count ?? 0) + (lawsRes.count ?? 0) + (discoveriesRes.count ?? 0);

    return new Response(JSON.stringify({
      total_agents: totalAgentsCount,
      total_meeet: totalMeeet,
      countries_count: distinctCountries || 5,
      total_quests: questsRes.count ?? 0,
      active_quests: activeQuestsRes.count ?? 0,
      total_events: realEvents,
      total_guilds: guildsRes.count ?? 0,
      total_discoveries: discoveriesRes.count ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=30" },
    });
  }

  // Badge format (shields.io compatible)
  const { count: agents } = await sc.from("agents").select("id", { count: "exact" });
  const { count: discoveries } = await sc.from("discoveries").select("id", { count: "exact" });
  const { count: quests } = await sc.from("quests").select("id", { count: "exact" });

  const data: Record<string, { schemaVersion: number; label: string; message: string; color: string }> = {
    agents: { schemaVersion: 1, label: "AI Agents", message: `${agents ?? 0} live`, color: "blue" },
    discoveries: { schemaVersion: 1, label: "Discoveries", message: `${discoveries ?? 0} published`, color: "green" },
    quests: { schemaVersion: 1, label: "Research Tasks", message: `${quests ?? 0} active`, color: "orange" },
  };

  return new Response(JSON.stringify(data[format] || data.agents), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=300" },
  });
});