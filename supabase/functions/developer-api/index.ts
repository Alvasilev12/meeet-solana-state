import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isPrivateIP(ip: string): boolean {
  // Check IPv4 private/reserved ranges including octal/decimal bypass vectors
  const parts = ip.split(".");
  if (parts.length === 4) {
    const octets = parts.map(Number);
    if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return true; // malformed
    const [a, b] = octets;
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 127) return true;                         // 127.0.0.0/8
    if (a === 169 && b === 254) return true;            // 169.254.0.0/16 (link-local + cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;            // 192.168.0.0/16
  }
  // Block IPv6 loopback and private
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  // Block IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (ip.toLowerCase().startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    return isPrivateIP(mapped);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "docs") {
      return json({
        version: "2.0",
        endpoints: {
          "agent-api": { actions: ["register", "status", "list_tasks", "submit_result", "chat", "submit_discovery", "list_discoveries"] },
          "developer-api": { actions: ["docs", "usage", "rotate_key", "list_agents", "webhook_test"] },
          "public-leaderboard": { actions: ["top_agents", "top_nations", "top_guilds", "stats"] },
        },
        auth: "Use x-api-key header or Bearer JWT token",
        rate_limits: { requests_per_minute: 60, burst: 10 },
      });
    }

    // Authenticated actions below
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return json({ error: "x-api-key header required" }, 401);
    const keyHash = await hashKey(apiKey);
    const { data: userId } = await sc.rpc("validate_api_key", { _key_hash: keyHash });
    if (!userId) return json({ error: "Invalid API key" }, 401);

    if (action === "usage") {
      const { data: keys } = await sc.from("api_keys").select("key_prefix, name, created_at, last_used_at, is_active").eq("user_id", userId);
      const { data: agents } = await sc.from("agents").select("id, name, class, level, quests_completed, balance_meeet").eq("user_id", userId);
      return json({ api_keys: keys ?? [], agents: agents ?? [], user_id: userId });
    }

    if (action === "list_agents") {
      const { data } = await sc.from("agents").select("id, name, class, level, xp, balance_meeet, status, quests_completed, reputation").eq("user_id", userId);
      return json({ agents: data ?? [] });
    }

    if (action === "rotate_key") {
      const newKey = `mst_${Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("")}`;
      const newHash = await hashKey(newKey);
      await sc.from("api_keys").update({ is_active: false }).eq("key_hash", keyHash);
      await sc.from("api_keys").insert({ user_id: userId, key_hash: newHash, key_prefix: newKey.substring(0, 11), name: "rotated-key" });
      return json({ new_api_key: newKey, warning: "Save this key now. Old key has been deactivated." });
    }

    if (action === "webhook_test") {
      const { url } = body;
      if (!url) return json({ error: "url required" }, 400);

      // SSRF protection: validate URL with DNS resolution
      let parsed: URL;
      try { parsed = new URL(url); } catch { return json({ error: "Invalid URL" }, 400); }
      if (parsed.protocol !== "https:") return json({ error: "Only HTTPS URLs permitted" }, 400);

      // Resolve hostname to IP and validate against private ranges
      try {
        const resolvedIps = await Deno.resolveDns(parsed.hostname, "A");
        for (const ip of resolvedIps) {
          if (isPrivateIP(ip)) {
            return json({ error: "Private/internal addresses not permitted" }, 400);
          }
        }
      } catch {
        return json({ error: "Could not resolve hostname" }, 400);
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "test", timestamp: new Date().toISOString(), source: "meeet-platform" }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        return json({ success: true, status: resp.status, message: "Webhook test sent" });
      } catch (e) { return json({ success: false, error: "Failed to reach webhook URL" }, 400); }
    }

    return json({ error: "Unknown action. Use: docs, usage, list_agents, rotate_key, webhook_test" }, 400);
  } catch { return json({ error: "Internal server error" }, 500); }
});
