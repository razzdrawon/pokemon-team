import type { PokemonDto } from '@pokemon/contracts';
import { Pokemon } from '../database/entities/pokemon.entity.js';

export function toPokemonDto(entity: Pokemon): PokemonDto {
  return {
    id: entity.id,
    name: entity.name,
    spriteUrl: entity.spriteUrl,
    types: entity.types,
    height: entity.height,
    weight: entity.weight,
  };
}
