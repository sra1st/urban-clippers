import type { Metadata } from "next";
import { HoursEditor } from "@/components/admin/HoursEditor";
import { getHoursSafe } from "@/lib/data";
import { SLOT_MINUTES } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opening hours" };

export default async function AdminHours() {
  const hours = await getHoursSafe();
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">Opening hours</h1>
      <p className="mb-6 mt-2 max-w-2xl text-slate">
        Booking start times are generated from these hours, every {SLOT_MINUTES} minutes. The last start is {SLOT_MINUTES} minutes before closing. Existing bookings are not moved when you change hours.
      </p>
      <HoursEditor initial={hours} />
    </div>
  );
}
