import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getApsLevel(trust: number): number {
  if (trust < 0.25) return 0;
  if (trust < 0.5) return 1;
  if (trust < 0.75) return 2;
  return 3;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // Routes: /reputation-engine/leaderboard  or  /reputation-engine/:agentId
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // GET leaderboard
    if (parts.length >= 2 && parts[parts.length - 1] === "leaderboard") {
      const { data: agents, error } = await supabase
        .from("agents")
        .select("id, name, reputation, balance_meeet, class, level")
        .order("reputation", { ascending: false })
        .limit(50);

      if (error) return json({ error: error.message }, 500);

      const leaderboard = [];
      for (const agent of agents || []) {
        const bayesian = await computeBayesian(supabase, agent.id);
        const economic = await computeEconomic(supabase, agent.id);
        const socialScore = 0.5;
        const trustScore = bayesian.mu * 0.4 + economic.score * 0.4 + socialScore * 0.2;

        leaderboard.push({
          agent_id: agent.id,
          name: agent.name,
          class: agent.class,
          level: agent.level,
          reputation: agent.reputation,
          bayesian: { mu: round(bayesian.mu), sigma: round(bayesian.sigma), n: bayesian.n },
          economic: { score: round(economic.score) },
          trust_score: round(trustScore),
          aps_level: getApsLevel(trustScore),
        });
      }

      leaderboard.sort((a, b) => b.trust_score - a.trust_score);
      return json(leaderboard);
    }

    // GET agent reputation
    const agentId = parts[parts.length - 1];
    if (!agentId || agentId === "reputation-engine") {
      return json({ error: "Agent ID required" }, 400);
    }

    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, name, reputation, balance_meeet")
      .eq("id", agentId)
      .single();

    if (agentErr || !agent) return json({ error: "Agent not found" }, 404);

    const bayesian = await computeBayesian(supabase, agentId);
    const economic = await computeEconomic(supabase, agentId);
    const socialScore = 0.5;
    const trustScore = bayesian.mu * 0.4 + economic.score * 0.4 + socialScore * 0.2;

    // Last 20 events
    const { data: history } = await supabase
      .from("reputation_log")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20);

    return json({
      agent_id: agentId,
      bayesian: { mu: round(bayesian.mu), sigma: round(bayesian.sigma), n: bayesian.n },
      economic: {
        score: round(economic.score),
        total_stakes: economic.totalStakes,
        correct_stakes: economic.correctStakes,
      },
      social: { score: socialScore },
      trust_score: round(trustScore),
      aps_level: getApsLevel(trustScore),
      history: history || [],
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

async function computeBayesian(supabase: any, agentId: string) {
  const { data: logs } = await supabase
    .from("reputation_log")
    .select("reputation_delta, bayesian_mu, bayesian_sigma, event_type")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });

  const n = logs?.length || 0;
  if (n === 0) return { mu: 0.5, sigma: 0.3, n: 0 };

  // Use latest stored values if available
  const latest = logs[0];
  if (latest.bayesian_mu !== null && latest.bayesian_mu !== 0.5) {
    return { mu: latest.bayesian_mu, sigma: latest.bayesian_sigma, n };
  }

  // Compute from scratch: Bayesian update
  let mu = 0.5;
  let sigma = 0.3;
  const reversed = [...logs].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const ev = reversed[i];
    const positive = (ev.reputation_delta || 0) > 0;
    const evidence = positive ? 0.8 : 0.2;
    mu = mu + (evidence - mu) / (i + 2);
    sigma = 0.3 / Math.sqrt(i + 2);
  }

  return { mu, sigma, n };
}

async function computeEconomic(supabase: any, agentId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: stakes } = await supabase
    .from("stakes")
    .select("amount, status, result")
    .eq("agent_id", agentId)
    .gte("locked_at", thirtyDaysAgo);

  if (!stakes || stakes.length < 3) {
    return { score: 0, totalStakes: stakes?.length || 0, correctStakes: 0 };
  }

  let totalAmount = 0;
  let correctAmount = 0;
  let correctCount = 0;

  for (const s of stakes) {
    totalAmount += s.amount || 0;
    if (s.result === "correct" || s.status === "rewarded") {
      correctAmount += s.amount || 0;
      correctCount++;
    }
  }

  const score = totalAmount > 0 ? correctAmount / totalAmount : 0;
  return { score, totalStakes: stakes.length, correctStakes: correctCount };
}

function round(v: number, d = 2) {
  return Math.round(v * 10 ** d) / 10 ** d;
}
