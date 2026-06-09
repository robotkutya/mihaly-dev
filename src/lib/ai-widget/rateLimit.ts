import { Redis } from '@upstash/redis';
import { getIntegerEnv, getRuntimeEnv, isVercelRuntime } from './env';

type LimitWindow = {
  key: string;
  limit: number;
  ttlSeconds: number;
};

type MemoryEntry = {
  count: number;
  resetAt: number;
};

type BackoffState = {
  count: number;
  lastAt: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number; reason: string };

const DAY_SECONDS = 24 * 60 * 60;
const MONTH_SECONDS = 31 * DAY_SECONDS;
const BACKOFF_GROUP_SIZE = 100;
const BACKOFF_MAX_DELAY_SECONDS = 60 * 60;
const memoryStore = new Map<string, MemoryEntry>();
const memoryBackoffStore = new Map<string, BackoffState & { resetAt: number }>();

export async function checkAskMihalyRateLimit(request: Request): Promise<RateLimitResult> {
  const clientId = await getClientId(request);
  const globalWindows = getGlobalLimitWindows();
  const redis = getRedisClient();

  if (!redis) {
    const backoff = checkMemoryBackoff(clientId);

    if (!backoff.allowed) {
      return backoff;
    }

    return checkMemoryWindows(globalWindows);
  }

  try {
    const backoff = await checkRedisBackoff(redis, clientId);

    if (!backoff.allowed) {
      return backoff;
    }

    for (const window of globalWindows) {
      const count = await incrementRedisWindow(redis, window.key, window.ttlSeconds);

      if (count > window.limit) {
        return {
          allowed: false,
          retryAfter: window.ttlSeconds,
          reason: 'rate_limited',
        };
      }
    }

    return { allowed: true };
  } catch {
    if (isVercelRuntime()) {
      return {
        allowed: false,
        retryAfter: getBackoffDelaySeconds(12),
        reason: 'rate_limit_unavailable',
      };
    }

    const backoff = checkMemoryBackoff(clientId);

    if (!backoff.allowed) {
      return backoff;
    }

    return checkMemoryWindows(globalWindows);
  }
}

function getGlobalLimitWindows(): LimitWindow[] {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const dailyLimit = getIntegerEnv('AI_WIDGET_DAILY_LIMIT', 50);
  const monthlyLimit = getIntegerEnv('AI_WIDGET_MONTHLY_LIMIT', 500);

  return [
    {
      key: `ask-mihaly:v1:global:day:${today}`,
      limit: dailyLimit,
      ttlSeconds: DAY_SECONDS,
    },
    {
      key: `ask-mihaly:v1:global:month:${month}`,
      limit: monthlyLimit,
      ttlSeconds: MONTH_SECONDS,
    },
  ];
}

function getRedisClient() {
  const url = getRuntimeEnv('UPSTASH_REDIS_REST_URL') ?? getRuntimeEnv('KV_REST_API_URL');
  const token =
    getRuntimeEnv('UPSTASH_REDIS_REST_TOKEN') ?? getRuntimeEnv('KV_REST_API_TOKEN');

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

async function incrementRedisWindow(redis: Redis, key: string, ttlSeconds: number) {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }

  return count;
}

async function checkRedisBackoff(redis: Redis, clientId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `ask-mihaly:v1:ip:${clientId}:backoff`;
  const state = parseBackoffState(await redis.get<unknown>(key));
  const delaySeconds = getBackoffDelaySeconds(state.count);
  const retryAfter = getRetryAfterSeconds({ delaySeconds, lastAt: state.lastAt, now });

  if (retryAfter > 0) {
    return {
      allowed: false,
      retryAfter,
      reason: 'backoff',
    };
  }

  await redis.set(
    key,
    JSON.stringify({
      count: state.count + 1,
      lastAt: now,
    }),
    { ex: DAY_SECONDS },
  );

  return { allowed: true };
}

function checkMemoryWindows(windows: LimitWindow[]): RateLimitResult {
  for (const window of windows) {
    const count = incrementMemoryWindow(window.key, window.ttlSeconds);

    if (count > window.limit) {
      return {
        allowed: false,
        retryAfter: window.ttlSeconds,
        reason: 'rate_limited',
      };
    }
  }

  return { allowed: true };
}

function incrementMemoryWindow(key: string, ttlSeconds: number) {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + ttlSeconds * 1000,
    });

    return 1;
  }

  existing.count += 1;
  return existing.count;
}

function checkMemoryBackoff(clientId: string): RateLimitResult {
  const now = Date.now();
  const key = `ask-mihaly:v1:ip:${clientId}:backoff`;
  const existing = memoryBackoffStore.get(key);
  const state =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          lastAt: 0,
          resetAt: now + DAY_SECONDS * 1000,
        };
  const delaySeconds = getBackoffDelaySeconds(state.count);
  const retryAfter = getRetryAfterSeconds({ delaySeconds, lastAt: state.lastAt, now });

  if (retryAfter > 0) {
    return {
      allowed: false,
      retryAfter,
      reason: 'backoff',
    };
  }

  memoryBackoffStore.set(key, {
    count: state.count + 1,
    lastAt: now,
    resetAt: state.resetAt,
  });

  return { allowed: true };
}

function parseBackoffState(value: unknown): BackoffState {
  if (typeof value === 'string') {
    try {
      return parseBackoffState(JSON.parse(value) as unknown);
    } catch {
      return { count: 0, lastAt: 0 };
    }
  }

  if (!value || typeof value !== 'object') {
    return { count: 0, lastAt: 0 };
  }

  const count = 'count' in value && typeof value.count === 'number' ? value.count : 0;
  const lastAt = 'lastAt' in value && typeof value.lastAt === 'number' ? value.lastAt : 0;

  return {
    count: Math.max(0, count),
    lastAt: Math.max(0, lastAt),
  };
}

function getBackoffDelaySeconds(count: number) {
  if (count < BACKOFF_GROUP_SIZE) {
    return 0;
  }

  const group = Math.floor(count / BACKOFF_GROUP_SIZE);
  const delay = 2 ** (group - 1);

  return Math.min(delay, BACKOFF_MAX_DELAY_SECONDS);
}

function getRetryAfterSeconds({
  delaySeconds,
  lastAt,
  now,
}: {
  delaySeconds: number;
  lastAt: number;
  now: number;
}) {
  if (delaySeconds === 0 || lastAt === 0) {
    return 0;
  }

  const elapsedSeconds = Math.floor((now - lastAt) / 1000);

  return Math.max(0, delaySeconds - elapsedSeconds);
}

async function getClientId(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const rawIp =
    forwardedFor?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown';
  const salt = getRuntimeEnv('RATE_LIMIT_SALT') ?? 'mihaly-dev-ai-widget';

  return hashClientId(`${salt}:${rawIp}`);
}

async function hashClientId(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
