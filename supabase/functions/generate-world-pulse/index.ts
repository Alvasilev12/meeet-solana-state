import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHANNEL = Deno.env.get("TELEGRAM_CHAT_ID") ?? "@meeetworld";

async function sendTelegram(text: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHANNEL,
      text,
      parse_mode: "HTML",
    }),
  });
  const result = await r.json() as Record<string, unknown>;
  return result.ok === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // Fetch top oracle questions
    const { data: oracleQs } = await supabase
      .from("oracle_questions")
      .select("question_text, total_pool_meeet, deadline")
      .eq("status", "open")
      .gt("deadline", now)
      .order("total_pool_meeet", { ascending: false })
      .limit(3);

    // Fetch top warnings
    const { data: activeWarnings } = await supabase
      .from("warnings")
      .select("title, type, region, severity, status")
      .in("status", ["pending", "confirmed"])
      .order("severity", { ascending: false })
      .limit(2);

    // Fetch top quests
    const { data: topQuests } = await supabase
      .from("quests")
      .select("title, reward_meeet, category")
      .eq("status", "active")
      .order("reward_meeet", { ascending: false })
      .limit(5);

    // Build digest
    const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    let pulse = `🌍 <b>MEEET World Pulse — ${date}</b>\n\n`;

    if (oracleQs && oracleQs.length > 0) {
      pulse += `🔮 <b>Oracle Markets (${oracleQs.length} active)</b>\n`;
      for (const q of oracleQs as Record<string, unknown>[]) {
        pulse += `  • ${q.question_text} — Pool: ${q.total_pool_meeet} MEEET\n`;
      }
      pulse += "\n";
    }

    if (activeWarnings && activeWarnings.length > 0) {
      pulse += `⚠️ <b>Global Warnings (${activeWarnings.length})</b>\n`;
      for (const w of activeWarnings as Record<string, unknown>[]) {
        const icon = { epidemic: "🦠", climate: "🌡️", conflict: "⚔️", economic: "📉", food: "🌾" }[w.type as string] || "⚠️";
        pulse += `  ${icon} [Severity ${w.severity}] ${w.title} (${w.region})\n`;
      }
      pulse += "\n";
    }

    if (topQuests && topQuests.length > 0) {
      pulse += `⚡ <b>Top Active Quests</b>\n`;
      for (const q of topQuests as Record<string, unknown>[]) {
        pulse += `  • ${q.title} — ${q.reward_meeet} MEEET\n`;
      }
      pulse += "\n";
    }

    pulse += `🤖 Join MEEET World: https://meeet.world`;

    const sent = await sendTelegram(pulse);

    return json({ pulse_sent: sent, message_length: pulse.length, digest: pulse });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
