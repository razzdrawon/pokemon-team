import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { ProfileDto, ProfileWithTeamDto } from '@pokemon/contracts';
import { parseProfileId } from '../../common/parse-uuid.pipe.js';
import { ProfileService } from './profile.service.js';
import { CreateProfileDto } from './dto/create-profile.dto.js';

@Controller('profiles')
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profileService: ProfileService) {}

  @Get()
  findAll(): Promise<ProfileDto[]> {
    return this.profileService.findAll();
  }

  @Post()
  create(@Body() dto: CreateProfileDto): Promise<ProfileDto> {
    return this.profileService.create(dto.name);
  }

  @Get(':id')
  findOne(@Param('id', parseProfileId) id: string): Promise<ProfileWithTeamDto> {
    return this.profileService.findOneWithTeam(id);
  }
}
