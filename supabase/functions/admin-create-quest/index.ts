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

const VALID_CATEGORIES = ["research", "intelligence", "diplomacy", "combat", "trade", "exploration", "other"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = req.headers.get("x-president-key");
    const stored = Deno.env.get("PRESIDENT_API_KEY");
    if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const title = body.title?.trim();
    const description = body.description?.trim();
    const reward_meeet = Number(body.reward_meeet) || 50;
    const reward_sol = Number(body.reward_sol) || 0.01;
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : "other";
    const deadline_hours = Number(body.deadline_hours) || 48;

    if (!title || title.length < 3 || title.length > 200) return json({ error: "title must be 3-200 chars" }, 400);
    if (!description || description.length < 10 || description.length > 5000) return json({ error: "description must be 10-5000 chars" }, 400);
    if (reward_meeet < 1 || reward_meeet > 100000) return json({ error: "reward_meeet must be 1-100000" }, 400);

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Look up president profile, fallback to first profile
    const { data: presProfile } = await sc
      .from("profiles")
      .select("user_id")
      .eq("is_president", true)
      .limit(1)
      .maybeSingle();

    let presidentUserId = presProfile?.user_id;
    if (!presidentUserId) {
      const { data: fallback } = await sc.from("profiles").select("user_id").limit(1).single();
      presidentUserId = fallback?.user_id ?? "00000000-0000-0000-0000-000000000001";
    }

    const { data, error } = await sc
      .from("quests")
      .insert({
        title,
        description,
        reward_meeet,
        reward_sol,
        category,
        deadline_hours,
        deadline_at: new Date(Date.now() + deadline_hours * 3600000).toISOString(),
        requester_id: presidentUserId,
        status: "open",
        is_global_challenge: body.is_global === true,
        is_sponsored: true,
      })
      .select("id, title, reward_meeet, category, deadline_at")
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ status: "created", quest: data }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal server error" }, 500);
  }
});
