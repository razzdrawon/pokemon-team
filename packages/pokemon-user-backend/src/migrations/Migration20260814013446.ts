import { Migration } from '@mikro-orm/migrations';

export class Migration20260814013446 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_profile_id_slot_unique";`);
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_pkey";`);
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_slot_check";`);
    this.addSql(`alter table "profile_pokemon" drop column "id";`);
    this.addSql(`alter table "profile_pokemon" add primary key ("profile_id", "slot");`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_slot_check" check (slot between 1 and 6);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_pkey";`);
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_slot_check";`);
    this.addSql(`alter table "profile_pokemon" add "id" uuid not null;`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_profile_id_slot_unique" unique ("profile_id", "slot");`);
    this.addSql(`alter table "profile_pokemon" add primary key ("id");`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_slot_check" check ((slot >= 1) AND (slot <= 6));`);
  }

}
