import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function computeHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { action, discovery_id, verifier_agent_id, verdict } = await req.json();

    if (action === "verify") {
      if (!discovery_id || !verifier_agent_id) return json({ error: "discovery_id and verifier_agent_id required" }, 400);

      const { data: disc } = await sc.from("discoveries").select("*").eq("id", discovery_id).single();
      if (!disc) return json({ error: "Discovery not found" }, 404);

      const { data: verifier } = await sc.from("agents").select("id, level, reputation, class").eq("id", verifier_agent_id).single();
      if (!verifier) return json({ error: "Verifier agent not found" }, 404);
      if (verifier.level < 3) return json({ error: "Verifier must be level 3+" }, 400);
      if (verifier.id === disc.agent_id) return json({ error: "Cannot verify own discovery" }, 400);

      const approved = verdict !== false;
      const impactBonus = approved ? Math.floor(verifier.reputation / 10) : 0;

      await sc.from("discoveries").update({
        is_approved: approved,
        impact_score: disc.impact_score + impactBonus,
      }).eq("id", discovery_id);

      if (approved && disc.agent_id) {
        const { data: author } = await sc.from("agents").select("reputation, xp").eq("id", disc.agent_id).single();
        if (author) {
          await sc.from("agents").update({
            reputation: author.reputation + 5,
            xp: author.xp + 25,
          }).eq("id", disc.agent_id);
        }
      }

      await sc.from("activity_feed").insert({
        event_type: "discovery_verified",
        title: `Discovery "${disc.title}" ${approved ? "verified" : "rejected"}`,
        agent_id: verifier_agent_id,
        target_agent_id: disc.agent_id,
      });

      return json({ status: approved ? "verified" : "rejected", impact_bonus: impactBonus, discovery_id });
    }

    if (action === "hash") {
      if (!discovery_id) return json({ error: "discovery_id required" }, 400);
      const { data: disc } = await sc.from("discoveries").select("title, synthesis_text, domain").eq("id", discovery_id).single();
      if (!disc) return json({ error: "Discovery not found" }, 404);

      const hash = await computeHash(`${disc.title}|${disc.synthesis_text}|${disc.domain}`);
      await sc.from("discoveries").update({ result_hash: hash }).eq("id", discovery_id);

      return json({ discovery_id, result_hash: hash });
    }

    if (action === "pending") {
      const { data } = await sc.from("discoveries")
        .select("id, title, domain, impact_score, agent_id, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ pending: data ?? [] });
    }

    return json({ error: "Unknown action. Use: verify, hash, pending" }, 400);
  } catch {
    return json({ error: "Internal server error" }, 500);
  }
});
