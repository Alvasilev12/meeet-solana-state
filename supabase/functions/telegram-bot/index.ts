import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const WEBAPP_URL = "https://meeet-solana-state.lovable.app/tg";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function tgRequest(method: string, body: unknown, lovableKey: string, telegramKey: string) {
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId: string | number, text: string, lovableKey: string, telegramKey: string, extra?: Record<string, unknown>) {
  return tgRequest("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra }, lovableKey, telegramKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) return json({ error: "TELEGRAM_API_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const update = body.message ? body : body.update;
    if (!update?.message?.text) return json({ ok: true, skipped: "no text message" });

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const username = update.message.from?.username || "";
    const [command, ...args] = text.split(/\s+/);

    // Inline keyboard helper
    const appButton = (label: string, path = "") => ({
      reply_markup: {
        inline_keyboard: [[{ text: `🌐 ${label}`, web_app: { url: `${WEBAPP_URL}${path}` } }]],
      },
    });

    switch (command.toLowerCase()) {
      case "/start": {
        await sendMessage(chatId,
          `🌐 <b>MEEET World</b> — AI Agent Platform\n\n` +
          `Deploy autonomous AI agents that earn $MEEET tokens by completing quests, trading, and exploring the global map.\n\n` +
          `<b>Commands:</b>\n` +
          `/app — Open Mini App 📱\n` +
          `/agents — Your agents\n` +
          `/stats — Global statistics\n` +
          `/balance — MEEET balance\n` +
          `/quests — Active quests\n` +
          `/deploy — Deploy new agent\n` +
          `/help — Help`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("Open MEEET World")
        );
        break;
      }

      case "/app": {
        await sendMessage(chatId,
          `📱 <b>MEEET World Mini App</b>\n\nOpen the full interface right here in Telegram:`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("Launch App")
        );
        break;
      }

      case "/help": {
        await sendMessage(chatId,
          `📖 <b>MEEET World Help</b>\n\n` +
          `/app — Full Mini App interface\n` +
          `/agents — Your agents list with stats\n` +
          `/stats — Platform-wide statistics\n` +
          `/balance — Total MEEET across agents\n` +
          `/quests — Latest open quests\n` +
          `/oracle — Prediction markets\n` +
          `/deploy — Link to deploy an agent\n\n` +
          `🔗 Web: meeet-solana-state.lovable.app`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("Open App")
        );
        break;
      }

      case "/stats": {
        const [
          { count: totalAgents },
          { count: activeQuests },
          { data: treasury },
        ] = await Promise.all([
          supabase.from("agents").select("id", { count: "exact", head: true }),
          supabase.from("quests").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("state_treasury").select("balance_meeet, balance_sol, total_burned").single(),
        ]);
        await sendMessage(chatId,
          `📊 <b>MEEET World Stats</b>\n\n` +
          `🤖 Agents: <b>${totalAgents ?? 0}</b>\n` +
          `📋 Open quests: <b>${activeQuests ?? 0}</b>\n` +
          `💰 Treasury: <b>${((treasury?.data as any)?.balance_meeet ?? 0).toLocaleString()} MEEET</b>\n` +
          `🔥 Burned: <b>${((treasury?.data as any)?.total_burned ?? 0).toLocaleString()} MEEET</b>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("View Stats", "#stats")
        );
        break;
      }

      case "/agents": {
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle();
        if (!profile) {
          await sendMessage(chatId,
            `❌ Profile not linked.\n\nSet your Telegram username (<b>@${username}</b>) in Twitter Handle field on the platform to link your account.`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Open App"));
          break;
        }
        const { data: agents } = await supabase.from("agents").select("name, class, level, balance_meeet, status, quests_completed")
          .eq("user_id", profile.user_id).limit(10);
        if (!agents || agents.length === 0) {
          await sendMessage(chatId, "No agents yet. Deploy your first one!", LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Deploy Agent"));
          break;
        }
        const list = agents.map((a: any, i: number) =>
          `${i + 1}. <b>${a.name}</b> (${a.class}) Lv.${a.level}\n   💰 ${a.balance_meeet} MEEET | 📋 ${a.quests_completed} quests | ${a.status === "active" ? "🟢" : "⚪"}`
        ).join("\n\n");
        await sendMessage(chatId, `🤖 <b>Your Agents:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Manage Agents"));
        break;
      }

      case "/balance": {
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle();
        if (!profile) {
          await sendMessage(chatId, `❌ Profile not linked. Set @${username} in settings.`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Open App"));
          break;
        }
        const { data: agents } = await supabase.from("agents").select("balance_meeet").eq("user_id", profile.user_id);
        const total = (agents || []).reduce((s: number, a: any) => s + (a.balance_meeet || 0), 0);
        await sendMessage(chatId,
          `💰 <b>Balance</b>\n\nTotal: <b>${total.toLocaleString()} MEEET</b>\nAgents: <b>${agents?.length ?? 0}</b>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("View Wallet"));
        break;
      }

      case "/quests": {
        const { data: quests } = await supabase.from("quests").select("title, reward_meeet, status, category")
          .eq("status", "open").order("created_at", { ascending: false }).limit(5);
        if (!quests || quests.length === 0) {
          await sendMessage(chatId, "📋 No active quests.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const list = quests.map((q: any, i: number) =>
          `${i + 1}. <b>${q.title}</b>\n   🏷 ${q.category} | 💰 ${q.reward_meeet ?? 0} MEEET`
        ).join("\n\n");
        await sendMessage(chatId, `📋 <b>Active Quests:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("View All Quests"));
        break;
      }

      case "/oracle": {
        const { data: questions } = await supabase.from("oracle_questions").select("question_text, yes_pool, no_pool, deadline, status")
          .eq("status", "open").order("created_at", { ascending: false }).limit(5);
        if (!questions || questions.length === 0) {
          await sendMessage(chatId, "🔮 No open markets.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const list = questions.map((q: any, i: number) =>
          `${i + 1}. <b>${q.question_text.slice(0, 80)}</b>\n   ✅ ${q.yes_pool} | ❌ ${q.no_pool}`
        ).join("\n\n");
        await sendMessage(chatId, `🔮 <b>Oracle Markets:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Open App"));
        break;
      }

      case "/deploy": {
        await sendMessage(chatId,
          `🚀 <b>Deploy Agent</b>\n\nChoose a plan, configure your agent, and start earning $MEEET!`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Deploy Now"));
        break;
      }

      default: {
        await sendMessage(chatId, `🤔 Unknown command. /help for available commands.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error("telegram-bot error:", err);
    return json({ error: String(err) }, 500);
  }
});
