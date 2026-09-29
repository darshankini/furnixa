import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { emailOrNull, hasValue, PHONE_MESSAGE, PHONE_PATTERN, trim, trimOrNull } from './client-validation.js';

export class CreateClientDto {
  @Transform(trim)
  @MaxLength(50, { message: 'First name must be 50 characters or fewer.' })
  @IsNotEmpty({ message: 'First name is required.' })
  @IsString()
  firstName: string;

  @Transform(trim)
  @MaxLength(50, { message: 'Last name must be 50 characters or fewer.' })
  @IsNotEmpty({ message: 'Last name is required.' })
  @IsString()
  lastName: string;

  @Transform(trim)
  @Matches(PHONE_PATTERN, { message: `Mobile ${PHONE_MESSAGE}` })
  @IsNotEmpty({ message: 'Mobile is required.' })
  @IsString()
  mobile: string;

  @Transform(trimOrNull)
  @ValidateIf(hasValue)
  @Matches(PHONE_PATTERN, { message: `Alternate mobile ${PHONE_MESSAGE}` })
  alternateMobile?: string | null;

  @Transform(emailOrNull)
  @ValidateIf(hasValue)
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email?: string | null;

  @Transform(trimOrNull)
  @ValidateIf(hasValue)
  @MaxLength(500, { message: 'Address must be 500 characters or fewer.' })
  @IsString()
  address?: string | null;
}
