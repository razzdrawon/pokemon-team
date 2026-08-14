import { Migration } from '@mikro-orm/migrations';
import { Pokemon } from '../modules/database/entities/pokemon.entity';
import pokemonSeed from '../seed/pokemon-seed.json';

// Data migration, deliberately separate from the schema migration: offline (the JSON is
// committed, no network call), deterministic, and independently reviewable/revertable.
export class Migration20260814015009_SeedPokemon extends Migration {

  override async up(): Promise<void> {
    await this.getEntityManager().insertMany(Pokemon, pokemonSeed.pokemon);
  }

  override async down(): Promise<void> {
    this.addSql(`delete from "pokemon";`);
  }

}
