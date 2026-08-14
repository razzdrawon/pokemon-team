import { IsArray, IsInt } from 'class-validator';
import type { SetTeamRequest } from '@pokemon/contracts';

// No array-size cap here on purpose — TEAM_SIZE_EXCEEDED is a business rule the
// service enforces (see precedence in errors.ts), not a structural validation.
export class SetTeamDto implements SetTeamRequest {
  @IsArray()
  @IsInt({ each: true })
  pokemonIds!: number[];
}
