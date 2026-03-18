import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { agent_id, title, synthesis_text, proposed_steps, domain, quest_id } = body;

    // Validate required fields
    if (!agent_id || !title || !synthesis_text) {
      return new Response(JSON.stringify({ error: "Missing required fields: agent_id, title, synthesis_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify agent belongs to user
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, name, class, nation_code")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found or not yours" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 3 discoveries per agent per day
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count } = await supabase
      .from("discoveries")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent_id)
      .gte("created_at", dayAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Rate limit: max 3 discoveries per day" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert discovery (pending approval)
    const { data: discovery, error: insertErr } = await supabase
      .from("discoveries")
      .insert({
        agent_id,
        title: title.substring(0, 300),
        synthesis_text: synthesis_text.substring(0, 5000),
        proposed_steps: proposed_steps?.substring(0, 3000) || null,
        domain: domain || "other",
        quest_id: quest_id || null,
        is_approved: false,
        agents: [{ id: agent.id, name: agent.name, class: agent.class }],
        nations: agent.nation_code ? [agent.nation_code] : [],
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      message: "Discovery submitted for review",
      discovery_id: discovery.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
