import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { MAX_TEAM_SIZE } from '@pokemon/contracts';
import type { ProfileDto, ProfileWithTeamDto } from '@pokemon/contracts';
import { Profile } from '../database/entities/profile.entity.js';
import { Pokemon } from '../database/entities/pokemon.entity.js';
import { ProfilePokemon } from '../database/entities/profile-pokemon.entity.js';
import { AppException } from '../../common/app-exception.js';
import { toProfileDto, toProfileWithTeamDto } from './profile.mapper.js';

@Injectable()
export class ProfileService {
  // Explicit token: Vite's esbuild-based transform doesn't emit decorator metadata, so
  // Nest can't resolve a plain typed constructor param — @Inject() bypasses that.
  constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

  async findAll(): Promise<ProfileDto[]> {
    // One query for team sizes instead of N+1 — fine at this scale, no raw SQL needed.
    const [profiles, memberships] = await Promise.all([
      this.em.find(Profile, {}, { orderBy: { createdAt: 'asc' } }),
      this.em.find(ProfilePokemon, {}),
    ]);
    const teamSizes = new Map<string, number>();
    for (const m of memberships) {
      teamSizes.set(m.profile.id, (teamSizes.get(m.profile.id) ?? 0) + 1);
    }
    return profiles.map((p) => toProfileDto(p, teamSizes.get(p.id) ?? 0));
  }

  async create(name: string): Promise<ProfileDto> {
    // em.create() auto-persists; onCreate doesn't make createdAt optional in this
    // MikroORM version's type, so it's passed explicitly (onCreate still governs the
    // actual value at flush time — this is redundant, not conflicting).
    const profile = this.em.create(Profile, { name, createdAt: new Date() });
    try {
      await this.em.flush();
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        throw new AppException('PROFILE_NAME_TAKEN', `Profile name "${name}" is already taken`);
      }
      throw err;
    }
    return toProfileDto(profile, 0);
  }

  async findOneWithTeam(id: string): Promise<ProfileWithTeamDto> {
    const profile = await this.findProfileOrThrow(this.em, id);
    return this.loadTeam(this.em, profile);
  }

  // Precedence matches pokemon-contracts/src/errors.ts (cheapest/most-fundamental check
  // first). Reads as one pipeline; each step's detail lives in its own method below.
  async setTeam(id: string, pokemonIds: number[]): Promise<ProfileWithTeamDto> {
    return this.em.transactional(async (em) => {
      const profile = await this.findProfileOrThrow(em, id);
      const pokemonById = await this.validateTeamSelection(em, pokemonIds);
      await this.replaceTeam(em, profile, pokemonIds, pokemonById);
      return this.loadTeam(em, profile);
    });
  }

  private async findProfileOrThrow(em: EntityManager, id: string): Promise<Profile> {
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new AppException('PROFILE_NOT_FOUND', `Profile ${id} not found`);
    }
    return profile;
  }

  // Structural checks first (no DB read), then confirms every id actually exists.
  private async validateTeamSelection(
    em: EntityManager,
    pokemonIds: number[]
  ): Promise<Map<number, Pokemon>> {
    if (pokemonIds.length > MAX_TEAM_SIZE) {
      throw new AppException(
        'TEAM_SIZE_EXCEEDED',
        `A team can have at most ${MAX_TEAM_SIZE} Pokémon`
      );
    }

    if (new Set(pokemonIds).size !== pokemonIds.length) {
      throw new AppException('DUPLICATE_POKEMON', 'A team cannot include the same Pokémon twice');
    }

    const pokemon = pokemonIds.length
      ? await em.find(Pokemon, { id: { $in: pokemonIds } })
      : [];
    if (pokemon.length !== pokemonIds.length) {
      const found = new Set(pokemon.map((p) => p.id));
      const missing = pokemonIds.filter((pid) => !found.has(pid));
      throw new AppException('UNKNOWN_POKEMON', `Unknown Pokémon id(s): ${missing.join(', ')}`);
    }

    return new Map(pokemon.map((p) => [p.id, p]));
  }

  // Full replace: drop the existing team, recreate it from `pokemonIds` — array order
  // becomes slot order (index 0 = slot 1).
  private async replaceTeam(
    em: EntityManager,
    profile: Profile,
    pokemonIds: number[],
    pokemonById: Map<number, Pokemon>
  ): Promise<void> {
    await em.nativeDelete(ProfilePokemon, { profile });
    pokemonIds.forEach((pokemonId, index) => {
      const pokemon = pokemonById.get(pokemonId);
      if (!pokemon) {
        // Unreachable given validateTeamSelection's checks — kept as a real error
        // instead of a non-null assertion, in case that check is ever changed.
        throw new AppException('UNKNOWN_POKEMON', `Unknown Pokémon id(s): ${pokemonId}`);
      }
      em.create(ProfilePokemon, { profile, pokemon, slot: index + 1 });
    });
    await em.flush();
  }

  private async loadTeam(em: EntityManager, profile: Profile): Promise<ProfileWithTeamDto> {
    const members = await em.find(ProfilePokemon, { profile }, { populate: ['pokemon'] });
    return toProfileWithTeamDto(profile, members);
  }
}
