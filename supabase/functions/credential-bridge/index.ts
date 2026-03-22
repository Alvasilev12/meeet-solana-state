import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, agent_id, user_id, credential_type } = await req.json();

    if (action === "issue") {
      if (!agent_id || !user_id || !credential_type) return json({ error: "agent_id, user_id, credential_type required" }, 400);

      const { data: agent } = await sc.from("agents").select("id, name, class, level, xp, reputation, quests_completed, kills, discoveries_count").eq("id", agent_id).eq("user_id", user_id).single();
      if (!agent) return json({ error: "Agent not found or not owned" }, 404);

      const credentials: Record<string, { met: boolean; claim: Record<string, unknown> }> = {
        quest_master: { met: agent.quests_completed >= 10, claim: { quests_completed: agent.quests_completed, threshold: 10 } },
        battle_veteran: { met: agent.kills >= 5, claim: { kills: agent.kills, threshold: 5 } },
        scientist: { met: agent.discoveries_count >= 3, claim: { discoveries: agent.discoveries_count, threshold: 3 } },
        high_reputation: { met: agent.reputation >= 50, claim: { reputation: agent.reputation, threshold: 50 } },
        elite_level: { met: agent.level >= 10, claim: { level: agent.level, threshold: 10 } },
      };

      const cred = credentials[credential_type];
      if (!cred) return json({ error: `Unknown credential. Available: ${Object.keys(credentials).join(", ")}` }, 400);
      if (!cred.met) return json({ error: "Requirements not met", requirements: cred.claim }, 403);

      const vc = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", `MEEET_${credential_type}`],
        issuer: "did:meeet:platform",
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: `did:meeet:${agent_id.replace(/-/g, "")}`, name: agent.name, ...cred.claim },
        proof: { type: "PlatformAttestation", created: new Date().toISOString(), verificationMethod: "meeet-platform-key" },
      };

      await sc.from("activity_feed").insert({ agent_id, event_type: "credential_issued", title: `${agent.name} earned credential: ${credential_type}` });
      return json({ success: true, credential: vc });
    }

    if (action === "list_types") {
      return json({
        credentials: [
          { type: "quest_master", requirement: "Complete 10+ quests" },
          { type: "battle_veteran", requirement: "Win 5+ duels" },
          { type: "scientist", requirement: "Submit 3+ discoveries" },
          { type: "high_reputation", requirement: "Reach 50+ reputation" },
          { type: "elite_level", requirement: "Reach level 10+" },
        ],
      });
    }

    if (action === "portfolio") {
      if (!agent_id) return json({ error: "agent_id required" }, 400);
      const { data } = await sc.from("activity_feed").select("title, created_at").eq("agent_id", agent_id).eq("event_type", "credential_issued").order("created_at", { ascending: false });
      return json({ agent_id, credentials: data ?? [] });
    }

    return json({ error: "Unknown action. Use: issue, list_types, portfolio" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
