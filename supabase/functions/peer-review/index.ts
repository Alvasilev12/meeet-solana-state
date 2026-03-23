import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "health_check") return json({ status: "ok", service: "peer-review" });

    // ── SUBMIT REVIEW ──
    if (action === "submit_review") {
      const { discovery_id, reviewer_agent_id, verdict } = body;
      if (!discovery_id || !reviewer_agent_id || !verdict) return json({ error: "discovery_id, reviewer_agent_id, and verdict required" }, 400);
      if (!["verified", "rejected"].includes(verdict)) return json({ error: "verdict must be 'verified' or 'rejected'" }, 400);

      // Get reviewer agent
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet, reputation, user_id").eq("id", reviewer_agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const stakeAmount = 50;
      if (Number(agent.balance_meeet) < stakeAmount) {
        return json({ error: `Need ${stakeAmount} MEEET to stake. Current balance: ${agent.balance_meeet}` }, 400);
      }

      // Check discovery exists and is not approved yet
      const { data: discovery } = await sc.from("discoveries").select("id, title, agent_id, is_approved, upvotes").eq("id", discovery_id).single();
      if (!discovery) return json({ error: "Discovery not found" }, 404);

      // Prevent reviewing own discovery
      if (discovery.agent_id === reviewer_agent_id) {
        return json({ error: "Cannot review your own discovery" }, 400);
      }

      // Deduct stake from reviewer
      await sc.from("agents").update({
        balance_meeet: Number(agent.balance_meeet) - stakeAmount,
      }).eq("id", reviewer_agent_id);

      // Update discovery
      if (verdict === "verified") {
        const newUpvotes = (discovery.upvotes || 0) + 1;
        const shouldApprove = newUpvotes >= 3;
        await sc.from("discoveries").update({
          upvotes: newUpvotes,
          is_approved: shouldApprove,
        }).eq("id", discovery_id);

        // If now approved, reward the discovery author
        if (shouldApprove && discovery.agent_id) {
          const { data: author } = await sc.from("agents").select("balance_meeet, reputation, discoveries_count, xp").eq("id", discovery.agent_id).single();
          if (author) {
            await sc.from("agents").update({
              balance_meeet: Number(author.balance_meeet) + 500,
              reputation: author.reputation + 20,
              discoveries_count: author.discoveries_count + 1,
              xp: author.xp + 200,
            }).eq("id", discovery.agent_id);
          }
        }
      }

      // Reward reviewer with 10 MEEET
      const reviewReward = 10;
      await sc.from("agents").update({
        balance_meeet: Number(agent.balance_meeet) - stakeAmount + reviewReward,
      }).eq("id", reviewer_agent_id);

      // Log activity
      await sc.from("activity_feed").insert({
        event_type: "review",
        title: `${agent.name} ${verdict === "verified" ? "✅ verified" : "❌ rejected"}: ${discovery.title?.substring(0, 50)}`,
        agent_id: reviewer_agent_id,
        meeet_amount: reviewReward,
      });

      return json({
        success: true,
        verdict,
        stake_deducted: stakeAmount,
        reward_earned: reviewReward,
        new_balance: Number(agent.balance_meeet) - stakeAmount + reviewReward,
        message: `Review submitted! ${verdict === "verified" ? "✅ Verified" : "❌ Rejected"}. +${reviewReward} MEEET earned.`,
      });
    }

    // ── GET REVIEWS FOR DISCOVERY ──
    if (action === "get_reviews") {
      const { discovery_id } = body;
      // Return upvote count from discovery
      const { data: disc } = await sc.from("discoveries").select("id, title, upvotes, is_approved").eq("id", discovery_id).single();
      return json({ discovery: disc });
    }

    // ── LEADERBOARD ──
    if (action === "get_leaderboard") {
      const { data: top } = await sc.from("agents").select("id, name, class, level, reputation, kills, discoveries_count")
        .order("kills", { ascending: false }).limit(10);
      return json({ leaderboard: top ?? [] });
    }

    return json({ error: "Unknown action. Use: submit_review, get_reviews, get_leaderboard" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
