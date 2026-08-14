import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import type { ProfileDto, ProfileWithTeamDto } from '@pokemon/contracts';
import { Profile } from '../database/entities/profile.entity.js';
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
    const members = await this.em.find(ProfilePokemon, { profile }, { populate: ['pokemon'] });
    return toProfileWithTeamDto(profile, members);
  }

  private async findProfileOrThrow(em: EntityManager, id: string): Promise<Profile> {
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new AppException('PROFILE_NOT_FOUND', `Profile ${id} not found`);
    }
    return profile;
  }
}
