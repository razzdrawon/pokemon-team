// Switch on `code`, never on `message`. Precedence for PUT /profiles/:id/team:
// VALIDATION_FAILED > PROFILE_NOT_FOUND > TEAM_SIZE_EXCEEDED > DUPLICATE_POKEMON > UNKNOWN_POKEMON
export type ApiErrorCode =
  | 'VALIDATION_FAILED' // 400
  | 'TEAM_SIZE_EXCEEDED' // 400
  | 'DUPLICATE_POKEMON' // 400
  | 'UNKNOWN_POKEMON' // 400 — id in the body, not the path, so not a 404
  | 'PROFILE_NOT_FOUND' // 404
  | 'PROFILE_NAME_TAKEN' // 409
  | 'INTERNAL_ERROR'; // 500

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: string[]; // present when code is VALIDATION_FAILED
  path: string;
  timestamp: string; // ISO 8601
}
