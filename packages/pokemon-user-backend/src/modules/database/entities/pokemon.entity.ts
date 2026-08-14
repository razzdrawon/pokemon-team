import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity()
export class Pokemon {
  /** National Dex number — externally assigned by the seed data, not auto-incremented. */
  @PrimaryKey({ type: 'integer', autoincrement: false })
  id!: number;

  @Unique()
  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  spriteUrl!: string;

  @Property({ type: 'array' })
  types!: string[];

  @Property({ type: 'integer' })
  height!: number;

  @Property({ type: 'integer' })
  weight!: number;
}
