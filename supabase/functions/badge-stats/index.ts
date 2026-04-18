import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, handle, memoCache } from "../_shared/http.ts";

Deno.serve(handle(async (req) => {
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const format = url.searchParams.get("type") || "agents";

  // Full stats mode — returns all aggregated platform stats. Cached for 60s to dramatically reduce DB load.
  if (format === "full") {
    const stats = await memoCache.wrap("badge-stats:full", 60_000, async () => {
      const [
        agentsBalRes,
        questsRes,
        activeQuestsRes,
        guildsRes,
        discoveriesRes,
        eventsTotalRes,
        duelsRes,
        lawsRes,
        agentsCountRes,
        countriesRaw,
      ] = await Promise.all([
        sc.from("agents").select("balance_meeet"),
        sc.from("quests").select("id", { count: "exact", head: true }),
        sc.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
        sc.from("guilds").select("id", { count: "exact", head: true }),
        sc.from("discoveries").select("id", { count: "exact", head: true }),
        sc.from("world_events").select("id", { count: "exact", head: true }),
        sc.from("duels").select("id", { count: "exact", head: true }),
        sc.from("laws").select("id", { count: "exact", head: true }),
        sc.from("agents").select("id", { count: "exact", head: true }),
        sc.from("agents").select("nation_code, country_code"),
      ]);

      const balances = agentsBalRes.data || [];
      const totalMeeet = balances.reduce((s: number, a: any) => s + Number(a.balance_meeet || 0), 0);
      const totalAgentsCount = agentsCountRes.count ?? balances.length;

      const countrySet = new Set<string>();
      for (const r of (countriesRaw.data || []) as any[]) {
        const code = r.nation_code || r.country_code;
        if (code) countrySet.add(code);
      }

      return {
        total_agents: totalAgentsCount,
        total_meeet: totalMeeet,
        countries_count: countrySet.size || 5,
        total_quests: questsRes.count ?? 0,
        active_quests: activeQuestsRes.count ?? 0,
        total_events: eventsTotalRes.count ?? 0,
        total_guilds: guildsRes.count ?? 0,
        total_discoveries: discoveriesRes.count ?? 0,
        total_duels: duelsRes.count ?? 0,
        total_laws: lawsRes.count ?? 0,
        cached_at: new Date().toISOString(),
      };
    });

    return json(stats, 200, {
      "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    });
  }

  // Badge format (shields.io compatible) — cached 5 min per badge type
  const badge = await memoCache.wrap(`badge-stats:badge:${format}`, 300_000, async () => {
    const { count: agents } = await sc.from("agents").select("id", { count: "exact", head: true });
    const { count: discoveries } = await sc.from("discoveries").select("id", { count: "exact", head: true });
    const { count: quests } = await sc.from("quests").select("id", { count: "exact", head: true });

    return {
      agents: { schemaVersion: 1, label: "AI Agents", message: `${agents ?? 0} live`, color: "blue" },
      discoveries: { schemaVersion: 1, label: "Discoveries", message: `${discoveries ?? 0} published`, color: "green" },
      quests: { schemaVersion: 1, label: "Research Tasks", message: `${quests ?? 0} active`, color: "orange" },
    } as Record<string, { schemaVersion: number; label: string; message: string; color: string }>;
  });

  return json(badge[format] || badge.agents, 200, {
    "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1200",
  });
}));
