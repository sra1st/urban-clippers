import { CANCEL_CUTOFF_MINUTES } from "@/lib/config";

const ITEMS = [
  {
    q: "Do I need an account to book?",
    a: "No. You can book as a guest with your name and mobile number. If you'd like your bookings in one place, sign in with just your mobile number and a text-message code. No password or email needed.",
  },
  {
    q: "Can I choose my barber?",
    a: "Yes. When you book, pick your barber and you'll see only the times he is free. Or choose \"Any available barber\" and we'll assign whoever is free at your time. Either way, your confirmation shows his name.",
  },
  {
    q: "How long does a visit take?",
    a: "A booking is generally one hour. A haircut with a beard trim averages an hour, and each extra add-on such as a facial or a hair treatment adds another hour. The total time is confirmed while you book, and your barber is held for all of it, so nobody else can book him in that time.",
  },
  {
    q: "Can I cancel or reschedule?",
    a: `Yes. Open your booking page, or use Find my booking with your code and phone number. Changes close ${CANCEL_CUTOFF_MINUTES / 60} hours before your visit. After that, please call us.`,
  },
  {
    q: "How do I pay?",
    a: "At the studio after your service. We take cash, card, bKash and Nagad.",
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
