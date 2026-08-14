import { describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@mikro-orm/core';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { MAX_TEAM_SIZE } from '@pokemon/contracts';
import { Profile } from '../database/entities/profile.entity.js';
import { Pokemon } from '../database/entities/pokemon.entity.js';
import { ProfilePokemon } from '../database/entities/profile-pokemon.entity.js';
import { ProfileService } from './profile.service.js';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return Object.assign(new Profile(), {
    id: 'profile-1',
    name: 'Ash',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

function makePokemon(id: number, name = `pokemon-${id}`): Pokemon {
  return Object.assign(new Pokemon(), {
    id,
    name,
    spriteUrl: `https://example.test/${id}.png`,
    types: ['normal'],
    height: 1,
    weight: 1,
  });
}

function makeMember(profile: Profile, pokemon: Pokemon, slot: number): ProfilePokemon {
  return Object.assign(new ProfilePokemon(), { profile, pokemon, slot });
}

// Mocks just the surface ProfileService actually calls. `find` branches on the entity
// class since the real code queries both Pokemon and ProfilePokemon in one flow.
function createMockEm(config: {
  findOneResult?: Profile | null;
  pokemonResult?: Pokemon[];
  membersResult?: ProfilePokemon[];
  flushError?: Error;
} = {}) {
  const findOne = vi.fn().mockResolvedValue(config.findOneResult ?? null);
  const find = vi.fn((entity: unknown) => {
    if (entity === Pokemon) return Promise.resolve(config.pokemonResult ?? []);
    if (entity === ProfilePokemon) return Promise.resolve(config.membersResult ?? []);
    return Promise.resolve([]);
  });
  const create = vi.fn((_entity: unknown, data: object) => ({ id: 'generated-id', ...data }));
  const nativeDelete = vi.fn().mockResolvedValue(undefined);
  const flush = config.flushError
    ? vi.fn().mockRejectedValue(config.flushError)
    : vi.fn().mockResolvedValue(undefined);

  const em = { findOne, find, create, nativeDelete, flush } as unknown as EntityManager;
  // transactional() runs the callback with the same mock — no real transaction semantics
  // to simulate for a unit test, just the call shape ProfileService relies on.
  (em as { transactional?: unknown }).transactional = vi.fn((cb: (em: EntityManager) => unknown) =>
    cb(em)
  );
  return em;
}

describe('ProfileService.setTeam', () => {
  it('rejects a team larger than MAX_TEAM_SIZE', async () => {
    const profile = makeProfile();
    const em = createMockEm({ findOneResult: profile });
    const service = new ProfileService(em);

    const ids = Array.from({ length: MAX_TEAM_SIZE + 1 }, (_, i) => i + 1);
    await expect(service.setTeam(profile.id, ids)).rejects.toMatchObject({
      code: 'TEAM_SIZE_EXCEEDED',
    });
  });

  it('rejects a team with a duplicate Pokémon id', async () => {
    const profile = makeProfile();
    const em = createMockEm({ findOneResult: profile });
    const service = new ProfileService(em);

    await expect(service.setTeam(profile.id, [1, 1, 2])).rejects.toMatchObject({
      code: 'DUPLICATE_POKEMON',
    });
  });

  it('rejects a team referencing an unknown Pokémon id', async () => {
    const profile = makeProfile();
    const em = createMockEm({
      findOneResult: profile,
      pokemonResult: [makePokemon(1), makePokemon(4)], // 9999 missing
    });
    const service = new ProfileService(em);

    await expect(service.setTeam(profile.id, [1, 4, 9999])).rejects.toMatchObject({
      code: 'UNKNOWN_POKEMON',
    });
  });

  it('rejects when the profile does not exist', async () => {
    const em = createMockEm({ findOneResult: null });
    const service = new ProfileService(em);

    await expect(service.setTeam('missing-id', [1, 4])).rejects.toMatchObject({
      code: 'PROFILE_NOT_FOUND',
    });
  });

  it('PROFILE_NOT_FOUND wins over TEAM_SIZE_EXCEEDED when both apply', async () => {
    const em = createMockEm({ findOneResult: null });
    const service = new ProfileService(em);

    const tooMany = Array.from({ length: MAX_TEAM_SIZE + 1 }, (_, i) => i + 1);
    await expect(service.setTeam('missing-id', tooMany)).rejects.toMatchObject({
      code: 'PROFILE_NOT_FOUND',
    });
  });

  it('replaces the existing team rather than appending to it', async () => {
    const profile = makeProfile();
    const em = createMockEm({
      findOneResult: profile,
      pokemonResult: [makePokemon(25)],
      membersResult: [makeMember(profile, makePokemon(25), 1)],
    });
    const service = new ProfileService(em);

    await service.setTeam(profile.id, [25]);

    expect(em.nativeDelete).toHaveBeenCalledWith(ProfilePokemon, { profile });
    expect(em.create).toHaveBeenCalledTimes(1); // only the new id, nothing from a prior team
  });

  it('clears the team when given an empty array', async () => {
    const profile = makeProfile();
    const em = createMockEm({ findOneResult: profile, membersResult: [] });
    const service = new ProfileService(em);

    const result = await service.setTeam(profile.id, []);

    expect(em.nativeDelete).toHaveBeenCalledWith(ProfilePokemon, { profile });
    expect(em.create).not.toHaveBeenCalled();
    expect(result.team).toEqual([]);
    expect(result.teamSize).toBe(0);
  });

  it('assigns slots 1..n in submitted array order', async () => {
    const profile = makeProfile();
    const pokemon = [makePokemon(7), makePokemon(4), makePokemon(1)];
    const em = createMockEm({
      findOneResult: profile,
      pokemonResult: pokemon,
      membersResult: [
        makeMember(profile, pokemon[0], 1),
        makeMember(profile, pokemon[1], 2),
        makeMember(profile, pokemon[2], 3),
      ],
    });
    const service = new ProfileService(em);

    await service.setTeam(profile.id, [7, 4, 1]);

    const slots = (em.create as ReturnType<typeof vi.fn>).mock.calls.map((call) => {
      const data = call[1] as { slot: number; pokemon: Pokemon };
      return [data.slot, data.pokemon.id];
    });
    expect(slots).toEqual([
      [1, 7],
      [2, 4],
      [3, 1],
    ]);
  });
});

describe('ProfileService.create', () => {
  it('rejects a duplicate profile name', async () => {
    const em = createMockEm({
      flushError: new UniqueConstraintViolationException(new Error('duplicate key')),
    });
    const service = new ProfileService(em);

    await expect(service.create('Ash')).rejects.toMatchObject({
      code: 'PROFILE_NAME_TAKEN',
    });
  });
});

describe('ProfileService.findOneWithTeam', () => {
  it('rejects when the profile does not exist', async () => {
    const em = createMockEm({ findOneResult: null });
    const service = new ProfileService(em);

    await expect(service.findOneWithTeam('missing-id')).rejects.toMatchObject({
      code: 'PROFILE_NOT_FOUND',
    });
  });
});
