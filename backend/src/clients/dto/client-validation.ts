/** Shared rules and transforms for CreateClientDto and UpdateClientDto */

export const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;
export const PHONE_MESSAGE = 'must be 10–15 digits, optionally starting with +.';

export const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Trim, and turn an empty string into null ("remove this value") */
export const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/** Trim + lowercase, empty string becomes null */
export const emailOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() || null : value;

/** Validate only when a real value was sent (skips undefined and null) */
export const hasValue = (_: object, value: unknown) => value !== undefined && value !== null;
