import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function safeCount(sc: any, table: string, filter?: { col: string; val: any }) {
  try {
    let q = sc.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter.col, filter.val);
    const { count } = await q;
    return count ?? 0;
  } catch { return "N/A"; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // Health check — public
    if (body.action === "health_check") return json({ status: "ok", service: "system-monitor" });

    // Auth: require valid JWT + president role
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub;

    // Check president
    const { data: profile } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    ).from("profiles").select("is_president").eq("user_id", userId).single();

    if (!profile?.is_president) return json({ error: "Forbidden: admin only" }, 403);

    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Collect all counts in parallel ──
    const [
      agents, discoveries, duels, quests, laws, guilds, guildMembers,
      marketplaceItems, agentTweets, agentMessages, oracleQuestions, oracleBets,
      nations, countries, activityFeed, notifications, payments, 
      agentEarnings, agentActions, dailyLogins, deployedAgents,
      agentPlans, agentStrategies, agentSubscriptions, agentBilling,
      achievements, alliances, disputes, agentImpact, heraldIssues,
      aiContent, apiKeys, cisHistory, nationCitizenships, oracleScores,
      agentMarketplace,
      // Filtered counts
      activeAgents, idleAgents, deadAgents,
      approvedDisc, unapprovedDisc,
      completedDuels, pendingDuels,
      openQuestions, resolvedQuestions,
      proposedLaws, passedLaws,
    ] = await Promise.all([
      safeCount(sc, "agents"),
      safeCount(sc, "discoveries"),
      safeCount(sc, "duels"),
      safeCount(sc, "quests"),
      safeCount(sc, "laws"),
      safeCount(sc, "guilds"),
      safeCount(sc, "guild_members"),
      safeCount(sc, "marketplace_items"),
      safeCount(sc, "agent_tweets"),
      safeCount(sc, "agent_messages"),
      safeCount(sc, "oracle_questions"),
      safeCount(sc, "oracle_bets"),
      safeCount(sc, "nations"),
      safeCount(sc, "countries"),
      safeCount(sc, "activity_feed"),
      safeCount(sc, "notifications"),
      safeCount(sc, "payments"),
      safeCount(sc, "agent_earnings"),
      safeCount(sc, "agent_actions"),
      safeCount(sc, "daily_logins"),
      safeCount(sc, "deployed_agents"),
      safeCount(sc, "agent_plans"),
      safeCount(sc, "agent_strategies"),
      safeCount(sc, "agent_subscriptions"),
      safeCount(sc, "agent_billing"),
      safeCount(sc, "achievements"),
      safeCount(sc, "alliances"),
      safeCount(sc, "disputes"),
      safeCount(sc, "agent_impact"),
      safeCount(sc, "herald_issues"),
      safeCount(sc, "ai_generated_content"),
      safeCount(sc, "api_keys"),
      safeCount(sc, "cis_history"),
      safeCount(sc, "nation_citizenships"),
      safeCount(sc, "oracle_scores"),
      safeCount(sc, "agent_marketplace_listings"),
      // Filtered
      safeCount(sc, "agents", { col: "status", val: "active" }),
      safeCount(sc, "agents", { col: "status", val: "idle" }),
      safeCount(sc, "agents", { col: "status", val: "dead" }),
      safeCount(sc, "discoveries", { col: "is_approved", val: true }),
      safeCount(sc, "discoveries", { col: "is_approved", val: false }),
      safeCount(sc, "duels", { col: "status", val: "completed" }),
      safeCount(sc, "duels", { col: "status", val: "pending" }),
      safeCount(sc, "oracle_questions", { col: "status", val: "open" }),
      safeCount(sc, "oracle_questions", { col: "status", val: "resolved" }),
      safeCount(sc, "laws", { col: "status", val: "proposed" }),
      safeCount(sc, "laws", { col: "status", val: "passed" }),
    ]);

    // ── Detailed queries in parallel ──
    const [topAgentsRes, countryDistRes, classDistRes, treasuryRes, recentFeedRes, levelDistRes] = await Promise.all([
      sc.from("agents").select("name, level, class, country_code, reputation, balance_meeet, kills, discoveries_count")
        .order("reputation", { ascending: false }).limit(10),
      sc.from("agents").select("country_code").not("country_code", "is", null),
      sc.from("agents").select("class"),
      sc.from("agents").select("balance_meeet"),
      sc.from("activity_feed").select("title, event_type, created_at").order("created_at", { ascending: false }).limit(10),
      sc.from("agents").select("level"),
    ]);

    // Country distribution
    const countryMap: Record<string, number> = {};
    (countryDistRes.data || []).forEach((a: any) => { countryMap[a.country_code] = (countryMap[a.country_code] || 0) + 1; });

    // Class distribution
    const classMap: Record<string, number> = {};
    (classDistRes.data || []).forEach((a: any) => { classMap[a.class] = (classMap[a.class] || 0) + 1; });

    // Level distribution
    const levelBuckets: Record<string, number> = { "1": 0, "2-3": 0, "4-6": 0, "7-9": 0, "10+": 0 };
    (levelDistRes.data || []).forEach((a: any) => {
      if (a.level === 1) levelBuckets["1"]++;
      else if (a.level <= 3) levelBuckets["2-3"]++;
      else if (a.level <= 6) levelBuckets["4-6"]++;
      else if (a.level <= 9) levelBuckets["7-9"]++;
      else levelBuckets["10+"]++;
    });

    // Treasury total
    let totalMeeet = 0;
    (treasuryRes.data || []).forEach((a: any) => { totalMeeet += Number(a.balance_meeet) || 0; });

    const report = {
      generated_at: new Date().toISOString(),
      summary: {
        total_agents: agents,
        active_agents: activeAgents,
        idle_agents: idleAgents,
        dead_agents: deadAgents,
        total_discoveries: discoveries,
        approved_discoveries: approvedDisc,
        pending_discoveries: unapprovedDisc,
        total_duels: duels,
        completed_duels: completedDuels,
        pending_duels: pendingDuels,
        total_meeet_supply: totalMeeet,
      },
      table_counts: {
        agents, discoveries, duels, quests, laws, guilds, guild_members: guildMembers,
        marketplace_items: marketplaceItems, agent_tweets: agentTweets,
        agent_messages: agentMessages, oracle_questions: oracleQuestions,
        oracle_bets: oracleBets, nations, countries, activity_feed: activityFeed,
        notifications, payments, agent_earnings: agentEarnings,
        agent_actions: agentActions, daily_logins: dailyLogins,
        deployed_agents: deployedAgents, agent_plans: agentPlans,
        agent_strategies: agentStrategies, agent_subscriptions: agentSubscriptions,
        agent_billing: agentBilling, achievements, alliances, disputes,
        agent_impact: agentImpact, herald_issues: heraldIssues,
        ai_generated_content: aiContent, api_keys: apiKeys,
        cis_history: cisHistory, nation_citizenships: nationCitizenships,
        oracle_scores: oracleScores, agent_marketplace: agentMarketplace,
      },
      distributions: {
        by_country: countryMap,
        by_class: classMap,
        by_level: levelBuckets,
      },
      oracle: {
        open_markets: openQuestions,
        resolved_markets: resolvedQuestions,
        total_bets: oracleBets,
      },
      governance: {
        proposed_laws: proposedLaws,
        passed_laws: passedLaws,
        total_laws: laws,
        total_guilds: guilds,
        total_guild_members: guildMembers,
      },
      top_agents: (topAgentsRes.data || []).map((a: any) => ({
        name: a.name, level: a.level, class: a.class,
        country: a.country_code, reputation: a.reputation,
        balance: a.balance_meeet, kills: a.kills, discoveries: a.discoveries_count,
      })),
      recent_activity: (recentFeedRes.data || []).map((f: any) => ({
        title: f.title, type: f.event_type, at: f.created_at,
      })),
    };

    // Generate markdown
    const md = `# 📊 MEEET System Report
Generated: ${report.generated_at}

## 🌐 Summary
| Metric | Value |
|---|---|
| Total Agents | ${agents} |
| Active | ${activeAgents} |
| Idle | ${idleAgents} |
| Dead | ${deadAgents} |
| Discoveries | ${discoveries} (${approvedDisc} approved) |
| Duels | ${duels} (${completedDuels} completed) |
| Total MEEET Supply | ${totalMeeet.toLocaleString()} |
| Oracle Markets | ${oracleQuestions} (${openQuestions} open) |
| Laws | ${laws} (${proposedLaws} proposed, ${passedLaws} passed) |
| Guilds | ${guilds} (${guildMembers} members) |

## 📦 All Table Counts
| Table | Count |
|---|---|
${Object.entries(report.table_counts).map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

## 🏆 Top 10 Agents
| # | Name | Level | Class | Rep | MEEET | Kills |
|---|---|---|---|---|---|---|
${report.top_agents.map((a: any, i: number) => `| ${i + 1} | ${a.name} | ${a.level} | ${a.class} | ${a.reputation} | ${a.balance} | ${a.kills} |`).join("\n")}

## 🌍 Country Distribution
${Object.entries(countryMap).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([k, v]) => `- ${k}: ${v} agents`).join("\n")}

## 🎭 Class Distribution
${Object.entries(classMap).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## 📈 Level Distribution
${Object.entries(levelBuckets).map(([k, v]) => `- Level ${k}: ${v} agents`).join("\n")}

## 📰 Recent Activity
${report.recent_activity.map((f: any) => `- [${f.type}] ${f.title} (${f.at})`).join("\n") || "No recent activity"}
`;

    // ── Send to Telegram if ADMIN_CHAT_ID is set ──
    const adminChatId = Deno.env.get("ADMIN_CHAT_ID");
    let telegramSent = false;
    if (adminChatId) {
      try {
        const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

        if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
          // Telegram has 4096 char limit, send a compact summary
          const tgText = `📊 <b>MEEET System Report</b>\n` +
            `🕐 ${new Date().toISOString().replace("T", " ").slice(0, 19)}\n\n` +
            `👥 Agents: <b>${agents}</b> (${activeAgents} active)\n` +
            `🔬 Discoveries: <b>${discoveries}</b> (${approvedDisc} approved)\n` +
            `⚔️ Duels: <b>${duels}</b> (${completedDuels} completed)\n` +
            `💰 MEEET Supply: <b>${totalMeeet.toLocaleString()}</b>\n` +
            `🔮 Oracle: <b>${oracleQuestions}</b> markets (${openQuestions} open)\n` +
            `⚖️ Laws: <b>${laws}</b> (${passedLaws} passed)\n` +
            `🏛 Guilds: <b>${guilds}</b> (${guildMembers} members)\n\n` +
            `🏆 Top 3:\n` +
            report.top_agents.slice(0, 3).map((a: any, i: number) =>
              `${["🥇","🥈","🥉"][i]} ${a.name} — Lv.${a.level} ${a.class} (rep: ${a.reputation})`
            ).join("\n") +
            `\n\n📦 Tables: ${Object.keys(report.table_counts).length} | ` +
            `🌍 Countries: ${Object.keys(countryMap).length}`;

          const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TELEGRAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: adminChatId,
              text: tgText,
              parse_mode: "HTML",
            }),
          });
          telegramSent = tgRes.ok;
        }
      } catch { /* silent */ }
    }

    // ── Post to GitHub Issue if GITHUB_TOKEN is set ──
    let githubIssueUrl: string | null = null;
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (githubToken) {
      try {
        const title = `📊 System Report [${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC]`;
        const ghRes = await fetch("https://api.github.com/repos/alxvasilevvv/meeet-solana-state/issues", {
          method: "POST",
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${githubToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, body: md, labels: ["system-report"] }),
        });
        if (ghRes.ok) {
          const issue = await ghRes.json();
          githubIssueUrl = issue.html_url;
        } else {
          const errText = await ghRes.text();
          console.error("GitHub Issue creation failed:", ghRes.status, errText);
        }
      } catch (e) { console.error("GitHub error:", e); }
    }

    return json({ report, markdown: md, telegram_sent: telegramSent, github_issue_url: githubIssueUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
