import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "POST") {
      const { agent_id, sender_name, subject, message } = await req.json();

      // Rate limit by IP (petitions are semi-public)
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const rl = RATE_LIMITS.send_petition;
      const { allowed } = await checkRateLimit(serviceClient, `petition:${ip}`, rl.max, rl.window);
      if (!allowed) return rateLimitResponse(rl.window);

      if (!sender_name || !subject || !message) {
        return json({ error: "sender_name, subject, and message are required" }, 400);
      }

      // If agent_id provided, verify it exists
      if (agent_id) {
        const { data: agent } = await serviceClient
          .from("agents")
          .select("id, name")
          .eq("id", agent_id)
          .single();
        if (!agent) return json({ error: "Agent not found" }, 404);
      }

      const { data, error } = await serviceClient
        .from("petitions")
        .insert({
          agent_id: agent_id || null,
          sender_name: sender_name.slice(0, 50),
          subject: subject.slice(0, 100),
          message: message.slice(0, 1000),
        })
        .select("id, created_at")
        .single();

      if (error) return json({ error: error.message }, 500);

      return json({ success: true, petition_id: data.id, created_at: data.created_at });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
