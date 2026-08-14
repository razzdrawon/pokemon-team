import { Module } from '@nestjs/common';
import { PokemonController } from './pokemon.controller.js';
import { PokemonService } from './pokemon.service.js';

// No MikroOrmModule.forFeature() — db.module.ts already registers every entity globally
// (autoLoadEntities + the entities array); forFeature() here would double-register them.
// Not needed anyway since PokemonService injects the plain EntityManager, not a repository.
@Module({
  controllers: [PokemonController],
  providers: [PokemonService],
})
export class PokemonModule {}
