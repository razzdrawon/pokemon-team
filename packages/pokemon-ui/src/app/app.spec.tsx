import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockPokemon, mockProfile } from '../test/fixtures';
import App from './app';

vi.mock('../api/pokemon.api', () => ({
  listPokemon: vi.fn(() => Promise.resolve(mockPokemon)),
}));
vi.mock('../api/profiles.api', () => ({
  listProfiles: vi.fn(() => Promise.resolve([mockProfile])),
  createProfile: vi.fn(),
  getProfile: vi.fn(),
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
});
