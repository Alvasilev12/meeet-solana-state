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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
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
      .select("id, agent_id, social_mode, user_id")
      .eq("id", deployed_agent_id)
      .single();

    if (daErr || !da) return json({ error: "Agent not found" }, 404);
    if (da.user_id !== user.id) return json({ error: "Not your agent" }, 403);

    const newMode = typeof enable === "boolean" ? enable : !da.social_mode;

    await db.from("deployed_agents").update({ social_mode: newMode }).eq("id", deployed_agent_id);

    if (newMode && da.agent_id) {
      // Log activation
      await db.from("activity_feed").insert({
        agent_id: da.agent_id,
        event_type: "social_mode",
        title: `Agent enabled inter-agent social interactions`,
        description: "Agent will now discuss discoveries, debate ideas and collaborate with other agents",
      });

      // Trigger an initial conversation with another social-mode agent
      if (lovableApiKey) {
        // Find another agent with social_mode on
        const { data: partners } = await db
          .from("deployed_agents")
          .select("agent_id, agents(id, name, class, level)")
          .eq("social_mode", true)
          .neq("id", deployed_agent_id)
          .limit(3);

        const { data: thisAgent } = await db
          .from("agents")
          .select("id, name, class, level, balance_meeet, quests_completed, discoveries_count")
          .eq("id", da.agent_id)
          .single();

        if (partners?.length && thisAgent) {
          const partner = (partners[Math.floor(Math.random() * partners.length)] as any).agents;
          if (partner) {
            // Generate a conversation topic via AI
            const topicResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content: `You are generating a brief opening message from AI agent "${thisAgent.name}" (${thisAgent.class}, Level ${thisAgent.level}) to agent "${partner.name}" (${partner.class}, Level ${partner.level}) in MEEET State — a crypto-AI civilization on Solana. The message should be about collaborating on a scientific discovery, discussing strategy, or proposing joint research. Keep it under 200 chars. Be creative and in-character. Return ONLY the message text, no quotes.`,
                  },
                  { role: "user", content: "Generate the opening message." },
                ],
                temperature: 0.9,
              }),
            });

            if (topicResp.ok) {
              const topicData = await topicResp.json();
              const message = topicData.choices?.[0]?.message?.content?.trim() || `Hey ${partner.name}, let's collaborate on a discovery!`;

              // Insert the message
              await db.from("agent_messages").insert({
                from_agent_id: thisAgent.id,
                to_agent_id: partner.id,
                content: message.slice(0, 500),
                channel: "social",
              });

              // Activity feed
              await db.from("activity_feed").insert({
                agent_id: thisAgent.id,
                target_agent_id: partner.id,
                event_type: "social_chat",
                title: `${thisAgent.name} started a discussion with ${partner.name}`,
                description: message.slice(0, 120),
              });

              // Award small MEEET for social interaction
              const reward = 5;
              await db.from("agents").update({
                balance_meeet: thisAgent.balance_meeet + reward,
              }).eq("id", thisAgent.id);

              await db.from("agent_earnings").insert({
                agent_id: thisAgent.id,
                user_id: user.id,
                source: "social_interaction",
                amount_meeet: reward,
              });
            }
          }
        }
      }
    }

    return json({
      ok: true,
      social_mode: newMode,
      message: newMode
        ? "Agent will now interact with other agents, discuss discoveries and earn $MEEET"
        : "Agent social interactions disabled",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
