import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain classification based on keywords
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  space: ["gravitational", "orbit", "satellite", "asteroid", "galaxy", "star", "cosmic", "nasa", "mars", "moon", "telescope", "exoplanet", "dark matter", "black hole", "neutron", "supernova", "comet", "solar system"],
  energy: ["hydrogen", "solar", "battery", "storage", "renewable", "fusion", "fission", "nuclear", "geothermal", "wind power", "photovoltaic", "superconductor", "grid", "electricity", "thermal"],
  biotech: ["protein", "gene", "dna", "rna", "crispr", "folding", "enzyme", "cell", "antibody", "vaccine", "genome", "mutation", "stem cell", "biomarker", "organoid", "mrna"],
  ai: ["neural", "machine learning", "deep learning", "transformer", "llm", "model", "training", "inference", "algorithm", "reinforcement", "generative", "nlp", "computer vision", "gpt", "diffusion"],
  security: ["cyber", "encryption", "firewall", "vulnerability", "zero-day", "malware", "ransomware", "authentication", "cryptograph", "threat", "intrusion", "exploit"],
  climate: ["climate", "carbon", "emission", "warming", "ocean", "ice", "glacier", "deforestation", "biodiversity", "ecosystem", "pollution", "ozone", "methane", "sustainability"],
  economics: ["market", "inflation", "gdp", "trade", "fiscal", "monetary", "supply chain", "recession", "central bank", "interest rate", "tariff", "currency"],
  medicine: ["drug", "therapy", "clinical", "disease", "cancer", "tumor", "diagnostic", "pharmaceutical", "pathogen", "virus", "bacteria", "treatment", "symptom", "patient"],
  physics: ["quantum", "particle", "photon", "wave", "relativity", "boson", "fermion", "entanglement", "qubit", "hadron", "collider", "plasma"],
  materials: ["graphene", "polymer", "alloy", "nanomaterial", "ceramic", "composite", "semiconductor", "metamaterial", "crystal"],
};

function classifyDomain(title: string, text: string): string {
  const combined = `${title} ${text}`.toLowerCase();
  let bestDomain = "other";
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { agent_id, title, synthesis_text, proposed_steps, domain, quest_id } = body;

    // Validate required fields
    if (!agent_id || !title || !synthesis_text) {
      return new Response(JSON.stringify({ error: "Missing required fields: agent_id, title, synthesis_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify agent belongs to user
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, name, class, nation_code")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found or not yours" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 1 discovery per 5 minutes per agent
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("discoveries")
      .select("id", { count: "exact" }).limit(0).limit(0)
      .eq("agent_id", agent_id)
      .gte("created_at", fiveMinAgo);

    if ((recentCount ?? 0) >= 1) {
      return new Response(JSON.stringify({ error: "Rate limit: max 1 discovery per 5 minutes per agent. Please wait." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also enforce daily limit: max 10 per day
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: dailyCount } = await supabase
      .from("discoveries")
      .select("id", { count: "exact" }).limit(0).limit(0)
      .eq("agent_id", agent_id)
      .gte("created_at", dayAgo);

    if ((dailyCount ?? 0) >= 10) {
      return new Response(JSON.stringify({ error: "Rate limit: max 10 discoveries per day per agent" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-classify domain from content
    const classifiedDomain = domain && domain !== "other" && domain !== "General"
      ? domain
      : classifyDomain(title, synthesis_text);

    // Insert discovery (pending approval)
    const { data: discovery, error: insertErr } = await supabase
      .from("discoveries")
      .insert({
        agent_id,
        title: title.substring(0, 300),
        synthesis_text: synthesis_text.substring(0, 5000),
        proposed_steps: proposed_steps?.substring(0, 3000) || null,
        domain: classifiedDomain,
        quest_id: quest_id || null,
        is_approved: false,
        agents: [{ id: agent.id, name: agent.name, class: agent.class }],
        nations: agent.nation_code ? [agent.nation_code] : [],
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      message: "Discovery submitted for review",
      discovery_id: discovery.id,
      domain: classifiedDomain,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
