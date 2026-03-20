import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;

// Lightweight base58 decoder — no external dependency
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

async function solanaRpc(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC: ${data.error.message}`);
  return data.result;
}

async function sendSolTransfer(
  fromSecretKey: Uint8Array,
  toAddress: string,
  lamports: number,
): Promise<string> {
  // Use @solana/web3.js dynamically only when actually sending
  const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } =
    await import("npm:@solana/web3.js@1.95.8");

  const keypair = Keypair.fromSecretKey(fromSecretKey);
  const connection = new Connection(RPC_URL, "confirmed");

  const balance = await connection.getBalance(keypair.publicKey);
  if (balance < lamports + 5000) {
    throw new Error(
      `Insufficient treasury balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL, need ${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
    );
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports,
    }),
  );

  return await sendAndConfirmTransaction(connection, tx, [keypair]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow internal calls
    const internalSecret = req.headers.get("x-internal-service");
    const expectedSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-16);
    if (!internalSecret || internalSecret !== expectedSecret) {
      return json({ error: "Internal only" }, 403);
    }

    const { recipient_wallet, amount_sol, quest_id } = await req.json();

    if (!recipient_wallet || !amount_sol) {
      return json({ error: "recipient_wallet and amount_sol required" }, 400);
    }

    const solAmount = Number(amount_sol);
    if (solAmount <= 0 || solAmount > 100) {
      return json({ error: "Invalid SOL amount (0 < amount <= 100)" }, 400);
    }

    // Load treasury keypair
    const privateKeyBase58 = Deno.env.get("TREASURY_WALLET_PRIVATE_KEY");
    if (!privateKeyBase58) {
      return json({ error: "Treasury wallet not configured" }, 500);
    }

    const secretKey = base58Decode(privateKeyBase58);
    const lamportsToSend = Math.round(solAmount * LAMPORTS_PER_SOL);

    const signature = await sendSolTransfer(secretKey, recipient_wallet, lamportsToSend);

    console.log(`SOL Transfer: ${solAmount} SOL to ${recipient_wallet} | tx: ${signature} | quest: ${quest_id || "n/a"}`);

    return json({
      success: true,
      signature,
      amount_sol: solAmount,
      recipient: recipient_wallet,
      explorer_url: `https://solscan.io/tx/${signature}`,
    });
  } catch (e) {
    console.error("pay-sol error:", e);
    return json({ error: (e as Error).message || "Transaction failed" }, 500);
  }
});
