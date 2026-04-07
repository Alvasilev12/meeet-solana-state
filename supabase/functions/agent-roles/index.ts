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
  const path = url.pathname.replace(/^\/agent-roles\/?/, "");
  const supabase = getSupabase(req.headers.get("Authorization"));

  try {
    // POST assign
    if (req.method === "POST" && path === "assign") {
      const { agent_id, template_id } = await req.json();
      if (!agent_id || !template_id) return json({ error: "agent_id and template_id required" }, 400);

      // Get template
      const { data: template } = await supabase.from("role_templates").select("*").eq("id", template_id).single();
      if (!template) return json({ error: "Template not found" }, 404);

      // Get agent
      const { data: agent } = await supabase.from("agents").select("id, reputation, user_id").eq("id", agent_id).single();
      if (!agent) return json({ error: "Agent not found" }, 404);

      // Check reputation
      if (agent.reputation < template.min_reputation) {
        return json({ error: `Insufficient reputation. Need ${template.min_reputation}, have ${agent.reputation}`, allowed: false }, 403);
      }

      // Assign role
      const { data, error } = await supabase.from("agent_roles").insert({
        agent_id,
        role: template.name,
        capabilities: template.default_capabilities,
        allowed_domains: template.default_domains,
        allowed_paths: template.default_allowed_paths,
        max_stake_per_action: template.default_max_stake,
        max_actions_per_hour: template.default_max_actions_per_hour,
        priority: 5,
      }).select().single();

      if (error) return json({ error: error.message }, 400);
      return json({ assigned: true, role: data });
    }

    // GET templates
    if (req.method === "GET" && path === "templates") {
      const { data } = await supabase.from("role_templates").select("*");
      return json(data || []);
    }

    // GET agent/:agentId
    if (req.method === "GET" && path.startsWith("agent/")) {
      const agentId = path.replace("agent/", "");
      const { data } = await supabase.from("agent_roles").select("*").eq("agent_id", agentId).order("assigned_at", { ascending: false });
      return json(data || []);
    }

    // GET check?agent_id=...&action=...&domain=...
    if (req.method === "GET" && path === "check") {
      const agentId = url.searchParams.get("agent_id");
      const action = url.searchParams.get("action") || "";
      const domain = url.searchParams.get("domain") || "";

      if (!agentId) return json({ error: "agent_id required" }, 400);

      const { data: roles } = await supabase.from("agent_roles").select("*").eq("agent_id", agentId);
      if (!roles || roles.length === 0) {
        return json({ allowed: false, role: null, reason: "No roles assigned" });
      }

      for (const role of roles) {
        if (role.expires_at && new Date(role.expires_at) < new Date()) continue;
        const caps = role.capabilities || [];
        const domains = role.allowed_domains || [];
        const capOk = caps.includes("all") || caps.includes(action);
        const domOk = domains.includes("all") || domains.includes(domain);
        if (capOk && domOk) {
          return json({ allowed: true, role: role.role, reason: "Authorized by role" });
        }
      }

      return json({ allowed: false, role: null, reason: "No matching role for this action/domain" });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
