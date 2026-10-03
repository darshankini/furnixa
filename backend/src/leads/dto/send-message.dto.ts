import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../clients/dto/client-validation.js';

export class SendMessageDto {
  @Transform(trim)
  @MaxLength(2000, { message: 'Message must be 2000 characters or fewer.' })
  @IsNotEmpty({ message: 'Message cannot be empty.' })
  @IsString()
  message: string;
}
