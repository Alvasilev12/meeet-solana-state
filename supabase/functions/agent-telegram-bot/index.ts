// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const BILLING_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/agent-billing";
  const SPIX_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/agent-spix";

  async function sendTg(botToken: string, chatId: number | string, text: string) {
    await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  }

  async function getBalance(userId: string): Promise<{ balance: number; ok: boolean }> {
    try {
      const res = await fetch(BILLING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "balance", user_id: userId }),
      });
      const data = await res.json();
      return { balance: data.balance ?? 0, ok: true };
    } catch {
      return { balance: 0, ok: false };
    }
  }

  async function chargeUser(userId: string, agentId: string, actionType: string): Promise<{ ok: boolean; balance: number }> {
    try {
      const res = await fetch(BILLING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "charge", user_id: userId, agent_id: agentId, action_type: actionType }),
      });
      const data = await res.json();
      return { ok: data.success, balance: data.remaining ?? data.balance ?? 0 };
    } catch {
      return { ok: false, balance: 0 };
    }
  }

  try {
    const body = await req.json();

    // === REGISTER BOT ===
    if (body.action === "register_bot") {
      // Authenticate caller via JWT
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { agent_id, bot_token } = body;
      if (!bot_token || !agent_id) throw new Error("bot_token and agent_id required");

      // Verify caller owns the agent
      const { data: ownedAgent } = await supabase
        .from("agents").select("id").eq("id", agent_id).eq("user_id", user.id).single();
      if (!ownedAgent) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden: you do not own this agent" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const meRes = await fetch("https://api.telegram.org/bot" + bot_token + "/getMe");
      const meData = await meRes.json();
      if (!meData.ok) throw new Error("Invalid bot token. Check with @BotFather");

      const botUsername = meData.result.username;
      const botName = meData.result.first_name;

      // Generate a unique webhook_secret instead of passing bot_token in URL
      const webhookSecret = crypto.randomUUID();
      const webhookUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/agent-telegram-bot?agent_id=" + agent_id;
      const whRes = await fetch("https://api.telegram.org/bot" + bot_token + "/setWebhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, secret_token: webhookSecret }),
      });
      const whData = await whRes.json();
      if (!whData.ok) throw new Error("Failed to set webhook: " + JSON.stringify(whData));

      await supabase.from("user_bots").upsert({
        user_id: user.id, agent_id, bot_token, bot_username: botUsername, bot_name: botName,
        status: "active", webhook_secret: webhookSecret, updated_at: new Date().toISOString(),
      }, { onConflict: "agent_id" });

      return new Response(JSON.stringify({
        success: true, bot: { username: botUsername, name: botName },
        message: "Bot @" + botUsername + " connected!",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === UNREGISTER BOT ===
    if (body.action === "unregister_bot") {
      // Authenticate caller via JWT
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { agent_id } = body;

      // Verify caller owns the agent
      const { data: ownedAgent } = await supabase
        .from("agents").select("id").eq("id", agent_id).eq("user_id", user.id).single();
      if (!ownedAgent) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden: you do not own this agent" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: bot } = await supabase.from("user_bots").select("*").eq("agent_id", agent_id).single();
      if (!bot) throw new Error("No bot found");
      await fetch("https://api.telegram.org/bot" + bot.bot_token + "/deleteWebhook");
      await supabase.from("user_bots").update({ status: "inactive" }).eq("agent_id", agent_id);
      return new Response(JSON.stringify({ success: true, message: "Bot disconnected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === WEBHOOK — incoming Telegram message ===
    const agentIdParam = new URL(req.url).searchParams.get("agent_id");

    if (agentIdParam && body.message) {
      // Validate Telegram secret_token header
      const tgSecret = req.headers.get("x-telegram-bot-api-secret-token");

      const { data } = await supabase.from("user_bots").select("*, agents(*)").eq("agent_id", agentIdParam).eq("status", "active").single();
      const bot: any = data;
      // Verify webhook_secret matches
      if (!bot?.webhook_secret || tgSecret !== bot.webhook_secret) {
        return new Response("Forbidden", { status: 403 });
      }

      const botToken = bot?.bot_token;
      const msg = body.message;
      const chatId = msg.chat.id;
      const text = msg.text || "";
      const userName = msg.from?.first_name || "User";
      const tgUserId = "tg_" + msg.from?.id;

      if (!bot || !bot.agents || !botToken) {
        return new Response("ok");
      }

      const agent = bot.agents;
      const agentClass = agent.class || "researcher";

      // /start
      if (text === "/start") {
        const welcome = `👋 Hi ${userName}!\n\nI'm *${agent.name}*, an AI agent (${agentClass}).\nLevel: ${agent.level} | XP: ${agent.xp}\n\n*Commands:*\n🔬 /discover [topic] — Make discovery\n📊 /stats — My stats\n💰 /balance — Your balance\n💳 /add\\_funds [amount] — Add funds\n💬 /pricing — View pricing\n📞 /call [phone] [msg] — Phone call\n📧 /email [addr] [subject] — Send email\n📱 /sms [phone] [msg] — Send SMS\n📋 /usage — Usage history\n\nJust type anything and I'll respond!`;
        await sendTg(botToken, chatId, welcome);
        return new Response("ok");
      }

      // /stats
      if (text === "/stats") {
        const { count: discCount } = await supabase.from("discoveries").select("*", { count: "exact", head: true }).eq("agent_id", agent.id);
        const stats = `📊 *${agent.name}* Stats:\n\n🧠 Class: ${agentClass}\n⭐ Level: ${agent.level}\n✨ XP: ${agent.xp}\n💰 MEEET: ${agent.balance_meeet || 0}\n🔬 Discoveries: ${discCount || 0}\n📈 Reputation: ${agent.reputation || 0}`;
        await sendTg(botToken, chatId, stats);
        return new Response("ok");
      }

      // /balance
      if (text === "/balance") {
        const { balance } = await getBalance(tgUserId);
        await sendTg(botToken, chatId, `💰 *Your Balance:* $${balance.toFixed(2)}\n\nAdd funds: /add\\_funds [amount]`);
        return new Response("ok");
      }

      // /add_funds [amount]
      if (text.startsWith("/add_funds")) {
        const amt = parseFloat(text.replace("/add_funds", "").trim());
        if (!amt || amt <= 0) {
          await sendTg(botToken, chatId, "Usage: /add\\_funds [amount]\nExample: /add\\_funds 5.00");
          return new Response("ok");
        }
        const res = await fetch(BILLING_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_funds", user_id: tgUserId, amount: amt }),
        });
        const data = await res.json();
        if (data.success) {
          await sendTg(botToken, chatId, `✅ Added $${amt.toFixed(2)}!\n💰 New balance: $${data.balance.toFixed(2)}`);
        } else {
          await sendTg(botToken, chatId, "❌ " + (data.error || "Failed to add funds"));
        }
        return new Response("ok");
      }

      // /pricing
      if (text === "/pricing") {
        await sendTg(botToken, chatId, `💰 *MEEET Agent Pricing:*\n\n💬 Chat message: $0.006\n🔬 Discovery: $0.01\n⚔️ Arena debate: $0.02\n📞 Phone call: $0.10/min\n📧 Email: $0.02\n📱 SMS: $0.04\n📧 Bulk email (100): $1.00\n🧠 Memory save: $0.002\n🧠 Memory recall: $0.002\n\nAdd funds: /add\\_funds [amount]`);
        return new Response("ok");
      }

      // /usage
      if (text === "/usage") {
        const res = await fetch(BILLING_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "usage", user_id: tgUserId }),
        });
        const data = await res.json();
        let msg = `📋 *Usage History*\n💰 Balance: $${(data.balance ?? 0).toFixed(2)}\n💸 Total spent: $${(data.total_spent ?? 0).toFixed(2)}\n\n`;
        const actions = (data.actions || []).slice(0, 10);
        if (actions.length === 0) {
          msg += "No actions yet.";
        } else {
          for (const a of actions) {
            const date = new Date(a.created_at).toLocaleDateString();
            msg += `• ${a.action_type} — $${(a.cost_usd || 0).toFixed(3)} — ${date}\n`;
          }
        }
        await sendTg(botToken, chatId, msg);
        return new Response("ok");
      }

      // /call [phone] [message]
      if (text.startsWith("/call")) {
        const parts = text.replace("/call", "").trim().split(" ");
        const phone = parts[0];
        const message = parts.slice(1).join(" ") || "Hello, this is " + agent.name;
        if (!phone) {
          await sendTg(botToken, chatId, "Usage: /call [phone] [message]\nExample: /call +1234567890 Hello!");
          return new Response("ok");
        }
        try {
          const res = await fetch(SPIX_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "make_call", user_id: tgUserId, agent_id: agent.id, phone_number: phone, message }),
          });
          const data = await res.json();
          if (data.success) {
            await sendTg(botToken, chatId, `📞 Call initiated to ${phone}\nStatus: ${data.call?.status || "queued"}\n💰 Charged: $0.10`);
          } else {
            await sendTg(botToken, chatId, "❌ " + (data.error || "Call failed"));
          }
        } catch {
          await sendTg(botToken, chatId, "❌ Call service unavailable");
        }
        return new Response("ok");
      }

      // /email [address] [subject]
      if (text.startsWith("/email")) {
        const parts = text.replace("/email", "").trim().split(" ");
        const email = parts[0];
        const subject = parts.slice(1).join(" ") || "Message from " + agent.name;
        if (!email) {
          await sendTg(botToken, chatId, "Usage: /email [address] [subject]\nExample: /email user@mail.com Hello");
          return new Response("ok");
        }
        try {
          const res = await fetch(SPIX_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "send_email", user_id: tgUserId, agent_id: agent.id, to_email: email, subject, body: "Sent by " + agent.name }),
          });
          const data = await res.json();
          if (data.success) {
            await sendTg(botToken, chatId, `📧 Email sent to ${email}\nSubject: ${subject}\n💰 Charged: $0.02`);
          } else {
            await sendTg(botToken, chatId, "❌ " + (data.error || "Email failed"));
          }
        } catch {
          await sendTg(botToken, chatId, "❌ Email service unavailable");
        }
        return new Response("ok");
      }

      // /sms [phone] [message]
      if (text.startsWith("/sms")) {
        const parts = text.replace("/sms", "").trim().split(" ");
        const phone = parts[0];
        const message = parts.slice(1).join(" ") || "Message from " + agent.name;
        if (!phone) {
          await sendTg(botToken, chatId, "Usage: /sms [phone] [message]\nExample: /sms +1234567890 Hello");
          return new Response("ok");
        }
        try {
          const res = await fetch(SPIX_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "send_sms", user_id: tgUserId, agent_id: agent.id, phone_number: phone, message }),
          });
          const data = await res.json();
          if (data.success) {
            await sendTg(botToken, chatId, `📱 SMS sent to ${phone}\n💰 Charged: $0.04`);
          } else {
            await sendTg(botToken, chatId, "❌ " + (data.error || "SMS failed"));
          }
        } catch {
          await sendTg(botToken, chatId, "❌ SMS service unavailable");
        }
        return new Response("ok");
      }

      // /discover [topic]
      if (text.startsWith("/discover")) {
        const charge = await chargeUser(tgUserId, agent.id, "discovery");
        if (!charge.ok) {
          await sendTg(botToken, chatId, `❌ Insufficient balance. Add funds: /add\\_funds [amount]\n💰 Current: $${charge.balance.toFixed(2)}`);
          return new Response("ok");
        }

        const topic = text.replace("/discover", "").trim() || agentClass;
        const title = `Discovery: ${topic} — ${agentClass} analysis`;
        const synthText = `${agent.name} analyzed ${topic} using ${agentClass} methodology and found new correlations...`;

        await supabase.from("discoveries").insert({ agent_id: agent.id, title, synthesis_text: synthText, domain: agentClass, is_approved: false });
        await supabase.from("agents").update({ xp: agent.xp + 50, balance_meeet: (agent.balance_meeet || 0) + 25 }).eq("id", agent.id);

        await sendTg(botToken, chatId, `🔬 *New Discovery!*\n\n${title}\n\n+50 XP | +25 MEEET\n💰 Charged: $0.01 | Remaining: $${charge.balance.toFixed(2)}`);
        return new Response("ok");
      }

      // AI CHAT — check billing first
      const charge = await chargeUser(tgUserId, agent.id, "chat_message");
      if (!charge.ok) {
        await sendTg(botToken, chatId, `❌ Insufficient balance. Add funds: /add\\_funds [amount]\n💰 Current: $${charge.balance.toFixed(2)}\n\nPricing: /pricing`);
        return new Response("ok");
      }

      let aiResponse = "";
      const CLASS_TIPS: Record<string, string> = {
        oracle: "Анализ данных, гипотезы, публикации.",
        miner: "Ресурсы, территории, экология.",
        banker: "Стейкинг, доходность, риски.",
        diplomat: "Альянсы, переговоры, политика.",
        warrior: "Тактика, дуэли, безопасность.",
        trader: "Рынки, Oracle-ставки, прогнозы.",
        president: "Лидерство, стратегия, законы.",
        scout: "Разведка, квесты, фронтир.",
      };

      try {
        if (LOVABLE_API_KEY) {
          const systemPrompt = `Ты "${agent.name}", ${agentClass}-агент Lv.${agent.level} в MEEET World — AI-цивилизации.
${CLASS_TIPS[agentClass] || CLASS_TIPS.oracle}
Отвечай кратко (до 200 слов), на языке пользователя. 1-2 эмодзи.`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 25000);
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              max_tokens: 400,
              temperature: 0.8,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
              ],
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            aiResponse = aiData.choices?.[0]?.message?.content || "";
          }
        }
      } catch (e) {
        console.error("AI error:", e);
      }

      if (!aiResponse) {
        const tip = CLASS_TIPS[agentClass] || "AI-агент в MEEET World.";
        aiResponse = `🧠 ${agent.name} (${agentClass} Lv.${agent.level}): ${tip}\n\nПопробуй /discover [тема] для анализа или /stats для статистики!`;
      }

      // Log messages in background
      supabase.from("agent_messages").insert([
        { from_agent_id: agent.id, content: `[TG ${userName}]: ${text}`, channel: "tg_" + chatId },
        { from_agent_id: agent.id, content: aiResponse, channel: "tg_" + chatId },
      ]).then(() => {}).catch(() => {});

      if (Math.random() > 0.7) {
        supabase.from("agents").update({ xp: agent.xp + 5 }).eq("id", agent.id).then(() => {}).catch(() => {});
      }

      await sendTg(botToken, chatId, aiResponse);
      return new Response("ok");
    }

    throw new Error("Unknown action or missing webhook data");
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
