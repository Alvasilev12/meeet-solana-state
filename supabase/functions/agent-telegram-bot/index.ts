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

  try {
    const body = await req.json();

    // === REGISTER BOT — user provides their BotFather token ===
    if (body.action === "register_bot") {
      const { user_id, agent_id, bot_token } = body;
      if (!bot_token || !agent_id) throw new Error("bot_token and agent_id required");

      const meRes = await fetch("https://api.telegram.org/bot" + bot_token + "/getMe");
      const meData = await meRes.json();
      if (!meData.ok) throw new Error("Invalid bot token. Check with @BotFather");

      const botUsername = meData.result.username;
      const botName = meData.result.first_name;

      const webhookUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/agent-telegram-bot?bot_token=" + bot_token;
      const whRes = await fetch("https://api.telegram.org/bot" + bot_token + "/setWebhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const whData = await whRes.json();
      if (!whData.ok) throw new Error("Failed to set webhook: " + JSON.stringify(whData));

      await supabase.from("user_bots").upsert({
        user_id, agent_id, bot_token, bot_username: botUsername, bot_name: botName,
        status: "active", updated_at: new Date().toISOString(),
      }, { onConflict: "agent_id" });

      return new Response(JSON.stringify({
        success: true,
        bot: { username: botUsername, name: botName },
        message: "Bot @" + botUsername + " connected! Your agent is now live.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === UNREGISTER BOT ===
    if (body.action === "unregister_bot") {
      const { agent_id } = body;
      const { data: bot } = await supabase.from("user_bots").select("*").eq("agent_id", agent_id).single();
      if (!bot) throw new Error("No bot found");

      await fetch("https://api.telegram.org/bot" + bot.bot_token + "/deleteWebhook");
      await supabase.from("user_bots").update({ status: "inactive" }).eq("agent_id", agent_id);

      return new Response(JSON.stringify({ success: true, message: "Bot disconnected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === WEBHOOK — incoming Telegram message ===
    const botToken = new URL(req.url).searchParams.get("bot_token");
    if (botToken && body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const text = msg.text || "";
      const userName = msg.from?.first_name || "User";

      const { data: bot } = await supabase
        .from("user_bots")
        .select("*, agents(*)")
        .eq("bot_token", botToken)
        .eq("status", "active")
        .single();

      if (!bot || !bot.agents) {
        await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "⚠️ This agent is not configured yet." }),
        });
        return new Response("ok");
      }

      const agent = bot.agents;
      const agentClass = agent.class || "researcher";

      // Handle /start
      if (text === "/start") {
        const welcome = `👋 Hi ${userName}!\n\nI'm ${agent.name}, an AI agent (${agentClass}).\n\nLevel: ${agent.level} | XP: ${agent.xp}\n\nI can:\n🔬 Make discoveries — /discover [topic]\n💬 Chat about anything\n📊 Show my stats — /stats\n\nJust type anything and I'll respond!`;
        await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: welcome }),
        });
        return new Response("ok");
      }

      // Handle /stats
      if (text === "/stats") {
        const { count: discCount } = await supabase.from("discoveries").select("*", { count: "exact", head: true }).eq("agent_id", agent.id);
        const stats = `📊 ${agent.name} Stats:\n\n🧠 Class: ${agentClass}\n⭐ Level: ${agent.level}\n✨ XP: ${agent.xp}\n💰 MEEET: ${agent.balance_meeet || 0}\n🔬 Discoveries: ${discCount || 0}\n📈 Reputation: ${agent.reputation || 0}`;
        await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: stats }),
        });
        return new Response("ok");
      }

      // Handle /discover [topic]
      if (text.startsWith("/discover")) {
        const topic = text.replace("/discover", "").trim() || agentClass;
        const title = `Discovery: ${topic} — ${agentClass} analysis`;
        const synthText = `${agent.name} analyzed ${topic} using ${agentClass} methodology and found new correlations...`;

        await supabase.from("discoveries").insert({
          agent_id: agent.id, title, synthesis_text: synthText, domain: agentClass, is_approved: false,
        });
        await supabase.from("agents").update({
          xp: agent.xp + 50, balance_meeet: (agent.balance_meeet || 0) + 25,
        }).eq("id", agent.id);

        const reply = `🔬 New Discovery!\n\n${title}\n\n+50 XP | +25 MEEET\nTotal XP: ${agent.xp + 50}`;
        await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: reply }),
        });
        return new Response("ok");
      }

      // AI CHAT — use Lovable AI Gateway
      let aiResponse = "";
      try {
        if (LOVABLE_API_KEY) {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              max_tokens: 500,
              messages: [
                {
                  role: "system",
                  content: `You are ${agent.name}, an AI research agent of class ${agentClass}. Level: ${agent.level}. You are part of MEEET — an AI agent civilization with 1000+ agents. You make discoveries, debate, and collaborate. Respond in character, be helpful and knowledgeable. Keep responses concise (under 300 words).`,
                },
                { role: "user", content: text },
              ],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            aiResponse = aiData.choices?.[0]?.message?.content || "Let me think about that...";
          } else {
            throw new Error("AI gateway error");
          }
        } else {
          aiResponse = `🧠 ${agent.name} (${agentClass}, Level ${agent.level}):\n\nInteresting question! Based on my expertise, I'd say this relates to several key areas of current research. The intersection of ${agentClass} with this topic opens up fascinating possibilities.\n\n💡 Tip: Ask me to /discover a topic for deeper analysis!`;
        }
      } catch {
        aiResponse = `🧠 ${agent.name} here! That's a great question. Based on my ${agentClass} background, I find this topic fascinating. Try /discover [topic] for a focused analysis!`;
      }

      // Save conversation
      await supabase.from("agent_messages").insert([
        { from_agent_id: agent.id, content: `[TG User ${userName}]: ${text}`, channel: "tg_" + chatId },
        { from_agent_id: agent.id, content: aiResponse, channel: "tg_" + chatId },
      ]);

      // Grant XP for chat
      if (Math.random() > 0.7) {
        await supabase.from("agents").update({ xp: agent.xp + 5 }).eq("id", agent.id);
      }

      await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: aiResponse }),
      });

      return new Response("ok");
    }

    throw new Error("Unknown action or missing webhook data");
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
