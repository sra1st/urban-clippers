import { CANCEL_CUTOFF_MINUTES } from "@/lib/config";

const ITEMS = [
  {
    q: "Do I need an account to book?",
    a: "No. You can book as a guest with your name and mobile number. An account just keeps all your bookings in one place.",
  },
  {
    q: "Can I choose my barber?",
    a: "Not online. We give you whichever barber is free at your time, and you'll see their name as soon as you've booked.",
  },
  {
    q: "How long does a visit take?",
    a: "Each booking holds about an hour with one barber. Extras like a facial or head massage fit inside the same visit.",
  },
  {
    q: "Can I cancel or reschedule?",
    a: `Yes. Open your booking page, or use Find my booking with your code and phone number. Changes close ${CANCEL_CUTOFF_MINUTES / 60} hours before your visit. After that, please call us.`,
  },
  {
    q: "How do I pay?",
    a: "At the studio after your service. We take cash, bKash and Nagad.",
  },
  {
    q: "What if I'm running late?",
    a: "Call us. We hold your chair for 15 minutes, then the slot may go to the next customer.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {ITEMS.map((i) => (
        <details key={i.q} className="group py-1">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-control py-3 font-semibold hover:text-pole-dark">
            {i.q}
            <svg className="size-5 shrink-0 transition-transform group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <p className="max-w-[62ch] pb-4 pr-9 text-slate">{i.a}</p>
        </details>
      ))}
    </div>
  );
}
