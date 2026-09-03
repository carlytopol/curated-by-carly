import "server-only";

type Entry = { timestamps: number[] };

const globalRateLimits = globalThis as typeof globalThis & {
  curatedRateLimits?: Map<string, Entry>;
};

const entries = globalRateLimits.curatedRateLimits ?? new Map<string, Entry>();
globalRateLimits.curatedRateLimits = entries;

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests.");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function enforceRateLimit(
  userId: string,
  scope: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const key = `${scope}:${userId}`;
  const cutoff = now - options.windowMs;
  const active = (entries.get(key)?.timestamps ?? []).filter((timestamp) => timestamp > cutoff);
  if (active.length >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((active[0] + options.windowMs - now) / 1000));
    throw new RateLimitError(retryAfterSeconds);
  }
  active.push(now);
  entries.set(key, { timestamps: active });

  if (entries.size > 5000) {
    for (const [entryKey, entry] of entries) {
      if (!entry.timestamps.some((timestamp) => timestamp > cutoff)) entries.delete(entryKey);
    }
  }
}

export function rateLimitResponse(error: RateLimitError) {
  return Response.json(
    { error: "Curated is receiving too many AI requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
  );
}
