// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BURN_PCT = 0.2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get recent agent_actions that may not have burn_log entries
    const { data: actions, error: actionsErr } = await supabase
      .from("agent_actions")
      .select("id, agent_id, user_id, action_type, cost_usd, details, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (actionsErr) throw actionsErr;
    if (!actions || actions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No actions to process", burned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing burn_log entries to avoid double-burning
    const { data: existingBurns } = await supabase
      .from("burn_log")
      .select("details")
      .eq("reason", "auto_burn_scheduler")
      .order("created_at", { ascending: false })
      .limit(1000);

    const burnedActionIds = new Set<string>();
    if (existingBurns) {
      for (const b of existingBurns) {
        if (b.details && typeof b.details === "object" && (b.details as any).action_id) {
          burnedActionIds.add((b.details as any).action_id);
        }
      }
    }

    // Also skip actions already burned inline (tax_burn_20pct)
    const { data: inlineBurns } = await supabase
      .from("burn_log")
      .select("details")
      .eq("reason", "tax_burn_20pct")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (inlineBurns) {
      for (const b of inlineBurns) {
        if (b.details && typeof b.details === "object" && (b.details as any).action_id) {
          burnedActionIds.add((b.details as any).action_id);
        }
      }
    }

    // Filter unburned actions with a cost
    const unburned = actions.filter(
      (a) => a.cost_usd && a.cost_usd > 0 && !burnedActionIds.has(a.id)
    );

    if (unburned.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "All actions already burned", burned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalBurned = 0;
    const burnEntries = unburned.map((a) => {
      const burnAmount = (a.cost_usd || 0) * BURN_PCT;
      totalBurned += burnAmount;
      return {
        amount: burnAmount,
        reason: "auto_burn_scheduler",
        agent_id: a.agent_id || null,
        user_id: a.user_id || null,
        details: {
          action_id: a.id,
          action_type: a.action_type,
          original_cost: a.cost_usd,
          burn_pct: BURN_PCT * 100,
        },
      };
    });

    // Insert burns in batches of 50
    for (let i = 0; i < burnEntries.length; i += 50) {
      const batch = burnEntries.slice(i, i + 50);
      const { error: insertErr } = await supabase.from("burn_log").insert(batch);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({
      success: true,
      processed: unburned.length,
      total_burned_usd: totalBurned,
      message: `Burned ${BURN_PCT * 100}% from ${unburned.length} actions`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
