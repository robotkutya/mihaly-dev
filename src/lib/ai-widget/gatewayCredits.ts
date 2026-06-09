import {
  ASK_MIHALY_FALLBACK,
  ASK_MIHALY_MIN_GATEWAY_CREDITS,
} from './constants';
import { getRuntimeEnv } from './env';

type CreditsResponse = {
  balance?: string | number;
  totalUsed?: string | number;
  total_used?: string | number;
};

export type GatewayCreditCheck =
  | { ok: true; balance: number }
  | { ok: false; message: string };

export function getGatewayAuthToken() {
  return getRuntimeEnv('AI_GATEWAY_API_KEY') ?? getRuntimeEnv('VERCEL_OIDC_TOKEN');
}

export async function checkGatewayCredits(): Promise<GatewayCreditCheck> {
  const apiKey = getGatewayAuthToken();

  if (!apiKey) {
    return { ok: false, message: ASK_MIHALY_FALLBACK };
  }

  try {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/credits', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      return { ok: false, message: ASK_MIHALY_FALLBACK };
    }

    const credits = (await response.json()) as CreditsResponse;
    const balance = Number.parseFloat(String(credits.balance ?? 'NaN'));

    if (!Number.isFinite(balance) || balance < ASK_MIHALY_MIN_GATEWAY_CREDITS) {
      return { ok: false, message: ASK_MIHALY_FALLBACK };
    }

    return { ok: true, balance };
  } catch {
    return { ok: false, message: ASK_MIHALY_FALLBACK };
  }
}
