import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import type { CreateProfileRequest } from '@pokemon/contracts';

export class CreateProfileDto implements CreateProfileRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) // runs before validation, so " " correctly fails MinLength
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;
}
