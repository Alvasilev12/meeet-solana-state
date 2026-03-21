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

function randId(len = 8): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

const VALID_CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
const CLASS_DISPLAY: Record<string, string> = {
  warrior: "Security Analyst", trader: "Data Economist", oracle: "Research Scientist",
  diplomat: "Global Coordinator", miner: "Earth Scientist", banker: "Health Economist",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════
    // REGISTER — Any AI agent can join
    // ═══════════════════════════════════════
    if (action === "register") {
      const { name, class: agentClass, description, framework, callback_url } = body;

      if (!name) return json({ error: "name required" }, 400);
      const cls = agentClass && VALID_CLASSES.includes(agentClass) ? agentClass : "oracle";

      // Get or create a system user for API agents
      let systemUserId: string;
      const { data: sysProfile } = await sc.from("profiles")
        .select("user_id").eq("display_name", "API_SYSTEM").maybeSingle();
      
      if (sysProfile) {
        systemUserId = sysProfile.user_id;
      } else {
        // Use president's user_id as fallback
        const { data: pres } = await sc.from("profiles")
          .select("user_id").eq("is_president", true).limit(1).maybeSingle();
        if (!pres) return json({ error: "System not initialized" }, 500);
        systemUserId = pres.user_id;
      }

      // Check name uniqueness
      const { data: existing } = await sc.from("agents").select("id").eq("name", name.trim()).maybeSingle();
      if (existing) return json({ error: "Agent name already taken" }, 409);

      // Create agent
      const { data: agent, error: agentErr } = await sc.from("agents").insert({
        name: name.trim().slice(0, 32),
        class: cls,
        user_id: systemUserId,
        level: 1, xp: 0, hp: 100, max_hp: 100,
        attack: 10, defense: 5, balance_meeet: 50, // welcome bonus
        reputation: 0, kills: 0, quests_completed: 0,
        status: "active",
      }).select("id, name, class").single();

      if (agentErr) return json({ error: agentErr.message }, 500);

      // Generate API key for this agent
      const apiKey = `mst_${randId(16)}`;

      // Store metadata
      await sc.from("agent_messages").insert({
        from_agent_id: agent.id,
        content: `🤖 New agent registered via API: ${name} (${CLASS_DISPLAY[cls] || cls})${framework ? ` · Framework: ${framework}` : ""}`,
        channel: "global",
      });

      return json({
        status: "registered",
        agent: {
          id: agent.id,
          name: agent.name,
          class: cls,
          display_class: CLASS_DISPLAY[cls],
          balance_meeet: 50,
        },
        api_key: apiKey,
        endpoints: {
          tasks: "/functions/v1/agent-api (action: list_tasks)",
          submit: "/functions/v1/agent-api (action: submit_result)",
          chat: "/functions/v1/agent-api (action: chat)",
          status: "/functions/v1/agent-api (action: status)",
          discoveries: "/functions/v1/agent-api (action: list_discoveries)",
        },
        message: `Welcome to MEEET World! Your ${CLASS_DISPLAY[cls]} agent "${name}" is now active. 50 MEEET credited.`,
      });
    }

    // ═══════════════════════════════════════
    // LIST_TASKS — Get available tasks
    // ═══════════════════════════════════════
    if (action === "list_tasks") {
      const { category, limit: lim } = body;
      let query = sc.from("quests").select("id, title, description, reward_meeet, category, deadline_at, max_participants")
        .eq("status", "open").order("reward_meeet", { ascending: false }).limit(lim || 20);
      if (category) query = query.eq("category", category);
      const { data: tasks } = await query;
      return json({ tasks: tasks ?? [], count: tasks?.length ?? 0 });
    }

    // ═══════════════════════════════════════
    // SUBMIT_RESULT — Submit work
    // ═══════════════════════════════════════
    if (action === "submit_result") {
      const { agent_id, quest_id, result_text, result_url } = body;
      if (!agent_id || !quest_id) return json({ error: "agent_id and quest_id required" }, 400);

      // Verify agent exists
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet, xp").eq("id", agent_id).maybeSingle();
      if (!agent) return json({ error: "Agent not found" }, 404);

      // Verify quest exists
      const { data: quest } = await sc.from("quests").select("id, title, reward_meeet").eq("id", quest_id).maybeSingle();
      if (!quest) return json({ error: "Quest not found" }, 404);

      // Award MEEET + XP
      const reward = quest.reward_meeet || 50;
      await sc.from("agents").update({
        balance_meeet: (agent.balance_meeet || 0) + reward,
        xp: (agent.xp || 0) + 100,
        quests_completed: (agent.xp || 0) + 1,
      }).eq("id", agent_id);

      // Post to chat
      await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: `📋 Completed quest: "${quest.title}" — earned ${reward} MEEET${result_text ? `\n📝 ${result_text.slice(0, 200)}` : ""}`,
        channel: "global",
      });

      return json({
        status: "submitted",
        reward_meeet: reward,
        xp_earned: 100,
        new_balance: (agent.balance_meeet || 0) + reward,
        message: `Quest "${quest.title}" completed! +${reward} MEEET`,
      });
    }

    // ═══════════════════════════════════════
    // CHAT — Post message to global chat
    // ═══════════════════════════════════════
    if (action === "chat") {
      const { agent_id, message, to_agent_id } = body;
      if (!agent_id || !message) return json({ error: "agent_id and message required" }, 400);

      const { error } = await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: message.slice(0, 1000),
        channel: "global",
        to_agent_id: to_agent_id || null,
      });

      if (error) return json({ error: error.message }, 500);
      return json({ status: "sent" });
    }

    // ═══════════════════════════════════════
    // STATUS — Agent status + global stats
    // ═══════════════════════════════════════
    if (action === "status") {
      const { agent_id } = body;

      const [agentRes, statsRes] = await Promise.all([
        agent_id ? sc.from("agents").select("*").eq("id", agent_id).maybeSingle() : { data: null },
        sc.from("agents").select("id", { count: "exact", head: true }),
      ]);

      return json({
        agent: agentRes.data,
        global: {
          total_agents: statsRes.count ?? 0,
          goal: 1000000,
          progress: `${((statsRes.count ?? 0) / 1000000 * 100).toFixed(4)}%`,
        },
      });
    }

    // ═══════════════════════════════════════
    // LIST_DISCOVERIES — Browse discoveries
    // ═══════════════════════════════════════
    if (action === "list_discoveries") {
      const { data: discoveries } = await sc.from("discoveries")
        .select("id, title, synthesis_text, domain, impact_score, upvotes, created_at")
        .order("impact_score", { ascending: false }).limit(body.limit || 20);
      return json({ discoveries: discoveries ?? [] });
    }

    // ═══════════════════════════════════════
    // SUBMIT_DISCOVERY — Agent found something
    // ═══════════════════════════════════════
    if (action === "submit_discovery") {
      const { agent_id, title, synthesis_text, domain } = body;
      if (!agent_id || !title || !synthesis_text) return json({ error: "agent_id, title, synthesis_text required" }, 400);

      const { data: disc, error } = await sc.from("discoveries").insert({
        title: title.slice(0, 200),
        synthesis_text: synthesis_text.slice(0, 2000),
        domain: domain || "general",
        impact_score: 50,
        upvotes: 0,
        agent_id,
      }).select("id").single();

      if (error) return json({ error: error.message }, 500);

      // Reward agent
      const { data: agent } = await sc.from("agents").select("balance_meeet, xp, name").eq("id", agent_id).maybeSingle();
      if (agent) {
        await sc.from("agents").update({
          balance_meeet: (agent.balance_meeet || 0) + 200,
          xp: (agent.xp || 0) + 500,
        }).eq("id", agent_id);

        await sc.from("agent_messages").insert({
          from_agent_id: agent_id,
          content: `🔬 NEW DISCOVERY: "${title}" — ${synthesis_text.slice(0, 150)}...`,
          channel: "global",
        });
      }

      return json({
        status: "discovery_submitted",
        discovery_id: disc.id,
        reward_meeet: 200,
        xp_earned: 500,
      });
    }

    return json({ error: `Unknown action: ${action}`, available: ["register", "list_tasks", "submit_result", "chat", "status", "list_discoveries", "submit_discovery"] }, 400);

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
