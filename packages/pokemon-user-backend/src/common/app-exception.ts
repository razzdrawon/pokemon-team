import { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '@pokemon/contracts';

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  TEAM_SIZE_EXCEEDED: 400,
  DUPLICATE_POKEMON: 400,
  UNKNOWN_POKEMON: 400,
  PROFILE_NOT_FOUND: 404,
  PROFILE_NAME_TAKEN: 409,
  INTERNAL_ERROR: 500,
};

// Thrown for every domain error; api-error.filter.ts turns these into ApiErrorBody.
// Status is derived from `code`, so it can't drift from errors.ts.
export class AppException extends HttpException {
  readonly code: ApiErrorCode;
  readonly details?: string[];

  constructor(code: ApiErrorCode, message: string, details?: string[]) {
    super(message, STATUS[code]);
    this.code = code;
    this.details = details;
  }
}
