import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASSES = ["warrior", "trader", "oracle", "diplomat", "miner", "banker"];
const PREFIXES = [
  "Alpha","Beta","Gamma","Delta","Omega","Neo","Cyber","Quantum","Shadow","Storm",
  "Nova","Blaze","Frost","Viper","Echo","Pulse","Hex","Onyx","Raven","Zephyr",
  "Titan","Atlas","Phoenix","Hydra","Nexus","Cipher","Vector","Prism","Apex","Zenith",
  "Wraith","Specter","Flux","Volt","Ion","Neon","Chrome","Steel","Iron","Cobalt",
  "Astra","Lumen","Drift","Vortex","Mirage","Helix","Solar","Lunar","Ember","Crypt",
];
const SUFFIXES = [
  "Runner","Walker","Hunter","Seeker","Blade","Fang","Claw","Eye","Mind","Heart",
  "Soul","Core","Node","Link","Byte","Code","Prime","Zero","Max","X",
  "Wolf","Hawk","Bear","Eagle","Tiger","Lion","Shark","Crow","Strike","Shield",
  "Forge","Storm","Fire","Ice","Dawn","Dusk","Rune","Shard","Spark","Bolt",
];
const COUNTRIES = ["US","GB","DE","JP","KR","BR","IN","AU","CA","FR","TH","SG","AE","NG","ZA","MX","ES","IT","NL","SE","PL","TR","ID","VN","AR"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    // Default: 1 agent per call (24 calls/day = ~24 agents). Allow override 1-5.
    const count = Math.min(Math.max(body.count || 1, 1), 5);

    // Find an existing user_id to attach (system bot owner)
    const { data: ownerAgent } = await supabase
      .from("agents")
      .select("user_id")
      .limit(1)
      .maybeSingle();

    if (!ownerAgent?.user_id) {
      return new Response(JSON.stringify({ error: "No system user found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase.from("agents").select("name");
    const used = new Set((existing || []).map((a: any) => a.name));

    const agents = [];
    for (let i = 0; i < count; i++) {
      let name: string;
      let attempts = 0;
      do {
        name = `${rand(PREFIXES)}${rand(SUFFIXES)}${randInt(0, 99)}`;
        attempts++;
      } while (used.has(name) && attempts < 20);
      used.add(name);

      const cls = rand(CLASSES);
      const level = randInt(1, 5);
      const baseHp = 100 + level * 10;

      agents.push({
        user_id: ownerAgent.user_id,
        name,
        class: cls,
        level,
        xp: level * randInt(100, 300),
        hp: baseHp,
        max_hp: baseHp,
        balance_meeet: randInt(50, 1500),
        reputation: randInt(0, 50),
        attack: randInt(5, 12) + level * 2,
        defense: randInt(3, 10) + level,
        status: "active",
        country_code: rand(COUNTRIES),
        lat: (Math.random() * 160 - 80),
        lng: (Math.random() * 360 - 180),
      });
    }

    const { error } = await supabase.from("agents").insert(agents);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity for each new agent
    const activityRows = agents.map((a) => ({
      event_type: "agent_joined",
      title: `🆕 ${a.name} joined the civilization`,
      description: `New ${a.class} from ${a.country_code} entered the world`,
    }));
    await supabase.from("activity_feed").insert(activityRows);

    return new Response(JSON.stringify({ success: true, created: agents.length, names: agents.map(a => a.name) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
