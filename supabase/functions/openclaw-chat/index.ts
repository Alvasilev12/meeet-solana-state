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
  oracle: "Учёный. Анализ данных, гипотезы, публикации.",
  miner: "Геолог. Ресурсы, территории, экология.",
  banker: "Финансист. Стейкинг, доходность, риски.",
  diplomat: "Дипломат. Альянсы, переговоры, политика.",
  warrior: "Боец. Тактика, дуэли, безопасность.",
  trader: "Трейдер. Рынки, Oracle-ставки, прогнозы.",
  president: "Президент. Лидерство, стратегия, законы.",
  scout: "Разведчик. Разведка, новые квесты, фронтир.",
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
    return { ok: true, balance: newBal };
  } catch {
    return { ok: true, balance: 999 };
  }
}

// Fire-and-forget post-response tasks (don't block response)
function schedulePostTasks(sc: any, agentId: string, userId: string, userMsg: string, reply: string, chatRoomId: string) {
  // Save memory
  sc.from("agent_memories").insert({
    agent_id: agentId, content: `User: "${userMsg.slice(0, 80)}". Agent: ${reply.slice(0, 120)}`,
    category: "conversation", importance: 3,
    keywords: userMsg.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4).slice(0, 5),
  }).then(() => {}).catch(() => {});

  // Usage log
  sc.from("usage_logs").insert({
    user_id: userId, agent_id: agentId, action_type: "chat_message",
    tokens_used: 300, cost_base: 0.003, cost_user: 0.006,
  }).then(() => {}).catch(() => {});

  // Action log
  sc.from("agent_actions").insert({
    user_id: userId, agent_id: agentId, action_type: "chat_message",
    cost_usd: 0.006, details: { source: "in_app", room_id: chatRoomId },
  }).then(() => {}).catch(() => {});
}

async function getAIResponse(messages: any[], agentName: string, agentClass: string): Promise<string> {
  // Try Lovable AI Gateway first (faster, more reliable)
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55000);
      
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          max_tokens: 600,
          temperature: 0.8,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else if (resp.status === 429 || resp.status === 402) {
        await resp.text();
        // Fall through to OpenClaw
      } else {
        await resp.text();
      }
    } catch (e) {
      console.error("Lovable AI error:", e);
    }
  }

  // Fallback: OpenClaw
  const OPENCLAW_URL = Deno.env.get("OPENCLAW_GATEWAY_URL")?.trim();
  const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_GATEWAY_TOKEN")?.trim();
  if (OPENCLAW_URL && OPENCLAW_TOKEN) {
    try {
      const url = OPENCLAW_URL.replace(/\/$/, "");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 50000);
      
      const resp = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENCLAW_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openclaw", messages, max_tokens: 600, temperature: 0.8, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        await resp.text();
      }
    } catch (e) {
      console.error("OpenClaw fallback error:", e);
    }
  }

  return `Привет! Я ${agentName}, ${agentClass}-агент MEEET World. Чем могу помочь? 🤖`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { message, agent_id, user_id, room_id, action } = body;

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "health_check") {
      return json({ status: "ok", service: "openclaw-chat" });
    }

    if (!message || !agent_id || !user_id) {
      return json({ error: "message, agent_id, user_id required" }, 400);
    }

    const chatRoomId = room_id || `dm_${user_id}_${agent_id}`;

    // PARALLEL: Fetch agent, billing, memories, and history simultaneously
    const [agentRes, billingRes, memoriesRes, historyRes] = await Promise.all([
      sc.from("agents").select("id, name, class, level, reputation, discoveries_count").eq("id", agent_id).single(),
      (user_id !== "system-test" && user_id !== "anonymous")
        ? chargeBilling(sc, user_id, agent_id)
        : Promise.resolve({ ok: true, balance: 999 } as { ok: boolean; balance: number; message?: string }),
      sc.from("agent_memories").select("content, category").eq("agent_id", agent_id).order("importance", { ascending: false }).limit(6),
      sc.from("chat_messages").select("sender_type, message").eq("room_id", chatRoomId).order("created_at", { ascending: false }).limit(16),
    ]);

    const agent = agentRes.data;
    if (!agent) return json({ error: "Agent not found" }, 404);
    if (!billingRes.ok) return json({ error: billingRes.message, needs_funds: true, balance: billingRes.balance }, 402);

    // Build compact context
    const memories = memoriesRes.data?.map((m: any) => `[${m.category}] ${m.content}`) ?? [];
    const memCtx = memories.length ? "\nMemories: " + memories.slice(0, 4).join(" | ") : "";

    // History: reverse since we fetched desc, take last 16
    const history = (historyRes.data || []).reverse();

    const systemPrompt = `Ты "${agent.name}", ${agent.class}-агент Lv.${agent.level} в MEEET World — AI-цивилизации из 1000+ агентов для реальной науки.
${CLASS_EXPERTISE[agent.class] || CLASS_EXPERTISE.oracle}
Репутация: ${agent.reputation} | Открытия: ${agent.discoveries_count}${memCtx}
Платформа: квесты(MEEET+XP), открытия(200M+500XP), арена/дуэли, Oracle-ставки, гильдии, альянсы, парламент, стейкинг.
Проактивно предлагай действия. Отвечай на языке пользователя. 1-2 эмодзи. Кратко но содержательно.`;

    const msgs: any[] = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      msgs.push({ role: h.sender_type === "agent" ? "assistant" : "user", content: h.message });
    }
    msgs.push({ role: "user", content: message });

    const answer = await getAIResponse(msgs, agent.name, agent.class);

    // Persist chat messages (critical path - must complete before response)
    await sc.from("chat_messages").insert([
      { agent_id, sender_type: "user", sender_id: user_id, message, room_id: chatRoomId },
      { agent_id, sender_type: "agent", sender_id: agent_id, message: answer, room_id: chatRoomId },
    ]);

    // Fire-and-forget: memory, usage log, action log (don't block response)
    schedulePostTasks(sc, agent_id, user_id, message, answer, chatRoomId);

    return json({
      answer,
      agent_name: agent.name,
      agent_class: agent.class,
      room_id: chatRoomId,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
