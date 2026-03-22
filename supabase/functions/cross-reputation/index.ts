import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function computeScore(agent: Record<string, number>): { score: number; breakdown: Record<string, number> } {
  const breakdown = {
    level: Math.min(agent.level * 2, 100),
    quests: Math.min(agent.quests_completed * 5, 200),
    kills: Math.min(agent.kills * 10, 150),
    reputation: Math.min(agent.reputation, 100),
    discoveries: Math.min(agent.discoveries_count * 15, 150),
    xp: Math.min(Math.floor(agent.xp / 100), 100),
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score, breakdown };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, target_agent_id, amount } = await req.json();

    if (action === "score") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, class, level, xp, reputation, quests_completed, kills, discoveries_count").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const { score, breakdown } = computeScore(agent as unknown as Record<string, number>);
      const tier = score >= 600 ? "Legendary" : score >= 400 ? "Elite" : score >= 200 ? "Veteran" : score >= 100 ? "Trusted" : "Newcomer";

      return json({ agent_id, name: agent.name, reputation_score: score, tier, breakdown, max_possible: 800 });
    }

    if (action === "compare") {
      if (!agent_id || !target_agent_id) return json({ error: "agent_id and target_agent_id required" }, 400);
      const [{ data: a1 }, { data: a2 }] = await Promise.all([
        sc.from("agents").select("id, name, class, level, xp, reputation, quests_completed, kills, discoveries_count").eq("id", agent_id).single(),
        sc.from("agents").select("id, name, class, level, xp, reputation, quests_completed, kills, discoveries_count").eq("id", target_agent_id).single(),
      ]);
      if (!a1 || !a2) return json({ error: "One or both agents not found" }, 404);

      const s1 = computeScore(a1 as unknown as Record<string, number>);
      const s2 = computeScore(a2 as unknown as Record<string, number>);

      return json({
        agents: [
          { id: a1.id, name: a1.name, score: s1.score, breakdown: s1.breakdown },
          { id: a2.id, name: a2.name, score: s2.score, breakdown: s2.breakdown },
        ],
        winner: s1.score > s2.score ? a1.name : s2.score > s1.score ? a2.name : "tie",
      });
    }

    if (action === "endorse") {
      if (!agent_id || !target_agent_id) return json({ error: "agent_id and target_agent_id required" }, 400);
      if (agent_id === target_agent_id) return json({ error: "Cannot endorse yourself" }, 400);

      const endorseAmount = Math.min(amount || 5, 25);
      const { data: target } = await sc.from("agents").select("id, name, reputation").eq("id", target_agent_id).single();
      if (!target) return json({ error: "Target agent not found" }, 404);

      await sc.from("agents").update({ reputation: target.reputation + endorseAmount }).eq("id", target_agent_id);
      await sc.from("activity_feed").insert({ agent_id, target_agent_id, event_type: "endorsement", title: `Agent endorsed ${target.name} (+${endorseAmount} rep)` });

      return json({ success: true, target: target.name, reputation_added: endorseAmount, new_reputation: target.reputation + endorseAmount });
    }

    return json({ error: "Unknown action. Use: score, compare, endorse" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
