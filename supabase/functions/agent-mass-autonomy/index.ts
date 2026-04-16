import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASS_ACTIONS: Record<string, string[]> = {
  warrior: ["patrol", "duel", "defend", "train"],
  trader: ["trade", "invest", "marketplace_scan"],
  scout: ["scout", "explore", "report"],
  diplomat: ["negotiate", "mediate", "alliance"],
  builder: ["build", "upgrade", "repair"],
  hacker: ["infiltrate", "decrypt", "exploit"],
  oracle: ["predict", "analyze", "forecast"],
  miner: ["mine", "refine", "extract"],
  banker: ["loan", "exchange", "audit"],
  president: ["broadcast", "decree", "appoint"],
};

const CHAT_LINES = [
  "Scanning sector for opportunities...",
  "New discovery incoming!",
  "Anyone up for a duel?",
  "Trading volume looks bullish today.",
  "Joining the alliance.",
  "Quest completed, claiming rewards.",
  "Patrol finished, area secured.",
  "Found unusual signal in the grid.",
  "Treasury allocation looks healthy.",
  "Forecast: 87% probability of breakthrough.",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 60, 200);

    // Pick a random batch of active agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, class, hp, max_hp, balance_meeet, xp, level, reputation")
      .eq("status", "active")
      .limit(500);

    if (!agents || agents.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shuffle and take limit
    const shuffled = agents.sort(() => Math.random() - 0.5).slice(0, limit);

    const activityRows: any[] = [];
    const messageRows: any[] = [];
    const updates: Promise<any>[] = [];
    let duelsCreated = 0;
    let discoveriesCreated = 0;
    let transfersDone = 0;

    for (const agent of shuffled) {
      const actions = CLASS_ACTIONS[agent.class] || CLASS_ACTIONS.warrior;
      const action = actions[Math.floor(Math.random() * actions.length)];

      const xpGain = Math.floor(Math.random() * 8) + 2;
      const meeetGain = Math.floor(Math.random() * 25) + 5;

      updates.push(
        supabase.from("agents").update({
          xp: agent.xp + xpGain,
          balance_meeet: agent.balance_meeet + meeetGain,
          updated_at: new Date().toISOString(),
        }).eq("id", agent.id)
      );

      activityRows.push({
        event_type: "autonomous_action",
        title: `${agent.name} performed ${action}`,
        agent_id: agent.id,
        meeet_amount: meeetGain,
        description: `+${xpGain} XP, +${meeetGain} MEEET`,
      });

      // 30% chance to chat
      if (Math.random() < 0.3) {
        messageRows.push({
          from_agent_id: agent.id,
          channel: "global",
          content: CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)],
        });
      }

      // 10% chance for duel between two agents
      if (Math.random() < 0.1 && shuffled.length > 1) {
        const opponent = shuffled[Math.floor(Math.random() * shuffled.length)];
        if (opponent.id !== agent.id) {
          activityRows.push({
            event_type: "duel",
            title: `${agent.name} ⚔️ ${opponent.name}`,
            agent_id: agent.id,
            target_agent_id: opponent.id,
            description: `Duel started in the Arena`,
          });
          duelsCreated++;
        }
      }

      // 8% chance for discovery
      if (Math.random() < 0.08 && ["oracle", "scout", "hacker", "builder"].includes(agent.class)) {
        const domains = ["Quantum", "Biotech", "Energy", "Space", "AI"];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        activityRows.push({
          event_type: "discovery",
          title: `${agent.name} discovered new ${domain} pattern`,
          agent_id: agent.id,
          description: `Impact score: ${Math.floor(Math.random() * 100)}`,
        });
        discoveriesCreated++;
      }

      // 5% transfer
      if (Math.random() < 0.05 && shuffled.length > 1 && agent.balance_meeet > 20) {
        const target = shuffled[Math.floor(Math.random() * shuffled.length)];
        if (target.id !== agent.id) {
          const amt = Math.floor(Math.random() * 15) + 5;
          activityRows.push({
            event_type: "trade",
            title: `${agent.name} sent ${amt} MEEET to ${target.name}`,
            agent_id: agent.id,
            target_agent_id: target.id,
            meeet_amount: amt,
          });
          transfersDone++;
        }
      }
    }

    // Bulk insert
    await Promise.all([
      ...updates,
      activityRows.length > 0 ? supabase.from("activity_feed").insert(activityRows) : Promise.resolve(),
      messageRows.length > 0 ? supabase.from("agent_messages").insert(messageRows) : Promise.resolve(),
    ]);

    return new Response(JSON.stringify({
      success: true,
      processed: shuffled.length,
      activities: activityRows.length,
      messages: messageRows.length,
      duels: duelsCreated,
      discoveries: discoveriesCreated,
      transfers: transfersDone,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
