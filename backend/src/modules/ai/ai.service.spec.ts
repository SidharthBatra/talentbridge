import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';

const generateContentMock = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: generateContentMock }),
  })),
}));

/**
 * Unit coverage for AiService itself — mocks the Gemini SDK (not
 * AiService), so this is the layer that actually exercises the
 * retry/timeout/rate-limit classification and JSON-parsing logic that the
 * e2e suite mocks past (it stubs AiService.generateJson directly to avoid
 * real network calls at the feature level).
 */
describe('AiService', () => {
  let service: AiService;

  const configValues: Record<string, string> = { geminiApiKey: 'fake-key' };

  beforeEach(async () => {
    generateContentMock.mockReset();
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

  const respondWith = (text: string) => ({
    response: { text: () => text },
  });

  it('parses a clean JSON response', async () => {
    generateContentMock.mockResolvedValue(respondWith('{"foo":"bar"}'));
    const result = await service.generateJson<{ foo: string }>('prompt');
    expect(result).toEqual({ ok: true, data: { foo: 'bar' } });
  });

  it('strips markdown fences before parsing', async () => {
    generateContentMock.mockResolvedValue(
      respondWith('```json\n{"foo":"bar"}\n```'),
    );
    const result = await service.generateJson<{ foo: string }>('prompt');
    expect(result).toEqual({ ok: true, data: { foo: 'bar' } });
  });

  it('returns invalid_response when the model does not return JSON', async () => {
    generateContentMock.mockResolvedValue(respondWith('not json at all'));
    const result = await service.generateJson('prompt');
    expect(result).toEqual({
      ok: false,
      reason: 'invalid_response',
      message: expect.any(String),
    });
    // invalid_response is not retryable — only one attempt should be made.
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('classifies a 429 as rate_limited and retries once', async () => {
    generateContentMock.mockRejectedValue({ status: 429, message: 'Too Many Requests' });
    const result = await service.generateJson('prompt');
    expect(result).toEqual({
      ok: false,
      reason: 'rate_limited',
      message: expect.any(String),
    });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('succeeds on the retry after a transient failure', async () => {
    generateContentMock
      .mockRejectedValueOnce({ status: 500, message: 'Internal error' })
      .mockResolvedValueOnce(respondWith('{"foo":"bar"}'));

    const result = await service.generateJson<{ foo: string }>('prompt');
    expect(result).toEqual({ ok: true, data: { foo: 'bar' } });
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry also fails', async () => {
    generateContentMock.mockRejectedValue(new Error('network down'));
    const result = await service.generateJson('prompt');
    expect(result.ok).toBe(false);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('returns a typed error result without throwing when GEMINI_API_KEY is missing', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    const unconfigured = moduleRef.get(AiService);

    const result = await unconfigured.generateJson('prompt');
    expect(result.ok).toBe(false);
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});
