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

const RPC_URL = "https://api.mainnet-beta.solana.com";
const TREASURY_SOL = "4zkqErmzJhFQ7ahgTKfqTHutPk5GczMMXyAaEgbEpN1e";
const OPS_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const TEAM_WALLET = "4nfsUavL6huPuu7RDLaVuytvJKtkKYbfmjW4gnDKc5cX";
const MEEET_MINT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const LAMPORTS_PER_SOL = 1_000_000_000;

const SOL_PRICES: Record<string, number> = {
  Scout: 0.19, Warrior: 0.49, Commander: 1.49, Nation: 4.99,
};
const MEEET_PRICES: Record<string, number> = {
  Scout: 3800, Warrior: 8800, Commander: 25600, Nation: 80000,
};

async function solanaRpc(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result;
}

async function verifySolTransaction(
  txSignature: string,
  expectedLamports: number,
  treasuryAddress: string,
): Promise<{ verified: boolean; error?: string; actualLamports?: number }> {
  try {
    const tx = await solanaRpc("getTransaction", [
      txSignature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);

    if (!tx) return { verified: false, error: "Transaction not found. It may still be confirming — try again in 30s." };
    if (tx.meta?.err) return { verified: false, error: "Transaction failed on-chain" };

    // Check confirmations
    const slot = tx.slot;
    const currentSlot = await solanaRpc("getSlot", []);
    const confirmations = currentSlot - slot;
    if (confirmations < 10) {
      return { verified: false, error: `Transaction needs more confirmations (${confirmations}/10)` };
    }

    // Find SOL transfer to treasury
    const instructions = tx.transaction?.message?.instructions || [];
    let transferredLamports = 0;

    for (const ix of instructions) {
      if (ix.parsed?.type === "transfer" && ix.program === "system") {
        const info = ix.parsed.info;
        if (info.destination === treasuryAddress) {
          transferredLamports += info.lamports;
        }
      }
    }

    // Also check inner instructions
    const innerInstructions = tx.meta?.innerInstructions || [];
    for (const inner of innerInstructions) {
      for (const ix of inner.instructions || []) {
        if (ix.parsed?.type === "transfer" && ix.program === "system") {
          const info = ix.parsed.info;
          if (info.destination === treasuryAddress) {
            transferredLamports += info.lamports;
          }
        }
      }
    }

    // Allow 2% tolerance for rounding
    const minExpected = Math.floor(expectedLamports * 0.98);
    if (transferredLamports < minExpected) {
      return {
        verified: false,
        error: `Insufficient payment: received ${(transferredLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL, expected ${(expectedLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
        actualLamports: transferredLamports,
      };
    }

    return { verified: true, actualLamports: transferredLamports };
  } catch (e) {
    return { verified: false, error: `Verification failed: ${e.message}` };
  }
}

async function verifyMeeetTransaction(
  txSignature: string,
  expectedAmount: number,
  treasuryAddress: string,
): Promise<{ verified: boolean; error?: string; actualAmount?: number }> {
  try {
    const tx = await solanaRpc("getTransaction", [
      txSignature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);

    if (!tx) return { verified: false, error: "Transaction not found. Try again in 30s." };
    if (tx.meta?.err) return { verified: false, error: "Transaction failed on-chain" };

    const slot = tx.slot;
    const currentSlot = await solanaRpc("getSlot", []);
    if (currentSlot - slot < 10) {
      return { verified: false, error: "Transaction needs more confirmations" };
    }

    // Check token transfers (SPL) to treasury
    const preBalances = tx.meta?.preTokenBalances || [];
    const postBalances = tx.meta?.postTokenBalances || [];

    let received = 0;
    for (const post of postBalances) {
      if (post.mint !== MEEET_MINT) continue;
      if (post.owner !== treasuryAddress) continue;
      
      const pre = preBalances.find(
        (p: any) => p.accountIndex === post.accountIndex && p.mint === MEEET_MINT
      );
      const preAmount = Number(pre?.uiTokenAmount?.uiAmount || 0);
      const postAmount = Number(post.uiTokenAmount?.uiAmount || 0);
      received += postAmount - preAmount;
    }

    // Allow 20% tolerance for MEEET (Jupiter swap slippage)
    const minExpected = expectedAmount * 0.80;
    if (received < minExpected) {
      return {
        verified: false,
        error: `Insufficient MEEET: received ${received.toLocaleString()}, expected ≥${Math.floor(minExpected).toLocaleString()}`,
        actualAmount: received,
      };
    }

    return { verified: true, actualAmount: received };
  } catch (e) {
    return { verified: false, error: `Verification failed: ${e.message}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { plan_id, payment_method, tx_signature } = body;

    if (!plan_id || !payment_method || !tx_signature) {
      return json({ error: "Missing required fields: plan_id, payment_method, tx_signature" }, 400);
    }
    if (!["sol", "meeet"].includes(payment_method)) {
      return json({ error: "Invalid payment method" }, 400);
    }
    if (typeof tx_signature !== "string" || tx_signature.length < 32 || tx_signature.length > 200) {
      return json({ error: "Invalid transaction signature" }, 400);
    }

    // Check duplicate tx_signature
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("tx_hash", tx_signature)
      .limit(1);

    if (existingPayment && existingPayment.length > 0) {
      return json({ error: "This transaction has already been used for a subscription" }, 409);
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabase
      .from("agent_plans")
      .select("id, name, price_meeet, price_usdc, max_agents")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) return json({ error: "Plan not found" }, 404);

    // ── VERIFY ON-CHAIN TRANSACTION ─────────────────────────
    if (payment_method === "sol") {
      const expectedSol = SOL_PRICES[plan.name];
      if (!expectedSol) return json({ error: `No SOL price for plan ${plan.name}` }, 400);

      const expectedLamports = Math.round(expectedSol * LAMPORTS_PER_SOL);
      const result = await verifySolTransaction(tx_signature, expectedLamports, TREASURY_SOL);

      if (!result.verified) {
        return json({ error: result.error, verified: false }, 400);
      }

      console.log(`SOL payment verified: ${expectedSol} SOL for ${plan.name} (tx: ${tx_signature})`);
    } else {
      const expectedMeeet = MEEET_PRICES[plan.name];
      if (!expectedMeeet) return json({ error: `No MEEET price for plan ${plan.name}` }, 400);

      const result = await verifyMeeetTransaction(tx_signature, expectedMeeet, TREASURY_SOL);

      if (!result.verified) {
        return json({ error: result.error, verified: false }, 400);
      }

      console.log(`MEEET payment verified: ${result.actualAmount} MEEET for ${plan.name} (tx: ${tx_signature})`);
    }

    // ── CREATE SUBSCRIPTION ─────────────────────────────────
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: subscription, error: subError } = await supabase
      .from("agent_subscriptions")
      .insert({
        plan_id,
        user_id: user.id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (subError) return json({ error: subError.message }, 500);

    // ── RECORD PAYMENT ──────────────────────────────────────
    const solAmount = payment_method === "sol" ? SOL_PRICES[plan.name] : null;
    const meeetAmount = payment_method === "meeet" ? MEEET_PRICES[plan.name] : null;

    await supabase.from("payments").insert({
      user_id: user.id,
      payment_method,
      tx_hash: tx_signature,
      reference_type: "subscription",
      reference_id: subscription.id,
      status: "verified",
      amount_sol: solAmount,
      amount_meeet: meeetAmount,
    });

    // ── LOG FUND DISTRIBUTION (on-chain distribution is manual/backend) ──
    // 40% LP contribution, 30% ops, 20% treasury, 10% team
    console.log(`Fund distribution for ${plan.name} (${payment_method}):
  40% → LP contribution (Raydium)
  30% → Ops wallet: ${OPS_WALLET}
  20% → Treasury: ${TREASURY_SOL}
  10% → Team: ${TEAM_WALLET}`);

    return json({
      subscription_id: subscription.id,
      plan_name: plan.name,
      expires_at: subscription.expires_at,
      verified: true,
      distribution: {
        lp_contribution: "40%",
        ops_wallet: "30%",
        treasury: "20%",
        team: "10%",
      },
    });
  } catch (err) {
    console.error("create-subscription error:", err);
    return json({ error: String(err) }, 500);
  }
});
