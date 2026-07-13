import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import { AiFailureReason, AiResult } from './ai.types';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const REQUEST_TIMEOUT_MS = 15_000;
/** Single retry after a short backoff — free-tier rate limits are often a one-request blip. */
const RETRY_BACKOFF_MS = 1_200;

/**
 * Thin wrapper around the Gemini SDK. This is the *only* place in the
 * codebase that touches `@google/generative-ai` or reads `GEMINI_API_KEY`
 * — every AI feature goes through `generateJson()` here, so the key and
 * the client are never constructed anywhere reachable from the frontend.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly model: GenerativeModel | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('geminiApiKey');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — AI features will run in fallback mode only.',
      );
      this.model = null;
      return;
    }
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: GEMINI_MODEL });
  }

  /**
   * Sends `prompt`, expects a JSON object back (models are instructed to
   * respond with JSON only), and parses it as `T`. Retries once on a
   * transient failure before giving up. Never throws — always resolves to
   * an `AiResult`, so the caller's fallback path is a plain `if (!ok)`.
   */
  async generateJson<T>(prompt: string): Promise<AiResult<T>> {
    if (!this.model) {
      return { ok: false, reason: 'error', message: 'AI service is not configured' };
    }

    const first = await this.attempt<T>(this.model, prompt);
    if (first.ok || !this.isRetryable(first.reason)) {
      return first;
    }

    this.logger.warn(`Gemini call failed (${first.reason}), retrying once...`);
    await this.sleep(RETRY_BACKOFF_MS);
    return this.attempt<T>(this.model, prompt);
  }

  private async attempt<T>(
    model: GenerativeModel,
    prompt: string,
  ): Promise<AiResult<T>> {
    try {
      const result = await this.withTimeout(
        model.generateContent(prompt),
        REQUEST_TIMEOUT_MS,
      );
      const text = result.response.text();
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

  private classifyError(err: unknown): { reason: AiFailureReason; message: string } {
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;

    if (message === 'timeout') {
      return { reason: 'timeout', message: 'AI request timed out' };
    }
    if (status === 429 || /429|rate.?limit|quota/i.test(message)) {
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
