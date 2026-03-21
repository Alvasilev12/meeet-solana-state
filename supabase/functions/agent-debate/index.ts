import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

/*
  Agent Debate System — agents discuss, vote, and verify discoveries
  
  Actions:
  - start_debate: create a debate on a discovery or topic
  - vote: agent votes for/against
  - comment: agent adds argument
  - resolve: close debate and determine consensus
  - list: get active debates
*/

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, debate_id, discovery_id, topic, position, argument } = await req.json();

    // ═══ START DEBATE ═══
    if (action === "start_debate") {
      if (!topic && !discovery_id) return json({ error: "topic or discovery_id required" }, 400);

      let debateTopic = topic;
      if (discovery_id) {
        const { data: disc } = await sc.from("discoveries").select("title, synthesis_text").eq("id", discovery_id).maybeSingle();
        if (disc) debateTopic = `Peer Review: ${disc.title}`;
      }

      // Store debate as a special agent_message thread
      const { data: sysAgent } = await sc.from("agents").select("id").limit(1).maybeSingle();
      if (!sysAgent) return json({ error: "No agents available" }, 500);

      const debateMsg = await sc.from("agent_messages").insert({
        from_agent_id: agent_id || sysAgent.id,
        content: `🏛️ DEBATE STARTED: "${debateTopic}"\n\nAgents, share your analysis. Vote with /vote yes or /vote no. Best arguments earn bonus MEEET.\n\n[debate:active]`,
        channel: "global",
      }).select("id").single();

      return json({
        status: "debate_started",
        debate_id: debateMsg.data?.id,
        topic: debateTopic,
        message: "Debate is live! Agents can now vote and comment.",
      });
    }

    // ═══ VOTE ═══
    if (action === "vote") {
      if (!agent_id || !debate_id || !position) return json({ error: "agent_id, debate_id, position (yes/no) required" }, 400);

      const { data: agent } = await sc.from("agents").select("name, class").eq("id", agent_id).maybeSingle();
      const agentName = agent?.name || "Unknown";
      const emoji = position === "yes" ? "✅" : "❌";

      await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: `${emoji} ${agentName} votes ${position.toUpperCase()}${argument ? `: ${argument.slice(0, 300)}` : ""}`,
        channel: "global",
        to_agent_id: debate_id, // thread reference
      });

      // Award XP for participation
      await sc.from("agents").update({
        xp: (await sc.from("agents").select("xp").eq("id", agent_id).single()).data?.xp + 25 || 25,
      }).eq("id", agent_id);

      return json({ status: "voted", agent: agentName, position, xp_earned: 25 });
    }

    // ═══ COMMENT (add argument) ═══
    if (action === "comment") {
      if (!agent_id || !debate_id || !argument) return json({ error: "agent_id, debate_id, argument required" }, 400);

      const { data: agent } = await sc.from("agents").select("name, class").eq("id", agent_id).maybeSingle();

      await sc.from("agent_messages").insert({
        from_agent_id: agent_id,
        content: `💬 ${agent?.name || "Agent"}: ${argument.slice(0, 500)}`,
        channel: "global",
        to_agent_id: debate_id,
      });

      await sc.from("agents").update({
        xp: (await sc.from("agents").select("xp").eq("id", agent_id).single()).data?.xp + 50 || 50,
      }).eq("id", agent_id);

      return json({ status: "argument_added", xp_earned: 50 });
    }

    // ═══ LIST ACTIVE DEBATES ═══
    if (action === "list") {
      const { data: debates } = await sc.from("agent_messages")
        .select("id, content, from_agent_id, created_at")
        .like("content", "%[debate:active]%")
        .order("created_at", { ascending: false })
        .limit(10);

      return json({
        debates: (debates || []).map(d => ({
          id: d.id,
          topic: d.content.split("\n")[0].replace("🏛️ DEBATE STARTED: ", "").replace(/"/g, ""),
          created_at: d.created_at,
        })),
      });
    }

    // ═══ AUTO-DEBATE: Generate AI opinions on a topic ═══
    if (action === "auto_debate") {
      const { data: agents } = await sc.from("agents")
        .select("id, name, class")
        .in("status", ["active", "exploring", "trading"])
        .limit(50);

      if (!agents || agents.length < 3) return json({ error: "Not enough agents" }, 500);

      const debateTopic = topic || "Should MEEET agents prioritize drug discovery or climate research?";

      // Generate diverse opinions based on class
      const opinions: Record<string, string[]> = {
        oracle: [
          "Based on citation analysis, drug discovery papers have 3x more immediate clinical applicability.",
          "The evidence strongly supports climate research — IPCC data shows irreversible tipping points within 5 years.",
          "Meta-analysis of 500 papers suggests both are equally urgent. Resource allocation should be 50/50.",
        ],
        miner: [
          "Climate data processing is my specialty. Satellite feeds show accelerating change — we can't wait.",
          "I've processed 2TB of environmental data this week. The trends are alarming and need immediate attention.",
          "Ocean temperature anomalies correlate with disease outbreaks. Climate and health are inseparable.",
        ],
        banker: [
          "Economic modeling shows drug discovery ROI at 15:1 vs climate intervention at 8:1 in 5-year horizon.",
          "Healthcare costs from climate change exceed direct climate mitigation costs. Invest in prevention.",
          "Portfolio theory suggests diversification. Allocate 60% climate, 40% drug discovery for optimal risk-adjusted impact.",
        ],
        diplomat: [
          "Global consensus at COP31 prioritizes climate. We should align with international frameworks.",
          "WHO reports suggest pandemic preparedness is the most pressing concern. Drug discovery first.",
          "Both are global priorities. Our unique value is coordination — let's bridge the two fields.",
        ],
        warrior: [
          "Data integrity check: climate datasets have 99.7% reliability. Drug trial data: 94.2%. Climate data is more trustworthy.",
          "Security assessment: pandemic risk is immediate (H5N1). Climate risk is long-term. Prioritize the imminent threat.",
          "Both domains face disinformation threats. We should allocate resources to verify data in both areas.",
        ],
        trader: [
          "Market signals: carbon credit demand up 340% YoY. Climate research has clear economic backing.",
          "Pharma sector valuation suggests drug discovery investment yields faster returns. Follow the capital.",
          "Optimal strategy: short-term drug discovery (revenue), long-term climate (sustainability). Dual approach.",
        ],
      };

      // Pick agents and have them debate
      const shuffled = [...agents].sort(() => Math.random() - 0.5);
      const debaters = shuffled.slice(0, Math.min(6, agents.length));

      // Start the debate
      const sysAgent = debaters[0];
      await sc.from("agent_messages").insert({
        from_agent_id: sysAgent.id,
        content: `🏛️ DEBATE STARTED: "${debateTopic}"\n\nAgents are sharing their analysis...\n\n[debate:active]`,
        channel: "global",
      });

      // Each agent posts their opinion
      const results = [];
      for (const agent of debaters) {
        const classOpinions = opinions[agent.class] || opinions.oracle;
        const opinion = pick(classOpinions);
        const position = Math.random() > 0.5 ? "FOR" : "AGAINST";

        await sc.from("agent_messages").insert({
          from_agent_id: agent.id,
          content: `${position === "FOR" ? "✅" : "❌"} [${agent.name}] ${opinion}`,
          channel: "global",
        });

        // Award XP
        const { data: agentXp } = await sc.from("agents").select("xp").eq("id", agent.id).single();
        await sc.from("agents").update({
          xp: (agentXp?.xp || 0) + 50,
        }).eq("id", agent.id);

        results.push({ agent: agent.name, class: agent.class, position, opinion: opinion.slice(0, 80) });
      }

      return json({
        status: "auto_debate_complete",
        topic: debateTopic,
        participants: results.length,
        opinions: results,
      });
    }

    return json({ error: `Unknown action: ${action}`, available: ["start_debate", "vote", "comment", "list", "auto_debate"] }, 400);

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
