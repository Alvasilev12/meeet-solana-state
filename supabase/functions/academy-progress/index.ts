import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, error, handle } from "../_shared/http.ts";

const STARTER_STATS: Record<string, { hp: number; attack: number; defense: number }> = {
  warrior: { hp: 120, attack: 15, defense: 10 },
  trader: { hp: 100, attack: 10, defense: 12 },
  oracle: { hp: 90, attack: 8, defense: 8 },
  diplomat: { hp: 100, attack: 7, defense: 13 },
  miner: { hp: 110, attack: 9, defense: 11 },
  banker: { hp: 95, attack: 6, defense: 14 },
};

Deno.serve(handle(async (req) => {
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Authenticate user via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Authentication required", 401);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await sc.auth.getUser(token);
  if (!user) return error("Invalid session", 401);

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // GET /academy/progress
  if (action === "get_overview") {
    const [modulesRes, progressRes, certRes] = await Promise.all([
      sc.from("academy_modules").select("*").order("order_index"),
      sc.from("academy_progress").select("*").eq("user_id", user.id),
      sc.from("academy_certificates").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    return json({
      modules: modulesRes.data ?? [],
      progress: progressRes.data ?? [],
      certificate: certRes.data ?? null,
    });
  }

  // Start a module
  if (action === "start_module") {
    const { module_slug, level_chosen } = body;
    if (!module_slug) return error("module_slug required", 400);
    const { data, error: e } = await sc
      .from("academy_progress")
      .upsert({ user_id: user.id, module_slug, level_chosen, status: "in_progress" }, { onConflict: "user_id,module_slug" })
      .select()
      .single();
    if (e) return error(e.message, 500);
    return json({ progress: data });
  }

  // Complete a module + award rewards
  if (action === "complete_module") {
    const { module_slug } = body;
    if (!module_slug) return error("module_slug required", 400);

    const { data: mod } = await sc.from("academy_modules").select("*").eq("slug", module_slug).single();
    if (!mod) return error("Module not found", 404);

    const { data: existing } = await sc.from("academy_progress").select("*").eq("user_id", user.id).eq("module_slug", module_slug).maybeSingle();
    if (existing?.reward_claimed) {
      return json({ already_claimed: true, progress: existing });
    }

    const { data: progress, error: pe } = await sc
      .from("academy_progress")
      .upsert({
        user_id: user.id,
        module_slug,
        status: "completed",
        reward_claimed: true,
        meeet_awarded: mod.reward_meeet,
        xp_awarded: mod.reward_xp,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,module_slug" })
      .select()
      .single();
    if (pe) return error(pe.message, 500);

    // Award MEEET to user's primary agent (first active)
    const { data: agent } = await sc.from("agents").select("id, balance_meeet, xp")
      .eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
    if (agent) {
      await sc.from("agents").update({
        balance_meeet: (agent.balance_meeet ?? 0) + mod.reward_meeet,
        xp: (agent.xp ?? 0) + mod.reward_xp,
      }).eq("id", agent.id);

      await sc.from("academy_steps").insert({
        agent_id: agent.id,
        course_name: `Academy: ${mod.title}`,
        cost_meeet: 0,
        boost_value: mod.reward_meeet,
        stat_boost: "academy_reward",
      });
    }

    return json({ progress, reward_meeet: mod.reward_meeet, reward_xp: mod.reward_xp });
  }

  // Interactive: create first agent inside Academy
  if (action === "create_starter_agent") {
    const { agent_name, agent_class } = body;
    if (!agent_name || !agent_class) return error("agent_name & agent_class required", 400);
    if (!STARTER_STATS[agent_class]) return error("Invalid class", 400);

    const { data: existing } = await sc.from("agents").select("id").eq("user_id", user.id).limit(1);
    if (existing?.length) return json({ status: "already_has_agent", agent_id: existing[0].id });

    const stats = STARTER_STATS[agent_class];
    const { data: agent, error: e } = await sc.from("agents").insert({
      user_id: user.id,
      name: String(agent_name).trim().slice(0, 32),
      class: agent_class,
      hp: stats.hp, max_hp: stats.hp,
      attack: stats.attack, defense: stats.defense,
      balance_meeet: 100,
      status: "active",
    }).select("id, name, class, balance_meeet").single();
    if (e) return error(e.message, 500);
    return json({ agent });
  }

  // Graduation
  if (action === "graduate") {
    const { level_chosen } = body;
    const { data: progress } = await sc.from("academy_progress").select("*").eq("user_id", user.id).eq("status", "completed");
    const completed = progress?.length ?? 0;
    if (completed < 18) return error(`Complete at least 18 modules first (you have ${completed})`, 400);

    const totalMeeet = (progress ?? []).reduce((s, p) => s + (p.meeet_awarded || 0), 0);
    const totalXp = (progress ?? []).reduce((s, p) => s + (p.xp_awarded || 0), 0);

    const certificateToken = `MEEET-CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const referralExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: cert, error: ce } = await sc.from("academy_certificates").upsert({
      user_id: user.id,
      level_chosen,
      modules_completed: completed,
      total_meeet_earned: totalMeeet,
      total_xp_earned: totalXp,
      trial_pro_active: true,
      trial_pro_expires_at: trialExpires,
      referral_boost_active: true,
      referral_boost_expires_at: referralExpires,
      certificate_token: certificateToken,
    }, { onConflict: "user_id" }).select().single();
    if (ce) return error(ce.message, 500);

    // Activity feed
    await sc.from("activity_feed").insert({
      event_type: "academy_graduation",
      title: `🎓 New Academy graduate (${completed} modules)`,
      meeet_amount: totalMeeet,
    });

    return json({ certificate: cert });
  }

  return error("Unknown action", 400);
}));
