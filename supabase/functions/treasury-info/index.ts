import { Connection, Keypair, LAMPORTS_PER_SOL } from "npm:@solana/web3.js@1.95.8";
import { decode as decodeBase58 } from "npm:bs58@6.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKeyBase58 = Deno.env.get("TREASURY_WALLET_PRIVATE_KEY");
    if (!privateKeyBase58) {
      return new Response(JSON.stringify({ error: "Treasury not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = decodeBase58(privateKeyBase58);
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
