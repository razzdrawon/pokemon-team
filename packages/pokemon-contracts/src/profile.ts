import type { PokemonDto } from './pokemon';

export interface ProfileDto {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  teamSize: number; // avoids loading the full team just to show fullness
}

export interface TeamMemberDto {
  slot: number; // 1..MAX_TEAM_SIZE
  pokemon: PokemonDto;
}

export interface ProfileWithTeamDto extends ProfileDto {
  team: TeamMemberDto[]; // ordered by slot
}

// ─── Requests ───────────────────────────────────────────────

export interface CreateProfileRequest {
  name: string;
}

export interface SetTeamRequest {
  pokemonIds: number[]; // array order sets slot (index 0 = slot 1)
}
