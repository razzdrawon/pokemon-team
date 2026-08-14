import { Entity, ManyToOne, PrimaryKey, Unique } from '@mikro-orm/decorators/legacy';
import { MAX_TEAM_SIZE } from '@pokemon/contracts';
import { Profile } from './profile.entity'; // no .js — see entities/index.ts
import { Pokemon } from './pokemon.entity';

// Explicit join (not an implicit @ManyToMany) so `slot` can exist. Composite PK
// (profile, slot), not a surrogate id — no row is ever addressed by one.
@Entity()
@Unique({ properties: ['profile', 'pokemon'] }) // no duplicate Pokémon on one team
export class ProfilePokemon {
  @ManyToOne(() => Profile, { primary: true, deleteRule: 'cascade' })
  profile!: Profile;

  @ManyToOne(() => Pokemon, { deleteRule: 'cascade' })
  pokemon!: Pokemon;

  // Derived from MAX_TEAM_SIZE, not hardcoded — one number, one place to change it.
  @PrimaryKey({ type: 'smallint', check: `slot between 1 and ${MAX_TEAM_SIZE}` })
  slot!: number;
}
