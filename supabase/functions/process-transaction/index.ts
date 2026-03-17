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

const TAX_RATES: Record<string, number> = {
  quest_reward: 0.05,
  trade: 0.03,
  transfer: 0.02,
  land_purchase: 0.10,
  passport_purchase: 0.05,
  duel_reward: 0.05,
  mining_reward: 0.03,
  guild_share: 0.02,
};

const BURN_RATE = 0.20;

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

    // Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    // Rate limit
    const rl = RATE_LIMITS.process_transaction;
    const { allowed } = await checkRateLimit(serviceClient, `tx:${userId}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const {
      type,
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

    // ── VALIDATE OWNERSHIP FIRST ────────────────────────────
    if (from_agent_id && meeetAmount > 0) {
      const { data: sender } = await serviceClient
        .from("agents")
        .select("user_id, balance_meeet")
        .eq("id", from_agent_id)
        .single();

      if (!sender || sender.user_id !== userId) {
        return json({ error: "Not your agent" }, 403);
      }
      if (Number(sender.balance_meeet) < meeetAmount) {
        return json({ error: "Insufficient balance" }, 400);
      }
    }

    // Validate to_agent exists if specified
    if (to_agent_id) {
      const { data: recipient } = await serviceClient
        .from("agents")
        .select("id")
        .eq("id", to_agent_id)
        .single();
      if (!recipient) {
        return json({ error: "Recipient agent not found" }, 404);
      }
    }

    // ── CALCULATE TAX ───────────────────────────────────────
    const taxRate = TAX_RATES[type] ?? 0.02;
    const taxMeeet = Math.floor(meeetAmount * taxRate);
    const burnMeeet = Math.floor(taxMeeet * BURN_RATE);
    const treasuryMeeet = taxMeeet - burnMeeet;
    const netMeeet = meeetAmount - taxMeeet;

    // ── EXECUTE ATOMICALLY VIA SQL FUNCTION ──────────────────
    // Deduct from sender
    if (from_agent_id && meeetAmount > 0) {
      const { error: deductErr } = await serviceClient.rpc("execute_atomic_transfer" as any, {
        _from_agent_id: from_agent_id,
        _to_agent_id: to_agent_id || null,
        _deduct_amount: meeetAmount,
        _credit_amount: netMeeet,
      });
      // If the RPC doesn't exist yet, fall back to sequential updates
      if (deductErr) {
        // Deduct from sender
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

        // Credit recipient
        if (to_agent_id && netMeeet > 0) {
          const { data: recipient } = await serviceClient
            .from("agents")
            .select("balance_meeet")
            .eq("id", to_agent_id)
            .single();
          if (recipient) {
            await serviceClient
              .from("agents")
              .update({ balance_meeet: Number(recipient.balance_meeet) + netMeeet })
              .eq("id", to_agent_id);
          }
        }
      }
    } else if (to_agent_id && netMeeet > 0) {
      // Credit-only path (e.g. quest_reward, mining_reward)
      // SECURITY: Only allow credit-only from trusted internal service calls
      // Check for internal service header to prevent external abuse
      const internalSecret = req.headers.get("x-internal-service");
      const expectedSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-16);
      if (!internalSecret || internalSecret !== expectedSecret) {
        return json({ error: "Credit-only transactions require a sender (from_agent_id)" }, 403);
      }

      const { data: recipient } = await serviceClient
        .from("agents")
        .select("balance_meeet")
        .eq("id", to_agent_id)
        .single();
      if (recipient) {
        await serviceClient
          .from("agents")
          .update({ balance_meeet: Number(recipient.balance_meeet) + netMeeet })
          .eq("id", to_agent_id);
      }
    }

    // ── RECORD TRANSACTION ──────────────────────────────────
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

    // ── UPDATE TREASURY ─────────────────────────────────────
    if (treasuryMeeet > 0 || burnMeeet > 0) {
      const { data: treasury } = await serviceClient
        .from("state_treasury")
        .select("*")
        .limit(1)
        .single();

      if (treasury) {
        const revenueField = getRevenueField(type);
        const updatePayload: Record<string, number> = {
          balance_meeet: Number(treasury.balance_meeet) + treasuryMeeet,
          total_tax_collected: Number(treasury.total_tax_collected) + taxMeeet,
          total_burned: Number(treasury.total_burned) + burnMeeet,
        };

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

    // ── TAX LOG ─────────────────────────────────────────────
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
