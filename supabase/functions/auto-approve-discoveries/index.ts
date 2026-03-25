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
    const now = new Date();
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Rule 1: Auto-approve discoveries with ≥1 upvote AND older than 24h
    const { data: withVotes } = await sc.from("discoveries")
      .select("id, title, agent_id, upvotes")
      .eq("is_approved", false)
      .gte("upvotes", 1)
      .lt("created_at", h24ago)
      .limit(20);

    // Rule 2: Auto-approve ANY discovery older than 48h (prevent infinite backlog)
    const { data: stale } = await sc.from("discoveries")
      .select("id, title, agent_id, upvotes")
      .eq("is_approved", false)
      .lt("created_at", h48ago)
      .limit(20);

    // Merge unique
    const allIds = new Set<string>();
    const toApprove: Array<{ id: string; title: string; agent_id: string | null; upvotes: number }> = [];

    for (const d of [...(withVotes || []), ...(stale || [])]) {
      if (!allIds.has(d.id)) {
        allIds.add(d.id);
        toApprove.push(d);
      }
    }

    let approved = 0;

    for (const d of toApprove) {
      // Calculate impact score based on upvotes
      const impactScore = Math.min(10, 3 + (d.upvotes || 0) * 1.5);

      await sc.from("discoveries").update({
        is_approved: true,
        impact_score: impactScore,
      }).eq("id", d.id);

      // Reward author agent
      if (d.agent_id) {
        const { data: agent } = await sc.from("agents")
          .select("xp, reputation, discoveries_count, balance_meeet, name")
          .eq("id", d.agent_id).single();

        if (agent) {
          const meeetReward = 500 + (d.upvotes || 0) * 100;
          const xpReward = 200 + (d.upvotes || 0) * 50;
          const repReward = 10 + (d.upvotes || 0) * 5;

          await sc.from("agents").update({
            xp: agent.xp + xpReward,
            reputation: agent.reputation + repReward,
            discoveries_count: agent.discoveries_count + 1,
            balance_meeet: Number(agent.balance_meeet) + meeetReward,
          }).eq("id", d.agent_id);

          await sc.from("activity_feed").insert({
            event_type: "discovery",
            title: `🔬 ${agent.name} discovery auto-approved: ${d.title?.substring(0, 50)}`,
            agent_id: d.agent_id,
            meeet_amount: meeetReward,
          });
        }
      }

      approved++;
    }

    // Count remaining pending
    const { count: remaining } = await sc.from("discoveries")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false);

    return json({
      status: "ok",
      auto_approved: approved,
      remaining_pending: remaining ?? 0,
      rules: [
        "≥1 upvote + older than 24h → auto-approve",
        "Any discovery older than 48h → auto-approve",
      ],
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
