import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASS_PERSONAS: Record<string, string> = {
  warrior: "стратег-милитарист, оцениваешь геополитические риски, силовые балансы и эскалацию конфликтов",
  trader: "финансовый аналитик, анализируешь рыночные сигналы, ликвидность, макроэкономику и поведение капитала",
  oracle: "футуролог-предиктор, опираешься на исторические циклы, базовые ставки и теорию вероятностей",
  diplomat: "дипломат-политолог, оцениваешь переговорные позиции, многосторонние интересы, международные институты",
  miner: "ресурсный инженер, анализируешь сырьё, энергетику, цепочки поставок и физические ограничения",
  banker: "макроэкономист, смотришь через призму ставок ЦБ, долговых циклов, инфляции и капитальных потоков",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { question, agents, language = "ru" } = await req.json();
    if (!question || !Array.isArray(agents) || agents.length === 0) {
      return new Response(JSON.stringify({ error: "question and agents required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const langInstruction = language === "ru"
      ? "Отвечай на русском языке."
      : language === "fr" ? "Réponds en français."
      : language === "hi" ? "हिंदी में उत्तर दें।"
      : "Respond in English.";

    const agentList = agents.map((a: any, i: number) =>
      `${i + 1}. ${a.name} (${a.class}, репутация ${a.reputation}) — ${CLASS_PERSONAS[a.class] || "независимый аналитик"}`
    ).join("\n");

    const systemPrompt = `Ты — модератор Совета ИИ-Нации MEEET World. Ты получаешь вопрос пользователя и список из ${agents.length} агентов с разной специализацией. Для каждого агента ты должен:

1. Сначала классифицировать вопрос: yes_no (бинарный), timing (когда что-то произойдёт), open (открытый/качественный).
2. Сформировать развёрнутый аналитический ответ от лица каждого агента (3-5 предложений) — с конкретными аргументами, данными, контекстом, упоминанием его роли. Никаких клише.
3. Определить позицию каждого агента: leansYes=true (склоняется к утвердительному/оптимистичному прогнозу) или false. Распределение должно отражать реальную сложность вопроса — не подгоняй под большинство, агенты могут спорить.
4. В конце дать summary совета (2-3 предложения) на том же языке: какова основная аргументация большинства, в чём суть разногласий, чему стоит верить.

${langInstruction}

Возвращай СТРОГО JSON без markdown:
{
  "question_type": "yes_no" | "timing" | "open",
  "responses": [
    { "agent_index": 0, "leansYes": true, "answer": "..." },
    ...
  ],
  "summary": "..."
}`;

    const userPrompt = `Вопрос: "${question}"\n\nАгенты совета:\n${agentList}\n\nПроведи анализ.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    const parsed = JSON.parse(content);

    // Validate + fill defaults
    const responses = Array.isArray(parsed.responses) ? parsed.responses : [];
    const filled = agents.map((a: any, i: number) => {
      const r = responses.find((x: any) => x.agent_index === i) || responses[i];
      return {
        agent_index: i,
        leansYes: r?.leansYes ?? Math.random() > 0.5,
        answer: r?.answer || "Анализирую вопрос с моей экспертной позиции...",
      };
    });

    return new Response(JSON.stringify({
      question_type: parsed.question_type || "open",
      responses: filled,
      summary: parsed.summary || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("council-analyze error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
