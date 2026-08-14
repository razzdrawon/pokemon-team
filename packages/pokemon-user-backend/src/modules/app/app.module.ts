import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module.js';
import { PokemonModule } from '../pokemon/pokemon.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [DbModule, PokemonModule],
  controllers: [AppController],
})
export class AppModule {}
