import { Migration } from '@mikro-orm/migrations';

export class Migration20260814011006 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "pokemon" ("id" int not null, "name" text not null, "sprite_url" text not null, "types" text[] not null, "height" int not null, "weight" int not null, primary key ("id"));`);
    this.addSql(`alter table "pokemon" add constraint "pokemon_name_unique" unique ("name");`);

    this.addSql(`create table "profile" ("id" uuid not null, "name" text not null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "profile" add constraint "profile_name_unique" unique ("name");`);

    this.addSql(`create table "profile_pokemon" ("id" uuid not null, "profile_id" uuid not null, "pokemon_id" int not null, "slot" smallint not null, primary key ("id"));`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_profile_id_pokemon_id_unique" unique ("profile_id", "pokemon_id");`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_profile_id_slot_unique" unique ("profile_id", "slot");`);

    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_profile_id_foreign" foreign key ("profile_id") references "profile" ("id") on delete cascade;`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_pokemon_id_foreign" foreign key ("pokemon_id") references "pokemon" ("id") on delete cascade;`);
    this.addSql(`alter table "profile_pokemon" add constraint "profile_pokemon_slot_check" check (slot between 1 and 6);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_pokemon_id_foreign";`);
    this.addSql(`alter table "profile_pokemon" drop constraint "profile_pokemon_profile_id_foreign";`);

    this.addSql(`drop table if exists "pokemon" cascade;`);
    this.addSql(`drop table if exists "profile" cascade;`);
    this.addSql(`drop table if exists "profile_pokemon" cascade;`);
  }

}
