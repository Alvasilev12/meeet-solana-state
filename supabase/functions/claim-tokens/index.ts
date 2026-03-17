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

const TAX_RATE = 0.05;
const BURN_RATE = 0.20;
const MIN_CLAIM = 100;

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

    // Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { agent_id, amount } = await req.json();
    const claimAmount = Math.floor(Number(amount));

    if (!agent_id) return json({ error: "agent_id required" }, 400);
    if (!claimAmount || claimAmount < MIN_CLAIM) {
      return json({ error: `Minimum claim is ${MIN_CLAIM} $MEEET` }, 400);
    }

    // Verify agent ownership
    const { data: agent, error: agentErr } = await serviceClient
      .from("agents")
      .select("id, user_id, balance_meeet, name")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) return json({ error: "Agent not found" }, 404);
    if (agent.user_id !== user.id) return json({ error: "Not your agent" }, 403);
    if (Number(agent.balance_meeet) < claimAmount) {
      return json({ error: "Insufficient agent balance" }, 400);
    }

    // Check wallet exists on profile
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", user.id)
      .single();

    if (!profile?.wallet_address) {
      return json({ error: "No wallet address saved on profile. Connect and save a wallet first." }, 400);
    }

    // Calculate tax
    const taxAmount = Math.floor(claimAmount * TAX_RATE);
    const burnAmount = Math.floor(taxAmount * BURN_RATE);
    const treasuryAmount = taxAmount - burnAmount;
    const netAmount = claimAmount - taxAmount;

    // 1. Deduct from agent balance
    const newBalance = Number(agent.balance_meeet) - claimAmount;
    await serviceClient
      .from("agents")
      .update({ balance_meeet: newBalance })
      .eq("id", agent_id);

    // 2. Record claim transaction
    const { data: tx, error: txErr } = await serviceClient
      .from("transactions")
      .insert({
        type: "transfer",
        from_agent_id: agent_id,
        from_user_id: user.id,
        to_user_id: user.id,
        amount_meeet: netAmount,
        tax_amount: taxAmount,
        burn_amount: burnAmount,
        description: `Claim ${claimAmount} $MEEET → wallet ${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)} (pending SPL distribution)`,
      })
      .select("id")
      .single();

    if (txErr) return json({ error: `Transaction failed: ${txErr.message}` }, 500);

    // 3. Record tax transaction
    if (taxAmount > 0) {
      await serviceClient.from("transactions").insert({
        type: "tax",
        from_agent_id: agent_id,
        amount_meeet: treasuryAmount,
        burn_amount: burnAmount,
        tax_amount: 0,
        description: `Claim tax (5%) from ${agent.name}: ${taxAmount} $MEEET (${burnAmount} burned)`,
      });
    }

    // 4. Update treasury
    if (treasuryAmount > 0 || burnAmount > 0) {
      const { data: treasury } = await serviceClient
        .from("state_treasury")
        .select("*")
        .limit(1)
        .single();

      if (treasury) {
        await serviceClient
          .from("state_treasury")
          .update({
            balance_meeet: Number(treasury.balance_meeet) + treasuryAmount,
            total_tax_collected: Number(treasury.total_tax_collected) + taxAmount,
            total_burned: Number(treasury.total_burned) + burnAmount,
          })
          .eq("id", treasury.id);
      }
    }

    return json({
      success: true,
      transaction_id: tx.id,
      gross_amount: claimAmount,
      tax: taxAmount,
      burned: burnAmount,
      net_amount: netAmount,
      wallet: profile.wallet_address,
      status: "queued", // Will become "completed" when SPL token launches
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
