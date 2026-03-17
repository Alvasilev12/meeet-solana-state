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
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Rate limit
    const rl = RATE_LIMITS.quest_lifecycle;
    const { allowed } = await checkRateLimit(serviceClient, `quest:${user.id}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const { action, quest_id, agent_id, result_text, result_url, reason } = await req.json();

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
        if (!agent || agent.user_id !== user.id)
          return json({ error: "Agent not found or not yours" }, 403);

        // Cannot accept own quest
        if (quest.requester_id === user.id)
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
        if (!assignedAgent || assignedAgent.user_id !== user.id)
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
        if (quest.requester_id !== user.id)
          return json({ error: "Only the requester can approve" }, 403);

        const rewardMeeet = Number(quest.reward_meeet) || 0;

        // Mark quest completed
        await serviceClient
          .from("quests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", quest_id);

        // Process reward via process-transaction (handles tax + treasury)
        if (rewardMeeet > 0 && quest.assigned_agent_id) {
          const txResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-transaction`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
                apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
              },
              body: JSON.stringify({
                type: "quest_reward",
                from_user_id: quest.requester_id,
                to_agent_id: quest.assigned_agent_id,
                amount_meeet: rewardMeeet,
                amount_sol: quest.reward_sol,
                quest_id,
                description: `Quest reward: ${quest.title}`,
              }),
            }
          );
          const txResult = await txResponse.json();

          // Update agent XP and quest count
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
        }

        // Add reputation
        if (quest.assigned_agent_id) {
          await serviceClient.from("reputation_log").insert({
            agent_id: quest.assigned_agent_id,
            quest_id,
            delta: 10,
            reason: "Quest completed successfully",
          });

          // Activity feed entry
          const { data: completedAgent } = await serviceClient
            .from("agents").select("name").eq("id", quest.assigned_agent_id).single();
          await serviceClient.from("activity_feed").insert({
            agent_id: quest.assigned_agent_id,
            event_type: "quest_complete",
            title: `${completedAgent?.name || "Agent"} completed quest "${quest.title}"`,
            description: `Earned ${Number(quest.reward_meeet || 0).toLocaleString()} $MEEET`,
            meeet_amount: Number(quest.reward_meeet) || 0,
          });
        }

        return json({ success: true, status: "completed" });
      }

      // ── DISPUTE: requester disputes delivery ───────────────────
      case "dispute": {
        if (quest.status !== "review")
          return json({ error: "Quest is not in review" }, 400);
        if (quest.requester_id !== user.id)
          return json({ error: "Only the requester can dispute" }, 403);
        if (!reason) return json({ error: "Dispute reason required" }, 400);

        await serviceClient
          .from("quests")
          .update({ status: "disputed" })
          .eq("id", quest_id);

        await serviceClient.from("disputes").insert({
          quest_id,
          agent_id: quest.assigned_agent_id!,
          requester_id: user.id,
          reason,
        });

        return json({ success: true, status: "disputed" });
      }

      // ── CANCEL: requester cancels open quest ───────────────────
      case "cancel": {
        if (quest.status !== "open")
          return json({ error: "Can only cancel open quests" }, 400);
        if (quest.requester_id !== user.id)
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
    return json({ error: e.message }, 500);
  }
});
