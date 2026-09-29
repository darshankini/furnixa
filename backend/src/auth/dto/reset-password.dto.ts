import { IsJWT, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsJWT({ message: 'This reset link is invalid or has expired.' })
  token: string;

  // Validators run bottom-to-top, so the length check comes first
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must contain at least one letter and one number.',
  })
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @IsString()
  password: string;
}
