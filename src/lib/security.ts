/**
 * Sanitize user input to prevent XSS and injection attacks.
 * Strips HTML tags, script content, and event handlers.
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate Solana wallet address (base58, 32-44 chars) */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/** Sanitize a URL – only allow http(s) and relative paths */
export function sanitizeUrl(url: string): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "#";
}

/** Safe error message for production – never leaks internals */
export function safeErrorMessage(error: unknown): string {
  if (import.meta.env.DEV && error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Client-side rate limiter.
 * Returns true if the action is allowed, false if throttled.
 */
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = buckets.get(key) ?? [];
  const filtered = timestamps.filter((t) => now - t < windowMs);

  if (filtered.length >= maxRequests) {
    buckets.set(key, filtered);
    return true; // rate limited
  }

  filtered.push(now);
  buckets.set(key, filtered);
  return false;
}
