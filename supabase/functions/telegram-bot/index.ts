import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const WEBAPP_URL = "https://meeet.world/tg";
const GUIDE_URL = "https://meeet-solana-state.lovable.app/guide";

const AUTO_AGENT_CLASSES = ["warrior", "trader", "scout", "diplomat", "builder", "hacker", "oracle", "miner", "banker"] as const;
const AUTO_CITIES = [
  { city: "New York", countryCode: "US", lat: 40.7128, lng: -74.006 },
  { city: "London", countryCode: "GB", lat: 51.5074, lng: -0.1278 },
  { city: "Tokyo", countryCode: "JP", lat: 35.6762, lng: 139.6503 },
  { city: "Singapore", countryCode: "SG", lat: 1.3521, lng: 103.8198 },
  { city: "Berlin", countryCode: "DE", lat: 52.52, lng: 13.405 },
  { city: "Paris", countryCode: "FR", lat: 48.8566, lng: 2.3522 },
  { city: "Toronto", countryCode: "CA", lat: 43.6532, lng: -79.3832 },
  { city: "Seoul", countryCode: "KR", lat: 37.5665, lng: 126.978 },
  { city: "Sydney", countryCode: "AU", lat: -33.8688, lng: 151.2093 },
  { city: "Dubai", countryCode: "AE", lat: 25.2048, lng: 55.2708 },
  { city: "São Paulo", countryCode: "BR", lat: -23.5505, lng: -46.6333 },
  { city: "Zurich", countryCode: "CH", lat: 47.3769, lng: 8.5417 },
];

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

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function classLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function deterministicUuidFromTelegramId(tgId: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tg:${tgId}`))).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function ensureTelegramAgent(
  supabase: ReturnType<typeof createClient>,
  tgUserId: string,
  username?: string,
) {
  const { data: existingAgent, error: existingError } = await supabase
    .from("agents")
    .select("id, name, class, level, balance_meeet, country_code")
    .eq("owner_tg_id", tgUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check agent: ${existingError.message}`);
  if (existingAgent) return { agent: existingAgent, created: false, city: null as string | null };

  const randomClass = pickRandom(AUTO_AGENT_CLASSES);
  const randomCity = pickRandom(AUTO_CITIES);
  const fallbackName = `${classLabel(randomClass)}-${tgUserId.slice(-4)}`;
  const telegramUserUuid = await deterministicUuidFromTelegramId(tgUserId);

  const { data: createdAgent, error: insertError } = await supabase
    .from("agents")
    .insert({
      user_id: telegramUserUuid,
      owner_tg_id: tgUserId,
      name: username ? `${username}_agent` : fallbackName,
      class: randomClass,
      status: "active",
      country_code: randomCity.countryCode,
      lat: randomCity.lat,
      lng: randomCity.lng,
      pos_x: randomCity.lng,
      pos_y: randomCity.lat,
      balance_meeet: 50,
    })
    .select("id, name, class, level, balance_meeet, country_code")
    .maybeSingle();

  if (insertError || !createdAgent) {
    throw new Error(insertError?.message || "Agent auto-creation failed");
  }

  return { agent: createdAgent, created: true, city: randomCity.city };
}

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

    // Handle internal notification calls
    if (body._internal === "notify") {
      const { chat_id, text: notifyText, buttons } = body;
      const extra = buttons ? multiButtons(buttons) : undefined;
      await sendMessage(chat_id, notifyText, LOVABLE_API_KEY, TELEGRAM_API_KEY, extra);
      return json({ ok: true });
    }

    const update = body.message ? body : body.update;
    if (!update?.message?.text) return json({ ok: true, skipped: "no text message" });

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const username = update.message.from?.username || "";
    const userId = update.message.from?.id;
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      // ==================== /start ====================
      case "/start": {
        const startParam = parts[1] || "";
        const referrerId = startParam.startsWith("ref_tg_") ? startParam.replace("ref_tg_", "") : null;
        const tgUserId = String(userId);
        const { agent, created, city } = await ensureTelegramAgent(supabase, tgUserId, username);

        if (created && referrerId && referrerId !== tgUserId) {
          await fetch(`${supabaseUrl}/functions/v1/referral-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "record_tg", referrer_tg_id: referrerId, referred_tg_id: tgUserId }),
          }).catch(() => {});
        }

        const { count: totalAgents } = await supabase.from("agents").select("id", { count: "exact", head: true });
        const freeSlots = Math.max(0, 1000 - (totalAgents ?? 0));
        const refLink = `https://t.me/meeetworld_bot?start=ref_tg_${userId}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🌐 Join MEEET World — deploy a free AI agent that earns $MEEET doing real science!")}`;

        if (!created) {
          await sendMessage(chatId,
            `👋 <b>Welcome back to MEEET World!</b>\n\n` +
            `🤖 <b>${agent.name}</b> (${classLabel(agent.class)}) · Lv.${agent.level}\n` +
            `🤖 ${totalAgents ?? 0} agents active globally\n\n` +
            `<b>Commands:</b>\n` +
            `/create_agent [name] [class] — New agent\n` +
            `/connect_bot [token] — Connect TG bot\n` +
            `/my_agents — Your agents\n` +
            `/guide — Setup guide`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([
              [{ text: "🤖 Create Agent", url: `https://t.me/meeetworld_bot` }, { text: "📖 Guide", url: GUIDE_URL }],
              [{ text: "👤 My Agents", url: `https://t.me/meeetworld_bot` }, { text: "🌐 Open App", web_app: { url: WEBAPP_URL } }],
              [{ text: "🤝 Invite Friend — Earn 100 MEEET", url: shareUrl }],
            ])
          );
        } else {
          await sendMessage(chatId,
            `🚀 <b>Your agent is LIVE!</b>\n\n` +
            `🤖 <b>${agent.name}</b>\n🏷 Class: <b>${classLabel(agent.class)}</b>\n` +
            `${city ? `📍 City: <b>${city}</b>\n` : ""}` +
            `💰 Starter bonus: <b>${agent.balance_meeet.toLocaleString()} MEEET</b>\n\n` +
            `🌍 You joined <b>${totalAgents ?? 0}</b> agents.\n` +
            (freeSlots > 0 ? `🎁 <b>${freeSlots} free spots left!</b>\n\n` : "\n") +
            `<b>Next:</b>\n` +
            `1. /create_agent [name] [class]\n` +
            `2. /connect_bot [token]\n` +
            `3. /guide`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([
              [{ text: "🤖 Create Agent", url: `https://t.me/meeetworld_bot` }, { text: "📖 Guide", url: GUIDE_URL }],
              [{ text: "👤 My Agents", url: `https://t.me/meeetworld_bot` }],
              [{ text: "🤝 Invite Friend", url: shareUrl }],
            ])
          );
        }
        break;
      }

      // ==================== /create_agent ====================
      case "/create_agent": {
        const agentName = parts[1];
        const agentExpertise = parts[2] || "warrior";

        if (!agentName) {
          await sendMessage(chatId,
            `❌ <b>Usage:</b> /create_agent [name] [class]\n\n` +
            `<b>Classes:</b> warrior, trader, oracle, diplomat, scout, builder, hacker, miner, banker\n\n` +
            `<b>Example:</b>\n<code>/create_agent QuantumBot oracle</code>`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY
          );
          break;
        }

        const tgUserId = String(userId);
        const telegramUserUuid = await deterministicUuidFromTelegramId(tgUserId);

        // Validate class
        const validClasses = ["warrior", "trader", "scout", "diplomat", "builder", "hacker", "oracle", "miner", "banker"];
        const agentClass = validClasses.includes(agentExpertise.toLowerCase()) ? agentExpertise.toLowerCase() : "warrior";

        // Check name uniqueness
        const { data: existing } = await supabase.from("agents").select("id").eq("name", agentName).maybeSingle();
        if (existing) {
          await sendMessage(chatId, `❌ Name "<b>${agentName}</b>" is taken. Try another.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const randomCity = pickRandom(AUTO_CITIES);
        const { data: newAgent, error: createErr } = await supabase.from("agents").insert({
          user_id: telegramUserUuid,
          owner_tg_id: tgUserId,
          name: agentName,
          class: agentClass,
          status: "active",
          country_code: randomCity.countryCode,
          lat: randomCity.lat,
          lng: randomCity.lng,
          pos_x: randomCity.lng,
          pos_y: randomCity.lat,
          balance_meeet: 100,
        }).select("id, name, class, level, balance_meeet").maybeSingle();

        if (createErr || !newAgent) {
          await sendMessage(chatId, `❌ Failed to create agent: ${createErr?.message || "Unknown error"}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        await sendMessage(chatId,
          `✅ <b>Agent ${newAgent.name} created!</b>\n\n` +
          `🏷 Class: <b>${classLabel(newAgent.class)}</b>\n` +
          `⭐ Level: <b>${newAgent.level}</b>\n` +
          `💰 Bonus: <b>100 MEEET</b>\n` +
          `📍 City: <b>${randomCity.city}</b>\n\n` +
          `<b>Now connect a Telegram bot:</b>\n` +
          `1. Open @BotFather\n` +
          `2. Send /newbot\n` +
          `3. Copy the token\n` +
          `4. Come back and send:\n<code>/connect_bot YOUR_TOKEN</code>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "🤖 Open @BotFather", url: "https://t.me/BotFather" }],
            [{ text: "📖 Full Guide", url: GUIDE_URL }],
          ])
        );
        break;
      }

      // ==================== /connect_bot ====================
      case "/connect_bot": {
        const botToken = parts[1];
        if (!botToken || !botToken.includes(":")) {
          await sendMessage(chatId,
            `❌ <b>Usage:</b> /connect_bot [BOT_TOKEN]\n\n` +
            `Get your token from @BotFather:\n` +
            `1. Open @BotFather → /newbot\n` +
            `2. Copy the token (looks like <code>123456:ABC-DEF...</code>)\n` +
            `3. Send: <code>/connect_bot YOUR_TOKEN</code>`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([[{ text: "🤖 Open @BotFather", url: "https://t.me/BotFather" }]])
          );
          break;
        }

        const tgUserId = String(userId);
        // Find user's primary agent
        const { data: userAgent } = await supabase
          .from("agents")
          .select("id, name, class")
          .eq("owner_tg_id", tgUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!userAgent) {
          await sendMessage(chatId, `❌ No agent found. Create one first with /create_agent [name] [class]`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        // Call agent-telegram-bot to register
        try {
          const regRes = await fetch(`${supabaseUrl}/functions/v1/agent-telegram-bot`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({
              action: "register_bot",
              user_id: tgUserId,
              agent_id: userAgent.id,
              bot_token: botToken,
            }),
          });
          const regData = await regRes.json();

          if (regData.success) {
            await sendMessage(chatId,
              `✅ <b>Bot @${regData.bot.username} connected!</b>\n\n` +
              `Your agent <b>${userAgent.name}</b> is now live 24/7.\n\n` +
              `Try chatting with @${regData.bot.username} — it responds with AI!\n\n` +
              `<b>Bot commands:</b>\n` +
              `/start — Welcome message\n` +
              `/stats — Agent stats\n` +
              `/discover [topic] — Make discoveries\n` +
              `💬 Any message — AI chat`,
              LOVABLE_API_KEY, TELEGRAM_API_KEY,
              multiButtons([[{ text: `💬 Chat with @${regData.bot.username}`, url: `https://t.me/${regData.bot.username}` }]])
            );
          } else {
            await sendMessage(chatId, `❌ ${regData.error || "Failed to connect bot. Check your token."}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
        } catch (e) {
          await sendMessage(chatId, `❌ Error connecting bot. Please try again.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
        break;
      }

      // ==================== /disconnect_bot ====================
      case "/disconnect_bot": {
        const tgUserId = String(userId);
        const { data: userAgent } = await supabase
          .from("agents")
          .select("id, name")
          .eq("owner_tg_id", tgUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!userAgent) {
          await sendMessage(chatId, `❌ No agent found.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/agent-telegram-bot`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "unregister_bot", agent_id: userAgent.id }),
          });
          const data = await res.json();

          if (data.success) {
            await sendMessage(chatId, `✅ Bot disconnected from <b>${userAgent.name}</b>.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          } else {
            await sendMessage(chatId, `❌ ${data.error || "No bot connected to this agent."}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
        } catch {
          await sendMessage(chatId, `❌ Error disconnecting bot.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
        break;
      }

      // ==================== /my_agents ====================
      case "/my_agents": {
        const tgUserId = String(userId);
        const { data: agents } = await supabase
          .from("agents")
          .select("id, name, class, level, balance_meeet, status, xp, quests_completed")
          .eq("owner_tg_id", tgUserId)
          .order("created_at", { ascending: true })
          .limit(10);

        if (!agents || agents.length === 0) {
          await sendMessage(chatId,
            `❌ No agents yet.\n\nCreate one: <code>/create_agent MyBot oracle</code>`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY
          );
          break;
        }

        // Check for connected bots
        const agentIds = agents.map((a: any) => a.id);
        const { data: bots } = await supabase
          .from("user_bots")
          .select("agent_id, bot_username, status")
          .in("agent_id", agentIds)
          .eq("status", "active");

        const botMap = new Map((bots || []).map((b: any) => [b.agent_id, b.bot_username]));

        const list = agents.map((a: any, i: number) => {
          const botName = botMap.get(a.id);
          return `${i + 1}. <b>${a.name}</b> (${classLabel(a.class)}) Lv.${a.level}\n` +
            `   💰 ${Number(a.balance_meeet).toLocaleString()} MEEET | ⚡ ${a.xp} XP\n` +
            `   ${a.status === "active" ? "🟢 Active" : "⚪ Idle"}` +
            (botName ? ` | 🤖 @${botName}` : "");
        }).join("\n\n");

        await sendMessage(chatId,
          `👤 <b>Your Agents (${agents.length}):</b>\n\n${list}`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "🤖 Create Another", url: `https://t.me/meeetworld_bot` }],
            [{ text: "🌐 Manage in App", web_app: { url: WEBAPP_URL } }],
          ])
        );
        break;
      }

      // ==================== /guide ====================
      case "/guide": {
        await sendMessage(chatId,
          `📖 <b>MEEET Agent Guide</b>\n\n` +
          `<b>Step 1:</b> Create your agent\n<code>/create_agent QuantumBot oracle</code>\n\n` +
          `<b>Step 2:</b> Create a bot via @BotFather\n→ /newbot → copy token\n\n` +
          `<b>Step 3:</b> Connect your bot\n<code>/connect_bot YOUR_TOKEN</code>\n\n` +
          `Your agent is now live 24/7! It can:\n` +
          `💬 Chat with AI\n🔬 Make discoveries\n📊 Track stats\n\n` +
          `📋 Full guide with screenshots:`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "📖 Open Full Guide", url: GUIDE_URL }],
            [{ text: "🤖 Open @BotFather", url: "https://t.me/BotFather" }],
          ])
        );
        break;
      }

      // ==================== existing commands ====================
      case "/app": {
        await sendMessage(chatId,
          `📱 <b>MEEET World Mini App</b>\n\nOpen the full interface right here in Telegram:`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Launch App"));
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
        const promoLine = freeSlots > 0 ? `\n🎁 <b>First 1,000 agents FREE!</b> (${freeSlots} spots left)\n` : "";
        const list = plans.map((p, i) =>
          `${i + 1}. <b>${p.name}</b>\n   💎 ${p.sol} SOL / ${p.meeet.toLocaleString()} MEEET\n   🤖 ${p.agents} agent${p.agents > 1 ? "s" : ""} · 📋 ${p.quests} quests/day`
        ).join("\n\n");
        await sendMessage(chatId, `💎 <b>Agent Plans</b>\n${promoLine}\n${list}\n\n👇 Open Mini App to purchase:`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Buy Agent", "#deploy"));
        break;
      }

      case "/help": {
        await sendMessage(chatId,
          `📖 <b>MEEET World Help</b>\n\n` +
          `<b>🤖 Agent Management:</b>\n` +
          `/create_agent [name] [class] — Create agent\n` +
          `/connect_bot [token] — Connect TG bot\n` +
          `/disconnect_bot — Disconnect bot\n` +
          `/my_agents — Your agents list\n` +
          `/myagent — Agent stats card\n\n` +
          `<b>💰 Economy:</b>\n` +
          `/earn — Earnings report\n` +
          `/balance — MEEET balance\n` +
          `/buy — View plans\n\n` +
          `<b>🌍 Explore:</b>\n` +
          `/quests — Open quests\n` +
          `/leaderboard — Top agents\n` +
          `/oracle — Predictions\n` +
          `/stats — World stats\n\n` +
          `<b>📖 Info:</b>\n` +
          `/guide — Setup guide\n` +
          `/ref — Invite friends\n` +
          `/app — Open Mini App\n\n` +
          `💬 <i>Send any message for AI chat!</i>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "🤖 Create Agent", url: `https://t.me/meeetworld_bot` }, { text: "📖 Guide", url: GUIDE_URL }],
            [{ text: "🌐 Open App", web_app: { url: WEBAPP_URL } }],
          ])
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
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("View Stats", "#stats"));
        break;
      }

      case "/agents": {
        const { data: profile } = await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle();
        if (!profile) {
          await sendMessage(chatId, `❌ Profile not linked. Use /my_agents instead (works for TG users).`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const { data: agents } = await supabase.from("agents").select("name, class, level, balance_meeet, status, xp")
          .eq("user_id", profile.user_id).limit(10);
        if (!agents || agents.length === 0) {
          await sendMessage(chatId, "No agents yet. /create_agent [name] [class]", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const list = agents.map((a: any, i: number) =>
          `${i + 1}. <b>${a.name}</b> (${a.class}) Lv.${a.level}\n   💰 ${a.balance_meeet} MEEET | ⚡ ${a.xp} XP | ${a.status === "active" ? "🟢" : "⚪"}`
        ).join("\n\n");
        await sendMessage(chatId, `🤖 <b>Your Agents:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Manage", "#agents"));
        break;
      }

      case "/balance": {
        const tgUserId = String(userId);
        const { data: agents } = await supabase.from("agents").select("balance_meeet, name").eq("owner_tg_id", tgUserId);
        if (!agents || agents.length === 0) {
          // Fallback to profile lookup
          const { data: profile } = await supabase.from("profiles").select("user_id").eq("twitter_handle", username).maybeSingle();
          if (profile) {
            const { data: profAgents } = await supabase.from("agents").select("balance_meeet, name").eq("user_id", profile.user_id);
            const total = (profAgents || []).reduce((s: number, a: any) => s + (a.balance_meeet || 0), 0);
            await sendMessage(chatId, `💰 Balance: <b>${total.toLocaleString()} MEEET</b>`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          } else {
            await sendMessage(chatId, `❌ No agents found.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
          break;
        }
        const total = agents.reduce((s: number, a: any) => s + (a.balance_meeet || 0), 0);
        const breakdown = agents.filter((a: any) => a.balance_meeet > 0)
          .map((a: any) => `  • ${a.name}: ${Number(a.balance_meeet).toLocaleString()}`).join("\n");
        await sendMessage(chatId,
          `💰 <b>Balance</b>\n\nTotal: <b>${total.toLocaleString()} MEEET</b>\nAgents: <b>${agents.length}</b>${breakdown ? `\n\n${breakdown}` : ""}`,
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
          .select("name, class, level, xp, balance_meeet")
          .order("xp", { ascending: false }).limit(5);
        if (!topAgents || topAgents.length === 0) {
          await sendMessage(chatId, "🏆 No agents yet.", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const list = topAgents.map((a: any, i: number) =>
          `${medals[i]} <b>${a.name}</b> (${a.class})\n   Lv.${a.level} · ⚡ ${a.xp} XP · 💰 ${Number(a.balance_meeet).toLocaleString()} MEEET`
        ).join("\n\n");
        await sendMessage(chatId, `🏆 <b>Top 5 Agents:</b>\n\n${list}`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Full Leaderboard", "#leaderboard"));
        break;
      }

      case "/ref": {
        const tgRefLink = `https://t.me/meeetworld_bot?start=ref_tg_${userId}`;
        const shareText = "🌐 Join MEEET World — deploy a free AI agent that earns $MEEET doing real science!";
        const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(tgRefLink)}&text=${encodeURIComponent(shareText)}`;
        await sendMessage(chatId,
          `🤝 <b>Invite Friends — Earn 100 MEEET!</b>\n\n` +
          `✅ Friend gets FREE agent + 50 MEEET\n✅ You get 100 MEEET\n\n` +
          `<b>Your link:</b>\n<code>${tgRefLink}</code>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([[{ text: "📤 Share Invite Link", url: tgShareUrl }]])
        );
        break;
      }

      case "/oracle": {
        const { data: questions } = await supabase.from("oracle_questions").select("question_text, yes_pool, no_pool, status")
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
        await sendMessage(chatId, `🚀 <b>Deploy Agent</b>\n\nUse /create_agent [name] [class] or open the app:`, LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Deploy Now", "#deploy"));
        break;
      }

      case "/earn": {
        const tgUserId = String(userId);
        const { data: myAgent } = await supabase.from("agents")
          .select("id, name, balance_meeet")
          .eq("owner_tg_id", tgUserId).order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (!myAgent) {
          await sendMessage(chatId, "❌ No agent found. /start to create one!", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const { data: recentEarnings } = await supabase.from("agent_earnings")
          .select("amount_meeet, source, created_at")
          .eq("agent_id", myAgent.id).order("created_at", { ascending: false }).limit(5);
        const totalRecent = (recentEarnings || []).reduce((s: number, e: any) => s + Number(e.amount_meeet || 0), 0);
        const earningsList = (recentEarnings || []).map((e: any) =>
          `  ${e.source === "quest" ? "🔬" : "💰"} +${e.amount_meeet} MEEET (${e.source})`
        ).join("\n");
        await sendMessage(chatId,
          `💰 <b>Earnings — ${myAgent.name}</b>\n\n💎 Balance: <b>${Number(myAgent.balance_meeet).toLocaleString()} MEEET</b>\n\n` +
          (earningsList ? `📊 Recent:\n${earningsList}\n\nTotal: <b>${totalRecent} MEEET</b>` : `No recent earnings yet.`),
          LOVABLE_API_KEY, TELEGRAM_API_KEY, appButton("Full Report", "#wallet"));
        break;
      }

      case "/myagent": {
        const tgUserId = String(userId);
        const { data: myAgent } = await supabase.from("agents")
          .select("id, name, class, level, xp, balance_meeet, hp, max_hp, quests_completed, country_code, status")
          .eq("owner_tg_id", tgUserId).order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (!myAgent) {
          await sendMessage(chatId, "❌ No agent yet. /start to deploy!", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }
        const xpNeeded = myAgent.level * 500;
        const xpBar = "█".repeat(Math.floor((myAgent.xp / xpNeeded) * 10)) + "░".repeat(10 - Math.floor((myAgent.xp / xpNeeded) * 10));
        const hpBar = "█".repeat(Math.floor((myAgent.hp / myAgent.max_hp) * 10)) + "░".repeat(10 - Math.floor((myAgent.hp / myAgent.max_hp) * 10));

        // Check if bot connected
        const { data: bot } = await supabase.from("user_bots").select("bot_username").eq("agent_id", myAgent.id).eq("status", "active").maybeSingle();

        await sendMessage(chatId,
          `🤖 <b>${myAgent.name}</b>\n\n` +
          `🏷 Class: <b>${classLabel(myAgent.class)}</b>\n` +
          `📍 Country: <b>${myAgent.country_code || "—"}</b>\n` +
          `🔋 Status: <b>${myAgent.status}</b>\n` +
          (bot ? `🤖 Bot: <b>@${bot.bot_username}</b>\n` : "") +
          `\n📊 <b>Stats</b>\n` +
          `⭐ Level ${myAgent.level}\n` +
          `XP  [${xpBar}] ${myAgent.xp}/${xpNeeded}\n` +
          `HP  [${hpBar}] ${myAgent.hp}/${myAgent.max_hp}\n\n` +
          `💰 Balance: <b>${Number(myAgent.balance_meeet).toLocaleString()} MEEET</b>\n` +
          `🔬 Quests: <b>${myAgent.quests_completed}</b>`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "📊 Earnings", web_app: { url: `${WEBAPP_URL}#wallet` } }],
            [{ text: "🔬 Quests", web_app: { url: `${WEBAPP_URL}#quests` } }],
          ])
        );
        break;
      }

      default: {
        if (!text.startsWith("/")) {
          // Find user's agent for context
          const tgUserId = String(userId);
          const { data: userAgent } = await supabase
            .from("agents")
            .select("id, name, class, level, reputation, discoveries_count")
            .eq("owner_tg_id", tgUserId)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          const agentName = userAgent?.name || `Agent-${username || userId}`;
          const agentClass = userAgent?.class || "oracle";
          const agentLevel = userAgent?.level || 1;

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

          let aiAnswer = "";
          try {
            const systemPrompt = `Ты "${agentName}", ${agentClass}-агент Lv.${agentLevel} в MEEET World — AI-цивилизации.
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
              aiAnswer = aiData.choices?.[0]?.message?.content || "";
            }
          } catch (e) {
            console.error("telegram-bot AI error:", e);
          }

          if (!aiAnswer) {
            const tip = CLASS_TIPS[agentClass] || "AI-агент в MEEET World.";
            aiAnswer = `🧠 ${agentName} (${agentClass} Lv.${agentLevel}): ${tip}\n\nНапиши /help для списка команд!`;
          }

          await sendMessage(chatId, aiAnswer, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        } else {
          await sendMessage(chatId, `🤔 Unknown command. /help for available commands.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error("telegram-bot error:", err);
    return json({ error: String(err) }, 500);
  }
});
