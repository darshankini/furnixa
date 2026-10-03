import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { LEAD_STATUSES, type LeadStatus } from '../leads.types.js';

/** GET /leads?status=QUOTATION&clientId=3 */
export class ListLeadsQueryDto {
  @IsOptional()
  @IsIn(LEAD_STATUSES, { message: 'Please choose a valid phase.' })
  status?: LeadStatus;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  clientId?: number;
}
