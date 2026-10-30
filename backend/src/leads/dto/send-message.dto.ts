import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
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

  /**
   * People @mentioned in the message, comma separated: "user:12,client:3".
   * A plain string (not an array) so it works the same in JSON and in multipart form data.
   */
  @Matches(/^(user|client):\d+(,(user|client):\d+)*$/, { message: 'mentions must look like "user:12,client:3".' })
  @MaxLength(500)
  @IsOptional()
  mentions?: string;
}
