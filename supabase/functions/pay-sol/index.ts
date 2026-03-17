import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "npm:@solana/web3.js@1.95.8";
import { decode as decodeBase58 } from "npm:bs58@6.0.0";

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

const RPC_URL = "https://api.mainnet-beta.solana.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow internal calls (from other edge functions)
    const internalSecret = req.headers.get("x-internal-service");
    const expectedSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(-16);
    if (!internalSecret || internalSecret !== expectedSecret) {
      return json({ error: "Internal only" }, 403);
    }

    const { recipient_wallet, amount_sol, quest_id, description } = await req.json();

    if (!recipient_wallet || !amount_sol) {
      return json({ error: "recipient_wallet and amount_sol required" }, 400);
    }

    const solAmount = Number(amount_sol);
    if (solAmount <= 0 || solAmount > 100) {
      return json({ error: "Invalid SOL amount (0 < amount <= 100)" }, 400);
    }

    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient_wallet);
    } catch {
      return json({ error: "Invalid recipient wallet address" }, 400);
    }

    // Load treasury keypair
    const privateKeyBase58 = Deno.env.get("TREASURY_WALLET_PRIVATE_KEY");
    if (!privateKeyBase58) {
      return json({ error: "Treasury wallet not configured" }, 500);
    }

    let treasuryKeypair: Keypair;
    try {
      const secretKey = decodeBase58(privateKeyBase58);
      treasuryKeypair = Keypair.fromSecretKey(secretKey);
    } catch {
      return json({ error: "Invalid treasury wallet key" }, 500);
    }

    const treasuryAddress = treasuryKeypair.publicKey.toBase58();

    // Connect to Solana
    const connection = new Connection(RPC_URL, "confirmed");

    // Check treasury balance
    const balance = await connection.getBalance(treasuryKeypair.publicKey);
    const lamportsToSend = Math.round(solAmount * LAMPORTS_PER_SOL);
    const estimatedFee = 5000; // ~0.000005 SOL

    if (balance < lamportsToSend + estimatedFee) {
      const balanceSol = (balance / LAMPORTS_PER_SOL).toFixed(6);
      return json({
        error: `Insufficient treasury balance: ${balanceSol} SOL available, ${solAmount} SOL needed`,
        treasury_balance: balanceSol,
        treasury_address: treasuryAddress,
      }, 400);
    }

    // Build and send transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: lamportsToSend,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);

    console.log(`SOL Transfer: ${solAmount} SOL to ${recipient_wallet} | tx: ${signature} | quest: ${quest_id || "n/a"}`);

    return json({
      success: true,
      signature,
      amount_sol: solAmount,
      recipient: recipient_wallet,
      treasury_address: treasuryAddress,
      explorer_url: `https://solscan.io/tx/${signature}`,
    });
  } catch (e) {
    console.error("pay-sol error:", e);
    return json({ error: e.message || "Transaction failed" }, 500);
  }
});
