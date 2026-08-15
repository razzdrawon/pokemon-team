import { join } from 'path';
import { UnderscoreNamingStrategy } from '@mikro-orm/core';
import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { entities } from './src/modules/database/entities/index';

export default defineConfig({
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  user: process.env['DB_USERNAME'] ?? 'admin',
  password: process.env['DB_PASSWORD'] ?? 'admin',
  dbName: process.env['DB_NAME'] ?? 'pokemon',

  entities,
  metadataProvider: ReflectMetadataProvider,
  namingStrategy: UnderscoreNamingStrategy,

  extensions: [Migrator],

  migrations: {
    path: join(__dirname, 'src/migrations'),
    tableName: 'mikro_orm_migrations',
    transactional: true,
    allOrNothing: true,
    snapshot: false,
  },

  debug: true,
});
