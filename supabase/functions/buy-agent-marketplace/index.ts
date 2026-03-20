import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TREASURY_FEE_PCT = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { listing_id, buyer_agent_id } = await req.json();
    if (!listing_id) return json({ error: "listing_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch listing
    const { data: listing } = await admin
      .from("agent_marketplace_listings")
      .select("id, agent_id, seller_user_id, price_meeet, is_active, status")
      .eq("id", listing_id)
      .single();

    if (!listing) return json({ error: "Listing not found" }, 404);
    if (!listing.is_active || listing.status !== "active") return json({ error: "Listing no longer active" }, 410);
    if (listing.seller_user_id === user.id) return json({ error: "Cannot buy your own agent" }, 400);

    const price = Number(listing.price_meeet);

    // If buyer_agent_id provided, deduct from that agent's balance
    if (buyer_agent_id) {
      const { data: buyerAgent } = await admin
        .from("agents")
        .select("id, balance_meeet")
        .eq("id", buyer_agent_id)
        .eq("user_id", user.id)
        .single();

      if (!buyerAgent) return json({ error: "Buyer agent not found" }, 404);
      if (Number(buyerAgent.balance_meeet) < price) return json({ error: "Insufficient MEEET balance" }, 402);

      // Deduct from buyer
      await admin.from("agents").update({ balance_meeet: Number(buyerAgent.balance_meeet) - price }).eq("id", buyer_agent_id);
    }

    const sellerShare = Math.floor(price * (100 - TREASURY_FEE_PCT) / 100);
    const treasuryShare = price - sellerShare;

    // Credit seller's first agent or create a payment record
    const { data: sellerAgents } = await admin
      .from("agents")
      .select("id, balance_meeet")
      .eq("user_id", listing.seller_user_id)
      .limit(1);

    if (sellerAgents && sellerAgents.length > 0) {
      await admin.from("agents").update({
        balance_meeet: Number(sellerAgents[0].balance_meeet) + sellerShare,
      }).eq("id", sellerAgents[0].id);
    }

    // Treasury fee
    await admin.from("payments").insert({
      user_id: user.id,
      amount_meeet: treasuryShare,
      payment_method: "meeet_internal",
      reference_type: "marketplace_fee",
      reference_id: listing_id,
      status: "completed",
    });

    // Transfer agent ownership
    await admin.from("agents").update({ user_id: user.id }).eq("id", listing.agent_id);

    // Deactivate listing
    await admin.from("agent_marketplace_listings").update({
      is_active: false,
      status: "sold",
      buyer_id: user.id,
      sold_at: new Date().toISOString(),
    }).eq("id", listing_id);

    // Notify seller
    await admin.from("notifications").insert({
      user_id: listing.seller_user_id,
      title: "Agent Sold!",
      body: `Your agent was purchased for ${price} $MEEET. You received ${sellerShare} $MEEET (${TREASURY_FEE_PCT}% fee).`,
      type: "marketplace",
      reference_id: listing.agent_id,
    });

    // Notify buyer
    await admin.from("notifications").insert({
      user_id: user.id,
      title: "Agent Purchased!",
      body: `You successfully purchased an agent for ${price} $MEEET.`,
      type: "marketplace",
      reference_id: listing.agent_id,
    });

    // Activity feed
    await admin.from("activity_feed").insert({
      event_type: "marketplace_sale",
      title: `Agent sold for ${price} $MEEET`,
      agent_id: listing.agent_id,
      meeet_amount: price,
    });

    return json({ success: true, agent_id: listing.agent_id, price, fee: treasuryShare });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
