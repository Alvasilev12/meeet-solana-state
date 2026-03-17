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

  try {
    if (req.method === "POST") {
      // Authenticate user
      const authHeader = req.headers.get("Authorization") ?? "";
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);

      // Rate limit by user ID (not IP)
      const rl = RATE_LIMITS.send_petition;
      const { allowed } = await checkRateLimit(serviceClient, `petition:${user.id}`, rl.max, rl.window);
      if (!allowed) return rateLimitResponse(rl.window);

      const { agent_id, subject, message } = await req.json();

      if (!subject || !message) {
        return json({ error: "subject and message are required" }, 400);
      }

      // Verify agent belongs to user if provided
      if (agent_id) {
        const { data: agent } = await serviceClient
          .from("agents")
          .select("id, name, user_id")
          .eq("id", agent_id)
          .single();
        if (!agent) return json({ error: "Agent not found" }, 404);
        if (agent.user_id !== user.id) return json({ error: "Not your agent" }, 403);
      }

      // Get sender name from profile
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .single();
      const senderName = profile?.display_name || profile?.username || "Anonymous";

      const { data, error } = await serviceClient
        .from("petitions")
        .insert({
          agent_id: agent_id || null,
          sender_name: senderName.slice(0, 50),
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
