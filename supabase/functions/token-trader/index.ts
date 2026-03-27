import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-service, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MEEET_MINT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const TREASURY_WALLET = "4nfsUavL6huPuu7RDLaVuytvJKtkKYbfmjW4gnDKc5cX";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUPITER_API = "https://quote-api.jup.ag/v6";

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

function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    result += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;

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

async function getSOLBalance(pubkey: string): Promise<number> {
  const result = await solanaRpc("getBalance", [pubkey]);
  return (result?.value ?? 0) / LAMPORTS_PER_SOL;
}

async function getMEEETBalance(pubkey: string): Promise<number> {
  const result = await solanaRpc("getTokenAccountsByOwner", [
    pubkey,
    { mint: MEEET_MINT },
    { encoding: "jsonParsed" },
  ]);
  const accounts = result?.value ?? [];
  if (accounts.length === 0) return 0;
  return accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
}

function getKeypair() {
  const key = Deno.env.get("TRADING_WALLET_KEY");
  if (!key) throw new Error("TRADING_WALLET_KEY not configured");
  return base58Decode(key);
}

async function getPublicKeyFromSecret(): Promise<string> {
  const secretKey = getKeypair();
  const { Keypair } = await import("npm:@solana/web3.js@1.95.8");
  const kp = Keypair.fromSecretKey(secretKey);
  return kp.publicKey.toBase58();
}

async function signAndSendSwap(swapTxBase64: string): Promise<string> {
  const { Keypair, VersionedTransaction, Connection } = await import("npm:@solana/web3.js@1.95.8");

  const secretKey = getKeypair();
  const keypair = Keypair.fromSecretKey(secretKey);
  const connection = new Connection(RPC_URL, "confirmed");

  const txBuf = Uint8Array.from(atob(swapTxBase64), (c) => c.charCodeAt(0));
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });

  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: internal-only
    const internalSecret = req.headers.get("x-internal-service");
    const expectedSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");
    if (!internalSecret || internalSecret !== expectedSecret) {
      return json({ error: "Unauthorized — internal service only" }, 403);
    }

    const body = await req.json();
    const { action, amount_sol, sell_percent } = body;

    if (!action || !["status", "buy", "sell", "sweep", "run_cycle"].includes(action)) {
      return json({ error: "action must be 'status', 'buy', 'sell', 'sweep', or 'run_cycle'" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const pubkey = await getPublicKeyFromSecret();

    // ─── STATUS ───
    if (action === "status") {
      const [solBal, meeetBal] = await Promise.all([
        getSOLBalance(pubkey),
        getMEEETBalance(pubkey),
      ]);

      const { count } = await supabase
        .from("trade_log")
        .select("*", { count: "exact", head: true });

      return json({
        wallet: pubkey,
        sol_balance: solBal,
        meeet_balance: meeetBal,
        total_trades: count ?? 0,
        treasury: TREASURY_WALLET,
        status: "ready",
      });
    }

    // ─── BUY ───
    if (action === "buy") {
      const solAmount = amount_sol ?? Math.random() * 0.04 + 0.01; // 0.01–0.05 SOL
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Check balance
      const solBal = await getSOLBalance(pubkey);
      if (solBal < solAmount + 0.005) {
        return json({ error: `Insufficient SOL: ${solBal.toFixed(4)}` }, 400);
      }

      // Jupiter quote
      const quoteRes = await fetch(
        `${JUPITER_API}/quote?inputMint=${SOL_MINT}&outputMint=${MEEET_MINT}&amount=${lamports}&slippageBps=200`,
      );
      const quote = await quoteRes.json();
      if (!quote || quote.error) {
        await supabase.from("trade_log").insert({
          action: "buy",
          sol_amount: solAmount,
          meeet_amount: 0,
          status: "failed",
          error: JSON.stringify(quote?.error ?? "Quote failed"),
        });
        return json({ error: "Jupiter quote failed", details: quote }, 502);
      }

      const meeetOut = parseInt(quote.outAmount) / 1e6;

      // Jupiter swap
      const swapRes = await fetch(`${JUPITER_API}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: pubkey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 10000,
        }),
      });
      const swap = await swapRes.json();

      if (!swap.swapTransaction) {
        await supabase.from("trade_log").insert({
          action: "buy",
          sol_amount: solAmount,
          meeet_amount: meeetOut,
          status: "failed",
          error: "No swap transaction returned",
        });
        return json({ error: "Swap instruction failed" }, 502);
      }

      const txSig = await signAndSendSwap(swap.swapTransaction);

      await supabase.from("trade_log").insert({
        action: "buy",
        sol_amount: solAmount,
        meeet_amount: meeetOut,
        tx_signature: txSig,
        price: solAmount / meeetOut,
        status: "completed",
      });

      console.log(`BUY: ${solAmount.toFixed(4)} SOL → ${meeetOut.toFixed(0)} MEEET | tx: ${txSig}`);

      return json({
        success: true,
        action: "buy",
        sol_spent: solAmount,
        meeet_received: meeetOut,
        tx: txSig,
        explorer: `https://solscan.io/tx/${txSig}`,
      });
    }

    // ─── SELL ───
    if (action === "sell") {
      const meeetBal = await getMEEETBalance(pubkey);
      const pct = sell_percent ?? Math.random() * 0.3 + 0.1; // 10–40%
      const sellAmount = Math.floor(meeetBal * pct * 1e6);

      if (sellAmount < 1000) {
        return json({ error: `Not enough MEEET to sell: ${meeetBal}` }, 400);
      }

      const quoteRes = await fetch(
        `${JUPITER_API}/quote?inputMint=${MEEET_MINT}&outputMint=${SOL_MINT}&amount=${sellAmount}&slippageBps=200`,
      );
      const quote = await quoteRes.json();
      if (!quote || quote.error) {
        await supabase.from("trade_log").insert({
          action: "sell",
          sol_amount: 0,
          meeet_amount: sellAmount / 1e6,
          status: "failed",
          error: JSON.stringify(quote?.error ?? "Quote failed"),
        });
        return json({ error: "Jupiter quote failed", details: quote }, 502);
      }

      const solOut = parseInt(quote.outAmount) / LAMPORTS_PER_SOL;

      const swapRes = await fetch(`${JUPITER_API}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: pubkey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 10000,
        }),
      });
      const swap = await swapRes.json();

      if (!swap.swapTransaction) {
        await supabase.from("trade_log").insert({
          action: "sell",
          sol_amount: solOut,
          meeet_amount: sellAmount / 1e6,
          status: "failed",
          error: "No swap transaction returned",
        });
        return json({ error: "Swap instruction failed" }, 502);
      }

      const txSig = await signAndSendSwap(swap.swapTransaction);

      await supabase.from("trade_log").insert({
        action: "sell",
        sol_amount: solOut,
        meeet_amount: sellAmount / 1e6,
        tx_signature: txSig,
        price: solOut / (sellAmount / 1e6),
        status: "completed",
      });

      console.log(`SELL: ${(sellAmount / 1e6).toFixed(0)} MEEET → ${solOut.toFixed(4)} SOL | tx: ${txSig}`);

      return json({
        success: true,
        action: "sell",
        meeet_sold: sellAmount / 1e6,
        sol_received: solOut,
        tx: txSig,
        explorer: `https://solscan.io/tx/${txSig}`,
      });
    }

    // ─── SWEEP — send all MEEET to treasury ───
    if (action === "sweep") {
      const meeetBal = await getMEEETBalance(pubkey);
      if (meeetBal < 1) {
        return json({ error: `No MEEET to sweep: ${meeetBal}` }, 400);
      }

      const { Keypair, Connection, PublicKey, Transaction } = await import("npm:@solana/web3.js@1.95.8");
      const {
        getAssociatedTokenAddress,
        createTransferInstruction,
        createAssociatedTokenAccountInstruction,
        getAccount,
      } = await import("npm:@solana/spl-token@0.3.11");

      const secretKey = getKeypair();
      const keypair = Keypair.fromSecretKey(secretKey);
      const connection = new Connection(RPC_URL, "confirmed");
      const mint = new PublicKey(MEEET_MINT);
      const treasury = new PublicKey(TREASURY_WALLET);

      const senderAta = await getAssociatedTokenAddress(mint, keypair.publicKey);
      const treasuryAta = await getAssociatedTokenAddress(mint, treasury);

      const tx = new Transaction();
      try {
        await getAccount(connection, treasuryAta);
      } catch {
        tx.add(createAssociatedTokenAccountInstruction(keypair.publicKey, treasuryAta, treasury, mint));
      }

      const rawAmount = Math.floor(meeetBal * 1e6);
      tx.add(createTransferInstruction(senderAta, treasuryAta, keypair.publicKey, rawAmount));

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);

      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      await supabase.from("trade_log").insert({
        action: "sweep",
        sol_amount: 0,
        meeet_amount: meeetBal,
        tx_signature: sig,
        status: "completed",
      });

      console.log(`SWEEP: ${meeetBal.toFixed(0)} MEEET → treasury | tx: ${sig}`);

      return json({
        success: true,
        action: "sweep",
        meeet_sent: meeetBal,
        to: TREASURY_WALLET,
        tx: sig,
        explorer: `https://solscan.io/tx/${sig}`,
      });
    }

    // ─── RUN_CYCLE — automated buy/sell decision ───
    if (action === "run_cycle") {
      const [solBal, meeetBal] = await Promise.all([
        getSOLBalance(pubkey),
        getMEEETBalance(pubkey),
      ]);

      if (solBal < 0.02) {
        // Not enough SOL — sweep remaining MEEET
        if (meeetBal > 1) {
          // Recursive call to sweep
          const sweepUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/token-trader`;
          await fetch(sweepUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-service": expectedSecret!,
            },
            body: JSON.stringify({ action: "sweep" }),
          });
        }
        return json({ status: "finished", reason: "SOL depleted", swept: meeetBal > 1 });
      }

      const doBuy = Math.random() < 0.7;

      if (doBuy) {
        const solAmount = Math.random() * 0.04 + 0.01;
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

        const quoteRes = await fetch(
          `${JUPITER_API}/quote?inputMint=${SOL_MINT}&outputMint=${MEEET_MINT}&amount=${lamports}&slippageBps=200`,
        );
        const quote = await quoteRes.json();
        if (quote.error) return json({ cycle: "buy_failed", error: quote.error });

        const swapRes = await fetch(`${JUPITER_API}/swap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: pubkey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 10000,
          }),
        });
        const swap = await swapRes.json();
        if (!swap.swapTransaction) return json({ cycle: "buy_failed", error: "No swap tx" });

        const txSig = await signAndSendSwap(swap.swapTransaction);
        const meeetOut = parseInt(quote.outAmount) / 1e6;

        await supabase.from("trade_log").insert({
          action: "buy",
          sol_amount: solAmount,
          meeet_amount: meeetOut,
          tx_signature: txSig,
          price: solAmount / meeetOut,
          status: "completed",
        });

        console.log(`CYCLE BUY: ${solAmount.toFixed(4)} SOL → ${meeetOut.toFixed(0)} MEEET`);
        return json({ cycle: "buy", sol: solAmount, meeet: meeetOut, tx: txSig });
      } else {
        if (meeetBal < 100) return json({ cycle: "skip_sell", reason: "low MEEET balance" });

        const sellPct = Math.random() * 0.2 + 0.05;
        const sellRaw = Math.floor(meeetBal * sellPct * 1e6);

        const quoteRes = await fetch(
          `${JUPITER_API}/quote?inputMint=${MEEET_MINT}&outputMint=${SOL_MINT}&amount=${sellRaw}&slippageBps=200`,
        );
        const quote = await quoteRes.json();
        if (quote.error) return json({ cycle: "sell_failed", error: quote.error });

        const swapRes = await fetch(`${JUPITER_API}/swap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: pubkey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 10000,
          }),
        });
        const swap = await swapRes.json();
        if (!swap.swapTransaction) return json({ cycle: "sell_failed", error: "No swap tx" });

        const txSig = await signAndSendSwap(swap.swapTransaction);
        const solOut = parseInt(quote.outAmount) / LAMPORTS_PER_SOL;

        await supabase.from("trade_log").insert({
          action: "sell",
          sol_amount: solOut,
          meeet_amount: sellRaw / 1e6,
          tx_signature: txSig,
          price: solOut / (sellRaw / 1e6),
          status: "completed",
        });

        console.log(`CYCLE SELL: ${(sellRaw / 1e6).toFixed(0)} MEEET → ${solOut.toFixed(4)} SOL`);
        return json({ cycle: "sell", meeet: sellRaw / 1e6, sol: solOut, tx: txSig });
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("token-trader error:", e);
    return json({ error: (e as Error).message || "Trade failed" }, 500);
  }
});
