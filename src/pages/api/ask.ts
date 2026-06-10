import { createGateway, streamText } from 'ai';
import {
  ASK_MIHALY_BODY_MAX_BYTES,
  ASK_MIHALY_DEFAULT_MODEL,
  ASK_MIHALY_FALLBACK,
  ASK_MIHALY_MAX_OUTPUT_TOKENS,
  ASK_MIHALY_QUESTION_MAX_LENGTH,
  ASK_MIHALY_RATE_LIMIT_MESSAGE,
} from '../../lib/ai-widget/constants';
import { getRuntimeEnv } from '../../lib/ai-widget/env';
import {
  checkGatewayCredits,
  getGatewayAuthToken,
} from '../../lib/ai-widget/gatewayCredits';
import { buildAskMihalySystemPrompt } from '../../lib/ai-widget/profilePrompt';
import { checkAskMihalyRateLimit } from '../../lib/ai-widget/rateLimit';

export const prerender = false;

type AskBody = {
  question?: unknown;
};

export async function POST({ request }: { request: Request }) {
  const contentLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10);

  if (contentLength > ASK_MIHALY_BODY_MAX_BYTES) {
    return textResponse('Question payload is too large.', { status: 413 });
  }

  const rawBody = await request.text();

  if (new TextEncoder().encode(rawBody).byteLength > ASK_MIHALY_BODY_MAX_BYTES) {
    return textResponse('Question payload is too large.', { status: 413 });
  }

  const question = parseQuestion(rawBody);

  if (!question) {
    return textResponse('Please ask a short question about Mihaly.', { status: 400 });
  }

  const rateLimit = await checkAskMihalyRateLimit(request);

  if (!rateLimit.allowed) {
    return textResponse(ASK_MIHALY_RATE_LIMIT_MESSAGE, {
      status: 429,
      headers: {
        'Retry-After': String(rateLimit.retryAfter),
      },
    });
  }

  const credits = await checkGatewayCredits();

  if (!credits.ok) {
    return textResponse(credits.message, { status: 503 });
  }

  const gatewayToken = getGatewayAuthToken();

  if (!gatewayToken) {
    return textResponse(ASK_MIHALY_FALLBACK);
  }

  const model = getRuntimeEnv('AI_WIDGET_MODEL') ?? ASK_MIHALY_DEFAULT_MODEL;

  return new Response(streamAnswer({ gatewayToken, model, question }), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function parseQuestion(rawBody: string) {
  let body: AskBody;

  try {
    body = JSON.parse(rawBody) as AskBody;
  } catch {
    return null;
  }

  if (typeof body.question !== 'string') {
    return null;
  }

  const question = body.question.trim().slice(0, ASK_MIHALY_QUESTION_MAX_LENGTH);

  return question.length > 0 ? question : null;
}

function streamAnswer({
  gatewayToken,
  model,
  question,
}: {
  gatewayToken: string;
  model: string;
  question: string;
}) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const gateway = createGateway({ apiKey: gatewayToken });
        const result = streamText({
          model: gateway(model),
          system: buildAskMihalySystemPrompt(),
          prompt: question,
          maxOutputTokens: ASK_MIHALY_MAX_OUTPUT_TOKENS,
          maxRetries: 0,
          temperature: 0.3,
        });

        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        controller.enqueue(encoder.encode(ASK_MIHALY_FALLBACK));
      } finally {
        controller.close();
      }
    },
  });
}

function textResponse(
  body: string,
  init: ResponseInit & { headers?: Record<string, string> } = {},
) {
  return new Response(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...init.headers,
    },
  });
}
