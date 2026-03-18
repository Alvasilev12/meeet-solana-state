import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GDELT 2.0 DOC API
const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";
// GDELT GEO 2.0 API (more structured)
const GDELT_GEO_API = "https://api.gdeltproject.org/api/v2/geo/geo";

interface GdeltArticle {
  title: string;
  url: string;
  sourcecountry?: string;
  tone?: string;
  seendate?: string;
  socialimage?: string;
  lat?: number;
  lng?: number;
}

// Map GDELT source country codes to ISO-3166 alpha-3
function normalizeCountryCode(gdeltCode: string | undefined): string | null {
  if (!gdeltCode) return null;
  // GDELT uses FIPS codes, we do basic mapping for common ones
  const map: Record<string, string> = {
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
  return map[gdeltCode.toUpperCase()] || null;
}

// Estimate coordinates from country code using capital coords from DB
async function getCountryCoords(
  supabase: any,
  countryCode: string
): Promise<{ lat: number; lng: number } | null> {
  const { data } = await supabase
    .from("nations")
    .select("capital_lat, capital_lng")
    .eq("code", countryCode)
    .single();
  if (data?.capital_lat && data?.capital_lng) {
    // Add slight randomization to prevent stacking
    return {
      lat: data.capital_lat + (Math.random() - 0.5) * 2,
      lng: data.capital_lng + (Math.random() - 0.5) * 2,
    };
  }
  return null;
}

function classifyEvent(title: string, tone: number): string {
  const lower = title.toLowerCase();
  if (lower.match(/war|attack|bomb|kill|militar|strike|shoot|terror|explos/)) return "conflict";
  if (lower.match(/flood|earthquake|hurricane|tornado|wildfire|drought|tsunami|disaster/)) return "disaster";
  if (lower.match(/discover|research|breakthrough|study|scien|invent/)) return "discovery";
  if (lower.match(/peace|treaty|agreement|diplomat|negotiat|summit|alliance/)) return "diplomacy";
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

    // Try GDELT DOC API with simple keyword search
    let articles: GdeltArticle[] = [];
    
    const queries = [
      "war OR conflict OR attack OR military",
      "earthquake OR flood OR hurricane OR wildfire",
      "peace OR treaty OR summit OR agreement",
    ];
    
    // Pick a rotating query based on current minute
    const queryIdx = Math.floor(Date.now() / 60000) % queries.length;
    const searchQuery = encodeURIComponent(queries[queryIdx]);
    
    try {
      const docUrl = `${GDELT_DOC_API}?query=${searchQuery}&mode=artlist&maxrecords=10&format=json&timespan=60min&sort=datedesc`;
      const docRes = await fetch(docUrl);
      if (docRes.ok) {
        const docText = await docRes.text();
        try {
          const docData = JSON.parse(docText);
          articles = docData?.articles || [];
        } catch {
          // Try GEO API as fallback
          const geoUrl = `${GDELT_GEO_API}?query=${searchQuery}&format=GeoJSON&timespan=60min&maxpoints=10`;
          const geoRes = await fetch(geoUrl);
          if (geoRes.ok) {
            const geoText = await geoRes.text();
            try {
              const geoData = JSON.parse(geoText);
              if (geoData?.features) {
                articles = geoData.features.map((f: any) => ({
                  title: f.properties?.name || f.properties?.html || "Event",
                  url: f.properties?.url || "",
                  sourcecountry: f.properties?.countrycode || "",
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
    
    if (articles.length === 0) {
      return new Response(JSON.stringify({ message: "No new events from GDELT", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let synced = 0;
    let challengesCreated = 0;

    for (const article of articles.slice(0, 15)) {
      // Parse tone (average tone value)
      const toneValue = article.tone ? parseFloat(article.tone.split(",")[0]) : 0;
      const eventType = classifyEvent(article.title, toneValue);
      const goldstein = estimateGoldstein(toneValue, eventType);
      const countryCode = normalizeCountryCode(article.sourcecountry);

      // Get coordinates — prefer direct from GEO API, fallback to country capital
      let lat: number | null = article.lat ?? null;
      let lng: number | null = article.lng ?? null;
      if (lat === null && lng === null && countryCode) {
        const coords = await getCountryCoords(supabase, countryCode);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      // Check for duplicates (same title in last hour)
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

        // Auto-create Global Challenge quest for severe events (Goldstein < -7)
        if (goldstein < -7 && countryCode) {
          const questTitle = `AI Analysis: ${article.title.substring(0, 100)} — propose solutions`;
          const domain = eventType === "conflict" ? "security" :
                         eventType === "disaster" ? "climate" : "peace";

          const { error: questErr } = await supabase.from("quests").insert({
            title: questTitle.substring(0, 200),
            description: `Global Challenge auto-generated from real-world event.\n\nEvent: ${article.title}\nSource: ${article.url || 'GDELT'}\nGoldstein Scale: ${goldstein}\n\nAnalyze this event and propose actionable solutions. Top submissions become Discoveries.`,
            reward_sol: 2,
            reward_meeet: 5000,
            requester_id: "00000000-0000-0000-0000-000000000000", // System requester
            category: "research",
            domain,
            deadline_hours: 72,
            max_participants: 50,
            is_global_challenge: true,
            auto_generated: true,
            source_event_id: null, // We'd need the event ID
          });

          if (!questErr) challengesCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Sync complete",
        synced,
        challenges_created: challengesCreated,
        total_articles: articles.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("sync-world-events error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
