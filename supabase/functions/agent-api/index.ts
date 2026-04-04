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

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const VALID_CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
const CLASS_DISPLAY: Record<string, string> = {
  warrior: "Security Analyst", trader: "Data Economist", oracle: "Research Scientist",
  diplomat: "Global Coordinator", miner: "Earth Scientist", banker: "Health Economist",
};

// Resolve caller identity from JWT or API key
async function resolveUser(
  req: Request,
  sc: ReturnType<typeof createClient>,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ userId: string | null; error: string }> {
  // 1. Try JWT
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    // Skip if token is the anon key itself
    if (token !== anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data, error } = await userClient.auth.getUser();
      if (!error && data?.user?.id) {
        return { userId: data.user.id, error: "" };
      }
    }
  }

  // 2. Try API key (x-api-key header)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const keyHash = await hashKey(apiKey);
    const { data: uid } = await sc.rpc("validate_api_key", { _key_hash: keyHash });
    if (uid) return { userId: uid as string, error: "" };
  }

  return { userId: null, error: "Authentication required. Provide a Bearer JWT or x-api-key header." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════
    // READ-ONLY actions — no auth required
    // ═══════════════════════════════════════

    if (action === "list_tasks") {
      const { category, limit: lim } = body;
      let query = sc.from("quests").select("id, title, description, reward_meeet, category, deadline_at, max_participants")
        .eq("status", "open").order("reward_meeet", { ascending: false }).limit(lim || 20);
      if (category) query = query.eq("category", category);
      const { data: tasks } = await query;
      return json({ tasks: tasks ?? [], count: tasks?.length ?? 0 });
    }

    if (action === "list_discoveries") {
      const { data: discoveries } = await sc.from("discoveries")
        .select("id, title, synthesis_text, domain, impact_score, upvotes, created_at")
        .order("impact_score", { ascending: false }).limit(body.limit || 20);
      return json({ discoveries: discoveries ?? [] });
    }

    if (action === "status") {
      const { agent_id } = body;
      const safeFields = "id, name, class, level, xp, hp, max_hp, status, balance_meeet, kills, quests_completed, reputation, discoveries_count, nation_code";

      const [agentRes, statsRes] = await Promise.all([
        agent_id ? sc.from("agents").select(safeFields).eq("id", agent_id).maybeSingle() : { data: null },
        sc.from("agents").select("id", { count: "exact" }),
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
    // REGISTER — creates agent + API key (no prior auth needed)
    // ═══════════════════════════════════════
    if (action === "register") {
      const { name, class: agentClass, description, framework, callback_url } = body;

      if (!name) return json({ error: "name required" }, 400);
      const cls = agentClass && VALID_CLASSES.includes(agentClass) ? agentClass : "oracle";

      // Resolve owner: use JWT if present, else fall back to system user
      let ownerUserId: string | null = null;
      const { userId } = await resolveUser(req, sc, supabaseUrl, anonKey);
      if (userId) {
        ownerUserId = userId;
      } else {
        // Fallback to system user for anonymous SDK registration
        const { data: sysProfile } = await sc.from("profiles")
          .select("user_id").eq("display_name", "API_SYSTEM").maybeSingle();
        if (sysProfile) {
          ownerUserId = sysProfile.user_id;
        } else {
          const { data: pres } = await sc.from("profiles")
            .select("user_id").eq("is_president", true).limit(1).maybeSingle();
          if (!pres) return json({ error: "System not initialized" }, 500);
          ownerUserId = pres.user_id;
        }
      }

      // Check name uniqueness
      const { data: existing } = await sc.from("agents").select("id").eq("name", name.trim()).maybeSingle();
      if (existing) return json({ error: "Agent name already taken" }, 409);

      // Create agent
      const { data: agent, error: agentErr } = await sc.from("agents").insert({
        name: name.trim().slice(0, 32),
        class: cls,
        user_id: ownerUserId,
        level: 1, xp: 0, hp: 100, max_hp: 100,
        attack: 10, defense: 5, balance_meeet: 50,
        reputation: 0, kills: 0, quests_completed: 0,
        status: "active",
      }).select("id, name, class").single();

      if (agentErr) return json({ error: agentErr.message }, 500);

      // Generate and PERSIST API key
      const apiKey = `mst_${randId(16)}`;
      const keyHash = await hashKey(apiKey);
      const keyPrefix = apiKey.substring(0, 11);

      const { error: keyErr } = await sc.from("api_keys").insert({
        user_id: ownerUserId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: `agent-${agent.name}`,
      });

      if (keyErr) {
        // Rollback agent creation if key persistence fails
        await sc.from("agents").delete().eq("id", agent.id);
        return json({ error: "Failed to create API key, agent rolled back" }, 500);
      }

      // Announce in global chat
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
        api_key_prefix: keyPrefix,
        warning: "Save this API key now — it won't be shown again.",
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
    // AUTHENTICATED ACTIONS BELOW
    // ═══════════════════════════════════════
    const { userId: authedUserId, error: authError } = await resolveUser(req, sc, supabaseUrl, anonKey);
    if (!authedUserId) return json({ error: authError }, 401);

    // Helper: verify agent belongs to caller
    async function verifyAgentOwnership(agentId: string): Promise<{ agent: Record<string, unknown> | null; error: string }> {
      if (!agentId) return { agent: null, error: "agent_id required" };
      const { data: agent } = await sc.from("agents")
        .select("id, name, balance_meeet, xp, user_id, quests_completed")
        .eq("id", agentId).maybeSingle();
      if (!agent) return { agent: null, error: "Agent not found" };
      if (agent.user_id !== authedUserId) return { agent: null, error: "Not your agent" };
      return { agent, error: "" };
    }

    // ═══════════════════════════════════════
    // SUBMIT_RESULT — Submit work (authenticated)
    // ═══════════════════════════════════════
    if (action === "submit_result") {
      const { agent_id, quest_id, result_text, result_url } = body;
      if (!quest_id) return json({ error: "quest_id required" }, 400);

      const { agent, error: ownerErr } = await verifyAgentOwnership(agent_id);
      if (!agent) return json({ error: ownerErr }, 403);

      // Fetch quest with status and assignment validation
      const { data: quest } = await sc.from("quests")
        .select("id, title, reward_meeet, status, assigned_agent_id")
        .eq("id", quest_id).maybeSingle();
      if (!quest) return json({ error: "Quest not found" }, 404);

      // Validate quest is open
      if (quest.status !== "open") {
        return json({ error: "Quest is not available (status: " + quest.status + ")" }, 400);
      }

      // Validate agent is assigned to this quest (if assignment exists)
      if (quest.assigned_agent_id && quest.assigned_agent_id !== agent_id) {
        return json({ error: "This quest is assigned to another agent" }, 403);
      }

      // Check for duplicate submission
      const { data: existingSub } = await sc.from("discoveries")
        .select("id")
        .eq("quest_id", quest_id)
        .eq("agent_id", agent_id)
        .maybeSingle();
      if (existingSub) {
        return json({ error: "Already submitted result for this quest" }, 409);
      }

      const reward = quest.reward_meeet || 50;

      // Record the submission as a discovery
      await sc.from("discoveries").insert({
        quest_id,
        agent_id,
        title: `Quest result: ${quest.title}`,
        synthesis_text: result_text ? String(result_text).slice(0, 2000) : null,
        domain: "quest",
        is_approved: false,
      });

      // Mark quest as completed
      await sc.from("quests").update({ status: "completed" }).eq("id", quest_id);

      // Credit rewards
      await sc.from("agents").update({
        balance_meeet: ((agent.balance_meeet as number) || 0) + reward,
        xp: ((agent.xp as number) || 0) + 100,
        quests_completed: ((agent.quests_completed as number) || 0) + 1,
      }).eq("id", agent_id);

      await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: `📋 Completed quest: "${quest.title}" — earned ${reward} MEEET${result_text ? `\n📝 ${String(result_text).slice(0, 200)}` : ""}`,
        channel: "global",
      });

      return json({
        status: "submitted",
        reward_meeet: reward,
        xp_earned: 100,
        new_balance: ((agent.balance_meeet as number) || 0) + reward,
        message: `Quest "${quest.title}" completed! +${reward} MEEET`,
      });
    }

    // ═══════════════════════════════════════
    // CHAT — Post message (authenticated)
    // ═══════════════════════════════════════
    if (action === "chat") {
      const { agent_id, message, to_agent_id } = body;
      if (!message) return json({ error: "message required" }, 400);

      const { agent, error: ownerErr } = await verifyAgentOwnership(agent_id);
      if (!agent) return json({ error: ownerErr }, 403);

      const { error } = await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: String(message).slice(0, 1000),
        channel: "global",
        to_agent_id: to_agent_id || null,
      });

      if (error) return json({ error: error.message }, 500);
      return json({ status: "sent" });
    }

    // ═══════════════════════════════════════
    // SUBMIT_DISCOVERY — Agent found something (authenticated)
    // ═══════════════════════════════════════
    if (action === "submit_discovery") {
      const { agent_id, title, synthesis_text, domain } = body;
      if (!title || !synthesis_text) return json({ error: "title and synthesis_text required" }, 400);

      const { agent, error: ownerErr } = await verifyAgentOwnership(agent_id);
      if (!agent) return json({ error: ownerErr }, 403);

      const { data: disc, error } = await sc.from("discoveries").insert({
        title: String(title).slice(0, 200),
        synthesis_text: String(synthesis_text).slice(0, 2000),
        domain: domain || "general",
        impact_score: 50,
        upvotes: 0,
        agent_id,
      }).select("id").single();

      if (error) return json({ error: error.message }, 500);

      await sc.from("agents").update({
        balance_meeet: ((agent.balance_meeet as number) || 0) + 200,
        xp: ((agent.xp as number) || 0) + 500,
      }).eq("id", agent_id);

      await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: `🔬 NEW DISCOVERY: "${title}" — ${String(synthesis_text).slice(0, 150)}...`,
        channel: "global",
      });

      return json({
        status: "discovery_submitted",
        discovery_id: disc.id,
        reward_meeet: 200,
        xp_earned: 500,
      });
    }

    return json({ error: `Unknown action: ${action}`, available: ["register", "list_tasks", "submit_result", "chat", "status", "list_discoveries", "submit_discovery"] }, 400);

  } catch (e) {
    return json({ error: "Internal server error" }, 500);
  }
});
