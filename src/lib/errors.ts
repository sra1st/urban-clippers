export type BookingErrorCode =
  | "INVALID"
  | "NOT_FOUND"
  | "SLOT_TAKEN"
  | "LIMIT"
  | "TOO_LATE"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AUTH";

const STATUS: Record<BookingErrorCode, number> = {
  INVALID: 400,
  NOT_FOUND: 404,
  SLOT_TAKEN: 409,
  LIMIT: 429,
  TOO_LATE: 409,
  FORBIDDEN: 403,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  AUTH: 401,
};

/** An expected problem with a message that is safe and useful to show to the person. */
export class BookingError extends Error {
  readonly code: BookingErrorCode;
  readonly status: number;
  readonly extra?: Record<string, unknown>;
  constructor(code: BookingErrorCode, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.extra = extra;
  }
}
