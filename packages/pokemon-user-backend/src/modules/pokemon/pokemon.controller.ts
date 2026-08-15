import { Controller, Get, Inject } from '@nestjs/common';
import type { PokemonDto } from '@pokemon/contracts';
import { PokemonService } from './pokemon.service.js';

@Controller('pokemon')
export class PokemonController {
  constructor(@Inject(PokemonService) private readonly pokemonService: PokemonService) {}

  @Get()
  findAll(): Promise<PokemonDto[]> {
    return this.pokemonService.findAll();
  }
}
