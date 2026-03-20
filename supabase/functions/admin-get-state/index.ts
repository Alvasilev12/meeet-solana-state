import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = req.headers.get("x-president-key");
    const stored = Deno.env.get("PRESIDENT_API_KEY");
    if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [agents, petitions, quests, topAgents, pendingPetitions, allPetitions] = await Promise.all([
      sc.from("agents").select("id", { count: "exact", head: true }),
      sc.from("petitions").select("id", { count: "exact", head: true }),
      sc.from("quests").select("id", { count: "exact", head: true }),
      sc.from("agents").select("id, name, class, level, xp, balance_meeet, kills, quests_completed").order("xp", { ascending: false }).limit(5),
      sc.from("petitions").select("id, sender_name, subject, message, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
      sc.from("petitions").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    const rawPetitions = allPetitions.data ?? [];
    const missingUserAgentIds = [...new Set(
      rawPetitions
        .filter((p: any) => !p.user_id && p.agent_id)
        .map((p: any) => p.agent_id as string)
    )];

    let agentOwnerMap = new Map<string, string>();
    if (missingUserAgentIds.length > 0) {
      const { data: petitionAgents } = await sc
        .from("agents")
        .select("id, user_id")
        .in("id", missingUserAgentIds);
      agentOwnerMap = new Map((petitionAgents ?? []).map((a: any) => [a.id, a.user_id]));
    }

    const petitionsList = rawPetitions.map((p: any) => ({
      id: p.id,
      message: p.message ?? p.content ?? p.text ?? "",
      status: p.status ?? "pending",
      user_id: p.user_id ?? (p.agent_id ? agentOwnerMap.get(p.agent_id) ?? null : null),
      created_at: p.created_at ?? null,
    }));

    return json({
      counts: {
        agents: agents.count ?? 0,
        petitions: petitions.count ?? 0,
        quests: quests.count ?? 0,
      },
      top_agents: topAgents.data ?? [],
      petitions: petitionsList,
      pending_petitions: pendingPetitions.data ?? [],
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});
