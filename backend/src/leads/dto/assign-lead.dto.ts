import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { hasValue, trimOrNull } from '../../clients/dto/client-validation.js';
import { LEAD_STATUSES, type LeadStatus } from '../leads.types.js';
import { IsProjectDate } from './project-date.js';

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

  /** Required when the lead moves into Quotation (LeadsService checks that); ignored otherwise */
  @IsOptional()
  @Type(() => Number)
  @Max(9_999_999_999.99, { message: 'Quotation amount is too large.' })
  @Min(1, { message: 'Quotation amount must be more than 0.' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Quotation amount must be a number with at most 2 decimals.' })
  quotationAmount?: number;

  /** Required with the quotation amount: the day the client confirmed (the page defaults to today) */
  @IsOptional()
  @IsProjectDate('Please choose a valid project confirmation date.')
  projectConfirmedOn?: string;

  /** Required with the quotation amount: when the project is due (the page defaults to 7 days later) */
  @IsOptional()
  @IsProjectDate('Please choose a valid project completion date.')
  projectCompletionOn?: string;
}
