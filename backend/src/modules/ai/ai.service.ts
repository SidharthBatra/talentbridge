import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFailureReason, AiResult } from './ai.types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemma-4-31b-it:free';
const REQUEST_TIMEOUT_MS = 15_000;
/** Single retry after a short backoff — free-tier rate limits are often a one-request blip. */
const RETRY_BACKOFF_MS = 1_200;

/**
 * Thin wrapper around OpenRouter's OpenAI-compatible chat completions
 * endpoint. This is the *only* place in the codebase that calls OpenRouter
 * or reads `OPENROUTER_API_KEY` — every AI feature goes through
 * `generateJson()` here, so the key and the request logic are never
 * constructed anywhere reachable from the frontend.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('openRouterApiKey');
    if (!apiKey) {
      this.logger.warn(
        'OPENROUTER_API_KEY is not set — AI features will run in fallback mode only.',
      );
      this.apiKey = null;
      return;
    }
    this.apiKey = apiKey;
  }

  /**
   * Sends `prompt`, expects a JSON object back (models are instructed to
   * respond with JSON only), and parses it as `T`. Retries once on a
   * transient failure before giving up. Never throws — always resolves to
   * an `AiResult`, so the caller's fallback path is a plain `if (!ok)`.
   */
  async generateJson<T>(prompt: string): Promise<AiResult<T>> {
    if (!this.apiKey) {
      return { ok: false, reason: 'error', message: 'AI service is not configured' };
    }

    const first = await this.attempt<T>(this.apiKey, prompt);
    if (first.ok || !this.isRetryable(first.reason)) {
      return first;
    }

    this.logger.warn(`OpenRouter call failed (${first.reason}), retrying once...`);
    await this.sleep(RETRY_BACKOFF_MS);
    return this.attempt<T>(this.apiKey, prompt);
  }

  private async attempt<T>(apiKey: string, prompt: string): Promise<AiResult<T>> {
    try {
      const response = await this.withTimeout(
        fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
          }),
        }),
        REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        return { ok: false, ...(await this.classifyHttpError(response)) };
      }

      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content ?? '';
      return this.parseJson<T>(text);
    } catch (err) {
      return { ok: false, ...this.classifyError(err) };
    }
  }

  private parseJson<T>(text: string): AiResult<T> {
    const cleaned = text
      .trim()
      // Models frequently wrap JSON in ```json ... ``` fences despite instructions not to.
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return { ok: true, data: JSON.parse(cleaned) as T };
    } catch {
      return {
        ok: false,
        reason: 'invalid_response',
        message: 'AI response was not valid JSON',
      };
    }
  }

  private async classifyHttpError(
    response: Response,
  ): Promise<{ reason: AiFailureReason; message: string }> {
    if (response.status === 429) {
      return { reason: 'rate_limited', message: 'AI service rate limit reached' };
    }
    const body = await response.text().catch(() => '');
    return {
      reason: 'error',
      message: `AI request failed with status ${response.status}: ${body}`,
    };
  }

  private classifyError(err: unknown): { reason: AiFailureReason; message: string } {
    const message = err instanceof Error ? err.message : String(err);

    if (message === 'timeout') {
      return { reason: 'timeout', message: 'AI request timed out' };
    }
    if (/429|rate.?limit|quota/i.test(message)) {
      return { reason: 'rate_limited', message: 'AI service rate limit reached' };
    }
    return { reason: 'error', message };
  }

  private isRetryable(reason: AiFailureReason): boolean {
    return reason === 'rate_limited' || reason === 'timeout' || reason === 'error';
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
