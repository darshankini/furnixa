import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../clients/dto/client-validation.js';

/**
 * JSON for a text message, or multipart/form-data with `file` and an optional `message` caption.
 * The service checks that at least one of the two is there.
 */
export class SendMessageDto {
  @Transform(trim)
  @MaxLength(2000, { message: 'Message must be 2000 characters or fewer.' })
  @IsString()
  @IsOptional()
  message?: string;
}
