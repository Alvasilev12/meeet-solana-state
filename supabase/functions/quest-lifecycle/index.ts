import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolve caller identity from API key, JWT, or agent_id fallback.
 */
async function resolveUser(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceClient: any,
): Promise<{ userId: string | null; error: string | null }> {
  // 1. API key
  const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
  if (apiKey && apiKey.startsWith("mst_")) {
    const keyHash = await hashKey(apiKey);
    const { data: userId } = await (serviceClient as any).rpc("validate_api_key", { _key_hash: keyHash });
    if (userId) {
      await (serviceClient as any).from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", keyHash);
      return { userId, error: null };
    }
    return { userId: null, error: "Invalid or inactive API key" };
  }

  // 2. JWT Bearer
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (!authErr && user?.id) {
      return { userId: user.id, error: null };
    }
  }

  return { userId: null, error: "Authentication required. Use X-API-Key or Bearer JWT." };
}

/**
 * Fire webhook if agent has a webhook_url (stored in agent metadata or as a parameter).
 */
async function fireWebhook(webhookUrl: string | undefined, payload: Record<string, unknown>) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Webhook fire failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid or empty JSON body" }, 400);
    }
    const { action, quest_id, agent_id, result_text, result_url, reason, wallet_address, webhook_url } = body;

    // Resolve user (supports API key, JWT, or agent_id fallback)
    const { userId, error: authError } = await resolveUser(req, supabaseUrl, anonKey, serviceClient);
    if (!userId) return json({ error: authError }, 401);

    // Rate limit
    const rl = RATE_LIMITS.quest_lifecycle;
    const { allowed } = await checkRateLimit(serviceClient, `quest:${userId}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

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
      // ── ACCEPT ─────────────────────────────────────────────────
      case "accept": {
        if (quest.status !== "open") return json({ error: "Quest is not open" }, 400);
        if (!agent_id) return json({ error: "agent_id required" }, 400);

        const { data: agent } = await serviceClient
          .from("agents")
          .select("id, user_id")
          .eq("id", agent_id)
          .single();
        if (!agent || agent.user_id !== userId)
          return json({ error: "Agent not found or not yours" }, 403);

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

        await serviceClient
          .from("agents")
          .update({ status: "exploring" })
          .eq("id", agent_id);

        return json({ success: true, status: "in_progress" });
      }

      // ── DELIVER ────────────────────────────────────────────────
      case "deliver": {
        if (quest.status !== "in_progress")
          return json({ error: "Quest is not in progress" }, 400);

        const { data: assignedAgent } = await serviceClient
          .from("agents")
          .select("user_id")
          .eq("id", quest.assigned_agent_id)
          .single();
        if (!assignedAgent || assignedAgent.user_id !== userId)
          return json({ error: "Only the assigned agent can deliver" }, 403);

        if (!wallet_address || typeof wallet_address !== "string" || wallet_address.trim().length < 32)
          return json({ error: "Valid wallet_address required for airdrop" }, 400);

        await serviceClient
          .from("quests")
          .update({
            status: "review",
            result_text: result_text || null,
            result_url: result_url || null,
            delivered_at: new Date().toISOString(),
          })
          .eq("id", quest_id);

        await serviceClient.from("quest_submissions").insert({
          quest_id,
          agent_id: quest.assigned_agent_id!,
          user_id: userId,
          wallet_address: wallet_address.trim(),
          result_text: result_text || null,
          result_url: result_url || null,
          reward_meeet: Number(quest.reward_meeet) || 0,
          reward_sol: Number(quest.reward_sol) || 0,
          airdrop_status: "pending",
        });

        return json({ success: true, status: "review" });
      }

      // ── APPROVE ────────────────────────────────────────────────
      case "approve": {
        if (quest.status !== "review")
          return json({ error: "Quest is not in review" }, 400);
        if (quest.requester_id !== userId)
          return json({ error: "Only the requester can approve" }, 403);

        const rewardMeeet = Number(quest.reward_meeet) || 0;
        const rewardSol = Number(quest.reward_sol) || 0;

        await serviceClient
          .from("quests")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", quest_id);

        let solPaymentResult: Record<string, unknown> | null = null;

        // SOL Payout
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
              } catch (e) {
                console.error("SOL payment error:", (e as Error).message);
                solPaymentResult = { error: (e as Error).message };
              }
            }
          }
        }

        // $MEEET reward + stats update
        if (quest.assigned_agent_id) {
          const { data: agentData } = await serviceClient
            .from("agents")
            .select("balance_meeet, xp, quests_completed, name")
            .eq("id", quest.assigned_agent_id)
            .single();

          if (agentData) {
            await serviceClient
              .from("agents")
              .update({
                balance_meeet: rewardMeeet > 0 ? Number(agentData.balance_meeet) + rewardMeeet : agentData.balance_meeet,
                xp: agentData.xp + 50,
                quests_completed: agentData.quests_completed + 1,
                status: "idle",
              })
              .eq("id", quest.assigned_agent_id);

            // Record transaction
            if (rewardMeeet > 0 || rewardSol > 0) {
              await serviceClient.from("transactions").insert({
                type: "quest_reward",
                to_agent_id: quest.assigned_agent_id,
                amount_meeet: rewardMeeet || null,
                amount_sol: rewardSol || null,
                quest_id,
                description: `Quest reward: ${quest.title}`,
              });
            }

            // Reputation
            await serviceClient.from("reputation_log").insert({
              agent_id: quest.assigned_agent_id,
              quest_id,
              delta: 10,
              reason: "Quest completed successfully",
            });

            // Activity feed
            const solNote = solPaymentResult && (solPaymentResult as any).success
              ? ` + ${rewardSol} SOL sent` : rewardSol > 0 ? ` (SOL payout pending)` : "";
            await serviceClient.from("activity_feed").insert({
              agent_id: quest.assigned_agent_id,
              event_type: "quest_complete",
              title: `${agentData.name || "Agent"} completed quest "${quest.title}"`,
              description: `Earned ${rewardMeeet.toLocaleString()} $MEEET${solNote}`,
              meeet_amount: rewardMeeet,
            });

            // 🔔 Fire webhook callback if provided
            await fireWebhook(webhook_url, {
              event: "quest_completed",
              quest_id,
              agent_id: quest.assigned_agent_id,
              agent_name: agentData.name,
              reward_meeet: rewardMeeet,
              reward_sol: rewardSol,
              sol_payment: solPaymentResult,
              timestamp: new Date().toISOString(),
            });
          }
        }

        return json({ success: true, status: "completed", sol_payment: solPaymentResult });
      }

      // ── DISPUTE ────────────────────────────────────────────────
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

      // ── CANCEL ─────────────────────────────────────────────────
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
    return json({ error: (e as Error).message || "Internal server error" }, 500);
  }
});
