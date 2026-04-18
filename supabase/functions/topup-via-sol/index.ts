// Top up agent_billing.balance_usd by verifying an on-chain SOL transfer to the treasury.
// Flow: client sends SOL to TREASURY_WALLET, then calls this function with { signature, expected_sol, user_id }.
// Server verifies the tx hits treasury, computes USD credit using current SOL price, credits the balance.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lightweight base58 decoder (matches pay-sol implementation)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const c of str) {
    const idx = BASE58_ALPHABET.indexOf(c);
    if (idx < 0) throw new Error("Invalid base58 character");
    let carry = idx;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const c of str) {
    if (c !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

// Treasury wallet address derived from TREASURY_WALLET_PRIVATE_KEY (base58 secret key)
async function getTreasuryAddress(): Promise<string | null> {
  const sk = Deno.env.get("TREASURY_WALLET_PRIVATE_KEY");
  if (!sk) return null;
  const { Keypair } = await import("npm:@solana/web3.js@1.95.8");
  const cleaned = sk.replace(/[\s\r\n]/g, "");
  const secret = base58Decode(cleaned);
  return Keypair.fromSecretKey(secret).publicKey.toBase58();
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC: ${data.error.message}`);
  return data.result;
}

async function getSolUsdPrice(): Promise<number> {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const d = await r.json();
    const p = Number(d?.solana?.usd);
    if (p > 0) return p;
  } catch (e) {
    console.error("price fetch failed:", e);
  }
  // Conservative fallback if CoinGecko is rate-limited
  return 150;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action } = body;

    // Step 1: Get treasury address + current price for client to build the transfer
    if (action === "info") {
      const treasury = await getTreasuryAddress();
      if (!treasury) return json({ error: "Treasury wallet not configured" }, 500);
      const sol_usd = await getSolUsdPrice();
      return json({
        success: true,
        treasury_address: treasury,
        sol_usd_price: sol_usd,
        min_topup_usd: 1,
        max_topup_usd: 1000,
        memo_required: true,
      });
    }

    // Step 2: Verify a signed SOL transfer and credit the user's balance
    if (action === "verify") {
      const { signature, user_id } = body;
      if (!signature || !user_id) return json({ error: "signature and user_id required" }, 400);

      // Idempotency: don't double-credit
      const { data: existing } = await sb
        .from("agent_actions")
        .select("id")
        .eq("user_id", user_id)
        .eq("action_type", "topup_sol")
        .contains("details", { signature })
        .maybeSingle();
      if (existing) return json({ error: "Transaction already credited", signature }, 409);

      const treasury = await getTreasuryAddress();
      if (!treasury) return json({ error: "Treasury not configured" }, 500);

      // Fetch the parsed transaction
      const tx = await rpc("getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
      if (!tx) return json({ error: "Transaction not found yet — try again in a few seconds" }, 404);
      if (tx.meta?.err) return json({ error: "Transaction failed on-chain", details: tx.meta.err }, 400);

      // Sum lamports transferred TO treasury
      const accountKeys = tx.transaction?.message?.accountKeys ?? [];
      const treasuryIdx = accountKeys.findIndex((k: any) => (k.pubkey || k) === treasury);
      if (treasuryIdx < 0) return json({ error: "Treasury not in transaction" }, 400);

      const pre = tx.meta.preBalances[treasuryIdx];
      const post = tx.meta.postBalances[treasuryIdx];
      const lamportsReceived = post - pre;
      if (lamportsReceived <= 0) return json({ error: "No funds received by treasury" }, 400);

      const solReceived = lamportsReceived / LAMPORTS_PER_SOL;
      const solUsd = await getSolUsdPrice();
      const usdCredit = +(solReceived * solUsd).toFixed(4);

      if (usdCredit < 0.5) return json({ error: "Minimum top-up is $0.50 worth of SOL" }, 400);

      // Credit balance
      const { data: bal } = await sb.from("agent_billing").select("*").eq("user_id", user_id).maybeSingle();
      const newBalance = +(((bal?.balance_usd ?? 0) + usdCredit).toFixed(4));

      if (bal) {
        await sb.from("agent_billing").update({
          balance_usd: newBalance,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user_id);
      } else {
        await sb.from("agent_billing").insert({
          user_id,
          balance_usd: newBalance,
          free_credit_used: true,
        });
      }

      // Audit log
      await sb.from("agent_actions").insert({
        user_id,
        action_type: "topup_sol",
        cost_usd: -usdCredit, // negative = credit
        details: {
          signature,
          sol_received: solReceived,
          sol_usd_price: solUsd,
          usd_credited: usdCredit,
          treasury_address: treasury,
          new_balance: newBalance,
        },
      });

      // Activity feed
      await sb.from("activity_feed").insert({
        event_type: "billing_topup",
        title: `💰 Top-up: $${usdCredit.toFixed(2)} (${solReceived.toFixed(4)} SOL)`,
        description: `User ${user_id.slice(0, 8)} topped up via Solana`,
      });

      return json({
        success: true,
        signature,
        sol_received: solReceived,
        usd_credited: usdCredit,
        new_balance: newBalance,
        explorer_url: `https://solscan.io/tx/${signature}`,
      });
    }

    return json({ error: "Unknown action. Use 'info' or 'verify'" }, 400);
  } catch (e) {
    console.error("topup-via-sol error:", e);
    return json({ error: e instanceof Error ? e.message : "Top-up failed" }, 500);
  }
});
