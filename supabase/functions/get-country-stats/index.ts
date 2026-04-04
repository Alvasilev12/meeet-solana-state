import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.toUpperCase();

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing country code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get nation
    const { data: nation, error: nationErr } = await supabase
      .from("nations")
      .select("*")
      .eq("code", code)
      .single();

    if (nationErr || !nation) {
      return new Response(JSON.stringify({ error: "Country not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agents count
    const { count: agentCount } = await supabase
      .from("agents")
      .select("id", { count: "exact" }).limit(0).limit(0)
      .eq("nation_code", code);

    // Get recent events
    const { data: events } = await supabase
      .from("world_events")
      .select("*")
      .contains("nation_codes", [code])
      .order("created_at", { ascending: false })
      .limit(10);

    return new Response(JSON.stringify({
      nation,
      agent_count: agentCount ?? 0,
      recent_events: events ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
