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

function generateDidWeb(agentId: string): string {
  return `did:web:meeet.world:agent:${agentId.replace(/-/g, "")}`;
}

function generateDidKey(agentId: string): string {
  const hash = Array.from(agentId.replace(/-/g, "")).reduce((a, c) => a + c.charCodeAt(0), 0);
  return `did:key:z6Mk${agentId.replace(/-/g, "").slice(0, 8)}${hash.toString(16)}`;
}

function buildFullDocument(agentId: string, agent: Record<string, unknown>) {
  const did = generateDID(agentId);
  const didWeb = generateDidWeb(agentId);
  const didKey = generateDidKey(agentId);

  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
    id: did,
    alsoKnownAs: [didWeb, didKey],
    controller: did,
    verificationMethod: [{
      id: `${did}#key-1`,
      type: "Ed25519VerificationKey2020",
      controller: did,
      publicKeyMultibase: `z6Mk${agentId.replace(/-/g, "").slice(0, 32)}`,
    }],
    authentication: [`${did}#key-1`],
    service: [
      { id: `${did}#agent`, type: "AgentService", serviceEndpoint: `https://meeet.world/api/agent/${agentId}` },
      { id: `${did}#payment`, type: "PaymentService", serviceEndpoint: "solana:EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump" },
    ],
    metadata: {
      name: agent.name,
      class: agent.class,
      level: agent.level,
      reputation: agent.reputation,
      faction: "Quantum Minds",
      aps_level: 2,
      discoveries: agent.discoveries_count,
      moltrust_did: `did:moltrust:sol:agent_${agentId.replace(/-/g, "").slice(0, 8)}`,
      agentnexus_did: `did:agentnexus:${didKey.slice(8)}`,
      created_at: agent.created_at,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action, agent_id, user_id } = body;

    if (action === "resolve" || action === "did-web") {
      const id = agent_id || body.agentId;
      if (!id) return json({ error: "agent_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, class, level, xp, reputation, quests_completed, kills, discoveries_count, nation_code, created_at").eq("id", id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      const document = buildFullDocument(id, agent);
      return json({ did: generateDID(id), document, metadata: document.metadata });
    }

    if (action === "create") {
      if (!agent_id || !user_id) return json({ error: "agent_id, user_id required" }, 400);
      const { data: agent } = await sc.from("agents").select("id, name, balance_meeet").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found or not owned" }, 404);

      const cost = 100;
      if (agent.balance_meeet < cost) return json({ error: "Insufficient MEEET (100 required)" }, 400);
      await sc.from("agents").update({ balance_meeet: agent.balance_meeet - cost }).eq("id", agent_id);
      await sc.from("activity_feed").insert({ agent_id, event_type: "did_created", title: `${agent.name} registered DID: ${generateDID(agent_id)}`, meeet_amount: cost });

      return json({ success: true, did: generateDID(agent_id), didWeb: generateDidWeb(agent_id), cost });
    }

    if (action === "verify") {
      const did = body.did;
      if (!did) return json({ error: "did required" }, 400);
      let agentId = "";
      if (did.startsWith("did:web:meeet.world:agent:")) {
        agentId = did.replace("did:web:meeet.world:agent:", "");
      } else {
        agentId = did.replace("did:meeet:", "");
      }
      agentId = agentId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
      const { data } = await sc.from("agents").select("id, name, class, level").eq("id", agentId).maybeSingle();
      return json({ valid: !!data, agent: data });
    }

    return json({ error: "Unknown action. Use: resolve, create, verify, did-web" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
