import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { USER_ROLES, type UserRole } from '../users.types.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Every field is optional: only the fields that are sent get changed */
export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @MaxLength(50, { message: 'First name must be 50 characters or fewer.' })
  @IsNotEmpty({ message: 'First name is required.' })
  @IsString()
  firstName?: string;

  @IsOptional()
  @Transform(trim)
  @MaxLength(50, { message: 'Last name must be 50 characters or fewer.' })
  @IsNotEmpty({ message: 'Last name is required.' })
  @IsString()
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email?: string;

  // Send "" or null to remove the mobile number
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Mobile must be 10–15 digits, optionally starting with +.' })
  mobile?: string | null;

  @IsOptional()
  @IsIn(USER_ROLES, { message: 'Please choose a valid role.' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'Active must be true or false.' })
  isActive?: boolean;

  /** Optional: set a new password for this user */
  @IsOptional()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number.',
  })
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @IsString()
  password?: string;
}
