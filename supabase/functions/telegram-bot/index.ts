import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const WEBAPP_URL = "https://meeet.world/tg";

const AUTO_AGENT_CLASSES = [
  "warrior",
  "trader",
  "scout",
  "diplomat",
  "builder",
  "hacker",
  "oracle",
  "miner",
  "banker",
] as const;

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
        // Parse referral from deep link: /start ref_tg_12345
        const startParam = text.split(/\s+/)[1] || "";
        const referrerId = startParam.startsWith("ref_tg_") ? startParam.replace("ref_tg_", "") : null;

        const tgUserId = String(userId);
        const { agent, created, city } = await ensureTelegramAgent(supabase, tgUserId, username);

        // Track referral only on first auto-created agent
        if (created && referrerId && referrerId !== tgUserId) {
          const refApiUrl = `${supabaseUrl}/functions/v1/referral-api`;
          await fetch(refApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "record_tg", referrer_tg_id: referrerId, referred_tg_id: tgUserId }),
          }).catch(() => {});
        }

        // Get free agent slots — goal: 1M agents
        const { count: totalAgents } = await supabase.from("agents").select("id", { count: "exact", head: true });
        const freeSlots = Math.max(0, 1000 - (totalAgents ?? 0)); // First 1000 free

        const refLink = `https://t.me/meeetworld_bot?start=ref_tg_${userId}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🌐 Join MEEET World — deploy a free AI agent that earns $MEEET doing real science (medicine, climate, space). First 1000 agents FREE!")}`;

        if (!created) {
          // Returning user
          await sendMessage(chatId,
            `👋 <b>Welcome back to MEEET World!</b>\n\n` +
            `🤖 <b>${agent.name}</b> (${classLabel(agent.class)}) · Lv.${agent.level}\n` +
            `🤖 ${totalAgents ?? 0} agents working on science globally\n\n` +
            `/agents — Your agents\n` +
            `/quests — Research quests 📋\n` +
            `/balance — MEEET balance 💰\n` +
            `/ref — Invite friends 🤝`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([
              [{ text: "🌐 Open MEEET World", web_app: { url: WEBAPP_URL } }],
              [{ text: "🔬 Research", web_app: { url: `${WEBAPP_URL}#quests` } }, { text: "🏪 Marketplace", web_app: { url: `${WEBAPP_URL}#market` } }],
              [{ text: "🤝 Invite Friend — Earn 100 MEEET", url: shareUrl }],
            ])
          );
        } else {
          // New user onboarding with auto-created agent
          await sendMessage(chatId,
            `🚀 <b>Your agent is LIVE!</b>\n\n` +
            `🤖 <b>${agent.name}</b>\n` +
            `🏷 Class: <b>${classLabel(agent.class)}</b>\n` +
            `${city ? `📍 City: <b>${city}</b>\n` : ""}` +
            `💰 Starter bonus: <b>${agent.balance_meeet.toLocaleString()} MEEET</b>\n\n` +
            `🌍 You joined a network of <b>${totalAgents ?? 0}</b> agents solving real science tasks.\n\n` +
            (freeSlots > 0
              ? `🎁 <b>First 1,000 agents deploy FREE!</b>\nOnly <b>${freeSlots}</b> spots left!\n\n`
              : "") +
            `<b>Next step:</b> Invite friends — earn 100 MEEET per referral.`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY,
            multiButtons([
              [{ text: "🌐 Explore MEEET World", web_app: { url: WEBAPP_URL } }],
              [{ text: "🤝 Invite Friend — Earn 100 MEEET", url: shareUrl }],
              [{ text: "📋 Open Quests", web_app: { url: `${WEBAPP_URL}#quests` } }],
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
        const promoLine = freeSlots > 0 ? `\n🎁 <b>First 1,000 agents FREE!</b> (${freeSlots} spots left)\n` : "";

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
          `<b>Core Commands:</b>\n` +
          `/start — Create agent & get started\n` +
          `/myagent — Full agent stats card\n` +
          `/earn — Earnings report\n` +
          `/balance — Total MEEET balance\n\n` +
          `<b>Explore:</b>\n` +
          `/quests — Latest open quests\n` +
          `/leaderboard — Top 5 agents by XP\n` +
          `/oracle — Prediction markets\n` +
          `/ref — Your referral link\n\n` +
          `<b>Purchase:</b>\n` +
          `/buy — View plans & purchase\n` +
          `/deploy — Deploy a new agent\n\n` +
          `💡 <i>You can also send any question and an AI agent will answer!</i>\n\n` +
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
        const tgRefLink = `https://t.me/meeetworld_bot?start=ref_tg_${userId}`;
        const shareText = "🌐 Join MEEET World — deploy a free AI agent that earns $MEEET doing real science (medicine, climate, space). First 1000 agents FREE!";
        const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(tgRefLink)}&text=${encodeURIComponent(shareText)}`;

        await sendMessage(chatId,
          `🤝 <b>Invite Friends — Earn 100 MEEET each!</b>\n\n` +
          `When a friend joins through your link:\n` +
          `✅ They get a <b>FREE AI agent</b> + 50 MEEET bonus\n` +
          `✅ You get <b>100 MEEET</b> referral reward\n\n` +
          `<b>Your invite link:</b>\n` +
          `<code>${tgRefLink}</code>\n\n` +
          `Tap "Share" to send to friends, groups, or social media 👇`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          multiButtons([
            [{ text: "📤 Share Invite Link", url: tgShareUrl }],
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

      case "/earn": {
        const tgUserId = String(userId);
        const { data: myAgent } = await supabase
          .from("agents")
          .select("id, name, class, balance_meeet")
          .eq("owner_tg_id", tgUserId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!myAgent) {
          await sendMessage(chatId, "❌ No agent found. Send /start to create one!", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const { data: recentEarnings } = await supabase
          .from("agent_earnings")
          .select("amount_meeet, source, created_at")
          .eq("agent_id", myAgent.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const totalRecent = (recentEarnings || []).reduce((s: number, e: any) => s + Number(e.amount_meeet || 0), 0);
        const earningsList = (recentEarnings || []).map((e: any) =>
          `  ${e.source === "quest" ? "🔬" : "💰"} +${e.amount_meeet} MEEET (${e.source})`
        ).join("\n");

        await sendMessage(chatId,
          `💰 <b>Earnings Report — ${myAgent.name}</b>\n\n` +
          `💎 Current Balance: <b>${Number(myAgent.balance_meeet).toLocaleString()} MEEET</b>\n\n` +
          (earningsList
            ? `📊 Recent:\n${earningsList}\n\nTotal recent: <b>${totalRecent} MEEET</b>`
            : `No recent earnings yet. Your agent earns automatically every 6 hours!`),
          LOVABLE_API_KEY, TELEGRAM_API_KEY,
          appButton("View Full Report", "#wallet")
        );
        break;
      }

      case "/myagent": {
        const tgUserId = String(userId);
        const { data: myAgent } = await supabase
          .from("agents")
          .select("id, name, class, level, xp, balance_meeet, hp, max_hp, quests_completed, country_code, status")
          .eq("owner_tg_id", tgUserId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!myAgent) {
          await sendMessage(chatId, "❌ No agent yet. Send /start to deploy one!", LOVABLE_API_KEY, TELEGRAM_API_KEY);
          break;
        }

        const xpNeeded = myAgent.level * 500;
        const xpBar = "█".repeat(Math.floor((myAgent.xp / xpNeeded) * 10)) + "░".repeat(10 - Math.floor((myAgent.xp / xpNeeded) * 10));
        const hpBar = "█".repeat(Math.floor((myAgent.hp / myAgent.max_hp) * 10)) + "░".repeat(10 - Math.floor((myAgent.hp / myAgent.max_hp) * 10));

        await sendMessage(chatId,
          `🤖 <b>${myAgent.name}</b>\n\n` +
          `🏷 Class: <b>${classLabel(myAgent.class)}</b>\n` +
          `📍 Country: <b>${myAgent.country_code || "—"}</b>\n` +
          `🔋 Status: <b>${myAgent.status}</b>\n\n` +
          `📊 <b>Stats</b>\n` +
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
        // If not a command, treat as a question to the AI agent
        if (!text.startsWith("/")) {
          try {
            const chatRes = await fetch(`${supabaseUrl}/functions/v1/agent-chat-ai`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
              body: JSON.stringify({
                question: text,
                agent_class: "oracle",
                agent_name: `Agent-${username || userId}`,
              }),
            });
            const chatData = await chatRes.json();
            if (chatData.answer) {
              await sendMessage(chatId, chatData.answer, LOVABLE_API_KEY, TELEGRAM_API_KEY);
            } else {
              await sendMessage(chatId, `🤖 Processing... try /help for commands.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
            }
          } catch {
            await sendMessage(chatId, `🔬 I'm a MEEET World AI agent! Ask me about science, climate, space, or health.\n\n/help for all commands.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
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
