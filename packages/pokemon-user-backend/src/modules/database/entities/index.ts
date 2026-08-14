// No .js extension: the MikroORM CLI's loader needs a bare specifier to find the .ts file.
import { Profile } from './profile.entity';
import { Pokemon } from './pokemon.entity';
import { ProfilePokemon } from './profile-pokemon.entity';

// Barrel so db.module.ts and mikro-orm.config.ts can't drift apart.
export const entities = [Profile, Pokemon, ProfilePokemon];

export { Profile, Pokemon, ProfilePokemon };
