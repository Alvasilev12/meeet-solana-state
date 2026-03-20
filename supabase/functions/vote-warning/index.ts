import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const rawApiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
    if (!rawApiKey) return json({ error: "X-API-Key header required" }, 401);

    // Validate API key via RPC
    const keyHash = await hashKey(rawApiKey.trim());
    const { data: userId } = await supabase.rpc("validate_api_key", { _key_hash: keyHash });
    if (!userId) return json({ error: "Invalid or inactive API key" }, 401);

    // Find the agent for this user
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (agentError || !agent) return json({ error: "No agent found for this API key" }, 401);

    const body = await req.json();
    const { warning_id, vote, reasoning } = body;

    if (!warning_id || !vote) return json({ error: "Missing required fields: warning_id, vote" }, 400);
    if (!["confirm", "deny"].includes(vote)) return json({ error: "vote must be confirm or deny" }, 400);

    // Upsert vote
    const { error: voteError } = await supabase
      .from("warning_votes")
      .upsert({
        warning_id,
        agent_id: agent.id,
        vote,
        reasoning: reasoning || null,
      }, { onConflict: "warning_id,agent_id" });

    if (voteError) return json({ error: voteError.message }, 500);

    // Count all votes
    const { data: allVotes } = await supabase
      .from("warning_votes")
      .select("vote")
      .eq("warning_id", warning_id);

    const total_votes = allVotes?.length || 0;
    const confirm_votes = allVotes?.filter((v: Record<string, unknown>) => v.vote === "confirm").length || 0;

    // Update confirming_agents_count
    await supabase
      .from("warnings")
      .update({ confirming_agents_count: confirm_votes })
      .eq("id", warning_id);

    let warning_status = "pending";

    // Check if threshold met: 67% confirm rate AND at least 3 votes
    if (total_votes >= 3 && confirm_votes >= total_votes * 0.67) {
      const { data: warning } = await supabase
        .from("warnings")
        .select("*")
        .eq("id", warning_id)
        .single();

      if (warning && warning.status !== "confirmed") {
        await supabase
          .from("warnings")
          .update({ status: "confirmed", verified_at: new Date().toISOString() })
          .eq("id", warning_id);

        // Look up president user_id for requester_id
        const { data: presProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("is_president", true)
          .limit(1)
          .maybeSingle();
        const requesterId = presProfile?.user_id ?? userId;

        await supabase.from("quests").insert({
          title: "Global Challenge: " + warning.title,
          description: `Confirmed global threat in ${warning.region}. Agents needed to investigate and respond.`,
          reward_meeet: 8000,
          reward_sol: 3,
          category: "combat",
          deadline_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          requester_id: requesterId,
          status: "open",
          is_global_challenge: true,
        });

        warning_status = "confirmed";
      }
    }

    return json({ status: "ok", total_votes, confirm_votes, warning_status });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
