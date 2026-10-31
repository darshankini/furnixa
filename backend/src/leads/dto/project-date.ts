import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsISO8601, Matches } from 'class-validator';

/** A calendar day as YYYY-MM-DD (same rules as CreatePaymentDto.paidOn) */
export function IsProjectDate(message: string) {
  return applyDecorators(
    IsISO8601({ strict: true }, { message }),
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message }),
    Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)),
  );
}
