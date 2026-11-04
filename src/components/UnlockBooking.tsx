"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, field, label } from "./ui";

/** Guests prove they own a booking with its phone number. Used on /booking/[code] and /find-booking. */
export function UnlockBooking({ code = "", compact = false }: { code?: string; compact?: boolean }) {
  const router = useRouter();
  const [c, setC] = useState(code);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c, phone }) });
      const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      if (res.ok && data.code) {
        router.push(`/booking/${data.code}`);
        router.refresh();
        return;
      }
      setError(data.error ?? "We couldn't find a booking with that code and phone number.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div>
        <label htmlFor="code" className={label}>
          Booking code
        </label>
        <input
          id="code"
          className={`${field} font-semibold uppercase tracking-wider`}
          value={c}
          onChange={(e) => setC(e.target.value)}
          placeholder="UC-XXXXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={14}
          required
          readOnly={compact && Boolean(code)}
        />
      </div>
      <div>
        <label htmlFor="lphone" className={label}>
          Phone number used for the booking
        </label>
        <input
          id="lphone"
          className={field}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01712 345 678"
          required
        />
      </div>
      {error && (
        <p role="alert" className="font-semibold text-bad">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !c.trim() || !phone.trim()} className={btn.dark}>
        {busy ? "Looking..." : "Find my booking"}
      </button>
    </form>
  );
}
