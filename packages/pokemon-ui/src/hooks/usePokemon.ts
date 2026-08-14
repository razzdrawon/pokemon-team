import { listPokemon } from '../api/pokemon.api';
import { useAsync } from './useAsync';

export function usePokemon() {
  return useAsync(listPokemon, []);
}
