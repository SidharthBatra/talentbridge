import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';

/**
 * Multer/`@nestjs/platform-express` surface size-limit violations in two
 * ways depending on where they're caught: as a raw error with
 * `.code === 'LIMIT_FILE_SIZE'` (thrown directly by multer, whose
 * `MulterError` class identity may differ from ours — `@nestjs/platform-
 * express` resolves its own nested copy of `multer`, so `instanceof
 * MulterError` silently fails across that dual-package split), or already
 * wrapped as Nest's own `PayloadTooLargeException`. Both are normalized
 * here into a clean 400 with a specific message. Anything else is handed
 * to Nest's default filter via `super.catch()` — never rethrown directly,
 * which would leave the HTTP response unfinished and the connection
 * hanging.
 */
@Catch()
export class MulterExceptionFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const isFileSizeLimit =
      exception?.code === 'LIMIT_FILE_SIZE' ||
      exception instanceof PayloadTooLargeException;

    if (!isFileSizeLimit) {
      super.catch(exception, host);
      return;
    }

    const response = host.switchToHttp().getResponse<Response>();
    const mapped = new BadRequestException('CV file exceeds the 5MB size limit');
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }
}
