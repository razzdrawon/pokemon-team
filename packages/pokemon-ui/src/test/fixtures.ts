// Plain data for component/hook tests to import — not a runtime mock API. The app always
// talks to the real backend; only tests substitute these in (e.g. via vi.mock on the api/ module).
import type { PokemonDto, ProfileDto, ProfileWithTeamDto } from '@pokemon/contracts';

export const mockPokemon: PokemonDto[] = [
  { id: 1, name: 'bulbasaur', spriteUrl: 'https://example.test/1.png', types: ['grass', 'poison'], height: 7, weight: 69 },
  { id: 4, name: 'charmander', spriteUrl: 'https://example.test/4.png', types: ['fire'], height: 6, weight: 85 },
  { id: 7, name: 'squirtle', spriteUrl: 'https://example.test/7.png', types: ['water'], height: 5, weight: 90 },
];

export const mockProfile: ProfileDto = {
  id: 'profile-1',
  name: 'Ash',
  createdAt: '2026-01-01T00:00:00.000Z',
  teamSize: 0,
};

export const mockProfileWithTeam: ProfileWithTeamDto = {
  ...mockProfile,
  teamSize: 2,
  team: [
    { slot: 1, pokemon: mockPokemon[0] },
    { slot: 2, pokemon: mockPokemon[1] },
  ],
};
