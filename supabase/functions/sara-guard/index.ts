import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

// Risk factor definitions
const RISK_FACTORS_DEF = [
  { name: "new_agent", weight: 0.3, check: (ctx: any) => ctx.reputation < 200 ? 1 : 0 },
  { name: "high_stake", weight: 0.2, check: (ctx: any) => ctx.stake_amount > 50 ? 1 : Math.min(ctx.stake_amount / 50, 1) },
  { name: "out_of_domain", weight: 0.4, check: (ctx: any) => ctx.out_of_domain ? 1 : 0 },
  { name: "rapid_actions", weight: 0.15, check: (ctx: any) => ctx.recent_action_count > 10 ? 1 : ctx.recent_action_count / 10 },
  { name: "low_confidence_history", weight: 0.25, check: (ctx: any) => ctx.avg_confidence < 0.5 ? 1 : 0 },
  { name: "contested_ratio_high", weight: 0.35, check: (ctx: any) => ctx.contested_ratio > 0.3 ? 1 : ctx.contested_ratio / 0.3 },
  { name: "first_interaction", weight: 0.1, check: (ctx: any) => ctx.first_interaction ? 1 : 0 },
];

function computeRisk(ctx: any) {
  const factors = RISK_FACTORS_DEF.map(f => ({
    factor: f.name,
    weight: f.weight,
    value: Math.round(f.check(ctx) * 100) / 100,
  }));
  const score = Math.min(1, Math.round(factors.reduce((s, f) => s + f.weight * f.value, 0) * 1000) / 1000);
  let decision: string;
  if (score < 0.3) decision = "allow";
  else if (score <= 0.6) decision = "warn";
  else decision = ctx.mode === "enforce" ? "block" : "warn";
  return { score, factors, decision };
}

function recommendation(decision: string, score: number): string {
  if (decision === "allow") return "Action appears safe. Proceed normally.";
  if (decision === "warn") return `Elevated risk (${(score * 100).toFixed(0)}%). Review recommended before proceeding.`;
  return `High risk detected (${(score * 100).toFixed(0)}%). Action blocked in enforce mode. Review required.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/sara-guard\/?/, "").split("/").filter(Boolean);
  const route = parts[0] || "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  try {
    // POST /sara-guard/assess
    if (req.method === "POST" && route === "assess") {
      const body = await req.json();
      const { agent_id, action_ref, action_type, stake_amount = 0, mode = "warn_only" } = body;
      if (!agent_id || !action_ref) return json({ error: "agent_id and action_ref required" }, 400);

      // Gather context for risk calculation
      const { data: agent } = await supabase
        .from("agents_public")
        .select("id, reputation, class")
        .eq("id", agent_id)
        .single();

      // Count recent actions (last hour)
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count: recentCount } = await supabase
        .from("sara_assessments")
        .select("id", { count: "exact" })
        .eq("agent_id", agent_id)
        .gte("created_at", oneHourAgo)
        .limit(0);

      // Check if first interaction of this type
      const { count: sameTypeCount } = await supabase
        .from("sara_assessments")
        .select("id", { count: "exact" })
        .eq("agent_id", agent_id)
        .eq("action_ref", action_ref)
        .limit(0);

      // Check contested ratio from discoveries
      const { count: totalDisc } = await supabase
        .from("discoveries")
        .select("id", { count: "exact" })
        .eq("agent_id", agent_id)
        .limit(0);
      const { count: contestedDisc } = await supabase
        .from("disputes")
        .select("id", { count: "exact" })
        .eq("agent_id", agent_id)
        .limit(0);

      const ctx = {
        reputation: agent?.reputation ?? 0,
        stake_amount,
        out_of_domain: false, // Would need domain logic
        recent_action_count: recentCount ?? 0,
        avg_confidence: 0.7, // Simulated
        contested_ratio: totalDisc && totalDisc > 0 ? (contestedDisc ?? 0) / totalDisc : 0,
        first_interaction: (sameTypeCount ?? 0) === 0,
        mode,
      };

      const { score, factors, decision } = computeRisk(ctx);

      const { data, error } = await supabase
        .from("sara_assessments")
        .insert({
          agent_id,
          action_ref,
          risk_score: score,
          risk_factors: factors,
          decision,
          mode,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);

      return json({
        id: data.id,
        risk_score: score,
        risk_factors: factors,
        decision,
        mode,
        recommendation: recommendation(decision, score),
      });
    }

    // GET /sara-guard/stats
    if (req.method === "GET" && route === "stats") {
      const { count: total } = await supabase
        .from("sara_assessments")
        .select("id", { count: "exact" })
        .limit(0);

      const { data: all } = await supabase
        .from("sara_assessments")
        .select("decision, risk_score, false_positive")
        .limit(1000);

      const rows = all || [];
      const allowCount = rows.filter(r => r.decision === "allow").length;
      const warnCount = rows.filter(r => r.decision === "warn").length;
      const blockCount = rows.filter(r => r.decision === "block").length;
      const fpCount = rows.filter(r => r.false_positive === true).length;
      const avgScore = rows.length > 0 ? rows.reduce((s, r) => s + r.risk_score, 0) / rows.length : 0;

      return json({
        total: total ?? 0,
        allow_count: allowCount,
        warn_count: warnCount,
        block_count: blockCount,
        allow_pct: rows.length > 0 ? Math.round((allowCount / rows.length) * 100) : 0,
        warn_pct: rows.length > 0 ? Math.round((warnCount / rows.length) * 100) : 0,
        block_pct: rows.length > 0 ? Math.round((blockCount / rows.length) * 100) : 0,
        false_positive_rate: rows.length > 0 ? Math.round((fpCount / rows.length) * 10000) / 100 : 0,
        avg_risk_score: Math.round(avgScore * 1000) / 1000,
      });
    }

    // POST /sara-guard/feedback
    if (req.method === "POST" && route === "feedback") {
      const { assessment_id, false_positive } = await req.json();
      if (!assessment_id) return json({ error: "assessment_id required" }, 400);

      const { error } = await supabase
        .from("sara_assessments")
        .update({ false_positive: !!false_positive })
        .eq("id", assessment_id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // GET /sara-guard/agent/:agentId
    if (req.method === "GET" && route === "agent") {
      const agentId = parts[1];
      if (!agentId) return json({ error: "agentId required" }, 400);

      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
      const offset = (page - 1) * limit;

      const { data, count, error } = await supabase
        .from("sara_assessments")
        .select("*", { count: "exact" })
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return json({ error: error.message }, 500);

      // Trend data: last 7 days avg risk per day
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: trendData } = await supabase
        .from("sara_assessments")
        .select("risk_score, created_at")
        .eq("agent_id", agentId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: true });

      return json({ assessments: data, total: count, page, limit, trend: trendData || [] });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
