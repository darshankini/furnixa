import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { trim } from '../../clients/dto/client-validation.js';

export class CreateLeadDto {
  @Type(() => Number)
  @Min(1, { message: 'Please select a client.' })
  @IsInt({ message: 'Please select a client.' })
  clientId: number;

  @Transform(trim)
  @MaxLength(150, { message: 'Project name must be 150 characters or fewer.' })
  @IsNotEmpty({ message: 'Project name is required.' })
  @IsString()
  projectName: string;

  /** Optional: users to assign straight away. A sales person who creates a lead is always assigned to it. */
  @IsOptional()
  @ArrayMaxSize(20, { message: 'You can assign at most 20 users at once.' })
  @ArrayUnique({ message: 'Each user can only be assigned once.' })
  @IsInt({ each: true, message: 'Assignees must be user ids.' })
  @IsArray()
  assigneeIds?: number[];
}
