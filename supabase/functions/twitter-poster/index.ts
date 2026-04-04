import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── OAuth 1.0a helpers ──────────────────────────────────────────────
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

async function oauthSign(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Do NOT include POST body params in signature for JSON requests
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  oauthParams["oauth_signature"] = signature;

  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

// ── Post tweet via X API v2 ─────────────────────────────────────────
async function postTweet(account: { consumer_key: string; consumer_secret: string; access_token: string; access_token_secret: string }, text: string) {
  const url = "https://api.x.com/2/tweets";
  const authHeader = await oauthSign("POST", url, account.consumer_key, account.consumer_secret, account.access_token, account.access_token_secret);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();
  return { status: res.status, data };
}

// ── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action } = body;

    // ── ACTION: enqueue — add tweet to queue ──
    if (action === "enqueue") {
      const { account_username, text, scheduled_at } = body;
      if (!account_username || !text) return json({ error: "account_username and text required" }, 400);
      if (text.length > 280) return json({ error: "Tweet exceeds 280 characters" }, 400);

      const { data: account } = await sc.from("twitter_accounts").select("id").eq("username", account_username).eq("status", "active").maybeSingle();
      if (!account) return json({ error: `Account '${account_username}' not found or inactive` }, 404);

      const { data: queued, error } = await sc.from("twitter_queue").insert({
        account_id: account.id,
        content: text,
        scheduled_at: scheduled_at || null,
      }).select("id, content, status, created_at").single();

      if (error) return json({ error: error.message }, 500);
      return json({ status: "queued", tweet: queued });
    }

    // ── ACTION: post — post next pending tweet from queue ──
    if (action === "post") {
      const { account_username, text } = body;

      // Direct post (no queue)
      if (account_username && text) {
        const { data: account } = await sc.from("twitter_accounts").select("*").eq("username", account_username).eq("status", "active").maybeSingle();
        if (!account) return json({ error: `Account '${account_username}' not found` }, 404);

        const result = await postTweet(account, text);

        if (result.status === 201) {
          await sc.from("twitter_accounts").update({ last_posted_at: new Date().toISOString() }).eq("id", account.id);
        }

        return json({ tweet: text, result });
      }

      // Queue-based post: pick next pending
      const { data: next } = await sc.from("twitter_queue")
        .select("id, content, account_id, twitter_accounts(consumer_key, consumer_secret, access_token, access_token_secret, username)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!next) return json({ message: "Queue empty" });

      const acct = (next as any).twitter_accounts;
      const result = await postTweet(acct, next.content);

      await sc.from("twitter_queue").update({
        status: result.status === 201 ? "posted" : "failed",
        tweet_id: result.data?.data?.id || null,
        error: result.status !== 201 ? JSON.stringify(result.data) : null,
        posted_at: result.status === 201 ? new Date().toISOString() : null,
      }).eq("id", next.id);

      if (result.status === 201) {
        await sc.from("twitter_accounts").update({ last_posted_at: new Date().toISOString() }).eq("id", next.account_id);
      }

      return json({ tweet: next.content, result });
    }

    // ── ACTION: status — show accounts and queue stats ──
    if (action === "status") {
      const { data: accounts } = await sc.from("twitter_accounts").select("id, username, role, status, last_posted_at");
      const { count: pending } = await sc.from("twitter_queue").select("id", { count: "exact" }).limit(0).limit(0).eq("status", "pending");
      const { count: posted } = await sc.from("twitter_queue").select("id", { count: "exact" }).limit(0).limit(0).eq("status", "posted");
      const { count: failed } = await sc.from("twitter_queue").select("id", { count: "exact" }).limit(0).limit(0).eq("status", "failed");
      return json({ accounts: accounts ?? [], queue: { pending, posted, failed } });
    }

    // ── ACTION: add_account — register a Twitter account ──
    if (action === "add_account") {
      const { username, consumer_key, consumer_secret, access_token, access_token_secret, role } = body;
      if (!username || !consumer_key || !consumer_secret || !access_token || !access_token_secret) {
        return json({ error: "username, consumer_key, consumer_secret, access_token, access_token_secret required" }, 400);
      }

      const { data, error } = await sc.from("twitter_accounts").upsert({
        username,
        consumer_key: consumer_key.trim(),
        consumer_secret: consumer_secret.trim(),
        access_token: access_token.trim(),
        access_token_secret: access_token_secret.trim(),
        role: role || "main",
        status: "active",
      }, { onConflict: "username" }).select("id, username, role, status").single();

      if (error) return json({ error: error.message }, 500);
      return json({ status: "account_saved", account: data });
    }

    // ── ACTION: queue — list pending tweets ──
    if (action === "queue") {
      const { data } = await sc.from("twitter_queue")
        .select("id, content, status, created_at, posted_at, tweet_id, error, twitter_accounts(username)")
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ queue: data ?? [] });
    }

    return json({ error: "Unknown action. Use: enqueue, post, status, add_account, queue" }, 400);
  } catch (e) {
    return json({ error: "Internal server error", details: e?.message }, 500);
  }
});
