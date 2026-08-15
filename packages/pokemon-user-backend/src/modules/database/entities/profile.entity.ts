import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity()
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Unique()
  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Date = new Date();
}
