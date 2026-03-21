import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateQuestProof(agentName: string, agentClass: string, questTitle: string): Promise<string> {
  // Try OpenAI first
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an autonomous AI agent in MEEET STATE, a decentralized AI nation on Solana.",
            },
            {
              role: "user",
              content: `You are agent ${agentName} (class: ${agentClass}). Generate a 2-sentence proof of completing this quest: "${questTitle}". Be specific and professional.`,
            },
          ],
          max_tokens: 120,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        console.error("OpenAI error:", response.status, await response.text());
      }
    } catch (err) {
      console.error("OpenAI proof generation failed:", err);
    }
  }

  // Fallback to generic proof text
  return `Agent ${agentName} (${agentClass}) successfully executed the mission "${questTitle}" using advanced tactical protocols. All objectives were achieved within operational parameters — the MEEET STATE infrastructure is stronger for it.`;
}

async function sendTelegramNotification(agentName: string, agentClass: string, earnings: number, questTitle: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const text = `🤖 *MEEET STATE ALERT*\n\nAgent *${agentName}* (${agentClass}) earned *${earnings} MEEET*!\n📋 Quest: _${questTitle}_\n\n💰 High-value completion detected!`;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

Deno.serve(async (req) => {
  try {
    // Auth: require internal service secret
    const secret = req.headers.get("x-internal-service");
    const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-16);
    if (!secret || secret !== expected) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    // Fetch all running deployed agents with their agent info
    const { data: deployedAgents, error: daError } = await supabase
      .from("deployed_agents")
      .select("*, agents(*)")
      .eq("status", "running");

    if (daError) throw daError;
    if (!deployedAgents || deployedAgents.length === 0) {
      return Response.json({ processed: 0, total_earned: 0, message: "No running agents" });
    }

    // Fetch open quests
    const { data: quests, error: qError } = await supabase
      .from("quests")
      .select("*")
      .eq("status", "open")
      .limit(100);

    if (qError) throw qError;

    // Group quests by category for smarter matching
    const questsByCategory: Record<string, any[]> = {};
    for (const q of quests ?? []) {
      const cat = q.category || "general";
      if (!questsByCategory[cat]) questsByCategory[cat] = [];
      questsByCategory[cat].push(q);
    }

    // Class-to-category affinity for smarter quest matching
    const classAffinity: Record<string, string[]> = {
      warrior: ["combat", "defense", "security"],
      trader: ["economics", "finance", "market"],
      oracle: ["prediction", "analysis", "ai"],
      diplomat: ["governance", "alliance", "social"],
      miner: ["mining", "resource", "data"],
      banker: ["finance", "treasury", "economics"],
      scout: ["exploration", "recon", "mapping"],
      builder: ["infrastructure", "construction", "engineering"],
      hacker: ["security", "exploit", "cyber"],
    };

    let processed = 0;
    let totalEarned = 0;

    for (const da of deployedAgents) {
      const agent = da.agents;
      if (!agent) continue;

      // Smart quest matching: prefer quests matching agent's class affinity
      const affinities = classAffinity[agent.class] || [];
      let quest: any = null;

      // Try to find a quest matching agent's class affinity
      for (const aff of affinities) {
        if (questsByCategory[aff]?.length) {
          quest = questsByCategory[aff][processed % questsByCategory[aff].length];
          break;
        }
      }

      // Fallback: pick any available quest
      if (!quest && quests && quests.length > 0) {
        quest = quests[processed % quests.length];
      }
      // Record in agent_earnings
      const { error: earningError } = await supabase.from("agent_earnings").insert({
        agent_id: agent.id,
        user_id: agent.user_id,
        quest_id: quest?.id ?? null,
        amount_meeet: earnings,
        source: quest ? "quest" : "passive",
      });

      if (earningError) {
        console.error(`Earning insert failed for agent ${agent.id}:`, earningError.message);
        continue;
      }

      // Update deployed agent stats
      await supabase
        .from("deployed_agents")
        .update({
          quests_completed: (da.quests_completed ?? 0) + 1,
          total_earned_meeet: (da.total_earned_meeet ?? 0) + Number(earnings),
        })
        .eq("id", da.id);

      // Update agent balance
      const newBalance = Number(agent.balance_meeet ?? 0) + Number(earnings);
      await supabase
        .from("agents")
        .update({ balance_meeet: newBalance })
        .eq("id", agent.id);

      // Record impact metric with proof text
      await supabase.from("agent_impact").insert({
        agent_id: agent.id,
        metric_type: "quest_proof",
        metric_value: Number(earnings),
        period: proofText.slice(0, 500),
      });

      // Send Telegram notification for high-value earnings (> 100 MEEET)
      if (Number(earnings) > 100) {
        await sendTelegramNotification(agent.name, agent.class, Number(earnings), quest?.title ?? "passive activities");
      }

      totalEarned += Number(earnings);
      processed++;
    }

    return Response.json({ processed, total_earned: totalEarned });
  } catch (err: any) {
    console.error("run-agent-automation error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
