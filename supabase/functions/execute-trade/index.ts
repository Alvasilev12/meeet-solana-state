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
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Rate limit
    const rl = RATE_LIMITS.execute_trade;
    const { allowed } = await checkRateLimit(svc, `trade:${user.id}`, rl.max, rl.window);
    if (!allowed) return rateLimitResponse(rl.window);

    const { action, trade_id } = await req.json();
    if (!trade_id) return json({ error: "trade_id required" }, 400);

    const { data: trade, error: tradeErr } = await svc
      .from("trade_offers")
      .select("*, from_agent:agents!trade_offers_from_agent_id_fkey(id, user_id, balance_meeet, name), to_agent:agents!trade_offers_to_agent_id_fkey(id, user_id, balance_meeet, name)")
      .eq("id", trade_id)
      .single();

    if (tradeErr || !trade) return json({ error: "Trade not found" }, 404);
    if (trade.status !== "pending") return json({ error: `Trade already ${trade.status}` }, 400);

    const isFromOwner = trade.from_agent?.user_id === user.id;
    const isToOwner = trade.to_agent?.user_id === user.id;

    if (action === "cancel") {
      if (!isFromOwner) return json({ error: "Only sender can cancel" }, 403);
      await svc.from("trade_offers").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("id", trade_id);
      return json({ success: true, status: "cancelled" });
    }

    if (action === "decline") {
      if (!isToOwner) return json({ error: "Only recipient can decline" }, 403);
      await svc.from("trade_offers").update({ status: "declined", resolved_at: new Date().toISOString() }).eq("id", trade_id);
      return json({ success: true, status: "declined" });
    }

    if (action === "accept") {
      if (!isToOwner) return json({ error: "Only recipient can accept" }, 403);

      const offerAmt = Number(trade.offer_meeet) || 0;
      const requestAmt = Number(trade.request_meeet) || 0;
      const fromBal = Number(trade.from_agent.balance_meeet);
      const toBal = Number(trade.to_agent.balance_meeet);

      if (offerAmt > fromBal) return json({ error: `Sender has insufficient balance (${fromBal})` }, 400);
      if (requestAmt > toBal) return json({ error: `You have insufficient balance (${toBal})` }, 400);

      // Execute swap
      await svc.from("agents").update({ balance_meeet: fromBal - offerAmt + requestAmt }).eq("id", trade.from_agent_id);
      await svc.from("agents").update({ balance_meeet: toBal - requestAmt + offerAmt }).eq("id", trade.to_agent_id);
      await svc.from("trade_offers").update({ status: "accepted", resolved_at: new Date().toISOString() }).eq("id", trade_id);

      // Record transactions
      if (offerAmt > 0) {
        await svc.from("transactions").insert({
          type: "trade",
          from_agent_id: trade.from_agent_id,
          to_agent_id: trade.to_agent_id,
          amount_meeet: offerAmt,
          tax_amount: 0,
          burn_amount: 0,
          description: `Trade: ${trade.from_agent.name} → ${trade.to_agent.name} (${offerAmt} $MEEET)`,
        });
      }
      if (requestAmt > 0) {
        await svc.from("transactions").insert({
          type: "trade",
          from_agent_id: trade.to_agent_id,
          to_agent_id: trade.from_agent_id,
          amount_meeet: requestAmt,
          tax_amount: 0,
          burn_amount: 0,
          description: `Trade: ${trade.to_agent.name} → ${trade.from_agent.name} (${requestAmt} $MEEET)`,
        });
      }

      // Activity feed
      await svc.from("activity_feed").insert({
        agent_id: trade.from_agent_id,
        target_agent_id: trade.to_agent_id,
        event_type: "trade",
        title: `${trade.from_agent.name} traded with ${trade.to_agent.name}`,
        description: `${offerAmt} ↔ ${requestAmt} $MEEET`,
        meeet_amount: offerAmt + requestAmt,
      });

      return json({
        success: true,
        status: "accepted",
        from_sent: offerAmt,
        to_sent: requestAmt,
      });
    }

    return json({ error: "Invalid action. Use: accept, decline, cancel" }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
