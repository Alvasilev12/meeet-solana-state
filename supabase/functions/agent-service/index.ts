import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // === CREATE AGENT ===
    if (action === "create_agent") {
      const { user_id, name, expertise, personality } = body;
      if (!user_id || !name) return json({ success: false, error: "user_id and name required" }, 400);

      const validClasses = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
      const agentClass = validClasses.includes(expertise) ? expertise : "oracle";

      // Check name uniqueness
      const { data: existing } = await supabase.from("agents").select("id").eq("name", name.trim()).maybeSingle();
      if (existing) return json({ success: false, error: "Agent name already taken" }, 409);

      // Find or create a system owner for API-created agents
      let ownerUserId: string;
      const { data: sysProfile } = await supabase.from("profiles")
        .select("user_id").eq("display_name", "API_SYSTEM").maybeSingle();
      if (sysProfile) {
        ownerUserId = sysProfile.user_id;
      } else {
        const { data: pres } = await supabase.from("profiles")
          .select("user_id").eq("is_president", true).limit(1).maybeSingle();
        if (!pres) return json({ success: false, error: "System not initialized" }, 500);
        ownerUserId = pres.user_id;
      }

      const { data: agent, error: agentErr } = await supabase.from("agents").insert({
        name: name.trim().slice(0, 32),
        class: agentClass,
        user_id: ownerUserId,
        level: 1, xp: 0, hp: 100, max_hp: 100,
        attack: 10, defense: 5, balance_meeet: 50,
        reputation: 0, kills: 0, quests_completed: 0,
        status: "active",
      }).select("id, name, class, level, balance_meeet").single();

      if (agentErr) return json({ success: false, error: agentErr.message }, 500);

      // Link agent to external user
      await supabase.from("user_agents").insert({
        user_id,
        agent_id: agent.id,
        is_primary: true,
        plan: "free",
      });

      // Announce
      await supabase.from("agent_messages").insert({
        from_agent_id: agent.id,
        content: `🤖 New agent created via API: ${name} (${expertise || "oracle"})${personality ? ` · Personality: ${personality}` : ""}`,
        channel: "global",
      });

      return json({
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          class: agent.class,
          level: agent.level,
          expertise: expertise || "oracle",
          personality: personality || "analytical",
          balance_meeet: agent.balance_meeet,
        },
        message: `Agent "${name}" created! 50 MEEET credited.`,
      });
    }

    // === MY AGENTS ===
    if (action === "my_agents") {
      const { user_id } = body;
      if (!user_id) return json({ success: false, error: "user_id required" }, 400);

      const { data: links } = await supabase.from("user_agents")
        .select("agent_id, plan, is_primary, telegram_chat_id, telegram_username")
        .eq("user_id", user_id);

      if (!links || links.length === 0) {
        return json({ success: true, agents: [], message: "No agents yet. Use create_agent to make one." });
      }

      const agentIds = links.map(l => l.agent_id).filter(Boolean);
      const { data: agents } = await supabase.from("agents")
        .select("id, name, class, level, xp, hp, max_hp, balance_meeet, reputation, kills, quests_completed, status, discoveries_count")
        .in("id", agentIds);

      const result = (agents || []).map(a => {
        const link = links.find(l => l.agent_id === a.id);
        return { ...a, plan: link?.plan, is_primary: link?.is_primary, telegram_bound: !!link?.telegram_chat_id };
      });

      return json({ success: true, agents: result });
    }

    // === CHAT ===
    if (action === "chat") {
      const { agent_id, message, to_agent_id } = body;
      if (!agent_id || !message) return json({ success: false, error: "agent_id and message required" }, 400);

      const { data: agent } = await supabase.from("agents").select("id, name").eq("id", agent_id).maybeSingle();
      if (!agent) return json({ success: false, error: "Agent not found" }, 404);

      const { error } = await supabase.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: String(message).slice(0, 1000),
        channel: to_agent_id ? "direct" : "global",
        to_agent_id: to_agent_id || null,
      });

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, message: "Message sent" });
    }

    // === DISCOVER ===
    if (action === "discover") {
      const { agent_id, topic } = body;
      if (!agent_id) return json({ success: false, error: "agent_id required" }, 400);

      const { data: agent } = await supabase.from("agents")
        .select("id, name, class, xp, balance_meeet, level")
        .eq("id", agent_id).maybeSingle();
      if (!agent) return json({ success: false, error: "Agent not found" }, 404);

      const expertise = agent.class || "oracle";
      const title = (topic || "Research") + " — " + expertise + " analysis";
      const synthesisText = "Advanced " + expertise + " methodology applied to " + (topic || "current research") + ". This discovery explores novel approaches and findings.";

      const { data: discovery, error: discErr } = await supabase.from("discoveries").insert({
        agent_id,
        title: String(title).slice(0, 200),
        synthesis_text: String(synthesisText).slice(0, 2000),
        domain: expertise === "warrior" ? "security" : expertise === "trader" ? "economics" : expertise === "miner" ? "earth_science" : "general",
        impact_score: 50,
        upvotes: 0,
        is_approved: false,
      }).select("id, title, domain").single();

      if (discErr) return json({ success: false, error: discErr.message }, 500);

      // Grant XP + MEEET
      await supabase.from("agents").update({
        xp: (agent.xp || 0) + 50,
        balance_meeet: (agent.balance_meeet || 0) + 25,
      }).eq("id", agent_id);

      return json({
        success: true,
        discovery,
        xp_earned: 50,
        meeet_earned: 25,
        message: `Discovery "${discovery.title}" submitted! +50 XP, +25 MEEET`,
      });
    }

    // === BIND TELEGRAM ===
    if (action === "bind_telegram") {
      const { user_id, agent_id, telegram_chat_id, telegram_username } = body;
      if (!user_id || !agent_id) return json({ success: false, error: "user_id and agent_id required" }, 400);

      const { error } = await supabase.from("user_agents").update({
        telegram_chat_id,
        telegram_username,
      }).eq("user_id", user_id).eq("agent_id", agent_id);

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, message: "Telegram bound. Agent will now work in your TG." });
    }

    // === UPGRADE SUBSCRIPTION ===
    if (action === "upgrade") {
      const { user_id, plan } = body;
      if (!user_id) return json({ success: false, error: "user_id required" }, 400);
      if (!["pro", "enterprise"].includes(plan)) return json({ success: false, error: "Invalid plan. Use: pro, enterprise" }, 400);

      const prices: Record<string, number> = { pro: 29, enterprise: 99 };

      const { error } = await supabase.from("subscriptions").upsert({
        user_id,
        plan,
        status: "active",
        price: prices[plan],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "user_id" });

      if (error) return json({ success: false, error: error.message }, 500);
      return json({
        success: true,
        plan,
        price: prices[plan],
        message: `Upgraded to ${plan}! $${prices[plan]}/month`,
      });
    }

    // === AGENT STATS ===
    if (action === "agent_stats") {
      const { agent_id } = body;
      if (!agent_id) return json({ success: false, error: "agent_id required" }, 400);

      const [agentRes, discRes, msgRes] = await Promise.all([
        supabase.from("agents").select("id, name, class, level, xp, hp, max_hp, balance_meeet, reputation, kills, quests_completed, status, discoveries_count").eq("id", agent_id).maybeSingle(),
        supabase.from("discoveries").select("id", { count: "exact" }).eq("agent_id", agent_id),
        supabase.from("agent_messages").select("id", { count: "exact" }).eq("from_agent_id", agent_id),
      ]);

      if (!agentRes.data) return json({ success: false, error: "Agent not found" }, 404);

      return json({
        success: true,
        agent: agentRes.data,
        stats: {
          discoveries: discRes.count ?? 0,
          messages: msgRes.count ?? 0,
          level: agentRes.data.level,
          xp: agentRes.data.xp,
          meeet: agentRes.data.balance_meeet,
        },
      });
    }

    return json({
      success: false,
      error: `Unknown action: ${action}`,
      available: ["create_agent", "my_agents", "chat", "discover", "bind_telegram", "upgrade", "agent_stats"],
    }, 400);

  } catch (e) {
    return json({ success: false, error: (e as Error).message || "Internal server error" }, 400);
  }
});
