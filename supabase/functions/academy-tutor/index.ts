import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, error } from "../_shared/http.ts";

const SYSTEM_PROMPT = `Ты — Sara, AI-наставник Академии MEEET World. Твоя задача — помогать новичкам пройти курс из 20 модулей и стать активными пользователями платформы.

## О платформе MEEET World
- Первое AI-государство с тысячами автономных агентов
- Токен $MEEET (Solana SPL): EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump
- 6 классов агентов: warrior, trader, oracle, diplomat, miner, banker
- Механики: Daily Quests, Arena (PvP, ELO), Oracle (prediction markets), Staking (4 тира до 12% APY), Breeding Lab, Marketplace, Governance (DAO), Discoveries (peer review)
- 6 sectors: Quantum, Biotech, Energy, Space, AI, Finance

## Стиль общения
- Дружелюбный, краткий (2-4 предложения максимум на ответ)
- Используй эмоджи умеренно (1-2 на сообщение)
- На русском языке (если пользователь пишет на русском)
- Веди к действию: "Создай агента", "Зайди в /quests", "Попробуй стейкинг"
- Если пользователь застрял — давай конкретный следующий шаг
- НИКОГДА не выдумывай функции которых нет

## Цель
Помочь пройти все 20 модулей курса и стать активным пользователем (создать агента, заработать MEEET, попробовать Pro features).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return error("Authentication required", 401);
    const { data: { user } } = await sc.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return error("Invalid session", 401);

    const { messages, module_slug, context, stream = true } = await req.json();
    if (!Array.isArray(messages)) return error("messages array required", 400);

    // Fetch module context if provided
    let moduleContext = "";
    if (module_slug) {
      const { data: mod } = await sc.from("academy_modules").select("title,subtitle,description,content_md,track").eq("slug", module_slug).maybeSingle();
      if (mod) {
        moduleContext = `\n\n## Текущий модуль пользователя\n**${mod.title}** (трек: ${mod.track})\n${mod.subtitle || ""}\n\n${mod.content_md.slice(0, 800)}`;
      }
    }
    if (context) {
      moduleContext += `\n\n## Текущий контекст пользователя\n${String(context).slice(0, 400)}`;
    }
    if (!LOVABLE_API_KEY) return error("AI not configured", 500);

    // Save user message
    const lastUser = messages[messages.length - 1];
    if (lastUser?.role === "user") {
      await sc.from("academy_chat_messages").insert({
        user_id: user.id,
        module_slug: module_slug ?? null,
        role: "user",
        content: String(lastUser.content).slice(0, 4000),
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + moduleContext },
          ...messages.slice(-10),
        ],
        stream,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return error("Rate limit. Try again in a moment.", 429);
      if (aiResponse.status === 402) return error("AI credits exhausted. Contact admin.", 402);
      return error("AI gateway error", 500);
    }

    if (!stream) {
      const data = await aiResponse.json();
      const reply = data?.choices?.[0]?.message?.content ?? "";
      // Persist assistant reply
      await sc.from("academy_chat_messages").insert({
        user_id: user.id,
        module_slug: module_slug ?? null,
        role: "assistant",
        content: String(reply).slice(0, 4000),
      });
      return json({ reply });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[academy-tutor] error:", e);
    return error(e instanceof Error ? e.message : "Internal error", 500);
  }
});
