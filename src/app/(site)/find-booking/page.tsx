import type { Metadata } from "next";
import { UnlockBooking } from "@/components/UnlockBooking";

export const metadata: Metadata = { title: "Find my booking" };

export default function FindBookingPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Find my booking</h1>
      <p className="mb-8 mt-3 text-slate">Enter your booking code and the phone number you booked with. You can then view, reschedule or cancel it. No account needed.</p>
      <UnlockBooking />
    </div>
  );
}
