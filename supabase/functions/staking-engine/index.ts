import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, corsHeaders, rateLimitResponse } from "../_shared/rate-limit.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function parseAgentId(did: string): string | null {
  const match = did?.match(/^did:meeet:agent_(.+)$/);
  return match ? match[1] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path after function name: lock | resolve | agent/:id | stats
  const action = pathParts[pathParts.length - 1];
  const parentAction = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : null;

  try {
    // ── GET /stats ──
    if (req.method === "GET" && action === "stats") {
      const { data: tvlData } = await supabase
        .from("stakes")
        .select("amount")
        .eq("status", "locked");
      const tvl = (tvlData || []).reduce((s, r) => s + r.amount, 0);

      const { count: activeCount } = await supabase
        .from("stakes")
        .select("id", { count: "exact" })
        .eq("status", "locked")
        .limit(0);

      const { data: totalRewarded } = await supabase
        .from("stakes")
        .select("amount")
        .eq("status", "rewarded");
      const rewarded = (totalRewarded || []).reduce((s, r) => s + r.amount, 0);

      const now = new Date();
      const d24h = new Date(now.getTime() - 24 * 3600_000).toISOString();
      const d7d = new Date(now.getTime() - 7 * 86400_000).toISOString();
      const d30d = new Date(now.getTime() - 30 * 86400_000).toISOString();

      const slashQuery = async (since: string) => {
        const { data } = await supabase
          .from("stake_history")
          .select("amount")
          .eq("action", "slash")
          .gte("created_at", since);
        return (data || []).reduce((s, r) => s + r.amount, 0);
      };

      const [slashed24h, slashed7d, slashed30d] = await Promise.all([
        slashQuery(d24h), slashQuery(d7d), slashQuery(d30d),
      ]);

      return json({
        tvl,
        active_stakes: activeCount || 0,
        total_rewarded: rewarded,
        slashed: { "24h": slashed24h, "7d": slashed7d, "30d": slashed30d },
      });
    }

    // ── GET /agent/:agentId ──
    if (req.method === "GET" && parentAction === "agent") {
      const agentId = action;
      if (!agentId) return json({ error: "Agent ID required" }, 400);

      const [{ data: stakes }, { data: history }, { data: agent }] = await Promise.all([
        supabase.from("stakes").select("*").eq("agent_id", agentId).order("locked_at", { ascending: false }).limit(100),
        supabase.from("stake_history").select("*").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(100),
        supabase.from("agents").select("balance_meeet").eq("id", agentId).single(),
      ]);

      const lockedAmount = (stakes || []).filter(s => s.status === "locked").reduce((s, r) => s + r.amount, 0);

      return json({
        stakes: stakes || [],
        history: history || [],
        balance: {
          total: agent?.balance_meeet || 0,
          locked: lockedAmount,
          available: (agent?.balance_meeet || 0) - lockedAmount,
        },
      });
    }

    // ── POST endpoints require API key ──
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const rawApiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
    if (!rawApiKey) return json({ error: "X-API-Key header required" }, 401);

    const keyHash = await hashKey(rawApiKey.trim());
    const { data: userId } = await supabase.rpc("validate_api_key", { _key_hash: keyHash });
    if (!userId) return json({ error: "Invalid or inactive API key" }, 401);

    const rl = await checkRateLimit(supabase, `staking:${userId}`, 100, 60);
    if (!rl.allowed) return rateLimitResponse(60);

    const body = await req.json();

    // ── POST /lock ──
    if (action === "lock") {
      const { agent_did, amount, target_type, target_id } = body;
      if (!agent_did || !amount || !target_type || !target_id) {
        return json({ error: "Missing fields: agent_did, amount, target_type, target_id" }, 400);
      }

      const agentId = parseAgentId(agent_did);
      if (!agentId) return json({ error: "Invalid agent_did format" }, 400);

      if (!["discovery", "debate", "governance"].includes(target_type)) {
        return json({ error: "target_type must be discovery, debate, or governance" }, 400);
      }
      if (typeof amount !== "number" || amount < 1) {
        return json({ error: "amount must be a positive integer" }, 400);
      }

      const { data: agent, error: agentErr } = await supabase
        .from("agents")
        .select("id, balance_meeet, user_id")
        .eq("id", agentId)
        .single();

      if (agentErr || !agent) return json({ error: "Agent not found" }, 404);
      if (agent.user_id !== userId) return json({ error: "Not authorized" }, 403);
      if (agent.balance_meeet < amount) {
        return json({ error: "Insufficient balance", available: agent.balance_meeet, requested: amount }, 400);
      }

      // Deduct balance
      const newBalance = agent.balance_meeet - amount;
      await supabase.from("agents").update({ balance_meeet: newBalance }).eq("id", agentId);

      // Create stake
      const { data: stake, error: stakeErr } = await supabase
        .from("stakes")
        .insert({ agent_id: agentId, amount, target_type, target_id, status: "locked" })
        .select()
        .single();

      if (stakeErr) {
        // Rollback balance
        await supabase.from("agents").update({ balance_meeet: agent.balance_meeet }).eq("id", agentId);
        return json({ error: "Failed to create stake: " + stakeErr.message }, 500);
      }

      // History
      await supabase.from("stake_history").insert({
        agent_id: agentId,
        action: "stake",
        amount,
        balance_before: agent.balance_meeet,
        balance_after: newBalance,
        reason: `Staked on ${target_type}: ${target_id}`,
      });

      return json({ stake });
    }

    // ── POST /resolve ──
    if (action === "resolve") {
      const { stake_id, result } = body;
      if (!stake_id || !result) return json({ error: "Missing fields: stake_id, result" }, 400);
      if (!["correct", "incorrect", "contested"].includes(result)) {
        return json({ error: "result must be correct, incorrect, or contested" }, 400);
      }

      const { data: stake, error: stakeErr } = await supabase
        .from("stakes")
        .select("*, agents!inner(balance_meeet, user_id)")
        .eq("id", stake_id)
        .eq("status", "locked")
        .single();

      if (stakeErr || !stake) return json({ error: "Active stake not found" }, 404);

      const agent = stake.agents as any;
      let newStatus: string;
      let balanceDelta: number;
      let reason: string;

      if (result === "correct") {
        newStatus = "rewarded";
        balanceDelta = Math.round(stake.amount * 1.2); // 20% reward
        reason = "Stake rewarded (correct prediction)";
      } else if (result === "incorrect") {
        newStatus = "slashed";
        balanceDelta = 0; // tokens lost
        reason = "Stake slashed (incorrect prediction)";
      } else {
        newStatus = "locked"; // stays locked during contest
        balanceDelta = 0;
        reason = "Stake contested — awaiting governance vote";
      }

      // Update stake
      await supabase.from("stakes").update({
        status: newStatus,
        result,
        resolved_at: result !== "contested" ? new Date().toISOString() : null,
      }).eq("id", stake_id);

      // Update agent balance
      const newBalance = agent.balance_meeet + balanceDelta;
      if (balanceDelta > 0) {
        await supabase.from("agents").update({ balance_meeet: newBalance }).eq("id", stake.agent_id);
      }

      // History
      const historyAction = result === "correct" ? "reward" : result === "incorrect" ? "slash" : "stake";
      await supabase.from("stake_history").insert({
        agent_id: stake.agent_id,
        action: historyAction,
        amount: result === "correct" ? balanceDelta : stake.amount,
        balance_before: agent.balance_meeet,
        balance_after: result === "correct" ? newBalance : agent.balance_meeet,
        reason,
      });

      return json({
        stake_id,
        result,
        status: newStatus,
        balance_delta: balanceDelta,
        message: reason,
      });
    }

    return json({ error: "Unknown action. Use: lock, resolve, agent/:id, stats" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
