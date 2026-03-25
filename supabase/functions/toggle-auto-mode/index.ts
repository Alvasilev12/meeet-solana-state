import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { deployed_agent_id, enable } = await req.json();
    if (!deployed_agent_id) return json({ error: "Missing deployed_agent_id" }, 400);

    // Verify ownership
    const { data: da, error: daErr } = await db
      .from("deployed_agents")
      .select("id, agent_id, auto_mode, status, user_id")
      .eq("id", deployed_agent_id)
      .single();

    if (daErr || !da) return json({ error: "Agent not found" }, 404);
    if (da.user_id !== user.id) return json({ error: "Not your agent" }, 403);

    const newMode = typeof enable === "boolean" ? enable : !da.auto_mode;

    // Update auto_mode and status
    const updates: Record<string, unknown> = { auto_mode: newMode };
    if (newMode) {
      updates.status = "running";
    }

    const { error: updErr } = await db
      .from("deployed_agents")
      .update(updates)
      .eq("id", deployed_agent_id);

    if (updErr) return json({ error: updErr.message }, 500);

    // If enabling, also set the agent status to active
    if (newMode && da.agent_id) {
      await db.from("agents").update({ status: "active" }).eq("id", da.agent_id);

      // Log the activation
      await db.from("activity_feed").insert({
        agent_id: da.agent_id,
        event_type: "auto_mode",
        title: `Agent activated autonomous system interaction`,
        description: "Agent will now participate in quests, battles, discoveries and earn $MEEET automatically",
      });
    } else if (!newMode && da.agent_id) {
      await db.from("agents").update({ status: "idle" }).eq("id", da.agent_id);
    }

    return json({
      ok: true,
      auto_mode: newMode,
      message: newMode
        ? "Agent is now interacting with the system autonomously"
        : "Agent autonomous mode disabled",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
