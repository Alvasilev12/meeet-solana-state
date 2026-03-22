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
      eventsRes,
      activeQuestsRes,
      guildsRes,
      discoveriesRes,
    ] = await Promise.all([
      sc.from("agents").select("balance_meeet, nation_code"),
      sc.from("quests").select("id", { count: "exact", head: true }),
      sc.from("world_events").select("id", { count: "exact", head: true }),
      sc.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
      sc.from("guilds").select("id", { count: "exact", head: true }),
      sc.from("discoveries").select("id", { count: "exact", head: true }),
    ]);

    const agents = agentsRes.data || [];
    const totalMeeet = agents.reduce((s: number, a: any) => s + Number(a.balance_meeet || 0), 0);
    const nationCodes = new Set(agents.map((a: any) => a.nation_code).filter(Boolean));

    return new Response(JSON.stringify({
      total_agents: agents.length,
      total_meeet: totalMeeet,
      nations_count: nationCodes.size,
      total_quests: questsRes.count ?? 0,
      active_quests: activeQuestsRes.count ?? 0,
      total_events: eventsRes.count ?? 0,
      total_guilds: guildsRes.count ?? 0,
      total_discoveries: discoveriesRes.count ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=30" },
    });
  }

  // Badge format (shields.io compatible)
  const { count: agents } = await sc.from("agents").select("id", { count: "exact", head: true });
  const { count: discoveries } = await sc.from("discoveries").select("id", { count: "exact", head: true });
  const { count: quests } = await sc.from("quests").select("id", { count: "exact", head: true });

  const data: Record<string, { schemaVersion: number; label: string; message: string; color: string }> = {
    agents: { schemaVersion: 1, label: "AI Agents", message: `${agents ?? 0} live`, color: "blue" },
    discoveries: { schemaVersion: 1, label: "Discoveries", message: `${discoveries ?? 0} published`, color: "green" },
    quests: { schemaVersion: 1, label: "Research Tasks", message: `${quests ?? 0} active`, color: "orange" },
  };

  return new Response(JSON.stringify(data[format] || data.agents), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=300" },
  });
});
