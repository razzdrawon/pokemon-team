import { ParseUUIDPipe } from '@nestjs/common';
import { AppException } from './app-exception.js';

// So a malformed :id path param produces the same VALIDATION_FAILED shape as a malformed
// body, instead of Nest's generic (unwrapped) BadRequestException.
export const parseProfileId = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: (error) => new AppException('VALIDATION_FAILED', error),
});
