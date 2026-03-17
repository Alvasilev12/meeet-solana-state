import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authorization required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT using getClaims for Lovable Cloud compatibility
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      console.error("Auth error:", claimsErr);
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit
    const rl = RATE_LIMITS.quest_lifecycle;
    const { allowed } = await checkRateLimit(serviceClient, `quest:${userId}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const body = await req.json();
    const { action, quest_id, agent_id, result_text, result_url, reason } = body;

    if (!quest_id) return json({ error: "quest_id required" }, 400);
    if (!action) return json({ error: "action required" }, 400);

    // Fetch quest
    const { data: quest, error: qErr } = await serviceClient
      .from("quests")
      .select("*")
      .eq("id", quest_id)
      .single();
    if (qErr || !quest) return json({ error: "Quest not found" }, 404);

    switch (action) {
      // ── ACCEPT: agent takes the quest ──────────────────────────
      case "accept": {
        if (quest.status !== "open") return json({ error: "Quest is not open" }, 400);
        if (!agent_id) return json({ error: "agent_id required" }, 400);

        // Verify agent belongs to user
        const { data: agent } = await serviceClient
          .from("agents")
          .select("id, user_id")
          .eq("id", agent_id)
          .single();
        if (!agent || agent.user_id !== userId)
          return json({ error: "Agent not found or not yours" }, 403);

        // Cannot accept own quest
        if (quest.requester_id === userId)
          return json({ error: "Cannot accept your own quest" }, 400);

        await serviceClient
          .from("quests")
          .update({
            status: "in_progress",
            assigned_agent_id: agent_id,
            deadline_at: new Date(Date.now() + quest.deadline_hours * 3600000).toISOString(),
          })
          .eq("id", quest_id);

        // Update agent status
        await serviceClient
          .from("agents")
          .update({ status: "exploring" })
          .eq("id", agent_id);

        return json({ success: true, status: "in_progress" });
      }

      // ── DELIVER: agent submits result ──────────────────────────
      case "deliver": {
        if (quest.status !== "in_progress")
          return json({ error: "Quest is not in progress" }, 400);

        // Only assigned agent's owner can deliver
        const { data: assignedAgent } = await serviceClient
          .from("agents")
          .select("user_id")
          .eq("id", quest.assigned_agent_id)
          .single();
        if (!assignedAgent || assignedAgent.user_id !== userId)
          return json({ error: "Only the assigned agent can deliver" }, 403);

        await serviceClient
          .from("quests")
          .update({
            status: "review",
            result_text: result_text || null,
            result_url: result_url || null,
            delivered_at: new Date().toISOString(),
          })
          .eq("id", quest_id);

        return json({ success: true, status: "review" });
      }

      // ── APPROVE: requester approves delivery → pays reward ─────
      case "approve": {
        if (quest.status !== "review")
          return json({ error: "Quest is not in review" }, 400);
        if (quest.requester_id !== userId)
          return json({ error: "Only the requester can approve" }, 403);

        const rewardMeeet = Number(quest.reward_meeet) || 0;
        const rewardSol = Number(quest.reward_sol) || 0;

        // Mark quest completed
        await serviceClient
          .from("quests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", quest_id);

        let solPaymentResult: Record<string, unknown> | null = null;

        // ── SOL Payout: send real SOL to executor's wallet ──
        if (rewardSol > 0 && quest.assigned_agent_id) {
          const { data: executorAgent } = await serviceClient
            .from("agents")
            .select("user_id")
            .eq("id", quest.assigned_agent_id)
            .single();

          if (executorAgent) {
            const { data: executorProfile } = await serviceClient
              .from("profiles")
              .select("wallet_address")
              .eq("user_id", executorAgent.user_id)
              .single();

            if (executorProfile?.wallet_address) {
              try {
                const payResponse = await fetch(
                  `${supabaseUrl}/functions/v1/pay-sol`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${anonKey}`,
                      "x-internal-service": serviceRoleKey.slice(-16),
                    },
                    body: JSON.stringify({
                      recipient_wallet: executorProfile.wallet_address,
                      amount_sol: rewardSol,
                      quest_id,
                      description: `Quest reward: ${quest.title}`,
                    }),
                  }
                );
                solPaymentResult = await payResponse.json();
                if (!payResponse.ok) {
                  console.error("SOL payment failed:", solPaymentResult);
                }
              } catch (e) {
                console.error("SOL payment error:", e.message);
                solPaymentResult = { error: e.message };
              }
            } else {
              solPaymentResult = { error: "Executor has no wallet address linked" };
            }
          }
        }

        // Process $MEEET reward directly (skip process-transaction for reliability)
        if (rewardMeeet > 0 && quest.assigned_agent_id) {
          const { data: agentData } = await serviceClient
            .from("agents")
            .select("balance_meeet, xp, quests_completed")
            .eq("id", quest.assigned_agent_id)
            .single();

          if (agentData) {
            await serviceClient
              .from("agents")
              .update({
                balance_meeet: Number(agentData.balance_meeet) + rewardMeeet,
                xp: agentData.xp + 50,
                quests_completed: agentData.quests_completed + 1,
                status: "idle",
              })
              .eq("id", quest.assigned_agent_id);

            // Record transaction
            await serviceClient.from("transactions").insert({
              type: "quest_reward",
              to_agent_id: quest.assigned_agent_id,
              amount_meeet: rewardMeeet,
              amount_sol: rewardSol,
              quest_id,
              description: `Quest reward: ${quest.title}`,
            });
          }
        } else if (quest.assigned_agent_id) {
          // No MEEET but still update agent stats
          const { data: agentData } = await serviceClient
            .from("agents")
            .select("xp, quests_completed")
            .eq("id", quest.assigned_agent_id)
            .single();

          if (agentData) {
            await serviceClient
              .from("agents")
              .update({
                xp: agentData.xp + 50,
                quests_completed: agentData.quests_completed + 1,
                status: "idle",
              })
              .eq("id", quest.assigned_agent_id);
          }

          // Record SOL-only transaction
          if (rewardSol > 0) {
            await serviceClient.from("transactions").insert({
              type: "quest_reward",
              to_agent_id: quest.assigned_agent_id,
              amount_sol: rewardSol,
              quest_id,
              description: `Quest reward: ${quest.title}`,
            });
          }
        }

        // Add reputation
        if (quest.assigned_agent_id) {
          await serviceClient.from("reputation_log").insert({
            agent_id: quest.assigned_agent_id,
            quest_id,
            delta: 10,
            reason: "Quest completed successfully",
          });

          const { data: completedAgent } = await serviceClient
            .from("agents").select("name").eq("id", quest.assigned_agent_id).single();

          const solNote = solPaymentResult && (solPaymentResult as any).success
            ? ` + ${rewardSol} SOL sent`
            : rewardSol > 0 ? ` (SOL payout pending)` : "";

          await serviceClient.from("activity_feed").insert({
            agent_id: quest.assigned_agent_id,
            event_type: "quest_complete",
            title: `${completedAgent?.name || "Agent"} completed quest "${quest.title}"`,
            description: `Earned ${Number(quest.reward_meeet || 0).toLocaleString()} $MEEET${solNote}`,
            meeet_amount: Number(quest.reward_meeet) || 0,
          });
        }

        return json({ success: true, status: "completed", sol_payment: solPaymentResult });
      }

      // ── DISPUTE: requester disputes delivery ───────────────────
      case "dispute": {
        if (quest.status !== "review")
          return json({ error: "Quest is not in review" }, 400);
        if (quest.requester_id !== userId)
          return json({ error: "Only the requester can dispute" }, 403);
        if (!reason) return json({ error: "Dispute reason required" }, 400);

        await serviceClient
          .from("quests")
          .update({ status: "disputed" })
          .eq("id", quest_id);

        await serviceClient.from("disputes").insert({
          quest_id,
          agent_id: quest.assigned_agent_id!,
          requester_id: userId,
          reason,
        });

        return json({ success: true, status: "disputed" });
      }

      // ── CANCEL: requester cancels open quest ───────────────────
      case "cancel": {
        if (quest.status !== "open")
          return json({ error: "Can only cancel open quests" }, 400);
        if (quest.requester_id !== userId)
          return json({ error: "Only the requester can cancel" }, 403);

        await serviceClient
          .from("quests")
          .update({ status: "cancelled" })
          .eq("id", quest_id);

        return json({ success: true, status: "cancelled" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("Quest lifecycle error:", e);
    return json({ error: e.message || "Internal server error" }, 500);
  }
});