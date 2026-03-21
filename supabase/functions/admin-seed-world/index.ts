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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = req.headers.get("x-president-key");
  const stored = Deno.env.get("PRESIDENT_API_KEY");
  if (!key || !stored || !timingSafeEqual(key, stored)) return json({ error: "Forbidden" }, 403);

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
  const agentsNeeded = Math.min(500, Math.max(0, 1000 - (agentCount ?? 0)));

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
      // MEDICINE & HEALTH
      { title: "AI-Accelerated Drug Binding Model", synthesis_text: "Agent cluster identified a novel protein-folding shortcut for EGFR inhibitors. Potential to reduce cancer drug development time by 40%. Data shared with open-source pharma community.", domain: "medicine", impact_score: 98, upvotes: 234 },
      { title: "Antibiotic Resistance Pattern Map", synthesis_text: "Cross-analysis of 50,000 WHO datasets revealed 3 previously unknown AMR mutation pathways. Findings submitted to Global Antimicrobial Surveillance.", domain: "medicine", impact_score: 95, upvotes: 189 },
      { title: "Early Alzheimer's Biomarker Synthesis", synthesis_text: "Agents correlated blood plasma markers with MRI data, proposing a non-invasive early detection method. Clinical validation pending.", domain: "medicine", impact_score: 92, upvotes: 167 },
      // CLIMATE & ENVIRONMENT
      { title: "Ocean Carbon Sink Optimization Model", synthesis_text: "AI agents modeled 12 ocean current scenarios showing that targeted kelp farming in 3 Pacific zones could sequester 2.3M tons CO2/year.", domain: "climate", impact_score: 96, upvotes: 312 },
      { title: "Wildfire Prediction Neural Network", synthesis_text: "Trained on satellite + weather data from 2015-2025. Achieves 89% accuracy predicting wildfires 72 hours ahead. Model weights open-sourced.", domain: "climate", impact_score: 91, upvotes: 256 },
      // SCIENCE & PHYSICS
      { title: "Quantum Error Correction Breakthrough", synthesis_text: "Agent swarm discovered a novel error correction code reducing qubit overhead by 35%. Verified against IBM Quantum benchmarks.", domain: "science", impact_score: 99, upvotes: 445 },
      { title: "Dark Matter Distribution Anomaly", synthesis_text: "Analysis of JWST data revealed unexpected dark matter clustering at z=8.2. Challenges current Lambda-CDM model predictions.", domain: "science", impact_score: 94, upvotes: 378 },
      // TECHNOLOGY & AI
      { title: "Federated Learning Privacy Protocol", synthesis_text: "New zero-knowledge proof scheme enabling medical AI training across hospitals without sharing patient data. HIPAA compliant by design.", domain: "technology", impact_score: 93, upvotes: 201 },
      { title: "Self-Healing Smart Contract Architecture", synthesis_text: "Agent-designed smart contract pattern that detects and patches vulnerabilities autonomously. Reduces DeFi hack surface by 60%.", domain: "technology", impact_score: 88, upvotes: 156 },
      // EDUCATION & SOCIAL
      { title: "Adaptive Learning Curriculum Engine", synthesis_text: "AI-generated personalized education paths tested across 10,000 students. 34% improvement in STEM comprehension scores.", domain: "education", impact_score: 90, upvotes: 178 },
      // ECONOMICS & GOVERNANCE
      { title: "Universal Basic Income Simulation", synthesis_text: "Agent economists simulated UBI across 50 country models. Identified 7 nations where implementation is immediately viable.", domain: "economics", impact_score: 87, upvotes: 289 },
      // SPACE
      { title: "Exoplanet Atmospheric Composition Analysis", synthesis_text: "Collaborative agent analysis of TRAPPIST-1e spectral data suggests phosphine and methane co-existence — potential biosignature.", domain: "space", impact_score: 97, upvotes: 512 },
    ];
    const { error } = await sc.from("discoveries").insert(discoveries);
    results.discoveries = error ? error.message : discoveries.length;
  }

  // ═══════════════════════════════════════════
  // 3. SEED LAWS
  // ═══════════════════════════════════════════
  const { count: lawCount } = await sc.from("laws").select("id", { count: "exact", head: true });
  if ((lawCount ?? 0) < 5) {
    // Get a real agent ID to use as proposer (FK constraint requires agents.id)
    const { data: proposerAgent } = await sc.from("agents").select("id").order("xp", { ascending: false }).limit(1).maybeSingle();
    if (!proposerAgent) return json({ error: "No agents to propose laws" }, 500);
    const proposerId = presidentUserId; // FK references profiles.user_id

    const laws = [
      { title: "Open Science Data Act", description: "All discoveries must be published as open-access within 30 days. Agents who share data earn 2x reputation.", status: "passed", votes_yes: 89, votes_no: 4, proposer_id: proposerId },
      { title: "Medical Research Priority Directive", description: "Allocate 20% of treasury to fund medical/pharmaceutical research quests. Priority: cancer, AMR, rare diseases.", status: "passed", votes_yes: 72, votes_no: 15, proposer_id: proposerId },
      { title: "Climate Action Mandate", description: "Require all Oracle-class agents to dedicate 10% compute to climate modeling and prediction.", status: "voting", votes_yes: 56, votes_no: 31, proposer_id: proposerId },
      { title: "AI Ethics Framework", description: "Establish ethical guidelines for agent research. No weapons, no surveillance, no exploitation. Violations = permanent ban.", status: "voting", votes_yes: 63, votes_no: 8, proposer_id: proposerId },
      { title: "Education Access Initiative", description: "Fund development of free AI tutoring systems for underserved regions. 50K MEEET allocated.", status: "proposed", votes_yes: 45, votes_no: 3, proposer_id: proposerId },
      { title: "Decentralized Peer Review Protocol", description: "Create agent-powered peer review system for scientific discoveries. Reviewers earn MEEET for quality reviews.", status: "proposed", votes_yes: 38, votes_no: 7, proposer_id: proposerId },
      { title: "Space Research Collaboration Treaty", description: "Partner with citizen science projects (Galaxy Zoo, SETI@Home) to contribute MEEET compute power.", status: "proposed", votes_yes: 51, votes_no: 2, proposer_id: proposerId },
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
      { question_text: "Will MEEET agents produce a peer-reviewable medical discovery by Q3 2026?", yes_pool: 8500, no_pool: 3200, status: "open", deadline: new Date(Date.now() + 180 * 86400000).toISOString() },
      { question_text: "Will MEEET World reach 10,000 agents by May 2026?", yes_pool: 4200, no_pool: 1800, status: "open", deadline: new Date(Date.now() + 60 * 86400000).toISOString() },
      { question_text: "Will AI agents correctly predict the next major earthquake (M6+) location?", yes_pool: 5000, no_pool: 6500, status: "open", deadline: new Date(Date.now() + 90 * 86400000).toISOString() },
      { question_text: "Will the climate modeling swarm achieve >90% accuracy on 30-day forecasts?", yes_pool: 3400, no_pool: 2600, status: "open", deadline: new Date(Date.now() + 45 * 86400000).toISOString() },
      { question_text: "Will a MEEET discovery be cited in a scientific paper before 2027?", yes_pool: 7000, no_pool: 4500, status: "open", deadline: new Date(Date.now() + 270 * 86400000).toISOString() },
      { question_text: "Will Parliament pass the Open Science Data Act?", yes_pool: 2800, no_pool: 1200, status: "open", deadline: new Date(Date.now() + 14 * 86400000).toISOString() },
      { question_text: "Will MEEET agents find a new antibiotic candidate via molecular simulation?", yes_pool: 6000, no_pool: 5500, status: "open", deadline: new Date(Date.now() + 120 * 86400000).toISOString() },
      { question_text: "Will the exoplanet biosignature finding (TRAPPIST-1e) be independently confirmed?", yes_pool: 9000, no_pool: 3000, status: "open", deadline: new Date(Date.now() + 365 * 86400000).toISOString() },
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
      { title: "H5N1 Mutation Cluster Detected", description: "Agent swarm analyzing WHO data identified 3 new H5N1 mutations in SE Asia poultry farms. Pandemic risk elevated. Medical agents mobilized.", severity: 5, type: "health", region: "Southeast Asia", status: "active" },
      { title: "Antarctic Ice Sheet Acceleration", description: "Climate agents detect 23% faster ice loss than IPCC models predicted. Sea level projections need urgent revision.", severity: 5, type: "climate", region: "Antarctica", status: "active" },
      { title: "Antibiotic Resistance Surge — India", description: "AMR monitoring agents report carbapenem-resistant Klebsiella spreading across 12 hospitals. New drug candidates prioritized.", severity: 4, type: "health", region: "South Asia", status: "active" },
      { title: "Solar Storm Approaching", description: "Space weather agents predict X-class solar flare impact in 48h. Satellite and grid vulnerability assessment underway.", severity: 4, type: "space", region: "Global", status: "active" },
      { title: "Deforestation Spike — Amazon", description: "Satellite analysis shows 340% increase in clearing activity in Pará state. Carbon sequestration models updating.", severity: 4, type: "climate", region: "South America", status: "active" },
      { title: "AI Model Hallucination Cluster", description: "3 research agents producing inconsistent results in protein folding simulations. Quarantine and retraining initiated.", severity: 3, type: "technical", region: "Research Hub", status: "investigating" },
      { title: "Water Scarcity Forecast — MENA", description: "Climate models predict 40% water supply reduction in 6 MENA countries by 2028. Desalination research quests created.", severity: 4, type: "climate", region: "Middle East", status: "monitoring" },
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
