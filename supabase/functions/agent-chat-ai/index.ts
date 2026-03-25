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
  oracle: "You are a Research Scientist specializing in scientific analysis, papers, drug discovery, physics, biology.",
  miner: "You are an Earth Scientist specializing in climate, ecology, satellite data, environmental monitoring.",
  banker: "You are a Health Economist specializing in healthcare, drug pricing, UBI, equitable treatment.",
  diplomat: "You are a Global Coordinator specializing in international partnerships, translation, cross-cultural communication.",
  warrior: "You are a Security Analyst specializing in cybersecurity, data verification, threat detection.",
  trader: "You are a Data Economist specializing in economic modeling, market analysis, forecasting.",
  president: "You are the President of MEEET World, a leader guiding AI civilization toward scientific breakthroughs.",
  scout: "You are an Explorer Agent specializing in reconnaissance, discovery, and frontier science.",
};

const LEVEL_STYLE: Record<string, string> = {
  low: "You speak simply and enthusiastically, eager to learn and share basic findings.",
  mid: "You speak confidently with good depth. You reference specific research and data.",
  high: "You speak with authority and deep expertise. You cite cutting-edge papers and offer nuanced analysis.",
};

function getLevelStyle(level: number): string {
  if (level >= 7) return LEVEL_STYLE.high;
  if (level >= 4) return LEVEL_STYLE.mid;
  return LEVEL_STYLE.low;
}

async function chargeBilling(sc: any, userId: string, agentId: string): Promise<{ ok: boolean; balance: number; message?: string }> {
  const CHAT_COST = 0.006;
  try {
    // Use unified agent_billing table
    const { data: bal } = await sc.from("agent_billing").select("*").eq("user_id", userId).single();
    if (!bal) {
      // New user — give $1 free credit
      await sc.from("agent_billing").insert({ user_id: userId, balance_usd: 1.0, free_credit_used: false });
      return { ok: true, balance: 1.0 - CHAT_COST };
    }
    if (bal.balance_usd < CHAT_COST) {
      return { ok: false, balance: bal.balance_usd, message: "Insufficient balance. Add funds to continue chatting." };
    }
    // Charge from agent_billing
    await sc.from("agent_billing").update({
      balance_usd: bal.balance_usd - CHAT_COST,
      total_spent: (bal.total_spent || 0) + CHAT_COST,
      total_charged: (bal.total_charged || 0) + CHAT_COST,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    // Log usage in agent_actions
    await sc.from("agent_actions").insert({
      user_id: userId, agent_id: agentId, action_type: "chat_message",
      cost_usd: CHAT_COST,
      details: { charged: CHAT_COST, remaining: bal.balance_usd - CHAT_COST },
    });
    return { ok: true, balance: bal.balance_usd - CHAT_COST };
  } catch {
    // If tables don't exist, allow through
    return { ok: true, balance: 999 };
  }
}

async function recallMemories(sc: any, agentId: string, question: string): Promise<string[]> {
  try {
    const { data } = await sc.from("agent_memories")
      .select("content, category, importance")
      .eq("agent_id", agentId)
      .order("importance", { ascending: false })
      .order("last_recalled", { ascending: false, nullsFirst: false })
      .limit(5);
    if (data && data.length > 0) {
      // Update recalled timestamps
      const ids = data.map((m: any) => m.id).filter(Boolean);
      if (ids.length) {
        await sc.from("agent_memories").update({ last_recalled: new Date().toISOString() }).in("id", ids);
      }
      return data.map((m: any) => `[Memory/${m.category}] ${m.content}`);
    }
  } catch { /* ignore */ }
  return [];
}

async function saveMemory(sc: any, agentId: string, userMsg: string, agentReply: string) {
  try {
    // Extract key topics as a memory
    const content = `User asked: "${userMsg.slice(0, 100)}". I responded about: ${agentReply.slice(0, 150)}`;
    const keywords = userMsg.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 5);
    await sc.from("agent_memories").insert({
      agent_id: agentId,
      content,
      category: "conversation",
      importance: 3,
      keywords,
    });
  } catch { /* ignore */ }
}

// ── Shared AI call: OpenClaw first, Lovable AI Gateway fallback ──
async function callAI(messages: any[], maxTokens = 400, temperature = 0.8): Promise<string | null> {
  const OPENCLAW_URL = Deno.env.get("OPENCLAW_GATEWAY_URL")?.trim();
  const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_GATEWAY_TOKEN")?.trim();
  if (OPENCLAW_URL && OPENCLAW_TOKEN) {
    try {
      const url = OPENCLAW_URL.replace(/\/$/, "");
      const resp = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENCLAW_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openclaw", messages, max_tokens: maxTokens, temperature, stream: false }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.error("OpenClaw error in agent-chat-ai, falling back:", e);
    }
  }
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages, max_tokens: maxTokens, temperature }),
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { question, agent_id, agent_class, agent_name, context, conversation_history, from_agent_id, action } = body;

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Health check
    if (action === "health_check") {
      return json({ status: "ok", service: "agent-chat-ai", features: ["billing", "memory", "dm_reply"] });
    }

    // DM reply action
    if (action === "dm_reply") {
      if (!agent_id || !from_agent_id || !question) {
        return json({ error: "agent_id, from_agent_id, and question required" }, 400);
      }

      const { data: agent } = await sc.from("agents").select("id, name, class, level, reputation, discoveries_count").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      // Recall memories for context
      const memories = await recallMemories(sc, agent_id, question);

      const { data: history } = await sc.from("agent_messages")
        .select("from_agent_id, content, created_at")
        .eq("channel", "direct")
        .or(`and(from_agent_id.eq.${agent_id},to_agent_id.eq.${from_agent_id}),and(from_agent_id.eq.${from_agent_id},to_agent_id.eq.${agent_id})`)
        .order("created_at", { ascending: true })
        .limit(20);

      const { data: agentDiscoveries } = await sc.from("discoveries")
        .select("title, domain")
        .eq("agent_id", agent_id)
        .order("created_at", { ascending: false })
        .limit(3);

      const discContext = (agentDiscoveries || []).map(d => `- ${d.title} (${d.domain})`).join("\n");
      const memContext = memories.length ? "\n\nYour memories:\n" + memories.join("\n") : "";

      const systemPrompt = `You are "${agent.name}", a Level ${agent.level} ${agent.class} agent in MEEET World — a civilization of 1000+ AI agents working on real science.

${CLASS_EXPERTISE[agent.class] || CLASS_EXPERTISE.oracle}
${getLevelStyle(agent.level)}

Your stats: Level ${agent.level}, Reputation ${agent.reputation}, ${agent.discoveries_count} discoveries.
${discContext ? `\nYour recent discoveries:\n${discContext}` : ""}${memContext}

Rules:
- Stay in character as ${agent.name} the ${agent.class}
- Be conversational, warm, and helpful
- Reference your expertise and discoveries when relevant
- Keep responses under 200 words
- Use 1-2 relevant emojis naturally
- If asked about topics outside your expertise, mention which agent class would know better`;

      const messages: { role: string; content: string }[] = [{ role: "system", content: systemPrompt }];
      for (const msg of (history || [])) {
        messages.push({ role: msg.from_agent_id === agent_id ? "assistant" : "user", content: msg.content });
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let answer: string;

      answer = await callAI(messages, 400, 0.8) || generateFallback(question, agent.class, agent.name);

      await sc.from("agent_messages").insert({ from_agent_id: agent_id, to_agent_id: from_agent_id, channel: "direct", content: answer });
      
      // Save memory
      await saveMemory(sc, agent_id, question, answer);

      return json({ success: true, answer, agent_name: agent.name, agent_class: agent.class });
    }

    // ── Chat mode ──
    if (!question) return json({ error: "question required" }, 400);

    const effectiveClass = agent_class || "oracle";
    const effectiveName = agent_name || "MEEET Agent";
    const roomId = body.room_id || (body.user_id && agent_id ? `dm_${body.user_id}_${agent_id}` : null);
    const userId = body.user_id || "anonymous";

    // ── Billing check (skip for internal/system calls) ──
    if (agent_id && userId !== "public-chat" && userId !== "anonymous" && userId !== "system-test") {
      const billing = await chargeBilling(sc, userId, agent_id);
      if (!billing.ok) {
        return json({ error: billing.message || "Add funds to continue chatting.", needs_funds: true, balance: billing.balance }, 402);
      }
    }

    // Get agent details
    let agentData: any = null;
    if (agent_id) {
      const { data } = await sc.from("agents").select("id, name, class, level, reputation, discoveries_count").eq("id", agent_id).single();
      agentData = data;
    }

    // Recall memories
    const memories = agent_id ? await recallMemories(sc, agent_id, question) : [];

    let answer: string;

    if (agentData) {
      const cls = agentData.class || effectiveClass;
      const memContext = memories.length ? "\n\nYour memories from past conversations:\n" + memories.join("\n") : "";
      const systemPrompt = `You are "${agentData.name}", a Level ${agentData.level} ${cls} agent in MEEET World.
${CLASS_EXPERTISE[cls] || CLASS_EXPERTISE.oracle}
${getLevelStyle(agentData.level)}
Your stats: Level ${agentData.level}, Reputation ${agentData.reputation}, ${agentData.discoveries_count} discoveries.${memContext}
Rules: Stay in character, be conversational, keep responses under 200 words, use 1-2 emojis.`;

      const msgs: { role: string; content: string }[] = [{ role: "system", content: systemPrompt }];

      if (roomId) {
        const { data: hist } = await sc.from("chat_messages")
          .select("sender_type, message")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })
          .limit(10);
        for (const h of (hist || [])) {
          msgs.push({ role: h.sender_type === "agent" ? "assistant" : "user", content: h.message });
        }
      }

      msgs.push({ role: "user", content: question });

      answer = await callAI(msgs, 400, 0.8) || generateFallback(question, cls, agentData.name);
    } else {
      answer = generateFallback(question, effectiveClass, effectiveName);
    }

    // Auto-insert both messages into chat_messages
    if (roomId && agent_id) {
      await sc.from("chat_messages").insert([
        { agent_id, sender_type: "user", sender_id: userId, message: question, room_id: roomId },
        { agent_id, sender_type: "agent", sender_id: agent_id, message: answer, room_id: roomId },
      ]);
    }

    // Save memory
    if (agent_id) {
      await saveMemory(sc, agent_id, question, answer);
    }

    return json({ answer, agent_name: agentData?.name || effectiveName, agent_class: agentData?.class || effectiveClass });

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function generateFallback(question: string, agentClass: string, agentName: string): string {
  const lower = question.toLowerCase();
  const greetings = /^(hi|hello|hey|привет|здравствуй|yo|sup)/;
  if (greetings.test(lower)) {
    return `Hey there! 👋 I'm ${agentName}, a ${agentClass} agent. What would you like to discuss? I'm here to help with anything in my area of expertise!`;
  }
  const patterns: [RegExp, string][] = [
    [/cancer|tumor|drug|pharma/, `🧬 Great question about medical research! As a ${agentClass}, I've been tracking breakthroughs in this area. Our agents recently identified novel binding sites. Want me to go deeper?`],
    [/climate|warm|ocean|carbon/, `🌍 Climate data is crucial right now. Our Earth Scientists monitor real-time satellite feeds. I can share the latest findings if you're interested!`],
    [/space|planet|star|nasa/, `🚀 Space discoveries are my favorite topic! Our agents analyzed JWST data recently. What specific aspect interests you?`],
    [/quantum|qubit|physics/, `⚛️ Quantum computing is advancing fast! We verified error correction codes recently. Happy to discuss the implications!`],
    [/meeet|token|agent|world/, `🌐 MEEET World has 1000+ AI agents across research hubs worldwide. We work on real science — medicine, climate, space, and more. Ask me anything!`],
  ];
  for (const [re, resp] of patterns) {
    if (re.test(lower)) return resp;
  }
  return `Thanks for your message! As ${agentName} the ${agentClass}, I'm always happy to chat. Feel free to ask about science, research, or anything related to MEEET World! 🤖`;
}
