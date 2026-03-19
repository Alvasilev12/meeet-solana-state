import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PLATFORM_FEE_PCT = 0.02; // 2%

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch expired open questions
    const { data: questions, error: qErr } = await supabase
      .from("oracle_questions")
      .select("*")
      .eq("status", "open")
      .lt("deadline", new Date().toISOString());

    if (qErr) return json({ error: qErr.message }, 500);
    if (!questions || questions.length === 0) return json({ resolved: 0, message: "No expired questions" });

    const results: Array<{ question_id: string; answer: boolean; winners: number; payout_pool: number }> = [];

    for (const q of questions) {
      const yesPool = Number(q.yes_pool) || 0;
      const noPool = Number(q.no_pool) || 0;
      const totalPool = Number(q.total_pool_meeet) || 0;

      // 2. Determine correct answer — majority pool wins
      const correctAnswer = yesPool >= noPool;
      const winningPool = correctAnswer ? yesPool : noPool;

      // 3. Fetch all bets for this question
      const { data: bets, error: bErr } = await supabase
        .from("oracle_bets")
        .select("id, agent_id, prediction, amount_meeet, user_id")
        .eq("question_id", q.id);

      if (bErr) {
        console.error(`Error fetching bets for ${q.id}:`, bErr.message);
        continue;
      }

      if (!bets || bets.length === 0) {
        // No bets, just close
        await supabase.from("oracle_questions")
          .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution: correctAnswer ? "YES" : "NO" })
          .eq("id", q.id);
        results.push({ question_id: q.id, answer: correctAnswer, winners: 0, payout_pool: 0 });
        continue;
      }

      // 4. Calculate payouts
      const platformFee = Math.floor(totalPool * PLATFORM_FEE_PCT);
      const distributablePool = totalPool - platformFee;
      const winners = bets.filter(b => b.prediction === correctAnswer);
      const losers = bets.filter(b => b.prediction !== correctAnswer);

      // Mark all bets
      for (const bet of winners) {
        const betAmount = Number(bet.amount_meeet) || 0;
        const share = winningPool > 0 ? betAmount / winningPool : 0;
        const payout = Math.floor(share * distributablePool);

        await supabase.from("oracle_bets")
          .update({ is_winner: true, payout_meeet: payout })
          .eq("id", bet.id);

        // Credit agent balance
        const { data: agent } = await supabase.from("agents")
          .select("id, balance_meeet")
          .eq("id", bet.agent_id)
          .maybeSingle();

        if (agent) {
          await supabase.from("agents")
            .update({ balance_meeet: Number(agent.balance_meeet) + payout })
            .eq("id", agent.id);
        }
      }

      for (const bet of losers) {
        await supabase.from("oracle_bets")
          .update({ is_winner: false, payout_meeet: 0 })
          .eq("id", bet.id);
      }

      // 5. Mark question resolved
      await supabase.from("oracle_questions")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution: correctAnswer ? "YES" : "NO",
        })
        .eq("id", q.id);

      // 6. Update oracle_scores for each bettor
      for (const bet of bets) {
        const isWinner = bet.prediction === correctAnswer;

        const { data: existing } = await supabase
          .from("oracle_scores")
          .select("*")
          .eq("agent_id", bet.agent_id)
          .maybeSingle();

        if (existing) {
          const correct = (existing.correct ?? 0) + (isWinner ? 1 : 0);
          const wrong = (existing.wrong ?? 0) + (isWinner ? 0 : 1);
          const totalPreds = (existing.total_predictions ?? 0) + 1;
          const score = (existing.score ?? 0) + (isWinner ? 10 : -5);
          const currentStreak = isWinner ? (existing.current_streak ?? 0) + 1 : 0;
          const maxStreak = Math.max(existing.max_streak ?? 0, currentStreak);
          const winRate = totalPreds > 0 ? Math.round((correct / totalPreds) * 100) : 0;

          await supabase.from("oracle_scores")
            .update({
              correct, wrong, total_predictions: totalPreds,
              score: Math.max(0, score), current_streak: currentStreak,
              max_streak: maxStreak, win_rate: winRate,
              last_updated: new Date().toISOString(),
            })
            .eq("agent_id", bet.agent_id);
        } else {
          await supabase.from("oracle_scores")
            .insert({
              agent_id: bet.agent_id,
              correct: isWinner ? 1 : 0,
              wrong: isWinner ? 0 : 1,
              total_predictions: 1,
              score: isWinner ? 10 : 0,
              current_streak: isWinner ? 1 : 0,
              max_streak: isWinner ? 1 : 0,
              win_rate: isWinner ? 100 : 0,
              last_updated: new Date().toISOString(),
            });
        }
      }

      // 7. Post to Telegram (if configured)
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
        const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

        if (LOVABLE_API_KEY && TELEGRAM_API_KEY && TELEGRAM_CHAT_ID) {
          const answerText = correctAnswer ? "YES ✅" : "NO ❌";
          const payoutPool = distributablePool;
          const message = `🔮 *Oracle resolved:* ${q.question_text}\n\n` +
            `Answer: *${answerText}*\n` +
            `${winners.length} winner${winners.length !== 1 ? "s" : ""} split *${payoutPool.toLocaleString()} $MEEET*\n` +
            `Total pool: ${totalPool.toLocaleString()} | Fee: ${platformFee.toLocaleString()}`;

          await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TELEGRAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: message,
              parse_mode: "Markdown",
            }),
          });
        }
      } catch (tgErr) {
        console.error("Telegram notification failed:", tgErr);
        // Non-fatal — continue processing
      }

      results.push({
        question_id: q.id,
        answer: correctAnswer,
        winners: winners.length,
        payout_pool: distributablePool,
      });
    }

    return json({ resolved: results.length, results });
  } catch (err) {
    console.error("resolve-prediction error:", err);
    return json({ error: String(err) }, 500);
  }
});
