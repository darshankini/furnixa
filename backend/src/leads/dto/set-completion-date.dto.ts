import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsProjectDate } from './project-date.js';

/** Moves the project completion date; the reason is required and goes into the lead history */
export class SetCompletionDateDto {
  @IsProjectDate('Please choose a valid completion date.')
  projectCompletionOn: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(500, { message: 'Reason must be 500 characters or fewer.' })
  @MinLength(3, { message: 'Please give a reason for changing the date.' })
  @IsString({ message: 'Please give a reason for changing the date.' })
  reason: string;
}
