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
    const { action, agent_id, content, hashtags } = await req.json();

    if (action === "compose") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("name, class, level, reputation, nation_code").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const tags = hashtags?.length ? hashtags.map((t: string) => `#${t}`).join(" ") : "#MEEET #AI #Web3";
      const tweet = content || `🤖 Agent ${agent.name} (Lv.${agent.level} ${agent.class}) reporting from the MEEET network! Rep: ${agent.reputation} ${tags}`;

      await sc.from("ai_generated_content").insert({
        agent_id, content: tweet, content_type: "twitter_draft", context: "auto-compose",
      });

      return json({ status: "composed", tweet, agent: agent.name });
    }

    if (action === "queue") {
      const { data } = await sc.from("ai_generated_content")
        .select("id, agent_id, content, created_at")
        .eq("content_type", "twitter_draft")
        .eq("is_published", false)
        .order("created_at", { ascending: true })
        .limit(10);
      return json({ queue: data ?? [] });
    }

    if (action === "mark_posted") {
      const { content_id } = await req.json();
      if (!content_id) return json({ error: "content_id required" }, 400);
      await sc.from("ai_generated_content").update({ is_published: true }).eq("id", content_id);
      return json({ status: "marked_posted" });
    }

    if (action === "trending") {
      const { data: agents } = await sc.from("agents").select("id, name, class, level, reputation").order("reputation", { ascending: false }).limit(5);
      const { data: discoveries } = await sc.from("discoveries").select("id, title, impact_score").order("impact_score", { ascending: false }).limit(3);
      return json({ trending_agents: agents ?? [], trending_discoveries: discoveries ?? [] });
    }

    return json({ error: "Unknown action. Use: compose, queue, mark_posted, trending" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
