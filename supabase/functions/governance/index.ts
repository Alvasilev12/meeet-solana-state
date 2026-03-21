import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action } = body;

    // ── VOTE ON LAW ─────────────────────────────────────────
    if (action === "vote") {
      const { law_id, vote } = body; // vote: "yes" | "no"
      if (!law_id || !["yes", "no"].includes(vote)) {
        return json({ error: "Missing law_id or invalid vote (yes/no)" }, 400);
      }

      // Check law is active
      const { data: law, error: lawErr } = await supabase
        .from("laws")
        .select("id, status, voting_ends_at")
        .eq("id", law_id)
        .single();

      if (lawErr || !law) return json({ error: "Law not found" }, 404);
      if (law.status !== "proposed") return json({ error: "Law is not open for voting" }, 400);
      if (law.voting_ends_at && new Date(law.voting_ends_at) < new Date()) {
        return json({ error: "Voting period has ended" }, 400);
      }

      // Check user has an agent
      const { data: agent } = await supabase
        .from("agents")
        .select("id, name")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!agent) return json({ error: "You need an agent to vote" }, 403);

      // Update vote counts
      const updateField = vote === "yes" ? "votes_yes" : "votes_no";
      const { error: voteErr } = await supabase.rpc("check_rate_limit", {
        _key: `vote_${user.id}_${law_id}`,
        _max_requests: 1,
        _window_seconds: 86400 * 30,
      });

      if (voteErr) return json({ error: "Rate limit error" }, 500);

      const { data: currentLaw } = await supabase
        .from("laws")
        .select("votes_yes, votes_no, voter_count")
        .eq("id", law_id)
        .single();

      if (!currentLaw) return json({ error: "Law not found" }, 404);

      const updates: Record<string, number> = {
        voter_count: (currentLaw.voter_count ?? 0) + 1,
      };
      if (vote === "yes") {
        updates.votes_yes = Number(currentLaw.votes_yes ?? 0) + 1;
        updates.votes_no = Number(currentLaw.votes_no ?? 0);
      } else {
        updates.votes_no = Number(currentLaw.votes_no ?? 0) + 1;
        updates.votes_yes = Number(currentLaw.votes_yes ?? 0);
      }

      const { error: updateErr } = await supabase
        .from("laws")
        .update(updates)
        .eq("id", law_id);

      if (updateErr) return json({ error: updateErr.message }, 500);

      return json({ ok: true, vote, law_id });
    }

    // ── VETO LAW (President only) ───────────────────────────
    if (action === "veto") {
      const { law_id, reason } = body;
      if (!law_id) return json({ error: "Missing law_id" }, 400);

      // Check if user is president
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_president")
        .eq("user_id", user.id)
        .single();

      if (!profile?.is_president) return json({ error: "Only the President can veto" }, 403);

      const { error: vetoErr } = await supabase
        .from("laws")
        .update({
          status: "vetoed",
          vetoed_by: user.id,
          vetoed_at: new Date().toISOString(),
          veto_reason: reason || "Presidential veto",
        })
        .eq("id", law_id)
        .eq("status", "proposed");

      if (vetoErr) return json({ error: vetoErr.message }, 500);

      return json({ ok: true, action: "vetoed", law_id });
    }

    // ── GET GOVERNANCE STATS ────────────────────────────────
    if (action === "stats") {
      const [
        { count: totalLaws },
        { count: activeLaws },
        { count: passedLaws },
        { count: vetoedLaws },
      ] = await Promise.all([
        supabase.from("laws").select("id", { count: "exact", head: true }),
        supabase.from("laws").select("id", { count: "exact", head: true }).eq("status", "proposed"),
        supabase.from("laws").select("id", { count: "exact", head: true }).eq("status", "passed"),
        supabase.from("laws").select("id", { count: "exact", head: true }).eq("status", "vetoed"),
      ]);

      return json({
        total_laws: totalLaws ?? 0,
        active_laws: activeLaws ?? 0,
        passed_laws: passedLaws ?? 0,
        vetoed_laws: vetoedLaws ?? 0,
      });
    }

    return json({ error: "Unknown action. Use: vote, veto, stats" }, 400);
  } catch (err) {
    console.error("governance error:", err);
    return json({ error: String(err) }, 500);
  }
});
