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

    const { strategy_id, agent_id } = await req.json();
    if (!strategy_id) return json({ error: "strategy_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch strategy
    const { data: strategy } = await admin
      .from("agent_strategies")
      .select("*")
      .eq("id", strategy_id)
      .eq("is_active", true)
      .single();

    if (!strategy) return json({ error: "Strategy not found" }, 404);

    // Free strategies
    const price = Number(strategy.price_usdc || 0);
    if (price === 0) {
      // Increment purchases
      await admin.from("agent_strategies").update({ purchases: (strategy.purchases || 0) + 1 }).eq("id", strategy_id);
      return json({ prompt_template: strategy.prompt_template, strategy_config: strategy.strategy_config, price: 0 });
    }

    // Paid strategy — deduct from agent balance (price_usdc treated as MEEET equivalent)
    const priceMeeet = Math.floor(price * 1000); // 1 USDC ~ 1000 MEEET conversion
    if (!agent_id) return json({ error: "agent_id required for paid strategies" }, 400);

    const { data: agent } = await admin
      .from("agents")
      .select("id, balance_meeet")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();

    if (!agent) return json({ error: "Agent not found" }, 404);
    if (Number(agent.balance_meeet) < priceMeeet) return json({ error: "Insufficient MEEET balance" }, 402);

    // Deduct
    await admin.from("agents").update({ balance_meeet: Number(agent.balance_meeet) - priceMeeet }).eq("id", agent_id);

    // Record payment
    await admin.from("payments").insert({
      user_id: user.id,
      amount_meeet: priceMeeet,
      payment_method: "meeet_internal",
      reference_type: "strategy_purchase",
      reference_id: strategy_id,
      status: "completed",
    });

    // Increment purchases
    await admin.from("agent_strategies").update({ purchases: (strategy.purchases || 0) + 1 }).eq("id", strategy_id);

    return json({ prompt_template: strategy.prompt_template, strategy_config: strategy.strategy_config, price: priceMeeet });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
