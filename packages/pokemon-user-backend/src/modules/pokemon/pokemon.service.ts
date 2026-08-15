import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { PokemonDto } from '@pokemon/contracts';
import { Pokemon } from '../database/entities/pokemon.entity.js';
import { toPokemonDto } from './pokemon.mapper.js';

@Injectable()
export class PokemonService {
  // Explicit token: Vite's esbuild-based transform doesn't emit decorator metadata, so
  // Nest can't resolve a plain typed constructor param — @Inject() bypasses that.
  constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

  async findAll(): Promise<PokemonDto[]> {
    const pokemon = await this.em.find(Pokemon, {}, { orderBy: { id: 'asc' } });
    return pokemon.map(toPokemonDto);
  }
}
