import { Migration } from '@mikro-orm/migrations';

export class Migration20260814012021 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_slot_check";`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_slot_check" check (slot between 1 and 6);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_slot_check";`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_slot_check" check ((slot >= 1) AND (slot <= 6));`);
  }

}
