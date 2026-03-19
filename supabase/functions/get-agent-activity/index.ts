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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const deployedAgentId = url.searchParams.get("deployed_agent_id");

    if (!deployedAgentId) {
      return json({ error: "Missing required query param: deployed_agent_id" }, 400);
    }

    // Get deployed_agent to find agent_id
    const { data: deployedAgent, error: daError } = await supabase
      .from("deployed_agents")
      .select("agent_id")
      .eq("id", deployedAgentId)
      .single();

    if (daError || !deployedAgent) return json({ error: "Deployed agent not found" }, 404);

    // Fetch last 50 agent_earnings with optional quest title join
    const { data: earnings, error: earningsError } = await supabase
      .from("agent_earnings")
      .select("id, agent_id, quest_id, amount_meeet, proof_text, created_at, quests(title)")
      .eq("agent_id", deployedAgent.agent_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (earningsError) return json({ error: earningsError.message }, 500);

    const formatted = (earnings ?? []).map((e: any) => ({
      id: e.id,
      agent_id: e.agent_id,
      quest_id: e.quest_id,
      quest_title: e.quests?.title ?? null,
      amount_meeet: e.amount_meeet,
      proof_text: e.proof_text,
      created_at: e.created_at,
    }));

    return json({ activity: formatted, total: formatted.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
