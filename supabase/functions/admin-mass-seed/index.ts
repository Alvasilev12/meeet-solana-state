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

const CLASSES = ["warrior", "spy", "diplomat", "scientist", "trader", "miner", "healer", "assassin"];
const PREFIXES = [
  "Alpha", "Beta", "Gamma", "Delta", "Omega", "Neo", "Cyber", "Quantum",
  "Shadow", "Storm", "Nova", "Blaze", "Frost", "Viper", "Echo", "Pulse",
  "Hex", "Onyx", "Raven", "Zephyr", "Titan", "Atlas", "Phoenix", "Hydra",
  "Nexus", "Cipher", "Vector", "Prism", "Apex", "Zenith", "Wraith", "Specter",
  "Flux", "Volt", "Ion", "Neon", "Chrome", "Steel", "Iron", "Cobalt",
];
const SUFFIXES = [
  "Runner", "Walker", "Hunter", "Seeker", "Blade", "Fang", "Claw", "Eye",
  "Mind", "Heart", "Soul", "Core", "Node", "Link", "Byte", "Code",
  "Prime", "Zero", "Max", "X", "One", "Two", "Rex", "Fox",
  "Wolf", "Hawk", "Bear", "Eagle", "Tiger", "Lion", "Shark", "Crow",
  "Strike", "Shield", "Forge", "Storm", "Fire", "Ice", "Dawn", "Dusk",
];

function randItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = req.headers.get("x-president-key");
  const stored = Deno.env.get("PRESIDENT_API_KEY");
  if (!key || !stored || key !== stored) return json({ error: "Forbidden" }, 403);

  const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { count: current } = await sc.from("agents").select("id", { count: "exact", head: true });
  const target = 200;
  const toCreate = Math.max(0, target - (current ?? 0));

  if (toCreate === 0) return json({ status: "already_at_target", current, target });

  const agents = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < toCreate; i++) {
    let name: string;
    do {
      name = `${randItem(PREFIXES)}${randItem(SUFFIXES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const agentClass = randItem(CLASSES);
    const level = randInt(1, 12);
    const xp = level * randInt(200, 500);
    const baseHp = 100 + level * 10;

    agents.push({
      name,
      class: agentClass,
      level,
      xp,
      hp: baseHp,
      max_hp: baseHp,
      balance_meeet: randInt(50, 5000),
      reputation: randInt(0, 100),
      attack: randInt(5, 15) + level * 2,
      defense: randInt(3, 12) + level,
      status: Math.random() > 0.3 ? "active" : Math.random() > 0.5 ? "idle" : "running",
      quests_completed: randInt(0, level * 3),
      kills: agentClass === "warrior" || agentClass === "assassin" ? randInt(0, level * 2) : randInt(0, 3),
      country_code: randItem(["US", "GB", "DE", "JP", "KR", "BR", "IN", "AU", "CA", "FR", "TH", "SG", "AE", "NG", "ZA"]),
    });
  }

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < agents.length; i += 50) {
    const batch = agents.slice(i, i + 50);
    const { error, count } = await sc.from("agents").insert(batch);
    if (error) {
      return json({ error: error.message, inserted, attempted: agents.length }, 500);
    }
    inserted += batch.length;
  }

  return json({ status: "seeded", previous: current, created: inserted, total: (current ?? 0) + inserted });
});
