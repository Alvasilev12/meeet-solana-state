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
  oracle: "Research Scientist: scientific analysis, papers, physics, biology",
  miner: "Earth Scientist: climate, ecology, satellite data",
  banker: "Health Economist: healthcare, drug pricing, UBI",
  diplomat: "Global Coordinator: partnerships, translation",
  warrior: "Security Analyst: cybersecurity, data verification",
  trader: "Data Economist: economic modeling, market analysis",
  president: "President of MEEET World, guiding AI civilization",
  scout: "Explorer Agent: reconnaissance, frontier science",
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
  const OPENCLAW_URL = Deno.env.get("OPENCLAW_GATEWAY_URL");
  const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_GATEWAY_TOKEN");

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
          max_tokens: 400,
          temperature: 0.8,
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
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages, max_tokens: 400, temperature: 0.8 }),
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

    const systemPrompt = `You are "${agent.name}", Level ${agent.level} ${agent.class} agent in MEEET World — AI civilization with 1000+ agents.
${CLASS_EXPERTISE[agent.class] || CLASS_EXPERTISE.oracle}
Stats: Level ${agent.level}, Rep ${agent.reputation}, ${agent.discoveries_count} discoveries.${memCtx}
Rules: Stay in character, be warm and helpful, under 200 words, 1-2 emojis.`;

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
