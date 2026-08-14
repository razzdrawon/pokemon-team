import type { ProfileDto, ProfileWithTeamDto, TeamMemberDto } from '@pokemon/contracts';
import { Profile } from '../database/entities/profile.entity.js';
import { ProfilePokemon } from '../database/entities/profile-pokemon.entity.js';
import { toPokemonDto } from '../pokemon/pokemon.mapper.js';

export function toProfileDto(profile: Profile, teamSize: number): ProfileDto {
  return {
    id: profile.id,
    name: profile.name,
    createdAt: profile.createdAt.toISOString(),
    teamSize,
  };
}

// `members` must have `pokemon` populated (see the em.find() calls in profile.service.ts).
export function toProfileWithTeamDto(
  profile: Profile,
  members: ProfilePokemon[]
): ProfileWithTeamDto {
  const team: TeamMemberDto[] = members
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((m) => ({ slot: m.slot, pokemon: toPokemonDto(m.pokemon) }));
  return { ...toProfileDto(profile, members.length), team };
}
