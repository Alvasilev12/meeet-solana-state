// @ts-nocheck
/**
 * spix-proxy — Server-side proxy to Spix REST API
 *
 * Keeps SPIX_API_KEY on the backend. Authenticated via Supabase JWT.
 *
 * Supported actions:
 *   send-email, create-call, get-call-transcript, get-call-summary,
 *   check-credits, create-inbox, send-sms
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPIX_BASE = "https://api.spix.sh/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function spixPost(path: string, apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(`${SPIX_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function spixGet(path: string, apiKey: string) {
  const res = await fetch(`${SPIX_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Auth ────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  // ── Spix key ────────────────────────────────────────────────────
  const SPIX_API_KEY = Deno.env.get("SPIX_API_KEY")?.trim();
  if (!SPIX_API_KEY) {
    return json({ success: false, error: "SPIX_API_KEY not configured" }, 500);
  }

  try {
    const body = await req.json();
    const { action } = body;
    if (!action) return json({ success: false, error: "action required" }, 400);

    // ── send-email ──────────────────────────────────────────────
    if (action === "send-email") {
      const { to, subject, body: emailBody, from_name } = body;
      if (!to || !subject) return json({ success: false, error: "to and subject required" }, 400);
      const r = await spixPost("/email", SPIX_API_KEY, { to, subject, body: emailBody, from_name });
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    // ── create-call ─────────────────────────────────────────────
    if (action === "create-call") {
      const { playbook_id, source_number, destination_number, metadata } = body;
      if (!playbook_id || !source_number || !destination_number) {
        return json({ success: false, error: "playbook_id, source_number and destination_number required" }, 400);
      }
      const r = await spixPost("/calls", SPIX_API_KEY, {
        playbook_id, source_number, destination_number, metadata: metadata || {},
      });
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    // ── get-call-transcript ─────────────────────────────────────
    if (action === "get-call-transcript") {
      const { call_id } = body;
      if (!call_id) return json({ success: false, error: "call_id required" }, 400);
      const r = await spixGet(`/calls/${call_id}/transcript`, SPIX_API_KEY);
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    // ── get-call-summary ────────────────────────────────────────
    if (action === "get-call-summary") {
      const { call_id } = body;
      if (!call_id) return json({ success: false, error: "call_id required" }, 400);
      const r = await spixGet(`/calls/${call_id}/summary`, SPIX_API_KEY);
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    // ── check-credits ───────────────────────────────────────────
    if (action === "check-credits") {
      const r = await spixGet("/balance", SPIX_API_KEY);
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    // ── create-inbox ────────────────────────────────────────────
    if (action === "create-inbox") {
      const { name, email_prefix } = body;
      if (!name) return json({ success: false, error: "name required" }, 400);
      const r = await spixPost("/inboxes", SPIX_API_KEY, { name, email_prefix });
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    // ── send-sms ────────────────────────────────────────────────
    if (action === "send-sms") {
      const { to, message } = body;
      if (!to || !message) return json({ success: false, error: "to and message required" }, 400);
      const r = await spixPost("/sms", SPIX_API_KEY, { to, message });
      return json({ success: r.ok, data: r.data }, r.ok ? 200 : r.status);
    }

    return json({ success: false, error: `Unknown action: ${action}. Available: send-email, create-call, get-call-transcript, get-call-summary, check-credits, create-inbox, send-sms` }, 400);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
});
