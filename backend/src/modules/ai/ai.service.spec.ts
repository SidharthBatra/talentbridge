import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';

const fetchMock = jest.fn();

/**
 * Unit coverage for AiService itself — mocks global `fetch` (not
 * AiService), so this is the layer that actually exercises the
 * retry/timeout/rate-limit classification and JSON-parsing logic that the
 * e2e suite mocks past (it stubs AiService.generateJson directly to avoid
 * real network calls at the feature level).
 */
describe('AiService', () => {
  let service: AiService;

  const configValues: Record<string, string> = { openRouterApiKey: 'fake-key' };

  beforeEach(async () => {
    fetchMock.mockReset();
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock;
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: { get: (k: string) => configValues[k] },
        },
      ],
    }).compile();
    service = moduleRef.get(AiService);
  });

  const okResponse = (text: string) => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: text } }] }),
  });

  const errorResponse = (status: number, body = '') => ({
    ok: false,
    status,
    text: async () => body,
  });

  it('parses a clean JSON response', async () => {
    fetchMock.mockResolvedValue(okResponse('{"foo":"bar"}'));
    const result = await service.generateJson<{ foo: string }>('prompt');
    expect(result).toEqual({ ok: true, data: { foo: 'bar' } });
  });

  it('strips markdown fences before parsing', async () => {
    fetchMock.mockResolvedValue(okResponse('```json\n{"foo":"bar"}\n```'));
    const result = await service.generateJson<{ foo: string }>('prompt');
    expect(result).toEqual({ ok: true, data: { foo: 'bar' } });
  });

  it('returns invalid_response when the model does not return JSON', async () => {
    fetchMock.mockResolvedValue(okResponse('not json at all'));
    const result = await service.generateJson('prompt');
    expect(result).toEqual({
      ok: false,
      reason: 'invalid_response',
      message: expect.any(String),
    });
    // invalid_response is not retryable — only one attempt should be made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies a 429 as rate_limited and retries once', async () => {
    fetchMock.mockResolvedValue(errorResponse(429, 'Too Many Requests'));
    const result = await service.generateJson('prompt');
    expect(result).toEqual({
      ok: false,
      reason: 'rate_limited',
      message: expect.any(String),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('succeeds on the retry after a transient failure', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500, 'Internal error'))
      .mockResolvedValueOnce(okResponse('{"foo":"bar"}'));

    const result = await service.generateJson<{ foo: string }>('prompt');
    expect(result).toEqual({ ok: true, data: { foo: 'bar' } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry also fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await service.generateJson('prompt');
    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns a typed error result without throwing when OPENROUTER_API_KEY is missing', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    const unconfigured = moduleRef.get(AiService);

    const result = await unconfigured.generateJson('prompt');
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
