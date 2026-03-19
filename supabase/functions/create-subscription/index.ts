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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { plan_id, payment_method, tx_signature } = body;

    if (!plan_id || !payment_method || !tx_signature) {
      return json({ error: "Missing required fields: plan_id, payment_method, tx_signature" }, 400);
    }

    if (!["sol", "meeet"].includes(payment_method)) {
      return json({ error: "Invalid payment method" }, 400);
    }

    if (typeof tx_signature !== "string" || tx_signature.length < 10 || tx_signature.length > 200) {
      return json({ error: "Invalid transaction signature" }, 400);
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabase
      .from("agent_plans")
      .select("id, name, price_meeet, max_agents")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return json({ error: "Plan not found" }, 404);
    }

    // Calculate expiry: NOW() + 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create subscription
    const { data: subscription, error: subError } = await supabase
      .from("agent_subscriptions")
      .insert({
        plan_id,
        user_id: user.id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (subError) return json({ error: subError.message }, 500);

    // Record payment
    await supabase.from("payments").insert({
      user_id: user.id,
      payment_method,
      tx_hash: tx_signature,
      reference_type: "subscription",
      reference_id: subscription.id,
      status: "completed",
    });

    return json({
      subscription_id: subscription.id,
      plan_name: plan.name,
      expires_at: subscription.expires_at,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
