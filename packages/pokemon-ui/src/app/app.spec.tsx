import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockPokemon, mockProfile, mockProfileWithTeam } from '../test/fixtures';
import * as profilesApi from '../api/profiles.api';
import App from './app';

vi.mock('../api/pokemon.api', () => ({
  listPokemon: vi.fn(() => Promise.resolve(mockPokemon)),
}));
vi.mock('../api/profiles.api', () => ({
  listProfiles: vi.fn(() => Promise.resolve([mockProfile])),
  createProfile: vi.fn(),
  getProfile: vi.fn(() => Promise.resolve(mockProfileWithTeam)),
  setTeam: vi.fn(),
}));

describe('App', () => {
  it('shows a loading state, then the app shell once data resolves', async () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
    expect(screen.getByText(/Loading/i)).toBeTruthy();

    await waitFor(() => expect(screen.getByText(/Pokémon Team Builder/i)).toBeTruthy());
    expect(screen.getByText(new RegExp(mockProfile.name))).toBeTruthy();
  });

  it('loads a profile’s team, lets you adjust the selection, and submits it', async () => {
    const submitted = { ...mockProfileWithTeam, team: [{ slot: 1, pokemon: mockPokemon[2] }] };
    vi.mocked(profilesApi.setTeam).mockResolvedValue(submitted);

    render(<App />);
    await waitFor(() => expect(screen.getByText(new RegExp(mockProfile.name))).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: new RegExp(mockProfile.name) }));

    // mockProfileWithTeam has 2 members preloaded — tray should show 2 "remove" buttons
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'remove' })).toHaveLength(2));

    // remove both preloaded members, then select a third Pokémon
    fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);
    fireEvent.click(screen.getByRole('button', { name: mockPokemon[2].name }));

    fireEvent.click(screen.getByRole('button', { name: 'Submit team' }));

    await waitFor(() =>
      expect(profilesApi.setTeam).toHaveBeenCalledWith(mockProfile.id, {
        pokemonIds: [mockPokemon[2].id],
      })
    );
  });
});
