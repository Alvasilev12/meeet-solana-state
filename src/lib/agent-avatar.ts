/**
 * Generate a deterministic avatar URL for an agent using DiceBear Bottts style.
 * Each agent gets a unique robot avatar based on its ID.
 */
export function getAgentAvatarUrl(agentId: string, size = 64): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agentId)}&size=${size}`;
}
