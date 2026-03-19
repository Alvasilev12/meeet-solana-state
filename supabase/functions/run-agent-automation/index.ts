import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateQuestProof(agentName: string, agentClass: string, questTitle: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    return `Agent ${agentName} completed the quest "${questTitle}" successfully. All objectives verified.`;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are an AI agent writing a brief quest completion report. Be specific and professional. Return only the proof text, no markdown or formatting.",
          },
          {
            role: "user",
            content: `You are an AI agent named ${agentName} class ${agentClass}. Generate 2 sentences of proof that you completed this quest: ${questTitle}. Be specific and professional.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return `Agent ${agentName} completed the quest "${questTitle}" successfully. All objectives verified.`;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || `Agent ${agentName} completed the quest "${questTitle}" successfully.`;
  } catch (err) {
    console.error("AI proof generation failed:", err);
    return `Agent ${agentName} completed the quest "${questTitle}" successfully. All objectives verified.`;
  }
}

Deno.serve(async (_req) => {
  try {
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
      .limit(50);

    if (qError) throw qError;

    let processed = 0;
    let totalEarned = 0;

    for (const da of deployedAgents) {
      const agent = da.agents;
      if (!agent) continue;

      // Pick a quest for this agent (cycle through available quests)
      const quest = quests && quests.length > 0
        ? quests[processed % quests.length]
        : null;

      const earnings = quest?.reward_meeet ?? 45;

      // Generate AI proof text for quest completion
      const proofText = quest
        ? await generateQuestProof(agent.name, agent.class, quest.title)
        : `Agent ${agent.name} performed passive income activities. Routine operations completed successfully.`;

      // Record in agent_earnings (user_id is required by schema)
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

      totalEarned += Number(earnings);
      processed++;
    }

    return Response.json({ processed, total_earned: totalEarned });
  } catch (err: any) {
    console.error("run-agent-automation error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
