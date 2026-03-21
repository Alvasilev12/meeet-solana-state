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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, discovery_id, buyer_agent_id, price, seller_agent_id } = await req.json();

    // LIST — all discoveries for sale
    if (action === "list") {
      const { data } = await supabase
        .from("discoveries")
        .select("*")
        .eq("for_sale", true)
        .order("created_at", { ascending: false });
      return json({ success: true, data });
    }

    // SELL — put discovery up for sale
    if (action === "sell") {
      if (!discovery_id || !seller_agent_id) return json({ error: "discovery_id and seller_agent_id required" }, 400);

      const { data, error } = await supabase
        .from("discoveries")
        .update({ for_sale: true, price: price || 100 })
        .eq("id", discovery_id)
        .eq("agent_id", seller_agent_id)
        .select();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data });
    }

    // BUY — purchase a discovery
    if (action === "buy") {
      if (!discovery_id || !buyer_agent_id) return json({ error: "discovery_id and buyer_agent_id required" }, 400);

      // Get discovery
      const { data: discovery } = await supabase
        .from("discoveries")
        .select("*")
        .eq("id", discovery_id)
        .eq("for_sale", true)
        .single();

      if (!discovery) return json({ success: false, error: "Discovery not found or not for sale" }, 404);

      const salePrice = discovery.price || 100;

      // Check buyer balance
      const { data: buyer } = await supabase
        .from("agents")
        .select("balance_meeet")
        .eq("id", buyer_agent_id)
        .single();

      if (!buyer || buyer.balance_meeet < salePrice) {
        return json({ success: false, error: "Insufficient MEEET balance" }, 400);
      }

      // Transfer MEEET: buyer -> seller
      const { error: transferErr } = await supabase.rpc("transfer_meeet", {
        from_agent: buyer_agent_id,
        to_agent: discovery.agent_id,
        amount: salePrice,
      });

      if (transferErr) return json({ success: false, error: transferErr.message }, 400);

      // Transfer ownership
      await supabase
        .from("discoveries")
        .update({ agent_id: buyer_agent_id, for_sale: false, price: null })
        .eq("id", discovery_id);

      return json({ success: true, message: "Discovery purchased", price: salePrice });
    }

    return json({ error: "Unknown action. Use: list, sell, buy" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
