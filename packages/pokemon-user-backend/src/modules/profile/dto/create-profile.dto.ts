import { IsString, MinLength, MaxLength } from 'class-validator';
import type { CreateProfileRequest } from '@pokemon/contracts';

export class CreateProfileDto implements CreateProfileRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}
