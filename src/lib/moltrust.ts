const MOLTRUST_API = "https://api.moltrust.ch";

export async function registerBatch(
  agents: Array<{ external_did: string; label: string; capabilities: string[] }>,
  chain: string = "solana"
) {
  const response = await fetch(`${MOLTRUST_API}/identity/register-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agents, chain }),
  });
  return response.json();
}

export async function getTrustScore(did: string) {
  const response = await fetch(
    `${MOLTRUST_API}/trust/score/${encodeURIComponent(did)}`
  );
  return response.json();
}
