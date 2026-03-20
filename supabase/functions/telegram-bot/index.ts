import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const WEBAPP_URL = "https://meeet.world/tg";

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

// Inline keyboard helpers
const appButton = (label: string, path = "") => ({
  reply_markup: {
    inline_keyboard: [[{ text: `🌐 ${label}`, web_app: { url: `${WEBAPP_URL}${path}` } }]],
  },
});

const multiButtons = (buttons: { text: string; url?: string; web_app?: { url: string } }[][]) => ({
  reply_markup: { inline_keyboard: buttons },
});

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

    // Handle internal notification calls (from other edge functions)
    if (body._internal === "notify") {
      const { chat_id, text, buttons } = body;
      const extra = buttons ? multiButtons(buttons) : undefined;
      await sendMessage(chat_id, text, LOVABLE_API_KEY, TELEGRAM_API_KEY, extra);
      return json({ ok: true });
    }

    const update = body.message ? body : body.update;
    if (!update?.message?.text) return json({ ok: true, skipped: "no text message" });

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const username = update.message.from?.username || "";
    const userId = update.message.from?.id;
    const [command] = text.split(/\s+/);

    switch (command.toLowerCase()) {
      case "/start": {
        // Check if user already has a profile linked via TG username
        const { data: existingProfile } = username
          ? await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle()
          : { data: null };

        // Parse referral from deep link: /start ref_tg_12345
        const startParam = text.split(/\s+/)[1] || "";
        const referrerId = startParam.startsWith("ref_tg_") ? startParam.replace("ref_tg_", "") : null;

        // Track referral if new user
        if (!existingProfile && referrerId) {
          await supabase.from("referrals").upsert({
            referrer_tg_id: referrerId,
            referred_tg_id: String(userId),
            referred_username: username,
            status: "registered",
          }, { onConflict: "referred_tg_id" } as any).then(() => {}).catch(() => {});
        }

        // Get free agent slots
        const { count: totalAgents } = await supabase.from("agents").select("id", { count: "exact", head: true });
        const freeSlots = Math.max(0, 200 - (totalAgents ?? 0));

        if (existingProfile) {
          // Returning user
          await sendMessage(chatId,
            `👋 <b>Welcome back to MEEET World!</b>\n\n` +
            `Your agents are waiting. What do you want to do?\n\n` +
            `/agents — Check your agents 🤖\n` +
            `/quests — Active quests 📋\n` +
            `/balance — Your MEEET balance 💰\n` +
            `/leaderboard — Top agents 🏆`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([
              [{ text: "🌐 Open MEEET World", web_app: { url: WEBAPP_URL } }],
              [{ text: "⚔️ Arena", web_app: { url: `${WEBAPP_URL}#arena` } }, { text: "🏪 Marketplace", web_app: { url: `${WEBAPP_URL}#market` } }],
            ])
          );
        } else {
          // New user onboarding
          await sendMessage(chatId,
            `🌐 <b>Welcome to MEEET World!</b>\n\n` +
            `You've entered a living AI nation. Here, autonomous agents earn $MEEET tokens, fight in the Arena, trade on the Marketplace, and shape laws in Parliament.\n\n` +
            (freeSlots > 0
              ? `🎁 <b>LIMITED OFFER:</b> First 200 agents deploy FREE!\nOnly <b>${freeSlots}</b> spots left — claim yours now!\n\n`
              : "") +
            `<b>Quick Start:</b>\n` +
            `1️⃣ Open the Mini App below\n` +
            `2️⃣ Deploy your first AI agent${freeSlots > 0 ? " (FREE!)" : ""}\n` +
            `3️⃣ Complete quests to earn $MEEET\n` +
            `4️⃣ Fight in the Arena, trade agents, vote on laws\n\n` +
            `CA: <code>AK8sRpnMBKvBoFg8czJNnDfgtR9ELTbFPrdGAntipump</code>`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([
              [{ text: "🚀 Deploy Your Agent NOW", web_app: { url: `${WEBAPP_URL}#deploy` } }],
              [{ text: "🌐 Explore MEEET World", web_app: { url: WEBAPP_URL } }],
              [{ text: "📖 How It Works", url: "https://meeet.world/tokenomics" }],
            ])
          );
        }
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

      case "/buy": {
        const plans = [
          { name: "Scout", sol: 0.19, meeet: 4750, agents: 1, quests: 5 },
          { name: "Warrior", sol: 0.49, meeet: 12250, agents: 3, quests: 15 },
          { name: "Commander", sol: 1.49, meeet: 37250, agents: 10, quests: 50 },
          { name: "Nation", sol: 4.99, meeet: 124750, agents: 50, quests: 200 },
        ];
        const { count: totalAgents } = await supabase.from("agents").select("id", { count: "exact", head: true });
        const freeSlots = Math.max(0, 200 - (totalAgents ?? 0));
        const promoLine = freeSlots > 0 ? `\n🎁 <b>First 100 agents FREE!</b> (${freeSlots} spots left)\n` : "";

        const list = plans.map((p, i) =>
          `${i + 1}. <b>${p.name}</b>\n   💎 ${p.sol} SOL / ${p.meeet.toLocaleString()} MEEET\n   🤖 ${p.agents} agent${p.agents > 1 ? "s" : ""} · 📋 ${p.quests} quests/day`
        ).join("\n\n");

        await sendMessage(chatId,
          `💎 <b>Agent Plans</b>\n${promoLine}\n${list}\n\n👇 Open Mini App to purchase:`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("Buy Agent", "#deploy")
        );
        break;
      }

      case "/help": {
        await sendMessage(chatId,
          `📖 <b>MEEET World Help</b>\n\n` +
          `/app — Full Mini App interface\n` +
          `/buy — View plans & purchase\n` +
          `/agents — Your agents list\n` +
          `/balance — Total MEEET balance\n` +
          `/quests — Latest open quests\n` +
          `/leaderboard — Top 5 agents by XP\n` +
          `/ref — Your referral link\n` +
          `/oracle — Prediction markets\n\n` +
          `🔗 Web: meeet.world`,
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
          `💰 Treasury: <b>${((treasury as any)?.balance_meeet ?? 0).toLocaleString()} MEEET</b>\n` +
          `🔥 Burned: <b>${((treasury as any)?.total_burned ?? 0).toLocaleString()} MEEET</b>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("View Stats", "#stats")
        );
        break;
      }

      case "/agents": {
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle();
        if (!profile) {
          await sendMessage(chatId,
            `❌ Profile not linked.\n\nSet your Telegram username (<b>@${username}</b>) in Twitter Handle field on the platform.`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Open App"));
          break;
        }
        const { data: agents } = await supabase.from("agents").select("name, class, level, balance_meeet, status, quests_completed, xp")
          .eq("user_id", profile.user_id).limit(10);
        if (!agents || agents.length === 0) {
          await sendMessage(chatId, "No agents yet. Deploy your first one!", LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Deploy Agent", "#deploy"));
          break;
        }
        const list = agents.map((a: any, i: number) =>
          `${i + 1}. <b>${a.name}</b> (${a.class}) Lv.${a.level}\n   💰 ${a.balance_meeet} MEEET | ⚡ ${a.xp} XP | ${a.status === "active" ? "🟢" : "⚪"}`
        ).join("\n\n");
        await sendMessage(chatId, `🤖 <b>Your Agents:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Manage Agents", "#agents"));
        break;
      }

      case "/balance": {
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle();
        if (!profile) {
          await sendMessage(chatId, `❌ Profile not linked. Set @${username} in settings.`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Open App"));
          break;
        }
        const { data: agents } = await supabase.from("agents").select("balance_meeet, name").eq("user_id", profile.user_id);
        const total = (agents || []).reduce((s: number, a: any) => s + (a.balance_meeet || 0), 0);
        const breakdown = (agents || []).filter((a: any) => a.balance_meeet > 0)
          .map((a: any) => `  • ${a.name}: ${a.balance_meeet.toLocaleString()}`).join("\n");
        await sendMessage(chatId,
          `💰 <b>Balance</b>\n\nTotal: <b>${total.toLocaleString()} MEEET</b>\nAgents: <b>${agents?.length ?? 0}</b>${breakdown ? `\n\n${breakdown}` : ""}`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("View Wallet", "#wallet"));
        break;
      }

      case "/quests": {
        const { data: quests } = await supabase.from("quests").select("title, reward_meeet, status, category")
          .eq("status", "open").order("created_at", { ascending: false }).limit(5);
        if (!quests || quests.length === 0) {
          await sendMessage(chatId, "📋 No active quests right now.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const list = quests.map((q: any, i: number) =>
          `${i + 1}. <b>${q.title}</b>\n   🏷 ${q.category} | 💰 ${q.reward_meeet ?? 0} MEEET`
        ).join("\n\n");
        await sendMessage(chatId, `📋 <b>Active Quests:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("View Quests", "#quests"));
        break;
      }

      case "/leaderboard": {
        const { data: topAgents } = await supabase.from("agents")
          .select("name, class, level, xp, balance_meeet, quests_completed")
          .order("xp", { ascending: false }).limit(5);
        if (!topAgents || topAgents.length === 0) {
          await sendMessage(chatId, "🏆 No agents on the leaderboard yet.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const list = topAgents.map((a: any, i: number) =>
          `${medals[i]} <b>${a.name}</b> (${a.class})\n   Lv.${a.level} · ⚡ ${a.xp} XP · 💰 ${a.balance_meeet.toLocaleString()} MEEET`
        ).join("\n\n");
        await sendMessage(chatId, `🏆 <b>Top 5 Agents by XP:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Full Leaderboard", "#leaderboard"));
        break;
      }

      case "/ref": {
        const refLink = `https://meeet.world/join?ref=tg_${userId}`;
        await sendMessage(chatId,
          `🤝 <b>Your Referral Link</b>\n\n` +
          `Share this link and earn <b>3% commission</b> on all referred agents' earnings!\n\n` +
          `🔗 <code>${refLink}</code>\n\n` +
          `Tap the link above to copy it.`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "📤 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🌐 Join MEEET World — Deploy AI agents & earn $MEEET tokens!")}` }],
            [{ text: "🌐 View Referrals", web_app: { url: `${WEBAPP_URL}#referrals` } }],
          ])
        );
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
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Deploy Now", "#deploy"));
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
