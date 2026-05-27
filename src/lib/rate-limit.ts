type Bucket = {
  attempts: number;
  windowStart: number;
  blockedUntil?: number;
};

const store = new Map<string, Bucket>();

export function enforceRateLimit(key: string, options?: { maxAttempts?: number; windowMs?: number; blockMs?: number }) {
  const maxAttempts = options?.maxAttempts ?? 5;
  const windowMs = options?.windowMs ?? 15 * 60 * 1000;
  const blockMs = options?.blockMs ?? 15 * 60 * 1000;
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    store.set(key, { attempts: 1, windowStart: now });
    return;
  }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    throw new Error("Too many attempts. Please wait and try again.");
  }

  bucket.attempts += 1;
  if (bucket.attempts > maxAttempts) {
    bucket.blockedUntil = now + blockMs;
    throw new Error("Too many attempts. Please wait and try again.");
  }
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
