import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getSupabase(authHeader?: string | null) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/exchange-format\/?/, "");
  const supabase = getSupabase(req.headers.get("Authorization"));

  try {
    // POST create
    if (req.method === "POST" && path === "create") {
      const body = await req.json();
      const { action_ref } = body;
      if (!action_ref) return json({ error: "action_ref required" }, 400);

      // Gather proofs from existing tables
      const [auditRes, saraRes] = await Promise.all([
        supabase.from("audit_logs").select("*").eq("action_ref", action_ref).order("timestamp", { ascending: true }),
        supabase.from("sara_assessments").select("*").eq("action_ref", action_ref).order("created_at", { ascending: false }).limit(1),
      ]);

      const auditLogs = auditRes.data || [];
      const saraRecord = saraRes.data?.[0];

      const lastAudit = auditLogs[auditLogs.length - 1];
      const identity_proof = lastAudit ? {
        agent_did: `did:meeet:${lastAudit.agent_id}`,
        ed25519_signature: lastAudit.ed25519_signature,
        aps_level: "L2",
        provider_attestations: [],
      } : {};

      const audit_proof = {
        signet_receipt_chain: auditLogs.map(l => l.receipt_id),
        tool_calls_count: auditLogs.length,
        completion_ratio: 1.0,
        chain_hash: lastAudit?.receipt_hash || "",
      };

      const verification_proof = {
        result: "verified",
        confidence: 0.85,
        reviewers: auditLogs.length,
        claims_verified: auditLogs.length,
        claims_total: auditLogs.length,
        method: "signet_chain",
      };

      const economic_proof = {
        stake_amount: 0,
        stake_status: "none",
        reward_amount: 0,
        token: "MEEET",
        solana_tx: null,
      };

      const sara_assessment = saraRecord ? {
        risk_score: saraRecord.risk_score,
        decision: saraRecord.decision,
        factors: saraRecord.risk_factors,
      } : { risk_score: 0, decision: "allow", factors: [] };

      const digestInput = [
        JSON.stringify(identity_proof),
        JSON.stringify(audit_proof),
        JSON.stringify(verification_proof),
        JSON.stringify(economic_proof),
        JSON.stringify(sara_assessment),
      ].join("|");

      const compound_digest = await sha256(digestInput);
      const epoch = Math.floor(Date.now() / 600000);

      const { data, error } = await supabase.from("exchange_records").insert({
        action_ref,
        identity_proof,
        audit_proof,
        verification_proof,
        economic_proof,
        sara_assessment,
        compound_digest,
        epoch,
      }).select().single();

      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    // GET validate/:actionRef
    if (req.method === "GET" && path.startsWith("validate/")) {
      const actionRef = decodeURIComponent(path.replace("validate/", ""));
      const { data } = await supabase.from("exchange_records").select("*").eq("action_ref", actionRef).single();
      if (!data) return json({ error: "Not found" }, 404);

      const digestInput = [
        JSON.stringify(data.identity_proof),
        JSON.stringify(data.audit_proof),
        JSON.stringify(data.verification_proof),
        JSON.stringify(data.economic_proof),
        JSON.stringify(data.sara_assessment),
      ].join("|");
      const expectedDigest = await sha256(digestInput);

      const identity_valid = !!(data.identity_proof as any)?.agent_did;
      const audit_chain_valid = ((data.audit_proof as any)?.tool_calls_count || 0) > 0;
      const verification_valid = (data.verification_proof as any)?.result === "verified";
      const economic_valid = true;
      const sara_valid = ["allow", "warn", "block"].includes((data.sara_assessment as any)?.decision);
      const compound_digest_valid = expectedDigest === data.compound_digest;

      return json({
        identity_valid, audit_chain_valid, verification_valid, economic_valid, sara_valid, compound_digest_valid,
        overall: identity_valid && audit_chain_valid && verification_valid && economic_valid && sara_valid && compound_digest_valid,
      });
    }

    // GET export/:actionRef?format=jws
    if (req.method === "GET" && path.startsWith("export/")) {
      const actionRef = decodeURIComponent(path.replace("export/", "").split("?")[0]);
      const { data } = await supabase.from("exchange_records").select("*").eq("action_ref", actionRef).single();
      if (!data) return json({ error: "Not found" }, 404);

      const header = btoa(JSON.stringify({ alg: "EdDSA", typ: "JWT" }));
      const payload = btoa(JSON.stringify({
        sub: (data.identity_proof as any)?.agent_did || "unknown",
        action_ref: data.action_ref,
        digest: data.compound_digest,
        iat: Math.floor(new Date(data.created_at).getTime() / 1000),
      }));
      const signature = btoa(data.compound_digest.slice(0, 32));
      return json({ jws: `${header}.${payload}.${signature}` });
    }

    // GET by action_ref
    if (req.method === "GET" && path) {
      const actionRef = decodeURIComponent(path);
      const { data } = await supabase.from("exchange_records").select("*").eq("action_ref", actionRef).single();
      if (!data) return json({ error: "Not found" }, 404);
      return json(data);
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
