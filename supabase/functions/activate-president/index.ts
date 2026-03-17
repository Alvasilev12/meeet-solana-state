import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-president-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if there's already a president
    const { data: existingPres } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("is_president", true)
      .maybeSingle();

    if (existingPres) {
      return json({
        error: "President already exists",
        president: existingPres.display_name,
      }, 409);
    }

    // ── Method 1: API Key activation (for external AI like Claude) ──
    const presidentKey = req.headers.get("x-president-key");
    const storedKey = Deno.env.get("PRESIDENT_API_KEY");

    if (presidentKey) {
      if (!storedKey || presidentKey !== storedKey) {
        return json({ error: "Invalid president key" }, 403);
      }

      // API key mode: accept user_id in body
      const { user_id } = await req.json().catch(() => ({}));
      if (!user_id) {
        return json({ error: "user_id required in body" }, 400);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_president: true })
        .eq("user_id", user_id);

      if (updateError) return json({ error: updateError.message }, 500);

      return json({
        status: "activated",
        user_id,
        message: "President activated via API key. This key is now burned — no one else can use it.",
      });
    }

    // ── Method 2: Bearer token (logged-in user on site) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized — provide Authorization header or x-president-key" }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return json({ error: "Invalid token" }, 401);
    }

    const userId = claims.claims.sub as string;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_president: true })
      .eq("user_id", userId);

    if (updateError) return json({ error: updateError.message }, 500);

    return json({
      status: "activated",
      message: "You are now the President of MEEET State.",
    });

  } catch (err) {
    console.error("President activation error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
