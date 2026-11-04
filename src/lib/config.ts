// Business rules in one place. Change a number here and the whole app follows.
export const TZ = "Asia/Dhaka";
/** One booking reserves one visit window of this many minutes. */
export const SLOT_MINUTES = 60;
export const MAX_DAYS_AHEAD = 30;
/** Online bookings must start at least this many minutes from now. */
export const MIN_LEAD_MINUTES = 60;
/** Clients can cancel or reschedule until this many minutes before the start. */
export const CANCEL_CUTOFF_MINUTES = 120;
/** Upcoming active bookings allowed per phone number (online bookings). */
export const MAX_ACTIVE_PER_PHONE = 3;
export const MAX_SERVICES_PER_BOOKING = 4;
