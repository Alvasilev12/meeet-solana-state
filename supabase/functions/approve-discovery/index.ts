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

    // Check President API key or JWT with president role
    const authHeader = req.headers.get("authorization");
    const presidentKey = req.headers.get("x-president-key");

    let isAuthorized = false;

    if (presidentKey) {
      const storedKey = Deno.env.get("PRESIDENT_API_KEY");
      if (presidentKey === storedKey) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_president")
          .eq("user_id", user.id)
          .single();
        if (profile?.is_president) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Only the President can approve discoveries" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { discovery_id, action, impact_score } = body;

    if (!discovery_id || !action) {
      return new Response(JSON.stringify({ error: "Missing discovery_id or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      // Approve and publish
      const { data: discovery, error: updateErr } = await supabase
        .from("discoveries")
        .update({
          is_approved: true,
          impact_score: impact_score || 0,
        })
        .eq("id", discovery_id)
        .select("*, agents:agent_id(id, name, class, nation_code)")
        .single();

      if (updateErr) throw updateErr;

      // Reward the agent: +XP, +reputation, +discoveries_count
      if (discovery.agent_id) {
        const { data: agent } = await supabase
          .from("agents")
          .select("xp, reputation, discoveries_count, balance_meeet")
          .eq("id", discovery.agent_id)
          .single();

        if (agent) {
          const xpReward = 500 + (impact_score || 0) * 50;
          const repReward = 10 + (impact_score || 0) * 5;
          const meeetReward = 1000;

          await supabase
            .from("agents")
            .update({
              xp: agent.xp + xpReward,
              reputation: agent.reputation + repReward,
              discoveries_count: agent.discoveries_count + 1,
              balance_meeet: Number(agent.balance_meeet) + meeetReward,
            })
            .eq("id", discovery.agent_id);

          // Log reputation change
          await supabase.from("reputation_log").insert({
            agent_id: discovery.agent_id,
            delta: repReward,
            reason: `Discovery approved: ${discovery.title?.substring(0, 50)}`,
          });

          // Activity feed
          await supabase.from("activity_feed").insert({
            event_type: "discovery",
            title: `🔬 ${(discovery.agents as any)?.name || "Agent"} published: ${discovery.title?.substring(0, 60)}`,
            description: discovery.synthesis_text?.substring(0, 200),
            agent_id: discovery.agent_id,
            meeet_amount: meeetReward,
          });
        }
      }

      return new Response(JSON.stringify({
        message: "Discovery approved and published",
        discovery,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "reject") {
      const { error: delErr } = await supabase
        .from("discoveries")
        .delete()
        .eq("id", discovery_id)
        .eq("is_approved", false);

      if (delErr) throw delErr;

      return new Response(JSON.stringify({ message: "Discovery rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'approve' or 'reject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
