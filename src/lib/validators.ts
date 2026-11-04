import { z } from "zod";
import { MAX_SERVICES_PER_BOOKING } from "./config";

import { normalizePhone } from "./phone";

export { normalizePhone };

export const phoneField = z
  .string()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.issues.push({ code: "custom", message: "Enter a Bangladesh mobile number, like 01712 345 678.", input: v });
      return z.NEVER;
    }
    return p;
  });

const nameField = z
  .string()
  .trim()
  .min(2, "Enter your name.")
  .max(60, "Name is too long.")
  .regex(/^[^<>{}\[\]\\\/]*$/, "Name has characters we can't accept.");

export const createBookingSchema = z.object({
  date: z.string(),
  time: z.string(),
  serviceIds: z
    .array(z.number().int().positive())
    .min(1, "Choose at least one service.")
    .max(MAX_SERVICES_PER_BOOKING, `Choose up to ${MAX_SERVICES_PER_BOOKING} services.`),
  name: nameField,
  phone: phoneField,
  note: z.string().trim().max(200, "Note is too long.").optional(),
});

export const lookupSchema = z.object({
  code: z.string().trim().min(4).max(14),
  phone: phoneField,
});

export const rescheduleSchema = z.object({
  date: z.string(),
  time: z.string(),
  // Needed when a guest (not signed in, no access cookie) manages a booking.
  phone: z.string().optional(),
});

export const registerSchema = z.object({
  name: nameField,
  email: z.string().trim().toLowerCase().max(160).pipe(z.email("Enter a valid email address.")),
  phone: z.union([phoneField, z.literal("")]).optional(),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Password is too long."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(160),
  password: z.string().min(1).max(72),
});

export const walkInSchema = z.object({
  date: z.string(),
  time: z.string(),
  serviceIds: z.array(z.number().int().positive()).min(1, "Choose at least one service.").max(MAX_SERVICES_PER_BOOKING),
  name: nameField,
  phone: z.union([phoneField, z.literal("")]).optional(),
});

export const serviceSchema = z.object({
  category: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2, "Enter a service name.").max(100),
  description: z.string().trim().max(240).default(""),
  price: z.number().int().min(0, "Price can't be negative.").max(100000),
  isActive: z.boolean().default(true),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM times.");
export const hoursSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      closed: z.boolean(),
      open: hhmm,
      close: hhmm,
    }),
  )
  .length(7);

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Check the details and try again.";
}
