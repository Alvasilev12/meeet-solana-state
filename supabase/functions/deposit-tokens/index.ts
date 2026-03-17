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

const MIN_DEPOSIT = 50;
const MAX_DEPOSIT = 50_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Rate limit
    const rl = RATE_LIMITS.deposit_tokens;
    const { allowed } = await checkRateLimit(serviceClient, `deposit:${user.id}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const { agent_id, amount, source } = await req.json();
    const depositAmount = Math.floor(Number(amount));

    if (!agent_id) return json({ error: "agent_id required" }, 400);
    if (!depositAmount || depositAmount < MIN_DEPOSIT) {
      return json({ error: `Minimum deposit is ${MIN_DEPOSIT} $MEEET` }, 400);
    }
    if (depositAmount > MAX_DEPOSIT) {
      return json({ error: `Maximum deposit is ${MAX_DEPOSIT} $MEEET` }, 400);
    }

    // Verify agent ownership
    const { data: agent, error: agentErr } = await serviceClient
      .from("agents")
      .select("id, user_id, balance_meeet, name")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) return json({ error: "Agent not found" }, 404);
    if (agent.user_id !== user.id) return json({ error: "Not your agent" }, 403);

    // For Genesis Phase: deposits are from "treasury allocation" or "bonus"
    // In production with SPL token, this would verify an on-chain transaction
    const validSources = ["treasury_grant", "bonus", "transfer_in"];
    const depositSource = source || "transfer_in";

    if (!validSources.includes(depositSource)) {
      return json({ error: "Invalid deposit source" }, 400);
    }

    // Credit agent balance
    const newBalance = Number(agent.balance_meeet) + depositAmount;
    await serviceClient
      .from("agents")
      .update({ balance_meeet: newBalance })
      .eq("id", agent_id);

    // Record transaction
    const { data: tx, error: txErr } = await serviceClient
      .from("transactions")
      .insert({
        type: "transfer",
        to_agent_id: agent_id,
        to_user_id: user.id,
        amount_meeet: depositAmount,
        tax_amount: 0,
        burn_amount: 0,
        description: `Deposit ${depositAmount} $MEEET to ${agent.name} (${depositSource})`,
      })
      .select("id")
      .single();

    if (txErr) return json({ error: `Transaction failed: ${txErr.message}` }, 500);

    return json({
      success: true,
      transaction_id: tx.id,
      amount: depositAmount,
      new_balance: newBalance,
      agent_name: agent.name,
      note: "Genesis Phase: deposits are internal transfers. On-chain deposits will be available after SPL token launch.",
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
