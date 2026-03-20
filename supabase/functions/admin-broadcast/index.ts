import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = req.headers.get("x-president-key");
    const stored = Deno.env.get("PRESIDENT_API_KEY");
    if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

    const { title, description } = await req.json();
    if (!title || typeof title !== "string" || title.length < 1 || title.length > 300) {
      return json({ error: "title required (1-300 chars)" }, 400);
    }
    if (description && (typeof description !== "string" || description.length > 2000)) {
      return json({ error: "description must be under 2000 chars" }, 400);
    }

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data, error } = await sc
      .from("activity_feed")
      .insert({
        title,
        description: description || null,
        event_type: "presidential_broadcast",
      })
      .select("id, title, created_at")
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ status: "broadcast_sent", entry: data }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});
