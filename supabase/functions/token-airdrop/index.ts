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

const MEEET_MINT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";

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

function getKeypair(): Uint8Array {
  const key = Deno.env.get("TRADING_WALLET_KEY");
  if (!key) throw new Error("TRADING_WALLET_KEY not configured");
  const trimmed = key.trim();
  if (trimmed.startsWith("[")) return new Uint8Array(JSON.parse(trimmed));
  return base58Decode(trimmed);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: president only
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) return json({ error: "Unauthorized" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader);
    if (authErr || !user) return json({ error: "Invalid token" }, 403);

    const { data: profile } = await supabase.from("profiles").select("is_president").eq("user_id", user.id).single();
    if (!profile?.is_president) return json({ error: "President access only" }, 403);

    const { wallets, amount_meeet } = await req.json();

    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
      return json({ error: "wallets must be a non-empty array of Solana addresses" }, 400);
    }
    if (!amount_meeet || amount_meeet <= 0) {
      return json({ error: "amount_meeet must be positive" }, 400);
    }
    if (wallets.length > 50) {
      return json({ error: "Max 50 wallets per batch" }, 400);
    }

    const {
      Keypair, Connection, PublicKey, Transaction,
    } = await import("npm:@solana/web3.js@1.95.8");
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
    const senderAta = await getAssociatedTokenAddress(mint, keypair.publicKey);
    const rawAmount = Math.floor(amount_meeet * 1e6);

    const results: Array<{ wallet: string; status: string; tx?: string; error?: string }> = [];

    // Process in batches of 5 (to avoid tx size limits)
    for (let i = 0; i < wallets.length; i += 5) {
      const batch = wallets.slice(i, i + 5);
      const tx = new Transaction();

      for (const addr of batch) {
        try {
          const recipient = new PublicKey(addr);
          const recipientAta = await getAssociatedTokenAddress(mint, recipient);

          try {
            await getAccount(connection, recipientAta);
          } catch {
            tx.add(createAssociatedTokenAccountInstruction(keypair.publicKey, recipientAta, recipient, mint));
          }

          tx.add(createTransferInstruction(senderAta, recipientAta, keypair.publicKey, rawAmount));
        } catch (e: any) {
          results.push({ wallet: addr, status: "error", error: e.message });
        }
      }

      if (tx.instructions.length > 0) {
        try {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
          tx.recentBlockhash = blockhash;
          tx.feePayer = keypair.publicKey;
          tx.sign(keypair);

          const sig = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
          await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

          for (const addr of batch) {
            if (!results.find(r => r.wallet === addr)) {
              results.push({ wallet: addr, status: "sent", tx: sig });
            }
          }

          console.log(`Airdrop batch ${i / 5 + 1}: ${batch.length} wallets, ${amount_meeet} MEEET each | tx: ${sig}`);
        } catch (e: any) {
          for (const addr of batch) {
            if (!results.find(r => r.wallet === addr)) {
              results.push({ wallet: addr, status: "failed", error: e.message });
            }
          }
        }
      }
    }

    const successful = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status !== "sent").length;

    return json({
      success: true,
      total: wallets.length,
      successful,
      failed,
      amount_per_wallet: amount_meeet,
      total_sent: successful * amount_meeet,
      results,
    });
  } catch (e) {
    console.error("token-airdrop error:", e);
    return json({ error: (e as Error).message || "Airdrop failed" }, 500);
  }
});
