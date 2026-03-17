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

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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

    // Only method: require x-president-key header
    const presidentKey = req.headers.get("x-president-key");
    const storedKey = Deno.env.get("PRESIDENT_API_KEY");
    const OWNER_USER_ID = Deno.env.get("PRESIDENT_OWNER_USER_ID");

    if (!presidentKey || !storedKey) {
      return json({ error: "x-president-key header required" }, 401);
    }

    if (!timingSafeEqual(presidentKey, storedKey)) {
      return json({ error: "Invalid president key" }, 403);
    }

    // API key mode: only the designated owner can be president
    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id || !OWNER_USER_ID || user_id !== OWNER_USER_ID) {
      return json({ error: "Only the designated owner can be president" }, 403);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_president: true })
      .eq("user_id", user_id);

    if (updateError) return json({ error: updateError.message }, 500);

    return json({
      status: "activated",
      message: "President activated via API key.",
    });

  } catch (err) {
    console.error("President activation error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
