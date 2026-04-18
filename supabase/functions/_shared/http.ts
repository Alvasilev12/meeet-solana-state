// Shared HTTP utilities for Edge Functions: unified CORS, error handling, JSON helpers, and tiny in-memory cache.
// Import from any function: `import { corsHeaders, json, error, withCors, memoCache } from "../_shared/http.ts";`

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function withCors(extra: Record<string, string> = {}) {
  return { ...corsHeaders, "Content-Type": "application/json", ...extra };
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: withCors(extraHeaders),
  });
}

/** Safe error response — never leaks raw stacktraces in production payloads. */
export function error(message: string, status = 400, code?: string) {
  return json({ ok: false, error: message, code: code ?? null }, status);
}

/** Wrap any Deno.serve handler to ensure OPTIONS + uniform error envelope. */
export function handle(
  fn: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await fn(req);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Internal error";
      // Log full detail server-side; client gets the safe message only.
      console.error("[edge-error]", msg, e instanceof Error ? e.stack : "");
      return error(msg, 500, "internal_error");
    }
  };
}

/** Tiny in-memory TTL cache. Per-isolate only, but enough to absorb burst traffic. */
const _cache = new Map<string, { value: unknown; expiresAt: number }>();
export const memoCache = {
  get<T = unknown>(key: string): T | undefined {
    const hit = _cache.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      _cache.delete(key);
      return undefined;
    }
    return hit.value as T;
  },
  set(key: string, value: unknown, ttlMs: number) {
    _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  },
  async wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const fresh = await fn();
    this.set(key, fresh, ttlMs);
    return fresh;
  },
};
