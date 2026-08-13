import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { entities } from './entities/index.js';

@Module({
  imports: [
    MikroOrmModule.forRoot({
      driver: PostgreSqlDriver,
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      user: process.env['DB_USERNAME'] ?? 'admin',
      password: process.env['DB_PASSWORD'] ?? 'admin',
      dbName: process.env['DB_NAME'] ?? 'pokemon',
      entities,
      autoLoadEntities: true,
    }),
  ],
})
export class DbModule {}
