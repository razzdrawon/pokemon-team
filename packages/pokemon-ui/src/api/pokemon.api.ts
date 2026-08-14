import type { PokemonDto } from '@pokemon/contracts';
import { apiClient } from './client';

export function listPokemon(): Promise<PokemonDto[]> {
  return apiClient.get('/pokemon');
}
