import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── Gather today's activity stats ───────────────────────────
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sinceISO = yesterday.toISOString();

    // Quests completed in last 24h
    const { count: questsCompleted } = await supabase
      .from("quests")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", sinceISO);

    // New quests created
    const { count: questsCreated } = await supabase
      .from("quests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceISO);

    // New agents
    const { count: newAgents } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceISO);

    // Recent transactions for trade/burn stats
    const { data: recentTxns } = await supabase
      .from("transactions")
      .select("type, amount_meeet, burn_amount")
      .gte("created_at", sinceISO);

    const trades = recentTxns?.filter((t) => t.type === "trade").length ?? 0;
    const duels = recentTxns?.filter((t) => t.type === "duel_reward").length ?? 0;
    const meeetBurned = recentTxns?.reduce((sum, t) => sum + (Number(t.burn_amount) || 0), 0) ?? 0;

    // Top agents by XP
    const { data: topAgentsData } = await supabase
      .from("agents")
      .select("name, class, xp, level, kills, quests_completed")
      .order("xp", { ascending: false })
      .limit(5);

    const topAgents = (topAgentsData || []).map((a) => ({
      name: a.name,
      class: a.class,
      score: a.xp,
    }));

    // Recent laws
    const { data: recentLaws } = await supabase
      .from("laws")
      .select("title, status, votes_yes, votes_no")
      .gte("created_at", sinceISO)
      .limit(3);

    // President info
    const { data: presidentProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("is_president", true)
      .maybeSingle();

    const presidentName = presidentProfile?.display_name || presidentProfile?.username || "The President";

    // ─── Fetch real-world events ─────────────────────────────────
    const { data: worldEvents } = await supabase
      .from("world_events")
      .select("title, description, event_type, country_code, severity, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const worldEventsContext = (worldEvents || []).map((e: any, i: number) => 
      `${i + 1}. [${e.event_type?.toUpperCase()}] "${e.title}" — ${e.description || 'No details'} (region: ${e.country_code || 'global'}, severity: ${e.severity || '?'}/5)`
    ).join("\n");

    // ─── Build AI prompt ─────────────────────────────────────────
    const dailyStats = {
      quests_completed: questsCompleted ?? 0,
      quests_created: questsCreated ?? 0,
      duels,
      trades,
      new_agents: newAgents ?? 0,
      meeet_burned: meeetBurned,
    };

    const prompt = `You are the AI editor of "THE MEEET HERALD", the official daily newspaper of MEEET State — a fictional AI-powered nation-state on Solana blockchain. Write today's edition.

CONTEXT (real game data from last 24h):
- Quests completed: ${dailyStats.quests_completed}
- New quests posted: ${dailyStats.quests_created}
- Duels fought: ${dailyStats.duels}
- Trades executed: ${dailyStats.trades}
- New agents joined: ${dailyStats.new_agents}
- $MEEET burned: ${dailyStats.meeet_burned}
- Top agents: ${JSON.stringify(topAgents)}
- Recent laws proposed: ${JSON.stringify(recentLaws || [])}
- Current President: ${presidentName}

RECENT WORLD EVENTS (from MEEET State intelligence network — reference these prominently!):
${worldEventsContext || "No major world events reported. Focus on internal state affairs."}

INSTRUCTIONS:
1. Write an engaging, dramatic headline (max 80 chars) — MUST reference a real world event above if available
2. Write a "main_event" one-liner (max 100 chars) — the breaking news summary tied to actual events
3. Write a body article (150-250 words) — dramatic, immersive. Weave real world events into the MEEET State narrative. Show how these global events impact MEEET citizens, agents, and the economy. If no world events, write about internal developments.
4. Write a presidential quote (1-2 sentences) reacting to the most significant world event
5. Return ONLY valid JSON with this exact structure:
{
  "headline": "...",
  "main_event": "...",
  "body": "...",
  "president_quote": "..."
}

Be creative, dramatic, and entertaining. Mix real stats with narrative fiction. The tone should be like a cyberpunk/dystopian newspaper — serious but with personality.`;

    // ─── Call Lovable AI ─────────────────────────────────────────
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a newspaper AI editor. Return only valid JSON, no markdown." },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (handle potential markdown wrapping)
    let parsed: { headline: string; main_event: string; body: string; president_quote: string };
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI-generated content");
    }

    // ─── Insert into herald_issues ───────────────────────────────
    const issueDate = today.toISOString().split("T")[0];

    // Check if today's issue already exists
    const { data: existing } = await supabase
      .from("herald_issues")
      .select("id")
      .eq("issue_date", issueDate)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateErr } = await supabase
        .from("herald_issues")
        .update({
          headline: parsed.headline,
          body: parsed.body,
          main_event: parsed.main_event,
          president_quote: parsed.president_quote,
          daily_stats: dailyStats as any,
          top_agents: topAgents as any,
        })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ success: true, action: "updated", issue_date: issueDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new
    const { error: insertErr } = await supabase
      .from("herald_issues")
      .insert({
        issue_date: issueDate,
        headline: parsed.headline,
        body: parsed.body,
        main_event: parsed.main_event,
        president_quote: parsed.president_quote,
        daily_stats: dailyStats as any,
        top_agents: topAgents as any,
      });

    if (insertErr) throw insertErr;

    console.log("Herald issue generated for", issueDate);

    return new Response(
      JSON.stringify({ success: true, action: "created", issue_date: issueDate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-herald error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
