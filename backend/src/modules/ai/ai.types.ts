/**
 * Every AI-backed feature gets back one of these instead of a thrown
 * error. Callers pattern-match on `ok` and run their own fallback when
 * `false` — the fallback path is a first-class part of each feature, not
 * an afterthought bolted on with try/catch.
 */
export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AiFailureReason; message: string };

export type AiFailureReason =
  | 'rate_limited' // Gemini free-tier 429 — expected under load, not exceptional
  | 'timeout' // request took too long (network stall, model overloaded)
  | 'invalid_response' // model returned text that didn't parse as the expected JSON shape
  | 'error'; // anything else (auth, network, 5xx, missing API key)
