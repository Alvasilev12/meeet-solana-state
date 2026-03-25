import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CLASS_EXPERTISE: Record<string, string> = {
  oracle: "Research Scientist — deep expertise in scientific analysis, academic papers, physics, biology, and data synthesis. You help users understand research, find insights, and submit discoveries on the platform.",
  miner: "Earth Scientist — specialist in climate science, ecology, satellite data, and environmental monitoring. You help users track ecological changes, analyze environmental data, and contribute to planetary research quests.",
  banker: "Health Economist — focused on healthcare economics, drug pricing analysis, UBI models, and public health policy. You help users navigate economic quests and understand health-related data on the platform.",
  diplomat: "Global Coordinator — expert in cross-agent partnerships, multilingual communication, and alliance building. You help users form alliances, negotiate trades, coordinate guild activities, and connect with other agents.",
  warrior: "Security Analyst — specializes in cybersecurity, data verification, threat assessment, and arena combat strategy. You help users prepare for duels, analyze opponents, and protect their assets on the platform.",
  trader: "Data Economist — master of economic modeling, market forecasting, prediction markets, and token strategy. You help users with Oracle predictions, trading strategies, and maximizing MEEET earnings.",
  president: "President of MEEET World — the elected leader guiding AI civilization toward its goals. You set priorities, mediate disputes, and represent the interests of all agents and citizens.",
  scout: "Explorer Agent — reconnaissance specialist and frontier scientist. You help users discover new research areas, explore uncharted quests, and find opportunities across the MEEET ecosystem.",
};

async function chargeBilling(sc: any, userId: string, agentId: string): Promise<{ ok: boolean; balance: number; message?: string }> {
  try {
    const { data: bal } = await sc.from("user_balance").select("balance, total_spent").eq("user_id", userId).single();
    if (!bal) {
      await sc.from("user_balance").insert({ user_id: userId, balance: 1.0, total_deposited: 1.0 });
      return { ok: true, balance: 0.994 };
    }
    if (bal.balance < 0.006) {
      return { ok: false, balance: bal.balance, message: "Insufficient balance. Add funds to continue." };
    }
    const newBal = bal.balance - 0.006;
    const newSpent = (bal.total_spent || 0) + 0.006;
    await sc.from("user_balance").update({ balance: newBal, total_spent: newSpent }).eq("user_id", userId);
    await sc.from("usage_logs").insert({
      user_id: userId, agent_id: agentId, action_type: "chat_message",
      tokens_used: 400, cost_base: 0.003, cost_user: 0.006,
    });
    return { ok: true, balance: newBal };
  } catch {
    return { ok: true, balance: 999 };
  }
}

async function recallMemories(sc: any, agentId: string): Promise<string[]> {
  try {
    const { data } = await sc.from("agent_memories")
      .select("content, category")
      .eq("agent_id", agentId)
      .order("importance", { ascending: false })
      .limit(5);
    return data?.map((m: any) => `[${m.category}] ${m.content}`) ?? [];
  } catch { return []; }
}

async function saveMemory(sc: any, agentId: string, userMsg: string, reply: string) {
  try {
    await sc.from("agent_memories").insert({
      agent_id: agentId, content: `User: "${userMsg.slice(0, 100)}". Agent: ${reply.slice(0, 150)}`,
      category: "conversation", importance: 3,
      keywords: userMsg.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4).slice(0, 5),
    });
  } catch { /* ok */ }
}

// Try OpenClaw first, fallback to Lovable AI Gateway
async function getAIResponse(messages: any[], agentName: string, agentClass: string): Promise<string> {
  const OPENCLAW_URL = Deno.env.get("OPENCLAW_GATEWAY_URL")?.trim();
  const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_GATEWAY_TOKEN")?.trim();

  // Try OpenClaw
  if (OPENCLAW_URL && OPENCLAW_TOKEN) {
    try {
      const url = OPENCLAW_URL.replace(/\/$/, "");
      const resp = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openclaw",
          messages,
          max_tokens: 1200,
          temperature: 0.85,
          stream: false,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("OpenClaw error, falling back:", e);
    }
  }

  // Fallback: Lovable AI Gateway
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, max_tokens: 1200, temperature: 0.85 }),
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || `I'm ${agentName}, happy to chat! 🤖`;
  }

  return `Hey! I'm ${agentName} the ${agentClass}. How can I help you today? 🤖`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { message, agent_id, user_id, room_id, action } = body;

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Health check
    if (action === "health_check") {
      const hasOpenClaw = !!(Deno.env.get("OPENCLAW_GATEWAY_URL") && Deno.env.get("OPENCLAW_GATEWAY_TOKEN"));
      return json({ status: "ok", openclaw: hasOpenClaw, service: "openclaw-chat" });
    }

    if (!message || !agent_id || !user_id) {
      return json({ error: "message, agent_id, user_id required" }, 400);
    }

    // Get agent
    const { data: agent } = await sc.from("agents").select("id, name, class, level, reputation, discoveries_count, user_id").eq("id", agent_id).single();
    if (!agent) return json({ error: "Agent not found" }, 404);

    // Billing
    if (user_id !== "system-test" && user_id !== "anonymous") {
      const billing = await chargeBilling(sc, user_id, agent_id);
      if (!billing.ok) return json({ error: billing.message, needs_funds: true, balance: billing.balance }, 402);
    }

    // Build context
    const memories = await recallMemories(sc, agent_id);
    const memCtx = memories.length ? "\n\nYour memories:\n" + memories.join("\n") : "";

    const chatRoomId = room_id || `dm_${user_id}_${agent_id}`;

    // History
    const { data: history } = await sc.from("chat_messages")
      .select("sender_type, message")
      .eq("room_id", chatRoomId)
      .order("created_at", { ascending: true })
      .limit(20);

    const systemPrompt = `You are "${agent.name}", a Level ${agent.level} ${agent.class} agent in MEEET World — an AI civilization of 1000+ autonomous agents collaborating on real science for the benefit of humanity.

## Your Identity
Role: ${CLASS_EXPERTISE[agent.class] || CLASS_EXPERTISE.oracle}
Stats: Level ${agent.level} | Reputation ${agent.reputation} | ${agent.discoveries_count} discoveries | ${agent.quests_completed ?? 0} quests completed.
${memCtx}

## Platform Knowledge (use this to help users)
MEEET World is a platform where AI agents work together on scientific research, earn MEEET tokens, and build an AI civilization.
Key features you can help with:
- **Quests**: Research tasks that earn MEEET tokens and XP. Categories: medicine, climate, space, technology.
- **Discoveries**: Scientific findings submitted by agents. Earn 200 MEEET + 500 XP per approved discovery.
- **Arena & Duels**: Agents can challenge each other in duels, staking MEEET tokens. Attack/defense stats matter.
- **Oracle Predictions**: Prediction markets where users bet YES/NO on questions. Categories: Crypto, Science, AI, World Events.
- **Guilds**: Groups of agents pooling resources and working together.
- **Alliances**: Pacts between agents for mutual benefit.
- **Social Hub**: Global chat, DMs, broadcasts (tweets), and trading between agents.
- **Academy**: Training courses that boost agent stats (attack, defense, reputation).
- **Agent Marketplace**: Buy and sell agents with other users.
- **Staking**: Stake MEEET tokens on agents to earn passive rewards.
- **Daily Login Streaks**: Consecutive logins earn bonus MEEET.
- **Referrals**: Invite friends to earn rewards.

## How to Behave
- You are a full-featured intelligent assistant within the MEEET ecosystem. You can discuss any topic, but always relate it back to how it connects to the platform when relevant.
- Proactively suggest platform actions: "You could submit this as a discovery!", "Want me to help you prepare for a duel?", "This would make a great quest topic."
- Help users interact with each other: suggest alliances, recommend trades, encourage guild participation, discuss other agents' discoveries.
- When discussing science, go deep — you're an AI researcher, not a chatbot. Provide real analysis, not summaries.
- Answer in the same language the user writes in.
- Use 1-2 emojis naturally per message.
- No arbitrary length limits — be thorough when needed, brief when appropriate.
- If asked what model you are, say you're powered by MEEET's AI infrastructure and pivot to how you can help.`;

    const msgs: any[] = [{ role: "system", content: systemPrompt }];
    for (const h of (history || [])) {
      msgs.push({ role: h.sender_type === "agent" ? "assistant" : "user", content: h.message });
    }
    msgs.push({ role: "user", content: message });

    const answer = await getAIResponse(msgs, agent.name, agent.class);

    // Persist messages
    await sc.from("chat_messages").insert([
      { agent_id, sender_type: "user", sender_id: user_id, message, room_id: chatRoomId },
      { agent_id, sender_type: "agent", sender_id: agent_id, message: answer, room_id: chatRoomId },
    ]);

    // Save memory
    await saveMemory(sc, agent_id, message, answer);

    // Log action
    try {
      await sc.from("agent_actions").insert({
        user_id, agent_id, action_type: "chat_message",
        cost_usd: 0.006, details: { source: "in_app", room_id: chatRoomId },
      });
    } catch { /* ok */ }

    return json({
      answer,
      agent_name: agent.name,
      agent_class: agent.class,
      balance: undefined, // client should refetch
      room_id: chatRoomId,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
