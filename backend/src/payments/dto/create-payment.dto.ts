import { Transform, Type } from 'class-transformer';
import { IsIn, IsISO8601, IsNumber, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { hasValue, trimOrNull } from '../../clients/dto/client-validation.js';
import { PAYMENT_MODES, type PaymentMode } from '../payments.types.js';

export class CreatePaymentDto {
  @Type(() => Number)
  @Max(9_999_999_999.99, { message: 'Amount is too large.' })
  @Min(0.01, { message: 'Amount must be more than 0.' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with at most 2 decimals.' })
  amount: number;

  @IsIn(PAYMENT_MODES, { message: 'Please choose cash, UPI, card or cheque.' })
  mode: PaymentMode;

  /** The day the money was received, as YYYY-MM-DD */
  @IsISO8601({ strict: true }, { message: 'Please enter a valid payment date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Please enter a valid payment date.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  paidOn: string;

  @Transform(trimOrNull)
  @ValidateIf(hasValue)
  @MaxLength(500, { message: 'Note must be 500 characters or fewer.' })
  @IsString()
  note?: string | null;
}
