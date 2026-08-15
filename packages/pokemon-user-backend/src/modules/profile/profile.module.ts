import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

// See pokemon.module.ts — no forFeature() here for the same reason.
@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
