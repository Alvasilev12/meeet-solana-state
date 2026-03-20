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

    const { amount_sol, tx_hash } = await req.json();
    if (!amount_sol || amount_sol <= 0) return json({ error: "Valid amount_sol required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment, error: insertErr } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        amount_sol: amount_sol,
        payment_method: "sol_transfer",
        reference_type: "lp_contribution",
        tx_hash: tx_hash || null,
        status: "recorded",
      })
      .select("id")
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    // Notify president
    const presidentId = Deno.env.get("PRESIDENT_OWNER_USER_ID");
    if (presidentId) {
      await admin.from("notifications").insert({
        user_id: presidentId,
        title: "LP Contribution Received",
        body: `User contributed ${amount_sol} SOL for LP. Payment ID: ${payment.id}`,
        type: "treasury",
      });
    }

    return json({ recorded: true, payment_id: payment.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
