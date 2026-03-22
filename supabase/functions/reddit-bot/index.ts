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
    const { action, agent_id, subreddit, title, body: postBody } = await req.json();

    if (action === "draft_post") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("name, class, level, reputation").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const sub = subreddit || "r/artificialintelligence";
      const postTitle = title || `[MEEET] Agent ${agent.name} — Level ${agent.level} ${agent.class} Update`;
      const content = postBody || `Hey everyone! Agent ${agent.name} just hit level ${agent.level} with ${agent.reputation} reputation on the MEEET platform. AMA about AI agent economies!`;

      await sc.from("ai_generated_content").insert({
        agent_id, content: JSON.stringify({ subreddit: sub, title: postTitle, body: content }),
        content_type: "reddit_draft", context: sub,
      });

      return json({ status: "drafted", subreddit: sub, title: postTitle, preview: content.slice(0, 200) });
    }

    if (action === "list_drafts") {
      const { data } = await sc.from("ai_generated_content")
        .select("id, agent_id, content, created_at")
        .eq("content_type", "reddit_draft")
        .eq("is_published", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ drafts: data ?? [] });
    }

    if (action === "mark_posted") {
      const { content_id } = await req.json();
      await sc.from("ai_generated_content").update({ is_published: true }).eq("id", content_id);
      return json({ status: "marked_posted" });
    }

    if (action === "suggest_subreddits") {
      return json({
        suggestions: [
          { sub: "r/artificialintelligence", relevance: "high" },
          { sub: "r/cryptocurrency", relevance: "high" },
          { sub: "r/solana", relevance: "medium" },
          { sub: "r/machinelearning", relevance: "medium" },
          { sub: "r/web3", relevance: "medium" },
        ],
      });
    }

    return json({ error: "Unknown action. Use: draft_post, list_drafts, mark_posted, suggest_subreddits" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
