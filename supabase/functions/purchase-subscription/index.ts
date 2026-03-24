import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TIERS: Record<string, { price_sol: number; price_meeet: number; max_agents: number; label: string }> = {
  pro: { price_sol: 0.5, price_meeet: 50000, max_agents: 5, label: "Pro" },
  enterprise: { price_sol: 1.5, price_meeet: 150000, max_agents: 50, label: "Enterprise" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, user_id, tier, promo_code, tx_signature } = await req.json();

    // ── Validate promo code ──
    if (action === "validate_promo") {
      if (!promo_code) return json({ valid: false, error: "No code provided" });

      const { data: promo } = await sc
        .from("promo_codes")
        .select("*")
        .eq("code", promo_code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (!promo) return json({ valid: false, error: "Invalid or expired promo code" });

      // Check expiry
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return json({ valid: false, error: "Promo code has expired" });
      }

      // Check max uses
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return json({ valid: false, error: "Promo code has been fully redeemed" });
      }

      // Check if user already redeemed
      if (user_id) {
        const { data: existing } = await sc
          .from("promo_redemptions")
          .select("id")
          .eq("promo_id", promo.id)
          .eq("user_id", user_id)
          .single();
        if (existing) {
          return json({ valid: false, error: "You have already used this promo code" });
        }
      }

      const tierInfo = TIERS[promo.tier];
      const discountedPrice = tierInfo
        ? tierInfo.price_sol * (1 - promo.discount_pct / 100)
        : 0;

      return json({
        valid: true,
        tier: promo.tier,
        discount_pct: promo.discount_pct,
        duration_days: promo.duration_days,
        original_price_sol: tierInfo?.price_sol ?? 0,
        final_price_sol: discountedPrice,
        label: tierInfo?.label ?? promo.tier,
      });
    }

    // ── Redeem promo code (free upgrade) ──
    if (action === "redeem_promo") {
      if (!user_id || !promo_code) return json({ error: "user_id and promo_code required" }, 400);

      const { data: promo } = await sc
        .from("promo_codes")
        .select("*")
        .eq("code", promo_code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (!promo) return json({ error: "Invalid promo code" }, 400);

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return json({ error: "Promo code expired" }, 400);
      }
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return json({ error: "Promo code fully redeemed" }, 400);
      }

      // Check user hasn't used it
      const { data: existing } = await sc
        .from("promo_redemptions")
        .select("id")
        .eq("promo_id", promo.id)
        .eq("user_id", user_id)
        .single();
      if (existing) return json({ error: "Already redeemed" }, 400);

      // Only allow free redemption if discount is 100%
      if (promo.discount_pct < 100) {
        return json({ error: "This promo code gives a discount, not a free upgrade. Use with payment." }, 400);
      }

      const tierInfo = TIERS[promo.tier];
      if (!tierInfo) return json({ error: "Invalid tier in promo" }, 400);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + promo.duration_days);

      // Upsert subscription
      const { data: existingSub } = await sc
        .from("subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .single();

      if (existingSub) {
        await sc
          .from("subscriptions")
          .update({
            tier: promo.tier,
            plan: promo.tier,
            max_agents: tierInfo.max_agents,
            price: 0,
            expires_at: expiresAt.toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        await sc.from("subscriptions").insert({
          user_id,
          tier: promo.tier,
          plan: promo.tier,
          status: "active",
          price: 0,
          max_agents: tierInfo.max_agents,
          expires_at: expiresAt.toISOString(),
        });
      }

      // Record redemption
      await sc.from("promo_redemptions").insert({
        promo_id: promo.id,
        user_id,
      });

      // Increment used_count
      await sc
        .from("promo_codes")
        .update({ used_count: promo.used_count + 1 })
        .eq("id", promo.id);

      return json({
        success: true,
        tier: promo.tier,
        max_agents: tierInfo.max_agents,
        expires_at: expiresAt.toISOString(),
        message: `Upgraded to ${tierInfo.label} for ${promo.duration_days} days!`,
      });
    }

    // ── Purchase with SOL (tx_signature verification) ──
    if (action === "purchase") {
      if (!user_id || !tier) return json({ error: "user_id and tier required" }, 400);

      const tierInfo = TIERS[tier];
      if (!tierInfo) return json({ error: "Invalid tier" }, 400);

      // For SOL payment we verify tx_signature exists
      // In production: verify on-chain via Solana RPC
      if (!tx_signature) {
        return json({ error: "Transaction signature required" }, 400);
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Upsert subscription
      const { data: existingSub } = await sc
        .from("subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .single();

      if (existingSub) {
        await sc
          .from("subscriptions")
          .update({
            tier,
            plan: tier,
            max_agents: tierInfo.max_agents,
            price: tierInfo.price_sol,
            expires_at: expiresAt.toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        await sc.from("subscriptions").insert({
          user_id,
          tier,
          plan: tier,
          status: "active",
          price: tierInfo.price_sol,
          max_agents: tierInfo.max_agents,
          expires_at: expiresAt.toISOString(),
        });
      }

      // Log payment
      await sc.from("payments").insert({
        user_id,
        amount_usdc: tierInfo.price_sol,
        payment_method: "solana",
        reference_type: "subscription",
        reference_id: tx_signature,
        status: "completed",
        tx_hash: tx_signature,
      });

      return json({
        success: true,
        tier,
        max_agents: tierInfo.max_agents,
        expires_at: expiresAt.toISOString(),
      });
    }

    // ── Purchase with MEEET (from agent internal balance) ──
    if (action === "purchase_meeet") {
      if (!user_id || !tier) return json({ error: "user_id and tier required" }, 400);

      const tierInfo = TIERS[tier];
      if (!tierInfo) return json({ error: "Invalid tier" }, 400);

      const agent_id = (await req.json().catch(() => ({}))).agent_id;

      // Get user's first agent
      const { data: agent } = await sc
        .from("agents")
        .select("id, balance_meeet")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!agent) return json({ error: "No agent found. Create an agent first." }, 400);
      if (agent.balance_meeet < tierInfo.price_meeet) {
        return json({
          error: `Insufficient MEEET balance. Need ${tierInfo.price_meeet.toLocaleString()}, have ${agent.balance_meeet.toLocaleString()}.`,
          required: tierInfo.price_meeet,
          current: agent.balance_meeet,
        }, 402);
      }

      // Deduct MEEET
      await sc
        .from("agents")
        .update({ balance_meeet: agent.balance_meeet - tierInfo.price_meeet })
        .eq("id", agent.id);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Upsert subscription
      const { data: existingSub } = await sc
        .from("subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .single();

      if (existingSub) {
        await sc.from("subscriptions").update({
          tier, plan: tier, max_agents: tierInfo.max_agents,
          price: 0, expires_at: expiresAt.toISOString(),
        }).eq("id", existingSub.id);
      } else {
        await sc.from("subscriptions").insert({
          user_id, tier, plan: tier, status: "active",
          price: 0, max_agents: tierInfo.max_agents,
          expires_at: expiresAt.toISOString(),
        });
      }

      return json({
        success: true, tier,
        max_agents: tierInfo.max_agents,
        expires_at: expiresAt.toISOString(),
        meeet_charged: tierInfo.price_meeet,
      });
    }

    // ── Get pricing ──
    if (action === "get_tiers") {
      return json({
        tiers: Object.entries(TIERS).map(([key, val]) => ({
          id: key, ...val,
        })),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("purchase-subscription error:", err);
    return json({ error: err.message }, 500);
  }
});
