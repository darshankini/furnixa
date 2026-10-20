import { IsEmail, IsNotEmpty, IsString,IsIn } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  @IsString()
  @IsIn(['user','client'],{ message: 'Please select user'})
  @IsNotEmpty({ message : 'User Type is required'})
  loginType: 'user' | 'client'
}
