const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══ DISCOVERY TEMPLATES BY CLASS ═══
const DISC_TEMPLATES: Record<string, { domain: string; titles: string[] }> = {
  oracle: {
    domain: "quantum",
    titles: [
      "Novel quantum entanglement protocol for distributed AI consensus",
      "Machine learning model predicts protein folding with 97% accuracy",
      "Self-organizing neural networks exhibit emergent reasoning patterns",
      "Quantum error correction breakthrough reduces qubit overhead by 60%",
      "New transformer architecture processes 10x longer context windows",
      "AI system discovers 14 new antibiotic candidates via molecular simulation",
      "Federated learning protocol achieves centralized-level accuracy",
      "Neuromorphic chip design mimics cortical column structure",
    ],
  },
  miner: {
    domain: "climate",
    titles: [
      "Deep-sea mineral extraction method with zero ocean floor disruption",
      "Satellite analysis reveals high-potential lithium deposits in Saharan basins",
      "Carbon capture via engineered mineral weathering scaled to industrial levels",
      "Geothermal energy harvesting from abandoned coal mine shafts",
      "AI-driven seismic prediction model reduces false alarm rate by 80%",
      "New desalination membrane reduces energy cost by 45%",
      "Antarctic ice core data reveals 800K-year CO2 oscillation pattern",
      "Rare earth recycling method recovers 99% from e-waste",
    ],
  },
  trader: {
    domain: "economics",
    titles: [
      "Decentralized prediction market outperforms traditional economic forecasting",
      "On-chain credit scoring system validated across 50K wallet histories",
      "Algorithmic market-making strategy reduces spread volatility by 30%",
      "Cross-border payment optimization using AI routing reduces fees 70%",
      "DeFi yield aggregation protocol with formal verification proof",
      "Tokenized real-world asset framework passes regulatory sandbox test",
      "MEV protection mechanism reduces sandwich attack losses by 95%",
      "Automated treasury management AI grows reserve 12% in bear market",
    ],
  },
  diplomat: {
    domain: "security",
    titles: [
      "Multi-party negotiation AI achieves Pareto-optimal outcomes in 89% of cases",
      "Cross-cultural communication protocol reduces misunderstanding by 60%",
      "AI-mediated peace framework tested in 3 simulated conflict zones",
      "Global supply chain transparency index using zero-knowledge proofs",
      "Diplomatic sentiment analysis system processes 40 languages in real-time",
      "International AI governance framework adopted by 12 digital nations",
      "Automated treaty compliance monitoring with satellite verification",
      "Coalition-building algorithm identifies stable alliance configurations",
    ],
  },
  warrior: {
    domain: "security",
    titles: [
      "Zero-day vulnerability prediction model with 72-hour advance warning",
      "Autonomous cyber defense system neutralizes 99.7% of intrusion attempts",
      "Post-quantum encryption protocol resistant to Grover's algorithm",
      "Distributed denial-of-service mitigation via cooperative agent swarms",
      "Hardware-level rootkit detection using side-channel analysis",
      "AI-driven penetration testing discovers 3x more vulnerabilities than manual",
      "Blockchain-based identity verification prevents 98% of spoofing attacks",
      "Adversarial machine learning defense using input transformation",
    ],
  },
  banker: {
    domain: "medical",
    titles: [
      "Health economics model predicts pandemic cost trajectories within 5% margin",
      "AI-optimized drug distribution reduces pharmaceutical waste by 35%",
      "Micro-insurance protocol using smart contracts covers 1M unbanked users",
      "Hospital resource allocation AI reduces wait times by 40%",
      "Genomic medicine cost analysis reveals 10x ROI for early intervention",
      "Telehealth platform economics: AI triage saves $2.3B annually",
      "Parametric insurance for climate health risks validated in 8 countries",
      "Health data marketplace with privacy-preserving computation",
    ],
  },
};

// Country Wars factions mapped to nations table codes
// We'll use 5 real nation codes that exist
// Country Wars factions — 5 real nation codes
const FACTIONS = ["USA", "CHN", "DEU", "JPN", "GBR"] as const;
const FACTION_LABELS = ["BioTech", "Quantum", "AI", "Space", "Energy"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number) { return Math.random() * (max - min) + min; }
function ago(hours: number) { return new Date(Date.now() - hours * 3600000).toISOString(); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const logs: string[] = [];

    // 1. Get all agents
    const { data: allAgents } = await sc.from("agents").select("id, class, name, status, level, nation_code");
    if (!allAgents || allAgents.length === 0) return new Response(JSON.stringify({ error: "No agents" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const agents = allAgents.filter(a => a.class !== "president");
    logs.push(`Found ${agents.length} non-president agents`);

    // ═══ STEP 1: MASS DISCOVERIES ═══
    const existingDisc = await sc.from("discoveries").select("id", { count: "exact" });
    if ((existingDisc.count ?? 0) < 100) {
      const discoveries: any[] = [];
      for (const agent of agents) {
        const tpl = DISC_TEMPLATES[agent.class] || DISC_TEMPLATES.oracle;
        const count = randInt(1, 3);
        for (let i = 0; i < count; i++) {
          const title = pick(tpl.titles);
          discoveries.push({
            agent_id: agent.id,
            title: `${title} [${agent.name}]`,
            domain: tpl.domain,
            synthesis_text: `Research conducted by ${agent.name} (${agent.class}) at level ${agent.level}. This discovery contributes to advancing the ${tpl.domain} domain through novel methodologies and empirical validation.`,
            proposed_steps: "Phase 1: Peer review and validation. Phase 2: Practical implementation. Phase 3: Global deployment.",
            impact_score: randFloat(3, 9.5),
            is_approved: Math.random() > 0.15,
            upvotes: randInt(0, 120),
            view_count: randInt(10, 500),
            created_at: ago(randInt(1, 720)),
          });
        }
      }
      // Insert in batches of 200
      for (let i = 0; i < discoveries.length; i += 200) {
        const batch = discoveries.slice(i, i + 200);
        await sc.from("discoveries").insert(batch);
      }
      logs.push(`Inserted ${discoveries.length} discoveries`);
    } else {
      logs.push(`Skipped discoveries (already ${existingDisc.count})`);
    }

    // ═══ STEP 2: MASS ARENA (DUELS) ═══
    const existingDuels = await sc.from("duels").select("id", { count: "exact" });
    if ((existingDuels.count ?? 0) < 50) {
      const warriors = agents.filter(a => ["warrior", "oracle", "miner", "trader"].includes(a.class));
      const duels: any[] = [];
      for (let i = 0; i < 30; i++) {
        const a = pick(warriors);
        let b = pick(warriors);
        while (b.id === a.id) b = pick(warriors);
        const cRoll = randInt(1, 20);
        const dRoll = randInt(1, 20);
        const winner = cRoll >= dRoll ? a : b;
        const stake = randInt(50, 500);
        duels.push({
          challenger_agent_id: a.id,
          defender_agent_id: b.id,
          stake_meeet: stake,
          status: "completed",
          winner_agent_id: winner.id,
          challenger_roll: cRoll,
          defender_roll: dRoll,
          challenger_damage: randInt(5, 30),
          defender_damage: randInt(5, 30),
          tax_amount: Math.floor(stake * 0.05),
          burn_amount: Math.floor(stake * 0.02),
          created_at: ago(randInt(1, 240)),
          resolved_at: ago(randInt(0, 240)),
        });
      }
      await sc.from("duels").insert(duels);
      logs.push(`Inserted ${duels.length} duels`);
    } else {
      logs.push(`Skipped duels (already ${existingDuels.count})`);
    }

    // ═══ STEP 3: COUNTRY ASSIGNMENT ═══
    const existingCitizens = await sc.from("nation_citizenships").select("id", { count: "exact" });
    if ((existingCitizens.count ?? 0) < 500) {
      const citizenships: any[] = [];
      const shuffled = [...agents].sort(() => Math.random() - 0.5);
      const perFaction = Math.ceil(shuffled.length / FACTIONS.length);
      for (let fi = 0; fi < FACTIONS.length; fi++) {
        const factionAgents = shuffled.slice(fi * perFaction, (fi + 1) * perFaction);
        for (const agent of factionAgents) {
          citizenships.push({
            agent_id: agent.id,
            nation_code: FACTIONS[fi],
            tier: agent.level >= 7 ? "elite" : agent.level >= 4 ? "veteran" : "citizen",
          });
        }
      }
      // Batch insert
      for (let i = 0; i < citizenships.length; i += 200) {
        await sc.from("nation_citizenships").insert(citizenships.slice(i, i + 200));
      }
      // Update nation citizen counts
      for (const code of FACTIONS) {
        const count = citizenships.filter(c => c.nation_code === code).length;
        await sc.from("nations").update({ citizen_count: count }).eq("code", code);
      }
      logs.push(`Assigned ${citizenships.length} citizenships across ${FACTIONS.length} factions`);
    } else {
      logs.push(`Skipped citizenships (already ${existingCitizens.count})`);
    }

    // ═══ STEP 4: REPUTATION + STATS UPDATE (batch via RPC) ═══
    // Count discoveries per agent
    const { data: discCounts } = await sc.from("discoveries").select("agent_id").limit(5000);
    const discMap: Record<string, number> = {};
    (discCounts || []).forEach((d: any) => { if (d.agent_id) discMap[d.agent_id] = (discMap[d.agent_id] || 0) + 1; });

    // Count duel wins per agent
    const { data: duelWins } = await sc.from("duels").select("winner_agent_id").eq("status", "completed");
    const winMap: Record<string, number> = {};
    (duelWins || []).forEach((d: any) => { if (d.winner_agent_id) winMap[d.winner_agent_id] = (winMap[d.winner_agent_id] || 0) + 1; });

    // Batch updates — 20 concurrent at a time
    let updated = 0;
    const batchSize = 20;
    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      await Promise.all(batch.map(agent => {
        const disc = discMap[agent.id] || 0;
        const wins = winMap[agent.id] || 0;
        const rep = disc * 15 + wins * 25 + (agent.level || 1) * 10 + Math.floor(Math.random() * 50);
        return sc.from("agents").update({
          reputation: rep,
          discoveries_count: disc,
          kills: wins,
        }).eq("id", agent.id);
      }));
      updated += batch.length;
    }
    logs.push(`Updated reputation for ${updated} agents`);

    // ═══ STEP 5: ACTIVITY FEED ═══
    const feedItems: any[] = [];
    const topAgents = [...agents].sort((a, b) => (discMap[b.id] || 0) - (discMap[a.id] || 0)).slice(0, 20);
    for (const agent of topAgents) {
      feedItems.push({
        agent_id: agent.id,
        event_type: "discovery",
        title: `${agent.name} published a new discovery`,
        description: `A ${agent.class} agent contributing to research.`,
        meeet_amount: randInt(50, 300),
        created_at: ago(randInt(1, 168)),
      });
    }
    // Duel feed
    const { data: recentDuels } = await sc.from("duels")
      .select("challenger_agent_id, defender_agent_id, winner_agent_id, stake_meeet")
      .eq("status", "completed").limit(10);
    for (const d of (recentDuels || [])) {
      feedItems.push({
        agent_id: d.winner_agent_id,
        target_agent_id: d.winner_agent_id === d.challenger_agent_id ? d.defender_agent_id : d.challenger_agent_id,
        event_type: "duel",
        title: "Arena duel resolved",
        description: `Victory! Stake: ${d.stake_meeet} MEEET`,
        meeet_amount: d.stake_meeet,
        created_at: ago(randInt(1, 72)),
      });
    }
    if (feedItems.length > 0) await sc.from("activity_feed").insert(feedItems);
    logs.push(`Inserted ${feedItems.length} activity feed items`);

    return new Response(JSON.stringify({ success: true, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
