import { Connection, Keypair, LAMPORTS_PER_SOL } from "https://esm.sh/@solana/web3.js@1.95.8";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parsePrivateKey(raw: string): Uint8Array {
  // Try JSON array first: [1,2,3,...]
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed);
    return new Uint8Array(arr);
  }
  // Otherwise treat as base58
  return bs58.decode(trimmed);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKeyRaw = Deno.env.get("TREASURY_WALLET_PRIVATE_KEY");
    if (!privateKeyRaw) {
      return new Response(JSON.stringify({ error: "Treasury not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = parsePrivateKey(privateKeyRaw);
    const keypair = Keypair.fromSecretKey(secretKey);
    const address = keypair.publicKey.toBase58();

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSol = balance / LAMPORTS_PER_SOL;

    return new Response(JSON.stringify({
      address,
      balance_sol: balanceSol,
      balance_lamports: balance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
