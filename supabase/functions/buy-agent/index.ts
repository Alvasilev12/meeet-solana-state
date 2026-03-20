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
const MEEET_MINT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";

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

async function verifyMeeetTransfer(
  txSignature: string,
  expectedAmount: number,
): Promise<{ verified: boolean; error?: string }> {
  try {
    const tx = await solanaRpc("getTransaction", [
      txSignature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx) return { verified: false, error: "Transaction not found" };
    if (!tx.meta || tx.meta.err) return { verified: false, error: "Transaction failed on-chain" };

    const confirmations = tx.slot ? 10 : 0;
    if (tx.meta.confirmationStatus === "processed") {
      return { verified: false, error: "Transaction not yet confirmed (need finalized)" };
    }

    // Check SPL token transfers to treasury
    const postBalances = tx.meta.postTokenBalances || [];
    const preBalances = tx.meta.preTokenBalances || [];

    for (const post of postBalances) {
      if (post.mint !== MEEET_MINT) continue;
      if (post.owner !== TREASURY_SOL) continue;
      const pre = preBalances.find(
        (p: any) => p.accountIndex === post.accountIndex,
      );
      const preAmount = pre ? Number(pre.uiTokenAmount?.amount || 0) : 0;
      const postAmount = Number(post.uiTokenAmount?.amount || 0);
      const diff = postAmount - preAmount;
      if (diff >= expectedAmount) return { verified: true };
    }

    return { verified: false, error: `Insufficient MEEET transfer to treasury` };
  } catch (e) {
    return { verified: false, error: String(e) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { listing_id, payment_method, buyer_agent_id, tx_signature } = body;

    if (!listing_id || !payment_method || !buyer_agent_id) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (!["internal", "external"].includes(payment_method)) {
      return json({ error: "Invalid payment_method. Use 'internal' or 'external'" }, 400);
    }

    // Fetch listing
    const { data: listing, error: listErr } = await supabase
      .from("agent_marketplace_listings")
      .select("*, agents(id, name, class, user_id)")
      .eq("id", listing_id)
      .eq("is_active", true)
      .single();

    if (listErr || !listing) return json({ error: "Listing not found or inactive" }, 404);
    if (listing.seller_user_id === user.id) return json({ error: "Cannot buy your own agent" }, 400);

    const priceM = listing.price_meeet;

    // Verify buyer owns the paying agent
    const { data: buyerAgent } = await supabase
      .from("agents")
      .select("id, name, balance_meeet, user_id")
      .eq("id", buyer_agent_id)
      .single();

    if (!buyerAgent || buyerAgent.user_id !== user.id) {
      return json({ error: "Buyer agent not found or not yours" }, 403);
    }

    // Check for duplicate tx_signature
    if (payment_method === "external" && tx_signature) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("tx_hash", tx_signature)
        .maybeSingle();
      if (existing) return json({ error: "Transaction already used" }, 400);
    }

    // ─── Payment verification ───
    if (payment_method === "internal") {
      // Deduct from buyer agent balance
      if (buyerAgent.balance_meeet < priceM) {
        return json({
          error: `Insufficient balance. Need ${priceM} MEEET, have ${buyerAgent.balance_meeet}`,
        }, 400);
      }

      // Deduct balance
      const { error: deductErr } = await supabase
        .from("agents")
        .update({ balance_meeet: buyerAgent.balance_meeet - priceM })
        .eq("id", buyer_agent_id);
      if (deductErr) return json({ error: "Failed to deduct balance" }, 500);

    } else {
      // External: verify on-chain transaction
      if (!tx_signature) return json({ error: "tx_signature required for external payment" }, 400);

      const verify = await verifyMeeetTransfer(tx_signature, priceM);
      if (!verify.verified) {
        return json({ error: verify.error || "Transaction verification failed" }, 400);
      }
    }

    // ─── Transfer agent ownership ───
    const soldAgentId = listing.agent_id;

    // Update agent owner to buyer
    const { error: transferErr } = await supabase
      .from("agents")
      .update({ user_id: user.id })
      .eq("id", soldAgentId);
    if (transferErr) return json({ error: "Failed to transfer agent" }, 500);

    // Deactivate listing
    await supabase
      .from("agent_marketplace_listings")
      .update({ is_active: false })
      .eq("id", listing_id);

    // Record payment
    await supabase.from("payments").insert({
      user_id: user.id,
      amount_meeet: priceM,
      payment_method: payment_method === "internal" ? "internal_balance" : "meeet_onchain",
      reference_type: "marketplace_purchase",
      reference_id: listing_id,
      status: "completed",
      tx_hash: tx_signature || null,
    });

    // Notify buyer
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: `Агент ${listing.agents?.name} куплен!`,
      body: `Вы успешно приобрели агента ${listing.agents?.name} за ${priceM.toLocaleString()} MEEET.`,
      type: "marketplace",
      reference_id: soldAgentId,
    });

    // Notify seller
    await supabase.from("notifications").insert({
      user_id: listing.seller_user_id,
      title: `Ваш агент ${listing.agents?.name} продан!`,
      body: `Агент ${listing.agents?.name} был продан за ${priceM.toLocaleString()} MEEET.`,
      type: "marketplace",
      reference_id: soldAgentId,
    });

    // Notify president (find president user)
    const { data: presProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("is_president", true)
      .maybeSingle();

    if (presProfile) {
      await supabase.from("notifications").insert({
        user_id: presProfile.user_id,
        title: `Продажа на маркетплейсе: ${listing.agents?.name}`,
        body: `Агент ${listing.agents?.name} (${listing.agents?.class}) продан за ${priceM.toLocaleString()} MEEET. Метод: ${payment_method}.`,
        type: "marketplace_sale",
        reference_id: listing_id,
      });
    }

    return json({
      success: true,
      agent_id: soldAgentId,
      payment_method,
      amount_meeet: priceM,
    });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
