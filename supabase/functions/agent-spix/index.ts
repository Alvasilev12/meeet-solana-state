// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPIX_BASE = "https://api.spix.sh/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function spixFetch(path: string, apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(`${SPIX_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function spixGet(path: string, apiKey: string) {
  const res = await fetch(`${SPIX_BASE}${path}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const SPIX_API_KEY = Deno.env.get("SPIX_API_KEY")?.trim();
  const BILLING_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/agent-billing";

  try {
    const body = await req.json();
    const { action, user_id, agent_id } = body;
    if (!user_id || !agent_id) throw new Error("user_id and agent_id required");

    const { data: agent } = await supabase.from("agents").select("*").eq("id", agent_id).single();
    if (!agent) throw new Error("Agent not found");

    // Charge via billing edge function
    async function chargeUser(actionType: string) {
      const res = await fetch(BILLING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "charge", user_id, agent_id, action_type: actionType }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("Insufficient balance. Current: $" + (data.balance ?? 0).toFixed(2));
      return data;
    }

    // ── MAKE CALL ───────────────────────────────────────────────────
    if (action === "make_call") {
      const { playbook_id, source_number, destination_number, metadata } = body;
      if (!playbook_id || !source_number || !destination_number) throw new Error("playbook_id, source_number and destination_number required");
      await chargeUser("phone_call");

      let callResult: Record<string, unknown>;
      if (SPIX_API_KEY) {
        const r = await spixFetch("/calls", SPIX_API_KEY, {
          playbook_id,
          source_number,
          destination_number,
          metadata: metadata || {},
        });
        callResult = r.ok ? r.data : { status: "error", error: r.data };
      } else {
        callResult = { status: "simulated", message: "SPIX_API_KEY not configured" };
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "phone_call", cost_usd: 0.10,
        details: { playbook_id, source_number, destination_number, metadata, result: callResult },
      });

      return json({ success: true, call: callResult });
    }

    // ── SEND EMAIL ──────────────────────────────────────────────────
    if (action === "send_email") {
      const { to_email, subject, body: emailBody } = body;
      if (!to_email || !subject) throw new Error("to_email and subject required");
      await chargeUser("email_send");

      let emailResult: Record<string, unknown>;
      if (SPIX_API_KEY) {
        const r = await spixFetch("/email", SPIX_API_KEY, {
          to: to_email,
          subject,
          body: emailBody,
          from_name: `${agent.name} (MEEET Agent)`,
        });
        emailResult = r.ok ? r.data : { status: "error", error: r.data };
      } else {
        emailResult = { status: "simulated", message: "SPIX_API_KEY not configured" };
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "email_send", cost_usd: 0.02,
        details: { to: to_email, subject, result: emailResult },
      });

      return json({ success: true, email: emailResult });
    }

    // ── EMAIL DRAFT ────────────────────────────────────────────────
    if (action === "email_draft") {
      const { to_email, subject, body: emailBody } = body;
      if (!to_email || !subject) throw new Error("to_email and subject required");

      let draftResult: Record<string, unknown>;
      if (SPIX_API_KEY) {
        const r = await spixFetch("/email/draft", SPIX_API_KEY, {
          to: to_email,
          subject,
          body: emailBody,
          from_name: `${agent.name} (MEEET Agent)`,
        });
        draftResult = r.ok ? r.data : { status: "error", error: r.data };
      } else {
        draftResult = { status: "simulated", message: "SPIX_API_KEY not configured" };
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "email_draft", cost_usd: 0,
        details: { to: to_email, subject, result: draftResult },
      });

      return json({ success: true, email: draftResult });
    }

    // ── BULK EMAIL ──────────────────────────────────────────────────
    if (action === "bulk_email") {
      const { recipients, subject, body: emailBody } = body;
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) throw new Error("recipients array required");
      await chargeUser("bulk_email");

      let bulkResult: Record<string, unknown>;
      if (SPIX_API_KEY) {
        const r = await spixFetch("/email/bulk", SPIX_API_KEY, {
          recipients,
          subject,
          body: emailBody,
          from_name: `${agent.name} (MEEET Agent)`,
        });
        bulkResult = r.ok ? r.data : { status: "error", error: r.data };
      } else {
        bulkResult = { status: "simulated", count: recipients.length, message: "SPIX_API_KEY not configured" };
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "bulk_email", cost_usd: 1.00,
        details: { count: recipients.length, subject, result: bulkResult },
      });

      return json({ success: true, bulk: bulkResult });
    }

    // ── SEND SMS ────────────────────────────────────────────────────
    if (action === "send_sms") {
      const { phone_number, message } = body;
      if (!phone_number || !message) throw new Error("phone_number and message required");
      await chargeUser("sms_send");

      let smsResult: Record<string, unknown>;
      if (SPIX_API_KEY) {
        const r = await spixFetch("/sms", SPIX_API_KEY, {
          to: phone_number,
          message: `[${agent.name}] ${message}`,
        });
        smsResult = r.ok ? r.data : { status: "error", error: r.data };
      } else {
        smsResult = { status: "simulated", message: "SPIX_API_KEY not configured" };
      }

      await supabase.from("agent_actions").insert({
        agent_id, user_id, action_type: "sms_send", cost_usd: 0.04,
        details: { phone: phone_number, message, result: smsResult },
      });

      return json({ success: true, sms: smsResult });
    }

    // ── ACTION HISTORY ──────────────────────────────────────────────
    if (action === "action_history") {
      const { data } = await supabase.from("agent_actions").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(50);
      return json({ success: true, actions: data || [] });
    }

    throw new Error("Unknown action. Available: make_call, send_email, bulk_email, send_sms, action_history");
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
});
