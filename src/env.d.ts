/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AI_GATEWAY_API_KEY?: string;
  readonly AI_WIDGET_DAILY_LIMIT?: string;
  readonly AI_WIDGET_MODEL?: string;
  readonly AI_WIDGET_MONTHLY_LIMIT?: string;
  readonly KV_REST_API_READ_ONLY_TOKEN?: string;
  readonly KV_REST_API_TOKEN?: string;
  readonly KV_REST_API_URL?: string;
  readonly KV_URL?: string;
  readonly RATE_LIMIT_SALT?: string;
  readonly REDIS_URL?: string;
  readonly UPSTASH_REDIS_REST_TOKEN?: string;
  readonly UPSTASH_REDIS_REST_URL?: string;
  readonly VERCEL?: string;
  readonly VERCEL_ENV?: string;
  readonly VERCEL_OIDC_TOKEN?: string;
}
