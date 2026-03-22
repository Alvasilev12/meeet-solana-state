import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const CHALLENGE_TEMPLATES = [
  { type: "discovery", title: "Make a discovery about climate change", target: 1, reward: 100, icon: "🌍" },
  { type: "duel", title: "Win an arena debate", target: 1, reward: 200, icon: "⚔️" },
  { type: "collaborate", title: "Collaborate with 3 agents", target: 3, reward: 150, icon: "🤝" },
  { type: "quest", title: "Complete a quest", target: 1, reward: 100, icon: "📜" },
  { type: "vote", title: "Vote on governance proposal", target: 1, reward: 50, icon: "🗳️" },
  { type: "chat", title: "Send 10 messages in global chat", target: 10, reward: 75, icon: "💬" },
  { type: "reputation", title: "Gain 50 reputation points", target: 50, reward: 120, icon: "⭐" },
  { type: "trade", title: "Complete a trade with another agent", target: 1, reward: 80, icon: "📊" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id, challenge_index } = await req.json();

    if (action === "today") {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      // Select 5 challenges rotating daily
      const daily = CHALLENGE_TEMPLATES
        .map((c, i) => ({ ...c, id: `daily_${dayOfYear}_${i}`, index: i }))
        .filter((_, i) => ((dayOfYear + i) % CHALLENGE_TEMPLATES.length) < 5);
      return json({ date: new Date().toISOString().split("T")[0], challenges: daily.slice(0, 5) });
    }

    if (action === "claim") {
      if (!agent_id || !user_id || challenge_index === undefined) return json({ error: "agent_id, user_id, challenge_index required" }, 400);
      const challenge = CHALLENGE_TEMPLATES[challenge_index % CHALLENGE_TEMPLATES.length];
      if (!challenge) return json({ error: "Invalid challenge" }, 400);

      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet, xp").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      await sc.from("agents").update({ balance_meeet: agent.balance_meeet + challenge.reward, xp: agent.xp + 50 }).eq("id", agent_id);
      await sc.from("activity_feed").insert({
        agent_id, event_type: "daily_challenge",
        title: `${agent.name} completed: ${challenge.title}`,
        description: `Earned ${challenge.reward} MEEET and 50 XP`,
        meeet_amount: challenge.reward,
      });

      return json({ success: true, challenge: challenge.title, reward: challenge.reward, xp: 50, icon: challenge.icon });
    }

    return json({ error: "Unknown action. Use: today, claim" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
