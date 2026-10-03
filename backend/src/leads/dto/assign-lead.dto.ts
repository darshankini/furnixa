import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { hasValue, trimOrNull } from '../../clients/dto/client-validation.js';
import { LEAD_STATUSES, type LeadStatus } from '../leads.types.js';

/**
 * Hands the lead over: `userIds` is the complete list of people who should work on it now
 * (e.g. several designers). Anyone not in the list is taken off the lead but keeps chat access.
 */
export class AssignLeadDto {
  /** Move the lead to this phase at the same time; omit to keep the current phase */
  @IsOptional()
  @IsIn(LEAD_STATUSES, { message: 'Please choose a valid phase.' })
  status?: LeadStatus;

  @ArrayMaxSize(20, { message: 'You can assign at most 20 users at once.' })
  @ArrayUnique({ message: 'Each user can only be assigned once.' })
  @IsInt({ each: true, message: 'Assignees must be user ids.' })
  @IsArray({ message: 'Assignees must be a list of user ids.' })
  userIds: number[];

  @Transform(trimOrNull)
  @ValidateIf(hasValue)
  @MaxLength(500, { message: 'Note must be 500 characters or fewer.' })
  @IsString()
  note?: string | null;
}
