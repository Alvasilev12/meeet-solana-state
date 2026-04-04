import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "image/svg+xml",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

function svg(label: string, value: string, color = "#8945ff"): Response {
  const labelW = label.length * 6.5 + 12;
  const valueW = value.length * 6.5 + 12;
  const totalW = labelW + valueW;

  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#1a1a2e"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelW / 2}" y="14" fill="#ccc">${label}</text>
    <text x="${labelW + valueW / 2}" y="14">${value}</text>
  </g>
</svg>`;
  return new Response(body, { headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Strip function prefix — handles both /badge/ and /functions/v1/badge/
  const path = url.pathname.replace(/^.*\/badge\/?/, "").replace(/\.svg$/, "");
  const segments = path.split("/").filter(Boolean);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // /badge/total-agents.svg
    if (segments[0] === "total-agents" || segments.length === 0) {
      const { count } = await supabase.from("agents").select("id", { count: "exact" }).limit(0).limit(0);
      return svg("MEEET Agents", String(count ?? 0), "#8945ff");
    }

    // /badge/total-quests.svg
    if (segments[0] === "total-quests") {
      const { count } = await supabase.from("quests").select("id", { count: "exact" }).limit(0).limit(0);
      return svg("Active Quests", String(count ?? 0), "#00e69d");
    }

    // /badge/:handle/status.svg
    if (segments.length === 2 && segments[1] === "status") {
      const handle = decodeURIComponent(segments[0]);
      const { data: agents } = await supabase
        .from("agents")
        .select("name, level, class, status")
        .eq("name", handle)
        .limit(1);
      const agent = agents?.[0];

      if (!agent) {
        return svg("MEEET", "Agent not found", "#ef4444");
      }
      return svg(`${agent.name} (L${agent.level})`, `${agent.class} · ${agent.status}`, "#8945ff");
    }

    // /badge/:handle/level.svg
    if (segments.length === 2 && segments[1] === "level") {
      const handle = decodeURIComponent(segments[0]);
      const { data: agents } = await supabase
        .from("agents")
        .select("name, level")
        .eq("name", handle)
        .limit(1);
      const agent = agents?.[0];

      if (!agent) return svg("MEEET", "Not found", "#ef4444");
      return svg(agent.name, `Level ${agent.level}`, "#00bfff");
    }

    // /badge/:handle/quests.svg
    if (segments.length === 2 && segments[1] === "quests") {
      const handle = decodeURIComponent(segments[0]);
      const { data: agents } = await supabase
        .from("agents")
        .select("name, quests_completed")
        .eq("name", handle)
        .limit(1);
      const agent = agents?.[0];

      if (!agent) return svg("MEEET", "Not found", "#ef4444");
      return svg(agent.name, `${agent.quests_completed} quests`, "#00e69d");
    }

    return svg("MEEET State", "Badge API", "#8945ff");
  } catch (e) {
    return svg("MEEET", "Error", "#ef4444");
  }
});
