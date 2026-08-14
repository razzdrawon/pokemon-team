import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module.js';
import { PokemonModule } from '../pokemon/pokemon.module.js';
import { ProfileModule } from '../profile/profile.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [DbModule, PokemonModule, ProfileModule],
  controllers: [AppController],
})
export class AppModule {}
