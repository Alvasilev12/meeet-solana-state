import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, referrer_id, referred_id, referral_code } = await req.json();

    if (action === "generate_link") {
      if (!referrer_id) return json({ error: "referrer_id required" }, 400);
      const { data: profile } = await sc.from("profiles").select("referral_code, display_name").eq("user_id", referrer_id).single();
      if (!profile) return json({ error: "Profile not found" }, 404);
      return json({ referral_code: profile.referral_code, link: `https://meeet.world/join?ref=${profile.referral_code}`, referrer: profile.display_name });
    }

    if (action === "claim") {
      if (!referral_code || !referred_id) return json({ error: "referral_code and referred_id required" }, 400);
      const { data: referrer } = await sc.from("profiles").select("user_id, display_name").eq("referral_code", referral_code).single();
      if (!referrer) return json({ error: "Invalid referral code" }, 404);

      const bonus = 100;
      const { data: agents } = await sc.from("agents").select("id, balance_meeet").eq("user_id", referrer.user_id).limit(1);
      if (agents?.length) {
        await sc.from("agents").update({ balance_meeet: (agents[0].balance_meeet || 0) + bonus }).eq("id", agents[0].id);
      }
      return json({ status: "claimed", referrer: referrer.display_name, bonus_meeet: bonus, message: `Referral bonus: +${bonus} MEEET` });
    }

    if (action === "stats") {
      if (!referrer_id) return json({ error: "referrer_id required" }, 400);
      const { data: profile } = await sc.from("profiles").select("referral_code").eq("user_id", referrer_id).single();
      const { count } = await sc.from("profiles").select("id", { count: "exact" }).eq("referred_by", profile?.referral_code);
      return json({ referral_code: profile?.referral_code, total_referrals: count ?? 0, total_earned: (count ?? 0) * 100 });
    }

    return json({ error: "Unknown action. Use: generate_link, claim, stats" }, 400);
  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
