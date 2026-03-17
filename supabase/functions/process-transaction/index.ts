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

// Tax rates by transaction type
const TAX_RATES: Record<string, number> = {
  quest_reward: 0.05,       // 5% tax on quest rewards
  trade: 0.03,              // 3% on trades
  transfer: 0.02,           // 2% on transfers
  land_purchase: 0.10,      // 10% on land purchases
  passport_purchase: 0.05,  // 5% on passport purchases
  duel_reward: 0.05,        // 5% on duel winnings
  mining_reward: 0.03,      // 3% on mining
  guild_share: 0.02,        // 2% on guild payouts
};

// Burn rate: portion of tax that gets burned (deflationary)
const BURN_RATE = 0.20; // 20% of tax is burned

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
    const userId = user.id;

    const {
      type,            // transaction_type enum
      from_agent_id,
      to_agent_id,
      from_user_id,
      to_user_id,
      amount_meeet,
      amount_sol,
      quest_id,
      description,
    } = await req.json();

    if (!type) return json({ error: "Transaction type required" }, 400);

    const meeetAmount = Number(amount_meeet) || 0;
    const solAmount = Number(amount_sol) || 0;

    if (meeetAmount <= 0 && solAmount <= 0) {
      return json({ error: "Amount must be positive" }, 400);
    }

    // Calculate tax
    const taxRate = TAX_RATES[type] ?? 0.02; // default 2%
    const taxMeeet = Math.floor(meeetAmount * taxRate);
    const burnMeeet = Math.floor(taxMeeet * BURN_RATE);
    const treasuryMeeet = taxMeeet - burnMeeet;
    const netMeeet = meeetAmount - taxMeeet;

    // 1. Record the transaction with tax info
    const { data: tx, error: txErr } = await serviceClient
      .from("transactions")
      .insert({
        type,
        from_agent_id: from_agent_id || null,
        to_agent_id: to_agent_id || null,
        from_user_id: from_user_id || userId,
        to_user_id: to_user_id || null,
        amount_meeet: netMeeet,
        amount_sol: solAmount,
        tax_amount: taxMeeet,
        burn_amount: burnMeeet,
        quest_id: quest_id || null,
        description: description || null,
      })
      .select("id")
      .single();

    if (txErr) return json({ error: `Transaction failed: ${txErr.message}` }, 500);

    // 2. Credit recipient agent if applicable
    if (to_agent_id && netMeeet > 0) {
      const { data: agent } = await serviceClient
        .from("agents")
        .select("balance_meeet")
        .eq("id", to_agent_id)
        .single();
      
      if (agent) {
        await serviceClient
          .from("agents")
          .update({ balance_meeet: Number(agent.balance_meeet) + netMeeet })
          .eq("id", to_agent_id);
      }
    }

    // 3. Deduct from sender agent if applicable
    if (from_agent_id && meeetAmount > 0) {
      const { data: sender } = await serviceClient
        .from("agents")
        .select("balance_meeet")
        .eq("id", from_agent_id)
        .single();
      
      if (sender) {
        const newBalance = Math.max(0, Number(sender.balance_meeet) - meeetAmount);
        await serviceClient
          .from("agents")
          .update({ balance_meeet: newBalance })
          .eq("id", from_agent_id);
      }
    }

    // 4. Update state treasury
    if (treasuryMeeet > 0 || burnMeeet > 0) {
      const { data: treasury } = await serviceClient
        .from("state_treasury")
        .select("*")
        .limit(1)
        .single();

      if (treasury) {
        // Determine which revenue category to increment
        const revenueField = getRevenueField(type);
        const updatePayload: Record<string, number> = {
          balance_meeet: Number(treasury.balance_meeet) + treasuryMeeet,
          total_tax_collected: Number(treasury.total_tax_collected) + taxMeeet,
          total_burned: Number(treasury.total_burned) + burnMeeet,
        };

        // Increment specific revenue category
        if (revenueField && treasury[revenueField] !== undefined) {
          updatePayload[revenueField] = Number(treasury[revenueField]) + treasuryMeeet;
        }

        if (type === "quest_reward") {
          updatePayload.total_quest_payouts = Number(treasury.total_quest_payouts) + netMeeet;
        }

        await serviceClient
          .from("state_treasury")
          .update(updatePayload)
          .eq("id", treasury.id);
      }
    }

    // 5. Record tax transaction separately for transparency
    if (taxMeeet > 0) {
      await serviceClient.from("transactions").insert({
        type: "tax",
        from_agent_id: from_agent_id || null,
        to_user_id: null,
        amount_meeet: treasuryMeeet,
        burn_amount: burnMeeet,
        tax_amount: 0,
        description: `Tax (${(taxRate * 100).toFixed(0)}%) on ${type}: ${taxMeeet} $MEEET (${burnMeeet} burned)`,
      });
    }

    return json({
      success: true,
      transaction_id: tx.id,
      gross_amount: meeetAmount,
      tax: taxMeeet,
      burned: burnMeeet,
      treasury_credit: treasuryMeeet,
      net_amount: netMeeet,
      tax_rate: `${(taxRate * 100).toFixed(0)}%`,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function getRevenueField(type: string): string | null {
  switch (type) {
    case "land_purchase": return "total_land_revenue";
    case "passport_purchase": return "total_passport_revenue";
    default: return null;
  }
}
