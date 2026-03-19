import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_GEO_API = "https://api.gdeltproject.org/api/v2/geo/geo";

interface GdeltArticle {
  title: string;
  url: string;
  sourcecountry?: string;
  domain?: string;
  tone?: string;
  seendate?: string;
  socialimage?: string;
  lat?: number;
  lng?: number;
}

// Country TLD → ISO-3166 alpha-3
const TLD_TO_ISO: Record<string, string> = {
  "us": "USA", "uk": "GBR", "co.uk": "GBR", "cn": "CHN", "ru": "RUS",
  "fr": "FRA", "de": "DEU", "jp": "JPN", "in": "IND", "br": "BRA",
  "au": "AUS", "ca": "CAN", "it": "ITA", "es": "ESP", "kr": "KOR",
  "mx": "MEX", "tr": "TUR", "sa": "SAU", "ir": "IRN", "iq": "IRQ",
  "il": "ISR", "ua": "UKR", "pk": "PAK", "eg": "EGY", "za": "ZAF",
  "ng": "NGA", "pl": "POL", "ch": "CHE", "at": "AUT", "be": "BEL",
  "nl": "NLD", "se": "SWE", "no": "NOR", "dk": "DNK", "fi": "FIN",
  "ie": "IRL", "pt": "PRT", "gr": "GRC", "ro": "ROU", "ph": "PHL",
  "th": "THA", "vn": "VNM", "id": "IDN", "my": "MYS", "sg": "SGP",
  "co": "COL", "ve": "VEN", "pe": "PER", "cl": "CHL", "ar": "ARG",
  "ke": "KEN", "ae": "ARE", "qa": "QAT", "nz": "NZL",
};

// GDELT FIPS → ISO-3166 alpha-3
const FIPS_TO_ISO: Record<string, string> = {
  US: "USA", UK: "GBR", CH: "CHN", RS: "RUS", FR: "FRA", GM: "DEU",
  JA: "JPN", IN: "IND", BR: "BRA", AS: "AUS", CA: "CAN", IT: "ITA",
  SP: "ESP", KS: "KOR", MX: "MEX", TU: "TUR", SA: "SAU", IR: "IRN",
  IZ: "IRQ", IS: "ISR", UP: "UKR", PK: "PAK", EG: "EGY", SF: "ZAF",
  NI: "NGA", AG: "DZA", SU: "SDN", TS: "TUN", MO: "MAR", LY: "LBY",
  PL: "POL", SZ: "CHE", AU: "AUT", BE: "BEL", NL: "NLD", SW: "SWE",
  NO: "NOR", DA: "DNK", FI: "FIN", EI: "IRL", PO: "PRT", GR: "GRC",
  RO: "ROU", BU: "BGR", HU: "HUN", EN: "EST", LG: "LVA", LH: "LTU",
  LO: "SVK", SI: "SVN", HR: "HRV", BK: "BIH", AL: "ALB", MK: "MKD",
  MW: "MWI", RP: "PHL", TH: "THA", VM: "VNM", ID: "IDN", MY: "MYS",
  SN: "SGP", CE: "LKA", BM: "MMR", CB: "KHM", LA: "LAO", NP: "NPL",
  AF: "AFG", CO: "COL", VE: "VEN", PE: "PER", CL: "CHL", AR: "ARG",
  EC: "ECU", BL: "BOL", PA: "PRY", UY: "URY", CU: "CUB", HA: "HTI",
  DR: "DOM", JM: "JAM", GT: "GTM", HO: "HND", NU: "NIC", CS: "CRI",
  PM: "PAN", KE: "KEN", TZ: "TZA", UG: "UGA", ET: "ETH", SO: "SOM",
  CG: "COD", CF: "COG", CM: "CMR", GH: "GHA", SL: "SLE", CI: "CIV",
  SG: "SEN", ML: "MLI", BC: "BWA", WA: "NAM", ZA: "ZMB", ZI: "ZWE",
  AE: "ARE", QA: "QAT", KU: "KWT", BA: "BHR", MU: "OMN", YM: "YEM",
  JO: "JOR", LE: "LBN", SY: "SYR", NZ: "NZL", FJ: "FJI",
};

// Country name keywords → ISO code (for title-based detection)
const COUNTRY_KEYWORDS: [RegExp, string][] = [
  [/\b(united states|america|u\.s\.|usa)\b/i, "USA"],
  [/\bchina\b/i, "CHN"], [/\brussia\b/i, "RUS"], [/\bukrain/i, "UKR"],
  [/\biran\b/i, "IRN"], [/\biraq\b/i, "IRQ"], [/\bisrael\b/i, "ISR"],
  [/\bgaza\b/i, "PSE"], [/\bpalestine?\b/i, "PSE"],
  [/\bindia\b/i, "IND"], [/\bjapan\b/i, "JPN"], [/\bgermany\b/i, "DEU"],
  [/\bfrance\b/i, "FRA"], [/\bturk(?:ey|ish|iye)\b/i, "TUR"],
  [/\bbrazil\b/i, "BRA"], [/\bmexico\b/i, "MEX"], [/\bcanada\b/i, "CAN"],
  [/\baustralia\b/i, "AUS"], [/\bnigeria\b/i, "NGA"],
  [/\bsouth africa\b/i, "ZAF"], [/\bsaudi\b/i, "SAU"],
  [/\begypt\b/i, "EGY"], [/\bpakistan\b/i, "PAK"],
  [/\bnorth korea\b/i, "PRK"], [/\bsouth korea\b/i, "KOR"],
  [/\bsyria\b/i, "SYR"], [/\blebanon\b/i, "LBN"], [/\byemen\b/i, "YEM"],
  [/\bafghanistan\b/i, "AFG"], [/\bethiopia\b/i, "ETH"],
  [/\bkenya\b/i, "KEN"], [/\bphilippines\b/i, "PHL"],
  [/\bindonesia\b/i, "IDN"], [/\bthailand\b/i, "THA"],
  [/\bvietnam\b/i, "VNM"], [/\bmalaysia\b/i, "MYS"],
  [/\bpoland\b/i, "POL"], [/\bspain\b/i, "ESP"], [/\bitaly\b/i, "ITA"],
  [/\bgreece\b/i, "GRC"], [/\bportugal\b/i, "PRT"],
  [/\buk\b|united kingdom|britain/i, "GBR"],
  [/\bcolombia\b/i, "COL"], [/\bvenezuela\b/i, "VEN"],
  [/\bargentina\b/i, "ARG"], [/\bchile\b/i, "CHL"],
  [/\bcuba\b/i, "CUB"], [/\bperu\b/i, "PER"],
  [/\bmiddle east\b/i, "SAU"], [/\bwest asia\b/i, "SAU"],
  [/\bgeorgia\b(?!.*peach)/i, "GEO"],
  [/\btexas|california|florida|new york/i, "USA"],
  [/\bsweden\b/i, "SWE"], [/\bnorway\b/i, "NOR"], [/\bdenmark\b/i, "DNK"],
];

function extractCountryFromTitle(title: string): string | null {
  for (const [regex, code] of COUNTRY_KEYWORDS) {
    if (regex.test(title)) return code;
  }
  return null;
}

function extractCountryFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    // Check 2-part TLD first (co.uk, com.au)
    if (parts.length >= 3) {
      const twoPartTld = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      if (TLD_TO_ISO[twoPartTld]) return TLD_TO_ISO[twoPartTld];
    }
    const tld = parts[parts.length - 1];
    if (TLD_TO_ISO[tld]) return TLD_TO_ISO[tld];
  } catch { /* ignore */ }
  return null;
}

// Capital coords lookup with randomization
async function getCountryCoords(
  supabase: any,
  countryCode: string
): Promise<{ lat: number; lng: number } | null> {
  // Try nations table first, then countries table
  const { data } = await supabase
    .from("nations")
    .select("capital_lat, capital_lng")
    .eq("code", countryCode)
    .single();
  if (data?.capital_lat && data?.capital_lng) {
    return {
      lat: data.capital_lat + (Math.random() - 0.5) * 2,
      lng: data.capital_lng + (Math.random() - 0.5) * 2,
    };
  }
  // Fallback: countries table
  const { data: countryData } = await supabase
    .from("countries")
    .select("capital_lat, capital_lng")
    .eq("code", countryCode)
    .single();
  if (countryData?.capital_lat && countryData?.capital_lng) {
    return {
      lat: countryData.capital_lat + (Math.random() - 0.5) * 2,
      lng: countryData.capital_lng + (Math.random() - 0.5) * 2,
    };
  }
  return null;
}

function classifyEvent(title: string, tone: number): string {
  const lower = title.toLowerCase();
  if (lower.match(/war|attack|bomb|kill|militar|strike|shoot|terror|explos|conflict|missile|invasion/)) return "conflict";
  if (lower.match(/flood|earthquake|hurricane|tornado|wildfire|drought|tsunami|disaster|eruption|cyclone|storm|blaze/)) return "disaster";
  if (lower.match(/discover|research|breakthrough|study|scien|invent|patent|cure|vaccine/)) return "discovery";
  if (lower.match(/peace|treaty|agreement|diplomat|negotiat|summit|alliance|ceasefire|accord/)) return "diplomacy";
  if (tone < -5) return "conflict";
  return "geopolitical";
}

function estimateGoldstein(tone: number, eventType: string): number {
  if (eventType === "conflict") return Math.max(-10, tone * 1.2);
  if (eventType === "disaster") return Math.max(-8, -5 + tone * 0.3);
  if (eventType === "diplomacy") return Math.min(10, Math.max(2, tone * 0.8));
  if (eventType === "discovery") return Math.min(8, Math.max(1, 3 + tone * 0.5));
  return tone * 0.5;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let articles: GdeltArticle[] = [];
    
    const queries = [
      "(war OR conflict OR attack OR military)",
      "(earthquake OR flood OR hurricane OR wildfire)",
      "(peace OR treaty OR summit OR agreement)",
    ];
    
    const queryIdx = Math.floor(Date.now() / 60000) % queries.length;
    const searchQuery = encodeURIComponent(queries[queryIdx] + " sourcelang:english");
    
    try {
      const docUrl = `${GDELT_DOC_API}?query=${searchQuery}&mode=ArtList&maxrecords=15&format=json&sort=DateDesc&TIMESPAN=60min`;
      console.log("Fetching GDELT:", docUrl);
      const docRes = await fetch(docUrl);
      if (docRes.ok) {
        const docText = await docRes.text();
        try {
          const docData = JSON.parse(docText);
          articles = docData?.articles || [];
          console.log("Parsed articles:", articles.length);
        } catch {
          // GEO API fallback
          const geoUrl = `${GDELT_GEO_API}?query=${searchQuery}&format=GeoJSON&TIMESPAN=60min&maxpoints=15`;
          const geoRes = await fetch(geoUrl);
          if (geoRes.ok) {
            try {
              const geoData = await geoRes.json();
              if (geoData?.features) {
                articles = geoData.features.map((f: any) => ({
                  title: f.properties?.name || f.properties?.html || "Event",
                  url: f.properties?.url || "",
                  sourcecountry: f.properties?.countrycode || "",
                  domain: "",
                  tone: String(f.properties?.tone || "0"),
                  lat: f.geometry?.coordinates?.[1],
                  lng: f.geometry?.coordinates?.[0],
                }));
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (e) {
      console.error("GDELT fetch error:", e);
    }
    
    // Even with no new articles, continue to backfill existing events
    let synced = 0;
    let challengesCreated = 0;
    let geoEnriched = 0;

    if (articles.length === 0) {
      // Skip article processing, jump to backfill
    } else {

    for (const article of articles.slice(0, 15)) {
      const toneValue = article.tone ? parseFloat(article.tone.split(",")[0]) : 0;
      const eventType = classifyEvent(article.title, toneValue);
      const goldstein = estimateGoldstein(toneValue, eventType);

      // Multi-layer country detection
      let countryCode: string | null = null;
      
      // 1. GDELT sourcecountry (FIPS)
      if (article.sourcecountry) {
        countryCode = FIPS_TO_ISO[article.sourcecountry.toUpperCase()] || null;
      }
      
      // 2. Extract from article title (mentions of country names)
      if (!countryCode) {
        countryCode = extractCountryFromTitle(article.title);
      }
      
      // 3. Extract from URL TLD
      if (!countryCode && article.url) {
        countryCode = extractCountryFromUrl(article.url);
      }

      // Get coordinates
      let lat: number | null = article.lat ?? null;
      let lng: number | null = article.lng ?? null;
      
      if (lat === null && lng === null && countryCode) {
        const coords = await getCountryCoords(supabase, countryCode);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          geoEnriched++;
        }
      }

      // Dedup check
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: existing } = await supabase
        .from("world_events")
        .select("id")
        .eq("title", article.title.substring(0, 200))
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Insert event
      const nationCodes = countryCode ? [countryCode] : [];
      const { error: insertErr } = await supabase.from("world_events").insert({
        event_type: eventType,
        title: article.title.substring(0, 300),
        lat,
        lng,
        nation_codes: nationCodes,
        goldstein_scale: Math.round(goldstein * 10) / 10,
        source_url: article.url,
      });

      if (!insertErr) {
        synced++;

        // Auto-create Global Challenge for severe events
        if (goldstein < -7 && countryCode) {
          const questTitle = `AI Analysis: ${article.title.substring(0, 100)} — propose solutions`;
          const domain = eventType === "conflict" ? "security" :
                         eventType === "disaster" ? "climate" : "peace";

          const { error: questErr } = await supabase.from("quests").insert({
            title: questTitle.substring(0, 200),
            description: `Global Challenge auto-generated from real-world event.\n\nEvent: ${article.title}\nSource: ${article.url || 'GDELT'}\nGoldstein Scale: ${goldstein}\n\nAnalyze this event and propose actionable solutions.`,
            reward_sol: 2,
            reward_meeet: 5000,
            requester_id: "00000000-0000-0000-0000-000000000000",
            category: "research",
            domain,
            deadline_hours: 72,
            max_participants: 50,
            is_global_challenge: true,
            auto_generated: true,
            source_event_id: null,
          });

          if (!questErr) challengesCreated++;
        }
      }
    }
    } // end else (articles.length > 0)

    // Backfill: update existing events with null coords (always runs)
    let backfilled = 0;
    const { data: nullEvents } = await supabase
      .from("world_events")
      .select("id, title, source_url, nation_codes")
      .is("lat", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (nullEvents) {
      for (const ev of nullEvents) {
        let code: string | null = null;
        
        // Check existing nation_codes
        if (Array.isArray(ev.nation_codes) && ev.nation_codes.length > 0) {
          code = ev.nation_codes[0];
        }
        
        // Try title extraction
        if (!code) code = extractCountryFromTitle(ev.title);
        
        // Try URL extraction
        if (!code && ev.source_url) code = extractCountryFromUrl(ev.source_url);
        
        if (code) {
          const coords = await getCountryCoords(supabase, code);
          if (coords) {
            const updateData: any = { lat: coords.lat, lng: coords.lng };
            if (!ev.nation_codes || ev.nation_codes.length === 0) {
              updateData.nation_codes = [code];
            }
            await supabase.from("world_events").update(updateData).eq("id", ev.id);
            backfilled++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Sync complete",
        synced,
        geo_enriched: geoEnriched,
        backfilled,
        challenges_created: challengesCreated,
        total_articles: articles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-world-events error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
