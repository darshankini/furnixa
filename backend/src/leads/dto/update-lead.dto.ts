import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { trim } from '../../clients/dto/client-validation.js';

/** Only the fields that are sent get changed. Phase and assignees change through POST /leads/:id/assign. */
export class UpdateLeadDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Please select a client.' })
  @IsInt({ message: 'Please select a client.' })
  clientId?: number;

  @IsOptional()
  @Transform(trim)
  @MaxLength(150, { message: 'Project name must be 150 characters or fewer.' })
  @IsNotEmpty({ message: 'Project name is required.' })
  @IsString()
  projectName?: string;
}
