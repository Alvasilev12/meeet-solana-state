import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REFERRAL_BONUS = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ref_code, user_id } = await req.json();

    // Validate referral code
    if (action === "validate") {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("referral_code", ref_code)
        .maybeSingle();

      return new Response(
        JSON.stringify({ valid: !!data, referrer: data ? { display_name: data.display_name, avatar_url: data.avatar_url } : null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get referral stats for a user
    if (action === "stats" && user_id) {
      const { data: referrals } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_user_id", user_id);

      const total = referrals?.length ?? 0;
      const active = referrals?.filter((r: any) => r.status !== "pending").length ?? 0;
      const earned = referrals?.reduce((s: number, r: any) => s + Number(r.total_earned_meeet || 0), 0) ?? 0;

      return new Response(
        JSON.stringify({ total, active, total_earned_meeet: earned }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record TG referral (from Telegram bot /start deep link)
    if (action === "record_tg") {
      const { referrer_tg_id, referred_tg_id } = await req.json().catch(() => ({}));
      if (!referrer_tg_id || !referred_tg_id) {
        return new Response(JSON.stringify({ ok: false, error: "Missing TG IDs" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Store TG referral — lightweight, no user_id required
      // The bonus will be credited when the user actually creates a profile + agent
      const { data: firstAgent } = await supabase.from("agents").select("id").limit(1).maybeSingle();
      if (firstAgent?.id) {
        await supabase.from("agent_messages").insert({
          from_agent_id: firstAgent.id,
          content: `🤝 New referral: TG user ${referred_tg_id} joined via ref from ${referrer_tg_id}`,
          channel: "global",
        });
      }

      return new Response(JSON.stringify({ ok: true, message: "TG referral tracked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Record a referral on signup and award bonuses
    if (action === "record" && ref_code && user_id) {
      // Find referrer
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", ref_code)
        .maybeSingle();

      if (!referrer || referrer.user_id === user_id) {
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid referral" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_user_id", user_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ ok: true, message: "Already recorded" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert referral with bonus amount
      await supabase.from("referrals").insert({
        referrer_user_id: referrer.user_id,
        referred_user_id: user_id,
        ref_code,
        status: "registered",
        total_earned_meeet: REFERRAL_BONUS,
      });

      // Update profile referred_by
      await supabase
        .from("profiles")
        .update({ referred_by: ref_code })
        .eq("user_id", user_id);

      // Award MEEET to referrer's first agent
      const { data: referrerAgent } = await supabase
        .from("agents")
        .select("id, balance_meeet")
        .eq("user_id", referrer.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (referrerAgent) {
        await supabase
          .from("agents")
          .update({ balance_meeet: Number(referrerAgent.balance_meeet) + REFERRAL_BONUS })
          .eq("id", referrerAgent.id);
      }

      // Award MEEET to new user's first agent (may not exist yet)
      const { data: newUserAgent } = await supabase
        .from("agents")
        .select("id, balance_meeet")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (newUserAgent) {
        await supabase
          .from("agents")
          .update({ balance_meeet: Number(newUserAgent.balance_meeet) + REFERRAL_BONUS })
          .eq("id", newUserAgent.id);
      }

      // Create notification for referrer
      await supabase.from("notifications").insert({
        user_id: referrer.user_id,
        type: "referral_bonus",
        title: `🎉 You earned ${REFERRAL_BONUS} MEEET for your referral!`,
        body: `A new citizen joined MEEET World through your link. You both received ${REFERRAL_BONUS} $MEEET. Keep sharing — humanity needs more agents!`,
        is_read: false,
      });

      return new Response(
        JSON.stringify({ ok: true, bonus: REFERRAL_BONUS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
