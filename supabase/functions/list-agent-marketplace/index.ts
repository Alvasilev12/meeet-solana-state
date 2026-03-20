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

    const { agent_id, price_meeet, description } = await req.json();
    if (!agent_id || !price_meeet) return json({ error: "agent_id and price_meeet required" }, 400);

    // Verify ownership
    const { data: agent } = await supabase
      .from("agents")
      .select("id, user_id, name")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();

    if (!agent) return json({ error: "Agent not found or not owned by you" }, 403);

    // Check no active listing exists
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await admin
      .from("agent_marketplace_listings")
      .select("id")
      .eq("agent_id", agent_id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) return json({ error: "Agent already listed" }, 409);

    const { data: listing, error: insertErr } = await admin
      .from("agent_marketplace_listings")
      .insert({
        agent_id,
        seller_user_id: user.id,
        price_meeet: Math.floor(price_meeet),
        description: description || `${agent.name} — available for purchase`,
        is_active: true,
        status: "active",
      })
      .select("id")
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ listing_id: listing.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
