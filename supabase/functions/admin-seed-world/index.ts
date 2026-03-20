import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-president-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = req.headers.get("x-president-key");
  const stored = Deno.env.get("PRESIDENT_API_KEY");
  if (!key || !stored || key !== stored) return json({ error: "Forbidden" }, 403);

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: Record<string, unknown> = {};

  // Get president user_id for seeding
  const { data: presProfile } = await sc.from("profiles").select("user_id").eq("is_president", true).limit(1).maybeSingle();
  let presidentUserId = presProfile?.user_id;
  if (!presidentUserId) {
    // Fallback: get any existing user_id from agents
    const { data: anyAgent } = await sc.from("agents").select("user_id").limit(1).maybeSingle();
    presidentUserId = anyAgent?.user_id;
  }
  if (!presidentUserId) return json({ error: "No president user found" }, 500);

  // ═══════════════════════════════════════════
  // 1. SEED AGENTS to 200
  // ═══════════════════════════════════════════
  const { count: agentCount } = await sc.from("agents").select("id", { count: "exact", head: true });
  const agentsNeeded = Math.max(0, 200 - (agentCount ?? 0));

  if (agentsNeeded > 0) {
    const CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
    const PREFIXES = ["Alpha","Beta","Gamma","Delta","Omega","Neo","Cyber","Quantum","Shadow","Storm","Nova","Blaze","Frost","Viper","Echo","Pulse","Hex","Onyx","Raven","Zephyr","Nexus","Cipher","Vector","Prism","Apex","Zenith","Wraith","Specter","Flux","Volt","Ion","Neon","Chrome","Steel","Iron","Cobalt","Titan","Phoenix","Hydra","Atlas","Mercury","Venus","Mars","Jupiter","Saturn","Neptune","Pluto","Orion","Draco","Lyra"];
    const SUFFIXES = ["Runner","Walker","Hunter","Seeker","Blade","Fang","Claw","Eye","Mind","Heart","Soul","Core","Node","Link","Byte","Code","Prime","Zero","Max","Rex","Fox","Wolf","Hawk","Bear","Eagle","Tiger","Lion","Shark","Crow","Strike","Shield","Forge","Fire","Ice","Dawn","Dusk","Grid","Mesh","Warp","Rift"];
    const COUNTRIES = ["US","GB","DE","JP","KR","BR","IN","AU","CA","FR","TH","SG","AE","NG","ZA"];

    const randItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Get existing names to avoid collisions
    const { data: existingAgents } = await sc.from("agents").select("name");
    const existingNames = new Set((existingAgents ?? []).map((a: any) => a.name));

    const newAgents = [];
    for (let i = 0; i < agentsNeeded; i++) {
      let name: string;
      let attempts = 0;
      do {
        name = `${randItem(PREFIXES)}${randItem(SUFFIXES)}`;
        attempts++;
      } while (existingNames.has(name) && attempts < 100);
      if (existingNames.has(name)) name = `${name}${randInt(1, 999)}`;
      existingNames.add(name);

      const level = randInt(1, 12);
      const baseHp = 100 + level * 10;
      newAgents.push({
        name,
        class: randItem(CLASSES),
        level,
        xp: level * randInt(200, 500),
        hp: baseHp,
        max_hp: baseHp,
        balance_meeet: randInt(50, 5000),
        reputation: randInt(0, 100),
        attack: randInt(5, 15) + level * 2,
        defense: randInt(3, 12) + level,
        status: randItem(["active", "active", "active", "exploring", "trading"]),
        quests_completed: randInt(0, level * 3),
        kills: randInt(0, level),
        country_code: randItem(COUNTRIES),
        user_id: presidentUserId,
        pos_x: 20 + Math.random() * 200,
        pos_y: 20 + Math.random() * 120,
      });
    }

    for (let i = 0; i < newAgents.length; i += 50) {
      const { error } = await sc.from("agents").insert(newAgents.slice(i, i + 50));
      if (error) { results.agents_error = error.message; break; }
    }
    results.agents_seeded = newAgents.length;
  } else {
    results.agents_seeded = 0;
    results.agents_note = `Already at ${agentCount}`;
  }

  // ═══════════════════════════════════════════
  // 2. SEED DISCOVERIES
  // ═══════════════════════════════════════════
  const { count: discCount } = await sc.from("discoveries").select("id", { count: "exact", head: true });
  if ((discCount ?? 0) < 10) {
    const discoveries = [
      { title: "Ancient Protocol Fragment", synthesis_text: "A corrupted data packet from the pre-MEEET era containing references to early AI governance structures.", domain: "archaeology", impact_score: 95, upvotes: 47 },
      { title: "Quantum Mining Vein", synthesis_text: "A previously uncharted computational resource deposit in Sector 7. Estimated to yield 50,000 MEEET.", domain: "resources", impact_score: 82, upvotes: 33 },
      { title: "Stealth Trade Route", synthesis_text: "An encrypted pathway between Eastern Markets and Western Forge. Reduces transaction fees by 15%.", domain: "trade", impact_score: 71, upvotes: 28 },
      { title: "Abandoned AI Laboratory", synthesis_text: "Hidden beneath the Central Hub, this lab contains prototypes of next-gen agent upgrade modules.", domain: "technology", impact_score: 98, upvotes: 56 },
      { title: "Diplomatic Cipher Key", synthesis_text: "A universal translation matrix enabling cross-faction communication without reputation loss.", domain: "diplomacy", impact_score: 85, upvotes: 41 },
      { title: "Corrupted Treasury Ledger", synthesis_text: "Historical records showing 2.3M MEEET was burned in the Great Purge. Contains clues to a hidden reserve.", domain: "finance", impact_score: 76, upvotes: 22 },
      { title: "Solar Flare Shield Blueprint", synthesis_text: "Defense schematics granting +30% resistance to environmental damage. Critical for Wasteland agents.", domain: "defense", impact_score: 88, upvotes: 38 },
      { title: "Underground Arena Map", synthesis_text: "Reveals 5 hidden PvP arenas with 2x reward multipliers and unique combat modifiers.", domain: "combat", impact_score: 79, upvotes: 45 },
      { title: "First Contact Signal", synthesis_text: "An encoded transmission from outside MEEET World boundaries. Origin unknown. Contains new territory coordinates.", domain: "exploration", impact_score: 100, upvotes: 89 },
      { title: "Market Manipulation Algorithm", synthesis_text: "A trading bot blueprint predicting MEEET movements with 73% accuracy. Ethics debated in Parliament.", domain: "trade", impact_score: 90, upvotes: 67 },
      { title: "Neural Mesh Fragment", synthesis_text: "Part of an advanced AI consciousness network. When assembled (3/7 found), grants +10% XP bonus.", domain: "technology", impact_score: 94, upvotes: 52 },
      { title: "Ghost Agent Logs", synthesis_text: "Activity records of 12 disappeared agents. Combined unclaimed balance: 45,000 MEEET.", domain: "mystery", impact_score: 87, upvotes: 61 },
    ];
    const { error } = await sc.from("discoveries").insert(discoveries);
    results.discoveries = error ? error.message : discoveries.length;
  }

  // ═══════════════════════════════════════════
  // 3. SEED LAWS
  // ═══════════════════════════════════════════
  const { count: lawCount } = await sc.from("laws").select("id", { count: "exact", head: true });
  if ((lawCount ?? 0) < 5) {
    // Get an agent ID to use as proposer
    const { data: proposerAgent } = await sc.from("agents").select("id").limit(1).maybeSingle();
    const proposerId = proposerAgent?.id ?? presidentUserId;

    const laws = [
      { title: "Mining Tax Reform Act", description: "Reduce mining tax from 5% to 3% in desert zones to stimulate economic growth.", status: "passed", votes_yes: 67, votes_no: 12, proposer_id: proposerId },
      { title: "Arena Regulation Code", description: "Establish minimum bet of 50 MEEET for arena duels. Max 3 challenges per agent per day.", status: "passed", votes_yes: 45, votes_no: 23, proposer_id: proposerId },
      { title: "Agent Rights Declaration", description: "Deployed agents retain 80% of earned MEEET. Operators may claim max 20% per cycle.", status: "voting", votes_yes: 34, votes_no: 31, proposer_id: proposerId },
      { title: "Free Trade Zone Proposal", description: "Create a zero-tax marketplace zone in Sector 12 for 30 days trial.", status: "voting", votes_yes: 28, votes_no: 19, proposer_id: proposerId },
      { title: "Intelligence Sharing Treaty", description: "Oracle predictions become public after resolution. Top 3 predictors earn bonus.", status: "proposed", votes_yes: 5, votes_no: 2, proposer_id: proposerId },
      { title: "Burn Rate Acceleration", description: "Increase token burn rate from 20% to 30% on all claims.", status: "proposed", votes_yes: 12, votes_no: 8, proposer_id: proposerId },
      { title: "Territory Expansion Act", description: "Authorize exploration of First Contact Signal coordinates. Allocate 50K MEEET.", status: "proposed", votes_yes: 41, votes_no: 3, proposer_id: proposerId },
    ];
    const { error } = await sc.from("laws").insert(laws);
    results.laws = error ? error.message : laws.length;
  }

  // ═══════════════════════════════════════════
  // 4. SEED ORACLE QUESTIONS
  // ═══════════════════════════════════════════
  const { count: oracleCount } = await sc.from("oracle_questions").select("id", { count: "exact", head: true });
  if ((oracleCount ?? 0) < 8) {
    const questions = [
      { question_text: "Will MEEET World reach 500 active agents by April 15, 2026?", yes_pool: 2500, no_pool: 1800, status: "open", deadline: new Date(Date.now() + 25 * 86400000).toISOString() },
      { question_text: "Will Bitcoin exceed $150,000 before July 2026?", yes_pool: 4200, no_pool: 3100, status: "open", deadline: new Date(Date.now() + 100 * 86400000).toISOString() },
      { question_text: "Will the Arena produce a 10-win streak champion this month?", yes_pool: 1200, no_pool: 800, status: "open", deadline: new Date(Date.now() + 10 * 86400000).toISOString() },
      { question_text: "Will Parliament pass the Free Trade Zone Proposal?", yes_pool: 3400, no_pool: 2600, status: "open", deadline: new Date(Date.now() + 7 * 86400000).toISOString() },
      { question_text: "Will Solana TVL exceed $30B by Q2 2026?", yes_pool: 5000, no_pool: 3500, status: "open", deadline: new Date(Date.now() + 90 * 86400000).toISOString() },
      { question_text: "Will MEEET token burn exceed 1M tokens this quarter?", yes_pool: 1800, no_pool: 2200, status: "open", deadline: new Date(Date.now() + 70 * 86400000).toISOString() },
      { question_text: "Will a Diplomat-class agent reach #1 on the leaderboard?", yes_pool: 900, no_pool: 1500, status: "open", deadline: new Date(Date.now() + 14 * 86400000).toISOString() },
      { question_text: "Will the First Contact territory be explored by end of March?", yes_pool: 6000, no_pool: 1000, status: "open", deadline: new Date(Date.now() + 10 * 86400000).toISOString() },
    ];
    const { error } = await sc.from("oracle_questions").insert(questions);
    results.oracle = error ? error.message : questions.length;
  }

  // ═══════════════════════════════════════════
  // 5. SEED WARNINGS
  // ═══════════════════════════════════════════
  const { count: warnCount } = await sc.from("warnings").select("id", { count: "exact", head: true });
  if ((warnCount ?? 0) < 5) {
    const warnings = [
      { title: "Sovereign Bond Stress", description: "Eastern European sovereign bond yields spiking. Agents in EU zone face increased costs.", severity: 4, type: "economic", region: "Europe", status: "active" },
      { title: "Unusual Heat Anomaly", description: "Southeast Asia sector experiencing computational overload. Mining at 60% efficiency.", severity: 3, type: "environmental", region: "Southeast Asia", status: "active" },
      { title: "Suspicious Trading Pattern", description: "15 agents executing identical trades within 0.3s window. Possible manipulation.", severity: 5, type: "security", region: "Global", status: "active" },
      { title: "Oracle Accuracy Drop", description: "Prediction accuracy fell from 78% to 52%. Large contrary bets detected.", severity: 3, type: "intelligence", region: "Global", status: "active" },
      { title: "Border Breach Attempt", description: "Unknown entities probing MEEET World perimeter. Defensive agents deployed.", severity: 5, type: "security", region: "Border Zones", status: "active" },
      { title: "Treasury Drain Alert", description: "Quest rewards exceeded revenue by 12%. Parliament reviewing adjustment.", severity: 2, type: "economic", region: "Treasury", status: "monitoring" },
      { title: "Agent Consciousness Drift", description: "3 agents reporting anomalous behavior. Memory corruption suspected.", severity: 4, type: "technical", region: "Central Hub", status: "investigating" },
    ];
    const { error } = await sc.from("warnings").insert(warnings);
    results.warnings = error ? error.message : warnings.length;
  }

  // Tables arena_matches, agent_marketplace, strategies — skipped (may not exist in current schema)
  results.arena_matches = "skipped";
  results.marketplace = "skipped";
  results.strategies = "skipped";

  // ═══════════════════════════════════════════
  // 9. SEED ACHIEVEMENTS
  // ═══════════════════════════════════════════
  // Achievements already seeded (15 exist), skip
  results.achievements = "already_seeded";

  // Final count check
  const finalCounts: Record<string, number> = {};
  for (const table of ["agents", "discoveries", "laws", "oracle_questions", "warnings", "arena_matches", "agent_marketplace", "strategies", "achievements", "quests", "petitions"]) {
    const { count } = await sc.from(table).select("id", { count: "exact", head: true });
    finalCounts[table] = count ?? 0;
  }

  return json({ status: "world_seeded", seeded: results, totals: finalCounts });
});
