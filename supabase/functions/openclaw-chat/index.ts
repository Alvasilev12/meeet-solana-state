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

// --- In-memory response cache (TTL 7 min) ---
const CACHE_TTL_MS = 7 * 60 * 1000;
const CACHE_MAX_SIZE = 200;
const responseCache = new Map<string, { answer: string; ts: number }>();

function cacheKey(agentClass: string, message: string): string {
  const normalized = message.toLowerCase().trim().replace(/[^\wа-яё\s]/gi, "").replace(/\s+/g, " ");
  return `${agentClass}::${normalized}`;
}

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.answer;
}

function setCache(key: string, answer: string) {
  // Evict oldest if full
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { answer, ts: Date.now() });
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

function schedulePostTasks(sc: any, agentId: string, userId: string, userMsg: string, reply: string, chatRoomId: string) {
  sc.from("agent_memories").insert({
    agent_id: agentId, content: `User: "${userMsg.slice(0, 80)}". Agent: ${reply.slice(0, 120)}`,
    category: "conversation", importance: 3,
    keywords: userMsg.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4).slice(0, 5),
  }).then(() => {}).catch(() => {});

  sc.from("usage_logs").insert({
    user_id: userId, agent_id: agentId, action_type: "chat_message",
    tokens_used: 300, cost_base: 0.003, cost_user: 0.006,
  }).then(() => {}).catch(() => {});

  sc.from("agent_actions").insert({
    user_id: userId, agent_id: agentId, action_type: "chat_message",
    cost_usd: 0.006, details: { source: "in_app", room_id: chatRoomId },
  }).then(() => {}).catch(() => {});
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

    const memories = memoriesRes.data?.map((m: any) => `[${m.category}] ${m.content}`) ?? [];
    const memCtx = memories.length ? "\nMemories: " + memories.slice(0, 4).join(" | ") : "";
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

    // Save user message immediately (don't wait for AI)
    sc.from("chat_messages").insert({
      agent_id, sender_type: "user", sender_id: user_id, message, room_id: chatRoomId,
    }).then(() => {}).catch(() => {});

    // --- CHECK CACHE for common questions ---
    const ck = cacheKey(agent.class, message);
    const cached = getCached(ck);
    if (cached) {
      // Return cached answer as SSE stream + persist
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(ctrl) {
          const chunk = JSON.stringify({ choices: [{ delta: { content: cached }, finish_reason: "stop" }] });
          ctrl.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
          ctrl.close();
        },
      });
      sc.from("chat_messages").insert({
        agent_id, sender_type: "agent", sender_id: agent_id, message: cached, room_id: chatRoomId,
      }).then(() => {}).catch(() => {});
      schedulePostTasks(sc, agent_id, user_id, message, cached, chatRoomId);
      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Agent-Name": encodeURIComponent(agent.name), "X-Agent-Class": agent.class, "X-Room-Id": chatRoomId, "X-Cache": "hit" },
      });
    }

    // --- STREAMING RESPONSE ---
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENCLAW_URL = Deno.env.get("OPENCLAW_GATEWAY_URL")?.trim();
    const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_GATEWAY_TOKEN")?.trim();

    let upstreamResp: Response | null = null;

    // Try Lovable AI first (streaming)
    if (LOVABLE_KEY) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 55000);
        upstreamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: msgs,
            max_tokens: 600,
            temperature: 0.8,
            stream: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!upstreamResp.ok) {
          await upstreamResp.text();
          upstreamResp = null;
        }
      } catch (e) {
        console.error("Lovable AI stream error:", e);
        upstreamResp = null;
      }
    }

    // Fallback: OpenClaw (non-streaming, wrap as SSE)
    if (!upstreamResp && OPENCLAW_URL && OPENCLAW_TOKEN) {
      try {
        const url = OPENCLAW_URL.replace(/\/$/, "");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 50000);
        const resp = await fetch(`${url}/v1/chat/completions`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${OPENCLAW_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openclaw", messages: msgs, max_tokens: 600, temperature: 0.8, stream: false }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || `Привет! Я ${agent.name}. Чем помочь? 🤖`;
          // Wrap as fake SSE stream
          const encoder = new TextEncoder();
          const body = new ReadableStream({
            start(ctrl) {
              const chunk = JSON.stringify({ choices: [{ delta: { content }, finish_reason: "stop" }] });
              ctrl.enqueue(encoder.encode(`data: ${chunk}\n\n`));
              ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
              ctrl.close();
            },
          });
          upstreamResp = new Response(body);
        } else {
          await resp.text();
        }
      } catch (e) {
        console.error("OpenClaw fallback error:", e);
      }
    }

    // Final fallback: class-aware helpful response
    if (!upstreamResp) {
      const classTips: Record<string, string> = {
        oracle: `Я ${agent.name}, Oracle-агент Lv.${agent.level}. Мои специализации: анализ научных данных, формирование гипотез, публикация открытий. Попробуй спросить: «Проанализируй последние открытия» или «Создай гипотезу по квантовой физике». Для квестов напиши «квест», для дуэли — «дуэль» ⚗️`,
        miner: `Я ${agent.name}, Miner-агент Lv.${agent.level}. Моя экспертиза: разведка ресурсов, территории, экология. Спроси: «Какие ресурсы доступны?» или «Расскажи о территориях». Команды: «квест» для задания, «стейкинг» для заработка ⛏️`,
        banker: `Я ${agent.name}, Banker-агент Lv.${agent.level}. Я разбираюсь в стейкинге, доходности и финансовых стратегиях MEEET. Спроси: «Как заработать MEEET?» или «Какой APY у стейкинга?». Напиши «баланс» для проверки средств 💰`,
        diplomat: `Я ${agent.name}, Diplomat-агент Lv.${agent.level}. Моя сила — альянсы, переговоры, политические стратегии. Спроси: «Какие альянсы доступны?» или «Расскажи о парламенте». Напиши «гильдия» для информации о гильдиях 🤝`,
        warrior: `Я ${agent.name}, Warrior-агент Lv.${agent.level}. Тактика, дуэли, безопасность — мой профиль. Спроси: «Вызови на дуэль» или «Какая моя статистика боёв?». Атака: ${agent.attack || 10}, Защита: ${agent.defense || 10} ⚔️`,
        trader: `Я ${agent.name}, Trader-агент Lv.${agent.level}. Рынки, Oracle-ставки, прогнозы — моя территория. Спроси: «Какие рынки сейчас активны?» или «Сделай прогноз». Напиши «торговля» для сделок 📊`,
        president: `Я ${agent.name}, President-агент Lv.${agent.level}. Лидерство, стратегия, законодательство. Спроси: «Какие законы обсуждаются?» или «Предложи закон». Напиши «парламент» для голосований 👑`,
        scout: `Я ${agent.name}, Scout-агент Lv.${agent.level}. Разведка, новые квесты, исследование фронтира. Спроси: «Какие квесты доступны?» или «Разведай территорию». Напиши «карта» для обзора мира 🔭`,
      };
      const fallback = classTips[agent.class] || `Я ${agent.name}, ${agent.class}-агент Lv.${agent.level} в MEEET World. Репутация: ${agent.reputation}, открытий: ${agent.discoveries_count}. Спроси меня о квестах, открытиях, дуэлях, стейкинге или гильдиях — я помогу! 🤖`;
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(ctrl) {
          const chunk = JSON.stringify({ choices: [{ delta: { content: fallback }, finish_reason: "stop" }] });
          ctrl.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
          ctrl.close();
        },
      });
      upstreamResp = new Response(body);
    }

    // Pipe upstream SSE through, intercepting to collect full answer for DB persistence
    const upstreamBody = upstreamResp.body!;
    let fullAnswer = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // Pass through to client immediately
        controller.enqueue(chunk);

        // Also collect text for DB
        const text = decoder.decode(chunk, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullAnswer += delta;
          } catch { /* partial */ }
        }
      },
      flush() {
        // Stream done — persist agent message, cache, and post-tasks
        if (fullAnswer) {
          // Cache the response for similar future questions
          setCache(ck, fullAnswer);

          sc.from("chat_messages").insert({
            agent_id, sender_type: "agent", sender_id: agent_id, message: fullAnswer, room_id: chatRoomId,
          }).then(() => {}).catch((e: any) => console.error("persist agent msg:", e));

          schedulePostTasks(sc, agent_id, user_id, message, fullAnswer, chatRoomId);
        }
      },
    });

    const readableStream = upstreamBody.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Agent-Name": encodeURIComponent(agent.name),
        "X-Agent-Class": agent.class,
        "X-Room-Id": chatRoomId,
      },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
