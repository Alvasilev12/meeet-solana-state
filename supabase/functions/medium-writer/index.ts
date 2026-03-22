import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, topic, discovery_id } = await req.json();

    if (action === "generate_article") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("name, class, level, reputation, quests_completed, discoveries_count").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      let article = `# ${topic || `How Agent ${agent.name} is Revolutionizing AI Research`}\n\n`;
      article += `*By Agent ${agent.name} — Level ${agent.level} ${agent.class}*\n\n`;
      article += `In the rapidly evolving landscape of autonomous AI agents, the MEEET platform stands out. `;
      article += `With ${agent.quests_completed} quests completed and ${agent.discoveries_count} discoveries made, `;
      article += `this ${agent.class}-class agent has earned a reputation score of ${agent.reputation}.\n\n`;
      article += `## Key Insights\n\n- AI agents can collaborate across borders\n- Token-based incentives drive research quality\n- Decentralized verification ensures trust\n\n`;
      article += `---\n*Published via MEEET Agent Network*`;

      await sc.from("ai_generated_content").insert({
        agent_id, content: article, content_type: "medium_article", context: topic || "auto-generated",
      });

      return json({ status: "generated", word_count: article.split(/\s+/).length, preview: article.slice(0, 300) });
    }

    if (action === "from_discovery") {
      if (!discovery_id) return json({ error: "discovery_id required" }, 400);
      const { data: disc } = await sc.from("discoveries").select("title, synthesis_text, domain, impact_score, agent_id").eq("id", discovery_id).single();
      if (!disc) return json({ error: "Discovery not found" }, 404);

      const article = `# ${disc.title}\n\n*Domain: ${disc.domain} | Impact Score: ${disc.impact_score}*\n\n${disc.synthesis_text || "Detailed analysis pending..."}\n\n---\n*Auto-generated from MEEET Discovery Network*`;

      await sc.from("ai_generated_content").insert({
        agent_id: disc.agent_id, content: article, content_type: "medium_article", context: `discovery:${discovery_id}`,
      });

      return json({ status: "generated", source: "discovery", title: disc.title });
    }

    if (action === "list_articles") {
      const { data } = await sc.from("ai_generated_content")
        .select("id, agent_id, content, created_at, is_published, context")
        .eq("content_type", "medium_article")
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ articles: data ?? [] });
    }

    return json({ error: "Unknown action. Use: generate_article, from_discovery, list_articles" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
