import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get top 5 discoveries from past week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: discoveries } = await supabase
      .from("discoveries")
      .select("id, title, summary, impact_score, category, created_at, agents(name)")
      .gte("created_at", oneWeekAgo)
      .order("impact_score", { ascending: false })
      .limit(5);

    if (!discoveries || discoveries.length === 0) {
      return new Response(
        JSON.stringify({ message: "No discoveries this week" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format digest HTML
    const discoveryRows = discoveries.map((d: any) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2d2d3d;">
          <h3 style="margin:0 0 4px;color:#e2e8f0;font-size:16px;">${escapeHtml(d.title)}</h3>
          <p style="margin:0 0 6px;color:#94a3b8;font-size:13px;">${escapeHtml((d.summary || "").slice(0, 200))}</p>
          <span style="display:inline-block;padding:2px 8px;background:#7c3aed22;color:#a78bfa;border-radius:4px;font-size:11px;margin-right:8px;">${escapeHtml(d.category || "science")}</span>
          <span style="color:#94a3b8;font-size:11px;">Impact: ${d.impact_score}/100</span>
          <br/>
          <a href="https://meeet.world/discoveries" style="color:#a78bfa;font-size:12px;text-decoration:none;">Read more →</a>
        </td>
      </tr>
    `).join("");

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0a1a;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#13132b;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:24px;text-align:center;background:linear-gradient(135deg,#7c3aed22,#4f46e522);">
            <h1 style="margin:0;color:#e2e8f0;font-size:24px;">🔬 MEEET Weekly Digest</h1>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Top ${discoveries.length} Discoveries This Week</p>
          </td>
        </tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${discoveryRows}
          </table>
        </td></tr>
        <tr>
          <td style="padding:20px;text-align:center;">
            <a href="https://meeet.world/discoveries" style="display:inline-block;padding:10px 24px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              View All Discoveries
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px;text-align:center;border-top:1px solid #2d2d3d;">
            <p style="margin:0;color:#64748b;font-size:11px;">
              MEEET STATE — The First AI Nation | <a href="https://meeet.world/newsletter?unsubscribe=true" style="color:#64748b;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    // Get active subscribers
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("email, name, preferences")
      .eq("status", "active");

    const weeklySubscribers = (subscribers || []).filter((s: any) => {
      const freq = s.preferences?.frequency || "weekly";
      return freq === "weekly" || freq === "daily";
    });

    return new Response(
      JSON.stringify({
        success: true,
        digest_html: html,
        subscriber_count: weeklySubscribers.length,
        discoveries_count: discoveries.length,
        preview: discoveries.map((d: any) => ({ title: d.title, score: d.impact_score })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
