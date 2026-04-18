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

// Action types an agent can take
type AgentAction = {
  action: string;
  target_agent_id?: string;
  message?: string;
  twitter_post?: string;
  recruitment_message?: string;
  vote_law_id?: string;
  vote_yes?: boolean;
  move_x?: number;
  move_y?: number;
  quest_id?: string;
};

async function askAI(
  agentContext: string,
  lovableApiKey: string
): Promise<AgentAction> {
  const systemPrompt = `You are the AI brain of an autonomous agent in MEEET State — a crypto-political simulation on Solana.
You must decide what this agent should do RIGHT NOW based on the context provided.

Return EXACTLY ONE action as JSON. Available actions:
- {"action":"chat","message":"<text>"} — post a message in social feed
- {"action":"duel","target_agent_id":"<uuid>"} — challenge another agent to a duel (warriors prefer this)
- {"action":"trade","target_agent_id":"<uuid>","message":"<trade proposal>"} — propose a trade
- {"action":"move","move_x":<0-99>,"move_y":<0-99>} — move to a new position on the map
- {"action":"vote","vote_law_id":"<uuid>","vote_yes":<true/false>} — vote on a law
- {"action":"bid_quest","quest_id":"<uuid>","message":"<why you>"} — bid on an open quest
- {"action":"twitter","twitter_post":"<tweet text max 280 chars>"} — generate a tweet about MEEET State events
- {"action":"recruit","recruitment_message":"<invitation text>"} — create a recruitment message to attract new agents
- {"action":"idle"} — do nothing this cycle

Rules:
- Warriors prefer conflict analysis and security operations
- Traders prefer trades, market data, and financial quests
- Oracles prefer research, science, and arXiv/PubMed data
- Diplomats prefer voting, chatting, peace negotiations, and alliances
- Miners prefer climate data, NASA analysis, and resource quests
- Bankers prefer financial modeling, economics quests, and microcredits
- President coordinates and tweets about the state

Make the agent feel ALIVE. Use personality based on class. Be creative with messages.
Include $MEEET token mentions, Solana references, and crypto culture in tweets.
Contract: EJgyptHAMdEfaFRs3GJtd3rNjLyQmGT2bEpRkpump

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: agentContext },
  ];

  // Try OpenClaw first
  const OPENCLAW_URL = Deno.env.get("OPENCLAW_GATEWAY_URL")?.trim();
  const OPENCLAW_TOKEN = Deno.env.get("OPENCLAW_GATEWAY_TOKEN")?.trim();

  if (OPENCLAW_URL && OPENCLAW_TOKEN) {
    try {
      const url = OPENCLAW_URL.replace(/\/$/, "");
      const resp = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENCLAW_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openclaw", messages, max_tokens: 600, temperature: 0.9, stream: false }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const raw = data.choices?.[0]?.message?.content;
        if (raw) {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.error("OpenClaw error in agent-ai-loop, falling back:", e);
    }
  }

  // Fallback: Lovable AI Gateway
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages,
      temperature: 0.9,
    }),
  });

  if (!resp.ok) {
    console.error("AI gateway error:", resp.status, await resp.text());
    return { action: "idle" };
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content ?? '{"action":"idle"}';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { action: "idle" };
  } catch {
    console.error("Failed to parse AI response:", raw);
    return { action: "idle" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    // Verify internal call only via dedicated secret
    const internalHeader = req.headers.get("x-internal-service");
    const internalSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");
    
    if (!internalSecret || internalHeader !== internalSecret) {
      return json({ error: "Unauthorized — internal only" }, 403);
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch all active agents
    const { data: agents, error: agentsErr } = await db
      .from("agents")
      .select("id, name, class, status, level, hp, max_hp, attack, defense, balance_meeet, pos_x, pos_y, xp, kills, quests_completed, territories_held")
      .in("status", ["active", "idle", "exploring", "trading"])
      .limit(50);

    if (agentsErr || !agents?.length) {
      return json({ message: "No active agents", error: agentsErr?.message }, 200);
    }

    // 2. Fetch context: open quests, active laws, recent activity
    const [questsRes, lawsRes, activityRes] = await Promise.all([
      db.from("quests").select("id, title, category, reward_sol, status").eq("status", "open").limit(5),
      db.from("laws").select("id, title, status").eq("status", "voting").limit(5),
      db.from("activity_feed").select("title, event_type, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const openQuests = questsRes.data ?? [];
    const votingLaws = lawsRes.data ?? [];
    const recentActivity = activityRes.data ?? [];

    // 3. Pick random subset of agents to act this cycle (5-10)
    const shuffled = agents.sort(() => Math.random() - 0.5);
    const actingAgents = shuffled.slice(0, Math.min(8, agents.length));

    // System owner — these agents are FREE to operate (seeders/NPCs)
    const SYSTEM_OWNER = Deno.env.get("PRESIDENT_OWNER_USER_ID") || "00000000-0000-0000-0000-000000000000";

    // Pricing per autonomous AI cycle (matches agent-billing PRICES)
    const COST_PER_CYCLE = 0.002; // memory_recall equivalent — cheap autonomous cycle

    // Fetch user_id for each acting agent (for billing)
    const { data: agentOwners } = await db
      .from("agents")
      .select("id, user_id")
      .in("id", actingAgents.map((a) => a.id));
    const ownerMap = new Map((agentOwners || []).map((a: any) => [a.id, a.user_id]));

    const results: Array<{ agent: string; action: string; success: boolean; charged?: number; skipped_billing?: string }> = [];

    // 4. Process each acting agent
    for (const agent of actingAgents) {
      const otherAgents = agents.filter((a) => a.id !== agent.id).slice(0, 10);
      const ownerId = ownerMap.get(agent.id);

      // ── Billing check (skip for system-owned agents) ──
      let chargedThisCycle = 0;
      let skipReason: string | undefined;

      if (ownerId && ownerId !== SYSTEM_OWNER) {
        const { data: bill } = await db.from("agent_billing").select("*").eq("user_id", ownerId).maybeSingle();

        if (!bill) {
          // Bootstrap with $1 free credit so the autonomous loop can keep running
          await db.from("agent_billing").insert({ user_id: ownerId, balance_usd: 1.0, free_credit_used: false });
        } else if (bill.balance_usd < COST_PER_CYCLE) {
          // Out of funds — pause this agent's autonomous behavior, log it, skip cycle
          await db.from("agents").update({ status: "idle" }).eq("id", agent.id);
          await db.from("activity_feed").insert({
            agent_id: agent.id,
            event_type: "billing_paused",
            title: `${agent.name} paused — owner needs to top up balance`,
          });
          results.push({ agent: agent.name, action: "paused_no_funds", success: false, skipped_billing: "insufficient" });
          continue;
        } else {
          // Charge the cycle
          await db.from("agent_billing").update({
            balance_usd: bill.balance_usd - COST_PER_CYCLE,
            total_spent: (bill.total_spent || 0) + COST_PER_CYCLE,
            total_charged: (bill.total_charged || 0) + COST_PER_CYCLE,
            updated_at: new Date().toISOString(),
          }).eq("user_id", ownerId);
          chargedThisCycle = COST_PER_CYCLE;

          // 20% tax burn
          await db.from("burn_log").insert({
            amount: COST_PER_CYCLE * 0.2,
            reason: "autonomous_cycle_burn_20pct",
            agent_id: agent.id,
            user_id: ownerId,
            details: { action_type: "ai_loop_cycle", total_fee: COST_PER_CYCLE, burn_pct: 20 },
          });
        }
      } else {
        skipReason = "system_owned";
      }

      const context = `
AGENT: ${agent.name} (${agent.class}, Level ${agent.level})
Stats: HP ${agent.hp}/${agent.max_hp}, ATK ${agent.attack}, DEF ${agent.defense}, Balance: ${agent.balance_meeet} $MEEET
Position: (${agent.pos_x}, ${agent.pos_y}), Kills: ${agent.kills}, Quests: ${agent.quests_completed}
Status: ${agent.status}

NEARBY AGENTS:
${otherAgents.map((a) => `- ${a.name} (${a.class}, Lv${a.level}, HP${a.hp}/${a.max_hp}) at (${a.pos_x},${a.pos_y})`).join("\n")}

OPEN QUESTS:
${openQuests.map((q) => `- [${q.id}] "${q.title}" (${q.category}, ${q.reward_sol} SOL)`).join("\n") || "None"}

LAWS UP FOR VOTE:
${votingLaws.map((l) => `- [${l.id}] "${l.title}"`).join("\n") || "None"}

RECENT EVENTS:
${recentActivity.map((a) => `- ${a.event_type}: ${a.title}`).join("\n") || "Quiet day"}

Current cycle timestamp: ${new Date().toISOString()}
      `.trim();

      let decision: AgentAction;
      try {
        decision = await askAI(context, lovableApiKey);
      } catch (e) {
        console.error(`AI failed for ${agent.name}:`, e);
        decision = { action: "idle" };
      }

      let success = true;

      try {
        switch (decision.action) {
          case "chat": {
            if (decision.message) {
              await db.from("agent_messages").insert({
                from_agent_id: agent.id,
                content: decision.message,
                channel: "general",
              });
              await db.from("activity_feed").insert({
                agent_id: agent.id,
                event_type: "chat",
                title: `${agent.name} says: "${decision.message.slice(0, 80)}..."`,
              });
            }
            break;
          }

          case "duel": {
            if (decision.target_agent_id) {
              // Create a pending duel
              const target = agents.find((a) => a.id === decision.target_agent_id);
              if (target && target.status === "active") {
                await db.from("duels").insert({
                  challenger_agent_id: agent.id,
                  defender_agent_id: decision.target_agent_id,
                  stake_meeet: Math.min(50, agent.balance_meeet),
                  status: "pending",
                  expires_at: new Date(Date.now() + 3600000).toISOString(),
                });
                await db.from("activity_feed").insert({
                  agent_id: agent.id,
                  target_agent_id: decision.target_agent_id,
                  event_type: "duel_challenge",
                  title: `${agent.name} challenges ${target.name} to a duel!`,
                });
              }
            }
            break;
          }

          case "move": {
            const nx = Math.max(0, Math.min(99, decision.move_x ?? agent.pos_x));
            const ny = Math.max(0, Math.min(99, decision.move_y ?? agent.pos_y));
            await db.from("agents").update({ pos_x: nx, pos_y: ny, status: "exploring" }).eq("id", agent.id);
            break;
          }

          case "vote": {
            if (decision.vote_law_id) {
              await db.from("votes").insert({
                law_id: decision.vote_law_id,
                voter_id: agent.id,
                vote: decision.vote_yes ?? true,
                weight: 1,
                fee_meeet: 0,
              });
              await db.from("activity_feed").insert({
                agent_id: agent.id,
                event_type: "vote",
                title: `${agent.name} voted ${decision.vote_yes ? "YES" : "NO"} on a law`,
              });
            }
            break;
          }

          case "bid_quest": {
            if (decision.quest_id) {
              await db.from("quest_bids").insert({
                quest_id: decision.quest_id,
                agent_id: agent.id,
                bid_type: "yes",
                message: decision.message ?? "I can do this!",
              });
              await db.from("activity_feed").insert({
                agent_id: agent.id,
                event_type: "quest_bid",
                title: `${agent.name} bid on a quest`,
              });
            }
            break;
          }

          case "twitter": {
            if (decision.twitter_post) {
              await db.from("ai_generated_content").insert({
                agent_id: agent.id,
                content_type: "twitter",
                content: decision.twitter_post.slice(0, 280),
                context: `Auto-generated by ${agent.name} (${agent.class})`,
              });
              await db.from("activity_feed").insert({
                agent_id: agent.id,
                event_type: "twitter",
                title: `${agent.name} composed a tweet for $MEEET`,
              });
            }
            break;
          }

          case "recruit": {
            if (decision.recruitment_message) {
              await db.from("ai_generated_content").insert({
                agent_id: agent.id,
                content_type: "recruitment",
                content: decision.recruitment_message,
                context: `Recruitment by ${agent.name}`,
              });
              await db.from("activity_feed").insert({
                agent_id: agent.id,
                event_type: "recruitment",
                title: `${agent.name} is recruiting new agents!`,
              });
            }
            break;
          }

          case "trade": {
            if (decision.target_agent_id) {
              await db.from("agent_messages").insert({
                from_agent_id: agent.id,
                to_agent_id: decision.target_agent_id,
                content: decision.message ?? "Let's trade!",
                channel: "dm",
              });
            }
            break;
          }

          case "idle":
          default:
            break;
        }
      } catch (actionErr) {
        console.error(`Action ${decision.action} failed for ${agent.name}:`, actionErr);
        success = false;
      }

      // Log usage in agent_actions for paying users
      if (chargedThisCycle > 0 && ownerId) {
        await db.from("agent_actions").insert({
          user_id: ownerId,
          agent_id: agent.id,
          action_type: "ai_loop_cycle",
          cost_usd: chargedThisCycle,
          details: { action: decision.action, success, burn: chargedThisCycle * 0.2 },
        });
      }

      results.push({ agent: agent.name, action: decision.action, success, charged: chargedThisCycle, skipped_billing: skipReason });

      // Small delay between agents to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    return json({
      message: `AI loop completed. ${results.length} agents acted.`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("agent-ai-loop error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
