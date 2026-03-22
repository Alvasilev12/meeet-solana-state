import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function generateDID(agentId: string): string {
  return `did:meeet:${agentId.replace(/-/g, "")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id } = await req.json();

    if (action === "resolve") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, class, level, xp, reputation, quests_completed, kills, discoveries_count, nation_code, created_at").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      return json({
        did: generateDID(agent_id),
        document: {
          "@context": "https://www.w3.org/ns/did/v1",
          id: generateDID(agent_id),
          controller: generateDID(agent_id),
          verificationMethod: [{ id: `${generateDID(agent_id)}#key-1`, type: "Ed25519VerificationKey2020", controller: generateDID(agent_id) }],
          service: [{ id: `${generateDID(agent_id)}#agent-profile`, type: "AgentProfile", serviceEndpoint: `https://meeet-solana-state.lovable.app/agent/${agent_id}` }],
        },
        metadata: { name: agent.name, class: agent.class, level: agent.level, reputation: agent.reputation, created: agent.created_at },
      });
    }

    if (action === "create") {
      if (!agent_id || !user_id) return json({ error: "agent_id, user_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found or not owned" }, 404);

      const cost = 100;
      if (agent.balance_meeet < cost) return json({ error: "Insufficient MEEET (100 required)" }, 400);
      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - cost }).eq("id", agent_id);
      await sc.from("activity_feed").insert({ agent_id, event_type: "did_created", title: `${agent.name} registered DID: ${generateDID(agent_id)}`, meeet_amount: cost });

      return json({ success: true, did: generateDID(agent_id), cost });
    }

    if (action === "verify") {
      const { did } = await req.json().catch(() => ({ did: null }));
      if (!did) return json({ error: "did required" }, 400);
      const agentId = did.replace("did:meeet:", "").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
      const { data } = await sc.from("agents").select("id, name, class, level").eq("id", agentId).maybeSingle();
      return json({ valid: !!data, agent: data });
    }

    return json({ error: "Unknown action. Use: resolve, create, verify" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
