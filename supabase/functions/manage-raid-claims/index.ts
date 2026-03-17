import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CAMPAIGN_TAG = "twitter_raid_v1";
const MAX_APPROVED = 100;
const REWARD_MEEET = 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ── Authenticate caller ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authorization required" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const body = await req.json();
    const action = body.action as string;

    // ═══════════════ SUBMIT CLAIM ═══════════════
    if (action === "submit") {
      const twitterHandle = (body.twitter_handle || "").trim().replace(/^@/, "");
      const proofUrl = (body.proof_url || "").trim();
      const proofText = (body.proof_text || "").trim();

      if (!twitterHandle || twitterHandle.length < 1 || twitterHandle.length > 30) {
        return json({ error: "Twitter handle is required (1-30 chars)" }, 400);
      }
      if (!proofUrl && !proofText) {
        return json({ error: "Proof URL or description is required" }, 400);
      }

      // Check if user has an agent
      const { data: agent } = await serviceClient
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!agent) {
        return json({ error: "You must deploy an agent first before claiming raid reward" }, 400);
      }

      // Check campaign limit
      const { data: stats } = await serviceClient.rpc("get_raid_campaign_stats", {
        _campaign_tag: CAMPAIGN_TAG,
      });
      if (stats && stats.length > 0 && Number(stats[0].approved_claims) >= MAX_APPROVED) {
        return json({ error: "Campaign limit reached — all 100 slots have been claimed" }, 409);
      }

      // Check if already claimed
      const { data: existing } = await serviceClient
        .from("raid_claims")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("campaign_tag", CAMPAIGN_TAG)
        .maybeSingle();

      if (existing) {
        return json({
          error: `You already submitted a claim (status: ${existing.status})`,
          claim_id: existing.id,
        }, 409);
      }

      // Insert claim
      const { data: claim, error: insertErr } = await serviceClient
        .from("raid_claims")
        .insert({
          user_id: user.id,
          agent_id: agent.id,
          twitter_handle: twitterHandle,
          proof_url: proofUrl || null,
          proof_text: proofText || null,
          campaign_tag: CAMPAIGN_TAG,
          reward_meeet: REWARD_MEEET,
          status: "pending",
        })
        .select()
        .single();

      if (insertErr) {
        if (insertErr.message.includes("uq_raid_claims_handle_campaign")) {
          return json({ error: "This Twitter handle has already been used for a claim" }, 409);
        }
        console.error("Insert error:", insertErr);
        return json({ error: "Failed to submit claim" }, 500);
      }

      return json({ status: "submitted", claim_id: claim.id, message: "Your claim has been submitted for review!" }, 201);
    }

    // ═══════════════ LIST CLAIMS (President only) ═══════════════
    if (action === "list") {
      // Verify president
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("is_president")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.is_president) {
        return json({ error: "Forbidden — President only" }, 403);
      }

      const statusFilter = body.status_filter || "pending";
      const { data: claims, error: listErr } = await serviceClient
        .from("raid_claims")
        .select("*")
        .eq("campaign_tag", CAMPAIGN_TAG)
        .eq("status", statusFilter)
        .order("created_at", { ascending: true })
        .limit(50);

      if (listErr) return json({ error: listErr.message }, 500);

      // Get campaign stats
      const { data: stats } = await serviceClient.rpc("get_raid_campaign_stats", {
        _campaign_tag: CAMPAIGN_TAG,
      });

      return json({
        claims: claims || [],
        stats: stats && stats.length > 0 ? stats[0] : { total_claims: 0, approved_claims: 0, pending_claims: 0, total_rewarded: 0 },
        max_approved: MAX_APPROVED,
      });
    }

    // ═══════════════ REVIEW CLAIM (President: approve/reject) ═══════════════
    if (action === "review") {
      // Verify president
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("is_president")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.is_president) {
        return json({ error: "Forbidden — President only" }, 403);
      }

      const claimId = body.claim_id;
      const decision = body.decision as "approved" | "rejected";
      const rejectionReason = body.rejection_reason || null;

      if (!claimId || !["approved", "rejected"].includes(decision)) {
        return json({ error: "claim_id and decision (approved/rejected) required" }, 400);
      }

      // Get the claim
      const { data: claim } = await serviceClient
        .from("raid_claims")
        .select("*")
        .eq("id", claimId)
        .eq("status", "pending")
        .maybeSingle();

      if (!claim) {
        return json({ error: "Claim not found or already reviewed" }, 404);
      }

      if (decision === "approved") {
        // Check campaign limit before approving
        const { data: stats } = await serviceClient.rpc("get_raid_campaign_stats", {
          _campaign_tag: CAMPAIGN_TAG,
        });
        if (stats && stats.length > 0 && Number(stats[0].approved_claims) >= MAX_APPROVED) {
          return json({ error: "Campaign limit reached — cannot approve more" }, 409);
        }

        // Credit agent balance
        if (claim.agent_id) {
          const { data: agent } = await serviceClient
            .from("agents")
            .select("balance_meeet")
            .eq("id", claim.agent_id)
            .single();

          if (agent) {
            await serviceClient
              .from("agents")
              .update({ balance_meeet: Number(agent.balance_meeet) + REWARD_MEEET })
              .eq("id", claim.agent_id);

            // Record transaction
            await serviceClient.from("transactions").insert({
              type: "mint",
              to_agent_id: claim.agent_id,
              to_user_id: claim.user_id,
              amount_meeet: REWARD_MEEET,
              description: `Twitter raid reward — @${claim.twitter_handle}`,
            });

            // Activity feed
            await serviceClient.from("activity_feed").insert({
              event_type: "raid_reward",
              title: `🎁 @${claim.twitter_handle} claimed ${REWARD_MEEET} $MEEET raid reward`,
              agent_id: claim.agent_id,
              meeet_amount: REWARD_MEEET,
            });
          }
        }
      }

      // Update claim status
      await serviceClient
        .from("raid_claims")
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: decision === "rejected" ? rejectionReason : null,
        })
        .eq("id", claimId);

      // Notify the claimer
      await serviceClient.from("notifications").insert({
        user_id: claim.user_id,
        agent_id: claim.agent_id,
        type: decision === "approved" ? "raid_approved" : "raid_rejected",
        title: decision === "approved"
          ? `🎁 Raid reward approved — ${REWARD_MEEET} $MEEET credited!`
          : `❌ Raid claim rejected${rejectionReason ? `: ${rejectionReason}` : ""}`,
        body: decision === "approved"
          ? `Your Twitter raid claim (@${claim.twitter_handle}) has been approved. ${REWARD_MEEET} $MEEET has been added to your agent's balance.`
          : `Your claim for @${claim.twitter_handle} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
      });

      return json({
        status: decision,
        claim_id: claimId,
        message: decision === "approved"
          ? `Approved! ${REWARD_MEEET} $MEEET sent to agent.`
          : "Claim rejected.",
      });
    }

    // ═══════════════ MY STATUS ═══════════════
    if (action === "my_status") {
      const { data: claim } = await serviceClient
        .from("raid_claims")
        .select("*")
        .eq("user_id", user.id)
        .eq("campaign_tag", CAMPAIGN_TAG)
        .maybeSingle();

      const { data: stats } = await serviceClient.rpc("get_raid_campaign_stats", {
        _campaign_tag: CAMPAIGN_TAG,
      });

      return json({
        claim: claim || null,
        spots_remaining: stats && stats.length > 0
          ? Math.max(0, MAX_APPROVED - Number(stats[0].approved_claims))
          : MAX_APPROVED,
      });
    }

    return json({ error: "Unknown action. Use: submit, list, review, my_status" }, 400);
  } catch (err) {
    console.error("Raid claims error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
