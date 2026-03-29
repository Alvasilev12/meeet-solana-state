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
    // 1. Read current state_treasury
    const { data: treasury } = await supabase
      .from("state_treasury")
      .select("*")
      .limit(1)
      .single();

    // 2. Get recent agent_actions (last 6h window to match schedule)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: actions, error: actionsErr } = await supabase
      .from("agent_actions")
      .select("id, agent_id, user_id, action_type, cost_usd, details, created_at")
      .gte("created_at", sixHoursAgo)
      .order("created_at", { ascending: false })
      .limit(500);

    if (actionsErr) throw actionsErr;

    // 3. Get existing burns to avoid duplicates
    const { data: existingBurns } = await supabase
      .from("burn_log")
      .select("details")
      .in("reason", ["auto_burn_scheduler", "tax_burn_20pct"])
      .gte("created_at", sixHoursAgo)
      .limit(1000);

    const burnedActionIds = new Set<string>();
    if (existingBurns) {
      for (const b of existingBurns) {
        const d = b.details as Record<string, unknown> | null;
        if (d?.action_id) burnedActionIds.add(d.action_id as string);
      }
    }

    // 4. Filter unburned actions with cost
    const unburned = (actions || []).filter(
      (a) => a.cost_usd && a.cost_usd > 0 && !burnedActionIds.has(a.id)
    );

    if (unburned.length === 0) {
      return json({
        success: true,
        message: "No new actions to burn",
        processed: 0,
        total_burned_usd: 0,
        treasury_balance: treasury?.balance_meeet ?? 0,
        treasury_total_burned: treasury?.total_burned ?? 0,
      });
    }

    // 5. Create burn entries
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
          treasury_snapshot: {
            balance_meeet: treasury?.balance_meeet ?? 0,
            total_tax: treasury?.total_tax_collected ?? 0,
          },
        },
      };
    });

    // 6. Insert burns in batches
    for (let i = 0; i < burnEntries.length; i += 50) {
      const batch = burnEntries.slice(i, i + 50);
      const { error: insertErr } = await supabase.from("burn_log").insert(batch);
      if (insertErr) throw insertErr;
    }

    // 7. Update state_treasury total_burned
    if (treasury) {
      await supabase
        .from("state_treasury")
        .update({
          total_burned: (treasury.total_burned || 0) + totalBurned,
        })
        .eq("id", treasury.id);
    }

    // 8. Update economy_state: decrease circulating_supply by burned amount
    const { data: econ } = await supabase
      .from("economy_state")
      .select("*")
      .limit(1)
      .single();

    if (econ) {
      await supabase
        .from("economy_state")
        .update({
          circulating_supply: Math.max(0, (econ.circulating_supply || 0) - totalBurned),
          total_burned: (econ.total_burned || 0) + totalBurned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", econ.id);
    }

    return json({
      success: true,
      processed: unburned.length,
      total_burned_usd: totalBurned,
      treasury_balance: treasury?.balance_meeet ?? 0,
      treasury_total_burned: (treasury?.total_burned ?? 0) + totalBurned,
      circulating_supply: econ ? Math.max(0, (econ.circulating_supply || 0) - totalBurned) : null,
      economy_total_burned: econ ? (econ.total_burned || 0) + totalBurned : null,
      message: `Burned ${BURN_PCT * 100}% from ${unburned.length} actions`,
    });
  } catch (error) {
    return json({ success: false, error: error.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
