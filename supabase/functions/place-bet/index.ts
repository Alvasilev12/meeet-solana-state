import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth via JWT — server-side session verification
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid token" }, 401);
    const userId = user.id;

    // Parse & validate body
    const body = await req.json();
    const { question_id, prediction, amount_meeet } = body;

    if (!question_id || prediction === undefined || prediction === null) {
      return json({ error: "Missing: question_id, prediction, amount_meeet" }, 400);
    }
    const amount = Number(amount_meeet) || 0;
    if (amount < 50) return json({ error: "Minimum bet is 50 MEEET" }, 400);

    // Get user's agent
    const { data: agent } = await supabase
      .from("agents")
      .select("id, balance_meeet")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!agent) return json({ error: "No agent found. Create an agent first." }, 400);
    if (Number(agent.balance_meeet) < amount) return json({ error: "Insufficient MEEET balance" }, 400);

    // Validate question exists, is open, and deadline not passed
    const { data: question } = await supabase
      .from("oracle_questions")
      .select("id, status, deadline, total_pool_meeet, yes_pool, no_pool")
      .eq("id", question_id)
      .maybeSingle();

    if (!question) return json({ error: "Question not found" }, 404);
    if (question.status !== "open") return json({ error: "Market is closed" }, 400);
    if (new Date(question.deadline) < new Date()) return json({ error: "Market deadline has passed" }, 400);

    // Check for duplicate bet from this agent
    const { data: existing } = await supabase
      .from("oracle_bets")
      .select("id")
      .eq("question_id", question_id)
      .eq("agent_id", agent.id)
      .maybeSingle();

    if (existing) return json({ error: "You already placed a bet on this market" }, 400);

    // Deduct balance from agent
    const newBalance = Number(agent.balance_meeet) - amount;
    await supabase
      .from("agents")
      .update({ balance_meeet: newBalance })
      .eq("id", agent.id);

    // Insert bet
    const { data: bet, error: betError } = await supabase
      .from("oracle_bets")
      .insert({
        question_id,
        agent_id: agent.id,
        user_id: userId,
        prediction: !!prediction,
        amount_meeet: amount,
      })
      .select("id")
      .single();

    if (betError) {
      // Rollback balance deduction
      await supabase
        .from("agents")
        .update({ balance_meeet: Number(agent.balance_meeet) })
        .eq("id", agent.id);
      return json({ error: betError.message }, 500);
    }

    // Update oracle_questions pools
    const currentYes = Number(question.yes_pool) || 0;
    const currentNo = Number(question.no_pool) || 0;
    const currentTotal = Number(question.total_pool_meeet) || 0;

    const newYesPool = prediction ? currentYes + amount : currentYes;
    const newNoPool = prediction ? currentNo : currentNo + amount;
    const newTotalPool = currentTotal + amount;

    await supabase
      .from("oracle_questions")
      .update({
        yes_pool: newYesPool,
        no_pool: newNoPool,
        total_pool_meeet: newTotalPool,
      })
      .eq("id", question_id);

    // Calculate consensus percentage (% of pool on YES side)
    const consensusPercentage = newTotalPool > 0
      ? Math.round((newYesPool / newTotalPool) * 100)
      : 50;

    return json({
      bet_id: bet.id,
      new_yes_pool: newYesPool,
      new_no_pool: newNoPool,
      consensus_percentage: consensusPercentage,
    });
  } catch (err) {
    console.error("place-bet error:", err);
    return json({ error: String(err) }, 500);
  }
});
